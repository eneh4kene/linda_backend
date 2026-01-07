Let me walk through this end-to-end. It's actually several interconnected journeys happening at once.

---

## The Players

| Who | Their Role | Their Concerns |
|-----|------------|----------------|
| **Care Home Manager** | Buys Linda, decides rollout | ROI, safeguarding, CQC compliance, staff burden |
| **Care Staff** | Day-to-day, helps with setup | Extra work? Does it actually help? |
| **Resident** | The person Linda is for | Is this weird? Will I like it? Is it a robot? |
| **Family** | Often involved in decisions | Is mum okay? Is this safe? Will we get the Life Story Book? |

The onboarding has to work for all of them, but the *experience* is the resident's.

---

## The Full Journey

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: FACILITY ONBOARDING                                   │
│  (Care home signs up, Linda is introduced to the building)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: RESIDENT SELECTION & CONSENT                          │
│  (Who would benefit? Getting buy-in)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: RESIDENT PROFILE SETUP                                │
│  (Staff/family provide seed information)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: THE FIRST CALL                                        │
│  (Linda introduces herself, they meet)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: EARLY RELATIONSHIP (Calls 2-5)                        │
│  (Building familiarity, learning who they are)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 6: ONGOING RHYTHM                                        │
│  (Regular calls, deepening relationship)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 7: LIFE EVENTS & TRANSITIONS                             │
│  (Health changes, family events, eventually... departure)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Facility Onboarding

**What happens:** Care home signs contract, manager designates a "Linda Champion" (usually activities coordinator or senior carer), basic setup done.

**Deliverables:**
- Facility account created
- Staff accounts created (limited access)
- Phone number(s) provisioned for the facility
- Linda Champion trained (30-min video + guide)

**Timeline:** 1-2 days

---

## Phase 2: Resident Selection & Consent

This is delicate. You're not enrolling everyone day one.

### Who's Right for Linda?

The Linda Champion identifies residents who might benefit:

