/**
 * mem-vfs 錯誤類別
 */

/** 檔案系統錯誤類型 */
export enum FileSystemErrorCode {
  FileNotFound = 'FILE_NOT_FOUND',
  DirectoryNotFound = 'DIRECTORY_NOT_FOUND',
  PermissionDenied = 'PERMISSION_DENIED',
  DirectoryNotEmpty = 'DIRECTORY_NOT_EMPTY',
  FileAlreadyExists = 'FILE_ALREADY_EXISTS',
  DirectoryAlreadyExists = 'DIRECTORY_ALREADY_EXISTS',
  InvalidPath = 'INVALID_PATH',
  NotAFile = 'NOT_A_FILE',
  NotADirectory = 'NOT_A_DIRECTORY',
  NotASymlink = 'NOT_A_SYMLINK',
  SymlinkLoop = 'SYMLINK_LOOP',
  MaxDepthExceeded = 'MAX_DEPTH_EXCEEDED',
  IOError = 'IO_ERROR',
}

/** 檔案系統錯誤基礎類別 */
export class FileSystemError extends Error {
  constructor(
    public readonly code: FileSystemErrorCode,
    message: string,
    public readonly path?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileSystemError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 檔案找不到錯誤 */
export class FileNotFoundError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.FileNotFound, `File not found: ${path}`, path, cause);
    this.name = 'FileNotFoundError';
  }
}

/** 目錄找不到錯誤 */
export class DirectoryNotFoundError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.DirectoryNotFound, `Directory not found: ${path}`, path, cause);
    this.name = 'DirectoryNotFoundError';
  }
}

/** 權限錯誤 */
export class PermissionError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.PermissionDenied, `Permission denied: ${path}`, path, cause);
    this.name = 'PermissionError';
  }
}

/** 目錄非空錯誤 */
export class DirectoryNotEmptyError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.DirectoryNotEmpty, `Directory not empty: ${path}`, path, cause);
    this.name = 'DirectoryNotEmptyError';
  }
}

/** 檔案已存在錯誤 */
export class FileAlreadyExistsError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.FileAlreadyExists, `File already exists: ${path}`, path, cause);
    this.name = 'FileAlreadyExistsError';
  }
}

/** 目錄已存在錯誤 */
export class DirectoryAlreadyExistsError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.DirectoryAlreadyExists, `Directory already exists: ${path}`, path, cause);
    this.name = 'DirectoryAlreadyExistsError';
  }
}

/** 無效路徑錯誤 */
export class InvalidPathError extends FileSystemError {
  constructor(path: string, reason?: string, cause?: Error) {
    const message = reason ? `Invalid path: ${path} (${reason})` : `Invalid path: ${path}`;
    super(FileSystemErrorCode.InvalidPath, message, path, cause);
    this.name = 'InvalidPathError';
  }
}

/** 不是檔案錯誤 */
export class NotAFileError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.NotAFile, `Not a file: ${path}`, path, cause);
    this.name = 'NotAFileError';
  }
}

/** 不是目錄錯誤 */
export class NotADirectoryError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.NotADirectory, `Not a directory: ${path}`, path, cause);
    this.name = 'NotADirectoryError';
  }
}

/** 不是符號連結錯誤 */
export class NotASymlinkError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.NotASymlink, `Not a symbolic link: ${path}`, path, cause);
    this.name = 'NotASymlinkError';
  }
}

/** 符號連結循環錯誤 */
export class SymlinkLoopError extends FileSystemError {
  constructor(path: string, cause?: Error) {
    super(FileSystemErrorCode.SymlinkLoop, `Symbolic link loop detected: ${path}`, path, cause);
    this.name = 'SymlinkLoopError';
  }
}

/** 超過最大深度錯誤 */
export class MaxDepthExceededError extends FileSystemError {
  constructor(path: string, maxDepth: number, cause?: Error) {
    super(FileSystemErrorCode.MaxDepthExceeded, `Max depth (${maxDepth}) exceeded at: ${path}`, path, cause);
    this.name = 'MaxDepthExceededError';
  }
}

/** IO 錯誤 */
export class IOError extends FileSystemError {
  constructor(path: string, operation: string, cause?: Error) {
    super(FileSystemErrorCode.IOError, `IO error during ${operation} on: ${path}`, path, cause);
    this.name = 'IOError';
  }
}
