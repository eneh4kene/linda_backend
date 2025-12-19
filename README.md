# Linda Backend

Backend infrastructure for Linda, an AI companion service that makes proactive phone calls to elderly care home residents.

## Features

- **Call Management**: Initiate and track phone calls via Retell AI
- **Context Building**: Dynamic conversation context from resident memories
- **Memory Extraction**: AI-powered extraction of factual information from conversations
- **Story Segmentation**: Identify and preserve meaningful life stories
- **Audio Processing**: Download, store, and extract story segments from call recordings
- **Automated Scheduling**: Smart scheduling based on resident preferences

## Tech Stack

- Node.js 20+ with TypeScript
- Express.js - REST API
- PostgreSQL - Database
- Prisma - ORM
- BullMQ - Queue processing
- Redis - Queue backend
- Claude API - Memory extraction & story analysis
- Retell AI - Voice calling
- Vercel Blob - Audio storage
- FFmpeg - Audio processing

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local PostgreSQL and Redis)
- FFmpeg (for audio processing)
- API keys:
  - Retell AI account with configured agent
  - Anthropic Claude API key
  - Vercel Blob storage token

## Quick Start

### 1. Clone and Install

```bash
npm install
```

### 2. Start Local Services

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis locally.

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials.

### 4. Initialize Database

```bash
npm run db:push
npm run db:generate
```

### 5. Start Development Servers

In separate terminals:

```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Worker Process
npm run dev:worker
```

The API will be available at `http://localhost:3000`.

## Project Structure

```
linda-backend/
├── prisma/
│   └── schema.prisma           # Database schema
├── src/
│   ├── index.ts                # Express server entry
│   ├── config/
│   │   └── env.ts              # Environment validation
│   ├── routes/
│   │   ├── calls.ts            # Call endpoints
│   │   ├── residents.ts        # Resident CRUD
│   │   ├── facilities.ts       # Facility CRUD
│   │   └── webhooks.ts         # Retell webhook handler
│   ├── services/
│   │   ├── contextBuilder.ts   # Build call context
│   │   ├── retell.ts           # Retell API client
│   │   ├── scheduler.ts        # Call scheduling
│   │   └── storage.ts          # Vercel Blob operations
│   ├── workers/
│   │   ├── index.ts            # Worker entry point
│   │   ├── processCall.ts      # Post-call processor
│   │   ├── extractMemories.ts  # Claude memory extraction
│   │   └── segmentAudio.ts     # Story segmentation & FFmpeg
│   ├── queues/
│   │   └── index.ts            # BullMQ queue definitions
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   ├── redis.ts            # Redis connection
│   │   └── claude.ts           # Anthropic client
│   └── types/
│       └── index.ts            # TypeScript types
├── package.json
├── tsconfig.json
├── docker-compose.yml
└── .env.example
```

## API Endpoints

### Health Check

```
GET /health
```

### Facilities

```
POST   /api/facilities          # Create facility
GET    /api/facilities          # List facilities
GET    /api/facilities/:id      # Get facility
PATCH  /api/facilities/:id      # Update facility
DELETE /api/facilities/:id      # Delete facility
```

### Residents

```
POST   /api/residents           # Create resident
GET    /api/residents           # List residents (by facilityId)
GET    /api/residents/:id       # Get resident with memories
PATCH  /api/residents/:id       # Update resident
```

### Calls

```
POST   /api/calls               # Initiate call
GET    /api/calls               # List calls (by residentId)
GET    /api/calls/:id           # Get call details
```

### Webhooks

```
POST   /api/webhooks/retell     # Retell webhook receiver
```

## Database Models

- **Facility** - Care home organization
- **Resident** - Individual resident with consent and preferences
- **Call** - Call record with transcript and context
- **Memory** - Extracted factual information about residents
- **StorySegment** - Meaningful story moments with audio clips

## Worker Jobs

The worker process handles:

1. **process-call** - Post-call processing
   - Downloads and stores audio in Vercel Blob
   - Extracts memories using Claude
   - Identifies story segments
   - Queues audio clip extraction

2. **extract-audio-clip** - Audio segmentation
   - Uses FFmpeg to extract story clips
   - Uploads clips to Vercel Blob

## Call Scheduler

The scheduler can be triggered via cron or manually:

```typescript
import { checkAndInitiateCalls } from './services/scheduler';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await checkAndInitiateCalls();
});
```

Scheduling rules:
- Only runs 9am-8pm
- Respects resident preferred times (default: Tue/Thu/Sat at 10am, 2pm, 6pm)
- Minimum 20 hours between calls
- 30 second delay between initiating calls

## Development

### Build TypeScript

```bash
npm run build
```

### Prisma Studio (Database GUI)

```bash
npm run db:studio
```

### Production

```bash
npm run build
npm start                # API server
npm run start:worker     # Worker process
```

## Environment Variables

See `.env.example` for all required environment variables.

## FFmpeg Installation

### macOS

```bash
brew install ffmpeg
```

### Ubuntu/Debian

```bash
sudo apt-get install ffmpeg
```

### Docker

FFmpeg is required in your production environment. Make sure it's installed in your deployment container.

## Testing Webhooks Locally

Use ngrok or similar to expose your local server:

```bash
ngrok http 3000
```

Configure the ngrok URL in your Retell dashboard webhook settings.

## Notes

- Webhook handler always responds 200 immediately and processes async
- Memory extraction uses Claude to parse conversation transcripts
- Story segments are identified by quality score (>0.6)
- Audio clips are extracted using FFmpeg with timestamps from transcripts
- Retell recording URLs are downloaded and permanently stored in Vercel Blob

## Support

For issues or questions, check the build_prompt.md file for implementation details.
