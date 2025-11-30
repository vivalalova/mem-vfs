/**
 * mem-vfs 型別定義
 */

/** 目錄項目 */
export interface DirectoryEntry {
  /** 檔案/目錄名稱 */
  name: string;
  /** 完整路徑 */
  path: string;
  /** 是否為檔案 */
  isFile: boolean;
  /** 是否為目錄 */
  isDirectory: boolean;
  /** 是否為符號連結 */
  isSymlink: boolean;
  /** 檔案大小（位元組） */
  size?: number;
  /** 修改時間 */
  modifiedTime?: Date;
}

/** 檔案統計資訊 */
export interface FileStats {
  /** 是否為檔案 */
  isFile: boolean;
  /** 是否為目錄 */
  isDirectory: boolean;
  /** 是否為符號連結 */
  isSymlink: boolean;
  /** 檔案大小（位元組） */
  size: number;
  /** 建立時間 */
  createdTime: Date;
  /** 修改時間 */
  modifiedTime: Date;
  /** 存取時間 */
  accessedTime: Date;
  /** 檔案模式 */
  mode: number;
  /** 使用者 ID */
  uid?: number;
  /** 群組 ID */
  gid?: number;
}

/** Glob 選項 */
export interface GlobOptions {
  /** 工作目錄 */
  cwd?: string;
  /** 忽略的 pattern */
  ignore?: string[];
  /** 是否包含 dot 檔案 */
  dot?: boolean;
  /** 是否回傳絕對路徑 */
  absolute?: boolean;
  /** 僅回傳檔案 */
  onlyFiles?: boolean;
  /** 僅回傳目錄 */
  onlyDirectories?: boolean;
  /** 是否追蹤符號連結 */
  followSymlinks?: boolean;
  /** 最大深度限制 */
  maxDepth?: number;
}

/** 監聽選項 */
export interface WatchOptions {
  /** 是否持續監聽 */
  persistent?: boolean;
  /** 是否遞迴監聽 */
  recursive?: boolean;
  /** 是否忽略初始事件 */
  ignoreInitial?: boolean;
  /** 是否追蹤符號連結 */
  followSymlinks?: boolean;
  /** 忽略的 pattern */
  ignored?: string | string[] | ((path: string) => boolean);
  /** debounce 延遲（毫秒） */
  debounce?: number;
  /** 最大深度 */
  depth?: number;
}

/** 檔案變更事件類型 */
export enum FileChangeType {
  Add = 'add',
  Change = 'change',
  Unlink = 'unlink',
  AddDir = 'addDir',
  UnlinkDir = 'unlinkDir',
  Ready = 'ready',
  Error = 'error',
}

/** 檔案變更事件 */
export interface FileChangeEvent {
  /** 事件類型 */
  type: FileChangeType;
  /** 檔案路徑 */
  path: string;
  /** 檔案統計（如果可用） */
  stats?: FileStats;
  /** 錯誤（如果是錯誤事件） */
  error?: Error;
}

/** 監聽事件處理器 */
export type FileWatcherEventListener = (event: FileChangeEvent) => void;

/** 快照 ID */
export type SnapshotId = string;

/** 快照資訊 */
export interface SnapshotInfo {
  /** 快照 ID */
  id: SnapshotId;
  /** 快照名稱 */
  name?: string;
  /** 建立時間 */
  createdAt: Date;
  /** 檔案數量 */
  fileCount: number;
  /** 目錄數量 */
  directoryCount: number;
  /** 總大小（位元組） */
  totalSize: number;
}

/** 檔案差異類型 */
export enum DiffType {
  Added = 'added',
  Modified = 'modified',
  Deleted = 'deleted',
}

/** 檔案差異 */
export interface FileDiff {
  /** 差異類型 */
  type: DiffType;
  /** 檔案路徑 */
  path: string;
  /** 舊內容（如果是修改或刪除） */
  oldContent?: Buffer;
  /** 新內容（如果是新增或修改） */
  newContent?: Buffer;
  /** 舊統計資訊 */
  oldStats?: FileStats;
  /** 新統計資訊 */
  newStats?: FileStats;
}

/** VFS 選項 */
export interface VFSOptions {
  /** 是否區分大小寫（預設 true） */
  caseSensitive?: boolean;
  /** 預設檔案模式 */
  defaultFileMode?: number;
  /** 預設目錄模式 */
  defaultDirectoryMode?: number;
  /** 符號連結最大解析深度（預設 40） */
  maxSymlinkDepth?: number;
}

/** 原子寫入選項 */
export interface AtomicWriteOptions {
  /** 臨時檔案後綴 */
  tempSuffix?: string;
  /** 是否 fsync */
  fsync?: boolean;
  /** 編碼 */
  encoding?: BufferEncoding;
}

/** 目錄 JSON 結構 */
export interface DirectoryJSON {
  [path: string]: string | Buffer | null | DirectoryJSON;
}

/** VFS 節點類型 */
export enum VFSNodeType {
  File = 'file',
  Directory = 'directory',
  Symlink = 'symlink',
}
