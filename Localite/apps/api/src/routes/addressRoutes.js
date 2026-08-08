import { Router } from 'express';
import { authenticate, requireOnboarded } from '../middleware/auth.js';
import {
  createUserAddress,
  deleteUserAddress,
  listUserAddresses,
  updateUserAddress,
} from '../services/addressService.js';

const router = Router();

router.get('/', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    const addresses = await listUserAddresses(req.user.id);
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    const address = await createUserAddress(req.user.id, req.body);
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
});

router.patch('/:addressId', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    const address = await updateUserAddress(req.user.id, req.params.addressId, req.body);
    res.json({ address });
  } catch (err) {
    next(err);
  }
});

router.delete('/:addressId', authenticate, requireOnboarded, async (req, res, next) => {
  try {
    await deleteUserAddress(req.user.id, req.params.addressId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
