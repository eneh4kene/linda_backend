## Linda Dashboard — Feature Set

---

### Users

| Role | Access |
|------|--------|
| **Care Home Staff** | Day-to-day: residents, calls, alerts |
| **Care Home Manager** | Above + reporting, settings, billing |
| **Linda Admin (you)** | Multi-facility oversight, onboarding new homes |

---

### Core Features

**1. Resident Management**
- Add/edit residents
- Manage consent (calls, Life Story Book, family check-ins)
- Set preferences (call times, topics to avoid, communication notes)
- View profile with memories, call history, sentiment trend
- Pause/resume calls (e.g., hospital stay, family visiting)
- Archive/remove residents

**2. Family Management**
- Add family members per resident
- Set relationship (daughter, son, spouse, etc.)
- Phone verification flow
- Manage permissions (can receive updates, can receive alerts)
- View family check-in history

**3. Call Centre**
- Today's scheduled calls
- Live calls in progress (real-time status)
- Recent calls with outcomes (completed, no answer, failed)
- Call detail view: recording playback, transcript, summary, sentiment
- Manual trigger: "Call Margaret now"
- Reschedule/skip calls

**4. Alerts & Concerns**
- Flagged calls queue (resident mentioned distress, pain, loneliness, safety concern)
- Staff acknowledgment flow ("Reviewed", "Actioned", "Escalated")
- Wellness trends (sentiment dropping over time)
- Missed call patterns (resident not answering)

**5. Life Story Book**
- Book status per resident (collecting → ready → in production → delivered)
- Segment curation queue (review, star, exclude, categorize)
- Chapter builder (drag segments into chapters, reorder, add titles)
- Book preview
- Family contact details for delivery
- Order/payment status (if applicable)

**6. Reporting**
- Call volume (daily, weekly, monthly)
- Average call duration
- Sentiment distribution across residents
- Engagement rate (% of scheduled calls completed)
- Family check-in frequency
- Life Story Book pipeline (how many in each status)
- Exportable reports (CSV, PDF)

**7. Settings**
- Facility details (name, timezone, contact)
- Default call schedule (which days, which hours)
- Staff accounts and permissions
- Notification preferences (email alerts for concerns)
- Billing/subscription status

---

### Views by Role

**Staff Daily View**
```
┌─────────────────────────────────────────────────────────────┐
│  LINDA DASHBOARD                      Sunny Meadows Care    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🚨 NEEDS ATTENTION (2)                                     │
│  ├── Margaret Thompson - mentioned feeling very low         │
│  └── Bernard Walsh - no answer 3 days in a row              │
│                                                             │
│  📞 TODAY'S CALLS                                           │
│  ├── 10:00  Dorothy Bancroft    ✅ Completed (8 min)        │
│  ├── 10:30  Arthur Price        ✅ Completed (6 min)        │
│  ├── 11:00  Eileen Marsden      🔄 In Progress...           │
│  ├── 14:00  Margaret Thompson   ⏳ Scheduled                 │
│  └── 14:30  Bernie Walsh        ⏳ Scheduled                 │
│                                                             │
│  📊 THIS WEEK                                               │
│  Calls: 34 completed, 3 missed │ Avg duration: 7.2 min     │
│  Sentiment: 72% positive       │ Concerns flagged: 2        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Resident Profile View**
```
┌─────────────────────────────────────────────────────────────┐
│  MARGARET THOMPSON                              Room 14     │
│  ────────────────────────────────────────────────────────── │
│  Status: Active    │ Calls: 12 completed │ Since: Oct 2024 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONSENT                                                    │
│  ☑ Phone calls    ☑ Life Story Book    ☑ Family check-ins  │
│                                                             │
│  PREFERENCES                                                │
│  Call times: Tue/Thu/Sat, 10am-12pm                        │
│  Topics to enjoy: Family, nursing career, Arthur            │
│  Topics to avoid: Son's divorce                             │
│  Notes: Hard of hearing - speak clearly                     │
│                                                             │
│  FAMILY                                                     │
│  Sarah Thompson (daughter) - 07700 900456 ✓ Verified       │
│  James Thompson (son) - 07700 900789 ✓ Verified            │
│                                                             │
│  MEMORIES (28)                        [View All]            │
│  • Married to Arthur for 52 years (d. 2022)                │
│  • Worked as nurse at Hull Royal, 40 years                 │
│  • Three children: Sarah, James, Michael                    │
│  • Loves roses - Arthur planted them                        │
│                                                             │
│  RECENT CALLS                         [View All]            │
│  Dec 20 - 9 min - 😊 Positive - Legacy message recorded    │
│  Dec 17 - 7 min - 😊 Positive - Talked about Christmas     │
│  Dec 14 - 8 min - 😐 Neutral - Feeling tired               │
│                                                             │
│  LIFE STORY BOOK                                           │
│  Status: Ready for Review                                   │
│  Stories: 14 │ Chapters: 5 │ Duration: 32 min              │
│  [Preview Book]  [Edit Chapters]  [Contact Family]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Alert Detail View**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ CONCERN FLAGGED                                         │
│  ────────────────────────────────────────────────────────── │
│  Resident: Margaret Thompson                                │
│  Call: December 18, 2024 at 10:32am                        │
│  Flagged: "Mentioned wanting to die"                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTEXT                                                    │
│  "I miss Arthur so much. Sometimes I just want to go       │
│  to sleep and not wake up. Be with him again."             │
│                                                             │
│  [▶ Play Audio Clip]                                        │
│                                                             │
│  Linda's response: "That sounds really difficult,          │
│  Margaret. I think it would be good for me to let the      │
│  staff know, so they can check in on you."                 │
│                                                             │
│  ────────────────────────────────────────────────────────── │
│  ACTION REQUIRED                                            │
│                                                             │
│  [ ] Reviewed - No action needed                            │
│  [ ] Actioned - Spoke with resident                         │
│  [ ] Escalated - Referred to clinical team                  │
│                                                             │
│  Notes: _____________________________________________       │
│                                                             │
│  [Mark as Resolved]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Life Story Book Curation View

