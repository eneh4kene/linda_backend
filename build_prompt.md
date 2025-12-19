# Linda Backend Implementation Prompt

## Overview

Build the complete backend infrastructure for Linda, an AI companion service that makes proactive phone calls to elderly care home residents. The voice agent is already configured in Retell AI with system prompts. This backend handles call scheduling, context injection, webhook processing, memory extraction, and audio segmentation.

---

## Tech Stack

- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Queue:** BullMQ with Redis
- **Storage:** Vercel Blob (for audio files)
- **LLM:** Claude API (for memory extraction)
- **Voice:** Retell AI (external, already configured)
- **Audio Processing:** FFmpeg

---

## Project Structure

```
linda-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts                    # Express server entry
│   ├── config/
│   │   └── env.ts                  # Environment validation
│   ├── routes/
│   │   ├── calls.ts                # Call initiation endpoints
│   │   ├── residents.ts            # Resident CRUD
│   │   ├── facilities.ts           # Facility CRUD
│   │   └── webhooks.ts             # Retell webhook handler
│   ├── services/
│   │   ├── contextBuilder.ts       # Builds dynamic prompts for Retell
│   │   ├── retell.ts               # Retell API client
│   │   ├── scheduler.ts            # Call scheduling logic
│   │   └── storage.ts              # Vercel Blob operations
│   ├── workers/
│   │   ├── index.ts                # Worker entry point
│   │   ├── processCall.ts          # Main post-call processor
│   │   ├── extractMemories.ts      # Claude memory extraction
│   │   └── segmentAudio.ts         # FFmpeg audio segmentation
│   ├── queues/
│   │   └── index.ts                # BullMQ queue definitions
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── redis.ts                # Redis connection
│   │   └── claude.ts               # Anthropic client
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── package.json
├── tsconfig.json
├── docker-compose.yml              # Local Redis + Postgres
└── .env.example
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Facility {
  id        String   @id @default(uuid())
  name      String
  phone     String?
  timezone  String   @default("Europe/London")
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  residents Resident[]
}

model Resident {
  id                 String    @id @default(uuid())
  facilityId         String
  firstName          String
  lastName           String?
  preferredName      String?
  phoneNumber        String?
  roomNumber         String?
  status             String    @default("active") // active, paused, inactive
  
  // Consent
  callConsent        Boolean   @default(false)
  callConsentDate    DateTime?
  lifestoryConsent   Boolean   @default(false)
  lifestoryConsentDate DateTime?
  
  // Preferences
  preferredCallTimes Json?     // { days: [1,3,5], hours: [10,14,18] }
  communicationNotes String?   // e.g., "Hard of hearing in left ear"
  favoriteTopics     String?
  avoidTopics        String?
  
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  facility  Facility  @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  calls     Call[]
  memories  Memory[]
  segments  StorySegment[]
  
  @@index([facilityId, status])
}

model Call {
  id              String    @id @default(uuid())
  residentId      String
  retellCallId    String?   @unique
  
  callNumber      Int
  status          String    @default("scheduled") // scheduled, initiating, in_progress, completed, failed, no_answer
  isFirstCall     Boolean   @default(false)
  
  // Timing
  scheduledAt     DateTime?
  startedAt       DateTime?
  endedAt         DateTime?
  durationSeconds Int?
  
  // Audio
  audioUrl        String?   // Vercel Blob URL
  audioDurationMs Int?
  
  // Transcript
  transcript      Json?     // Raw Retell transcript array
  transcriptText  String?   // Formatted text version
  
  // Analysis (from Retell's call_analyzed webhook)
  summary         String?
  sentimentScore  Float?
  topicsDiscussed Json?     @default("[]")
  
  // Context audit trail
  contextUsed     Json?     // What was sent to Retell
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  resident  Resident       @relation(fields: [residentId], references: [id], onDelete: Cascade)
  memories  Memory[]       // Memories extracted from this call
  segments  StorySegment[]
  
  @@index([residentId, status])
  @@index([retellCallId])
}

model Memory {
  id              String    @id @default(uuid())
  residentId      String
  sourceCallId    String?
  
  category        String    // family, career, hobbies, places, events, preferences, personality, health
  key             String    // spouse_name, former_job, favorite_team, etc.
  value           String    // The actual memory content
  
  confidence      Float     @default(0.8)
  timesMentioned  Int       @default(1)
  firstMentionedAt DateTime @default(now())
  lastMentionedAt DateTime  @default(now())
  
  isActive        Boolean   @default(true)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  resident   Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  sourceCall Call?    @relation(fields: [sourceCallId], references: [id], onDelete: SetNull)
  
  @@unique([residentId, category, key])
  @@index([residentId, isActive])
}

model StorySegment {
  id              String    @id @default(uuid())
  callId          String
  residentId      String
  
  // Timing within the call
  startTimeMs     Int
  endTimeMs       Int
  
  // Content
  transcriptText  String
  speaker         String    // "resident" or "agent"
  
  // Audio clip
  audioClipUrl    String?   // Vercel Blob URL for extracted clip
  audioClipStatus String    @default("pending") // pending, processing, completed, failed
  
  // Categorization
  category        String?   // family_story, career_memory, life_event, etc.
  subcategory     String?
  entities        Json?     // People, places, dates mentioned
  
  // Quality scoring
  storyQualityScore   Float?  // 0-1, how good is this as a story segment
  emotionalIntensity  Float?  // 0-1, emotional weight
  isCompleteStory     Boolean @default(false)
  
  // Curation
  isStarred       Boolean   @default(false)
  isExcluded      Boolean   @default(false)
  staffNotes      String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  call     Call     @relation(fields: [callId], references: [id], onDelete: Cascade)
  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)
  
  @@index([residentId, category])
  @@index([callId])
}
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/linda"

# Redis
REDIS_URL="redis://localhost:6379"

# Retell AI
RETELL_API_KEY="your-retell-api-key"
RETELL_AGENT_ID="agent_xxxxxxxxxxxx"
RETELL_PHONE_NUMBER="+44xxxxxxxxxx"
RETELL_WEBHOOK_SECRET="your-webhook-secret"

# Anthropic (Claude)
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_xxxxxxxxxxxx"

# Server
PORT=3000
NODE_ENV="development"
API_BASE_URL="http://localhost:3000"
```

