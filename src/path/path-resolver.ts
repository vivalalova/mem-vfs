/**
 * 路徑解析器
 * 負責將路徑解析為節點
 */

import { normalizePath, splitPath, dirname, basename, join } from './path-normalizer.js';
import { validatePath } from './path-validator.js';

export { normalizePath, dirname, basename, join, splitPath };
export { validatePath, isValidPath, validateFileName, isValidFileName } from './path-validator.js';

/** 路徑解析結果 */
export interface PathResolution {
  /** 正規化後的完整路徑 */
  fullPath: string;
  /** 父目錄路徑 */
  parentPath: string;
  /** 檔案/目錄名稱 */
  name: string;
  /** 路徑段落 */
  segments: string[];
  /** 是否為根目錄 */
  isRoot: boolean;
}

/** 解析路徑 */
export function resolvePath(inputPath: string): PathResolution {
  validatePath(inputPath);

  const fullPath = normalizePath(inputPath);
  const isRoot = fullPath === '/';

  return {
    fullPath,
    parentPath: isRoot ? '/' : dirname(fullPath),
    name: isRoot ? '' : basename(fullPath),
    segments: splitPath(fullPath),
    isRoot,
  };
}

/** 取得所有祖先路徑（從根到父） */
export function getAncestorPaths(inputPath: string): string[] {
  const { segments } = resolvePath(inputPath);
  const ancestors: string[] = ['/'];

  let current = '';
  for (let i = 0; i < segments.length - 1; i++) {
    current = current + '/' + segments[i];
    ancestors.push(current);
  }

  return ancestors;
}

/** 檢查路徑是否為另一路徑的子路徑 */
export function isSubPath(childPath: string, parentPath: string): boolean {
  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);

  if (normalizedChild === normalizedParent) {
    return false;
  }

  // 確保父路徑以 / 結尾進行比較
  const parentPrefix = normalizedParent === '/' ? '/' : normalizedParent + '/';

  return normalizedChild.startsWith(parentPrefix);
}

/** 計算路徑深度（根為 0） */
export function getPathDepth(inputPath: string): number {
  const { segments } = resolvePath(inputPath);
  return segments.length;
}

/** 取得共同祖先路徑 */
export function getCommonAncestor(path1: string, path2: string): string {
  const segments1 = splitPath(path1);
  const segments2 = splitPath(path2);

  const common: string[] = [];
  const minLength = Math.min(segments1.length, segments2.length);

  for (let i = 0; i < minLength; i++) {
    if (segments1[i] === segments2[i]) {
      common.push(segments1[i]);
    } else {
      break;
    }
  }

  if (common.length === 0) {
    return '/';
  }

  return '/' + common.join('/');
}