```
┌─────────────────────────────────────────────────────────────┐
│  LIFE STORY BOOK: Margaret Thompson                         │
│  Status: Ready for Review                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CHAPTERS                          SEGMENT QUEUE (6 new)   │
│  ─────────────────────             ──────────────────────── │
│  1. Early Years (3)                │ ⭐ "The night I met   │
│  2. Love & Marriage (4)            │    Arthur" - 4:02     │
│  3. Family (3)                     │    [Add to Chapter]   │
│  4. Working Life (2)               │                       │
│  5. Reflections (2)                │ ○  "Christmas at      │
│                                    │    Grandma's" - 2:15  │
│  [+ Add Chapter]                   │    [Add] [Exclude]    │
│                                    │                       │
│                                    │ ○  "My first car"     │
│  ──────────────────────────────    │    1:34               │
│  CHAPTER 2: Love & Marriage        │    [Add] [Exclude]    │
│                                    │                       │
│  ☰ The night I met Arthur (4:02)   │                       │
│  ☰ Our wedding day (3:45)          │                       │
│  ☰ First home together (2:18)      │                       │
│  ☰ Fifty-two years (3:20)          │                       │
│                                    │                       │
│  [Preview Chapter] [Reorder]       │                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  BOOK SUMMARY                                               │
│  14 stories │ 5 chapters │ 32 min total                    │
│                                                             │
│  [Preview Full Book]    [Notify Family]    [Mark Complete]  │
└─────────────────────────────────────────────────────────────┘
```

---

### Manager Reporting View

```
┌─────────────────────────────────────────────────────────────┐
│  MONTHLY REPORT                           December 2024     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RESIDENTS                                                  │
│  Active: 24    │ Paused: 2    │ New this month: 3          │
│                                                             │
│  CALLS                                                      │
│  Total: 312    │ Completed: 289 (93%)  │ No answer: 23     │
│  Avg duration: 7.4 min  │  Total talk time: 35.6 hours     │
│                                                             │
│  SENTIMENT TREND                                            │
│  😊 Positive: 68%   😐 Neutral: 24%   😔 Low: 8%           │
│  Trend: ↑ 4% from November                                 │
│                                                             │
│  CONCERNS                                                   │
│  Flagged: 7    │ Resolved: 7    │ Escalated: 1             │
│                                                             │
│  FAMILY ENGAGEMENT                                          │
│  Check-in calls: 34   │ Unique families: 18                │
│                                                             │
│  LIFE STORY BOOKS                                           │
│  Collecting: 12  │ Ready: 6  │ Delivered: 4                │
│  Revenue this month: £396                                   │
│                                                             │
│  [Export PDF]  [Export CSV]                                 │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Priority

**Phase 1: Core Operations**
1. Resident CRUD + consent management
2. Family member management
3. Call list (today, recent, scheduled)
4. Call detail view with playback
5. Basic alerts queue

**Phase 2: Life Story Book**
6. Segment review queue
7. Chapter builder
8. Book preview

**Phase 3: Reporting & Polish**
9. Manager reports
10. Sentiment trends
11. Export functionality
12. Multi-facility support