---

## API Endpoints

### Calls

**POST /api/calls**
Initiate a call to a resident.
```typescript
// Request
{ residentId: string }

// Response
{ 
  callId: string, 
  retellCallId: string, 
  status: "initiating" 
}
```

**GET /api/calls/:id**
Get call details including transcript and audio URL.

**GET /api/calls?residentId=xxx**
List calls for a resident.

### Residents

**POST /api/residents**
```typescript
{
  facilityId: string,
  firstName: string,
  lastName?: string,
  preferredName?: string,
  phoneNumber: string,
  roomNumber?: string,
  communicationNotes?: string,
  favoriteTopics?: string,
  avoidTopics?: string,
  callConsent: boolean
}
```

**GET /api/residents/:id**
Includes memories and recent calls.

**PATCH /api/residents/:id**
Update resident details.

**GET /api/residents?facilityId=xxx**
List residents for a facility.

### Facilities

Standard CRUD: POST, GET, PATCH, DELETE /api/facilities

### Webhooks

**POST /api/webhooks/retell**
Handles Retell webhook events. Verify signature using `RETELL_WEBHOOK_SECRET`.

Events to handle:
- `call_started`: Update call status, set startedAt
- `call_ended`: Update status, duration, transcript, queue post-processing
- `call_analyzed`: Update summary, sentiment, topics

---

## Context Builder Service

The Context Builder constructs the dynamic variables payload for Retell's `retell_llm_dynamic_variables`. This is injected into the system prompt via Handlebars-style variables.

```typescript
// src/services/contextBuilder.ts

interface RetellDynamicVariables {
  preferred_name: string;
  full_name: string;
  room_number: string;
  memories: Array<{ category: string; value: string }>;
  favorite_topics: string;
  avoid_topics: string;
  communication_notes: string;
  last_call_summary: string;
}

async function buildCallContext(residentId: string): Promise<{
  dynamicVariables: RetellDynamicVariables;
  metadata: {
    callNumber: number;
    isFirstCall: boolean;
    memoriesCount: number;
  };
}> {
  // 1. Fetch resident with facility
  // 2. Fetch active memories (ORDER BY timesMentioned DESC, lastMentionedAt DESC, LIMIT 30)
  // 3. Fetch last completed call
  // 4. Count total completed calls
  // 5. Format memories as array: [{ category: "Family", value: "Married to Arthur for 52 years" }]
  // 6. Format last call summary with time reference ("We spoke 2 days ago. You told me about...")
  // 7. Return structured payload matching Retell template variables
}
```

