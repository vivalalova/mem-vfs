/**
 * 符號連結循環邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem, SymlinkLoopError } from '../../src/index.js';

describe('符號連結循環檢測', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  it('應該偵測直接循環（A -> B -> A）', async () => {
    await vfs.createSymlink('/b', '/a');
    await vfs.createSymlink('/a', '/b');

    await expect(vfs.readFile('/a')).rejects.toThrow(SymlinkLoopError);
  });

  it('應該偵測間接循環（A -> B -> C -> A）', async () => {
    await vfs.createSymlink('/b', '/a');
    await vfs.createSymlink('/c', '/b');
    await vfs.createSymlink('/a', '/c');

    await expect(vfs.readFile('/a')).rejects.toThrow(SymlinkLoopError);
  });

  it('應該偵測長鏈循環', async () => {
    // 建立連結鏈：link0 -> link1 -> link2 -> ... -> link9 -> link0（循環）
    for (let i = 0; i < 9; i++) {
      await vfs.createSymlink(`/link${i + 1}`, `/link${i}`);
    }
    await vfs.createSymlink('/link0', '/link9'); // 形成循環

    await expect(vfs.readFile('/link0')).rejects.toThrow(SymlinkLoopError);
  });

  it('應該處理自我循環（A -> A）', async () => {
    await vfs.createSymlink('/self', '/self');

    await expect(vfs.readFile('/self')).rejects.toThrow(SymlinkLoopError);
  });

  it('應該正確處理深層嵌套連結但無循環', async () => {
    await vfs.writeFile('/target.txt', 'content');

    // 建立 30 層連結鏈（不超過預設的 40 層限制）
    let currentTarget = '/target.txt';
    for (let i = 0; i < 30; i++) {
      const linkPath = `/link${i}`;
      await vfs.createSymlink(currentTarget, linkPath);
      currentTarget = linkPath;
    }

    // 應該能成功讀取最深層的連結
    const content = await vfs.readFile('/link29', 'utf-8');
    expect(content).toBe('content');
  });

  it('應該在超過最大深度時拋出錯誤', async () => {
    // 使用自訂的低限制 VFS
    const limitedVfs = createVFS({ maxSymlinkDepth: 5 });

    await limitedVfs.writeFile('/target.txt', 'content');

    // 建立超過限制的連結鏈
    let currentTarget = '/target.txt';
    for (let i = 0; i < 10; i++) {
      const linkPath = `/link${i}`;
      await limitedVfs.createSymlink(currentTarget, linkPath);
      currentTarget = linkPath;
    }

    await expect(limitedVfs.readFile('/link9')).rejects.toThrow(SymlinkLoopError);
  });

  it('應該處理目錄中的符號連結', async () => {
    // 在目錄中建立指向父目錄的符號連結
    await vfs.createDirectory('/dir');
    await vfs.writeFile('/dir/file.txt', 'content');
    await vfs.createSymlink('/dir', '/dir/self');

    // 透過符號連結存取檔案應該正常工作
    const content = await vfs.readFile('/dir/self/file.txt', 'utf-8');
    expect(content).toBe('content');

    // 可以讀取目錄內容
    const entries = await vfs.readDirectory('/dir/self');
    expect(entries.map(e => e.name).sort()).toEqual(['file.txt', 'self']);
  });

  it('應該在讀取連結時不跟隨循環', async () => {
    await vfs.createSymlink('/b', '/a');
    await vfs.createSymlink('/a', '/b');

    // readSymlink 不跟隨連結，所以不應該拋出循環錯誤
    const target = await vfs.readSymlink('/a');
    expect(target).toBe('/b');
  });

  it('應該正確識別非循環的複雜連結結構', async () => {
    await vfs.writeFile('/file.txt', 'content');

    // 建立複雜但非循環的結構
    await vfs.createSymlink('/file.txt', '/link1');
    await vfs.createSymlink('/file.txt', '/link2');
    await vfs.createSymlink('/link1', '/link3');
    await vfs.createSymlink('/link2', '/link4');

    // 所有連結都應該能正常讀取
    expect(await vfs.readFile('/link1', 'utf-8')).toBe('content');
    expect(await vfs.readFile('/link2', 'utf-8')).toBe('content');
    expect(await vfs.readFile('/link3', 'utf-8')).toBe('content');
    expect(await vfs.readFile('/link4', 'utf-8')).toBe('content');
  });
});
