/**
 * VFSWatcher
 * 虛擬檔案系統監聽器
 */

import type { WatchOptions, FileStats } from '../types/index.js';
import { FileChangeType } from '../types/index.js';
import { SimpleEventEmitter, type WatcherEvent } from './watcher-events.js';
import { Debouncer } from './debouncer.js';
import { normalizePath, isSubPath } from '../path/path-resolver.js';

/** VFS Watcher 類別 */
export class VFSWatcher extends SimpleEventEmitter {
  /** 監聽路徑 */
  private readonly watchPath: string;

  /** 選項 */
  private readonly options: Required<WatchOptions>;

  /** 是否已關閉 */
  private closed = false;

  /** 事件防抖器 */
  private readonly debouncer: Debouncer<WatcherEvent>;

  /** 已知路徑快取（用於判斷新增或修改） */
  private knownPaths: Set<string> = new Set();

  /** 預設選項 */
  private static readonly DEFAULT_OPTIONS: Required<WatchOptions> = {
    persistent: true,
    recursive: true,
    ignoreInitial: false,
    followSymlinks: true,
    ignored: [],
    debounce: 100,
    depth: Infinity,
  };

  constructor(watchPath: string, options?: WatchOptions) {
    super();
    this.watchPath = normalizePath(watchPath);
    this.options = { ...VFSWatcher.DEFAULT_OPTIONS, ...options };

    this.debouncer = new Debouncer(
      (events) => this.flushEvents(events),
      this.options.debounce
    );
  }

  /** 通知檔案變更 */
  notifyChange(path: string, stats?: FileStats): void {
    if (this.closed) {return;}

    const normalizedPath = normalizePath(path);
    if (!this.shouldWatch(normalizedPath)) {return;}

    const isNew = !this.knownPaths.has(normalizedPath);
    this.knownPaths.add(normalizedPath);

    const event: WatcherEvent = {
      type: isNew ? FileChangeType.Add : FileChangeType.Change,
      path: normalizedPath,
      stats,
    };

    this.debouncer.add(normalizedPath, event);
  }

  /** 通知檔案刪除 */
  notifyUnlink(path: string, isDirectory = false): void {
    if (this.closed) {return;}

    const normalizedPath = normalizePath(path);
    if (!this.shouldWatch(normalizedPath)) {return;}

    this.knownPaths.delete(normalizedPath);

    const event: WatcherEvent = {
      type: isDirectory ? FileChangeType.UnlinkDir : FileChangeType.Unlink,
      path: normalizedPath,
    };

    this.debouncer.add(normalizedPath, event);
  }

  /** 通知目錄新增 */
  notifyAddDir(path: string, stats?: FileStats): void {
    if (this.closed) {return;}

    const normalizedPath = normalizePath(path);
    if (!this.shouldWatch(normalizedPath)) {return;}

    this.knownPaths.add(normalizedPath);

    const event: WatcherEvent = {
      type: FileChangeType.AddDir,
      path: normalizedPath,
      stats,
    };

    this.debouncer.add(normalizedPath, event);
  }

  /** 發送 ready 事件 */
  emitReady(): void {
    if (this.closed) {return;}
    this.emit('ready');
  }

  /** 發送錯誤事件 */
  emitError(error: Error): void {
    if (this.closed) {return;}
    this.emit('error', error);
  }

  /** 註冊已知路徑 */
  registerPath(path: string): void {
    this.knownPaths.add(normalizePath(path));
  }

  /** 取消註冊路徑 */
  unregisterPath(path: string): void {
    this.knownPaths.delete(normalizePath(path));
  }

  /** 關閉監聽器 */
  close(): void {
    if (this.closed) {return;}

    this.closed = true;
    this.debouncer.cancel();
    this.removeAllListeners();
    this.knownPaths.clear();
  }

  /** 是否已關閉 */
  get isClosed(): boolean {
    return this.closed;
  }

  /** 監聽的路徑 */
  get path(): string {
    return this.watchPath;
  }

  /** 覆寫 on 方法 */
  override on(event: string, handler: (...args: unknown[]) => void): this {
    return super.on(event, handler);
  }

  /** 檢查路徑是否應該被監聽 */
  private shouldWatch(path: string): boolean {
    // 檢查路徑是否在監聽範圍內
    if (path !== this.watchPath && !isSubPath(path, this.watchPath)) {
      return false;
    }

    // 檢查深度
    const depth = this.getPathDepth(path);
    if (depth > this.options.depth) {
      return false;
    }

    // 檢查忽略規則
    if (this.isIgnored(path)) {
      return false;
    }

    return true;
  }

  /** 計算相對於監聽路徑的深度 */
  private getPathDepth(path: string): number {
    if (path === this.watchPath) {
      return 0;
    }

    const relativePath = path.slice(this.watchPath.length);
    return relativePath.split('/').filter(Boolean).length;
  }

  /** 檢查是否被忽略 */
  private isIgnored(path: string): boolean {
    const { ignored } = this.options;

    if (!ignored) {
      return false;
    }

    if (typeof ignored === 'function') {
      return ignored(path);
    }

    const patterns = Array.isArray(ignored) ? ignored : [ignored];

    for (const pattern of patterns) {
      if (this.matchPattern(path, pattern)) {
        return true;
      }
    }

    return false;
  }

  /** 簡單的 pattern 匹配 */
  private matchPattern(path: string, pattern: string): boolean {
    // 簡單實作：支援 * 萬用字元
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
    );
    return regex.test(path) || regex.test(path.split('/').pop() ?? '');
  }

  /** 批量發送事件 */
  private flushEvents(events: Map<string, WatcherEvent>): void {
    for (const event of events.values()) {
      // 發送特定類型事件
      this.emit(event.type, event);
      // 發送 'all' 事件
      this.emit('all', event);
    }
  }
}

/** 建立 VFSWatcher 實例 */
export function createWatcher(path: string, options?: WatchOptions): VFSWatcher {
  return new VFSWatcher(path, options);
}
