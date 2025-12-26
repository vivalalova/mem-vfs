/**
 * VirtualFileSystem 主類別
 * 記憶體虛擬檔案系統實作
 */

import type {
  DirectoryEntry,
  FileStats,
  GlobOptions,
  VFSOptions,
  AtomicWriteOptions,
  DirectoryJSON,
  SnapshotId,
  SnapshotInfo,
  FileDiff,
  WatchOptions,
} from '../types/index.js';
import { DiffType } from '../types/index.js';
import { VFSNode } from './vfs-node.js';
import { VFSFile } from './vfs-file.js';
import { VFSDirectory } from './vfs-directory.js';
import { VFSSymlink } from './vfs-symlink.js';
import {
  normalizePath,
  dirname,
  basename,
  join,
  resolvePath,
} from '../path/path-resolver.js';
import { VFSWatcher } from '../watcher/watcher.js';
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  DirectoryNotEmptyError,
  NotAFileError,
  NotADirectoryError,
  NotASymlinkError,
  SymlinkLoopError,
  FileAlreadyExistsError,
} from '../errors/file-system-errors.js';

/** 預設選項 */
const DEFAULT_OPTIONS: Required<VFSOptions> = {
  caseSensitive: true,
  defaultFileMode: 0o644,
  defaultDirectoryMode: 0o755,
  maxSymlinkDepth: 40,
};

/** VirtualFileSystem 類別 */
export class VirtualFileSystem {
  /** 根目錄 */
  private readonly root: VFSDirectory;

  /** 選項 */
  private readonly options: Required<VFSOptions>;

  /** 快照儲存 */
  private readonly snapshots: Map<SnapshotId, { root: VFSDirectory; info: SnapshotInfo }> = new Map();

  /** 快照計數器 */
  private snapshotCounter = 0;

  /** 監聽器列表 */
  private readonly watchers: Set<VFSWatcher> = new Set();

  constructor(options?: VFSOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.root = new VFSDirectory('', this.options.defaultDirectoryMode);
  }

  // ============================================================
  // 檔案操作
  // ============================================================

  /** 讀取檔案 */
  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    const node = this.resolveNode(filePath, true);

    if (!node) {
      throw new FileNotFoundError(filePath);
    }

    if (node.isDirectory) {
      throw new NotAFileError(filePath);
    }

    if (node.isFile) {
      return (node as VFSFile).read(encoding);
    }

