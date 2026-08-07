import {
  Shop,
  Offer,
  ShopStoreInfo,
  PlatformAnnouncement,
  CustomerFavoriteShop,
  User,
} from '../models/index.js';
import {
  AnnouncementAudience,
  DiscountType,
  OfferAudience,
  OfferScope,
  UserRole,
} from '@localite/shared';

export async function seedHomeDemoData({ area } = {}) {
  if (!area?.id) {
    console.warn('homeSeed: no area — skipping home demo data');
    return;
  }

  const [superAdmin, shopAdmin, customer, demoShop] = await Promise.all([
    User.findOne({ where: { role: UserRole.SUPER_ADMIN } }),
    User.findOne({ where: { phone: '9999999999' } }),
    User.findOne({ where: { phone: '8888888888' } }),
    Shop.findOne({ where: { name: 'Daily Needs Grocery', areaId: area.id } }),
  ]);

  if (demoShop) {
    await ShopStoreInfo.upsert({
      shopId: demoShop.id,
      openTime: '09:00',
      closeTime: '21:00',
      weeklyOffDays: [0],
      isManuallyClosed: false,
      closedMessage: null,
    });

    const existingOffer = await Offer.findOne({
      where: { shopId: demoShop.id, title: 'Weekend Grocery Sale' },
    });
    if (!existingOffer) {
      await Offer.create({
        shopId: demoShop.id,
        createdById: shopAdmin?.id || superAdmin?.id,
        scope: OfferScope.SHOP,
        audience: OfferAudience.CUSTOMERS,
        title: 'Weekend Grocery Sale',
        description: '10% off on orders above ₹500',
        discountType: DiscountType.PERCENT,
        discountValue: 10,
        isActive: true,
        showOnShopPage: true,
        sortOrder: 1,
      });
    }
    console.log(`  Home: store info + offer for ${demoShop.name}`);
  }

  if (superAdmin) {
    const platformOffer = await Offer.findOne({
      where: { scope: OfferScope.PLATFORM, title: 'Welcome to Localite' },
    });
    if (!platformOffer) {
      await Offer.create({
        shopId: null,
        createdById: superAdmin.id,
        scope: OfferScope.PLATFORM,
        audience: OfferAudience.CUSTOMERS,
        title: 'Welcome to Localite',
        description: 'Order from trusted local shops in your society',
        discountType: DiscountType.TEXT,
        isActive: true,
        showOnShopPage: true,
        sortOrder: 1,
      });
    }

    const announcement = await PlatformAnnouncement.findOne({
      where: { title: 'Localite platform update' },
    });
    if (!announcement) {
      await PlatformAnnouncement.create({
        createdById: superAdmin.id,
        audience: AnnouncementAudience.SHOPKEEPERS,
        title: 'Localite platform update',
        body: 'Use the Home tab for offers, store hours, and announcements.',
        isActive: true,
      });
    }
    console.log('  Home: platform offer + shopkeeper announcement');
  }

  if (customer && demoShop) {
    await CustomerFavoriteShop.findOrCreate({
      where: { userId: customer.id, shopId: demoShop.id },
    });
    console.log(`  Home: favorite shop ${demoShop.name} for demo customer`);
  }
}
