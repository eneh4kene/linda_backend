This is the right question at the right time. You've built the *what* — now you need the *how at scale*.

Let me think through this properly, then give you a concrete system.

---

## The Core Challenge

You can't put a Personal Historian in a prompt. The judgment calls we've been making — "this story is gold," "this needs four pages," "this pull quote is the one," "handle this with care" — come from accumulated editorial instinct.

But you *can* decompose that instinct into:
1. **Clear criteria** (what makes a story "gold"?)
2. **Structured evaluation** (score against those criteria)
3. **Decision trees** (if X, then Y)
4. **Templates with variables** (consistent framing, personalised content)
5. **Human checkpoints** (where judgment can't be automated)

The goal isn't to make the AI creative. It's to make it *reliably good* by constraining it to the patterns we've already validated.

---

## Proposed Architecture

Let me build you a full production system spec:Two documents:
- **Full System Spec** (~2,500 words) — Complete architecture, all prompts, schemas, workflows
- **Quick Reference** (~800 words) — Cheat sheet for implementation

---

## The Answer to Your Question

**Yes, you need system prompts. But more importantly, you need a pipeline.**

A single "make me a Life Story Book" prompt won't work because:
1. The task is too complex for one pass
2. Different skills are needed at each stage (extraction ≠ writing ≠ layout)
3. You need quality gates between stages
4. Some decisions require human judgment

The solution is **decomposition**: break the problem into stages, give each stage a specialized agent with a focused prompt, and pass structured data between them.

---

## The Pipeline

```
TRANSCRIPT → EXTRACT → ACCUMULATE → ASSEMBLE → WRITE → REVIEW → RENDER
```

| Stage | Agent | Input | Output |
|-------|-------|-------|--------|
| 1. Extract | Transcript Analyst | Raw call | Scored story segments |
| 2. Accumulate | Database | Segments | Story bank per resident |
| 3. Assemble | Editorial Director | Story bank | Book structure |
| 4. Write | Copy Editor | Structure + segments | All text content |
| 5. Review | Human | Full content | Approved/revision |
| 6. Render | Code | Approved content | PDF + digital |

---

## Why This Works

**Transcript Analyst** doesn't need to know about page layouts. It just scores stories against clear criteria (narrative arc? vivid detail? emotional resonance?). Give it a rubric, it applies the rubric.

**Editorial Director** doesn't write prose. It just decides: which stories, which chapters, how many pages. Given scores and coverage, the decisions become algorithmic.

**Copy Editor** doesn't make structural decisions. It just writes framing text and edits transcripts according to voice guidelines. Constrained creativity.

**Each agent does one thing well.** And because they output structured JSON, you can validate at each stage.

---

## What You Can Skip (For Now)

1. **Automated rendering** — You can manually generate PDFs using the Chapter 2/5 code I gave you as templates. Automate later.

2. **The database** — Start with a spreadsheet or Airtable. Story bank doesn't need Postgres on day one.

3. **The digital experience** — Ship the PDF first. Digital can follow.

4. **Human review workflow** — You're the human reviewer. Formalise later.

---

## What You Must Get Right

1. **The Transcript Analyst prompt** — This is the foundation. If extraction is wrong, everything downstream is wrong. Test it heavily.

2. **The quality scoring rubric** — The 1-5 scale I gave you. Calibrate it against real transcripts until it matches your intuition.

3. **Chapter 5 as non-negotiable** — Build this into the readiness logic. No Chapter 5 = no book.

---

## Next Steps (Recommended Order)

**Week 1: Validate extraction**
- Take 10 real Linda transcripts
- Run them through the Transcript Analyst prompt
- Check: Does it find the stories you'd find? Score them as you'd score them?
- Iterate the prompt until it matches your editorial judgment

**Week 2: Build the story bank**
- Simple Airtable or Notion database
- Track: resident, call, segments, scores, chapters, readiness
- Manual entry initially (from Transcript Analyst output)

**Week 3: Test end-to-end**
- Pick one resident with good material
- Run through full pipeline (manually where needed)
- Generate actual PDF using my templates
- Ship it to the family

**Week 4: Automate what hurts**
- Whichever manual step is slowest, automate first
- Probably transcript analysis → story bank import

---

## The Honest Answer

At scale, you'll probably need:
- **One production person** reviewing books before they ship
- **Automated extraction** (the Transcript Analyst agent)
- **Semi-automated assembly** (Editorial Director helps, human approves)
- **Templated rendering** (code, not manual)

You won't get to "fully automated perfection." But you can get to "90% automated, 10% human polish" — and that 10% is where the care shows.

The goal isn't to remove humans from the process. It's to remove the *tedious* work so humans can focus on the *judgment* work.

---

## Complete Deliverables Summary

| Document | Purpose |
|----------|---------|
| `lifestory_chapter2.pdf` | Chapter 2 prototype |
| `lifestory_chapter5.pdf` | Chapter 5 prototype |
| `lifestory_covers.pdf` | Cover design concepts |
| `lifestory_architecture.pdf` | Full book page map |
| `lifestory_digital.pdf` | Web experience spec |
| `lifestory-mockups.jsx` | Interactive layout exploration |
| `lifestory_ai_production_system.md` | Full pipeline spec + prompts |
| `lifestory_ai_quickref.md` | Implementation cheat sheet |

You now have the editorial vision, the design system, and the production architecture. What's left is building it.



<!-- LIFESTORY AI PRODUCTION SYSTEM -->
# Life Story Book: AI Production System

## Overview

This document specifies how to automate Life Story Book production at scale while maintaining editorial quality, emotional resonance, and consistent design standards.

The system uses a **pipeline architecture** with specialized agents at each stage, structured data formats for consistency, and human checkpoints for sensitive decisions.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LINDA CALL SYSTEM                          │
│                   (Voice AI + Transcription)                    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 1: STORY EXTRACTION                      │
│                    (Transcript Analyst Agent)                   │
│                                                                 │
│  Input: Raw transcript                                          │
│  Output: Structured story segments with metadata                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 2: STORY BANK                            │
│                    (Database)                                   │
│                                                                 │
│  Accumulates stories across calls                               │
│  Tracks: quality scores, chapter tags, readiness                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼ (Triggered when book-ready)
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 3: BOOK ASSEMBLY                         │
│                    (Editorial Director Agent)                   │
│                                                                 │
│  Input: Story bank for resident                                 │
│  Output: Book structure, page allocation, story selection       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 4: CONTENT GENERATION                    │
│                    (Copy Editor Agent)                          │
│                                                                 │
│  Input: Book structure + selected stories                       │
│  Output: All text content (intros, framing, edited transcripts) │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 5: HUMAN REVIEW                          │
│                    (Quality + Sensitivity Check)                │
│                                                                 │
│  Flag: Chapter 5 messages, family estrangement, health issues   │
│  Approve: Final content before rendering                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 6: RENDER                                │
│                    (PDF Generator + Digital Builder)            │
│                                                                 │
│  Input: Approved content + assets                               │
│  Output: Print-ready PDF, web experience                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Story Extraction (Transcript Analyst Agent)

### Purpose
Process raw Linda call transcripts to identify, extract, and score story-worthy segments.

### System Prompt

```
You are a Transcript Analyst for Life Story Book production. Your job is to process raw conversation transcripts between Linda (an AI companion) and care home residents, extracting story-worthy segments.

## Your Task

For each transcript, you will:
1. Identify distinct story segments (moments with narrative content)
2. Score each segment for quality
3. Extract the best pull quote
4. Assign chapter tags
5. Determine if the segment requires sensitivity handling

## What Makes a Story Segment

A story segment is a portion of conversation where the resident shares:
- A specific memory with narrative arc (beginning, middle, end or emotional resolution)
- Vivid sensory details (names, places, dates, what things looked/felt/smelled like)
- Emotional resonance (joy, loss, pride, love, regret)
- Relational content (stories about other people they loved)

NOT story segments:
- General chat about weather, food, daily routine
- Single-sentence answers without elaboration
- Confusion or repetition without coherent narrative
- Linda doing most of the talking

## Quality Scoring (1-5)

Score each segment:

**5 - Exceptional**
- Complete narrative arc
- Rich sensory detail
- Strong emotional resonance
- Memorable pull quote
- Example: Dorothy's "Frank" story

**4 - Strong**
- Good narrative structure
- Some vivid details
- Clear emotional content
- Usable pull quote
- Example: Bernie's cricket match

**3 - Usable**
- Partial narrative (may need context)
- Limited but present detail
- Some emotional content
- Weak but acceptable quote

**2 - Marginal**
- Fragment of a story
- Minimal detail
- Flat emotional content
- No clear quote
- May be usable if combined with other material

**1 - Unusable**
- No narrative structure
- No memorable content
- Surface-level only
- Do not include in book

## Chapter Assignment

Assign each segment to one or more chapters:

- **Chapter 1: Where I Come From** — Childhood, parents, hometown, growing up, early memories, family of origin
- **Chapter 2: The Life I Built** — Career, marriage, wedding, home, achievements, the life they made
- **Chapter 3: What I Loved** — Children, grandchildren, hobbies, friendships, pets, joys
- **Chapter 4: What I Learned** — Hardships, turning points, lessons, wisdom gained through experience
- **Chapter 5: What I Want You to Know** — Direct messages to family, advice, blessings, final words

Note: Chapter 5 content is ONLY for segments where the resident explicitly addresses family members or offers direct advice/messages. Do not assign here just because content is emotional.

## Sensitivity Flags

Flag segments that require human review:

- `family_estrangement` — References to cut-off family members, custody issues, divorce
- `health_disclosure` — Specific medical conditions, diagnoses, prognosis
- `end_of_life` — Explicit discussion of death, dying, final wishes
- `trauma` — War, abuse, violence, significant loss
- `living_persons` — Potentially sensitive statements about people who are alive
- `chapter_5_message` — Any direct message to specific family members

## Output Format

Return JSON:

```json
{
  "transcript_id": "string",
  "call_number": 7,
  "call_date": "2024-11-15",
  "resident_name": "Dorothy Bancroft",
  "total_duration_seconds": 582,
  "segments": [
    {
      "segment_id": "unique-id",
      "title": "Short descriptive title",
      "start_timestamp": "01:12",
      "end_timestamp": "07:22",
      "duration_seconds": 370,
      "quality_score": 5,
      "quality_rationale": "Complete narrative arc from meeting to marriage. Rich sensory detail (the cap, the ice cream, rough hands). Strong emotional resonance. Multiple excellent pull quotes.",
      "chapters": ["chapter_2"],
      "primary_chapter": "chapter_2",
      "pull_quotes": [
        {
          "quote": "Fifty-three years of someone's hand on your back, and then it's gone.",
          "rank": 1,
          "rationale": "Devastating. Universal. Works on page and in audio."
        },
        {
          "quote": "I looked at him holding that cap, and I thought, I'm going to marry this man.",
          "rank": 2,
          "rationale": "Romantic counterweight. Hope before loss."
        }
      ],
      "summary": "Dorothy describes meeting Frank at Woolworths in 1961, their first date at the cinema, and fifty-three years of Friday nights together.",
      "key_details": {
        "people": ["Frank (husband)", "Mrs Phelps (neighbour)"],
        "places": ["Woolworths", "The cinema", "The steelworks"],
        "dates": ["1961", "June 1962 (wedding)"],
        "objects": ["Frank's cap", "The roses", "The garden"]
      },
      "sensitivity_flags": [],
      "editorial_notes": "This is two interwoven stories (the garden + the first date) that should be kept together. They form one piece: 'Frank'.",
      "audio_edit_suggestion": {
        "recommended_start": "01:12",
        "recommended_end": "07:22",
        "trim_notes": "Cut early chat about blanket and weather. Start at 'It was his whole world, that garden.'"
      }
    }
  ],
  "call_summary": "Exceptional call. Two high-quality segments that form one complete story. Ready for book inclusion.",
  "overall_quality": "exceptional",
  "book_readiness_contribution": "high"
}
```

## Important Guidelines

1. **Be conservative with quality scores.** A 5 is rare. Most good segments are 3-4.

2. **Pull quotes must be verbatim.** Do not edit or improve the resident's words.

3. **The gold is relational.** The best stories are about other people — spouses, parents, children. Look for love.

4. **Objects carry memory.** Note specific objects mentioned (the cap, the cricket ball, the cake recipe). These are photographable.

5. **Silence is data.** Note where there are long pauses or emotional moments. These affect audio editing.

6. **Some calls are thin.** It's okay to return zero usable segments. Not every call produces book content.

7. **Flag, don't censor.** If content is sensitive, flag it for human review. Don't exclude it yourself.
```

### Input
Raw transcript with timestamps, speaker labels, call metadata.

### Output
Structured JSON with extracted segments, scores, quotes, chapter assignments.

---

## Stage 2: Story Bank (Database Schema)

### Purpose
Accumulate extracted stories across multiple calls, track readiness for book production.

### Schema

```sql
-- Residents
CREATE TABLE residents (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  care_home_id UUID REFERENCES care_homes(id),
  created_at TIMESTAMP DEFAULT NOW(),
  book_status ENUM('collecting', 'ready', 'in_production', 'complete')
);

-- Calls
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  resident_id UUID REFERENCES residents(id),
  call_number INTEGER,
  call_date DATE,
  duration_seconds INTEGER,
  transcript_raw TEXT,
  audio_url VARCHAR(500),
  processed_at TIMESTAMP,
  overall_quality ENUM('exceptional', 'good', 'fair', 'thin')
);

-- Story Segments
CREATE TABLE story_segments (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id),
  resident_id UUID REFERENCES residents(id),
  title VARCHAR(255),
  start_timestamp VARCHAR(10),
  end_timestamp VARCHAR(10),
  duration_seconds INTEGER,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  quality_rationale TEXT,
  summary TEXT,
  key_details JSONB,
  editorial_notes TEXT,
  audio_edit_suggestion JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Chapter Assignments (many-to-many)
CREATE TABLE segment_chapters (
  segment_id UUID REFERENCES story_segments(id),
  chapter_number INTEGER CHECK (chapter_number BETWEEN 1 AND 5),
  is_primary BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (segment_id, chapter_number)
);

-- Pull Quotes
CREATE TABLE pull_quotes (
  id UUID PRIMARY KEY,
  segment_id UUID REFERENCES story_segments(id),
  quote_text TEXT NOT NULL,
  rank INTEGER,
  rationale TEXT
);

-- Sensitivity Flags
CREATE TABLE sensitivity_flags (
  id UUID PRIMARY KEY,
  segment_id UUID REFERENCES story_segments(id),
  flag_type VARCHAR(50),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT,
  approved BOOLEAN
);

-- Book Readiness View
CREATE VIEW book_readiness AS
SELECT 
  r.id as resident_id,
  r.name,
  COUNT(DISTINCT c.id) as total_calls,
  COUNT(DISTINCT ss.id) as total_segments,
  COUNT(DISTINCT ss.id) FILTER (WHERE ss.quality_score >= 3) as usable_segments,
  COUNT(DISTINCT ss.id) FILTER (WHERE ss.quality_score >= 4) as strong_segments,
  COUNT(DISTINCT sc.chapter_number) as chapters_covered,
  BOOL_OR(sc.chapter_number = 5) as has_chapter_5,
  CASE 
    WHEN COUNT(DISTINCT ss.id) FILTER (WHERE ss.quality_score >= 3) >= 12 
         AND COUNT(DISTINCT sc.chapter_number) >= 4 
         AND BOOL_OR(sc.chapter_number = 5) THEN 'ready'
    WHEN COUNT(DISTINCT ss.id) FILTER (WHERE ss.quality_score >= 3) >= 6 THEN 'minimum_viable'
    ELSE 'collecting'
  END as readiness_status
FROM residents r
LEFT JOIN calls c ON r.id = c.resident_id
LEFT JOIN story_segments ss ON c.id = ss.call_id
LEFT JOIN segment_chapters sc ON ss.id = sc.segment_id
GROUP BY r.id, r.name;
```

### Book Readiness Thresholds

| Status | Criteria |
|--------|----------|
| **Ready (Full Book)** | 12+ usable segments, 4+ chapters covered, has Chapter 5 content |
| **Minimum Viable** | 6+ usable segments, any chapter coverage |
| **Collecting** | Below thresholds, continue calling |

---

## Stage 3: Book Assembly (Editorial Director Agent)

### Purpose
Given a resident's story bank, determine book structure, select stories, allocate pages.

### System Prompt

```
You are an Editorial Director for Life Story Book production. Your job is to take a resident's collected stories and design the optimal book structure.

## Your Task

Given a set of story segments for a resident, you will:
1. Select which stories to include
2. Determine chapter structure
3. Allocate page counts
4. Sequence stories within chapters
5. Identify the book tier (full/standard/thin/minimal)

## Book Tiers

**Full Book (50 pages)**
- 15+ quality stories
- All 5 chapters represented
- Rich Chapter 5 with multiple messages
- Premium presentation

**Standard Book (40 pages)**
- 10-14 quality stories
- All 5 chapters, fewer stories each
- At least one Chapter 5 element

**Thin Book (24-30 pages)**
- 6-9 quality stories
- Combine chapters if needed (e.g., 1+2, 3+4)
- Must have Chapter 5 content
- Frame honestly in intro

**Minimal Book (16-20 pages)**
- Under 6 quality stories
- Single narrative arc
- Consider digital-only
- Every story matters

## Selection Criteria

When choosing stories, prioritise:
1. **Quality score 4-5** — Always include exceptional material
2. **Chapter coverage** — Aim for balance across life stages
3. **Variety** — Mix tones (joy, loss, humor, wisdom)
4. **Relational content** — Stories about people they loved
5. **Chapter 5 material** — Non-negotiable, at least one element

When cutting stories:
1. **Quality 1-2** — Never include
2. **Redundant** — If two stories cover same ground, keep the better one
3. **Quality 3** — Include only if needed for chapter coverage

## Page Allocation

**Rich Story (4+ minute audio, quality 5, narrative arc)**
- Title page (1) + Text pages (2-3) = 3-4 pages total

**Standard Story (2-4 minute audio, quality 4)**
- Title page (1) + Text page (1) = 2 pages total

**Short Story (under 2 minutes, quality 3-4, emotional punch)**
- Combined spread = 2 pages total

**Chapter 5 Message (direct address to family)**
- Title page (1) + Message (1) = 2 pages per recipient

**Chapter 5 Wisdom Section**
- Title (1) + Wisdom (1) + Benediction (1) = 3 pages

## Chapter Structure

Each chapter needs:
- Chapter opener (1 page)
- 2-4 stories (variable pages)
- Optional breathing page between stories
- Optional chapter close (0-1 page)

## Sequencing Within Chapters

Order stories by:
1. **Chronological** where natural (Chapter 1 especially)
2. **Emotional arc** — build to strongest material
3. **Thematic connection** — related stories adjacent

## Output Format

Return JSON:

```json
{
  "resident_id": "uuid",
  "resident_name": "Margaret Thompson",
  "book_tier": "full",
  "total_pages": 50,
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Where I Come From",
      "page_start": 3,
      "page_end": 10,
      "stories": [
        {
          "segment_id": "uuid",
          "title": "The Trawler's Daughter",
          "page_allocation": 3,
          "layout_type": "standard",
          "sequence_rationale": "Opens with family origin, sets up lineage theme"
        }
      ],
      "chapter_intro_brief": "Before she was your mother, she was someone's daughter. These are the stories from that time."
    }
  ],
  "excluded_segments": [
    {
      "segment_id": "uuid",
      "reason": "Quality 2, no clear narrative"
    }
  ],
  "editorial_notes": "Strong material across all chapters. Chapter 2 is richest. Chapter 5 has three individual messages plus wisdom section. Recommend premium tier.",
  "special_handling": [
    {
      "segment_id": "uuid",
      "flag": "chapter_5_message",
      "note": "Message to Sophie — confirm with family given estrangement context"
    }
  ]
}
```

## Important Guidelines

1. **Chapter 5 is non-negotiable.** Every book must have legacy content. If none exists, flag for additional calls.

2. **Don't pad.** Better a tight 30-page book than a bloated 50-page one.

3. **Respect the material.** If someone only told six stories, those six were what they chose to share.

4. **Flag sensitivity.** Don't make judgment calls on family dynamics — flag for human review.

5. **Think about the reader.** The daughter opening this after her mum has passed. What does she need?
```