Memory formatting rules:
- Group by category with human-readable names (family → "Family", career → "Career History")
- Include max 30 memories to avoid context overflow
- Prioritize frequently mentioned and recently mentioned memories

Last call summary format:
- Include relative time: "earlier today", "yesterday", "3 days ago", "last week"
- Include brief summary and topics if available
- If no previous calls: "This is our first conversation."

---

## Retell Integration Service

```typescript
// src/services/retell.ts

// Initiate outbound call
async function initiateCall(params: {
  residentId: string;
  phoneNumber: string;
  dynamicVariables: RetellDynamicVariables;
  metadata: Record<string, any>;
}): Promise<{ callId: string }> {
  // POST to https://api.retellai.com/v2/create-phone-call
  // Body:
  // {
  //   agent_id: RETELL_AGENT_ID,
  //   to_number: phoneNumber,
  //   from_number: RETELL_PHONE_NUMBER,
  //   retell_llm_dynamic_variables: dynamicVariables,
  //   metadata: { dbCallId, residentId, callNumber, ... }
  // }
}

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  // HMAC SHA256 verification using RETELL_WEBHOOK_SECRET
}
```

---

## Webhook Handler

```typescript
// src/routes/webhooks.ts

// POST /api/webhooks/retell
// 1. Verify signature
// 2. Parse event type from body.event
// 3. Extract metadata.dbCallId to link back to our call record

// call_started event:
// - Update call: status = "in_progress", startedAt = timestamp

// call_ended event:
// - Update call: status based on end_reason, endedAt, durationSeconds, transcript, transcriptText
// - Queue "process-call" job if status is "completed"

// call_analyzed event:
// - Update call: summary, sentimentScore, topicsDiscussed

// Respond 200 immediately, process asynchronously
```

Retell webhook payload structure:
```typescript
{
  event: "call_started" | "call_ended" | "call_analyzed",
  call_id: string,
  timestamp: string,
  data: {
    call_id: string,
    agent_id: string,
    metadata: { dbCallId: string, residentId: string, ... },
    // For call_ended:
    end_reason: string,
    duration_ms: number,
    recording_url: string,
    transcript: Array<{ role: "agent" | "user", content: string, start_ms: number, end_ms: number }>,
    // For call_analyzed:
    call_analysis: {
      call_summary: string,
      user_sentiment: string,
      topics_discussed: string[]
    }
  }
}
```

---

## Post-Call Processing Worker

```typescript
// src/workers/processCall.ts

// Job: "process-call"
// Data: { callId: string }

async function processCall(callId: string) {
  const call = await getCallWithResident(callId);
  
  // Step 1: Download and store audio
  if (call.recordingUrl) {
    const audioUrl = await downloadAndStoreAudio(callId, call.recordingUrl);
    await updateCallAudioUrl(callId, audioUrl);
  }
  
  // Step 2: Extract memories from transcript
  if (call.transcriptText) {
    const memories = await extractMemories(call.residentId, call.transcriptText);
    await upsertMemories(call.residentId, callId, memories);
  }
  
  // Step 3: Identify and segment story moments
  if (call.transcript && call.recordingUrl) {
    const segments = await identifyStorySegments(call.transcript, call.transcriptText);
    await createStorySegments(callId, call.residentId, segments);
    
    // Queue audio extraction for each segment
    for (const segment of segments) {
      await queue.add("extract-audio-clip", { segmentId: segment.id });
    }
  }
}
```

---

## Memory Extraction (Claude)

```typescript
// src/workers/extractMemories.ts

const MEMORY_EXTRACTION_PROMPT = `
You are analyzing a conversation between Linda (an AI companion) and {{residentName}}, an elderly care home resident.