    throw new FileNotFoundError(filePath);
  }

  /** 寫入檔案 */
  async writeFile(filePath: string, content: string | Buffer, options?: AtomicWriteOptions): Promise<void> {
    // 處理編碼選項
    const finalContent = options?.encoding && typeof content === 'string'
      ? Buffer.from(content, options.encoding)
      : content;

    // 原子寫入模式：先寫入臨時檔案，再重命名
    if (options?.tempSuffix) {
      const tempPath = `${filePath}${options.tempSuffix}`;
      await this.writeFileInternal(tempPath, finalContent);
      await this.moveFile(tempPath, filePath);
      return;
    }

    await this.writeFileInternal(filePath, finalContent);
  }

  /** 內部寫入檔案實作 */
  private async writeFileInternal(filePath: string, content: string | Buffer): Promise<void> {
    const { parentPath, name } = resolvePath(filePath);

    // 確保父目錄存在
    await this.createDirectory(parentPath, true);

    const parent = this.getDirectory(parentPath);
    const existing = parent.getChild(name);

    if (existing) {
      if (existing.isDirectory) {
        throw new NotAFileError(filePath);
      }

      // 更新現有檔案
      if (existing.isFile) {
        (existing as VFSFile).write(content);
        this.notifyWatchers(resolvePath(filePath).fullPath, 'change');
        return;
      }

      // 如果是符號連結，跟隨連結
      const resolved = this.resolveNode(filePath, true);
      if (resolved?.isFile) {
        (resolved as VFSFile).write(content);
        this.notifyWatchers(resolvePath(filePath).fullPath, 'change');
        return;
      }
    }

    // 建立新檔案
    const file = new VFSFile(name, content, this.options.defaultFileMode);
    parent.addChild(file);

    // 通知 watcher
    this.notifyWatchers(resolvePath(filePath).fullPath, 'add');
  }

  /** 追加檔案內容 */
  async appendFile(filePath: string, content: string | Buffer): Promise<void> {
    const node = this.resolveNode(filePath, true);

    if (!node) {
      // 如果檔案不存在，建立新檔案
      await this.writeFile(filePath, content);
      return;
    }

    if (!node.isFile) {
      throw new NotAFileError(filePath);
    }

    (node as VFSFile).append(content);
  }

  /** 刪除檔案 */
  async deleteFile(filePath: string): Promise<void> {
    const { parentPath, name, fullPath } = resolvePath(filePath);

    const parent = this.getDirectoryOrNull(parentPath);
    if (!parent) {
      throw new FileNotFoundError(fullPath);
    }

    const node = parent.getChild(name);
    if (!node) {
      throw new FileNotFoundError(fullPath);
    }

    if (node.isDirectory) {
      throw new NotAFileError(fullPath);
    }

    parent.removeChild(name);
    this.notifyWatchers(fullPath, 'unlink');
  }

  // ============================================================
  // 目錄操作
  // ============================================================

  /** 建立目錄 */
  async createDirectory(dirPath: string, recursive = false): Promise<void> {
    const { fullPath, segments } = resolvePath(dirPath);

    if (fullPath === '/') {
      return; // 根目錄已存在
    }

    let current = this.root;
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath = currentPath + '/' + segment;
      const child = current.getChild(segment);

      if (child) {
        if (child.isDirectory) {
          current = child as VFSDirectory;
        } else if (child.isSymlink) {
          // 跟隨符號連結
          const resolved = this.resolveNode(currentPath, true);
          if (resolved?.isDirectory) {
            current = resolved as VFSDirectory;
          } else {
            throw new NotADirectoryError(currentPath);
          }
        } else {
          throw new NotADirectoryError(currentPath);
        }
      } else {
        // 目錄不存在
        if (!recursive && i < segments.length - 1) {
          throw new DirectoryNotFoundError(currentPath);
        }

        const newDir = new VFSDirectory(segment, this.options.defaultDirectoryMode);
        current.addChild(newDir);
        this.notifyWatchers(currentPath, 'addDir');
        current = newDir;
      }
    }
  }

  /** 讀取目錄內容 */
  async readDirectory(dirPath: string): Promise<DirectoryEntry[]> {
    const dir = this.getDirectory(dirPath);
    const normalized = normalizePath(dirPath);
    const entries: DirectoryEntry[] = [];

    for (const node of dir.getChildren()) {
      const entryPath = normalized === '/' ? `/${node.name}` : `${normalized}/${node.name}`;

      entries.push({
        name: node.name,
        path: entryPath,
        isFile: node.isFile,
        isDirectory: node.isDirectory,
        isSymlink: node.isSymlink,
        size: node.size,
        modifiedTime: node.modifiedTime,
      });
    }

    return entries;
  }

  /** 刪除目錄 */
  async deleteDirectory(dirPath: string, recursive = false): Promise<void> {
    const { parentPath, name, fullPath, isRoot } = resolvePath(dirPath);

    if (isRoot) {
      if (!recursive) {
        throw new DirectoryNotEmptyError('/');
      }
      // 清空根目錄
      for (const childName of this.root.getChildNames()) {
        this.root.removeChild(childName);
      }
      return;
    }

    const parent = this.getDirectory(parentPath);
    const node = parent.getChild(name);

    if (!node) {
      throw new DirectoryNotFoundError(fullPath);
    }

    if (!node.isDirectory) {
      throw new NotADirectoryError(fullPath);
    }

    const dir = node as VFSDirectory;

    if (!recursive && !dir.isEmpty) {
      throw new DirectoryNotEmptyError(fullPath);
    }

    parent.removeChild(name);
    this.notifyWatchers(fullPath, 'unlinkDir');
  }

  // ============================================================
  // 狀態查詢
  // ============================================================

  /** 檢查路徑是否存在 */
  async exists(targetPath: string): Promise<boolean> {
    try {
      const node = this.resolveNode(targetPath, false);
      return node !== null;
    } catch {
      return false;
    }
  }

  /** 取得檔案統計 */
  async getStats(targetPath: string): Promise<FileStats> {
    const node = this.resolveNode(targetPath, true);

    if (!node) {
      throw new FileNotFoundError(targetPath);
    }

    return node.getStats();
  }

  /** 取得符號連結統計（不跟隨連結） */
  async getLinkStats(targetPath: string): Promise<FileStats> {
    const node = this.resolveNode(targetPath, false);

    if (!node) {
      throw new FileNotFoundError(targetPath);
    }

    return node.getStats();
  }

  /** 檢查是否為檔案 */
  async isFile(targetPath: string): Promise<boolean> {
    try {
      const node = this.resolveNode(targetPath, true);
      return node?.isFile ?? false;
    } catch {
      return false;
    }
  }

  /** 檢查是否為目錄 */
  async isDirectory(targetPath: string): Promise<boolean> {
    try {
      const node = this.resolveNode(targetPath, true);
      return node?.isDirectory ?? false;
    } catch {
      return false;
    }
  }

  /** 檢查是否為符號連結 */
  async isSymlink(targetPath: string): Promise<boolean> {
    try {
      const node = this.resolveNode(targetPath, false);
      return node?.isSymlink ?? false;
    } catch {
      return false;
    }
  }

  // ============================================================
  // 複製與移動
  // ============================================================

  /** 複製檔案 */
  async copyFile(srcPath: string, destPath: string): Promise<void> {
    const content = await this.readFile(srcPath);
    await this.writeFile(destPath, content);
  }

  /** 移動檔案 */
  async moveFile(srcPath: string, destPath: string): Promise<void> {
    await this.copyFile(srcPath, destPath);
    await this.deleteFile(srcPath);
  }

  // ============================================================
  // 符號連結
  // ============================================================

  /** 建立符號連結 */
  async createSymlink(target: string, linkPath: string): Promise<void> {
    const { parentPath, name } = resolvePath(linkPath);

    // 確保父目錄存在
    await this.createDirectory(parentPath, true);

    const parent = this.getDirectory(parentPath);

    if (parent.hasChild(name)) {
      throw new FileAlreadyExistsError(linkPath);
    }

    const symlink = new VFSSymlink(name, target);
    parent.addChild(symlink);
  }

  /** 讀取符號連結目標 */
  async readSymlink(linkPath: string): Promise<string> {
    const node = this.resolveNode(linkPath, false);

    if (!node) {
      throw new FileNotFoundError(linkPath);
    }

    if (!node.isSymlink) {
      throw new NotASymlinkError(linkPath);
    }

    return (node as VFSSymlink).target;
  }

  // ============================================================
  // Glob 搜尋
  // ============================================================

  /** Glob 搜尋 */
  async glob(pattern: string, options?: GlobOptions): Promise<string[]> {
    const cwd = options?.cwd ? normalizePath(options.cwd) : '/';
    const maxDepth = options?.maxDepth ?? Infinity;
    const onlyFiles = options?.onlyFiles ?? false;
    const onlyDirectories = options?.onlyDirectories ?? false;
    const followSymlinks = options?.followSymlinks ?? true;
    const dot = options?.dot ?? false;
    const absolute = options?.absolute ?? true;
    const ignore = options?.ignore ?? [];

    const results: string[] = [];
    const regex = this.patternToRegex(pattern);

    const traverse = (dir: VFSDirectory, currentPath: string, depth: number): void => {
      if (depth > maxDepth) {
        return;
      }

      for (const node of dir.getChildren()) {
        const nodePath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
        const relativePath = nodePath.slice(cwd.length + 1) || node.name;

        // 檢查是否為隱藏檔案
        if (!dot && node.name.startsWith('.')) {
          continue;
        }

        // 檢查忽略規則
        if (this.matchesIgnore(nodePath, ignore)) {
          continue;
        }

        // 處理符號連結
        let effectiveNode = node;
        if (node.isSymlink && followSymlinks) {
          const resolved = this.resolveNode(nodePath, true);
          if (resolved) {
            effectiveNode = resolved;
          } else {
            continue; // 斷開的符號連結
          }
        }

        // 檢查是否符合 pattern
        if (regex.test(relativePath)) {
          const shouldInclude =
            (!onlyFiles && !onlyDirectories)
            || (onlyFiles && effectiveNode.isFile)
            || (onlyDirectories && effectiveNode.isDirectory);

          if (shouldInclude) {
            results.push(absolute ? nodePath : relativePath);
          }
        }

        // 遞迴處理目錄
        if (effectiveNode.isDirectory) {
          traverse(effectiveNode as VFSDirectory, nodePath, depth + 1);
        }
      }
    };

    const startDir = this.getDirectoryOrNull(cwd);
    if (startDir) {
      traverse(startDir, cwd, 0);
    }

    return results.sort();
  }

  // ============================================================
  // 快照與回滾
  // ============================================================

  /** 建立快照 */
  createSnapshot(name?: string): SnapshotId {
    const id = `snapshot-${++this.snapshotCounter}`;
    const clonedRoot = this.root.clone();

    const { fileCount, directoryCount, totalSize } = this.countNodes(this.root);

    const info: SnapshotInfo = {
      id,
      name,
      createdAt: new Date(),
      fileCount,
      directoryCount,
      totalSize,
    };

    this.snapshots.set(id, { root: clonedRoot, info });

    return id;
  }

  /** 還原快照 */
  restoreSnapshot(id: SnapshotId): void {
    const snapshot = this.snapshots.get(id);

    if (!snapshot) {
      throw new Error(`Snapshot not found: ${id}`);
    }

    // 清空當前根目錄
    for (const name of this.root.getChildNames()) {
      this.root.removeChild(name);
    }

    // 複製快照內容
    const cloned = snapshot.root.clone();
    for (const [, node] of cloned.entries()) {
      this.root.addChild(node);
    }
  }

  /** 取得快照資訊 */
  getSnapshotInfo(id: SnapshotId): SnapshotInfo | undefined {
    return this.snapshots.get(id)?.info;
  }

  /** 列出所有快照 */
  listSnapshots(): SnapshotInfo[] {
    return Array.from(this.snapshots.values()).map(s => s.info);
  }

  /** 刪除快照 */
  deleteSnapshot(id: SnapshotId): boolean {
    return this.snapshots.delete(id);
  }

  /** 計算兩個快照之間的差異 */
  diff(fromId?: SnapshotId, toId?: SnapshotId): FileDiff[] {
    const fromRoot = fromId ? this.snapshots.get(fromId)?.root : undefined;
    const toRoot = toId ? this.snapshots.get(toId)?.root : this.root;

    if (fromId && !fromRoot) {
      throw new Error(`Snapshot not found: ${fromId}`);
    }

    if (toId && !toRoot) {
      throw new Error(`Snapshot not found: ${toId}`);
    }

    const diffs: FileDiff[] = [];
    this.computeDiff(fromRoot ?? new VFSDirectory(''), toRoot!, '', diffs);

    return diffs;
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /** 從 JSON 結構載入 */
  async fromJSON(structure: DirectoryJSON, basePath = '/'): Promise<void> {
    // 偵測格式：如果任何 key 以 / 開頭或包含 / 且 value 是字串，視為平面路徑格式
    const isFlatFormat = Object.entries(structure).some(
      ([key, value]) =>
        (key.startsWith('/') || key.includes('/')) &&
        (typeof value === 'string' || Buffer.isBuffer(value) || value === null)
    );

    if (isFlatFormat) {
      // 平面路徑格式：{ '/path/to/file.ts': 'content' }
      await this.fromFlatJSON(structure);
    } else {
      // 嵌套結構格式：{ 'dir': { 'file.ts': 'content' } }
      await this.fromNestedJSON(structure, basePath);
    }
  }

  /** 從平面路徑 JSON 結構載入 */
  private async fromFlatJSON(structure: DirectoryJSON): Promise<void> {
    for (const [path, value] of Object.entries(structure)) {
      if (value === null || value === undefined) {
        // null/undefined 表示目錄
        await this.createDirectory(path, true);
      } else if (typeof value === 'string' || Buffer.isBuffer(value)) {
        // 字串或 Buffer 表示檔案
        await this.writeFile(path, value);
      }
      // 忽略物件（平面格式不應有嵌套物件）
    }
  }

  /** 從嵌套結構 JSON 載入 */
  private async fromNestedJSON(structure: DirectoryJSON, basePath: string): Promise<void> {
    for (const [key, value] of Object.entries(structure)) {
      const fullPath = join(basePath, key);

      if (value === null) {
        // null 表示目錄
        await this.createDirectory(fullPath, true);
      } else if (typeof value === 'string' || Buffer.isBuffer(value)) {
        // 字串或 Buffer 表示檔案
        await this.writeFile(fullPath, value);
      } else if (typeof value === 'object') {
        // 巢狀物件表示子目錄
        await this.createDirectory(fullPath, true);
        await this.fromNestedJSON(value as DirectoryJSON, fullPath);
      }
    }
  }

  /** 輸出為 JSON 結構 */
  toJSON(basePath = '/', options?: { flatten?: boolean }): DirectoryJSON {
    if (options?.flatten) {
      return this.toFlatJSON(basePath);
    }
    return this.toNestedJSON(basePath);
  }

  /** 輸出為平面路徑 JSON 結構 */
  private toFlatJSON(basePath: string): DirectoryJSON {
    const result: DirectoryJSON = {};

    const traverse = (dir: VFSDirectory, currentPath: string): void => {
      for (const node of dir.getChildren()) {
        const nodePath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;

        if (node.isFile) {
          const content = (node as VFSFile).read();
          result[nodePath] = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
        } else if (node.isDirectory) {
          traverse(node as VFSDirectory, nodePath);
        } else if (node.isSymlink) {
          result[nodePath] = `symlink:${(node as VFSSymlink).target}`;
        }
      }
    };

    const startDir = this.getDirectoryOrNull(basePath);
    if (startDir) {
      traverse(startDir, basePath === '/' ? '' : basePath);
    }

    return result;
  }

  /** 輸出為嵌套結構 JSON */
  private toNestedJSON(basePath: string): DirectoryJSON {
    const result: DirectoryJSON = {};
    const dir = this.getDirectoryOrNull(basePath);

    if (!dir) {
      return result;
    }

    for (const node of dir.getChildren()) {
      if (node.isFile) {
        const content = (node as VFSFile).read();
        result[node.name] = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
      } else if (node.isDirectory) {
        const subPath = basePath === '/' ? `/${node.name}` : `${basePath}/${node.name}`;
        const subContent = this.toNestedJSON(subPath);
        result[node.name] = Object.keys(subContent).length > 0 ? subContent : null;
      } else if (node.isSymlink) {
        result[node.name] = `symlink:${(node as VFSSymlink).target}`;
      }
    }

    return result;
  }

  /** 重置檔案系統 */
  reset(): void {
    for (const name of this.root.getChildNames()) {
      this.root.removeChild(name);
    }
    this.snapshots.clear();
    this.snapshotCounter = 0;
  }

  /** 監聽檔案變更 */
  watch(watchPath: string, options?: WatchOptions): VFSWatcher {
    const watcher = new VFSWatcher(watchPath, options);
    this.watchers.add(watcher);

    // 初始化已知路徑
    if (!options?.ignoreInitial) {
      this.initializeWatcher(watcher, watchPath);
    }

    // 當 watcher 關閉時從列表移除
    const originalClose = watcher.close.bind(watcher);
    watcher.close = () => {
      this.watchers.delete(watcher);
      originalClose();
    };

    // 發送 ready 事件
    setTimeout(() => watcher.emitReady(), 0);

    return watcher;
  }

  /** 初始化 watcher 的已知路徑 */
  private async initializeWatcher(watcher: VFSWatcher, basePath: string): Promise<void> {
    const traverse = async (dirPath: string): Promise<void> => {
      try {
        const entries = await this.readDirectory(dirPath);
        for (const entry of entries) {
          watcher.registerPath(entry.path);
          if (entry.isDirectory) {
            await traverse(entry.path);
          }
        }
      } catch {
        // 忽略錯誤
      }
    };

    watcher.registerPath(basePath);
    await traverse(basePath);
  }

  /** 通知所有 watcher 檔案變更 */
  private notifyWatchers(path: string, type: 'change' | 'add' | 'unlink' | 'addDir' | 'unlinkDir'): void {
    const stats = type !== 'unlink' && type !== 'unlinkDir'
      ? this.resolveNode(path, true)?.getStats()
      : undefined;

    for (const watcher of this.watchers) {
      switch (type) {
        case 'change':
        case 'add':
          watcher.notifyChange(path, stats);
          break;
        case 'unlink':
          watcher.notifyUnlink(path, false);
          break;
        case 'addDir':
          watcher.notifyAddDir(path, stats);
          break;
        case 'unlinkDir':
          watcher.notifyUnlink(path, true);
          break;
      }
    }
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /** 解析節點 */
  private resolveNode(inputPath: string, followSymlinks: boolean, depth = 0): VFSNode | null {
    if (depth > this.options.maxSymlinkDepth) {
      throw new SymlinkLoopError(inputPath);
    }

    const { segments, isRoot } = resolvePath(inputPath);

    if (isRoot) {
      return this.root;
    }

    let current: VFSNode = this.root;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (!current.isDirectory) {
        return null;
      }

      const child = (current as VFSDirectory).getChild(segment);

      if (!child) {
        return null;
      }

      // 處理符號連結
      if (child.isSymlink) {
        if (followSymlinks || i < segments.length - 1) {
          // 需要跟隨符號連結
          const symlink = child as VFSSymlink;
          const targetPath = symlink.target.startsWith('/')
            ? symlink.target
            : join(dirname('/' + segments.slice(0, i).join('/')), symlink.target);

          const resolved = this.resolveNode(targetPath, true, depth + 1);

          if (!resolved) {
            return null;
          }

          if (i === segments.length - 1) {
            return followSymlinks ? resolved : child;
          }

          current = resolved;
        } else {
          return child;
        }
      } else {
        current = child;
      }
    }

    return current;
  }

  /** 取得目錄節點 */
  private getDirectory(dirPath: string): VFSDirectory {
    const node = this.resolveNode(dirPath, true);

    if (!node) {
      throw new DirectoryNotFoundError(dirPath);
    }

    if (!node.isDirectory) {
      throw new NotADirectoryError(dirPath);
    }

    return node as VFSDirectory;
  }

  /** 取得目錄節點（可能為 null） */
  private getDirectoryOrNull(dirPath: string): VFSDirectory | null {
    try {
      return this.getDirectory(dirPath);
    } catch {
      return null;
    }
  }

  /** 將 glob pattern 轉換為正規表示式 */
  private patternToRegex(pattern: string): RegExp {
    // 簡單的 glob 到 regex 轉換
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 跳脫特殊字元
      .replace(/\*\*/g, '<<<GLOBSTAR>>>') // 暫時替換 **
      .replace(/\*/g, '[^/]*') // * 匹配任意字元（不含路徑分隔符）
      .replace(/\?/g, '[^/]') // ? 匹配單一字元
      .replace(/<<<GLOBSTAR>>>/g, '.*'); // ** 匹配任意路徑

    return new RegExp(`^${regex}$`);
  }

  /** 檢查是否符合忽略規則 */
  private matchesIgnore(path: string, ignorePatterns: string[]): boolean {
    for (const pattern of ignorePatterns) {
      const regex = this.patternToRegex(pattern);
      if (regex.test(path) || regex.test(basename(path))) {
        return true;
      }
    }
    return false;
  }

  /** 計算節點數量 */
  private countNodes(dir: VFSDirectory): { fileCount: number; directoryCount: number; totalSize: number } {
    let fileCount = 0;
    let directoryCount = 0;
    let totalSize = 0;

    const traverse = (node: VFSNode): void => {
      if (node.isFile) {
        fileCount++;
        totalSize += node.size;
      } else if (node.isDirectory) {
        directoryCount++;
        for (const child of (node as VFSDirectory).getChildren()) {
          traverse(child);
        }
      }
    };

    traverse(dir);
    return { fileCount, directoryCount, totalSize };
  }

  /** 計算差異 */
  private computeDiff(
    from: VFSDirectory | undefined,
    to: VFSDirectory,
    basePath: string,
    diffs: FileDiff[]
  ): void {
    const fromChildren = new Map<string, VFSNode>();
    const toChildren = new Map<string, VFSNode>();

    if (from) {
      for (const node of from.getChildren()) {
        fromChildren.set(node.name, node);
      }
    }

    for (const node of to.getChildren()) {
      toChildren.set(node.name, node);
    }

    // 檢查新增和修改
    for (const [name, toNode] of toChildren) {
      const path = basePath ? `${basePath}/${name}` : `/${name}`;
      const fromNode = fromChildren.get(name);

      if (!fromNode) {
        // 新增
        if (toNode.isFile) {
          diffs.push({
            type: DiffType.Added,
            path,
            newContent: (toNode as VFSFile).read() as Buffer,
            newStats: toNode.getStats(),
          });
        }
      } else if (toNode.isFile && fromNode.isFile) {
        // 檢查修改
        const fromContent = (fromNode as VFSFile).read() as Buffer;
        const toContent = (toNode as VFSFile).read() as Buffer;

        if (!fromContent.equals(toContent)) {
          diffs.push({
            type: DiffType.Modified,
            path,
            oldContent: fromContent,
            newContent: toContent,
            oldStats: fromNode.getStats(),
            newStats: toNode.getStats(),
          });
        }
      }

      // 遞迴處理子目錄
      if (toNode.isDirectory) {
        this.computeDiff(
          fromNode?.isDirectory ? (fromNode as VFSDirectory) : undefined,
          toNode as VFSDirectory,
          path,
          diffs
        );
      }
    }

    // 檢查刪除
    for (const [name, fromNode] of fromChildren) {
      if (!toChildren.has(name)) {
        const path = basePath ? `${basePath}/${name}` : `/${name}`;
        if (fromNode.isFile) {
          diffs.push({
            type: DiffType.Deleted,
            path,
            oldContent: (fromNode as VFSFile).read() as Buffer,
            oldStats: fromNode.getStats(),
          });
        }
      }
    }
  }
}

/** 建立 VirtualFileSystem 實例 */
export function createVFS(options?: VFSOptions): VirtualFileSystem {
  return new VirtualFileSystem(options);
}
