import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma';

/**
 * Generate a professional PDF for a life story book
 */
export async function generateLifeBookPDF(bookId: string): Promise<Buffer> {
  // Fetch book data
  const book = await prisma.lifeStoryBook.findUnique({
    where: { id: bookId },
    include: {
      resident: {
        select: {
          firstName: true,
          lastName: true,
          preferredName: true,
        },
      },
    },
  });

  if (!book) {
    throw new Error('Book not found');
  }

  const residentName = book.resident.preferredName || book.resident.firstName;

  // Parse content data
  const contentData = book.contentData as any;
  const assemblyData = book.assemblyData as any;

  if (!contentData || !assemblyData) {
    throw new Error('Book content not generated yet');
  }

  // Initialize PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let currentY = margin;

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number = 20) => {
    if (currentY + requiredSpace > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  // Helper function to wrap text
  const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;

    lines.forEach((line: string) => {
      checkNewPage(lineHeight);
      doc.text(line, margin, currentY);
      currentY += lineHeight;
    });
  };

  // Title Page
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  currentY = pageHeight / 3;
  const titleLines = doc.splitTextToSize(book.title || `The Life of ${residentName}`, contentWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, currentY, { align: 'center' });
    currentY += 16;
  });

  currentY += 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`A Collection of Memories`, pageWidth / 2, currentY, { align: 'center' });

  // Book Introduction
  doc.addPage();
  currentY = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Introduction', margin, currentY);
  currentY += 15;

  if (contentData.bookIntro) {
    addWrappedText(contentData.bookIntro, 11, false);
  }

  currentY += 10;

  // Table of Contents
  doc.addPage();
  currentY = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Contents', margin, currentY);
  currentY += 15;

  let chapterNumber = 1;
  contentData.chapters?.forEach((chapter: any) => {
    checkNewPage(10);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${chapterNumber}. ${chapter.title}`, margin + 5, currentY);
    currentY += 7;
    chapterNumber++;
  });

  currentY += 10;

  // Chapters
  chapterNumber = 1;
  for (const chapter of contentData.chapters || []) {
    doc.addPage();
    currentY = margin;

    // Chapter Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`Chapter ${chapterNumber}`, margin, currentY);
    currentY += 12;

    doc.setFontSize(20);
    const chapterTitleLines = doc.splitTextToSize(chapter.title, contentWidth);
    chapterTitleLines.forEach((line: string) => {
      doc.text(line, margin, currentY);
      currentY += 10;
    });

    currentY += 5;

    // Chapter Introduction
    if (chapter.intro) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      const introLines = doc.splitTextToSize(chapter.intro, contentWidth);
      introLines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line, margin, currentY);
        currentY += 6;
      });
      currentY += 10;
    }

    // Stories
    for (const story of chapter.stories || []) {
      checkNewPage(30);

      // Story Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const storyTitleLines = doc.splitTextToSize(story.title, contentWidth);
      storyTitleLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += 7;
      });

      currentY += 5;

      // Pull Quote (if available)
      if (story.pullQuote) {
        checkNewPage(20);

        // Draw quote box
        const quoteBoxPadding = 10;
        const quoteText = `"${story.pullQuote}"`;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'italic');
        const quoteLines = doc.splitTextToSize(quoteText, contentWidth - 2 * quoteBoxPadding);
        const quoteHeight = quoteLines.length * 6 + 2 * quoteBoxPadding;

        // Light gray background
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY, contentWidth, quoteHeight, 'F');

        // Border
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, currentY, contentWidth, quoteHeight);

        currentY += quoteBoxPadding;

        quoteLines.forEach((line: string) => {
          doc.text(line, margin + quoteBoxPadding, currentY);
          currentY += 6;
        });

        currentY += quoteBoxPadding + 5;
      }

      // Story Transcript
      if (story.editedTranscript || story.transcript) {
        checkNewPage(15);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const transcriptLines = doc.splitTextToSize(
          story.editedTranscript || story.transcript,
          contentWidth
        );

        transcriptLines.forEach((line: string) => {
          checkNewPage(5);
          doc.text(line, margin, currentY);
          currentY += 5;
        });

        currentY += 5;
      }

      // Audio QR Code (if available)
      if (story.audioUrl) {
        checkNewPage(40);

        try {
          const qrDataUrl = await QRCode.toDataURL(story.audioUrl, {
            width: 100,
            margin: 1,
          });

          const qrSize = 30;
          doc.addImage(qrDataUrl, 'PNG', margin, currentY, qrSize, qrSize);

          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text('Scan to hear this story', margin, currentY + qrSize + 5);

          if (story.recordedDate) {
            doc.text(`Recorded: ${story.recordedDate}`, margin, currentY + qrSize + 10);
          }

          currentY += qrSize + 15;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }

      // Add separator between stories
      currentY += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;
    }

    chapterNumber++;
  }

  // Colophon
  doc.addPage();
  currentY = margin;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('About This Book', margin, currentY);
  currentY += 15;

  if (contentData.colophon) {
    addWrappedText(contentData.colophon, 10, false);
  }

  currentY += 20;

  // Footer with Linda branding
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Created with Linda - AI Companion for Care Homes',
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 5;
  doc.text(
    new Date().toLocaleDateString(),
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Generate a simple summary report PDF (for reporting)
 */
export async function generateSummaryReportPDF(facilityId: string, startDate: Date, endDate: Date): Promise<Buffer> {
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = margin;

  // Fetch facility data
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      residents: {
        where: { status: 'active' },
        select: { id: true },
      },
    },
  });

  if (!facility) {
    throw new Error('Facility not found');
  }

  // Fetch call statistics
  const [totalCalls, completedCalls, avgDuration, sentimentData] = await Promise.all([
    prisma.call.count({
      where: {
        resident: { facilityId },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.call.count({
      where: {
        resident: { facilityId },
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.call.aggregate({
      where: {
        resident: { facilityId },
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
      },
      _avg: {
        durationSeconds: true,
      },
    }),
    prisma.call.aggregate({
      where: {
        resident: { facilityId },
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate },
        sentimentScore: { not: null },
      },
      _avg: {
        sentimentScore: true,
      },
    }),
  ]);

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Linda Activity Report', margin, currentY);
  currentY += 10;

  // Facility and date range
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Facility: ${facility.name}`, margin, currentY);
  currentY += 7;
  doc.text(
    `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    margin,
    currentY
  );
  currentY += 15;

  // Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Call Statistics', margin, currentY);
  currentY += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Active Residents: ${facility.residents.length}`, margin + 5, currentY);
  currentY += 7;
  doc.text(`Total Calls: ${totalCalls}`, margin + 5, currentY);
  currentY += 7;
  doc.text(`Completed Calls: ${completedCalls}`, margin + 5, currentY);
  currentY += 7;
  doc.text(
    `Completion Rate: ${totalCalls > 0 ? ((completedCalls / totalCalls) * 100).toFixed(1) : 0}%`,
    margin + 5,
    currentY
  );
  currentY += 7;
  doc.text(
    `Average Duration: ${avgDuration._avg.durationSeconds ? Math.round(avgDuration._avg.durationSeconds / 60) : 0} minutes`,
    margin + 5,
    currentY
  );
  currentY += 7;
  doc.text(
    `Average Sentiment: ${sentimentData._avg.sentimentScore ? (sentimentData._avg.sentimentScore * 100).toFixed(1) : 'N/A'}${sentimentData._avg.sentimentScore ? '%' : ''}`,
    margin + 5,
    currentY
  );
  currentY += 15;

  // Footer
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Generated by Linda - AI Companion for Care Homes',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 15,
    { align: 'center' }
  );

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}
