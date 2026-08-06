import { ShopCategory } from '@localite/shared';

const IMG = {
  rose: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d4?w=600&q=80',
  marigold: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80',
  jasmine: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=600&q=80',
  lotus: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80',
  mala: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=600&q=80',
  garland: 'https://images.unsplash.com/photo-1582794543139-59bcbee34a0e?w=600&q=80',
  diya: 'https://images.unsplash.com/photo-1604608672516-f1ab12a6b63a?w=600&q=80',
  agarbatti: 'https://images.unsplash.com/photo-1604608672516-f1ab12a6b63a?w=600&q=80',
  camphor: 'https://images.unsplash.com/photo-1615485925510-7ce999c853d4?w=600&q=80',
  godCloth: 'https://images.unsplash.com/photo-1582794543139-59bcbee34a0e?w=600&q=80',
  tulsi: 'https://images.unsplash.com/photo-1466781783364-bf7fb27e19ab?w=600&q=80',
  moneyPlant: 'https://images.unsplash.com/photo-1416879595882-3373a0480b2b?w=600&q=80',
  snakePlant: 'https://images.unsplash.com/photo-1593482892294-13f1a5a7a1e2?w=600&q=80',
  succulent: 'https://images.unsplash.com/photo-1459411552885-ae0db114789a?w=600&q=80',
  potSmall: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80',
  potMedium: 'https://images.unsplash.com/photo-1501003842508-fc057cc264d5?w=600&q=80',
  potLarge: 'https://images.unsplash.com/photo-1592150621744-aca7f538a1ae?w=600&q=80',
  fertilizer: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80',
  soil: 'https://images.unsplash.com/photo-1416879595882-3373a0480b2b?w=600&q=80',
  seeds: 'https://images.unsplash.com/photo-1466692476869-aef1dfb1e735?w=600&q=80',
  gardening: 'https://images.unsplash.com/photo-1416879595882-3373a0480b2b?w=600&q=80',
  ladoo: 'https://images.unsplash.com/photo-1589302168068-964664f44764?w=600&q=80',
  kajuKatli: 'https://images.unsplash.com/photo-1589302168068-964664f44764?w=600&q=80',
  namkeen: 'https://images.unsplash.com/photo-1606491956689-2ea8660f7760?w=600&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
  pastry: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',
  snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&q=80',
};

