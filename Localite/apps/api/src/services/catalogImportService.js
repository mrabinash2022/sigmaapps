import { ShopCatalogItem } from '../models/index.js';
import { CatalogPublishStatus } from '@localite/shared';
import { invalidateShopCatalogCache } from './cacheService.js';
import { syncShopVisualCatalogFlag } from './catalogService.js';

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/\s+/g, '');
}

export function parseCatalogCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    const err = new Error('CSV must include a header row and at least one product');
    err.statusCode = 400;
    throw err;
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const required = ['name', 'itemgroup', 'price'];
  for (const key of required) {
    if (!headers.includes(key)) {
      const err = new Error(`CSV header must include: name, itemGroup, price`);
      err.statusCode = 400;
      throw err;
    }
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
    if (!row.name?.trim()) continue;

    rows.push({
      name: row.name.trim(),
      itemGroup: (row.itemgroup || 'general').trim().toLowerCase().replace(/\s+/g, '_'),
      price: Number(row.price),
      sizeLabel: row.sizelabel?.trim() || null,
      unit: row.unit?.trim() || 'piece',
      description: row.description?.trim() || null,
      trackStock: ['true', '1', 'yes'].includes(String(row.trackstock || '').toLowerCase()),
      stockQuantity: row.stockquantity ? Number(row.stockquantity) : null,
    });
  }

  if (!rows.length) {
    const err = new Error('No valid product rows found in CSV');
    err.statusCode = 400;
    throw err;
  }

  for (const row of rows) {
    if (!row.name || Number.isNaN(row.price) || row.price <= 0) {
      const err = new Error(`Invalid row for product "${row.name || '(blank)'}" — name and positive price required`);
      err.statusCode = 400;
      throw err;
    }
  }

  return rows;
}

export async function importCatalogFromCsv(shopId, csvText, { publish = false } = {}) {
  const rows = parseCatalogCsv(csvText);
  const created = [];

  for (const [idx, row] of rows.entries()) {
    const item = await ShopCatalogItem.create({
      shopId,
      name: row.name,
      itemGroup: row.itemGroup,
      price: row.price,
      sizeLabel: row.sizeLabel,
      unit: row.unit,
      description: row.description,
      trackStock: row.trackStock,
      stockQuantity: row.trackStock ? (row.stockQuantity ?? 0) : null,
      sortOrder: idx,
      publishStatus: publish ? CatalogPublishStatus.PUBLISHED : CatalogPublishStatus.DRAFT,
      isAvailable: true,
    });
    created.push(item);
  }

  invalidateShopCatalogCache(shopId);
  await syncShopVisualCatalogFlag(shopId);

  return { imported: created.length, items: created };
}
