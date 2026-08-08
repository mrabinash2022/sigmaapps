import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Shop, ShopCatalogItem } from '../models/index.js';
import { CatalogPublishStatus, ShopStatus, UserRole } from '@localite/shared';
import { authenticate, requireRole, requireShopAccess } from '../middleware/auth.js';
import {
  createCatalogItem,
  deleteCatalogItem,
  getShopCatalogForOwner,
  setCatalogItemPublishStatus,
  syncShopVisualCatalogFlag,
  updateCatalogItem,
} from '../services/catalogService.js';
import { importCatalogFromCsv } from '../services/catalogImportService.js';
import { uploadCatalogImage } from '../services/storageService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|heic/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

const router = Router();

async function getOwnerShop(shopId) {
  const shop = await Shop.findByPk(shopId);
  if (!shop || shop.status !== ShopStatus.APPROVED) {
    const err = new Error('Shop not found');
    err.statusCode = 404;
    throw err;
  }
  return shop;
}

async function getOwnerCatalogItem(shopId, itemId) {
  const item = await ShopCatalogItem.findOne({ where: { id: itemId, shopId } });
  if (!item) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return item;
}

router.get(
  '/my/:shopId/catalog/manage',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      const shop = await getOwnerShop(req.params.shopId);
      const catalog = await getShopCatalogForOwner(shop);
      res.json(catalog);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/my/:shopId/catalog/items',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  upload.single('image'),
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadCatalogImage(req.file);
      }
      const item = await createCatalogItem(req.params.shopId, req.body, imageUrl);
      res.status(201).json({ item });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/my/:shopId/catalog/items/:itemId',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  upload.single('image'),
  async (req, res, next) => {
    try {
      const item = await getOwnerCatalogItem(req.params.shopId, req.params.itemId);
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadCatalogImage(req.file);
      }
      const updated = await updateCatalogItem(item, req.body, imageUrl);
      res.json({ item: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/my/:shopId/catalog/items/:itemId/publish',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      const item = await getOwnerCatalogItem(req.params.shopId, req.params.itemId);
      const updated = await setCatalogItemPublishStatus(item, CatalogPublishStatus.PUBLISHED);
      res.json({ item: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/my/:shopId/catalog/items/:itemId/unpublish',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      const item = await getOwnerCatalogItem(req.params.shopId, req.params.itemId);
      const updated = await setCatalogItemPublishStatus(item, CatalogPublishStatus.DRAFT);
      res.json({ item: updated });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/my/:shopId/catalog/items/:itemId',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      const item = await getOwnerCatalogItem(req.params.shopId, req.params.itemId);
      await deleteCatalogItem(item);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/my/:shopId/visual-catalog',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      const shop = await getOwnerShop(req.params.shopId);
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled (boolean) is required' });
      }
      if (enabled) {
        const publishedCount = await ShopCatalogItem.count({
          where: {
            shopId: shop.id,
            publishStatus: CatalogPublishStatus.PUBLISHED,
            isAvailable: true,
          },
        });
        if (!publishedCount) {
          return res.status(400).json({ error: 'Publish at least one product before enabling the visual catalog' });
        }
      }
      await shop.update({ visualCatalogEnabled: enabled });
      res.json({ shop });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/my/:shopId/catalog/import-csv',
  authenticate,
  requireRole(UserRole.ADMIN),
  requireShopAccess,
  async (req, res, next) => {
    try {
      await getOwnerShop(req.params.shopId);
      const { csv, publish } = req.body;
      if (!csv?.trim()) return res.status(400).json({ error: 'csv content is required' });
      const result = await importCatalogFromCsv(req.params.shopId, csv, {
        publish: publish === true || publish === 'true',
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
