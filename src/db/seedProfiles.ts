import {getDb} from './index';
import {getDateNDaysAgo} from '../utils/date';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileName = 'bill' | 'sally' | 'maryanne' | 'bartholemew';

interface SeedProfile {
  displayName: string;
  objectName: string;
  daysBack: number;
  sitRate: number;
  checkinRate: number;
  maxCheckinsPerDay: number;
  dtMean: number;
  minDuration: number;
  maxDuration: number;
  hasNotes: boolean;
}

type DTValue = 'donkey' | 'tiger' | 'neither';
type CheckinType = 'morning' | 'afternoon' | 'evening';

// ─── Profile definitions ─────────────────────────────────────────────────────

const PROFILES: Record<ProfileName, SeedProfile> = {
  bill: {
    displayName: 'Bill',
    objectName: 'Breath',
    daysBack: 7,
    sitRate: 0.45,
    checkinRate: 0.45,
    maxCheckinsPerDay: 2,
    dtMean: 0.5,
    minDuration: 600,
    maxDuration: 900,
    hasNotes: false,
  },
  sally: {
    displayName: 'Sally',
    objectName: 'Breath',
    daysBack: 14,
    sitRate: 0.5,
    checkinRate: 0.65,
    maxCheckinsPerDay: 2,
    dtMean: 0.55,
    minDuration: 900,
    maxDuration: 1200,
    hasNotes: false,
  },
  maryanne: {
    displayName: 'Maryanne',
    objectName: 'Metta',
    daysBack: 50,
    sitRate: 0.68,
    checkinRate: 0.82,
    maxCheckinsPerDay: 3,
    dtMean: 0.65,
    minDuration: 1200,
    maxDuration: 1800,
    hasNotes: true,
  },
  bartholemew: {
    displayName: 'Bartholemew',
    objectName: 'Samadhi',
    daysBack: 150,
    sitRate: 0.72,
    checkinRate: 0.88,
    maxCheckinsPerDay: 3,
    dtMean: 0.72,
    minDuration: 1500,
    maxDuration: 2700,
    hasNotes: true,
  },
};

// ─── Canned note text ─────────────────────────────────────────────────────────

const AWARENESS_NOTES = [
  'Brief clarity between thoughts.',
  'Noticed the breath without grasping.',
  'Caught a story mid-sentence and returned.',
  'Three full breaths without wandering.',
  'Body softened unexpectedly.',
  'Emotion arose and passed, seen clearly.',
  'Space opened between stimulus and response.',
  'Noticed judging, then returned without fuss.',
];

const BEFORE_OBS = [
  'Restless but willing to sit.',
  'Tired. Showed up anyway.',
  'Unusually clear this morning.',
  'Mind calm before even sitting down.',
  'Still carrying yesterday.',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function pickSomeJson(ids: number[], min: number, max: number): string | null {
  if (ids.length === 0) return null;
  const count = randInt(min, max);
  return JSON.stringify(pickN(ids, count));
}

function toEpochSec(dateStr: string, hour: number, minute: number): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(new Date(y, m - 1, d, hour, minute, 0, 0).getTime() / 1000);
}

function generateDT(dtMean: number): {json: string; score: number | null} {
  const vals: DTValue[] = [];
  let tiger = 0;
  let donkey = 0;
  for (let i = 0; i < 9; i++) {
    const r = Math.random();
    if (r < 0.35) {
      vals.push('neither');
    } else if (r < 0.35 + 0.65 * dtMean) {
      vals.push('tiger');
      tiger++;
    } else {
      vals.push('donkey');
      donkey++;
    }
  }
  const scored = tiger + donkey;
  return {
    json: JSON.stringify(vals),
    score: scored > 0 ? tiger / scored : null,
  };
}

// ─── Main seed function ───────────────────────────────────────────────────────

