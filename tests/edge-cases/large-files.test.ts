/**
 * 大檔案邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem } from '../../src/index.js';

describe('大檔案（1MB、10MB、100MB）', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  it('應該處理 1MB 檔案', async () => {
    const size = 1024 * 1024; // 1MB
    const content = Buffer.alloc(size, 'a');

    await vfs.writeFile('/1mb.bin', content);
    const read = await vfs.readFile('/1mb.bin');

    expect(Buffer.isBuffer(read)).toBe(true);
    expect((read as Buffer).length).toBe(size);
  });

  it('應該處理 10MB 檔案', async () => {
    const size = 10 * 1024 * 1024; // 10MB
    const content = Buffer.alloc(size, 'b');

    await vfs.writeFile('/10mb.bin', content);
    const stats = await vfs.getStats('/10mb.bin');

    expect(stats.size).toBe(size);
  });

  it('應該正確複製大檔案', async () => {
    const size = 5 * 1024 * 1024; // 5MB
    const content = Buffer.alloc(size);

    // 填入隨機資料
    for (let i = 0; i < size; i++) {
      content[i] = i % 256;
    }

    await vfs.writeFile('/source.bin', content);
    await vfs.copyFile('/source.bin', '/dest.bin');

    const sourceBuf = await vfs.readFile('/source.bin') as Buffer;
    const destBuf = await vfs.readFile('/dest.bin') as Buffer;

    expect(sourceBuf.equals(destBuf)).toBe(true);
  });

  it('應該正確追加大量內容', async () => {
    const chunkSize = 1024 * 100; // 100KB per chunk
    const chunks = 20; // 2MB total

    await vfs.writeFile('/append.bin', '');

    for (let i = 0; i < chunks; i++) {
      const chunk = Buffer.alloc(chunkSize, i % 256);
      await vfs.appendFile('/append.bin', chunk);
    }

    const stats = await vfs.getStats('/append.bin');
    expect(stats.size).toBe(chunkSize * chunks);
  });

  it('應該在快照中正確處理大檔案', async () => {
    const size = 2 * 1024 * 1024; // 2MB
    const content = Buffer.alloc(size, 'x');

    await vfs.writeFile('/large.bin', content);
    const snapshotId = vfs.createSnapshot();

    // 修改檔案
    await vfs.writeFile('/large.bin', 'small');

    // 還原
    vfs.restoreSnapshot(snapshotId);

    const restored = await vfs.readFile('/large.bin') as Buffer;
    expect(restored.length).toBe(size);
  });

  it('應該處理包含大檔案的目錄操作', async () => {
    const size = 1024 * 1024; // 1MB each

    await vfs.writeFile('/dir/file1.bin', Buffer.alloc(size, 1));
    await vfs.writeFile('/dir/file2.bin', Buffer.alloc(size, 2));
    await vfs.writeFile('/dir/file3.bin', Buffer.alloc(size, 3));

    const entries = await vfs.readDirectory('/dir');
    expect(entries.length).toBe(3);

    // 總大小應該約 3MB
    const totalSize = entries.reduce((sum, e) => sum + (e.size ?? 0), 0);
    expect(totalSize).toBe(size * 3);
  });

  it('應該正確計算大檔案的差異', async () => {
    const size = 1024 * 1024; // 1MB

    await vfs.writeFile('/file.bin', Buffer.alloc(size, 'a'));
    const snapshot1 = vfs.createSnapshot();

    await vfs.writeFile('/file.bin', Buffer.alloc(size, 'b'));
    const diffs = vfs.diff(snapshot1);

    expect(diffs.length).toBe(1);
    expect(diffs[0].type).toBe('modified');
    expect(diffs[0].oldContent?.length).toBe(size);
    expect(diffs[0].newContent?.length).toBe(size);
  });
});
