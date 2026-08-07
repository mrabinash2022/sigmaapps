import { Op } from 'sequelize';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Order, ShopUser } from '../models/index.js';
import { UserRole, buildReportRow, REPORT_COLUMNS, resolveReportDateRange } from '@localite/shared';

const ORDER_INCLUDES = [
  {
    association: 'shop',
    attributes: ['id', 'name', 'shopCode', 'phone'],
  },
  {
    association: 'customer',
    attributes: ['id', 'name', 'phone'],
  },
];

async function getAdminShopIds(user) {
  const links = await ShopUser.findAll({
    where: { userId: user.id },
    attributes: ['shopId'],
  });
  return links.map((l) => l.shopId);
}

export async function buildReportQueryScope(user, { shopId } = {}) {
  if (user.role === UserRole.CUSTOMER) {
    return { customerId: user.id };
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    if (shopId) return { shopId };
    return {};
  }

  if (user.role === UserRole.ADMIN) {
    const shopIds = await getAdminShopIds(user);
    if (!shopIds.length) {
      const err = new Error('No shop linked to your account');
      err.statusCode = 403;
      throw err;
    }
    if (shopId) {
      if (!shopIds.includes(shopId)) {
        const err = new Error('You do not have access to this shop');
        err.statusCode = 403;
        throw err;
      }
      return { shopId };
    }
    return { shopId: { [Op.in]: shopIds } };
  }

  const err = new Error('Reports are not available for this role');
  err.statusCode = 403;
  throw err;
}

export async function fetchReportOrders(user, { preset, from, to, shopId } = {}) {
  const range = resolveReportDateRange({ preset, from, to });
  const where = await buildReportQueryScope(user, { shopId });
  where.createdAt = { [Op.between]: [new Date(range.from), new Date(range.to)] };

  const orders = await Order.findAll({
    where,
    include: ORDER_INCLUDES,
    order: [['createdAt', 'DESC']],
  });

  const rows = orders.map(buildReportRow);

  return {
    range,
    count: rows.length,
    rows,
  };
}

export async function buildExcelBuffer(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Localite';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Orders Report');
  sheet.columns = REPORT_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.key === 'items' ? 48 : 18,
  }));

  sheet.getRow(1).font = { bold: true };
  report.rows.forEach((row) => sheet.addRow(row));

  sheet.addRow([]);
  sheet.addRow(['Period', `${report.range.fromDate} to ${report.range.toDate}`]);
  sheet.addRow(['Total orders', report.count]);

  return workbook.xlsx.writeBuffer();
}

export async function buildPdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('Localite — Orders Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444')
      .text(`Period: ${report.range.fromDate} to ${report.range.toDate}  |  Orders: ${report.count}`, { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#000');

    const colWidths = [90, 72, 52, 180, 62, 72, 58];
    const headers = REPORT_COLUMNS.map((c) => c.header);
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(8);
    let x = doc.page.margins.left;
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: colWidths[i], lineBreak: false });
      x += colWidths[i];
    });
    y += 14;
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
    y += 6;

    doc.font('Helvetica').fontSize(7);

    const pageBottom = doc.page.height - doc.page.margins.bottom;

    report.rows.forEach((row) => {
      const values = REPORT_COLUMNS.map((col) => String(row[col.key] ?? '—'));
      const cellHeights = values.map((val, i) => doc.heightOfString(val, { width: colWidths[i] }));
      const rowHeight = Math.max(...cellHeights, 10) + 4;

      if (y + rowHeight > pageBottom) {
        doc.addPage({ layout: 'landscape', margin: 40 });
        y = doc.page.margins.top;
      }

      x = doc.page.margins.left;
      values.forEach((val, i) => {
        doc.text(val, x, y, { width: colWidths[i] });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.end();
  });
}

export function reportFilename(format, range) {
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  return `localite-orders-${range.fromDate}-to-${range.toDate}.${ext}`;
}
