/**
 * 路徑正規化工具
 * 統一處理路徑格式，確保一致性
 */

/** 正規化路徑 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) {
    return '/';
  }

  // 統一使用正斜線
  let normalized = inputPath.replace(/\\/g, '/');

  // 移除連續斜線
  normalized = normalized.replace(/\/+/g, '/');

  // 處理 . 和 ..
  const parts = normalized.split('/');
  const stack: string[] = [];
  const isAbsolute = normalized.startsWith('/');

  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop();
      } else if (!isAbsolute) {
        stack.push('..');
      }
    } else {
      stack.push(part);
    }
  }

  let result = stack.join('/');

  // 確保絕對路徑以 / 開頭
  if (isAbsolute) {
    result = '/' + result;
  }

  // 空路徑處理
  if (!result) {
    return isAbsolute ? '/' : '.';
  }

  return result;
}

/** 取得目錄路徑 */
export function dirname(inputPath: string): string {
  const normalized = normalizePath(inputPath);

  if (normalized === '/') {
    return '/';
  }

  const lastSlash = normalized.lastIndexOf('/');

  if (lastSlash === -1) {
    return '.';
  }

  if (lastSlash === 0) {
    return '/';
  }

  return normalized.slice(0, lastSlash);
}

/** 取得檔案名稱 */
export function basename(inputPath: string, ext?: string): string {
  const normalized = normalizePath(inputPath);

  if (normalized === '/') {
    return '';
  }

  const lastSlash = normalized.lastIndexOf('/');
  let name = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);

  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }

  return name;
}

/** 取得副檔名 */
export function extname(inputPath: string): string {
  const name = basename(inputPath);
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex <= 0) {
    return '';
  }

  return name.slice(dotIndex);
}

/** 組合路徑 */
export function join(...paths: string[]): string {
  if (paths.length === 0) {
    return '.';
  }

  let joined = '';

  for (const path of paths) {
    if (!path) {
      continue;
    }

    if (!joined) {
      joined = path;
    } else {
      joined = joined + '/' + path;
    }
  }

  return normalizePath(joined);
}

/** 解析為絕對路徑 */
export function resolve(basePath: string, ...paths: string[]): string {
  let resolved = normalizePath(basePath);

  for (const path of paths) {
    if (!path) {
      continue;
    }

    const normalizedPath = normalizePath(path);

    if (normalizedPath.startsWith('/')) {
      resolved = normalizedPath;
    } else {
      resolved = join(resolved, normalizedPath);
    }
  }

  // 確保是絕對路徑
  if (!resolved.startsWith('/')) {
    resolved = '/' + resolved;
  }

  return resolved;
}

/** 計算相對路徑 */
export function relative(from: string, to: string): string {
  const fromNormalized = normalizePath(from);
  const toNormalized = normalizePath(to);

  if (fromNormalized === toNormalized) {
    return '';
  }

  const fromParts = fromNormalized.split('/').filter(Boolean);
  const toParts = toNormalized.split('/').filter(Boolean);

  // 找到共同前綴
  let commonLength = 0;
  const minLength = Math.min(fromParts.length, toParts.length);

  for (let i = 0; i < minLength; i++) {
    if (fromParts[i] === toParts[i]) {
      commonLength++;
    } else {
      break;
    }
  }

  // 計算需要的 ..
  const upCount = fromParts.length - commonLength;
  const ups = Array(upCount).fill('..');

  // 加上目標路徑的剩餘部分
  const remaining = toParts.slice(commonLength);

  const result = [...ups, ...remaining].join('/');

  return result || '.';
}

/** 是否為絕對路徑 */
export function isAbsolute(inputPath: string): boolean {
  return inputPath.startsWith('/');
}

/** 分割路徑為各部分 */
export function splitPath(inputPath: string): string[] {
  const normalized = normalizePath(inputPath);
  return normalized.split('/').filter(Boolean);
}
