import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateLifeBookPDF, generateSummaryReportPDF } from '../services/pdfGenerator';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/exports/lifebook/:bookId/pdf
 * Export a lifebook as PDF
 */
router.get('/lifebook/:bookId/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bookId } = req.params;

    // Get book to check access
    const book = await prisma.lifeStoryBook.findUnique({
      where: { id: bookId },
      include: {
        resident: {
          select: {
            facilityId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check facility access
    if (req.user?.role !== 'ADMIN' && req.user?.facilityId !== book.resident.facilityId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`📄 Generating PDF for book ${bookId}...`);

    // Generate PDF
    const pdfBuffer = await generateLifeBookPDF(bookId);

    // Set response headers
    const filename = `lifebook-${book.resident.firstName}-${book.resident.lastName}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating lifebook PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

/**
 * GET /api/exports/report/summary
 * Generate summary report PDF for a facility
 */
router.get('/report/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId, startDate, endDate } = req.query;

    // Validate facility access
    let targetFacilityId: string;

    if (req.user?.role === 'ADMIN') {
      // Admin can export for any facility
      if (!facilityId) {
        return res.status(400).json({ error: 'facilityId required for admin exports' });
      }
      targetFacilityId = facilityId as string;
    } else {
      // Non-admin can only export for their facility
      if (!req.user?.facilityId) {
        return res.status(403).json({ error: 'No facility access' });
      }
      targetFacilityId = req.user.facilityId;
    }

    // Parse dates
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    console.log(`📊 Generating summary report for facility ${targetFacilityId}...`);

    // Generate PDF
    const pdfBuffer = await generateSummaryReportPDF(targetFacilityId, start, end);

    // Set response headers
    const filename = `linda-report-${targetFacilityId}-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating summary report PDF:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

export default router;
