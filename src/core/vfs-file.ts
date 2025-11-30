/**
 * VFS 檔案節點
 */

import { VFSNode } from './vfs-node.js';
import { VFSNodeType } from '../types/index.js';

/** 預設檔案模式 */
const DEFAULT_FILE_MODE = 0o644;

/** VFS 檔案節點 */
export class VFSFile extends VFSNode {
  readonly type = VFSNodeType.File;

  /** 檔案內容 */
  private content: Buffer;

  constructor(name: string, content: string | Buffer = Buffer.alloc(0), mode: number = DEFAULT_FILE_MODE) {
    super(name, mode);
    this.content = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  }

  /** 取得大小 */
  get size(): number {
    return this.content.length;
  }

  /** 讀取內容 */
  read(encoding?: BufferEncoding): string | Buffer {
    this.touch();

    if (encoding) {
      return this.content.toString(encoding);
    }

    return Buffer.from(this.content);
  }

  /** 寫入內容 */
  write(data: string | Buffer): void {
    this.content = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
    this.markModified();
  }

  /** 追加內容 */
  append(data: string | Buffer): void {
    const appendBuffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    this.content = Buffer.concat([this.content, appendBuffer]);
    this.markModified();
  }

  /** 截斷內容 */
  truncate(length: number = 0): void {
    if (length >= this.content.length) {
      return;
    }

    this.content = this.content.subarray(0, length);
    this.markModified();
  }

  /** 深拷貝 */
  clone(): VFSFile {
    const cloned = new VFSFile(this.name, Buffer.from(this.content), this.mode);
    cloned.uid = this.uid;
    cloned.gid = this.gid;
    // 時間屬性需要重新賦值（因為 readonly 是在 constructor 設定的）
    (cloned as { createdTime: Date }).createdTime = new Date(this.createdTime);
    cloned.modifiedTime = new Date(this.modifiedTime);
    cloned.accessedTime = new Date(this.accessedTime);
    return cloned;
  }
}
