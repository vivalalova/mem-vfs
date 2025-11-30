/**
 * VFS 節點基礎類別
 */

import type { FileStats } from '../types/index.js';
import { VFSNodeType } from '../types/index.js';

/** VFS 節點基礎類別 */
export abstract class VFSNode {
  /** 節點名稱 */
  readonly name: string;

  /** 節點類型 */
  abstract readonly type: VFSNodeType;

  /** 建立時間 */
  readonly createdTime: Date;

  /** 修改時間 */
  modifiedTime: Date;

  /** 存取時間 */
  accessedTime: Date;

  /** 檔案模式 */
  mode: number;

  /** 使用者 ID */
  uid: number;

  /** 群組 ID */
  gid: number;

  constructor(name: string, mode: number = 0o644) {
    this.name = name;
    this.mode = mode;
    this.uid = 0;
    this.gid = 0;

    const now = new Date();
    this.createdTime = now;
    this.modifiedTime = now;
    this.accessedTime = now;
  }

  /** 是否為檔案 */
  get isFile(): boolean {
    return this.type === VFSNodeType.File;
  }

  /** 是否為目錄 */
  get isDirectory(): boolean {
    return this.type === VFSNodeType.Directory;
  }

  /** 是否為符號連結 */
  get isSymlink(): boolean {
    return this.type === VFSNodeType.Symlink;
  }

  /** 取得大小（由子類別實作） */
  abstract get size(): number;

  /** 取得統計資訊 */
  getStats(): FileStats {
    return {
      isFile: this.isFile,
      isDirectory: this.isDirectory,
      isSymlink: this.isSymlink,
      size: this.size,
      createdTime: this.createdTime,
      modifiedTime: this.modifiedTime,
      accessedTime: this.accessedTime,
      mode: this.mode,
      uid: this.uid,
      gid: this.gid,
    };
  }

  /** 更新存取時間 */
  touch(): void {
    this.accessedTime = new Date();
  }

  /** 更新修改時間 */
  markModified(): void {
    const now = new Date();
    this.modifiedTime = now;
    this.accessedTime = now;
  }

  /** 深拷貝（由子類別實作） */
  abstract clone(): VFSNode;
}
