/**
 * Watcher Events
 * 監聽事件定義
 */

import type { FileStats, FileChangeType } from '../types/index.js';

/** 監聽事件 */
export interface WatcherEvent {
  /** 事件類型 */
  type: FileChangeType;
  /** 檔案路徑 */
  path: string;
  /** 檔案統計（如果可用） */
  stats?: FileStats;
}

/** 事件處理器 */
export type WatcherEventHandler = (event: WatcherEvent) => void;

/** 錯誤處理器 */
export type WatcherErrorHandler = (error: Error) => void;

/** 簡單事件發射器實作 */
export class SimpleEventEmitter {
  private handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, handler: (...args: unknown[]) => void): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: (...args: unknown[]) => void): this {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return false;
    }

    for (const handler of handlers) {
      try {
        handler(...args);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }

    return true;
  }

  /** 移除所有處理器 */
  removeAllListeners(event?: string): this {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
    return this;
  }

  /** 取得處理器數量 */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}
