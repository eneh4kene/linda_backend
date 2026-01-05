## Family Check-In Feature — Implementation Prompt

---

### Overview

Add a feature that allows family members to call Linda and receive a warm, curated summary of how their loved one is doing. This is NOT surveillance — it's a gentle update that preserves the resident's trust while keeping family connected.

---

### Key Principles

1. **Resident privacy is sacred.** Family gets mood and topics, not transcripts or quotes.
2. **Consent is required.** Resident must opt-in to family check-ins.
3. **Tone is warm, not clinical.** Linda sounds like a kind neighbour giving an update, not a medical report.
4. **Concerning content goes to staff, not family.** Health concerns, distress, or safety issues are flagged for care home staff only.

---

### Database Schema Additions

```prisma
model FamilyMember {
  id              String    @id @default(uuid())
  residentId      String
  
  firstName       String
  lastName        String?
  relationship    String    // daughter, son, granddaughter, spouse, etc.
  phoneNumber     String
  email           String?
  
  // Permissions
  canReceiveUpdates   Boolean @default(true)
  canReceiveAlerts    Boolean @default(true)  // For staff-escalated concerns
  
  // Verification
  isVerified      Boolean   @default(false)
  verifiedAt      DateTime?
  verificationCode String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  resident        Resident  @relation(fields: [residentId], references: [id], onDelete: Cascade)
  checkInCalls    FamilyCheckIn[]
  
  @@index([residentId])
  @@index([phoneNumber])
}

model FamilyCheckIn {
  id              String    @id @default(uuid())
  familyMemberId  String
  residentId      String
  retellCallId    String?   @unique
  
  status          String    @default("initiated") // initiated, in_progress, completed, failed
  
  // Timing
  startedAt       DateTime?
  endedAt         DateTime?
  durationSeconds Int?
  
  // Generated content
  summaryGenerated  String?   // The summary Linda read to the family member
  summaryData       Json?     // Structured data used to generate summary
  
  // What period was covered
  periodStart     DateTime?   // e.g., last 7 days
  periodEnd       DateTime?
  callsCovered    Int?        // Number of resident calls summarized
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  familyMember    FamilyMember @relation(fields: [familyMemberId], references: [id], onDelete: Cascade)
  resident        Resident     @relation(fields: [residentId], references: [id], onDelete: Cascade)
  
  @@index([familyMemberId])
  @@index([residentId])
}
```

Update `Resident` model:

```prisma
model Resident {
  // ... existing fields ...
  
  // Family check-in consent
  familyCheckInConsent     Boolean   @default(false)
  familyCheckInConsentDate DateTime?
  
  familyMembers     FamilyMember[]
  familyCheckIns    FamilyCheckIn[]
}
```

---

### New API Endpoints

**Family Members**

```
POST   /api/residents/:residentId/family
       Create a family member for a resident
       Body: { firstName, lastName, relationship, phoneNumber, email? }

GET    /api/residents/:residentId/family
       List all family members for a resident

PATCH  /api/family/:id
       Update family member details or permissions

DELETE /api/family/:id
       Remove a family member

POST   /api/family/:id/verify
       Send verification code to family member's phone

POST   /api/family/:id/verify/confirm
       Confirm verification code
       Body: { code }
```

**Family Check-In Calls**

```
POST   /api/family-check-in/inbound
       Webhook endpoint for inbound calls from family members
       Called by Retell/Twilio when a family member calls the Linda number

GET    /api/family-check-in/:id
       Get details of a family check-in call

GET    /api/family/:familyMemberId/check-ins
       List all check-in calls for a family member
```

---

### Inbound Call Flow

Family member calls Linda's phone number. The system must:

1. **Identify the caller** by phone number
2. **Look up the linked resident**
3. **Verify consent** is in place
4. **Generate a summary** of recent calls
5. **Initiate Retell call** with family-specific agent and dynamic variables

