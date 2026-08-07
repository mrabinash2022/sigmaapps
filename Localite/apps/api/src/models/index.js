import Area from './Area.js';
import Shop from './Shop.js';
import User from './User.js';
import ShopUser from './ShopUser.js';
import Order from './Order.js';
import OrderEvent from './OrderEvent.js';
import SupportTicket from './SupportTicket.js';
import SupportTicketMessage from './SupportTicketMessage.js';
import ShopCatalogItem from './ShopCatalogItem.js';
import OtpSession from './OtpSession.js';
import RefreshToken from './RefreshToken.js';
import UserDevice from './UserDevice.js';
import ShopStoreInfo from './ShopStoreInfo.js';
import Offer from './Offer.js';
import PlatformAnnouncement from './PlatformAnnouncement.js';
import CustomerFavoriteShop from './CustomerFavoriteShop.js';

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
Order.belongsTo(Order, { foreignKey: 'parentOrderId', as: 'parentOrder' });
Order.hasMany(Order, { foreignKey: 'parentOrderId', as: 'backorderOrders' });

Shop.hasMany(ShopCatalogItem, { foreignKey: 'shopId', as: 'catalogItems' });
ShopCatalogItem.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

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

// Store info & offers
Shop.hasOne(ShopStoreInfo, { foreignKey: 'shopId', as: 'storeInfo' });
ShopStoreInfo.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

Shop.hasMany(Offer, { foreignKey: 'shopId', as: 'offers' });
Offer.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
User.hasMany(Offer, { foreignKey: 'createdById', as: 'createdOffers' });
Offer.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.hasMany(PlatformAnnouncement, { foreignKey: 'createdById', as: 'announcements' });
PlatformAnnouncement.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

User.belongsToMany(Shop, {
  through: CustomerFavoriteShop,
  foreignKey: 'userId',
  otherKey: 'shopId',
  as: 'favoriteShops',
});
Shop.belongsToMany(User, {
  through: CustomerFavoriteShop,
  foreignKey: 'shopId',
  otherKey: 'userId',
  as: 'favoritedBy',
});
CustomerFavoriteShop.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
CustomerFavoriteShop.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  Area,
  Shop,
  User,
  ShopUser,
  ShopCatalogItem,
  Order,
  OrderEvent,
  SupportTicket,
  SupportTicketMessage,
  OtpSession,
  RefreshToken,
  UserDevice,
  ShopStoreInfo,
  Offer,
  PlatformAnnouncement,
  CustomerFavoriteShop,
};
