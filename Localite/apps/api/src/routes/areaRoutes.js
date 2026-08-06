import { Router } from 'express';
import { Area } from '../models/index.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const areas = await Area.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });
    res.json({ areas });
  } catch (err) {
    next(err);
  }
});

router.get('/:areaId', async (req, res, next) => {
  try {
    const area = await Area.findByPk(req.params.areaId);
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }
    res.json({ area });
  } catch (err) {
    next(err);
  }
});

export default router;