Extract factual information about the resident that should be remembered for future conversations.

## What to Extract:
- Family members (names, relationships, details)
- Spouse/partner information
- Children, grandchildren
- Career and work history
- Places lived or visited
- Hobbies and interests
- Important life events
- Preferences (likes, dislikes)
- Personality observations
- Health mentions (only what they voluntarily share)
- Pets
- Daily routines

## What NOT to Extract:
- Small talk ("I'm fine", "nice weather")
- Anything Linda says
- Vague or uncertain information
- Medical details that seem private

## Output Format:
Return a JSON array:
[
  {
    "category": "family",
    "key": "spouse_name",
    "value": "Arthur, married 52 years, passed away in 2022",
    "confidence": 0.95
  }
]

Categories: family, career, hobbies, places, events, preferences, personality, health, daily_life

If no memories can be extracted, return: []

## Transcript:
{{transcript}}
`;

async function extractMemories(residentId: string, transcript: string): Promise<ExtractedMemory[]> {
  // Call Claude API with the prompt
  // Parse JSON response
  // Validate and clean results
  // Return array of memories
}

async function upsertMemories(residentId: string, callId: string, memories: ExtractedMemory[]) {
  // For each memory:
  // - Try to find existing memory with same residentId + category + key
  // - If exists: update value, increment timesMentioned, update lastMentionedAt
  // - If not: create new memory
  // Use Prisma upsert with onConflict
}
```

---

## Story Segmentation (Claude + FFmpeg)

```typescript
// src/workers/segmentAudio.ts

const SEGMENT_IDENTIFICATION_PROMPT = `
Analyze this conversation transcript and identify segments where the resident shares meaningful stories, memories, or personal experiences worth preserving.

Look for:
- Complete stories with beginning, middle, end
- Emotional moments
- Family memories
- Career highlights
- Life events
- Vivid descriptions of the past

For each segment, provide:
- start_ms: timestamp where segment begins
- end_ms: timestamp where segment ends
- category: family_story, career_memory, life_event, childhood_memory, relationship_story, achievement, hardship, daily_life
- summary: brief description
- quality_score: 0-1 (how complete/meaningful is this story)
- emotional_intensity: 0-1

Return JSON array. Only include segments scoring > 0.6 quality.

Transcript with timestamps:
{{transcript}}
`;

async function identifyStorySegments(transcript: TranscriptEntry[], fullText: string): Promise<IdentifiedSegment[]> {
  // Call Claude to identify segments
  // Parse and validate response
  // Filter by quality threshold
}

// Job: "extract-audio-clip"
async function extractAudioClip(segmentId: string) {
  const segment = await getSegment(segmentId);
  const call = await getCall(segment.callId);
  
  // Download full audio if not already local
  const audioPath = await downloadAudio(call.audioUrl);
  
  // Use FFmpeg to extract clip
  const clipPath = await ffmpegExtract({
    input: audioPath,
    startMs: segment.startTimeMs,
    endMs: segment.endTimeMs,
    output: `/tmp/${segmentId}.mp3`
  });
  
  // Upload clip to Vercel Blob
  const clipUrl = await uploadToBlob(clipPath, `clips/${segment.residentId}/${segmentId}.mp3`);
  
  // Update segment with clip URL
  await updateSegmentClipUrl(segmentId, clipUrl);
}
```

FFmpeg command for extraction:
```bash
ffmpeg -i input.wav -ss START_SECONDS -to END_SECONDS -c:a libmp3lame -q:a 2 output.mp3
```

---

## Vercel Blob Storage

```typescript
// src/services/storage.ts

import { put, del } from '@vercel/blob';

async function uploadAudio(callId: string, audioBuffer: Buffer): Promise<string> {
  const { url } = await put(`calls/${callId}/recording.wav`, audioBuffer, {
    access: 'public',
    contentType: 'audio/wav'
  });
  return url;
}

async function uploadAudioClip(segmentId: string, residentId: string, clipBuffer: Buffer): Promise<string> {
  const { url } = await put(`clips/${residentId}/${segmentId}.mp3`, clipBuffer, {
    access: 'public',
    contentType: 'audio/mpeg'
  });
  return url;
}

async function downloadAudio(url: string): Promise<Buffer> {
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}
```

