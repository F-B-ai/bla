import {
  ref,
  listAll,
  getMetadata,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../config/firebase';

export interface StorageFile {
  path: string;
  name: string;
  folder: string; // top-level folder (es. "postural")
  size: number; // bytes
  created: Date | null;
}

export interface StorageFolderSummary {
  folder: string;
  fileCount: number;
  totalSize: number; // bytes
}

// Limite del piano gratuito Firebase (Spark): 5 GB
export const FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024;

const topLevelFolder = (fullPath: string): string => {
  const idx = fullPath.indexOf('/');
  return idx === -1 ? '(root)' : fullPath.substring(0, idx);
};

// Elenca ricorsivamente tutti i file nello Storage con dimensione e data
export const listAllFiles = async (
  onProgress?: (count: number) => void
): Promise<StorageFile[]> => {
  const files: StorageFile[] = [];

  const walk = async (prefixPath: string): Promise<void> => {
    const dirRef = prefixPath === '' ? ref(storage) : ref(storage, prefixPath);
    const res = await listAll(dirRef);

    // File in questa cartella
    await Promise.all(
      res.items.map(async (itemRef) => {
        try {
          const meta = await getMetadata(itemRef);
          files.push({
            path: itemRef.fullPath,
            name: itemRef.name,
            folder: topLevelFolder(itemRef.fullPath),
            size: meta.size || 0,
            created: meta.timeCreated ? new Date(meta.timeCreated) : null,
          });
          onProgress?.(files.length);
        } catch {
          // file non accessibile, lo saltiamo
        }
      })
    );

    // Sottocartelle (in sequenza per non saturare le richieste)
    for (const sub of res.prefixes) {
      await walk(sub.fullPath);
    }
  };

  await walk('');
  return files;
};

export const summarizeByFolder = (files: StorageFile[]): StorageFolderSummary[] => {
  const map: Record<string, StorageFolderSummary> = {};
  for (const f of files) {
    if (!map[f.folder]) {
      map[f.folder] = { folder: f.folder, fileCount: 0, totalSize: 0 };
    }
    map[f.folder].fileCount += 1;
    map[f.folder].totalSize += f.size;
  }
  return Object.values(map).sort((a, b) => b.totalSize - a.totalSize);
};

export const totalSize = (files: StorageFile[]): number =>
  files.reduce((sum, f) => sum + f.size, 0);

export const deleteFile = async (path: string): Promise<void> => {
  await deleteObject(ref(storage, path));
};

export const deleteFiles = async (
  paths: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ deleted: number; failed: number }> => {
  let deleted = 0;
  let failed = 0;
  for (let i = 0; i < paths.length; i++) {
    try {
      await deleteFile(paths[i]);
      deleted += 1;
    } catch {
      failed += 1;
    }
    onProgress?.(i + 1, paths.length);
  }
  return { deleted, failed };
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};
