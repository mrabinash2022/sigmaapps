import { UserAddress, User } from '../models/index.js';

export async function listUserAddresses(userId) {
  return UserAddress.findAll({
    where: { userId },
    order: [['isDefault', 'DESC'], ['createdAt', 'ASC']],
  });
}

export async function getUserAddress(userId, addressId) {
  const address = await UserAddress.findOne({ where: { id: addressId, userId } });
  if (!address) {
    const err = new Error('Address not found');
    err.statusCode = 404;
    throw err;
  }
  return address;
}

export async function createUserAddress(userId, payload) {
  const { label, address, areaId, latitude, longitude, isDefault } = payload;
  if (!address?.trim()) {
    const err = new Error('Address is required');
    err.statusCode = 400;
    throw err;
  }

  if (isDefault) {
    await UserAddress.update({ isDefault: false }, { where: { userId } });
  }

  const created = await UserAddress.create({
    userId,
    label: label?.trim() || 'Home',
    address: address.trim(),
    areaId: areaId || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isDefault: Boolean(isDefault),
  });

  if (!await UserAddress.findOne({ where: { userId, isDefault: true } })) {
    await created.update({ isDefault: true });
  }

  return created;
}

export async function updateUserAddress(userId, addressId, payload) {
  const row = await getUserAddress(userId, addressId);
  const updates = {};
  if (payload.label !== undefined) updates.label = payload.label?.trim() || 'Home';
  if (payload.address !== undefined) {
    if (!payload.address?.trim()) {
      const err = new Error('Address is required');
      err.statusCode = 400;
      throw err;
    }
    updates.address = payload.address.trim();
  }
  if (payload.areaId !== undefined) updates.areaId = payload.areaId || null;
  if (payload.latitude !== undefined) updates.latitude = payload.latitude ?? null;
  if (payload.longitude !== undefined) updates.longitude = payload.longitude ?? null;
  if (payload.isDefault) {
    await UserAddress.update({ isDefault: false }, { where: { userId } });
    updates.isDefault = true;
  }
  await row.update(updates);
  return row;
}

export async function deleteUserAddress(userId, addressId) {
  const row = await getUserAddress(userId, addressId);
  const wasDefault = row.isDefault;
  await row.destroy();

  if (wasDefault) {
    const next = await UserAddress.findOne({ where: { userId }, order: [['createdAt', 'ASC']] });
    if (next) await next.update({ isDefault: true });
  }
}

export async function resolveDeliverySnapshot(userId, { addressId, deliveryAddress, deliveryAreaId, deliveryLatitude, deliveryLongitude } = {}) {
  if (addressId) {
    const saved = await getUserAddress(userId, addressId);
    return {
      deliveryAddress: saved.address,
      deliveryAreaId: saved.areaId,
      deliveryLatitude: saved.latitude,
      deliveryLongitude: saved.longitude,
    };
  }

  const user = await User.findByPk(userId);
  return {
    deliveryAddress: deliveryAddress?.trim() || user?.address || null,
    deliveryAreaId: deliveryAreaId || user?.areaId || null,
    deliveryLatitude: deliveryLatitude ?? null,
    deliveryLongitude: deliveryLongitude ?? null,
  };
}
