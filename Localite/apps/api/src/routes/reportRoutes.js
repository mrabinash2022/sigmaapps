import { Router } from 'express';
import { authenticate, requireOnboarded } from '../middleware/auth.js';
import {
  buildExcelBuffer,
  buildPdfBuffer,
  fetchReportOrders,
  reportFilename,
} from '../services/reportService.js';

const router = Router();

function parseReportQuery(req) {
  return {
    preset: req.query.preset || 'week',
    from: req.query.from,
    to: req.query.to,
    shopId: req.query.shopId,
  };
}

router.get('/orders', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    const report = await fetchReportOrders(req.user, parseReportQuery(req));
    res.json({
      range: report.range,
      count: report.count,
      rows: report.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/export', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    if (!['xlsx', 'pdf'].includes(format)) {
      return res.status(400).json({ error: 'format must be xlsx or pdf' });
    }

    const report = await fetchReportOrders(req.user, parseReportQuery(req));
    const filename = reportFilename(format, report.range);

    if (format === 'pdf') {
      const buffer = await buildPdfBuffer(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    const buffer = await buildExcelBuffer(report);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
});

export default router;
