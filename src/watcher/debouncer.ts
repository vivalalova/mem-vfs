/**
 * Debouncer
 * 事件防抖動處理
 */

/** Debouncer 類別 */
export class Debouncer<T> {
  /** 待處理項目 */
  private pending: Map<string, T> = new Map();

  /** 計時器 */
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** 回呼函數 */
  private readonly callback: (items: Map<string, T>) => void;

  /** 延遲時間（毫秒） */
  private readonly delay: number;

  constructor(callback: (items: Map<string, T>) => void, delay: number = 100) {
    this.callback = callback;
    this.delay = delay;
  }

  /** 加入項目 */
  add(key: string, item: T): void {
    this.pending.set(key, item);
    this.scheduleFlush();
  }

  /** 移除項目 */
  remove(key: string): void {
    this.pending.delete(key);
  }

  /** 取消所有待處理項目 */
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
  }

  /** 立即執行 */
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.size > 0) {
      const items = new Map(this.pending);
      this.pending.clear();
      this.callback(items);
    }
  }

  /** 排程執行 */
  private scheduleFlush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  /** 是否有待處理項目 */
  get hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** 待處理項目數量 */
  get pendingCount(): number {
    return this.pending.size;
  }
}
