# @lova/mem-vfs

High-performance in-memory virtual file system for Node.js with symlink support, file watching, and snapshot/rollback capabilities.

## Features

- **Complete File System API**: readFile, writeFile, appendFile, deleteFile, copyFile, moveFile
- **Directory Operations**: createDirectory, readDirectory, deleteDirectory (with recursive option)
- **Symbolic Links**: createSymlink, readSymlink, isSymlink with loop detection
- **Glob Pattern Matching**: Full glob support with maxDepth, followSymlinks, ignore patterns
- **Snapshots & Rollback**: Create snapshots, restore state, compute diffs
- **JSON Import/Export**: Load from and export to JSON structure
- **Path Utilities**: normalize, resolve, relative, join, dirname, basename

## Installation

```bash
npm install @lova/mem-vfs
# or
pnpm add @lova/mem-vfs
```

## Quick Start

```typescript
import { createVFS } from '@lova/mem-vfs';

const vfs = createVFS();

// Write and read files
await vfs.writeFile('/src/index.ts', 'export const hello = "world";');
const content = await vfs.readFile('/src/index.ts', 'utf-8');

// Create directories
await vfs.createDirectory('/src/utils', true);

// Glob search
const tsFiles = await vfs.glob('**/*.ts');

// Symbolic links
await vfs.createSymlink('/src', '/link-to-src');

// Snapshots
const snapshotId = vfs.createSnapshot('before-refactor');
// ... make changes ...
vfs.restoreSnapshot(snapshotId);
```

## API Reference

### File Operations

```typescript
// Read file (returns string with encoding, Buffer without)
await vfs.readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>

// Write file (auto-creates parent directories)
await vfs.writeFile(path: string, content: string | Buffer): Promise<void>

// Append to file
await vfs.appendFile(path: string, content: string | Buffer): Promise<void>

// Delete file
await vfs.deleteFile(path: string): Promise<void>

// Copy file
await vfs.copyFile(src: string, dest: string): Promise<void>

// Move file
await vfs.moveFile(src: string, dest: string): Promise<void>
```

### Directory Operations

```typescript
// Create directory (recursive option creates parent directories)
await vfs.createDirectory(path: string, recursive?: boolean): Promise<void>

// Read directory contents
await vfs.readDirectory(path: string): Promise<DirectoryEntry[]>

// Delete directory (recursive option deletes contents)
await vfs.deleteDirectory(path: string, recursive?: boolean): Promise<void>
```

### Status Queries

```typescript
await vfs.exists(path: string): Promise<boolean>
await vfs.isFile(path: string): Promise<boolean>
await vfs.isDirectory(path: string): Promise<boolean>
await vfs.isSymlink(path: string): Promise<boolean>
await vfs.getStats(path: string): Promise<FileStats>
```

### Symbolic Links

```typescript
// Create symlink
await vfs.createSymlink(target: string, linkPath: string): Promise<void>

// Read symlink target
await vfs.readSymlink(linkPath: string): Promise<string>
```

### Glob

```typescript
const files = await vfs.glob(pattern: string, options?: GlobOptions): Promise<string[]>

// Options:
interface GlobOptions {
  cwd?: string;           // Working directory
  ignore?: string[];      // Ignore patterns
  dot?: boolean;          // Include dotfiles
  absolute?: boolean;     // Return absolute paths
  onlyFiles?: boolean;    // Only return files
  onlyDirectories?: boolean; // Only return directories
  followSymlinks?: boolean;  // Follow symbolic links
  maxDepth?: number;      // Maximum traversal depth
}
```

### Snapshots

```typescript
// Create snapshot
const id = vfs.createSnapshot(name?: string): SnapshotId

// Restore snapshot
vfs.restoreSnapshot(id: SnapshotId): void

// Get snapshot info
vfs.getSnapshotInfo(id: SnapshotId): SnapshotInfo | undefined

// List all snapshots
vfs.listSnapshots(): SnapshotInfo[]

// Delete snapshot
vfs.deleteSnapshot(id: SnapshotId): boolean

// Compute diff between snapshots
vfs.diff(fromId?: SnapshotId, toId?: SnapshotId): FileDiff[]
```

### JSON Import/Export

```typescript
// Load from JSON structure
await vfs.fromJSON({
  'src': {
    'index.ts': 'export {}',
    'utils': {
      'helper.ts': 'export function help() {}'
    }
  },
  'README.md': '# Project'
});

// Export to JSON
const json = vfs.toJSON(): DirectoryJSON

// Reset file system
vfs.reset(): void
```

## Configuration

```typescript
const vfs = createVFS({
  caseSensitive: true,      // Case-sensitive paths (default: true)
  defaultFileMode: 0o644,   // Default file permissions
  defaultDirectoryMode: 0o755, // Default directory permissions
  maxSymlinkDepth: 40,      // Maximum symlink resolution depth
});
```

## Error Handling

```typescript
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  DirectoryNotEmptyError,
  NotAFileError,
  NotADirectoryError,
  SymlinkLoopError,
  InvalidPathError
} from '@lova/mem-vfs';

try {
  await vfs.readFile('/nonexistent');
} catch (error) {
  if (error instanceof FileNotFoundError) {
    console.log('File not found:', error.path);
  }
}
```

## Path Utilities

```typescript
import {
  normalizePath,
  dirname,
  basename,
  extname,
  join,
  resolve,
  relative,
  isAbsolute
} from '@lova/mem-vfs';

normalizePath('/a/b/../c/./d') // '/a/c/d'
dirname('/path/to/file.txt')   // '/path/to'
basename('/path/to/file.txt')  // 'file.txt'
join('/a', 'b', 'c')           // '/a/b/c'
```

## License

MIT
