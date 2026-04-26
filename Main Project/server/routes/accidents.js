import express from 'express';
import {
  getAllAccidents,
  getByCity,
  getRisk,
  getNearbyAccidents,
  createAccident,
} from '../controllers/accidentController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, adminOnly, getAllAccidents);
router.get('/city/:city', getByCity);
router.get('/risk', getRisk);
router.get('/nearby', getNearbyAccidents);
router.post('/', authMiddleware, adminOnly, createAccident);

export default router;
