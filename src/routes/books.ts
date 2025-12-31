import { Router } from 'express';
import { calculateBookReadiness } from '../services/bookReadiness';
import { assembleBook } from '../services/bookAssembly';
import { generateBookContent } from '../services/copyEditor';

const router = Router();

/**
 * POST /api/books/:residentId/assemble
 * Assemble a book structure for a resident (Stage 3)
 */
router.post('/:residentId/assemble', async (req, res) => {
  try {
    const { residentId } = req.params;
    const { targetTier } = req.body;

    // Check readiness first
    const readiness = await calculateBookReadiness(residentId);

    if (readiness.readinessStatus === 'collecting' && !targetTier) {
      return res.status(400).json({
        error: 'Not ready for book assembly',
        readiness,
        message: `Need at least 6 usable segments. Currently have ${readiness.usableSegments}.`,
      });
    }

    // Assemble the book
    const assembly = await assembleBook(residentId, targetTier);

    return res.json({
      assembly,
      readiness,
    });
  } catch (error) {
    console.error('Error assembling book:', error);
    return res.status(500).json({
      error: 'Failed to assemble book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/books/:residentId/generate-content
 * Generate all text content for a book (Stage 4)
 * Requires book assembly to be provided
 */
router.post('/:residentId/generate-content', async (req, res) => {
  try {
    const { residentId } = req.params;
    const { assembly } = req.body;

    if (!assembly) {
      return res.status(400).json({
        error: 'Book assembly required',
        message: 'Call /assemble endpoint first to get book structure',
      });
    }

    // Generate content
    const content = await generateBookContent(residentId, assembly);

    return res.json(content);
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({
      error: 'Failed to generate content',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/books/:residentId/create
 * Complete book creation pipeline (Stages 2-4)
 * Checks readiness, assembles structure, generates content
 */
router.post('/:residentId/create', async (req, res) => {
  try {
    const { residentId } = req.params;
    const { targetTier, skipReadinessCheck } = req.body;

    // Stage 2: Check readiness
    const readiness = await calculateBookReadiness(residentId);

    if (
      !skipReadinessCheck &&
      readiness.readinessStatus === 'collecting' &&
      readiness.usableSegments < 6
    ) {
      return res.status(400).json({
        error: 'Not ready for book creation',
        readiness,
        message: `Need at least 6 usable segments. Currently have ${readiness.usableSegments}.`,
        suggestion: 'Continue calling to collect more stories, or use skipReadinessCheck=true to force creation',
      });
    }

    // Stage 3: Assemble book structure
    console.log(`Assembling book for resident ${residentId}...`);
    const assembly = await assembleBook(residentId, targetTier);

    // Stage 4: Generate content
    console.log(`Generating content for ${assembly.chapters.length} chapters...`);
    const content = await generateBookContent(residentId, assembly);

    return res.json({
      readiness,
      assembly,
      content,
      message: 'Book created successfully. Ready for Stage 5 (Human Review).',
    });
  } catch (error) {
    console.error('Error creating book:', error);
    return res.status(500).json({
      error: 'Failed to create book',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
