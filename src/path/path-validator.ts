/**
 * 路徑驗證工具
 */

import { InvalidPathError } from '../errors/file-system-errors.js';

/** 無效的路徑字元 */
const INVALID_CHARS = /[\x00-\x1f]/;

/** 保留的檔案名稱（Windows 相容） */
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

/** 驗證路徑 */
export function validatePath(inputPath: string): void {
  if (!inputPath) {
    throw new InvalidPathError('', 'Path cannot be empty');
  }

  if (typeof inputPath !== 'string') {
    throw new InvalidPathError(String(inputPath), 'Path must be a string');
  }

  // 檢查無效字元
  if (INVALID_CHARS.test(inputPath)) {
    throw new InvalidPathError(inputPath, 'Path contains invalid characters');
  }

  // 檢查路徑長度
  if (inputPath.length > 4096) {
    throw new InvalidPathError(inputPath, 'Path is too long (max 4096 characters)');
  }

  // 檢查各個部分（跳過 . 和 .. 因為這些是合法的路徑導航元素）
  const parts = inputPath.split('/').filter(Boolean);

  for (const part of parts) {
    // 跳過 . 和 .. 路徑導航元素
    if (part === '.' || part === '..') {
      continue;
    }
    validatePathSegment(part, inputPath);
  }
}

/** 驗證路徑段落 */
function validatePathSegment(segment: string, fullPath: string): void {
  // 檢查段落長度
  if (segment.length > 255) {
    throw new InvalidPathError(fullPath, `Path segment "${segment}" is too long (max 255 characters)`);
  }

  // 檢查保留名稱（不區分大小寫）
  const upperSegment = segment.toUpperCase();
  const baseSegment = upperSegment.split('.')[0];

  if (RESERVED_NAMES.has(baseSegment)) {
    throw new InvalidPathError(fullPath, `"${segment}" is a reserved name`);
  }

  // 檢查結尾空格或句點
  if (segment.endsWith(' ') || segment.endsWith('.')) {
    throw new InvalidPathError(fullPath, `Path segment cannot end with space or period: "${segment}"`);
  }
}

/** 驗證檔案名稱 */
export function validateFileName(name: string): void {
  if (!name) {
    throw new InvalidPathError('', 'File name cannot be empty');
  }

  // 不能包含斜線
  if (name.includes('/') || name.includes('\\')) {
    throw new InvalidPathError(name, 'File name cannot contain path separators');
  }

  validatePathSegment(name, name);
}

/** 是否為有效路徑（不拋出錯誤） */
export function isValidPath(inputPath: string): boolean {
  try {
    validatePath(inputPath);
    return true;
  } catch {
    return false;
  }
}

/** 是否為有效檔案名稱（不拋出錯誤） */
export function isValidFileName(name: string): boolean {
  try {
    validateFileName(name);
    return true;
  } catch {
    return false;
  }
}
