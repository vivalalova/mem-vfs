/**
 * 深層目錄邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem } from '../../src/index.js';

describe('深層目錄（100+ 層）', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  it('應該建立 100 層深的目錄', async () => {
    const depth = 100;
    let path = '';

    for (let i = 0; i < depth; i++) {
      path += `/level${i}`;
    }

    await vfs.createDirectory(path, true);
    expect(await vfs.isDirectory(path)).toBe(true);
  });

  it('應該在 100 層深處寫入和讀取檔案', async () => {
    const depth = 100;
    let path = '';

    for (let i = 0; i < depth; i++) {
      path += `/d${i}`;
    }

    const filePath = `${path}/deep-file.txt`;
    await vfs.writeFile(filePath, 'content at 100 levels');

    const content = await vfs.readFile(filePath, 'utf-8');
    expect(content).toBe('content at 100 levels');
  });

  it('應該正確計算深層目錄的統計', async () => {
    const depth = 50;
    let path = '';

    for (let i = 0; i < depth; i++) {
      path += `/dir${i}`;
    }

    await vfs.writeFile(`${path}/file.txt`, 'test');
    const stats = await vfs.getStats(`${path}/file.txt`);

    expect(stats.isFile).toBe(true);
    expect(stats.size).toBe(4);
  });

  it('應該支援深層目錄的 glob 搜尋', async () => {
    // 建立深層結構
    for (let i = 1; i <= 10; i++) {
      let path = '';
      for (let j = 0; j < i; j++) {
        path += `/level${j}`;
      }
      await vfs.writeFile(`${path}/file.txt`, `content ${i}`);
    }

    // 搜尋所有 txt 檔案
    const files = await vfs.glob('**/*.txt');
    expect(files.length).toBe(10);
  });

  it('應該正確刪除深層目錄', async () => {
    const depth = 50;
    let path = '';

    for (let i = 0; i < depth; i++) {
      path += `/deep${i}`;
    }

    await vfs.writeFile(`${path}/file.txt`, 'content');
    await vfs.deleteDirectory('/deep0', true);

    expect(await vfs.exists('/deep0')).toBe(false);
  });

  it('應該處理超長路徑名稱', async () => {
    // 每個目錄名 50 字元，20 層 = 1000 字元路徑
    const segmentName = 'a'.repeat(50);
    let path = '';

    for (let i = 0; i < 20; i++) {
      path += `/${segmentName}${i}`;
    }

    await vfs.writeFile(`${path}/file.txt`, 'content');
    const content = await vfs.readFile(`${path}/file.txt`, 'utf-8');
    expect(content).toBe('content');
  });
});
