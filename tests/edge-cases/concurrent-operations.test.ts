/**
 * 並發操作邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem } from '../../src/index.js';

describe('並發操作', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  it('應該處理並發寫入不同檔案', async () => {
    const writes = Array.from({ length: 100 }, (_, i) =>
      vfs.writeFile(`/file${i}.txt`, `content ${i}`)
    );

    await Promise.all(writes);

    // 驗證所有檔案都存在且內容正確
    for (let i = 0; i < 100; i++) {
      const content = await vfs.readFile(`/file${i}.txt`, 'utf-8');
      expect(content).toBe(`content ${i}`);
    }
  });

  it('應該處理並發讀取同一檔案', async () => {
    await vfs.writeFile('/shared.txt', 'shared content');

    const reads = Array.from({ length: 100 }, () =>
      vfs.readFile('/shared.txt', 'utf-8')
    );

    const results = await Promise.all(reads);

    for (const content of results) {
      expect(content).toBe('shared content');
    }
  });

  it('應該處理並發建立目錄', async () => {
    const creates = Array.from({ length: 50 }, (_, i) =>
      vfs.createDirectory(`/dir${i}/subdir`, true)
    );

    await Promise.all(creates);

    for (let i = 0; i < 50; i++) {
      expect(await vfs.isDirectory(`/dir${i}/subdir`)).toBe(true);
    }
  });

  it('應該處理並發讀取不同檔案', async () => {
    // 先建立檔案
    for (let i = 0; i < 100; i++) {
      await vfs.writeFile(`/file${i}.txt`, `content ${i}`);
    }

    // 並發讀取
    const reads = Array.from({ length: 100 }, (_, i) =>
      vfs.readFile(`/file${i}.txt`, 'utf-8')
    );

    const results = await Promise.all(reads);

    for (let i = 0; i < 100; i++) {
      expect(results[i]).toBe(`content ${i}`);
    }
  });

  it('應該處理並發複製操作', async () => {
    // 建立來源檔案
    for (let i = 0; i < 20; i++) {
      await vfs.writeFile(`/src/file${i}.txt`, `source ${i}`);
    }

    // 並發複製
    const copies = Array.from({ length: 20 }, (_, i) =>
      vfs.copyFile(`/src/file${i}.txt`, `/dest/file${i}.txt`)
    );

    await Promise.all(copies);

    for (let i = 0; i < 20; i++) {
      const content = await vfs.readFile(`/dest/file${i}.txt`, 'utf-8');
      expect(content).toBe(`source ${i}`);
    }
  });

  it('應該處理混合的並發操作', async () => {
    const operations: Promise<unknown>[] = [];

    // 混合寫入、讀取、建立目錄
    for (let i = 0; i < 50; i++) {
      operations.push(vfs.writeFile(`/mixed/file${i}.txt`, `content ${i}`));
      operations.push(vfs.createDirectory(`/mixed/dir${i}`, true));
    }

    await Promise.all(operations);

    // 驗證
    for (let i = 0; i < 50; i++) {
      expect(await vfs.exists(`/mixed/file${i}.txt`)).toBe(true);
      expect(await vfs.isDirectory(`/mixed/dir${i}`)).toBe(true);
    }
  });

  it('應該在並發下保持快照一致性', async () => {
    // 建立初始狀態
    await vfs.writeFile('/file.txt', 'original');
    const snapshot1 = vfs.createSnapshot('initial');

    // 並發修改
    const modifications = Array.from({ length: 10 }, (_, i) =>
      vfs.writeFile('/file.txt', `modified ${i}`)
    );

    await Promise.all(modifications);

    // 還原應該回到原始狀態
    vfs.restoreSnapshot(snapshot1);
    const content = await vfs.readFile('/file.txt', 'utf-8');
    expect(content).toBe('original');
  });

  it('應該處理並發刪除操作', async () => {
    // 建立檔案
    for (let i = 0; i < 50; i++) {
      await vfs.writeFile(`/delete/file${i}.txt`, 'to delete');
    }

    // 並發刪除
    const deletes = Array.from({ length: 50 }, (_, i) =>
      vfs.deleteFile(`/delete/file${i}.txt`)
    );

    await Promise.all(deletes);

    // 驗證所有檔案都已刪除
    for (let i = 0; i < 50; i++) {
      expect(await vfs.exists(`/delete/file${i}.txt`)).toBe(false);
    }
  });

  it('應該處理並發 glob 搜尋', async () => {
    // 建立檔案結構
    for (let i = 0; i < 20; i++) {
      await vfs.writeFile(`/search/dir${i}/file.ts`, 'export {}');
    }

    // 並發搜尋
    const searches = Array.from({ length: 10 }, () =>
      vfs.glob('**/*.ts', { cwd: '/search' })
    );

    const results = await Promise.all(searches);

    // 所有搜尋結果應該一致
    const expected = results[0].sort();
    for (const result of results) {
      expect(result.sort()).toEqual(expected);
    }
  });
});
