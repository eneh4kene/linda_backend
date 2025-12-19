// Retell API Types
export interface RetellDynamicVariables {
  preferred_name: string;
  full_name: string;
  room_number: string;
  memories: Array<{ category: string; value: string }>;
  favorite_topics: string;
  avoid_topics: string;
  communication_notes: string;
  last_call_summary: string;
}

export interface RetellCreateCallRequest {
  agent_id: string;
  to_number: string;
  from_number: string;
  retell_llm_dynamic_variables: RetellDynamicVariables;
  metadata: Record<string, any>;
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
}

// Preferred Call Times Type
export interface PreferredCallTimes {
  days: number[]; // 0-6 (Sunday-Saturday)
  hours: number[]; // 0-23
}
