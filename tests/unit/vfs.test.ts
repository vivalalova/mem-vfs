/**
 * VirtualFileSystem 單元測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem, createVFS } from '../../src/core/vfs.js';
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  DirectoryNotEmptyError,
  NotAFileError,
  NotADirectoryError,
  NotASymlinkError,
  SymlinkLoopError,
} from '../../src/errors/file-system-errors.js';
import { DiffType } from '../../src/types/index.js';

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  // ============================================================
  // 基本檔案操作
  // ============================================================

  describe('檔案操作', () => {
    it('應該寫入並讀取字串內容', async () => {
      await vfs.writeFile('/test.txt', 'Hello, World!');
      const content = await vfs.readFile('/test.txt', 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    it('應該寫入並讀取 Buffer 內容', async () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      await vfs.writeFile('/test.bin', buffer);
      const content = await vfs.readFile('/test.bin');
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content).toEqual(buffer);
    });

    it('應該自動建立父目錄', async () => {
      await vfs.writeFile('/deep/nested/path/file.txt', 'content');
      const content = await vfs.readFile('/deep/nested/path/file.txt', 'utf-8');
      expect(content).toBe('content');
      expect(await vfs.isDirectory('/deep')).toBe(true);
      expect(await vfs.isDirectory('/deep/nested')).toBe(true);
      expect(await vfs.isDirectory('/deep/nested/path')).toBe(true);
    });

    it('應該覆寫現有檔案', async () => {
      await vfs.writeFile('/test.txt', 'original');
      await vfs.writeFile('/test.txt', 'updated');
      const content = await vfs.readFile('/test.txt', 'utf-8');
      expect(content).toBe('updated');
    });

    it('讀取不存在的檔案應該拋出 FileNotFoundError', async () => {
      await expect(vfs.readFile('/nonexistent.txt')).rejects.toThrow(FileNotFoundError);
    });

    it('讀取目錄應該拋出 NotAFileError', async () => {
      await vfs.createDirectory('/mydir');
      await expect(vfs.readFile('/mydir')).rejects.toThrow(NotAFileError);
    });

    it('應該追加檔案內容', async () => {
      await vfs.writeFile('/test.txt', 'Hello');
      await vfs.appendFile('/test.txt', ', World!');
      const content = await vfs.readFile('/test.txt', 'utf-8');
      expect(content).toBe('Hello, World!');
    });

    it('追加到不存在的檔案應該建立新檔案', async () => {
      await vfs.appendFile('/new.txt', 'content');
      const content = await vfs.readFile('/new.txt', 'utf-8');
      expect(content).toBe('content');
    });

    it('應該刪除檔案', async () => {
      await vfs.writeFile('/test.txt', 'content');
      await vfs.deleteFile('/test.txt');
      expect(await vfs.exists('/test.txt')).toBe(false);
    });

    it('刪除不存在的檔案應該拋出 FileNotFoundError', async () => {
      await expect(vfs.deleteFile('/nonexistent.txt')).rejects.toThrow(FileNotFoundError);
    });

    it('刪除目錄應該拋出 NotAFileError', async () => {
      await vfs.createDirectory('/mydir');
      await expect(vfs.deleteFile('/mydir')).rejects.toThrow(NotAFileError);
    });
  });

  // ============================================================
  // 目錄操作
  // ============================================================

  describe('目錄操作', () => {
    it('應該建立目錄', async () => {
      await vfs.createDirectory('/mydir');
      expect(await vfs.isDirectory('/mydir')).toBe(true);
    });

    it('應該遞迴建立目錄', async () => {
      await vfs.createDirectory('/a/b/c/d', true);
      expect(await vfs.isDirectory('/a')).toBe(true);
      expect(await vfs.isDirectory('/a/b')).toBe(true);
      expect(await vfs.isDirectory('/a/b/c')).toBe(true);
      expect(await vfs.isDirectory('/a/b/c/d')).toBe(true);
    });

    it('非遞迴模式下建立深層目錄應該失敗', async () => {
      await expect(vfs.createDirectory('/a/b/c', false)).rejects.toThrow(DirectoryNotFoundError);
    });

    it('應該讀取目錄內容', async () => {
      await vfs.writeFile('/dir/file1.txt', 'content1');
      await vfs.writeFile('/dir/file2.txt', 'content2');
      await vfs.createDirectory('/dir/subdir');

      const entries = await vfs.readDirectory('/dir');
      expect(entries.length).toBe(3);

      const names = entries.map(e => e.name).sort();
      expect(names).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });

    it('應該刪除空目錄', async () => {
      await vfs.createDirectory('/empty');
      await vfs.deleteDirectory('/empty');
      expect(await vfs.exists('/empty')).toBe(false);
    });

    it('刪除非空目錄應該拋出 DirectoryNotEmptyError', async () => {
      await vfs.writeFile('/dir/file.txt', 'content');
      await expect(vfs.deleteDirectory('/dir')).rejects.toThrow(DirectoryNotEmptyError);
    });

    it('應該遞迴刪除目錄', async () => {
      await vfs.writeFile('/dir/a/b/c.txt', 'content');
      await vfs.deleteDirectory('/dir', true);
      expect(await vfs.exists('/dir')).toBe(false);
    });
  });

  // ============================================================
  // 狀態查詢
  // ============================================================

  describe('狀態查詢', () => {
    it('應該正確判斷路徑存在', async () => {
      await vfs.writeFile('/file.txt', 'content');
      await vfs.createDirectory('/dir');

      expect(await vfs.exists('/file.txt')).toBe(true);
      expect(await vfs.exists('/dir')).toBe(true);
      expect(await vfs.exists('/nonexistent')).toBe(false);
    });

    it('應該正確判斷檔案類型', async () => {
      await vfs.writeFile('/file.txt', 'content');
      await vfs.createDirectory('/dir');

      expect(await vfs.isFile('/file.txt')).toBe(true);
      expect(await vfs.isFile('/dir')).toBe(false);
      expect(await vfs.isDirectory('/file.txt')).toBe(false);
      expect(await vfs.isDirectory('/dir')).toBe(true);
    });

    it('應該取得檔案統計', async () => {
      await vfs.writeFile('/file.txt', 'Hello');
      const stats = await vfs.getStats('/file.txt');

      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.size).toBe(5);
      expect(stats.createdTime).toBeInstanceOf(Date);
      expect(stats.modifiedTime).toBeInstanceOf(Date);
    });

    it('取得不存在路徑的統計應該拋出錯誤', async () => {
      await expect(vfs.getStats('/nonexistent')).rejects.toThrow(FileNotFoundError);
    });
  });

  // ============================================================
  // 複製與移動
  // ============================================================

  describe('複製與移動', () => {
    it('應該複製檔案', async () => {
      await vfs.writeFile('/source.txt', 'content');
      await vfs.copyFile('/source.txt', '/dest.txt');

      expect(await vfs.readFile('/source.txt', 'utf-8')).toBe('content');
      expect(await vfs.readFile('/dest.txt', 'utf-8')).toBe('content');
    });

    it('應該移動檔案', async () => {
      await vfs.writeFile('/source.txt', 'content');
      await vfs.moveFile('/source.txt', '/dest.txt');

      expect(await vfs.exists('/source.txt')).toBe(false);
      expect(await vfs.readFile('/dest.txt', 'utf-8')).toBe('content');
    });
  });

  // ============================================================
  // 符號連結
  // ============================================================

  describe('符號連結', () => {
    it('應該建立符號連結', async () => {
      await vfs.writeFile('/target.txt', 'content');
      await vfs.createSymlink('/target.txt', '/link.txt');

      expect(await vfs.isSymlink('/link.txt')).toBe(true);
    });

    it('應該讀取符號連結目標', async () => {
      await vfs.writeFile('/target.txt', 'content');
      await vfs.createSymlink('/target.txt', '/link.txt');

      const target = await vfs.readSymlink('/link.txt');
      expect(target).toBe('/target.txt');
    });

    it('應該透過符號連結讀取檔案', async () => {
      await vfs.writeFile('/target.txt', 'content');
      await vfs.createSymlink('/target.txt', '/link.txt');

      const content = await vfs.readFile('/link.txt', 'utf-8');
      expect(content).toBe('content');
    });

    it('應該透過符號連結寫入檔案', async () => {
      await vfs.writeFile('/target.txt', 'original');
      await vfs.createSymlink('/target.txt', '/link.txt');
      await vfs.writeFile('/link.txt', 'updated');

      const content = await vfs.readFile('/target.txt', 'utf-8');
      expect(content).toBe('updated');
    });

    it('應該偵測符號連結循環', async () => {
      await vfs.createSymlink('/b', '/a');
      await vfs.createSymlink('/a', '/b');

      await expect(vfs.readFile('/a')).rejects.toThrow(SymlinkLoopError);
    });

    it('讀取非符號連結的目標應該拋出錯誤', async () => {
      await vfs.writeFile('/file.txt', 'content');
      await expect(vfs.readSymlink('/file.txt')).rejects.toThrow(NotASymlinkError);
    });
  });

  // ============================================================
  // Glob
  // ============================================================

  describe('Glob', () => {
    beforeEach(async () => {
      await vfs.writeFile('/src/index.ts', 'export {}');
      await vfs.writeFile('/src/utils/helper.ts', 'export {}');
      await vfs.writeFile('/src/utils/format.ts', 'export {}');
      await vfs.writeFile('/tests/index.test.ts', 'test');
      await vfs.writeFile('/README.md', '# README');
      await vfs.writeFile('/.hidden', 'hidden');
    });

    it('應該匹配所有 ts 檔案', async () => {
      const files = await vfs.glob('**/*.ts');
      expect(files.sort()).toEqual([
        '/src/index.ts',
        '/src/utils/format.ts',
        '/src/utils/helper.ts',
        '/tests/index.test.ts',
      ]);
    });

    it('應該限制深度', async () => {
      // maxDepth: 1 = 最多遍歷 1 層子目錄
      // /src/index.ts 在第 1 層，/src/utils/helper.ts 在第 2 層
      const files = await vfs.glob('**/*.ts', { maxDepth: 1 });
      expect(files.sort()).toEqual([
        '/src/index.ts',
        '/tests/index.test.ts',
      ]);
    });

    it('應該只回傳檔案', async () => {
      const files = await vfs.glob('*', { onlyFiles: true });
      expect(files).toContain('/README.md');
      expect(files).not.toContain('/src');
    });

    it('應該只回傳目錄', async () => {
      const dirs = await vfs.glob('*', { onlyDirectories: true });
      expect(dirs).toContain('/src');
      expect(dirs).toContain('/tests');
      expect(dirs).not.toContain('/README.md');
    });

    it('應該支援忽略規則', async () => {
      const files = await vfs.glob('**/*.ts', { ignore: ['**/tests/**'] });
      expect(files).not.toContain('/tests/index.test.ts');
    });

    it('預設應該忽略隱藏檔案', async () => {
      const files = await vfs.glob('*');
      expect(files).not.toContain('/.hidden');
    });

    it('設定 dot 選項應該包含隱藏檔案', async () => {
      const files = await vfs.glob('*', { dot: true });
      expect(files).toContain('/.hidden');
    });
  });

  // ============================================================
  // 快照與回滾
  // ============================================================

  describe('快照與回滾', () => {
    it('應該建立快照', async () => {
      await vfs.writeFile('/file.txt', 'original');
      const snapshotId = vfs.createSnapshot('test');

      expect(snapshotId).toBe('snapshot-1');
      expect(vfs.listSnapshots().length).toBe(1);
    });

    it('應該還原快照', async () => {
      await vfs.writeFile('/file.txt', 'original');
      const snapshotId = vfs.createSnapshot();

      await vfs.writeFile('/file.txt', 'modified');
      await vfs.writeFile('/new.txt', 'new');

      vfs.restoreSnapshot(snapshotId);

      expect(await vfs.readFile('/file.txt', 'utf-8')).toBe('original');
      expect(await vfs.exists('/new.txt')).toBe(false);
    });

    it('應該計算差異', async () => {
      await vfs.writeFile('/file.txt', 'original');
      const snapshot1 = vfs.createSnapshot();

      await vfs.writeFile('/file.txt', 'modified');
      await vfs.writeFile('/new.txt', 'new');
      await vfs.deleteFile('/file.txt');

      const diffs = vfs.diff(snapshot1);

      expect(diffs.length).toBe(2);
      expect(diffs.find(d => d.path === '/file.txt')?.type).toBe(DiffType.Deleted);
      expect(diffs.find(d => d.path === '/new.txt')?.type).toBe(DiffType.Added);
    });

    it('應該刪除快照', async () => {
      const id = vfs.createSnapshot();
      expect(vfs.deleteSnapshot(id)).toBe(true);
      expect(vfs.listSnapshots().length).toBe(0);
    });
  });

  // ============================================================
  // JSON 工具
  // ============================================================

  describe('JSON 工具', () => {
    it('應該從 JSON 載入結構', async () => {
      await vfs.fromJSON({
        'src': {
          'index.ts': 'export {}',
          'utils': {
            'helper.ts': 'export function help() {}',
          },
        },
        'README.md': '# Project',
      });

      expect(await vfs.readFile('/src/index.ts', 'utf-8')).toBe('export {}');
      expect(await vfs.readFile('/src/utils/helper.ts', 'utf-8')).toBe('export function help() {}');
      expect(await vfs.readFile('/README.md', 'utf-8')).toBe('# Project');
    });

    it('應該輸出為 JSON', async () => {
      await vfs.writeFile('/src/index.ts', 'export {}');
      await vfs.writeFile('/README.md', '# Project');

      const json = vfs.toJSON();

      expect(json['src']).toBeDefined();
      expect(json['README.md']).toBe('# Project');
    });

    it('應該重置檔案系統', async () => {
      await vfs.writeFile('/file.txt', 'content');
      vfs.createSnapshot();
      vfs.reset();

      expect(await vfs.exists('/file.txt')).toBe(false);
      expect(vfs.listSnapshots().length).toBe(0);
    });
  });

  // ============================================================
  // 邊界案例
  // ============================================================

  describe('邊界案例', () => {
    it('應該處理空檔案', async () => {
      await vfs.writeFile('/empty.txt', '');
      const content = await vfs.readFile('/empty.txt', 'utf-8');
      expect(content).toBe('');

      const stats = await vfs.getStats('/empty.txt');
      expect(stats.size).toBe(0);
    });

    it('應該處理特殊字元檔名', async () => {
      await vfs.writeFile('/file with spaces.txt', 'content');
      await vfs.writeFile('/中文檔名.txt', '內容');
      await vfs.writeFile('/emoji-🎉.txt', 'party');

      expect(await vfs.readFile('/file with spaces.txt', 'utf-8')).toBe('content');
      expect(await vfs.readFile('/中文檔名.txt', 'utf-8')).toBe('內容');
      expect(await vfs.readFile('/emoji-🎉.txt', 'utf-8')).toBe('party');
    });

    it('應該處理根目錄操作', async () => {
      expect(await vfs.isDirectory('/')).toBe(true);
      expect(await vfs.exists('/')).toBe(true);

      const entries = await vfs.readDirectory('/');
      expect(Array.isArray(entries)).toBe(true);
    });

    it('應該正規化路徑', async () => {
      await vfs.writeFile('/a/b/../c/./d.txt', 'content');
      expect(await vfs.readFile('/a/c/d.txt', 'utf-8')).toBe('content');
    });
  });
});
