import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

async function ensureUploadDir() {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
}

async function uploadLocal(file) {
  await ensureUploadDir();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
  const dest = path.join(LOCAL_UPLOAD_DIR, filename);
  await fs.rename(file.path, dest);
  return `${BASE_URL}/uploads/${filename}`;
}

async function uploadCloudinary(file) {
  const cloudinary = (await import('cloudinary')).v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'localite/orders',
    resource_type: 'image',
  });

  await fs.unlink(file.path).catch(() => {});
  return result.secure_url;
}

export async function uploadImage(file) {
  if (!file) return null;

  switch (STORAGE_PROVIDER) {
    case 'cloudinary':
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error('Cloudinary not configured. Set STORAGE_PROVIDER=local or add Cloudinary credentials.');
      }
      return uploadCloudinary(file);
    case 'local':
    default:
      return uploadLocal(file);
  }
}

export function getStorageInfo() {
  return { provider: STORAGE_PROVIDER, localPath: LOCAL_UPLOAD_DIR };
}
