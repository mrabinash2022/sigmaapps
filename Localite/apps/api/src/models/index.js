import Area from './Area.js';
import Shop from './Shop.js';
import User from './User.js';
import ShopUser from './ShopUser.js';
import Order from './Order.js';
import OrderEvent from './OrderEvent.js';
import SupportTicket from './SupportTicket.js';
import SupportTicketMessage from './SupportTicketMessage.js';
import OtpSession from './OtpSession.js';
import RefreshToken from './RefreshToken.js';
import UserDevice from './UserDevice.js';

// Area ↔ Shop
Area.hasMany(Shop, { foreignKey: 'areaId', as: 'shops' });
Shop.belongsTo(Area, { foreignKey: 'areaId', as: 'area' });

// User ↔ Area
Area.hasMany(User, { foreignKey: 'areaId', as: 'residents' });
User.belongsTo(Area, { foreignKey: 'areaId', as: 'area' });

// Shop ↔ User (shopkeepers)
Shop.belongsToMany(User, { through: ShopUser, foreignKey: 'shopId', otherKey: 'userId', as: 'staff' });
User.belongsToMany(Shop, { through: ShopUser, foreignKey: 'userId', otherKey: 'shopId', as: 'shops' });
ShopUser.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
ShopUser.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Shop approval relations
User.hasMany(Shop, { foreignKey: 'appliedById', as: 'shopApplications' });
Shop.belongsTo(User, { foreignKey: 'appliedById', as: 'applicant' });
User.hasMany(Shop, { foreignKey: 'approvedById', as: 'approvedShops' });
Shop.belongsTo(User, { foreignKey: 'approvedById', as: 'approver' });

// Order relations
User.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
Shop.hasMany(Order, { foreignKey: 'shopId', as: 'orders' });
Order.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

// Order events
Order.hasMany(OrderEvent, { foreignKey: 'orderId', as: 'events' });
OrderEvent.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
User.hasMany(OrderEvent, { foreignKey: 'actorId', as: 'orderActions' });
OrderEvent.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// Support tickets
Order.hasMany(SupportTicket, { foreignKey: 'orderId', as: 'tickets' });
SupportTicket.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Shop.hasMany(SupportTicket, { foreignKey: 'shopId', as: 'tickets' });
SupportTicket.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
User.hasMany(SupportTicket, { foreignKey: 'customerId', as: 'tickets' });
SupportTicket.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
User.hasMany(SupportTicket, { foreignKey: 'raisedById', as: 'raisedTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'raisedById', as: 'raisedBy' });

SupportTicket.hasMany(SupportTicketMessage, { foreignKey: 'ticketId', as: 'messages' });
SupportTicketMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
User.hasMany(SupportTicketMessage, { foreignKey: 'senderId', as: 'supportMessages' });
SupportTicketMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Auth sessions
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Push notification devices
User.hasMany(UserDevice, { foreignKey: 'userId', as: 'devices' });
UserDevice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  Area,
  Shop,
  User,
  ShopUser,
  Order,
  OrderEvent,
  SupportTicket,
  SupportTicketMessage,
  OtpSession,
  RefreshToken,
  UserDevice,
};
