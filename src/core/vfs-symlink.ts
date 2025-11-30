/**
 * VFS 符號連結節點
 */

import { VFSNode } from './vfs-node.js';
import { VFSNodeType } from '../types/index.js';

/** 預設符號連結模式 */
const DEFAULT_SYMLINK_MODE = 0o777;

/** VFS 符號連結節點 */
export class VFSSymlink extends VFSNode {
  readonly type = VFSNodeType.Symlink;

  /** 目標路徑 */
  private targetPath: string;

  constructor(name: string, target: string, mode: number = DEFAULT_SYMLINK_MODE) {
    super(name, mode);
    this.targetPath = target;
  }

  /** 取得大小（目標路徑的長度） */
  get size(): number {
    return Buffer.byteLength(this.targetPath, 'utf-8');
  }

  /** 取得目標路徑 */
  get target(): string {
    return this.targetPath;
  }

  /** 設定目標路徑 */
  setTarget(target: string): void {
    this.targetPath = target;
    this.markModified();
  }

  /** 深拷貝 */
  clone(): VFSSymlink {
    const cloned = new VFSSymlink(this.name, this.targetPath, this.mode);
    cloned.uid = this.uid;
    cloned.gid = this.gid;
    (cloned as { createdTime: Date }).createdTime = new Date(this.createdTime);
    cloned.modifiedTime = new Date(this.modifiedTime);
    cloned.accessedTime = new Date(this.accessedTime);
    return cloned;
  }
}
