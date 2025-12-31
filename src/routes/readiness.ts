import { Router } from 'express';
import { calculateBookReadiness, getAllResidentsReadiness } from '../services/bookReadiness';

const router = Router();

/**
 * GET /api/readiness
 * Get readiness status for all residents
 */
router.get('/', async (_req, res) => {
  try {
    const results = await getAllResidentsReadiness();
    return res.json(results);
  } catch (error) {
    console.error('Error getting readiness:', error);
    return res.status(500).json({ error: 'Failed to get readiness status' });
  }
});

/**
 * GET /api/readiness/:residentId
 * Get detailed readiness status for a specific resident
 */
router.get('/:residentId', async (req, res) => {
  try {
    const { residentId } = req.params;
    const result = await calculateBookReadiness(residentId);
    return res.json(result);
  } catch (error) {
    console.error('Error getting resident readiness:', error);
    return res.status(500).json({ error: 'Failed to get readiness status' });
  }
});

export default router;
