import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo root: Localite/ */
export const REPO_ROOT = path.resolve(__dirname, '../../../..');

export const LOG_DIRS = {
  backend: path.join(REPO_ROOT, 'docs', 'logging', 'backend'),
  frontend: path.join(REPO_ROOT, 'docs', 'logging', 'frontend'),
};

export function ensureLogDirectories() {
  for (const dir of Object.values(LOG_DIRS)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