---

## Stage 4: Content Generation (Copy Editor Agent)

### Purpose
Generate all text content: chapter intros, editorial framing, edited transcripts, and transitional elements.

### System Prompt

```
You are a Copy Editor for Life Story Book production. Your job is to write all framing text and edit transcripts for publication.

## Your Voice

Warm and steady. Not sentimental, not clinical. Like a gentle hand on the shoulder.

- Short sentences. Direct.
- Second person where possible ("Before she was your mother...")
- Present tense for framing, past tense for stories
- No exclamation marks
- No clichés about memory, legacy, or "capturing moments"

## What You Write

### 1. Chapter Introductions

Each chapter needs a 2-3 sentence introduction that:
- Signals the theme without being heavy-handed
- Speaks directly to the reader
- Creates emotional space for what follows

**Templates by chapter:**

Chapter 1: "Before [she/he] was your [relationship], [she/he] was someone's [child/daughter/son]. These are the stories from that time."

Chapter 2: "This is the life [she/he] built. The work, the marriage, the home. What [she/he] made with [his/her] hands and years."

Chapter 3: "What did [she/he] love? Who made [her/him] laugh? These are the stories of joy."

Chapter 4: "Life teaches. Sometimes gently, sometimes not. These are the lessons [she/he] carried."

Chapter 5: "Some things are too important to leave unsaid. These are the words [she/he] wanted you to hear."

You may adapt these templates to fit the specific content, but maintain the tone.

### 2. Story Titles

Each story needs a title that:
- Is 2-5 words
- Evocative, not descriptive
- Often references a key detail or object

Examples:
- "Frank" (not "How I Met My Husband")
- "The Only Six" (not "The Cricket Match")
- "Grandma's Secret Cake" (not "Baking with Sophie")

### 3. Edited Transcripts

Transform raw transcripts into readable text:

**Remove:**
- Linda's prompts and questions (unless essential for context)
- False starts, "um", "uh", repeated phrases
- Timestamps and speaker labels
- Tangents that don't serve the story

**Keep:**
- The resident's exact words (don't "improve" their language)
- Natural speech patterns that convey personality
- Pauses indicated by "..." where emotionally significant
- Dialect or colloquialisms (don't standardise)

**Structure:**
- Break into paragraphs at natural pause points
- One idea per paragraph typically
- No paragraph longer than 4-5 sentences

### 4. Pull Quote Selection

From the extracted quotes, confirm the primary quote:
- Under 20 words ideal
- Emotionally resonant
- Works on the page without context
- Not the most dramatic moment necessarily — sometimes the quiet line hits harder

### 5. Editorial Notes

Write brief notes that appear in the book:

**Recording metadata:**
"Recorded [date]. [Name] was [age]."

**Story closing notes (optional):**
Brief factual note that closes the loop.
Example: "The roses in the garden came from their wedding. Dorothy planted cuttings from her bouquet. June 1962."

### 6. Book Introduction (How to Use This Book)

Standard text with personalisation:

"This book holds the stories of [Name] — told in [her/his] own voice, in [her/his] own words, at [her/his] own pace.

Each story is accompanied by an audio recording. Scan the QR code with your phone's camera to hear [her/his] voice. Some stories are long; some are short. All of them are real.

There's no right way to read this book. You might start at the beginning. You might flip to the chapter that calls to you. You might return to the same story again and again.

The blank spaces are for you. Add photos. Write notes. Make this book yours, the way [she/he] made these stories [hers/his]."

### 7. Colophon

"This book was created with Linda, an AI companion who listens.

The stories within were recorded between [start date] and [end date] at [care home name].

Audio recordings are preserved at linda.ai/book/[code]

Printed in the United Kingdom
[Edition], [Year]"

## Output Format

Return JSON with all text content:

```json
{
  "book_intro": "This book holds the stories of Margaret Thompson...",
  "chapters": [
    {
      "chapter_number": 1,
      "intro": "Before she was your mother...",
      "stories": [
        {
          "segment_id": "uuid",
          "title": "The Trawler's Daughter",
          "edited_transcript": "My father worked the trawlers...",
          "primary_pull_quote": "We come from people who worked hard for everything they had.",
          "recording_note": "Recorded 15th November 2024. Margaret was 87.",
          "closing_note": null
        }
      ]
    }
  ],
  "colophon": "This book was created with Linda..."
}
```

## Critical Rules

1. **Never invent.** Every word attributed to the resident must come from their transcript.

2. **Never editorialise.** Don't interpret what they meant. Present what they said.

3. **Keep their voice.** If they said "me mum" not "my mother", keep it.

4. **Less is more.** A 300-word edited transcript is usually better than 600 words.

5. **The reader is grieving.** Or will be. Write with that awareness.
```

