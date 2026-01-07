-- =============================================================================
-- LINDA MEMORY LAYER — DATABASE SCHEMA
-- =============================================================================
-- This schema enables Linda to "read the room" across calls by tracking not just
-- facts, but vibe, patterns, and what works/doesn't work with each resident.
-- =============================================================================


-- =============================================================================
-- CORE ENTITIES
-- =============================================================================

CREATE TABLE care_homes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    address TEXT,
    region VARCHAR,
    timezone VARCHAR DEFAULT 'Europe/London',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_home_id UUID REFERENCES care_homes(id),
    
    -- Identity
    preferred_name VARCHAR NOT NULL,
    full_name VARCHAR,
    room_number VARCHAR,
    date_of_birth DATE,
    
    -- Status
    status VARCHAR DEFAULT 'active', -- 'active' | 'paused' | 'departed'
    
    -- Communication needs
    communication_notes TEXT, -- e.g., "Hard of hearing, speak slowly"
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- CALLS
-- =============================================================================

CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    
    -- Call metadata
    call_type VARCHAR NOT NULL, -- 'inbound' | 'outbound'
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Retell integration
    retell_call_id VARCHAR UNIQUE,
    audio_url VARCHAR,
    transcript_raw JSONB,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calls_resident ON calls(resident_id);
CREATE INDEX idx_calls_started ON calls(started_at);


-- =============================================================================
-- CALL STATE — Per-Call Vibe Tracking
-- =============================================================================
-- Captured after each call by an LLM analyzing the transcript.
-- This is the raw signal; patterns are derived from aggregating these.

CREATE TABLE call_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) UNIQUE,
    resident_id UUID REFERENCES residents(id),
    recorded_at TIMESTAMP DEFAULT NOW(),
    
    -- Energy and mood (as observed during the call)
    energy_level VARCHAR, -- 'high' | 'medium' | 'low'
    emotional_tone VARCHAR, -- 'bright' | 'neutral' | 'melancholy' | 'anxious' | 'irritable'
    receptiveness VARCHAR, -- 'very_open' | 'open' | 'guarded' | 'tired' | 'resistant'
    
    -- Warmup pattern (did they open up over time?)
    warmup_observed BOOLEAN, -- true if they started guarded but opened up
    warmup_duration_minutes INTEGER, -- roughly how long until they warmed up
    
    -- What worked this call
    responded_well_to JSONB DEFAULT '[]', 
    -- e.g., ['playfulness', 'deep_questions', 'silence', 'stories_about_others', 
    --        'sensory_questions', 'historical_weaving', 'game_offer', 'gentle_teasing']
    
    -- What didn't land this call
    didnt_land JSONB DEFAULT '[]',
    -- e.g., ['game_offer', 'probing_question', 'change_of_topic']
    
    -- Topics that sparked engagement
    topics_engaged JSONB DEFAULT '[]',
    -- e.g., ['Arthur', 'the factory', 'wedding', 'Susan']
    
    -- Topics that fell flat or were deflected
    topics_avoided JSONB DEFAULT '[]',
    
    -- Significant moments
    emotional_peaks JSONB DEFAULT '[]',
    -- e.g., [{'type': 'joy', 'context': 'talking about grandchildren'}, 
    --        {'type': 'sadness', 'context': 'mentioned Arthur'}]
    
    -- Free-form observations
    notes TEXT,
    
    -- Call-specific context (why might they have been this way?)
    contextual_factors JSONB DEFAULT '[]',
    -- e.g., ['Susan cancelled visit', 'mentioned poor sleep', 'day after doctor appointment']
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_call_states_resident ON call_states(resident_id);
CREATE INDEX idx_call_states_recorded ON call_states(recorded_at);


-- =============================================================================
-- RESIDENT PATTERNS — Aggregated Insights Over Time
-- =============================================================================
-- Derived from call_states. Updated periodically (after each call or nightly batch).
-- This is what gets injected into the prompt.

