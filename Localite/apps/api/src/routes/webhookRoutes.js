import { Router } from 'express';
import { Order } from '../models/index.js';
import { PaymentStatus } from '@localite/shared';
import { verifyWebhookSignature } from '../services/razorpayService.js';
import { recordOrderEvent } from '../services/orderService.js';

const router = Router();

function rawBodyParser(req, res, next) {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { data += chunk; });
  req.on('end', () => {
    req.rawBody = data;
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}

router.post('/razorpay', rawBodyParser, async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  if (!verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body;

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const localiteOrderId = payment.notes?.localiteOrderId;

    if (localiteOrderId) {
      const order = await Order.findByPk(localiteOrderId);
      if (order && order.paymentStatus !== PaymentStatus.PAID) {
        await order.update({
          paymentStatus: PaymentStatus.PAID,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id,
        });
        await recordOrderEvent({
          orderId: order.id,
          fromStatus: order.orderStatus,
          toStatus: order.orderStatus,
          actorId: null,
          note: 'Payment captured via Razorpay webhook',
        });
      }
    }
  }

  res.json({ status: 'ok' });
});

export default router;
