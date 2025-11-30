/**
 * VFSWatcher 單元測試
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createVFS, VirtualFileSystem, FileChangeType } from '../../src/index.js';

describe('VFSWatcher', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本監聽', () => {
    it('應該發送 ready 事件', async () => {
      const watcher = vfs.watch('/');
      const readyHandler = vi.fn();

      watcher.on('ready', readyHandler);
      await vi.advanceTimersByTimeAsync(10);

      expect(readyHandler).toHaveBeenCalled();
      watcher.close();
    });

    it('應該在檔案建立時發送 add 事件', async () => {
      const watcher = vfs.watch('/');
      const addHandler = vi.fn();

      watcher.on('add', addHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.writeFile('/test.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      expect(addHandler).toHaveBeenCalled();
      const event = addHandler.mock.calls[0][0];
      expect(event.path).toBe('/test.txt');
      expect(event.type).toBe(FileChangeType.Add);

      watcher.close();
    });

    it('應該在檔案修改時發送 change 事件', async () => {
      await vfs.writeFile('/test.txt', 'original');

      const watcher = vfs.watch('/');
      const changeHandler = vi.fn();

      watcher.on('change', changeHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.writeFile('/test.txt', 'modified');
      await vi.advanceTimersByTimeAsync(150);

      expect(changeHandler).toHaveBeenCalled();
      const event = changeHandler.mock.calls[0][0];
      expect(event.path).toBe('/test.txt');
      expect(event.type).toBe(FileChangeType.Change);

      watcher.close();
    });

    it('應該在檔案刪除時發送 unlink 事件', async () => {
      await vfs.writeFile('/test.txt', 'content');

      const watcher = vfs.watch('/');
      const unlinkHandler = vi.fn();

      watcher.on('unlink', unlinkHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.deleteFile('/test.txt');
      await vi.advanceTimersByTimeAsync(150);

      expect(unlinkHandler).toHaveBeenCalled();
      const event = unlinkHandler.mock.calls[0][0];
      expect(event.path).toBe('/test.txt');
      expect(event.type).toBe(FileChangeType.Unlink);

      watcher.close();
    });

    it('應該在目錄建立時發送 addDir 事件', async () => {
      const watcher = vfs.watch('/');
      const addDirHandler = vi.fn();

      watcher.on('addDir', addDirHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.createDirectory('/newdir');
      await vi.advanceTimersByTimeAsync(150);

      expect(addDirHandler).toHaveBeenCalled();
      const event = addDirHandler.mock.calls[0][0];
      expect(event.path).toBe('/newdir');
      expect(event.type).toBe(FileChangeType.AddDir);

      watcher.close();
    });

    it('應該在目錄刪除時發送 unlinkDir 事件', async () => {
      await vfs.createDirectory('/mydir');

      const watcher = vfs.watch('/');
      const unlinkDirHandler = vi.fn();

      watcher.on('unlinkDir', unlinkDirHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.deleteDirectory('/mydir');
      await vi.advanceTimersByTimeAsync(150);

      expect(unlinkDirHandler).toHaveBeenCalled();
      const event = unlinkDirHandler.mock.calls[0][0];
      expect(event.path).toBe('/mydir');
      expect(event.type).toBe(FileChangeType.UnlinkDir);

      watcher.close();
    });
  });

  describe('all 事件', () => {
    it('應該對所有變更發送 all 事件', async () => {
      const watcher = vfs.watch('/');
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.writeFile('/file1.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      await vfs.createDirectory('/dir1');
      await vi.advanceTimersByTimeAsync(150);

      await vfs.deleteFile('/file1.txt');
      await vi.advanceTimersByTimeAsync(150);

      expect(allHandler).toHaveBeenCalledTimes(3);

      watcher.close();
    });
  });

  describe('debounce', () => {
    it('應該合併快速連續的變更', async () => {
      const watcher = vfs.watch('/', { debounce: 100 });
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      // 快速連續修改同一檔案
      await vfs.writeFile('/test.txt', 'v1');
      await vfs.writeFile('/test.txt', 'v2');
      await vfs.writeFile('/test.txt', 'v3');

      // debounce 延遲前不應該觸發
      expect(allHandler).not.toHaveBeenCalled();

      // debounce 延遲後應該只觸發一次
      await vi.advanceTimersByTimeAsync(150);
      expect(allHandler).toHaveBeenCalledTimes(1);

      watcher.close();
    });
  });

  describe('路徑過濾', () => {
    it('應該只監聽指定路徑下的變更', async () => {
      await vfs.createDirectory('/watched');
      await vfs.createDirectory('/unwatched');

      const watcher = vfs.watch('/watched');
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      // 不在監聽範圍內
      await vfs.writeFile('/unwatched/file.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      expect(allHandler).not.toHaveBeenCalled();

      // 在監聽範圍內
      await vfs.writeFile('/watched/file.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      expect(allHandler).toHaveBeenCalled();

      watcher.close();
    });

    it('應該支援 ignored 選項', async () => {
      const watcher = vfs.watch('/', { ignored: ['*.log', 'node_modules/*'] });
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      await vfs.writeFile('/app.log', 'log content');
      await vi.advanceTimersByTimeAsync(150);

      await vfs.writeFile('/normal.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      // 只有 normal.txt 應該觸發事件
      expect(allHandler).toHaveBeenCalledTimes(1);
      expect(allHandler.mock.calls[0][0].path).toBe('/normal.txt');

      watcher.close();
    });
  });

  describe('關閉監聽器', () => {
    it('關閉後不應該發送事件', async () => {
      const watcher = vfs.watch('/');
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      watcher.close();

      await vfs.writeFile('/test.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      expect(allHandler).not.toHaveBeenCalled();
    });

    it('應該正確報告 isClosed 狀態', () => {
      const watcher = vfs.watch('/');

      expect(watcher.isClosed).toBe(false);
      watcher.close();
      expect(watcher.isClosed).toBe(true);
    });
  });

  describe('深度限制', () => {
    it('應該遵守 depth 選項', async () => {
      await vfs.createDirectory('/a/b/c', true);

      // depth: 2 = 可以看到 /a（depth 1）和 /a/file.txt（depth 2）
      const watcher = vfs.watch('/', { depth: 2 });
      const allHandler = vi.fn();

      watcher.on('all', allHandler);
      await vi.advanceTimersByTimeAsync(10);

      // depth 2 內（/a = 1, file.txt = 2）
      await vfs.writeFile('/a/file.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      // depth 3 - 超出限制（/a = 1, /b = 2, file.txt = 3）
      await vfs.writeFile('/a/b/file.txt', 'content');
      await vi.advanceTimersByTimeAsync(150);

      // 只有 depth 2 內的應該觸發
      expect(allHandler).toHaveBeenCalledTimes(1);
      expect(allHandler.mock.calls[0][0].path).toBe('/a/file.txt');

      watcher.close();
    });
  });
});
