import express from 'express';
import {
  getNearbyHospitals,
  getByCity,
} from '../controllers/hospitalController.js';

const router = express.Router();

router.get('/nearby', getNearbyHospitals);
router.get('/city/:city', getByCity);

export default router;

