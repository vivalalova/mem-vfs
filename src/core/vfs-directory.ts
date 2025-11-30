/**
 * VFS 目錄節點
 */

import { VFSNode } from './vfs-node.js';
import { VFSNodeType } from '../types/index.js';

/** 預設目錄模式 */
const DEFAULT_DIRECTORY_MODE = 0o755;

/** VFS 目錄節點 */
export class VFSDirectory extends VFSNode {
  readonly type = VFSNodeType.Directory;

  /** 子節點 */
  private readonly children: Map<string, VFSNode> = new Map();

  constructor(name: string, mode: number = DEFAULT_DIRECTORY_MODE) {
    super(name, mode);
  }

  /** 取得大小（子節點數量 * 4096，模擬目錄大小） */
  get size(): number {
    return 4096;
  }

  /** 取得子節點數量 */
  get childCount(): number {
    return this.children.size;
  }

  /** 是否為空目錄 */
  get isEmpty(): boolean {
    return this.children.size === 0;
  }

  /** 取得子節點 */
  getChild(name: string): VFSNode | undefined {
    this.touch();
    return this.children.get(name);
  }

  /** 檢查子節點是否存在 */
  hasChild(name: string): boolean {
    return this.children.has(name);
  }

  /** 新增子節點 */
  addChild(node: VFSNode): void {
    this.children.set(node.name, node);
    this.markModified();
  }

  /** 移除子節點 */
  removeChild(name: string): boolean {
    const result = this.children.delete(name);

    if (result) {
      this.markModified();
    }

    return result;
  }

  /** 取得所有子節點名稱 */
  getChildNames(): string[] {
    return Array.from(this.children.keys());
  }

  /** 取得所有子節點 */
  getChildren(): VFSNode[] {
    this.touch();
    return Array.from(this.children.values());
  }

  /** 迭代子節點 */
  *entries(): IterableIterator<[string, VFSNode]> {
    yield* this.children.entries();
  }

  /** 深拷貝 */
  clone(): VFSDirectory {
    const cloned = new VFSDirectory(this.name, this.mode);
    cloned.uid = this.uid;
    cloned.gid = this.gid;
    (cloned as { createdTime: Date }).createdTime = new Date(this.createdTime);
    cloned.modifiedTime = new Date(this.modifiedTime);
    cloned.accessedTime = new Date(this.accessedTime);

    // 深拷貝子節點
    for (const [name, node] of this.children) {
      cloned.children.set(name, node.clone());
    }

    return cloned;
  }
}