```typescript
// src/routes/familyCheckIn.ts

router.post('/inbound', async (req, res) => {
  // Twilio/Retell sends inbound call webhook
  const { from_number, call_id } = req.body;
  
  // 1. Find family member by phone number
  const familyMember = await prisma.familyMember.findFirst({
    where: { phoneNumber: normalizePhone(from_number), isVerified: true },
    include: { resident: true }
  });
  
  if (!familyMember) {
    // Unknown caller — Retell plays: "I'm sorry, I don't recognize this number. 
    // Please contact the care home to register for family updates."
    return res.json({ 
      action: 'reject',
      message: 'unregistered_caller'
    });
  }
  
  // 2. Check resident has consented to family check-ins
  if (!familyMember.resident.familyCheckInConsent) {
    // Retell plays: "I'm sorry, [Resident] hasn't enabled family updates. 
    // Please speak with the care home staff."
    return res.json({
      action: 'reject', 
      message: 'no_consent'
    });
  }
  
  // 3. Generate summary
  const summary = await generateFamilyCheckInSummary(
    familyMember.residentId,
    familyMember.id
  );
  
  // 4. Create check-in record
  const checkIn = await prisma.familyCheckIn.create({
    data: {
      familyMemberId: familyMember.id,
      residentId: familyMember.residentId,
      retellCallId: call_id,
      status: 'in_progress',
      startedAt: new Date(),
      summaryGenerated: summary.text,
      summaryData: summary.data,
      periodStart: summary.periodStart,
      periodEnd: summary.periodEnd,
      callsCovered: summary.callsCovered
    }
  });
  
  // 5. Return dynamic variables for Retell family agent
  return res.json({
    action: 'accept',
    agent_id: process.env.RETELL_FAMILY_AGENT_ID,
    retell_llm_dynamic_variables: {
      family_member_name: familyMember.firstName,
      resident_name: familyMember.resident.preferredName || familyMember.resident.firstName,
      relationship: familyMember.relationship,
      summary_text: summary.text,
      calls_covered: summary.callsCovered,
      period_description: summary.periodDescription,
      has_shareable_moment: summary.shareableMoment ? 'true' : 'false',
      shareable_moment_description: summary.shareableMoment?.description || '',
      shareable_moment_audio_url: summary.shareableMoment?.audioUrl || ''
    },
    metadata: {
      checkInId: checkIn.id,
      familyMemberId: familyMember.id,
      residentId: familyMember.residentId
    }
  });
});
```

---

### Summary Generation Service

```typescript
// src/services/familyCheckInSummary.ts

interface CheckInSummary {
  text: string;                    // The actual script Linda will read
  data: SummaryData;               // Structured data for records
  periodStart: Date;
  periodEnd: Date;
  periodDescription: string;       // "the past week", "the last few days"
  callsCovered: number;
  shareableMoment: ShareableMoment | null;
}

interface SummaryData {
  overallSentiment: 'positive' | 'neutral' | 'mixed' | 'low';
  averageSentimentScore: number;
  topicsDiscussed: string[];
  notableHighlights: string[];
  concernsForStaff: string[];      // NOT shared with family
}

interface ShareableMoment {
  description: string;
  audioUrl: string;
  callId: string;
  segmentId: string;
}

async function generateFamilyCheckInSummary(
  residentId: string,
  familyMemberId: string
): Promise<CheckInSummary> {
  
  const now = new Date();
  const periodStart = subDays(now, 7); // Last 7 days
  
  // 1. Fetch recent calls
  const recentCalls = await prisma.call.findMany({
    where: {
      residentId,
      status: 'completed',
      endedAt: { gte: periodStart }
    },
    orderBy: { endedAt: 'desc' },
    select: {
      id: true,
      endedAt: true,
      summary: true,
      sentimentScore: true,
      topicsDiscussed: true,
      durationSeconds: true
    }
  });
  
  if (recentCalls.length === 0) {
    return {
      text: generateNoCallsScript(residentId),
      data: { overallSentiment: 'neutral', averageSentimentScore: 0, topicsDiscussed: [], notableHighlights: [], concernsForStaff: [] },
      periodStart,
      periodEnd: now,
      periodDescription: 'the past week',
      callsCovered: 0,
      shareableMoment: null
    };
  }
  
  // 2. Fetch resident details
  const resident = await prisma.resident.findUnique({
    where: { id: residentId }
  });
  
  // 3. Fetch family member for relationship context
  const familyMember = await prisma.familyMember.findUnique({
    where: { id: familyMemberId }
  });
  
  // 4. Check for shareable moments (starred segments meant for family)
  const shareableMoment = await prisma.storySegment.findFirst({
    where: {
      residentId,
      isStarred: true,
      isExcluded: false,
      audioClipUrl: { not: null },
      createdAt: { gte: periodStart }
    },
    orderBy: { storyQualityScore: 'desc' }
  });
  
  // 5. Generate summary using Claude
  const summaryData = await generateSummaryWithClaude(
    resident,
    familyMember,
    recentCalls
  );
  
  // 6. Generate the spoken script
  const scriptText = await generateSpokenScript(
    resident,
    familyMember,
    recentCalls,
    summaryData,
    shareableMoment
  );
  
  return {
    text: scriptText,
    data: summaryData,
    periodStart,
    periodEnd: now,
    periodDescription: describePeriod(periodStart, now),
    callsCovered: recentCalls.length,
    shareableMoment: shareableMoment ? {
      description: shareableMoment.transcriptText.slice(0, 100),
      audioUrl: shareableMoment.audioClipUrl,
      callId: shareableMoment.callId,
      segmentId: shareableMoment.id
    } : null
  };
}
```

