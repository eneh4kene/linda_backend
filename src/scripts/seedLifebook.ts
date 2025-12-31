/**
 * Seed script for creating high-quality test data for lifebook production
 * Creates a full edition lifebook for "Margaret 'Maggie' Thompson"
 *
 * Run with: npx tsx src/scripts/seedLifebook.ts
 */

import { prisma } from '../lib/prisma';

const RESIDENT_ID = 'seed-resident-001';

async function seed() {
  console.log('🌱 Seeding lifebook test data...\n');

  try {
    // 1. Get or create facility
    let facility = await prisma.facility.findFirst();
    if (!facility) {
      console.log('Creating test facility...');
      facility = await prisma.facility.create({
        data: {
          name: 'Oakwood Care Home',
          phone: '+441234567890',
          timezone: 'Europe/London',
        },
      });
    }
    console.log(`✅ Facility: ${facility.name}\n`);

    // 2. Delete existing test resident if exists
    const existing = await prisma.resident.findUnique({
      where: { id: RESIDENT_ID },
    });
    if (existing) {
      console.log('Deleting existing test resident...');
      await prisma.resident.delete({ where: { id: RESIDENT_ID } });
    }

    // 3. Create test resident
    console.log('Creating resident: Margaret "Maggie" Thompson...');
    const resident = await prisma.resident.create({
      data: {
        id: RESIDENT_ID,
        facilityId: facility.id,
        firstName: 'Margaret',
        lastName: 'Thompson',
        preferredName: 'Maggie',
        status: 'active',
        callConsent: true,
        lifestoryConsent: true,
      },
    });
    console.log(`✅ Created: ${resident.preferredName} ${resident.lastName}\n`);

    // 4. Create calls
    console.log('Creating 5 test calls...');
    const calls = [];
    const callDates = [
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
      new Date(Date.now() - 42 * 24 * 60 * 60 * 1000), // 6 weeks ago
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    ];

    for (let i = 0; i < 5; i++) {
      const call = await prisma.call.create({
        data: {
          id: `seed-call-${String(i + 1).padStart(3, '0')}`,
          residentId: RESIDENT_ID,
          callNumber: i + 1,
          status: 'completed',
          endedAt: callDates[i],
          durationSeconds: 400 + i * 20,
          audioUrl: `https://example.com/audio${i + 1}.mp3`,
          transcript: [],
          transcriptText: 'Transcript placeholder',
        },
      });
      calls.push(call);
    }
    console.log(`✅ Created ${calls.length} calls\n`);

    // 5. Create 18 high-quality story segments
    console.log('Creating 18 story segments...\n');

    const segments = [
      // CHILDHOOD (3 segments)
      {
        id: 'seed-segment-001',
        callId: calls[0].id,
        startTimeMs: 15000,
        endTimeMs: 195000,
        category: 'childhood',
        qualityScore: 5,
        qualityRationale: 'Complete narrative arc from childhood to present. Rich sensory detail (salt, fish, tobacco). Emotionally resonant ending. Multiple excellent pull quotes. Reveals family legacy and loss.',
        transcriptText: `My father worked the trawlers out of Hull. He'd be gone weeks at a time, and when he came back, he smelled of salt and fish and tobacco. But oh, how we loved him. I remember... I must have been seven or eight... he brought me this little wooden boat he'd carved on the ship. Painted it blue, with my name on the side. "Margaret" in white letters. I still have it, you know. Somewhere. Or maybe Sophie has it now. He said, "This is so you remember where you come from, pet. We come from the sea." And I suppose we did. My mother, she'd stand at the window every evening, watching for his ship. She never said she was worried, but I could tell. The sea takes men, she used to say. But it brought mine back, every time. Until it didn't.`,
        emotionalTone: 'nostalgic',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'We come from the sea', rationale: 'Poetic, encapsulates family identity', rank: 1 },
          { quote: "The sea takes men. But it brought mine back, every time. Until it didn't.", rationale: 'Devastating. Perfect story ending.', rank: 2 },
        ],
        sensitivityFlags: ['end_of_life'],
        keyPeople: ['Father', 'Mother', 'Sophie (daughter)'],
        keyPlaces: ['Hull', 'The sea'],
        keyDates: ['seven or eight years old'],
        keyObjects: ['wooden boat', 'blue paint', 'white letters'],
      },
      {
        id: 'seed-segment-002',
        callId: calls[0].id,
        startTimeMs: 210000,
        endTimeMs: 330000,
        category: 'childhood',
        qualityScore: 4,
        qualityRationale: 'Strong narrative about overcoming class barriers. Good emotional detail. Clear arc from fear to achievement. Minor editing needed for flow.',
        transcriptText: `I was the first in my family to go to grammar school. The first Thompson to pass the eleven-plus. My mother cried when the letter came. Not sad crying, you understand. Proud crying. She said, "You're going to be somebody, Maggie. You're going to teach." And I did, didn't I? Thirty-two years at St. Mary's. But that first day... I was terrified. All the other girls had nice uniforms, new shoes. Mine were my cousin's, two sizes too big. I stuffed newspaper in the toes. Nobody noticed. Or if they did, they were kind enough not to say.`,
        emotionalTone: 'proud',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "You're going to be somebody, Maggie", rationale: 'Maternal love and ambition', rank: 1 },
        ],
        sensitivityFlags: [],
        keyPeople: ['Mother', 'cousin'],
        keyPlaces: ['grammar school', "St. Mary's"],
        keyDates: ['eleven-plus exam', 'thirty-two years teaching'],
        keyObjects: ['letter', 'uniform', 'shoes with newspaper'],
      },
      {
        id: 'seed-segment-003',
        callId: calls[0].id,
        startTimeMs: 345000,
        endTimeMs: 410000,
        category: 'childhood',
        qualityScore: 3,
        qualityRationale: 'Usable memory but lacks narrative depth. Sweet sensory detail. Would benefit from more context or emotional resonance.',
        transcriptText: `Every Saturday, we'd go to Mr. Patel's shop. Thruppence for a quarter of humbugs. My brother always chose sherbet lemons, but I liked the humbugs. They lasted longer. We'd make them last all the way home, all the way through Blue Peter on the telly.`,
        emotionalTone: 'joyful',
        isCompleteStory: false,
        pullQuotes: [],
        sensitivityFlags: [],
        keyPeople: ['Mr. Patel', 'brother'],
        keyPlaces: ["Mr. Patel's shop"],
        keyDates: ['Saturdays'],
        keyObjects: ['humbugs', 'sherbet lemons', 'thruppence'],
      },

      // CAREER (3 segments)
      {
        id: 'seed-segment-004',
        callId: calls[1].id,
        startTimeMs: 25000,
        endTimeMs: 245000,
        category: 'career',
        qualityScore: 5,
        qualityRationale: 'Exceptional story. Complete arc from fear to triumph. Uses callback to childhood story. Shows teaching philosophy. Emotionally powerful. Print-ready.',
        transcriptText: `September 1958. Twenty-two years old, fresh out of teacher training, and they gave me the worst class in the school. The "difficult" ones, they called them. Thirty-one children, half of them couldn't read properly. The headmaster said, "Miss Thompson, we'll see what you're made of." I was terrified. But I had this idea, you see. I brought in my father's old boat, the one he carved. And I told them... I told them about the sea, about my father, about where I came from. And then I asked them, where do you come from? What makes you, you? And they started talking. Some of them had never been asked that before. By Christmas, they were reading. All of them. The headmaster never called them the "difficult" class again.`,
        emotionalTone: 'proud',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'Where do you come from? What makes you, you?', rationale: 'Reveals teaching philosophy and human connection', rank: 1 },
          { quote: 'Some of them had never been asked that before', rationale: 'Heartbreaking and hopeful', rank: 2 },
        ],
        sensitivityFlags: [],
        keyPeople: ['headmaster'],
        keyPlaces: ["St. Mary's school"],
        keyDates: ['September 1958', 'twenty-two years old', 'Christmas'],
        keyObjects: ["father's carved boat"],
      },
      {
        id: 'seed-segment-005',
        callId: calls[1].id,
        startTimeMs: 260000,
        endTimeMs: 410000,
        category: 'career',
        qualityScore: 4,
        qualityRationale: 'Charming story with clear philosophy. Good detail. Slightly rushed ending. Shows her inclusive teaching style.',
        transcriptText: `Every year, we did the nativity play. And every year, there was one child who got upset because they weren't Mary or Joseph. So I started making up new parts. The innkeeper's daughter. The shepherd's dog. One year, we had a whole choir of angels. Eighteen angels! The vicar said it was theologically questionable, but the parents loved it. Everyone got to shine, you see. That's the secret. Everyone has something special.`,
        emotionalTone: 'humorous',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "Everyone got to shine. That's the secret.", rationale: 'Teaching philosophy in one line', rank: 1 },
        ],
        sensitivityFlags: [],
        keyPeople: ['vicar', 'parents'],
        keyPlaces: ['church'],
        keyDates: ['every year', 'one year'],
        keyObjects: ['nativity play'],
      },
      {
        id: 'seed-segment-006',
        callId: calls[1].id,
        startTimeMs: 425000,
        endTimeMs: 510000,
        category: 'career',
        qualityScore: 4,
        qualityRationale: 'Touching reflection on impact. Good emotional resonance. Could use more specific detail about what the former students said.',
        transcriptText: `When I retired in 1990, they gave me a party. The children... well, they weren't children anymore, some of them. But they came back. Adults now, with jobs, with children of their own. And they said... they said I'd changed their lives. Can you imagine? I was just doing my job. But it mattered. What we do matters, even when we don't see it.`,
        emotionalTone: 'reflective',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "What we do matters, even when we don't see it", rationale: 'Life wisdom, universal truth', rank: 1 },
        ],
        sensitivityFlags: [],
        keyPeople: ['former students'],
        keyPlaces: ['retirement party'],
        keyDates: ['1990', 'retirement'],
        keyObjects: [],
      },

      // FAMILY (4 segments)
      {
        id: 'seed-segment-007',
        callId: calls[2].id,
        startTimeMs: 18000,
        endTimeMs: 218000,
        category: 'joy',
        qualityScore: 5,
        qualityRationale: 'Perfect love story. Complete narrative, rich sensory detail (rain, umbrella, dancing). Shows character through actions. Multiple quotable moments. Exceptionally moving.',
        transcriptText: `I met Robert at a church dance in 1959. I didn't want to go, but my friend Betty dragged me along. He was terrible at dancing, absolutely hopeless. Stepped on my toes three times in one song. But he made me laugh. And when he asked if he could walk me home, I said yes. We walked the long way, all through the park, even though it was raining. He had this old umbrella, barely big enough for one person, but he held it over me the whole way. By the time we got to my door, he was soaked through. But I was dry. That's when I knew. He asked me to marry him six months later. Didn't even have a ring yet. He said he couldn't wait. I said yes before he finished asking.`,
        emotionalTone: 'joyful',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'He held the umbrella over me the whole way. By the time we got to my door, he was soaked through. But I was dry.', rationale: 'Actions reveal love. Beautiful image.', rank: 1 },
          { quote: 'I said yes before he finished asking', rationale: 'Romantic, shows certainty', rank: 2 },
        ],
        sensitivityFlags: [],
        keyPeople: ['Robert (husband)', 'Betty (friend)'],
        keyPlaces: ['church dance', 'the park', 'my door'],
        keyDates: ['1959', 'six months later'],
        keyObjects: ['umbrella', "ring he didn't have yet"],
      },
      {
        id: 'seed-segment-008',
        callId: calls[2].id,
        startTimeMs: 235000,
        endTimeMs: 380000,
        category: 'family',
        qualityScore: 5,
        qualityRationale: 'Exceptional. Perfect mother-daughter moment. Vivid sensory detail (cold, sun, snow, gold). Profound emotional truth about instant love. Print-ready.',
        transcriptText: `Sophie was born on the coldest day of January 1962. The pipes froze in the hospital. I remember Robert bringing me extra blankets from home, wrapping them around both of us. She was so tiny, barely six pounds. But perfect. Every finger, every toe, perfect. When she was three days old, I was sitting by the window, holding her, and the sun came out for the first time in a week. It was so bright on the snow, everything was white and gold. And I thought, this is what love is. This feeling. I didn't know you could love someone you'd only known three days.`,
        emotionalTone: 'tender',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "I didn't know you could love someone you'd only known three days", rationale: 'Universal parental truth, deeply moving', rank: 1 },
          { quote: 'This is what love is. This feeling.', rationale: 'Simple, profound', rank: 2 },
        ],
        sensitivityFlags: [],
        keyPeople: ['Robert', 'Sophie (daughter)'],
        keyPlaces: ['hospital', 'window'],
        keyDates: ['January 1962', 'three days old'],
        keyObjects: ['extra blankets', 'six pounds baby'],
      },
      {
        id: 'seed-segment-009',
        callId: calls[2].id,
        startTimeMs: 395000,
        endTimeMs: 455000,
        category: 'family',
        qualityScore: 3,
        qualityRationale: 'Sweet domestic memory. Lacks narrative arc. The cooking secret is charming but needs more emotional content to be stronger.',
        transcriptText: `Every Sunday, the whole family came for roast dinner. All the children, all the grandchildren. Robert carved the meat. I did the Yorkshire puddings. They always rose perfectly, those puddings. The secret is... well, I suppose I'll tell you. The secret is not opening the oven door. Not even once. Patience, you see.`,
        emotionalTone: 'nostalgic',
        isCompleteStory: false,
        pullQuotes: [
          { quote: 'The secret is not opening the oven door. Not even once. Patience.', rationale: 'Could work as life metaphor', rank: 1 },
        ],
        sensitivityFlags: [],
        keyPeople: ['Robert', 'children', 'grandchildren'],
        keyPlaces: ['home kitchen'],
        keyDates: ['every Sunday'],
        keyObjects: ['Yorkshire puddings', 'roast dinner'],
      },
      {
        id: 'seed-segment-010',
        callId: calls[3].id,
        startTimeMs: 30000,
        endTimeMs: 225000,
        category: 'family',
        qualityScore: 5,
        qualityRationale: 'Devastating. Complete arc from joy to loss. Perfect ending. Multiple layers (roses, tea, ritual, last moments). Extremely powerful and quotable.',
        transcriptText: `After he retired, Robert spent every morning in the garden. He grew the most beautiful roses. Pink ones, red ones, yellow ones that smelled like honey. He'd bring me one every morning with my tea. Forty-three years of marriage, and he still brought me a rose with my tea. The last morning... the morning before his stroke... he brought me a white one. I didn't know it was the last. You never know, do you? When it's the last time. I pressed that rose. It's in my Bible now, between the Psalms. Flat as paper, but still beautiful. He was beautiful. Is that a silly thing to say about a man? I don't care. He was.`,
        emotionalTone: 'sad',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "You never know when it's the last time", rationale: 'Universal truth, profound', rank: 1 },
          { quote: "He was beautiful. Is that a silly thing to say about a man? I don't care. He was.", rationale: 'Defiant love, deeply moving', rank: 2 },
        ],
        sensitivityFlags: ['end_of_life'],
        keyPeople: ['Robert'],
        keyPlaces: ['the garden', 'our home'],
        keyDates: ['forty-three years of marriage', 'the last morning'],
        keyObjects: ['roses', 'tea', 'pressed white rose in Bible'],
      },

      // WISDOM (3 segments)
      {
        id: 'seed-segment-011',
        callId: calls[3].id,
        startTimeMs: 240000,
        endTimeMs: 335000,
        category: 'wisdom',
        qualityScore: 4,
        qualityRationale: 'Strong wisdom content. Applicable beyond teaching. Good specificity. Could benefit from a concrete example but works as-is.',
        transcriptText: `You know what I learned in thirty-two years of teaching? Children don't need you to be perfect. They need you to be present. They need you to see them. Really see them. Not the naughty one or the clever one or the quiet one. The whole child. The one who's hungry because there wasn't breakfast. The one who can't sit still because things are hard at home. The one who daydreams because that's where it's safe. See them. That's the whole job, really.`,
        emotionalTone: 'reflective',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "Children don't need you to be perfect. They need you to be present.", rationale: 'Universally applicable wisdom', rank: 1 },
          { quote: "See them. That's the whole job, really.", rationale: 'Distills life work into one principle', rank: 2 },
        ],
        sensitivityFlags: [],
        keyPeople: [],
        keyPlaces: [],
        keyDates: ['thirty-two years'],
        keyObjects: [],
      },
      {
        id: 'seed-segment-012',
        callId: calls[3].id,
        startTimeMs: 350000,
        endTimeMs: 445000,
        category: 'wisdom',
        qualityScore: 5,
        qualityRationale: 'Exceptional wisdom piece. Original metaphor (suitcase), emotionally honest, permission-giving. Ends with Robert, bringing him into the present. Deeply moving.',
        transcriptText: `People say grief gets easier with time. I don't think that's true. I think you just get better at carrying it. Like... it's a heavy suitcase. At first, you can barely pick it up. But over time, you get stronger. The suitcase doesn't get lighter. You get stronger. And some days, you can set it down for a while. Go for a walk, have a cup of tea, laugh at something silly. And then you pick it back up and keep going. That's not wrong. That's living. Robert wouldn't want me to stop living. He'd be cross if I did.`,
        emotionalTone: 'reflective',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "The suitcase doesn't get lighter. You get stronger.", rationale: 'Perfect metaphor for grief, memorable', rank: 1 },
          { quote: "That's not wrong. That's living.", rationale: 'Permission and wisdom combined', rank: 2 },
        ],
        sensitivityFlags: ['end_of_life'],
        keyPeople: ['Robert'],
        keyPlaces: [],
        keyDates: [],
        keyObjects: ['heavy suitcase (metaphor)'],
      },
      {
        id: 'seed-segment-013',
        callId: calls[4].id,
        startTimeMs: 45000,
        endTimeMs: 135000,
        category: 'wisdom',
        qualityScore: 4,
        qualityRationale: 'Honest reflection on aging. Good emotional journey from despair to hope. Strong ending. Relatable content.',
        transcriptText: `The difficult thing about getting old is not the aching knees or the forgetting names. It's watching everyone move on without you. The children grow up. The world changes. You become... irrelevant. That's the word, isn't it? But then Sophie brings the little ones to visit, and they ask me to read them a story, and I think... maybe I'm not irrelevant yet. Maybe I'm still needed, just in a different way.`,
        emotionalTone: 'reflective',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "Maybe I'm still needed, just in a different way", rationale: 'Hope and adaptation', rank: 1 },
        ],
        sensitivityFlags: [],
        keyPeople: ['Sophie', 'the little ones (great-grandchildren)'],
        keyPlaces: [],
        keyDates: [],
        keyObjects: [],
      },

      // CHAPTER 5 MESSAGES (5 segments with chapter_5_message flag)
      {
        id: 'seed-segment-014',
        callId: calls[4].id,
        startTimeMs: 150000,
        endTimeMs: 235000,
        category: 'wisdom',
        qualityScore: 5,
        qualityRationale: 'Direct message to daughter. Emotionally devastating. Permission-giving. Ties back to birth story. Exceptional Chapter 5 content.',
        transcriptText: `I want Sophie to know... I want her to know that she was enough. She always worried she wasn't doing enough for me, especially after her dad died. But Sophie, love, you were enough. You are enough. Just by being you. Just by being my daughter. That day you were born, that snowy day... you've been enough every day since. Don't carry guilt, darling. Carry love instead. That's lighter.`,
        emotionalTone: 'tender',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "Don't carry guilt. Carry love instead. That's lighter.", rationale: 'Final wisdom for daughter, profound', rank: 1 },
        ],
        sensitivityFlags: ['chapter_5_message'],
        keyPeople: ['Sophie (daughter)', 'her dad/Robert'],
        keyPlaces: [],
        keyDates: ['that snowy day (birth)'],
        keyObjects: [],
      },
      {
        id: 'seed-segment-015',
        callId: calls[4].id,
        startTimeMs: 250000,
        endTimeMs: 320000,
        category: 'wisdom',
        qualityScore: 4,
        qualityRationale: 'Direct message to grandchildren. Ties recipes to life lessons. Sweet callback. Good but could be more specific/personal.',
        transcriptText: `To my grandchildren... all seven of you... I hope you remember the stories. Not just my stories, but your stories too. Where you come from. Who loved you. That matters. You matter. And when things get hard... because they will get hard sometimes... remember Grandma Maggie's Yorkshire puddings. The secret is patience. Don't open the door too early. Good things take time.`,
        emotionalTone: 'wise',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'Remember where you come from. Who loved you.', rationale: 'Legacy and identity', rank: 1 },
        ],
        sensitivityFlags: ['chapter_5_message'],
        keyPeople: ['seven grandchildren', 'Grandma Maggie'],
        keyPlaces: [],
        keyDates: [],
        keyObjects: ['Yorkshire puddings'],
      },
      {
        id: 'seed-segment-016',
        callId: calls[4].id,
        startTimeMs: 335000,
        endTimeMs: 390000,
        category: 'wisdom',
        qualityScore: 5,
        qualityRationale: 'Message to deceased husband. Callbacks to earlier stories (umbrella, roses). Perfect mix of love and humor. Exceptional.',
        transcriptText: `If Robert could hear me now... I'd tell him thank you. Thank you for the umbrella in the rain. Thank you for forty-three years of roses. Thank you for seeing me, really seeing me, every single day. I hope I did that for you too, love. I hope you felt seen. I'll see you again. I'm sure of it. Save me a dance. And practice your steps this time.`,
        emotionalTone: 'tender',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'Thank you for seeing me, really seeing me, every single day', rationale: 'Definition of love', rank: 1 },
          { quote: 'Save me a dance. And practice your steps this time.', rationale: 'Humor and hope after loss', rank: 2 },
        ],
        sensitivityFlags: ['chapter_5_message', 'end_of_life'],
        keyPeople: ['Robert'],
        keyPlaces: [],
        keyDates: ['forty-three years'],
        keyObjects: ['umbrella', 'roses', 'dance'],
      },
      {
        id: 'seed-segment-017',
        callId: calls[1].id,
        startTimeMs: 90000,
        endTimeMs: 140000,
        category: 'wisdom',
        qualityScore: 4,
        qualityRationale: 'Universal message to readers. Generous and inclusive. Good for Chapter 5 opening or closing. Slightly generic but heartfelt.',
        transcriptText: `If there's anyone out there who feels invisible, who thinks they don't matter... you do. You matter. Every single person has a story worth telling. You don't have to be famous or important or special. You already are special. Just by being here. Just by being you. Don't forget that.`,
        emotionalTone: 'wise',
        isCompleteStory: true,
        pullQuotes: [
          { quote: "You don't have to be famous or important or special. You already are special.", rationale: 'Inclusive, affirming', rank: 1 },
        ],
        sensitivityFlags: ['chapter_5_message'],
        keyPeople: [],
        keyPlaces: [],
        keyDates: [],
        keyObjects: [],
      },
      {
        id: 'seed-segment-018',
        callId: calls[0].id,
        startTimeMs: 100000,
        endTimeMs: 145000,
        category: 'wisdom',
        qualityScore: 5,
        qualityRationale: 'Perfect closing wisdom. Ties together all story threads (father, Robert, roses). Universal truth. Print-ready. Exceptional.',
        transcriptText: `I've lived eighty-seven years, and if I've learned anything, it's this: love is the only thing that stays. Everything else... jobs, houses, even your own body... it all fades away eventually. But love? Love remains. In the people you loved. In the people who loved you. In the little wooden boat your father carved. In the roses pressed in your Bible. Love is what we leave behind. So love well. Love deeply. Love without fear. That's the whole point of this life.`,
        emotionalTone: 'wise',
        isCompleteStory: true,
        pullQuotes: [
          { quote: 'Love is what we leave behind', rationale: 'Book thesis in four words', rank: 1 },
          { quote: "Love well. Love deeply. Love without fear. That's the whole point of this life.", rationale: 'Perfect benediction', rank: 2 },
        ],
        sensitivityFlags: ['chapter_5_message'],
        keyPeople: ['father', 'people you loved'],
        keyPlaces: [],
        keyDates: ['eighty-seven years'],
        keyObjects: ['wooden boat', 'roses in Bible'],
      },
    ];

    for (const segment of segments) {
      await prisma.storySegment.create({
        data: {
          id: segment.id,
          callId: segment.callId,
          residentId: RESIDENT_ID,
          startTimeMs: segment.startTimeMs,
          endTimeMs: segment.endTimeMs,
          transcriptText: segment.transcriptText,
          speaker: 'resident',
          audioClipUrl: `https://example.com/${segment.id}.mp3`,
          audioClipStatus: 'completed',
          category: segment.category,
          storyQualityScore: segment.qualityScore,
          qualityRationale: segment.qualityRationale,
          emotionalTone: segment.emotionalTone,
          isCompleteStory: segment.isCompleteStory,
          pullQuotes: segment.pullQuotes,
          sensitivityFlags: segment.sensitivityFlags,
          keyPeople: segment.keyPeople,
          keyPlaces: segment.keyPlaces,
          keyDates: segment.keyDates,
          keyObjects: segment.keyObjects,
        },
      });
      console.log(`  ✓ ${segment.category} - Quality ${segment.qualityScore} - ${segment.transcriptText.substring(0, 40)}...`);
    }

    console.log(`\n✅ Created ${segments.length} story segments\n`);

    // 6. Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Seed data created successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Resident: Maggie Thompson (${RESIDENT_ID})`);
    console.log(`Calls: ${calls.length}`);
    console.log(`Segments: ${segments.length}`);
    console.log(`Quality breakdown:`);
    console.log(`  - Score 5 (Exceptional): ${segments.filter((s) => s.qualityScore === 5).length}`);
    console.log(`  - Score 4 (Strong): ${segments.filter((s) => s.qualityScore === 4).length}`);
    console.log(`  - Score 3 (Usable): ${segments.filter((s) => s.qualityScore === 3).length}`);
    console.log(`Chapter 5 messages: ${segments.filter((s) => s.sensitivityFlags.includes('chapter_5_message')).length}`);
    console.log('\n');
    console.log('Next steps:');
    console.log(`  1. Check readiness: curl http://localhost:3000/api/readiness/${RESIDENT_ID}`);
    console.log(`  2. Assemble book: curl -X POST http://localhost:3000/api/books/${RESIDENT_ID}/assemble`);
    console.log(`  3. Create full book: curl -X POST http://localhost:3000/api/books/${RESIDENT_ID}/create`);
    console.log(`  4. View lifebook: http://localhost:3000/ (update resident ID in HTML)`);
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seed();