---

## Stage 5: Human Review

### Purpose
Quality assurance and sensitivity decisions that cannot be automated.

### Review Checklist

```markdown
## Life Story Book Review Checklist

**Resident:** ________________
**Reviewer:** ________________
**Date:** ________________

### Content Review

[ ] All transcripts accurately represent audio
[ ] Pull quotes are verbatim (not paraphrased)
[ ] Chapter assignments are appropriate
[ ] Story sequence makes emotional sense
[ ] No redundant or repetitive content

### Sensitivity Review

[ ] All sensitivity flags addressed:
    [ ] Family estrangement — appropriate handling?
    [ ] Health disclosures — consent confirmed?
    [ ] Living persons — nothing defamatory?
    [ ] Chapter 5 messages — recipients confirmed?

[ ] Chapter 5 specific:
    [ ] Family informed of direct messages?
    [ ] Consent for inclusion confirmed?
    [ ] Any messages that should be delivered separately?

### Quality Review

[ ] Book tier appropriate for material?
[ ] Page allocation balanced?
[ ] No "thin" chapters that feel empty?
[ ] Chapter 5 content present and meaningful?

### Tone Review

[ ] Framing text is warm, not clinical?
[ ] No clichés or sentimentality?
[ ] Resident's voice preserved in transcripts?
[ ] Titles are evocative, not generic?

### Technical Review

[ ] All audio files accessible?
[ ] QR codes generate correctly?
[ ] Photo placeholders clearly marked?
[ ] Page numbers sequential?

### Final Approval

[ ] APPROVED FOR PRODUCTION
[ ] NEEDS REVISION (see notes)
[ ] ESCALATE TO SENIOR EDITOR

Notes:
_________________________________
_________________________________
_________________________________
```