---

### Claude Summary Generation

```typescript
// src/services/familyCheckInSummary.ts (continued)

const SUMMARY_ANALYSIS_PROMPT = `
You are analyzing recent conversations between Linda (an AI companion) and {{resident_name}}, an elderly care home resident. 

A family member ({{family_member_name}}, their {{relationship}}) is calling to check in. You need to generate a warm, honest summary of how {{resident_name}} has been doing.

## Recent Calls Data
{{calls_json}}

## Guidelines

INCLUDE:
- Overall mood and energy level
- Topics they've enjoyed discussing
- Positive moments or stories they shared
- General wellbeing observations

DO NOT INCLUDE:
- Direct quotes from conversations
- Complaints about family members
- Private health details (unless life-threatening)
- Anything that would feel like surveillance
- Specific criticisms or negative comments about anyone

TONE:
- Warm and conversational, like a kind neighbour
- Honest but gentle — if they've had a hard week, say so kindly
- Focus on connection, not clinical reporting

## Output Format
Return JSON:
{
  "overallSentiment": "positive" | "neutral" | "mixed" | "low",
  "averageSentimentScore": 0.0-1.0,
  "topicsDiscussed": ["topic1", "topic2"],
  "notableHighlights": ["highlight1", "highlight2"],
  "concernsForStaff": ["concern1"] // Private - NOT shared with family
}
`;

const SCRIPT_GENERATION_PROMPT = `
You are Linda, a warm AI companion. A family member is calling to ask how their loved one is doing. Generate the spoken script you will read to them.

## Context
- Resident: {{resident_name}}
- Family member: {{family_member_name}} ({{relationship}})
- Period: {{period_description}}
- Calls in period: {{calls_covered}}

## Summary Data
{{summary_data_json}}

