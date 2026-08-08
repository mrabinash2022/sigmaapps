import { CustomerWishlistItem, ShopCatalogItem, Shop } from '../models/index.js';
import { CatalogPublishStatus } from '@localite/shared';

export async function listWishlist(userId) {
  const rows = await CustomerWishlistItem.findAll({
    where: { userId },
    include: [
      {
        model: ShopCatalogItem,
        as: 'catalogItem',
        where: { publishStatus: CatalogPublishStatus.PUBLISHED, isAvailable: true },
        required: true,
      },
      { model: Shop, as: 'shop', attributes: ['id', 'name', 'category', 'logoUrl'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  return rows;
}

export async function addToWishlist(userId, catalogItemId) {
  const item = await ShopCatalogItem.findByPk(catalogItemId);
  if (!item || item.publishStatus !== CatalogPublishStatus.PUBLISHED) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  const [row] = await CustomerWishlistItem.findOrCreate({
    where: { userId, catalogItemId },
    defaults: { shopId: item.shopId },
  });
  return row;
}

export async function removeFromWishlist(userId, catalogItemId) {
  const removed = await CustomerWishlistItem.destroy({
    where: { userId, catalogItemId },
  });
  if (!removed) {
    const err = new Error('Wishlist item not found');
    err.statusCode = 404;
    throw err;
  }
  return { catalogItemId };
}

export async function getWishlistItemIds(userId, shopId) {
  const where = { userId };
  if (shopId) where.shopId = shopId;
  const rows = await CustomerWishlistItem.findAll({
    where,
    attributes: ['catalogItemId'],
  });
  return rows.map((r) => r.catalogItemId);
}