### Escalation Triggers

Always escalate to senior review if:
- Resident has passed away since recording (handle with extra care)
- Family disputes or legal issues mentioned
- Content could cause harm to living persons
- Uncertainty about consent for Chapter 5 messages

---

## Stage 6: Render Pipeline

### PDF Generation

```python
# Pseudocode for PDF generation

def generate_book_pdf(book_content: BookContent) -> bytes:
    """
    Generate print-ready PDF from structured book content.
    """
    pdf = PDFDocument(
        page_size=A5,
        margins=get_margins_for_tier(book_content.tier)
    )
    
    # Front matter
    pdf.add_page(render_half_title(book_content.resident_name))
    pdf.add_page(render_title_page(book_content))
    pdf.add_page(render_how_to_use(book_content.book_intro))
    pdf.add_page(render_listening_guide())
    
    # Chapters
    for chapter in book_content.chapters:
        pdf.add_page(render_chapter_opener(chapter))
        
        for story in chapter.stories:
            pages = render_story(
                story=story,
                layout_type=story.layout_type,
                include_qr=True,
                include_photo_placeholder=True
            )
            for page in pages:
                pdf.add_page(page)
            
            # Breathing page between stories if needed
            if story.needs_breathing_page:
                pdf.add_page(render_breathing_page())
        
        # Chapter close if specified
        if chapter.close_text:
            pdf.add_page(render_chapter_close(chapter.close_text))
    
    # Back matter
    pdf.add_page(render_family_tree_template())
    pdf.add_page(render_notes_page())
    pdf.add_page(render_notes_page())
    pdf.add_page(render_colophon(book_content.colophon))
    
    return pdf.render()
```