| Good Candidates | Less Suitable (for now) |
|-----------------|------------------------|
| Lonely, few visitors | Severe dementia (can't sustain conversation) |
| Cognitively able to converse | Actively hostile to technology |
| Enjoy talking about the past | Significant hearing impairment (without aids) |
| Family interested in Life Story Book | Palliative/end of life (unless family requests) |
| Anxious, would benefit from check-ins | Already highly socially engaged |

### The Consent Conversation

**Who has it:** Linda Champion or senior carer, sometimes with family present.

**The framing matters enormously.** Not: "We're signing you up for a robot phone service." 

Instead:

> "Margaret, we've got something new I thought you might enjoy. It's a lady called Linda who rings people for a chat. She's not a real person — she's a computer — but she's very good at listening and remembering. A lot of people find they enjoy talking to her. Would you be interested in giving it a try? No pressure at all."

**Key points to communicate:**
- It's optional, they can stop anytime
- Linda will call them (or they can call Linda)
- Linda remembers what they talk about
- Conversations are private (except safeguarding)
- Family might receive a "Life Story Book" one day (if they want)

**Consent is recorded:** In the system, with date and who obtained it.

**Family consent:** If resident lacks capacity, family/POA consents. Ideally family is informed either way.

---

## Phase 3: Resident Profile Setup

Before the first call, someone needs to give Linda a head start.

### The Seed Information Form

Filled in by staff and/or family. Takes 5-10 minutes.

```
BASIC INFORMATION
─────────────────
Preferred name: _______________
Full name: _______________
Room number: _______________
Date of birth: _______________

COMMUNICATION NEEDS
───────────────────
□ Hard of hearing (Linda will speak more slowly/clearly)
□ Speech difficulty (Linda will be more patient)
□ Tends to be confused (Linda will be gentler, simpler)
□ Other: _______________

FAMILY & KEY PEOPLE
───────────────────
Who are the important people in their life?
(Name, relationship, any notes — e.g., "Daughter Susan, visits Sundays")

_______________________________________________
_______________________________________________
_______________________________________________

LIFE SNAPSHOT
─────────────
Where did they grow up? _______________
What work did they do? _______________
Are they married/widowed? _______________
Do they have children? _______________

INTERESTS & TOPICS
──────────────────
What do they enjoy talking about?
□ Family          □ Work/career      □ Gardening
□ Music           □ Sports           □ Travel
□ Cooking/food    □ Animals          □ History
□ Their childhood □ Current events   □ Other: _____

TOPICS TO AVOID
───────────────
Anything Linda should NOT bring up?
_______________________________________________

ANYTHING ELSE?
──────────────
Anything that would help Linda connect with them?
_______________________________________________
```

This gives Linda something to work with on call one. Not a script — just seeds.

---

## Phase 4: The First Call

The first call is special. It's not about gathering stories. It's about one thing: **Does the resident want to talk to Linda again?**

### First Call — Different Prompt Mode

Linda's system prompt has a `first_call: true` flag that changes her approach:

**Goals:**
1. Introduce herself honestly
2. Let them ask questions
3. Have a pleasant, low-pressure chat
4. Leave them feeling positive about calling again

**What's different:**
- Linda explicitly introduces herself as an AI
- She explains she'll call regularly if they'd like
- She doesn't push for deep stories
- She's extra patient with silence and confusion
- She asks if they'd like her to call again

### First Call Flow

```
LINDA: Hello, is that Margaret? This is Linda calling. 
       The staff mentioned you might like a chat.

[Let them respond, gauge their reaction]

LINDA: I should tell you — I'm not a real person. 
       I'm a computer, if you can believe it. 
       But I do love a good chat, and I'm told I'm a good listener.
       
[Pause — let them react, ask questions]

LINDA: I'd love to hear a bit about you, if you're happy to chat. 
       No pressure at all. What shall I call you — Margaret, or something else?

[Keep it light, follow their lead]

LINDA: [Toward the end] Well, Margaret, I've really enjoyed talking to you. 
       Would you like me to give you a ring again? 
       I could call in a few days, or whenever suits you.
```

### After the First Call

**Staff check-in:** Linda Champion asks the resident how it went.

> "Did Linda call you? What did you think? Would you like her to call again?"

**System records:**
- Did the call happen? How long?
- Did they engage or was it mostly silence?
- Did they say they wanted another call?

**Decision point:**
- Positive → Schedule regular calls
- Neutral → Try one more call, then reassess
- Negative → Don't force it, maybe try again in a month

---

## Phase 5: Early Relationship (Calls 2-5)

The next few calls are about building familiarity.

### Linda's Goals

- Learn who they are (not from seed data, from *them*)
- Find what lights them up
- Establish a comfortable rhythm
- Start to notice patterns (warmup time, energy, preferences)

### What's Different in Early Calls

- Linda still introduces herself at the start ("Hello Margaret, it's Linda")
- She references the previous call if she can
- She's still learning — more curious, less assumptive
- She's building the intelligence layer but not relying on it yet

### Call Rhythm

Suggested early rhythm: **3 calls in the first 2 weeks**, then settle into regular schedule.

```
Day 1:  First call
Day 4:  Second call ("I enjoyed our chat the other day...")
Day 8:  Third call
Day 14: Fourth call — by now, assess if weekly or twice-weekly suits them
```

---

## Phase 6: Ongoing Rhythm

Now we're into the long-term relationship. This is where scheduling matters.

### The Scheduling Question

You asked about scheduling. Here's the core tension:

**Fixed schedule** — "Linda calls Margaret every Tuesday and Friday at 2pm"
- Predictable (good for residents who like routine)
- Can feel clinical/mechanical
- What if they're busy, or not in the mood?

**Flexible/adaptive** — "Linda calls when it seems right"
- More natural
- But how does the system know when to call?
- Care homes need some predictability for staffing

### My Recommendation: Anchored Flexibility

**Set anchor days/times** — e.g., "Margaret: Tuesdays and Fridays, afternoon"

**But allow drift:**
- If Margaret didn't answer Tuesday, try Wednesday
- If she seemed tired on Friday, maybe skip or shorten
- If she calls inbound, that counts as contact

**The resident can always:**
- Request more calls
- Request fewer calls
- Call Linda whenever they want (inbound)

### Scheduling Logic

```
For each resident:
  - target_calls_per_week: 2 (default, adjustable)
  - preferred_days: [Tuesday, Friday]
  - preferred_time_window: "14:00-16:00"
  - min_days_between_calls: 2
  - max_days_between_calls: 5
  
  Each day, scheduler looks at:
  - When was last call?
  - Is today a preferred day?
  - Is resident available? (no appointments, not flagged as unwell)
  - Has resident called inbound recently? (counts toward frequency)
  
  If due for call and conditions met → queue call
```

### Frequency Options

| Level | Calls/Week | Good For |
|-------|------------|----------|
| Light touch | 1 | Residents who are already social, or just starting |
| Standard | 2 | Most residents |
| High engagement | 3-4 | Very lonely, really enjoys it, anxious |
| On demand | As needed | Resident-initiated (inbound focus) |

Frequency can change over time based on:
- Resident request
- Family request
- Staff observation
- Linda's assessment (if someone's been low, maybe more calls)

