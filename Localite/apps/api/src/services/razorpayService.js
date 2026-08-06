import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayInstance = null;

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export function isRazorpayEnabled() {
  return Boolean(getRazorpay());
}

export async function createRazorpayOrder({ amount, orderId, receipt }) {
  const rzp = getRazorpay();
  if (!rzp) {
    throw Object.assign(new Error('Razorpay not configured'), { statusCode: 503 });
  }

  const amountPaise = Math.round(Number(amount) * 100);
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt || orderId.slice(0, 40),
    notes: { localiteOrderId: orderId },
  });

  return rzpOrder;
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expected === razorpaySignature;
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signature;
}
