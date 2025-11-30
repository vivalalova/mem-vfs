/**
 * 空檔案邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem } from '../../src/index.js';

describe('空檔案處理', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  it('應該建立空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    expect(await vfs.exists('/empty.txt')).toBe(true);
  });

  it('應該讀取空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    const content = await vfs.readFile('/empty.txt', 'utf-8');
    expect(content).toBe('');
  });

  it('空檔案大小應該是 0', async () => {
    await vfs.writeFile('/empty.txt', '');
    const stats = await vfs.getStats('/empty.txt');
    expect(stats.size).toBe(0);
  });

  it('應該複製空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    await vfs.copyFile('/empty.txt', '/copy.txt');

    const content = await vfs.readFile('/copy.txt', 'utf-8');
    expect(content).toBe('');
  });

  it('應該追加到空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    await vfs.appendFile('/empty.txt', 'content');

    const content = await vfs.readFile('/empty.txt', 'utf-8');
    expect(content).toBe('content');
  });

  it('空目錄應該可以列出', async () => {
    await vfs.createDirectory('/empty-dir');
    const entries = await vfs.readDirectory('/empty-dir');
    expect(entries).toEqual([]);
  });

  it('應該在快照中保留空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    const snapshotId = vfs.createSnapshot();

    await vfs.writeFile('/empty.txt', 'not empty anymore');
    vfs.restoreSnapshot(snapshotId);

    const content = await vfs.readFile('/empty.txt', 'utf-8');
    expect(content).toBe('');
  });

  it('空 Buffer 應該正確處理', async () => {
    await vfs.writeFile('/empty.bin', Buffer.alloc(0));
    const content = await vfs.readFile('/empty.bin');

    expect(Buffer.isBuffer(content)).toBe(true);
    expect((content as Buffer).length).toBe(0);
  });

  it('glob 應該找到空檔案', async () => {
    await vfs.writeFile('/empty1.txt', '');
    await vfs.writeFile('/empty2.txt', '');
    await vfs.writeFile('/notempty.txt', 'content');

    const files = await vfs.glob('*.txt');
    expect(files.length).toBe(3);
  });

  it('空目錄應該可以刪除', async () => {
    await vfs.createDirectory('/empty-dir');
    await vfs.deleteDirectory('/empty-dir');

    expect(await vfs.exists('/empty-dir')).toBe(false);
  });

  it('JSON 輸出應該包含空檔案', async () => {
    await vfs.writeFile('/empty.txt', '');
    await vfs.writeFile('/notempty.txt', 'content');

    const json = vfs.toJSON();
    expect(json['empty.txt']).toBe('');
    expect(json['notempty.txt']).toBe('content');
  });
});
