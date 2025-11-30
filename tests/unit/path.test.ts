/**
 * 路徑工具單元測試
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  dirname,
  basename,
  extname,
  join,
  resolve,
  relative,
  isAbsolute,
  splitPath,
  resolvePath,
  getAncestorPaths,
  isSubPath,
  getPathDepth,
  getCommonAncestor,
  validatePath,
  validateFileName,
  isValidPath,
  isValidFileName,
  InvalidPathError,
} from '../../src/index.js';

describe('路徑正規化', () => {
  describe('normalizePath', () => {
    it('應該處理空字串', () => {
      expect(normalizePath('')).toBe('/');
    });

    it('應該統一使用正斜線', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
    });

    it('應該移除連續斜線', () => {
      expect(normalizePath('a//b///c')).toBe('a/b/c');
    });

    it('應該處理 . 和 ..', () => {
      expect(normalizePath('/a/b/../c/./d')).toBe('/a/c/d');
      expect(normalizePath('/a/b/../../c')).toBe('/c');
      expect(normalizePath('/../a')).toBe('/a');
    });

    it('應該保留絕對路徑', () => {
      expect(normalizePath('/a/b/c')).toBe('/a/b/c');
    });

    it('應該處理相對路徑', () => {
      expect(normalizePath('a/b/c')).toBe('a/b/c');
    });
  });

  describe('dirname', () => {
    it('應該取得目錄路徑', () => {
      expect(dirname('/path/to/file.txt')).toBe('/path/to');
      expect(dirname('/file.txt')).toBe('/');
      expect(dirname('/')).toBe('/');
    });
  });

  describe('basename', () => {
    it('應該取得檔案名稱', () => {
      expect(basename('/path/to/file.txt')).toBe('file.txt');
      expect(basename('/path/to/file.txt', '.txt')).toBe('file');
      expect(basename('/')).toBe('');
    });
  });

  describe('extname', () => {
    it('應該取得副檔名', () => {
      expect(extname('/path/to/file.txt')).toBe('.txt');
      expect(extname('/path/to/file.tar.gz')).toBe('.gz');
      expect(extname('/path/to/file')).toBe('');
      expect(extname('/path/to/.hidden')).toBe('');
    });
  });

  describe('join', () => {
    it('應該組合路徑', () => {
      expect(join('/a', 'b', 'c')).toBe('/a/b/c');
      expect(join('/a', '', 'c')).toBe('/a/c');
      expect(join()).toBe('.');
    });
  });

  describe('resolve', () => {
    it('應該解析為絕對路徑', () => {
      expect(resolve('/a/b', 'c')).toBe('/a/b/c');
      expect(resolve('/a/b', '/c')).toBe('/c');
      expect(resolve('/a/b', '../c')).toBe('/a/c');
    });
  });

  describe('relative', () => {
    it('應該計算相對路徑', () => {
      expect(relative('/a/b/c', '/a/b/d')).toBe('../d');
      expect(relative('/a/b', '/a/b/c/d')).toBe('c/d');
      expect(relative('/a/b/c', '/a/b/c')).toBe('');
      expect(relative('/a/b', '/c/d')).toBe('../../c/d');
    });
  });

  describe('isAbsolute', () => {
    it('應該判斷是否為絕對路徑', () => {
      expect(isAbsolute('/a/b')).toBe(true);
      expect(isAbsolute('a/b')).toBe(false);
    });
  });

  describe('splitPath', () => {
    it('應該分割路徑', () => {
      expect(splitPath('/a/b/c')).toEqual(['a', 'b', 'c']);
      expect(splitPath('/')).toEqual([]);
    });
  });
});

describe('路徑解析', () => {
  describe('resolvePath', () => {
    it('應該解析路徑', () => {
      const result = resolvePath('/a/b/c.txt');
      expect(result.fullPath).toBe('/a/b/c.txt');
      expect(result.parentPath).toBe('/a/b');
      expect(result.name).toBe('c.txt');
      expect(result.segments).toEqual(['a', 'b', 'c.txt']);
      expect(result.isRoot).toBe(false);
    });

    it('應該處理根目錄', () => {
      const result = resolvePath('/');
      expect(result.fullPath).toBe('/');
      expect(result.isRoot).toBe(true);
      expect(result.name).toBe('');
    });
  });

  describe('getAncestorPaths', () => {
    it('應該取得所有祖先路徑', () => {
      expect(getAncestorPaths('/a/b/c')).toEqual(['/', '/a', '/a/b']);
    });

    it('應該處理根目錄', () => {
      expect(getAncestorPaths('/')).toEqual(['/']);
    });
  });

  describe('isSubPath', () => {
    it('應該判斷子路徑', () => {
      expect(isSubPath('/a/b/c', '/a')).toBe(true);
      expect(isSubPath('/a/b', '/a/b')).toBe(false);
      expect(isSubPath('/a/b', '/c')).toBe(false);
      expect(isSubPath('/abc', '/a')).toBe(false);
    });
  });

  describe('getPathDepth', () => {
    it('應該計算路徑深度', () => {
      expect(getPathDepth('/')).toBe(0);
      expect(getPathDepth('/a')).toBe(1);
      expect(getPathDepth('/a/b/c')).toBe(3);
    });
  });

  describe('getCommonAncestor', () => {
    it('應該取得共同祖先', () => {
      expect(getCommonAncestor('/a/b/c', '/a/b/d')).toBe('/a/b');
      expect(getCommonAncestor('/a/b', '/c/d')).toBe('/');
      expect(getCommonAncestor('/a/b/c', '/a/b/c/d')).toBe('/a/b/c');
    });
  });
});

describe('路徑驗證', () => {
  describe('validatePath', () => {
    it('應該接受有效路徑', () => {
      expect(() => validatePath('/a/b/c')).not.toThrow();
      expect(() => validatePath('/path/to/file.txt')).not.toThrow();
    });

    it('應該拒絕空路徑', () => {
      expect(() => validatePath('')).toThrow(InvalidPathError);
    });

    it('應該拒絕過長路徑', () => {
      const longPath = '/' + 'a'.repeat(5000);
      expect(() => validatePath(longPath)).toThrow(InvalidPathError);
    });

    it('應該拒絕無效字元', () => {
      expect(() => validatePath('/path\x00to')).toThrow(InvalidPathError);
    });

    it('應該允許 . 和 .. 作為路徑導航', () => {
      expect(() => validatePath('/a/../b')).not.toThrow();
      expect(() => validatePath('/a/./b')).not.toThrow();
    });
  });

  describe('validateFileName', () => {
    it('應該接受有效檔名', () => {
      expect(() => validateFileName('file.txt')).not.toThrow();
    });

    it('應該拒絕空檔名', () => {
      expect(() => validateFileName('')).toThrow(InvalidPathError);
    });

    it('應該拒絕包含斜線的檔名', () => {
      expect(() => validateFileName('a/b')).toThrow(InvalidPathError);
    });
  });

  describe('isValidPath / isValidFileName', () => {
    it('isValidPath 應該回傳布林值', () => {
      expect(isValidPath('/valid/path')).toBe(true);
      expect(isValidPath('')).toBe(false);
    });

    it('isValidFileName 應該回傳布林值', () => {
      expect(isValidFileName('file.txt')).toBe(true);
      expect(isValidFileName('')).toBe(false);
    });
  });
});
