import { Router } from 'express';

const router = Router();

/**
 * GET /viewer/:residentId - View a resident's lifebook in HTML format
 */
router.get('/:residentId', async (req, res) => {
  const { residentId } = req.params;

  try {
    // Fetch the lifebook data
    const response = await fetch(`http://localhost:3000/api/books/${residentId}/create`, {
      method: 'POST',
    });

    if (!response.ok) {
      return res.status(500).send('Failed to generate lifebook');
    }

    const data: any = await response.json();

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lifebook - ${data.assembly.residentName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.8;
            color: #2c3e50;
            background: #f9f7f4;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 60px 80px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .cover {
            text-align: center;
            padding: 100px 0;
            border-bottom: 2px solid #e0d5c7;
            margin-bottom: 60px;
        }

        .cover h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            color: #34495e;
        }

        .cover .subtitle {
            font-size: 1.2em;
            color: #7f8c8d;
            font-style: italic;
        }

        .book-intro {
            padding: 40px 0;
            border-bottom: 1px solid #e0d5c7;
            margin-bottom: 60px;
            font-style: italic;
            color: #555;
            text-align: center;
        }

        .chapter {
            margin-bottom: 80px;
            page-break-before: always;
        }

        .chapter-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0d5c7;
        }

        .chapter-number {
            font-size: 0.9em;
            color: #95a5a6;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }

        .chapter-title {
            font-size: 2em;
            color: #34495e;
            margin-bottom: 20px;
        }

        .chapter-intro {
            font-style: italic;
            color: #7f8c8d;
            max-width: 600px;
            margin: 0 auto;
        }

        .story {
            margin-bottom: 60px;
        }

        .story-title {
            font-size: 1.5em;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: normal;
        }

        .story-meta {
            font-size: 0.85em;
            color: #95a5a6;
            margin-bottom: 20px;
            font-style: italic;
        }

        .story-text {
            margin-bottom: 30px;
            text-align: justify;
        }

        .story-text p {
            margin-bottom: 1em;
        }

        .pull-quote {
            background: #f8f5f0;
            border-left: 4px solid #d4a574;
            padding: 20px 30px;
            margin: 30px 0;
            font-size: 1.1em;
            font-style: italic;
            color: #555;
        }

        .colophon {
            margin-top: 100px;
            padding-top: 40px;
            border-top: 2px solid #e0d5c7;
            text-align: center;
            font-size: 0.9em;
            color: #7f8c8d;
            line-height: 1.6;
        }

        @media print {
            body { background: white; }
            .container { box-shadow: none; padding: 40px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="cover">
            <h1>${data.assembly.residentName}</h1>
            <div class="subtitle">A Life in Stories</div>
        </div>

        <div class="book-intro">
            ${data.content.bookIntro.split('\n\n').map((p: string) => `<p>${p}</p>`).join('')}
        </div>

        ${data.content.chapters.map((chapter: any, idx: number) => {
          const assemblyChapter = data.assembly.chapters[idx];
          return `
        <div class="chapter">
            <div class="chapter-header">
                <div class="chapter-number">Chapter ${chapter.chapterNumber}</div>
                <h2 class="chapter-title">${assemblyChapter.title}</h2>
                <div class="chapter-intro">${chapter.intro}</div>
            </div>

            ${chapter.stories.map((story: any) => `
            <div class="story">
                <h3 class="story-title">"${story.title}"</h3>
                <div class="story-meta">${story.recordingNote}</div>
                <div class="story-text">
                    ${story.editedTranscript.split('\n\n').map((p: string) => `<p>${p}</p>`).join('')}
                </div>
                <div class="pull-quote">
                    "${story.primaryPullQuote}"
                </div>
            </div>
            `).join('')}
        </div>
          `;
        }).join('')}

        <div class="colophon">
            ${data.content.colophon.split('\n\n').map((p: string) => `<p>${p}</p>`).join('')}
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error generating viewer:', error);
    res.status(500).send('Failed to generate lifebook viewer');
  }
});

export default router;