CREATE TABLE resident_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id) UNIQUE,
    
    -- Baseline personality
    typical_energy VARCHAR, -- 'high' | 'medium' | 'low'
    typical_tone VARCHAR, -- 'bright' | 'neutral' | 'melancholy'
    typical_receptiveness VARCHAR, -- 'very_open' | 'open' | 'guarded'
    
    -- Warmup pattern
    usually_needs_warmup BOOLEAN DEFAULT FALSE,
    typical_warmup_minutes INTEGER,
    warmup_notes TEXT, -- e.g., "Usually guarded for first 5-10 mins, then opens up"
    
    -- What generally works
    approaches_that_work JSONB DEFAULT '[]',
    -- e.g., ['playfulness', 'sensory_questions', 'stories_about_others']
    
    -- What generally doesn't work
    approaches_to_avoid JSONB DEFAULT '[]',
    -- e.g., ['game_offers', 'direct_questions_about_health']
    
    -- Topics they love
    favorite_topics JSONB DEFAULT '[]',
    -- e.g., ['Arthur', 'the seaside', 'her garden', 'grandchildren']
    
    -- Topics to avoid
    sensitive_topics JSONB DEFAULT '[]',
    -- e.g., ['son_estrangement', 'mother_death']
    
    -- Temporal patterns
    temporal_patterns JSONB DEFAULT '[]',
    -- e.g., [
    --   {'pattern': 'bright_after_susan_visit', 'description': 'Usually bright on Mondays after Susan visits'},
    --   {'pattern': 'low_on_anniversaries', 'description': 'Gets melancholy around Arthur''s birthday (March 15)'},
    --   {'pattern': 'better_mornings', 'description': 'More energy in morning calls than afternoon'}
    -- ]
    
    -- Relationship dynamics
    key_people JSONB DEFAULT '[]',
    -- e.g., [
    --   {'name': 'Arthur', 'relationship': 'late_husband', 'notes': 'Loves talking about him, sometimes gets tearful'},
    --   {'name': 'Susan', 'relationship': 'daughter', 'notes': 'Visits Sundays, sometimes cancels'},
    --   {'name': 'Michael', 'relationship': 'son', 'notes': 'Estranged, don''t bring up'}
    -- ]
    
    -- Conversational style preferences
    conversational_preferences JSONB DEFAULT '{}',
    -- e.g., {
    --   'pace': 'slow',
    --   'depth': 'loves_going_deep',
    --   'humour': 'enjoys_gentle_teasing',
    --   'reciprocity': 'appreciates_when_linda_shares',
    --   'games': 'not_interested',
    --   'quizzes': 'loves_history_quizzes'
    -- }
    
    -- Free-form summary for prompt injection
    personality_summary TEXT,
    -- A few sentences summarizing who they are conversationally
    -- e.g., "Margaret is warm and chatty once she warms up (usually 5-10 mins). 
    --        She loves talking about Arthur and lights up with sensory questions about the past.
    --        She doesn't enjoy games but loves a good story. She appreciates when Linda shares 
    --        observations about other people she's spoken with."
    
    -- Last updated
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Confidence (how many calls is this based on?)
    calls_analyzed INTEGER DEFAULT 0
);

CREATE INDEX idx_resident_patterns_resident ON resident_patterns(resident_id);


-- =============================================================================
-- MEMORIES — Facts, Stories, and Moments
-- =============================================================================
-- Everything Linda "knows" about a resident from past conversations.

CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    source_call_id UUID REFERENCES calls(id),
    
    -- Type of memory
    memory_type VARCHAR NOT NULL,
    -- 'fact' - A piece of factual information (e.g., "Worked at the shipyard")
    -- 'preference' - Something they like/dislike (e.g., "Hates talking about politics")
    -- 'person' - Information about someone in their life (e.g., "Daughter Susan visits Sundays")
    -- 'story' - A story they've told (links to stories table)
    -- 'moment' - A notable moment in a call (e.g., "Laughed so hard she cried about the turkey story")
    -- 'joke' - An inside joke or running bit
    -- 'event' - An upcoming or past event (e.g., "Doctor appointment Tuesday")
    -- 'sentiment' - A feeling or attitude (e.g., "Worried about being a burden")
    
    -- Category for facts
    category VARCHAR,
    -- e.g., 'family', 'work', 'childhood', 'health', 'preferences', 'daily_life'
    
    -- The actual content
    content TEXT NOT NULL,
    
    -- Additional context
    context TEXT, -- When/why this came up
    
    -- For people
    person_name VARCHAR,
    person_relationship VARCHAR,
    
    -- Emotional valence
    emotional_valence VARCHAR, -- 'positive' | 'negative' | 'neutral' | 'mixed'
    
    -- How often Linda has referenced this
    times_referenced INTEGER DEFAULT 0,
    last_referenced TIMESTAMP,
    
    -- Is this still current? (events pass, situations change)
    is_current BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memories_resident ON memories(resident_id);
CREATE INDEX idx_memories_type ON memories(memory_type);


-- =============================================================================
-- STORIES — For Life Story Book
-- =============================================================================

CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    source_call_id UUID REFERENCES calls(id),
    
    -- Content
    title VARCHAR, -- AI-generated: "Meeting Arthur at the Dance"
    summary TEXT, -- 2-3 sentence summary
    full_text TEXT, -- The story in resident's voice, cleaned up
    
    -- Classification
    category VARCHAR, -- 'childhood' | 'romance' | 'career' | 'family' | 'war' | 'travel' | etc.
    subcategory VARCHAR, -- 'wedding' | 'first_job' | 'birth_of_child'
    era VARCHAR, -- '1950s' | '1960s' | 'wartime'
    
    -- Entities mentioned
    people_mentioned JSONB DEFAULT '[]', -- [{name: "Arthur", relationship: "husband"}]
    places_mentioned JSONB DEFAULT '[]', -- [{name: "Hull", type: "hometown"}]
    dates_mentioned JSONB DEFAULT '[]', -- [{year: 1958, event: "wedding"}]
    
    -- Quality signals
    completeness VARCHAR, -- 'complete' | 'partial' | 'fragment'
    emotional_significance VARCHAR, -- 'high' | 'medium' | 'low'
    sensory_richness INTEGER, -- 1-5 score
    
    -- Deduplication
    story_hash VARCHAR, -- For detecting retold stories
    canonical_story_id UUID REFERENCES stories(id), -- Points to "best" version if duplicated
    is_canonical BOOLEAN DEFAULT TRUE,
    
    -- Location in transcript
    transcript_start_index INTEGER,
    transcript_end_index INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_resident ON stories(resident_id);
CREATE INDEX idx_stories_category ON stories(category);


-- =============================================================================
-- ANTICIPATED EVENTS — Things Linda Should Know About
-- =============================================================================
-- Upcoming events that Linda should be aware of and can reference.

CREATE TABLE anticipated_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    source_call_id UUID REFERENCES calls(id), -- Where Linda learned about this
    
    -- Event details
    event_type VARCHAR NOT NULL,
    -- 'visit' - Family/friend visiting
    -- 'appointment' - Doctor, dentist, etc.
    -- 'birthday' - Theirs or someone they care about
    -- 'anniversary' - Wedding, death, etc.
    -- 'holiday' - Christmas, Easter, etc.
    -- 'other'
    
    description TEXT NOT NULL, -- "Susan visiting on Sunday"
    
    -- Timing
    event_date DATE, -- Specific date if known
    event_time TIME, -- Specific time if known
    recurring VARCHAR, -- 'weekly' | 'monthly' | 'yearly' | NULL
    recurring_details JSONB, -- e.g., {'day_of_week': 'Sunday'} for weekly
    
    -- Emotional significance
    emotional_tone VARCHAR, -- 'positive' | 'negative' | 'anxious' | 'neutral'
    
    -- Follow-up
    should_ask_about BOOLEAN DEFAULT TRUE, -- Should Linda ask how it went?
    asked_about BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR DEFAULT 'upcoming', -- 'upcoming' | 'passed' | 'cancelled'
    outcome_notes TEXT, -- What happened (filled in after follow-up)
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_anticipated_events_resident ON anticipated_events(resident_id);
CREATE INDEX idx_anticipated_events_date ON anticipated_events(event_date);