export const CATALOG_SHOPS = [
  {
    name: 'Pooja & Flowers Corner',
    category: ShopCategory.FLOWERS,
    ownerName: 'Priya Deshpande',
    phone: '9876500011',
    address: 'Temple Road, Pimple Saudagar',
    rank: 1,
    visualCatalogEnabled: true,
    itemTypes: 'Fresh flowers, malas, pooja items, agarbatti, god cloths',
    description: 'Flowers and pooja essentials for daily worship and festivals.',
    catalog: [
      { itemGroup: 'flowers', name: 'Red Rose Bouquet', description: 'Fresh red roses', sizeLabel: '12 stems', unit: 'bunch', price: 250, imageUrl: IMG.rose, sortOrder: 1 },
      { itemGroup: 'flowers', name: 'Marigold Strings', description: 'Bright orange marigolds', sizeLabel: '5 strings', unit: 'pack', price: 120, imageUrl: IMG.marigold, sortOrder: 2 },
      { itemGroup: 'flowers', name: 'Jasmine (Mogra)', description: 'Fragrant white jasmine', sizeLabel: '250g', unit: 'pack', price: 180, imageUrl: IMG.jasmine, sortOrder: 3 },
      { itemGroup: 'flowers', name: 'White Lotus', description: 'Fresh lotus for pooja', sizeLabel: '5 pcs', unit: 'pack', price: 200, imageUrl: IMG.lotus, sortOrder: 4 },
      { itemGroup: 'malas', name: 'Rose Flower Mala', description: 'For deity decoration', sizeLabel: '1 m', unit: 'piece', price: 150, imageUrl: IMG.mala, sortOrder: 1 },
      { itemGroup: 'malas', name: 'Marigold Garland', description: 'Traditional toran style', sizeLabel: '1.5 m', unit: 'piece', price: 200, imageUrl: IMG.garland, sortOrder: 2 },
      { itemGroup: 'malas', name: 'Jasmine Mala', description: 'Fragrant white mala', sizeLabel: '1 m', unit: 'piece', price: 180, imageUrl: IMG.mala, sortOrder: 3 },
      { itemGroup: 'pooja_items', name: 'Brass Diya Set', description: 'Set of 5 diyas', sizeLabel: 'Small', unit: 'set', price: 350, imageUrl: IMG.diya, sortOrder: 1 },
      { itemGroup: 'pooja_items', name: 'Camphor Tablets', description: 'Pure camphor for aarti', sizeLabel: '100g', unit: 'pack', price: 80, imageUrl: IMG.camphor, sortOrder: 2 },
      { itemGroup: 'pooja_items', name: 'Kumkum & Haldi Set', description: 'Roli, kumkum, haldi', sizeLabel: 'Combo', unit: 'set', price: 120, imageUrl: IMG.diya, sortOrder: 3 },
      { itemGroup: 'agarbatti', name: 'Sandal Agarbatti', description: 'Premium sandal fragrance', sizeLabel: '12 sticks', unit: 'pack', price: 60, imageUrl: IMG.agarbatti, sortOrder: 1 },
      { itemGroup: 'agarbatti', name: 'Mogra Agarbatti', description: 'Long-lasting mogra scent', sizeLabel: '24 sticks', unit: 'pack', price: 90, imageUrl: IMG.agarbatti, sortOrder: 2 },
      { itemGroup: 'god_cloths', name: 'Red God Cloth', description: 'Velvet cloth for deity', sizeLabel: '1 m', unit: 'piece', price: 250, imageUrl: IMG.godCloth, sortOrder: 1 },
      { itemGroup: 'god_cloths', name: 'Yellow God Cloth', description: 'Silk blend for festivals', sizeLabel: '1 m', unit: 'piece', price: 280, imageUrl: IMG.godCloth, sortOrder: 2 },
    ],
  },
  {
    name: 'Green Roots Nursery',
    category: ShopCategory.NURSERY,
    ownerName: 'Arun Kulkarni',
    phone: '9876500012',
    address: 'Green Valley Lane, Pimple Saudagar',
    rank: 1,
    visualCatalogEnabled: true,
    itemTypes: 'Plants, gamla, fertilizers, seeds, gardening items',
    description: 'Plants and gardening supplies with size and price shown upfront.',
    catalog: [
      { itemGroup: 'plants', name: 'Tulsi Plant', description: 'Holy basil in grow bag', sizeLabel: '12 inch', unit: 'plant', price: 120, imageUrl: IMG.tulsi, sortOrder: 1 },
      { itemGroup: 'plants', name: 'Money Plant', description: 'Indoor hanging variety', sizeLabel: '10 inch', unit: 'plant', price: 180, imageUrl: IMG.moneyPlant, sortOrder: 2 },
      { itemGroup: 'plants', name: 'Snake Plant', description: 'Low-maintenance indoor', sizeLabel: '14 inch', unit: 'plant', price: 350, imageUrl: IMG.snakePlant, sortOrder: 3 },
      { itemGroup: 'plants', name: 'Succulent Combo', description: 'Set of 3 mini succulents', sizeLabel: '4 inch each', unit: 'set', price: 299, imageUrl: IMG.succulent, sortOrder: 4 },
      { itemGroup: 'pots', name: 'Terracotta Gamla', description: 'Classic clay pot', sizeLabel: '8 inch', unit: 'piece', price: 90, imageUrl: IMG.potSmall, sortOrder: 1 },
      { itemGroup: 'pots', name: 'Plastic Gamla', description: 'Drainage holes included', sizeLabel: '12 inch', unit: 'piece', price: 140, imageUrl: IMG.potMedium, sortOrder: 2 },
      { itemGroup: 'pots', name: 'Decorative Ceramic Pot', description: 'For living room plants', sizeLabel: '16 inch', unit: 'piece', price: 450, imageUrl: IMG.potLarge, sortOrder: 3 },
      { itemGroup: 'fertilizers', name: 'NPK Plant Food', description: 'All-purpose fertilizer', sizeLabel: '1 kg', unit: 'pack', price: 220, imageUrl: IMG.fertilizer, sortOrder: 1 },
      { itemGroup: 'fertilizers', name: 'Organic Vermicompost', description: 'Rich organic manure', sizeLabel: '5 kg', unit: 'bag', price: 180, imageUrl: IMG.fertilizer, sortOrder: 2 },
      { itemGroup: 'soil', name: 'Coco Peat Block', description: 'Expands with water', sizeLabel: '5 kg', unit: 'block', price: 150, imageUrl: IMG.soil, sortOrder: 1 },
      { itemGroup: 'soil', name: 'Potting Mix', description: 'Ready for indoor plants', sizeLabel: '10 kg', unit: 'bag', price: 260, imageUrl: IMG.soil, sortOrder: 2 },
      { itemGroup: 'seeds', name: 'Tomato Seeds', description: 'High-yield hybrid', sizeLabel: '50g', unit: 'pack', price: 45, imageUrl: IMG.seeds, sortOrder: 1 },
      { itemGroup: 'seeds', name: 'Coriander Seeds', description: 'For kitchen garden', sizeLabel: '100g', unit: 'pack', price: 35, imageUrl: IMG.seeds, sortOrder: 2 },
      { itemGroup: 'seeds', name: 'Marigold Flower Seeds', description: 'Bright garden blooms', sizeLabel: '25g', unit: 'pack', price: 40, imageUrl: IMG.seeds, sortOrder: 3 },
      { itemGroup: 'gardening', name: 'Hand Trowel Set', description: '3-piece garden tools', sizeLabel: 'Steel', unit: 'set', price: 320, imageUrl: IMG.gardening, sortOrder: 1 },
      { itemGroup: 'gardening', name: 'Watering Can', description: '5 litre capacity', sizeLabel: '5 L', unit: 'piece', price: 280, imageUrl: IMG.gardening, sortOrder: 2 },
      { itemGroup: 'gardening', name: 'Garden Gloves', description: 'Durable cotton blend', sizeLabel: 'Pair', unit: 'pair', price: 120, imageUrl: IMG.gardening, sortOrder: 3 },
    ],
  },
];