export function seedProfile(profileName: ProfileName): void {
  const db = getDb();
  const profile = PROFILES[profileName];

  // ── 1. Load chip IDs grouped by list ────────────────────────────────────────
  const chipRows = db.executeSync(
    'SELECT id, list_name FROM chips ORDER BY sort_order',
  ).rows as {id: number; list_name: string}[];

  const chipsByList = new Map<string, number[]>();
  for (const row of chipRows) {
    const list = chipsByList.get(row.list_name) ?? [];
    list.push(row.id);
    chipsByList.set(row.list_name, list);
  }

  const chips = (list: string) => chipsByList.get(list) ?? [];

  // ── 2. Wipe existing data ────────────────────────────────────────────────────
  db.executeSync('DELETE FROM sessions');
  db.executeSync('DELETE FROM checkins');
  db.executeSync('DELETE FROM meditation_objects');

  // ── 3. Insert meditation object ──────────────────────────────────────────────
  const nowSec = Math.floor(Date.now() / 1000);
  db.executeSync(
    `INSERT INTO meditation_objects (name, start_date, is_active, created_at)
     VALUES (?, ?, 1, ?)`,
    [profile.objectName, nowSec, nowSec],
  );
  const objectId = (
    db.executeSync('SELECT id FROM meditation_objects WHERE rowid = last_insert_rowid()').rows[0] as {id: number}
  ).id;

  // ── 4. Generate data day by day ──────────────────────────────────────────────
  for (let i = profile.daysBack; i >= 0; i--) {
    const dateStr = getDateNDaysAgo(i);

    // Session
    if (Math.random() < profile.sitRate) {
      const startHour = randInt(6, 8);
      const startMin = randInt(0, 59);
      const startTime = toEpochSec(dateStr, startHour, startMin);
      const duration = randInt(profile.minDuration, profile.maxDuration);
      const createdAt = startTime;
      const updatedAt = startTime + duration + randInt(30, 120);

      const beforeMind = pickSomeJson(chips('before_mind'), 1, 3);
      const distractions = pickSomeJson(chips('distractions'), 0, profile.dtMean > 0.6 ? 2 : 4);
      const strongest =
        distractions && Math.random() > 0.4
          ? JSON.stringify([pickOne(chips('distractions'))])
          : null;
      const bodySensations = pickSomeJson(chips('body_sensations'), 1, 3);
      const emotionalTone = JSON.stringify([pickOne(chips('emotional_tone'))]);

      let awarenessNote: string | null = null;
      if (profile.hasNotes && Math.random() < 0.28) {
        awarenessNote = pickOne(AWARENESS_NOTES);
      }
      let beforeObs: string | null = null;
      if (profile.hasNotes && Math.random() < 0.18) {
        beforeObs = pickOne(BEFORE_OBS);
      }

      db.executeSync(
        `INSERT INTO sessions (
          date, start_time, duration_seconds, meditation_object_id,
          before_mind, before_observations,
          during_distractions, during_strongest,
          body_sensations, emotional_tone,
          moments_of_awareness,
          stage, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?)`,
        [
          dateStr, startTime, duration, objectId,
          beforeMind, beforeObs,
          distractions, strongest,
          bodySensations, emotionalTone,
          awarenessNote,
          createdAt, updatedAt,
        ],
      );
    }

    // Check-ins
    if (Math.random() < profile.checkinRate) {
      const slotCount = randInt(1, profile.maxCheckinsPerDay);
      const slots = pickN<CheckinType>(
        ['morning', 'afternoon', 'evening'],
        slotCount,
      ).sort((a, b) => {
        const order = {morning: 0, afternoon: 1, evening: 2};
        return order[a] - order[b];
      });

      const slotHours: Record<CheckinType, [number, number]> = {
        morning: [6, 9],
        afternoon: [12, 14],
        evening: [18, 20],
      };

      for (const slot of slots) {
        const [hMin, hMax] = slotHours[slot];
        const hour = randInt(hMin, hMax);
        const minute = randInt(0, 59);
        const ts = toEpochSec(dateStr, hour, minute);
        const {json: dtJson, score: dtScore} = generateDT(profile.dtMean);

        db.executeSync(
          `INSERT INTO checkins (
            timestamp, date, type,
            posture, feelings, emotional_tone, thoughts,
            donkey_tiger, dt_score, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ts, dateStr, slot,
            JSON.stringify([pickOne(chips('posture'))]),
            pickSomeJson(chips('feelings'), 1, 3),
            JSON.stringify([pickOne(chips('emotional_tone'))]),
            pickSomeJson(chips('thought_types'), 1, 2),
            dtJson, dtScore, ts,
          ],
        );
      }
    }
  }
}
