import { Router } from 'express';
import { SupportTicket, SupportTicketMessage, Order, ShopUser } from '../models/index.js';
import { TicketIssueType, TicketStatus, UserRole } from '@localite/shared';
import { authenticate, requireRole } from '../middleware/auth.js';
import { notifySupportTicketMessage } from '../services/orderNotificationService.js';

const router = Router();

const ticketIncludes = [
  {
    association: 'messages',
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ association: 'sender', attributes: ['id', 'name', 'phone', 'role'] }],
  },
  { association: 'raisedBy', attributes: ['id', 'name', 'phone', 'role'] },
  { association: 'customer', attributes: ['id', 'name', 'phone'] },
  { association: 'shop', attributes: ['id', 'name', 'phone'] },
  { association: 'order', attributes: ['id', 'orderStatus', 'finalBillAmount'] },
];

async function assertShopAccess(user, shopId) {
  if (user.role === UserRole.SUPER_ADMIN) return;
  const link = await ShopUser.findOne({ where: { userId: user.id, shopId } });
  if (!link) {
    const err = new Error('You do not have access to this shop');
    err.statusCode = 403;
    throw err;
  }
}

async function assertOrderAccess(user, order) {
  if (user.role === UserRole.SUPER_ADMIN) return;
  if (user.role === UserRole.CUSTOMER && order.customerId === user.id) return;
  if (user.role === UserRole.ADMIN) {
    await assertShopAccess(user, order.shopId);
    return;
  }
  const err = new Error('You do not have access to this order');
  err.statusCode = 403;
  throw err;
}

async function loadTicketWithAccess(user, ticketId) {
  const ticket = await SupportTicket.findByPk(ticketId, { include: ticketIncludes });
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }
  const order = await Order.findByPk(ticket.orderId);
  await assertOrderAccess(user, order);
  return ticket;
}

router.post('/create-ticket', authenticate, async (req, res, next) => {
  try {
    const { orderId, issueType, customerMessage, message } = req.body;
    const body = (customerMessage || message || '').trim();
    if (!orderId || !issueType || !body) {
      return res.status(400).json({ error: 'orderId, issueType, and message are required' });
    }
    if (!Object.values(TicketIssueType).includes(issueType)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await assertOrderAccess(req.user, order);

    const ticket = await SupportTicket.create({
      orderId,
      shopId: order.shopId,
      customerId: order.customerId,
      issueType,
      customerMessage: body,
      ticketStatus: TicketStatus.OPEN,
      raisedById: req.user.id,
      raisedByRole: req.user.role,
    });

    await SupportTicketMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderRole: req.user.role,
      body,
    });

    const full = await SupportTicket.findByPk(ticket.id, { include: ticketIncludes });

    const staff = await ShopUser.findAll({ where: { shopId: order.shopId } });
    for (const member of staff) {
      if (member.userId !== req.user.id) {
        await notifySupportTicketMessage(full, {
          sender: req.user,
          message: body,
          recipientUserId: member.userId,
        }).catch(console.error);
      }
    }

    res.status(201).json({ ticket: full });
  } catch (err) {
    next(err);
  }
});

router.get('/order/:orderId', authenticate, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await assertOrderAccess(req.user, order);

    const tickets = await SupportTicket.findAll({
      where: { orderId: order.id },
      include: ticketIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.post('/tickets/:ticketId/messages', authenticate, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const ticket = await loadTicketWithAccess(req.user, req.params.ticketId);
    if (ticket.ticketStatus === TicketStatus.RESOLVED) {
      return res.status(400).json({ error: 'Cannot add messages to a resolved ticket' });
    }

    await SupportTicketMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      senderRole: req.user.role,
      body: message.trim(),
    });

    const full = await SupportTicket.findByPk(ticket.id, { include: ticketIncludes });

    const recipientId = req.user.role === UserRole.CUSTOMER
      ? (await ShopUser.findOne({ where: { shopId: ticket.shopId, role: 'owner' } }))?.userId
      : ticket.customerId;
    if (recipientId && recipientId !== req.user.id) {
      await notifySupportTicketMessage(full, {
        sender: req.user,
        message: message.trim(),
        recipientUserId: recipientId,
      }).catch(console.error);
    }

    res.status(201).json({ ticket: full });
  } catch (err) {
    next(err);
  }
});

router.get('/my', authenticate, requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { customerId: req.user.id },
      include: ticketIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.get('/merchant/active/:shopId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    await assertShopAccess(req.user, req.params.shopId);
    const tickets = await SupportTicket.findAll({
      where: {
        shopId: req.params.shopId,
        ticketStatus: [TicketStatus.OPEN, TicketStatus.ACKNOWLEDGED],
      },
      include: ticketIncludes,
      order: [['createdAt', 'DESC']],
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.patch('/update-ticket/:ticketId', authenticate, requireRole(UserRole.ADMIN, UserRole.SUPER_ADMIN), async (req, res, next) => {
  try {
    const { ticketStatus, shopkeeperResolution } = req.body;
    const ticket = await SupportTicket.findByPk(req.params.ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await assertShopAccess(req.user, ticket.shopId);

    const updates = {};
    if (ticketStatus) {
      const allowed = {
        [TicketStatus.OPEN]: [TicketStatus.ACKNOWLEDGED],
        [TicketStatus.ACKNOWLEDGED]: [TicketStatus.RESOLVED],
        [TicketStatus.RESOLVED]: [],
      };
      if (!allowed[ticket.ticketStatus]?.includes(ticketStatus)) {
        return res.status(400).json({
          error: `Cannot transition ticket from ${ticket.ticketStatus} to ${ticketStatus}`,
        });
      }
      updates.ticketStatus = ticketStatus;
    }
    if (shopkeeperResolution !== undefined) {
      updates.shopkeeperResolution = shopkeeperResolution;
      if (shopkeeperResolution?.trim()) {
        await SupportTicketMessage.create({
          ticketId: ticket.id,
          senderId: req.user.id,
          senderRole: req.user.role,
          body: shopkeeperResolution.trim(),
        });
      }
    }

    await ticket.update(updates);
    const full = await SupportTicket.findByPk(ticket.id, { include: ticketIncludes });
    res.json({ ticket: full });
  } catch (err) {
    next(err);
  }
});

export default router;