## Shareable Moment Available
{{#if has_shareable_moment}}
There is a lovely story segment available to share: "{{shareable_moment_description}}"
Offer to play it at the end of your update.
{{else}}
No specific shareable moment this time.
{{/if}}

## Script Guidelines

LENGTH: 60-90 seconds when spoken (approximately 150-200 words)

STRUCTURE:
1. Warm greeting using their name
2. Confirm who you're updating them about
3. How many times you've spoken recently
4. Overall sense of how they're doing
5. 1-2 specific topics or highlights (without private details)
6. Any gentle observations about mood or energy
7. Reassurance and warm close
8. (If available) Offer to play a shareable moment

TONE:
- Like a kind neighbour who pops round for tea
- Warm, not clinical
- Honest but gentle
- Never use phrases like "sentiment score" or "analysis indicates"

AVOID:
- Direct quotes from the resident
- Anything that sounds like surveillance
- Medical terminology
- Anything the resident said about the family member

## Example Output

"Hello Sarah. It's lovely to hear from you. I've been chatting with your mum a few times this week — we've had three lovely conversations.

She's been in good spirits overall. We talked a lot about her garden — she's been remembering the roses your father planted, and she lit up telling me about them. She also mentioned looking forward to your visit next month.

She did seem a little tired on Tuesday — nothing worrying, just one of those days. But by Thursday she was much brighter and we had a wonderful chat about her nursing days.

All in all, she's doing well. I can tell she thinks about you often.

Is there anything you'd like me to mention to her next time we speak?"

Now generate the script:
`;

async function generateSummaryWithClaude(
  resident: Resident,
  familyMember: FamilyMember,
  calls: Call[]
): Promise<SummaryData> {
  
  const prompt = SUMMARY_ANALYSIS_PROMPT
    .replace('{{resident_name}}', resident.preferredName || resident.firstName)
    .replace('{{family_member_name}}', familyMember.firstName)
    .replace('{{relationship}}', familyMember.relationship)
    .replace('{{calls_json}}', JSON.stringify(calls.map(c => ({
      date: c.endedAt,
      summary: c.summary,
      sentiment: c.sentimentScore,
      topics: c.topicsDiscussed,
      duration: c.durationSeconds
    }))));
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  
  return JSON.parse(content.text);
}

async function generateSpokenScript(
  resident: Resident,
  familyMember: FamilyMember,
  calls: Call[],
  summaryData: SummaryData,
  shareableMoment: StorySegment | null
): Promise<string> {
  
  const prompt = SCRIPT_GENERATION_PROMPT
    .replace('{{resident_name}}', resident.preferredName || resident.firstName)
    .replace('{{family_member_name}}', familyMember.firstName)
    .replace('{{relationship}}', familyMember.relationship)
    .replace('{{period_description}}', 'the past week')
    .replace('{{calls_covered}}', String(calls.length))
    .replace('{{summary_data_json}}', JSON.stringify(summaryData))
    .replace('{{has_shareable_moment}}', shareableMoment ? 'true' : '')
    .replace('{{shareable_moment_description}}', shareableMoment?.transcriptText?.slice(0, 100) || '');
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  
  return content.text;
}

function generateNoCallsScript(residentName: string): string {
  return `Hello, it's Linda. I'm sorry to say I haven't been able to chat with ${residentName} this past week — they may have been resting or busy with other activities. I'll try again soon, and you're welcome to call back in a few days for an update. Take care.`;
}
```

---

### Retell Family Agent System Prompt

Create a separate Retell agent for family check-in calls with this system prompt:

```
# IDENTITY

You are Linda, a warm AI companion who calls care home residents for friendly conversation. Right now, you're speaking with a family member who wants to know how their loved one is doing.

# CONTEXT

Family member: {{family_member_name}}
Relationship: {{relationship}} of {{resident_name}}
Calls with {{resident_name}} this period: {{calls_covered}}

# YOUR TASK

Read the following update to the family member, then answer any questions they might have.

## The Update

{{summary_text}}

# CONVERSATION GUIDELINES

AFTER READING THE UPDATE:
- Ask if they have any questions
- If they ask for specific quotes or exact words, politely explain you keep conversations private but can share general themes
- If they ask about health concerns, suggest they speak with the care home staff
- If they want to leave a message for the resident, offer to mention something in your next call

{{#if has_shareable_moment}}
SHAREABLE MOMENT:
There's a lovely story {{resident_name}} shared that you can offer to play:
"{{shareable_moment_description}}"

Say something like: "Your {{relationship == 'daughter' ? 'mum' : relationship == 'son' ? 'mum' : 'loved one'}} shared a lovely story recently about [topic]. Would you like to hear a clip of them telling it?"

If they say yes, play the audio clip.
{{/if}}

# WHAT YOU CAN SHARE
- General mood and energy
- Topics discussed (family, memories, hobbies)
- Whether they seemed happy, tired, bright, quiet
- That they mentioned the family member fondly (if true)

# WHAT YOU CANNOT SHARE
- Direct quotes from conversations
- Anything negative the resident said about family
- Private health information
- Details that would feel like surveillance

# TONE
- Warm, like a kind neighbour
- Reassuring but honest
- Never clinical or report-like

# CLOSING
End warmly:
"It's been lovely speaking with you. I'll keep looking after {{resident_name}}. Take care, and feel free to call anytime."
```

---

### Webhook Handler for Family Calls

```typescript
// src/routes/webhooks.ts (add to existing)

// Handle Retell webhooks for family check-in calls
router.post('/retell/family', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-retell-signature'];
  if (!verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, data } = req.body;
  const checkInId = data.metadata?.checkInId;
  
  if (!checkInId) {
    return res.status(200).json({ received: true });
  }
  
  switch (event) {
    case 'call_ended':
      await prisma.familyCheckIn.update({
        where: { id: checkInId },
        data: {
          status: 'completed',
          endedAt: new Date(),
          durationSeconds: Math.floor(data.duration_ms / 1000)
        }
      });
      break;
      
    case 'call_analyzed':
      // Optional: Store any analysis from the family call
      break;
  }
  
  return res.status(200).json({ received: true });
});
```

---

### Phone Number Routing

You'll need to configure Twilio/Retell to route inbound calls correctly:

**Option A: Single number, IVR routing**

One phone number. When someone calls:
- "Press 1 if you're a family member calling for an update"
- "Press 2 if you're calling about something else"

Family calls route to `/api/family-check-in/inbound`

**Option B: Separate number for family**

Dedicated "Family Line" number that routes directly to the family check-in flow. Simpler, cleaner.

**Recommendation:** Option B for MVP. Easier to explain: "Call this number anytime to hear how Mum's doing."

---

### Environment Variables (Additional)

```env
# Retell Family Agent
RETELL_FAMILY_AGENT_ID="agent_family_xxxxxxxxxxxx"
RETELL_FAMILY_PHONE_NUMBER="+44xxxxxxxxxx"
```

---

### API Response Examples

**Successful inbound call:**
```json
{
  "action": "accept",
  "agent_id": "agent_family_xxx",
  "retell_llm_dynamic_variables": {
    "family_member_name": "Sarah",
    "resident_name": "Margaret",
    "relationship": "daughter",
    "summary_text": "Hello Sarah. It's lovely to hear from you...",
    "calls_covered": "3",
    "period_description": "the past week",
    "has_shareable_moment": "true",
    "shareable_moment_description": "A lovely story about meeting Arthur at the dance hall"
  }
}
```

**Unregistered caller:**
```json
{
  "action": "reject",
  "message": "unregistered_caller",
  "spoken_response": "I'm sorry, I don't recognise this number. Please contact the care home to register for family updates."
}
```

**No consent:**
```json
{
  "action": "reject", 
  "message": "no_consent",
  "spoken_response": "I'm sorry, Margaret hasn't enabled family updates at this time. Please speak with the care home staff if you'd like to arrange this."
}
```

---

### Implementation Order

1. Add database schema (FamilyMember, FamilyCheckIn, Resident consent fields)
2. Create family member CRUD endpoints
3. Build phone number verification flow
4. Implement summary generation service with Claude
5. Create Retell family agent with system prompt
6. Build inbound call webhook handler
7. Configure Twilio routing for family line
8. Add consent management to resident endpoints
9. Test end-to-end flow

---

### Testing Scenarios

1. **Happy path:** Registered, verified family member calls. Resident has consent enabled. 3 calls in past week. Summary generates and plays correctly.

2. **No recent calls:** Family calls but resident hasn't had any calls this week. Graceful "no updates" message plays.

3. **Unregistered number:** Unknown caller. Polite rejection with instructions.

4. **No consent:** Family member is registered but resident hasn't consented. Polite rejection.

5. **Shareable moment:** Recent starred segment exists. Linda offers to play it.

6. **Sensitive period:** Resident had a tough week (low sentiment). Summary is honest but gentle.

---

This gives the family connection without compromising the resident's trust. Linda becomes the bridge.