-- =============================================================================
-- INSIDE JOKES & CALLBACKS — The Relationship Texture
-- =============================================================================
-- Running jokes, callbacks, and shared references that make the relationship feel real.

CREATE TABLE callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    source_call_id UUID REFERENCES calls(id), -- Where this originated
    
    -- Type
    callback_type VARCHAR NOT NULL,
    -- 'joke' - Something funny that can be referenced
    -- 'phrase' - A phrase they use that Linda can echo
    -- 'story' - A story Linda can reference back to
    -- 'preference' - A stated preference Linda can play with
    -- 'tease' - Something Linda can gently tease them about
    
    -- Content
    content TEXT NOT NULL, -- The joke/phrase/reference itself
    context TEXT, -- How it came up originally
    
    -- How to use it
    usage_notes TEXT, -- e.g., "Reference when talking about Christmas"
    
    -- Tracking
    times_used INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    still_lands BOOLEAN DEFAULT TRUE, -- Does this still get a reaction?
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_callbacks_resident ON callbacks(resident_id);


-- =============================================================================
-- LIFE STORY BOOKS — Compiled Output
-- =============================================================================

CREATE TABLE life_story_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES residents(id),
    
    version INTEGER DEFAULT 1,
    status VARCHAR DEFAULT 'draft', -- 'draft' | 'review' | 'approved' | 'printed'
    
    -- Content
    content_json JSONB, -- Structured book content
    
    -- Output
    pdf_url VARCHAR,
    print_order_id VARCHAR,
    
    -- Review
    family_notes TEXT,
    
    compiled_at TIMESTAMP,
    approved_at TIMESTAMP,
    printed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- VIEWS FOR PROMPT INJECTION
-- =============================================================================

-- Everything Linda needs to know before a call, in one place
CREATE VIEW resident_call_context AS
SELECT 
    r.id AS resident_id,
    r.preferred_name,
    r.full_name,
    r.room_number,
    r.communication_notes,
    
    -- Patterns
    rp.typical_energy,
    rp.typical_tone,
    rp.typical_receptiveness,
    rp.usually_needs_warmup,
    rp.typical_warmup_minutes,
    rp.warmup_notes,
    rp.approaches_that_work,
    rp.approaches_to_avoid,
    rp.favorite_topics,
    rp.sensitive_topics,
    rp.temporal_patterns,
    rp.key_people,
    rp.conversational_preferences,
    rp.personality_summary,
    
    -- Recent state (last call)
    cs.energy_level AS last_call_energy,
    cs.emotional_tone AS last_call_tone,
    cs.notes AS last_call_notes,
    c.started_at AS last_call_date
    
FROM residents r
LEFT JOIN resident_patterns rp ON r.id = rp.resident_id
LEFT JOIN LATERAL (
    SELECT * FROM calls 
    WHERE resident_id = r.id 
    ORDER BY started_at DESC 
    LIMIT 1
) c ON TRUE
LEFT JOIN call_states cs ON c.id = cs.call_id;


-- Upcoming events for a resident
CREATE VIEW resident_upcoming_events AS
SELECT 
    ae.*
FROM anticipated_events ae
WHERE ae.status = 'upcoming'
  AND (ae.event_date >= CURRENT_DATE OR ae.recurring IS NOT NULL)
ORDER BY ae.event_date;


-- Recent memories for prompt injection
CREATE VIEW resident_recent_memories AS
SELECT 
    m.*
FROM memories m
WHERE m.is_current = TRUE
ORDER BY m.created_at DESC;