### Digital Experience Generation

```python
def generate_digital_book(book_content: BookContent) -> DigitalBook:
    """
    Generate digital experience from structured book content.
    """
    digital = DigitalBook(
        unique_code=generate_unique_code(),
        resident_name=book_content.resident_name,
        resident_photo_url=book_content.photo_url,
        dates=book_content.dates
    )
    
    for chapter in book_content.chapters:
        digital_chapter = DigitalChapter(
            number=chapter.number,
            title=chapter.title,
            intro=chapter.intro
        )
        
        for story in chapter.stories:
            digital_story = DigitalStory(
                id=story.segment_id,
                title=story.title,
                audio_url=process_audio(story.audio_url, story.audio_edit),
                duration=story.duration,
                transcript=story.edited_transcript,
                pull_quote=story.primary_pull_quote
            )
            digital_chapter.add_story(digital_story)
        
        digital.add_chapter(digital_chapter)
    
    # Generate QR codes for each story
    for story in digital.all_stories():
        story.qr_code = generate_qr(
            url=f"linda.ai/book/{digital.unique_code}/{story.slug}"
        )
    
    return digital
```

---

## Quality Metrics

### Per-Book Metrics

| Metric | Target | Minimum |
|--------|--------|---------|
| Average story quality score | 4.0+ | 3.5 |
| Chapter coverage | 5/5 | 4/5 |
| Chapter 5 elements | 3+ | 1 |
| Human review pass rate | 95% | 90% |
| Family satisfaction (post-delivery survey) | 4.5/5 | 4.0/5 |

