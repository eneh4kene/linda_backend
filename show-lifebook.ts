import fetch from 'node-fetch';

async function showLifebook() {
  const response = await fetch('http://localhost:3000/api/books/seed-resident-001/create', {
    method: 'POST',
  });

  const data: any = await response.json();

  console.log('='.repeat(80));
  console.log('LIFEBOOK FOR MARGARET "MAGGIE" THOMPSON');
  console.log('='.repeat(80));
  console.log();

  // Book intro
  console.log('BOOK INTRODUCTION');
  console.log('-'.repeat(80));
  console.log(data.content.bookIntro);
  console.log();
  console.log();

  // Chapters
  for (const chapter of data.content.chapters) {
    const assemblyChapter = data.assembly.chapters[chapter.chapterNumber - 1];
    console.log('='.repeat(80));
    console.log(`CHAPTER ${chapter.chapterNumber}: ${assemblyChapter.title.toUpperCase()}`);
    console.log('='.repeat(80));
    console.log();
    console.log('Chapter Introduction:');
    console.log(chapter.intro);
    console.log();

    for (const story of chapter.stories) {
      console.log('-'.repeat(80));
      console.log(`  "${story.title}"`);
      console.log('-'.repeat(80));
      console.log();
      console.log(story.editedTranscript);
      console.log();
      console.log(`  💬 "${story.primaryPullQuote}"`);
      console.log(`  📅 ${story.recordingNote}`);
      console.log();
    }
  }

  // Colophon
  console.log('='.repeat(80));
  console.log('COLOPHON');
  console.log('='.repeat(80));
  console.log(data.content.colophon);
  console.log();
}

showLifebook().catch(console.error);
