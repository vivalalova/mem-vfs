/**
 * mem-vfs - 記憶體虛擬檔案系統
 *
 * 高效能記憶體檔案系統，支援符號連結、檔案監聽、快照/回滾
 */

// 主類別
export { VirtualFileSystem, createVFS } from './core/vfs.js';

// 節點類別
export { VFSNode } from './core/vfs-node.js';
export { VFSFile } from './core/vfs-file.js';
export { VFSDirectory } from './core/vfs-directory.js';
export { VFSSymlink } from './core/vfs-symlink.js';

// 型別
export type {
  DirectoryEntry,
  FileStats,
  GlobOptions,
  WatchOptions,
  FileChangeEvent,
  FileWatcherEventListener,
  SnapshotId,
  SnapshotInfo,
  FileDiff,
  VFSOptions,
  AtomicWriteOptions,
  DirectoryJSON,
} from './types/index.js';

export { VFSNodeType, FileChangeType, DiffType } from './types/index.js';

// 錯誤類別
export {
  FileSystemError,
  FileSystemErrorCode,
  FileNotFoundError,
  DirectoryNotFoundError,
  PermissionError,
  DirectoryNotEmptyError,
  FileAlreadyExistsError,
  DirectoryAlreadyExistsError,
  InvalidPathError,
  NotAFileError,
  NotADirectoryError,
  NotASymlinkError,
  SymlinkLoopError,
  MaxDepthExceededError,
  IOError,
} from './errors/file-system-errors.js';

// 路徑工具
export {
  normalizePath,
  dirname,
  basename,
  extname,
  join,
  resolve,
  relative,
  isAbsolute,
  splitPath,
} from './path/path-normalizer.js';

export {
  resolvePath,
  getAncestorPaths,
  isSubPath,
  getPathDepth,
  getCommonAncestor,
} from './path/path-resolver.js';

export {
  validatePath,
  validateFileName,
  isValidPath,
  isValidFileName,
} from './path/path-validator.js';

// 監聽器
export { VFSWatcher, createWatcher } from './watcher/watcher.js';
export { Debouncer } from './watcher/debouncer.js';
export type { WatcherEvent, WatcherEventHandler, WatcherErrorHandler } from './watcher/watcher-events.js';