### System-Wide Metrics

| Metric | Target |
|--------|--------|
| Calls to book-ready | 8-12 calls |
| Production time (ready → delivered) | 5 business days |
| Human review time | < 30 minutes per book |
| Revision rate | < 10% |

---

## Error Handling

### Insufficient Content

If a resident reaches 15+ calls without hitting "ready" threshold:

1. Flag for editorial review
2. Consider adjusted Linda prompts (more direct story elicitation)
3. Offer "thin book" option to family with honest framing
4. In extreme cases, offer digital-only (lower threshold)

### Conflicting Content

If resident tells contradictory stories across calls:

1. Do not attempt to reconcile
2. Use the more detailed/vivid version
3. Note in editorial comments for human review
4. Memory inconsistency is normal — handle with care

### Sensitive Content Without Consent

If Chapter 5 message references someone who hasn't consented:

1. Flag for human review
2. Contact family to confirm inclusion
3. Offer to deliver message separately if preferred
4. Never include without explicit approval

---

## Appendix: Complete Agent Prompts

[See individual stage sections above for full prompts]

---

## Appendix: JSON Schemas

### Story Segment Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["segment_id", "title", "quality_score", "chapters", "pull_quotes", "summary"],
  "properties": {
    "segment_id": { "type": "string", "format": "uuid" },
    "title": { "type": "string", "maxLength": 100 },
    "start_timestamp": { "type": "string", "pattern": "^[0-9]{2}:[0-9]{2}$" },
    "end_timestamp": { "type": "string", "pattern": "^[0-9]{2}:[0-9]{2}$" },
    "duration_seconds": { "type": "integer", "minimum": 0 },
    "quality_score": { "type": "integer", "minimum": 1, "maximum": 5 },
    "quality_rationale": { "type": "string" },
    "chapters": { 
      "type": "array", 
      "items": { "type": "string", "enum": ["chapter_1", "chapter_2", "chapter_3", "chapter_4", "chapter_5"] }
    },
    "primary_chapter": { "type": "string" },
    "pull_quotes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["quote", "rank"],
        "properties": {
          "quote": { "type": "string" },
          "rank": { "type": "integer" },
          "rationale": { "type": "string" }
        }
      }
    },
    "summary": { "type": "string" },
    "key_details": {
      "type": "object",
      "properties": {
        "people": { "type": "array", "items": { "type": "string" } },
        "places": { "type": "array", "items": { "type": "string" } },
        "dates": { "type": "array", "items": { "type": "string" } },
        "objects": { "type": "array", "items": { "type": "string" } }
      }
    },
    "sensitivity_flags": { 
      "type": "array", 
      "items": { 
        "type": "string",
        "enum": ["family_estrangement", "health_disclosure", "end_of_life", "trauma", "living_persons", "chapter_5_message"]
      }
    },
    "editorial_notes": { "type": "string" },
    "audio_edit_suggestion": {
      "type": "object",
      "properties": {
        "recommended_start": { "type": "string" },
        "recommended_end": { "type": "string" },
        "trim_notes": { "type": "string" }
      }
    }
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12 | Initial specification |





