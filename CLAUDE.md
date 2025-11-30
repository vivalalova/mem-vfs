# CLAUDE.md - mem-vfs

## 專案概述

記憶體虛擬檔案系統套件，取代 memfs，解決引用掃描、深度限制、符號連結等問題。

## 常用指令

```bash
pnpm build      # 建置
pnpm typecheck  # 型別檢查
pnpm test       # 執行測試
pnpm lint       # ESLint
```

## 架構

```
src/
├── core/           # 核心類別
│   ├── vfs.ts          # VirtualFileSystem 主類別
│   ├── vfs-node.ts     # 節點基礎類別
│   ├── vfs-file.ts     # 檔案節點
│   ├── vfs-directory.ts # 目錄節點
│   └── vfs-symlink.ts  # 符號連結節點
├── path/           # 路徑工具
│   ├── path-normalizer.ts
│   ├── path-resolver.ts
│   └── path-validator.ts
├── types/          # 型別定義
├── errors/         # 錯誤類別
└── index.ts        # 公開 API
```

## 設計原則

### 節點層級
```
VFSNode (abstract)
├── VFSFile      - Buffer 內容
├── VFSDirectory - Map<string, VFSNode>
└── VFSSymlink   - 目標路徑字串
```

### 關鍵改進（vs memfs）
| 問題 | 解決方案 |
|------|----------|
| 引用掃描失敗 | 完整目錄遍歷 |
| 無深度限制 | maxDepth + MaxDepthExceededError |
| 不支援符號連結 | VFSSymlink + 循環檢測 |
| 路徑不一致 | PathResolver 統一處理 |

## 測試規範

- 測試檔案：`tests/unit/` 和 `tests/edge-cases/`
- 邊界測試：深層目錄、特殊字元、循環連結、大檔案、並發操作
- 執行單一測試：`pnpm test -- --run tests/unit/vfs.test.ts`

## API 摘要

```typescript
const vfs = createVFS(options?: VFSOptions);

// 檔案
await vfs.readFile(path, encoding?)
await vfs.writeFile(path, content)
await vfs.deleteFile(path)
await vfs.copyFile(src, dest)
await vfs.moveFile(src, dest)

// 目錄
await vfs.createDirectory(path, recursive?)
await vfs.readDirectory(path)
await vfs.deleteDirectory(path, recursive?)

// 狀態
await vfs.exists(path)
await vfs.isFile(path)
await vfs.isDirectory(path)
await vfs.getStats(path)

// 符號連結
await vfs.createSymlink(target, linkPath)
await vfs.readSymlink(linkPath)
await vfs.isSymlink(path)

// Glob
await vfs.glob(pattern, options?)

// 快照
vfs.createSnapshot(name?)
vfs.restoreSnapshot(id)
vfs.diff(fromId?, toId?)

// JSON
await vfs.fromJSON(structure)
vfs.toJSON()
vfs.reset()

// Watch
const watcher = vfs.watch(path, options?)
watcher.on('add', event => ...)
watcher.on('change', event => ...)
watcher.on('unlink', event => ...)
watcher.on('all', event => ...)
watcher.close()
```

## 開發流程

1. 修改程式碼
2. `pnpm typecheck` 確認型別
3. `pnpm test` 執行測試
4. `pnpm build` 建置