/** Attach visual catalog to shops already created in the main seed (any category). */
export const VISUAL_CATALOG_EXTENSIONS = [
  {
    shopName: 'Shree Krishna Sweets',
    visualCatalogEnabled: true,
    catalog: [
      { itemGroup: 'sweets', name: 'Besan Ladoo', description: 'Traditional gram flour ladoo', sizeLabel: '500g', unit: 'box', price: 320, imageUrl: IMG.ladoo, sortOrder: 1 },
      { itemGroup: 'sweets', name: 'Kaju Katli', description: 'Premium cashew fudge', sizeLabel: '250g', unit: 'box', price: 450, imageUrl: IMG.kajuKatli, sortOrder: 2 },
      { itemGroup: 'sweets', name: 'Motichoor Ladoo', description: 'Festival favourite', sizeLabel: '500g', unit: 'box', price: 280, imageUrl: IMG.ladoo, sortOrder: 3 },
      { itemGroup: 'namkeen', name: 'Mix Farsan', description: 'Crispy savoury mix', sizeLabel: '500g', unit: 'pack', price: 180, imageUrl: IMG.namkeen, sortOrder: 1 },
      { itemGroup: 'namkeen', name: 'Sev Bhujia', description: 'Spicy thin sev', sizeLabel: '400g', unit: 'pack', price: 120, imageUrl: IMG.namkeen, sortOrder: 2 },
      { itemGroup: 'gift_packs', name: 'Festival Sweet Box', description: 'Assorted sweets', sizeLabel: '1 kg', unit: 'box', price: 899, imageUrl: IMG.kajuKatli, sortOrder: 1 },
    ],
  },
  {
    shopName: 'Oven Fresh Bakery',
    visualCatalogEnabled: true,
    catalog: [
      { itemGroup: 'bread', name: 'Whole Wheat Bread', description: 'Freshly baked daily', sizeLabel: '400g', unit: 'loaf', price: 45, imageUrl: IMG.bread, sortOrder: 1 },
      { itemGroup: 'bread', name: 'Milk Bread', description: 'Soft sandwich bread', sizeLabel: '400g', unit: 'loaf', price: 40, imageUrl: IMG.bread, sortOrder: 2 },
      { itemGroup: 'cakes', name: 'Chocolate Truffle Cake', description: 'Eggless option available', sizeLabel: '500g', unit: 'cake', price: 550, imageUrl: IMG.cake, sortOrder: 1 },
      { itemGroup: 'cakes', name: 'Black Forest Pastry', description: 'Single serve slice', sizeLabel: '1 pc', unit: 'piece', price: 80, imageUrl: IMG.cake, sortOrder: 2 },
      { itemGroup: 'pastries', name: 'Pineapple Pastry', description: 'Creamy classic', sizeLabel: '1 pc', unit: 'piece', price: 60, imageUrl: IMG.pastry, sortOrder: 1 },
      { itemGroup: 'pastries', name: 'Veg Puff', description: 'Baked fresh', sizeLabel: '1 pc', unit: 'piece', price: 25, imageUrl: IMG.pastry, sortOrder: 2 },
    ],
  },
  {
    shopName: 'Daily Needs Grocery',
    visualCatalogEnabled: true,
    catalog: [
      { itemGroup: 'staples', name: 'Basmati Rice', description: 'Premium long grain', sizeLabel: '5 kg', unit: 'bag', price: 520, imageUrl: IMG.rice, sortOrder: 1 },
      { itemGroup: 'staples', name: 'Toor Dal', description: 'Unpolished', sizeLabel: '1 kg', unit: 'pack', price: 140, imageUrl: IMG.rice, sortOrder: 2 },
      { itemGroup: 'staples', name: 'Sunflower Oil', description: 'Refined cooking oil', sizeLabel: '1 L', unit: 'bottle', price: 165, imageUrl: IMG.rice, sortOrder: 3 },
      { itemGroup: 'snacks', name: 'Marie Biscuits', description: 'Family pack', sizeLabel: '400g', unit: 'pack', price: 55, imageUrl: IMG.snacks, sortOrder: 1 },
      { itemGroup: 'snacks', name: 'Potato Chips', description: 'Classic salted', sizeLabel: '50g', unit: 'pack', price: 20, imageUrl: IMG.snacks, sortOrder: 2 },
      { itemGroup: 'household', name: 'Dish Wash Liquid', description: 'Lemon fresh', sizeLabel: '500 ml', unit: 'bottle', price: 95, imageUrl: IMG.snacks, sortOrder: 1 },
    ],
  },
];

