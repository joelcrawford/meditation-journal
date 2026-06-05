export type Session = {
  id: number;
  date: string;
  start_time?: number;
  duration_seconds?: number;
  meditation_object_id?: number;
  before_mind?: string;
  before_observations?: string;
  during_distractions?: string;
  during_strongest?: string;
  during_patterns?: string;
  body_sensations?: string;
  body_observations?: string;
  emotional_tone?: string;
  emotional_observations?: string;
  moments_of_awareness?: string;
  lost_in_thought?: string;
  stage: 'before' | 'complete';
  created_at: number;
  updated_at: number;
};

export type NewBeforeData = {
  meditation_object_id?: number;
  before_mind?: string;
  before_observations?: string;
};

export type AfterSessionData = {
  duration_seconds: number;
  during_distractions?: string;
  during_strongest?: string;
  during_patterns?: string;
  body_sensations?: string;
  body_observations?: string;
  emotional_tone?: string;
  emotional_observations?: string;
  moments_of_awareness?: string;
  lost_in_thought?: string;
};

export type Checkin = {
  id: number;
  timestamp: number;
  date: string;
  type: 'morning' | 'afternoon' | 'evening';
  posture?: string;
  feelings?: string;
  emotional_tone?: string;
  thoughts?: string;
  donkey_tiger?: string;
  dt_score?: number | null;
  created_at: number;
};

export type NewCheckinData = Omit<Checkin, 'id'>;

export type MeditationObject = {
  id: number;
  name: string;
  description?: string;
  notes?: string;
  start_date: number;
  ended_date?: number;
  is_active: 0 | 1;
  created_at: number;
};

export type NewObjectData = {
  name: string;
  description?: string;
  notes?: string;
};

// ─── Stats types ──────────────────────────────────────────────────────────────

export type BeforeMindPoint = {
  date: string;
  createdAt: number;
  valenceGroup: 'settled' | 'unsettled' | 'mixed';
};

export type ChipFrequency = {
  label: string;
  count: number;
};

export type ToggleLean = {
  name: string;
  lean: number; // 0–1, 0.5 = neutral, >0.5 = tiger
};

export type DayArc = {
  date: string;
  morning: number | null;
  afternoon: number | null;
  evening: number | null;
  hasSit: boolean;
};

export type ToggleMapPoint = {
  name: string;
  lean: number;  // 0–1, 0.5 = neutral
  freq: number;  // 0–1, fraction of check-ins where toggle was scored
  consistency: number; // 0–1, 1 = always goes same way
};

export type SummaryStats = {
  totalSits: number;
  currentStreak: number;
  longestStreak: number;
  totalSeconds: number;
  sittingSince: string | null;
};