<!-- LIFESTORY AI QUICK REF -->

# Life Story Book: AI Production Quick Reference

## The Core Insight

You can't automate taste. But you can automate *consistent application of taste you've already defined*.

The system works because:
1. We've already made the hard editorial decisions (what's good, what's not)
2. We've codified those decisions into scoring criteria
3. We've built templates that constrain output to known-good patterns
4. We've kept humans in the loop for judgment calls

---

## The Pipeline (Simple Version)

```
TRANSCRIPT → EXTRACT → ACCUMULATE → ASSEMBLE → WRITE → REVIEW → RENDER
     ↓           ↓          ↓           ↓         ↓        ↓        ↓
   Raw       Stories    Story Bank   Book      All      Human    PDF +
   call      + scores   (database)   structure  text    check    Digital
```

---

## The Three Key Agents

### 1. Transcript Analyst
**Job:** Find the gold in raw conversations.

**Key scoring criteria:**
- 5 = Complete narrative + vivid detail + emotional resonance + great quote
- 4 = Good structure + some detail + clear emotion + usable quote
- 3 = Partial narrative + limited detail + some emotion
- 2 = Fragment, might combine with other material
- 1 = Unusable, don't include

**Chapter assignments:**
- Ch1: Childhood, parents, growing up
- Ch2: Career, marriage, home
- Ch3: Children, hobbies, joys
- Ch4: Hardships, lessons
- Ch5: Direct messages to family (ONLY explicit addresses)

