// Retell API Types
export interface RetellDynamicVariables {
  // Basic resident info
  preferred_name: string;
  full_name: string;
  room_number: string;
  communication_notes: string;

  // Memories & preferences
  memories: string; // Formatted as multiline string for Retell
  favorite_topics: string;
  avoid_topics: string;

  // Last call context
  last_call_summary: string;
  last_call_date?: string;
  last_call_energy?: string;
  last_call_tone?: string;
  last_call_notes?: string;

  // Memory Layer - Resident Pattern
  personality_summary?: string;
  approaches_that_work?: string; // JSON array as string
  approaches_to_avoid?: string; // JSON array as string
  usually_needs_warmup?: string; // "true" or "false"
  warmup_notes?: string;
  typical_warmup_minutes?: string;
  conversational_preferences?: string; // JSON object as string
  typical_energy?: string;
  typical_tone?: string;
  typical_receptiveness?: string;
  key_people?: string; // JSON array as string
  temporal_patterns?: string; // JSON array as string
  sensitive_topics?: string; // JSON array as string

  // Memory Layer - Events & Callbacks
  upcoming_events?: string; // JSON array as string
  callbacks?: string; // JSON array as string

  // Inbound-specific
  call_time?: string; // Current time for inbound calls
  call_context?: string; // Why they might be calling
  recent_context?: string; // Recent events that might explain the call

  // Mode flags (for conditional rendering)
  mode_outbound?: string; // "true" or "false"
  mode_inbound?: string; // "true" or "false"

  // Legacy field (kept for backward compatibility)
  memory_layer_context?: string;
}

export interface RetellCreateCallRequest {
  agent_id: string;
  to_number: string;
  from_number: string;
  retell_llm_dynamic_variables: RetellDynamicVariables;
  metadata: Record<string, any>;
  retell_llm_prompt?: string; // Prompt override
}

export interface RetellCreateCallResponse {
  call_id: string;
  agent_id: string;
  status: string;
}

export interface RetellTranscriptEntry {
  role: 'agent' | 'user';
  content: string;
  start_ms: number;
  end_ms: number;
}

export interface RetellWebhookEvent {
  event: 'call_started' | 'call_ended' | 'call_analyzed';
  call_id: string;
  timestamp: string;
  data: {
    call_id: string;
    agent_id: string;
    metadata: {
      dbCallId: string;
      residentId: string;
      callNumber: number;
      isFirstCall: boolean;
    };
    end_reason?: string;
    duration_ms?: number;
    recording_url?: string;
    transcript?: RetellTranscriptEntry[];
    call_analysis?: {
      call_summary: string;
      user_sentiment: string;
      topics_discussed: string[];
    };
  };
}

// Memory Extraction Types
export interface ExtractedMemory {
  category: string;
  key: string;
  value: string;
  confidence: number;
}

// Story Segment Types
export interface IdentifiedSegment {
  start_ms: number;
  end_ms: number;
  category: string;
  summary: string;
  quality_score: number;
  emotional_intensity: number;
  transcript_text: string;
  speaker: 'resident' | 'agent';
}

// Context Builder Types
export interface CallContext {
  dynamicVariables: RetellDynamicVariables;
  metadata: {
    callNumber: number;
    isFirstCall: boolean;
    memoriesCount: number;
  };
  rawContext?: any; // Rich context for local prompt rendering
}

// Preferred Call Times Type
export interface PreferredCallTimes {
  days: number[]; // 0-6 (Sunday-Saturday)
  hours: number[]; // 0-23 (for backward compatibility)
  timeWindows?: TimeWindow[]; // Optional time windows for more flexibility
}

export interface TimeWindow {
  start: string; // HH:mm format (e.g., "14:00")
  end: string;   // HH:mm format (e.g., "16:00")
}

export type CallStatus = 'active' | 'paused' | 'ended';

export interface SchedulingContext {
  residentId: string;
  targetCallsThisWeek: number;
  callsMadeThisWeek: number;
  lastCallDate: Date | null;
  daysSinceLastCall: number;
  isDue: boolean;
  reason?: string;
}