---

## Call Scheduler

```typescript
// src/services/scheduler.ts

// Run via cron every 15 minutes (externally triggered or node-cron)

async function checkAndInitiateCalls() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  
  // Only run 9am - 8pm
  if (hour < 9 || hour >= 20) return;
  
  // Find residents due for calls
  const residents = await prisma.resident.findMany({
    where: {
      status: 'active',
      callConsent: true,
      phoneNumber: { not: null },
    },
    include: {
      calls: {
        where: { status: 'completed' },
        orderBy: { endedAt: 'desc' },
        take: 1
      }
    }
  });
  
  for (const resident of residents) {
    // Skip if called in last 20 hours
    const lastCall = resident.calls[0];
    if (lastCall && hoursSince(lastCall.endedAt) < 20) continue;
    
    // Check preferred times (default: Tue/Thu/Sat at 10am, 2pm, 6pm)
    if (!isPreferredTime(resident.preferredCallTimes, hour, dayOfWeek)) continue;
    
    // Initiate call
    await initiateCall(resident.id);
    
    // Add delay between calls
    await sleep(30000); // 30 seconds
  }
}
```

---

## Queue Configuration

```typescript
// src/queues/index.ts

import { Queue, Worker } from 'bullmq';
import { redis } from '../lib/redis';

export const callQueue = new Queue('calls', { connection: redis });

// Job types:
// - "process-call": { callId: string }
// - "extract-audio-clip": { segmentId: string }
// - "scheduled-calls": {} (triggered by cron)

// Worker setup in src/workers/index.ts
new Worker('calls', async (job) => {
  switch (job.name) {
    case 'process-call':
      await processCall(job.data.callId);
      break;
    case 'extract-audio-clip':
      await extractAudioClip(job.data.segmentId);
      break;
  }
}, {
  connection: redis,
  concurrency: 5
});
```

---

## Error Handling

- All API endpoints should return consistent error format: `{ error: string, details?: any }`
- Webhook handler must always return 200 quickly, process async
- Worker jobs should have retry logic (3 attempts, exponential backoff)
- Log all errors with context (callId, residentId, etc.)
- Failed calls should update status to "failed" with error details

---

## Package Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "@prisma/client": "^5.0.0",
    "@vercel/blob": "^0.23.0",
    "bullmq": "^5.0.0",
    "express": "^4.18.0",
    "ioredis": "^5.0.0",
    "zod": "^3.22.0",
    "node-cron": "^3.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

---

## Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:worker": "tsx watch src/workers/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "start:worker": "node dist/workers/index.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

---

## Local Development

docker-compose.yml for local Postgres and Redis:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: linda
      POSTGRES_PASSWORD: linda
      POSTGRES_DB: linda
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Implementation Order

1. Set up project structure, TypeScript config, install dependencies
2. Create Prisma schema and run db:push
3. Implement basic Express server with health check
4. Build Retell integration service (initiateCall, verifyWebhook)
5. Implement Context Builder service
6. Create POST /api/calls endpoint
7. Implement webhook handler for all Retell events
8. Set up BullMQ queues and workers
9. Implement audio download and Vercel Blob storage
10. Build Claude memory extraction
11. Implement memory upsert logic
12. Build story segment identification
13. Implement FFmpeg audio clip extraction
14. Add call scheduler
15. Create remaining CRUD endpoints for residents/facilities
16. Add error handling and logging throughout

---

## Testing

Create these test scenarios:
1. Initiate a call and verify Retell API is called with correct payload
2. Simulate call_ended webhook and verify transcript is stored
3. Verify memory extraction parses Claude response correctly
4. Test memory upsert increments timesMentioned for existing memories
5. Verify audio is downloaded and uploaded to Vercel Blob
6. Test scheduler only calls residents at appropriate times

---

## Notes

- Retell's transcript includes timestamps (start_ms, end_ms) for each utterance — use these for audio segmentation
- Keep webhook handler fast — always respond 200 immediately, queue heavy processing
- The system prompt variables in Retell use Handlebars syntax ({{variable}}) — match these exactly
- FFmpeg must be installed on the deployment environment
- Consider rate limiting the Retell API calls during bulk scheduling