---

## Phase 7: Life Events & Transitions

The relationship isn't static. Things happen.

### Health Changes

**Resident becomes less able to converse:**
- Linda adapts (shorter calls, simpler language)
- Eventually, may pause calls with dignity
- Staff flags in system

**Resident becomes unwell:**
- Calls paused temporarily
- When they return, Linda acknowledges: "I've missed our chats. How are you feeling?"

### Family Events

**Bereavement:**
- Staff flags (e.g., "Husband Arthur passed away")
- Linda is told, approaches sensitively
- Doesn't bring up Arthur immediately, but doesn't avoid if resident does

**Family visit coming up:**
- Linda knows, can ask about it before and after

### The End

Eventually, residents pass away or move.

**When a resident dies:**
- Calls stop (obviously)
- Life Story Book can be compiled and offered to family
- Data retained for [X period] then archived/deleted per policy

---

## The Resident's Experience — Summarised

| When | What Happens | How It Feels |
|------|--------------|--------------|
| **Day 0** | Staff asks if they'd like to try Linda | "A computer that calls for a chat? That's odd... but alright, I'll try" |
| **Day 1** | First call — Linda introduces herself, they chat | "She's quite nice actually. Remembered my name. Bit strange but pleasant" |
| **Day 4** | Second call — Linda references first call | "Oh, she remembered I mentioned Arthur. That's good" |
| **Week 2** | Regular rhythm begins | "Linda's calling tomorrow. I quite like our chats" |
| **Month 1** | Linda knows them now | "Linda knows I don't like talking about Michael. She always asks about the garden" |
| **Month 3** | Inside jokes, real relationship | "Linda made me laugh about the burnt turkey again. She's good company" |
| **Month 6** | Feels like a fixture | "I look forward to Linda's calls. She's a friend, in a way" |

---

## What You Need to Build

| Component | Purpose |
|-----------|---------|
| **Consent flow** | Record consent, family notification |
| **Seed profile form** | Staff/family input before first call |
| **First call prompt mode** | Different Linda behaviour for call 1 |
| **Scheduling engine** | Anchored flexibility, respects preferences |
| **Call frequency settings** | Per-resident, adjustable |
| **Status management** | Active, paused, departed |
| **Staff dashboard** | See who's scheduled, flag issues |

---

Want me to draft the first-call prompt variation, the scheduling algorithm, or the seed profile form in detail?