async function upsertShopCatalog(ShopCatalogItem, shop, catalog) {
  for (const item of catalog) {
    const payload = { ...item, shopId: shop.id, publishStatus: 'published', isAvailable: true };
    await ShopCatalogItem.findOrCreate({
      where: { shopId: shop.id, name: item.name, itemGroup: item.itemGroup },
      defaults: payload,
    });
    await ShopCatalogItem.update(payload, {
      where: { shopId: shop.id, name: item.name, itemGroup: item.itemGroup },
    });
  }
}

export async function seedVisualCatalogExtensions({ Shop, ShopCatalogItem, area }) {
  for (const ext of VISUAL_CATALOG_EXTENSIONS) {
    const shop = await Shop.findOne({ where: { name: ext.shopName, areaId: area.id } });
    if (!shop) {
      console.warn(`  Visual catalog skipped — shop not found: ${ext.shopName}`);
      continue;
    }
    await shop.update({ visualCatalogEnabled: ext.visualCatalogEnabled });
    await upsertShopCatalog(ShopCatalogItem, shop, ext.catalog);
    console.log(`  Visual catalog: ${shop.name} (${ext.catalog.length} items)`);
  }
}

export async function seedCatalogShops({
  Shop, ShopCatalogItem, User, ShopUser, area, superAdmin, ensureShopOwnerUser,
}) {
  const { buildShopCode } = await import('../services/shopService.js');
  const { ShopOperationalStatus, ShopStatus } = await import('@localite/shared');

  for (const [index, shopData] of CATALOG_SHOPS.entries()) {
    const { catalog, ...shopFields } = shopData;
    const shopCode = buildShopCode(20 + index, shopData.name);
    const [shop] = await Shop.findOrCreate({
      where: { name: shopData.name, areaId: area.id },
      defaults: {
        ...shopFields,
        shopCode,
        areaId: area.id,
        status: ShopStatus.APPROVED,
        operationalStatus: ShopOperationalStatus.ENABLED,
        isVerified: true,
        approvedAt: new Date(),
        approvedById: superAdmin.id,
      },
    });

    await shop.update({
      shopCode: shop.shopCode || shopCode,
      operationalStatus: ShopOperationalStatus.ENABLED,
      status: ShopStatus.APPROVED,
      isVerified: true,
      ...shopFields,
    });

    await ensureShopOwnerUser(User, Shop, ShopUser, shop, { setApplicant: false });

    await upsertShopCatalog(ShopCatalogItem, shop, catalog);

    console.log(`  Catalog shop: ${shop.name} (${catalog.length} items)`);
  }

  await seedVisualCatalogExtensions({ Shop, ShopCatalogItem, area });
}
