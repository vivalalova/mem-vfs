/**
 * 特殊字元邊界測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createVFS, VirtualFileSystem } from '../../src/index.js';

describe('特殊字元（空格、中文、emoji）', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = createVFS();
  });

  describe('空格處理', () => {
    it('應該處理檔名中的空格', async () => {
      await vfs.writeFile('/file with spaces.txt', 'content');
      const content = await vfs.readFile('/file with spaces.txt', 'utf-8');
      expect(content).toBe('content');
    });

    it('應該處理目錄名中的空格', async () => {
      await vfs.createDirectory('/my folder/sub folder', true);
      expect(await vfs.isDirectory('/my folder/sub folder')).toBe(true);
    });

    it('應該處理多個連續空格', async () => {
      await vfs.writeFile('/file   with   many   spaces.txt', 'content');
      expect(await vfs.exists('/file   with   many   spaces.txt')).toBe(true);
    });
  });

  describe('中文處理', () => {
    it('應該處理中文檔名', async () => {
      await vfs.writeFile('/中文檔案.txt', '內容');
      const content = await vfs.readFile('/中文檔案.txt', 'utf-8');
      expect(content).toBe('內容');
    });

    it('應該處理中文目錄名', async () => {
      await vfs.createDirectory('/中文目錄/子目錄', true);
      expect(await vfs.isDirectory('/中文目錄/子目錄')).toBe(true);
    });

    it('應該處理中文內容', async () => {
      const chineseContent = '這是一段很長的中文內容，包含各種字符：！@#￥%……&*（）';
      await vfs.writeFile('/test.txt', chineseContent);
      const content = await vfs.readFile('/test.txt', 'utf-8');
      expect(content).toBe(chineseContent);
    });

    it('應該處理混合中英文', async () => {
      await vfs.writeFile('/混合Mixed檔案File.txt', 'Mixed混合Content內容');
      const content = await vfs.readFile('/混合Mixed檔案File.txt', 'utf-8');
      expect(content).toBe('Mixed混合Content內容');
    });
  });

  describe('Emoji 處理', () => {
    it('應該處理 emoji 檔名', async () => {
      await vfs.writeFile('/file-🎉.txt', 'party');
      const content = await vfs.readFile('/file-🎉.txt', 'utf-8');
      expect(content).toBe('party');
    });

    it('應該處理多個 emoji', async () => {
      await vfs.writeFile('/🎉🎊🎁.txt', 'celebration');
      expect(await vfs.exists('/🎉🎊🎁.txt')).toBe(true);
    });

    it('應該處理複雜 emoji（skin tone）', async () => {
      await vfs.writeFile('/👨‍👩‍👧‍👦.txt', 'family');
      const content = await vfs.readFile('/👨‍👩‍👧‍👦.txt', 'utf-8');
      expect(content).toBe('family');
    });

    it('應該處理 emoji 內容', async () => {
      await vfs.writeFile('/test.txt', '🎉🎊🎁🎄🎅');
      const content = await vfs.readFile('/test.txt', 'utf-8');
      expect(content).toBe('🎉🎊🎁🎄🎅');
    });
  });

  describe('其他特殊字元', () => {
    it('應該處理各種標點符號', async () => {
      await vfs.writeFile('/file-name_with.various(chars)[test]{ok}.txt', 'content');
      expect(await vfs.exists('/file-name_with.various(chars)[test]{ok}.txt')).toBe(true);
    });

    it('應該處理日文字元', async () => {
      await vfs.writeFile('/日本語ファイル.txt', 'にほんご');
      const content = await vfs.readFile('/日本語ファイル.txt', 'utf-8');
      expect(content).toBe('にほんご');
    });

    it('應該處理韓文字元', async () => {
      await vfs.writeFile('/한국어파일.txt', '한국어');
      const content = await vfs.readFile('/한국어파일.txt', 'utf-8');
      expect(content).toBe('한국어');
    });

    it('應該處理阿拉伯文字元', async () => {
      await vfs.writeFile('/ملف-عربي.txt', 'محتوى');
      const content = await vfs.readFile('/ملف-عربي.txt', 'utf-8');
      expect(content).toBe('محتوى');
    });
  });
});