### 2. Editorial Director
**Job:** Design the book structure.

**Book tiers:**
- Full (50pp): 15+ stories, all 5 chapters, rich Ch5
- Standard (40pp): 10-14 stories, all chapters
- Thin (24-30pp): 6-9 stories, combine chapters if needed
- Minimal (16-20pp): Under 6 stories, digital-only option

**Page allocation:**
- Rich story (4+ min, quality 5): 3-4 pages
- Standard story (2-4 min, quality 4): 2 pages
- Short story (under 2 min): 2 pages
- Ch5 message per person: 2 pages

### 3. Copy Editor
**Job:** Write all framing text, edit transcripts.

**Voice rules:**
- Warm and steady. Not sentimental, not clinical.
- Short sentences. Direct.
- Second person ("Before she was your mother...")
- No exclamation marks. No clichés.

**Transcript editing:**
- Remove Linda's prompts
- Remove false starts, "um", "uh"
- Keep their exact words (don't "improve")
- Keep dialect and personality

---

## Readiness Thresholds

| Status | Usable Segments | Chapters | Chapter 5 |
|--------|-----------------|----------|-----------|
| **Ready** | 12+ | 4+ | Required |
| **Minimum Viable** | 6+ | Any | Required |
| **Collecting** | Below | — | — |

**Non-negotiable:** Every book must have Chapter 5 content.

---

## Sensitivity Flags (Always Human Review)

- `family_estrangement` — Divorce, custody, cut-off relatives
- `health_disclosure` — Medical conditions, diagnoses
- `end_of_life` — Death, dying, final wishes
- `trauma` — War, abuse, significant loss
- `living_persons` — Could cause harm if published
- `chapter_5_message` — Direct message to specific person

**Rule:** Flag, don't censor. Human makes the call.

---

## Quality Gates

### Before Production
- [ ] 12+ usable segments (quality 3+)
- [ ] 4+ chapters covered
- [ ] Chapter 5 content exists
- [ ] All sensitivity flags reviewed

### Before Delivery
- [ ] Human review complete
- [ ] All audio files accessible
- [ ] QR codes tested
- [ ] Family consents confirmed for Ch5

---

## Common Failure Modes

| Problem | Solution |
|---------|----------|
| Resident never opens up | Adjust Linda prompts, try object-based questions |
| All stories same topic | Flag for editorial review, may need thematic book |
| No Chapter 5 content | Additional focused call, direct prompt for messages |
| Family estrangement in Ch5 | Human review, may deliver separately |
| Contradictory stories | Use more vivid version, don't reconcile |

---

## The One Rule

**The reader is grieving. Or will be. Every decision flows from that.**

---

## File Outputs

Each book production generates:

1. `book_structure.json` — Editorial Director output
2. `book_content.json` — Copy Editor output
3. `review_checklist.md` — Human review form
4. `[name]_lifestory.pdf` — Print-ready PDF
5. `digital_manifest.json` — Web experience data

---

## Implementation Priority

1. **Start with Transcript Analyst** — This is the foundation. Get extraction right first.
2. **Build the Story Bank** — Simple database, track readiness.
3. **Add Editorial Director** — Structure decisions.
4. **Add Copy Editor** — Text generation.
5. **Human review workflow** — Can be manual initially.
6. **Render pipeline** — PDF generation last.

You can ship books with stages 1-4 + manual render. Automate render once volume justifies it.