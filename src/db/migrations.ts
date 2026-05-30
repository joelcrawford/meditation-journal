import type {DB, Scalar} from '@op-engineering/op-sqlite';

interface Migration {
  version: number;
  up: (db: DB) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: (db: DB) => {
      db.executeSync(`
        CREATE TABLE IF NOT EXISTS chips (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          list_name  TEXT NOT NULL,
          label      TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
      `);
      db.executeSync(`CREATE INDEX IF NOT EXISTS idx_chips_list ON chips(list_name);`);

      db.executeSync(`
        CREATE TABLE IF NOT EXISTS meditation_objects (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name        TEXT NOT NULL,
          description TEXT,
          notes       TEXT,
          start_date  INTEGER NOT NULL,
          ended_date  INTEGER,
          is_active   INTEGER NOT NULL DEFAULT 1,
          created_at  INTEGER NOT NULL
        );
      `);

      db.executeSync(`
        CREATE TABLE IF NOT EXISTS sessions (
          id                     INTEGER PRIMARY KEY AUTOINCREMENT,
          date                   TEXT NOT NULL,
          start_time             INTEGER,
          duration_seconds       INTEGER,
          meditation_object_id   INTEGER REFERENCES meditation_objects(id),
          before_mind            TEXT,
          before_observations    TEXT,
          during_distractions    TEXT,
          during_strongest       TEXT,
          during_patterns        TEXT,
          body_sensations        TEXT,
          body_observations      TEXT,
          emotional_tone         TEXT,
          emotional_observations TEXT,
          moments_of_awareness   TEXT,
          lost_in_thought        TEXT,
          stage                  TEXT NOT NULL DEFAULT 'before',
          created_at             INTEGER NOT NULL,
          updated_at             INTEGER NOT NULL
        );
      `);
      db.executeSync(`CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);`);

      db.executeSync(`
        CREATE TABLE IF NOT EXISTS checkins (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp      INTEGER NOT NULL,
          date           TEXT NOT NULL,
          type           TEXT NOT NULL,
          posture        TEXT,
          feelings       TEXT,
          emotional_tone TEXT,
          thoughts       TEXT,
          donkey_tiger   TEXT,
          dt_score       REAL,
          created_at     INTEGER NOT NULL
        );
      `);
      db.executeSync(`CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);`);

      // Seed default meditation object
      const now = Math.floor(Date.now() / 1000);
      db.executeSync(
        `INSERT INTO meditation_objects (name, description, start_date, is_active, created_at)
         VALUES ('Breath', 'Default object — update or replace anytime', ?, 1, ?);`,
        [now, now],
      );

      // Seed all chip lists
      const chips: [string, string, number][] = [
        // before_mind (10)
        ['before_mind', 'Scattered', 0],
        ['before_mind', 'Heavy', 1],
        ['before_mind', 'Calm', 2],
        ['before_mind', 'Restless', 3],
        ['before_mind', 'Numb', 4],
        ['before_mind', 'Open', 5],
        ['before_mind', 'Anxious', 6],
        ['before_mind', 'Tired', 7],
        ['before_mind', 'Emotionally charged', 8],
        ['before_mind', 'Clear', 9],
        // distractions (10)
        ['distractions', 'Planning', 0],
        ['distractions', 'Emotion', 1],
        ['distractions', 'Memory', 2],
        ['distractions', 'Body discomfort', 3],
        ['distractions', 'Fantasy', 4],
        ['distractions', 'Fear', 5],
        ['distractions', 'Anticipation', 6],
        ['distractions', 'Judgment', 7],
        ['distractions', 'Sleepiness', 8],
        ['distractions', 'Restlessness', 9],
        // body_sensations (10)
        ['body_sensations', 'Tension', 0],
        ['body_sensations', 'Softness', 1],
        ['body_sensations', 'Holding', 2],
        ['body_sensations', 'Openness', 3],
        ['body_sensations', 'Fatigue', 4],
        ['body_sensations', 'Restlessness', 5],
        ['body_sensations', 'Heaviness', 6],
        ['body_sensations', 'Ease', 7],
        ['body_sensations', 'Tingling', 8],
        ['body_sensations', 'Warmth', 9],
        // feelings (10)
        ['feelings', 'Peaceful', 0],
        ['feelings', 'Irritated', 1],
        ['feelings', 'Sad', 2],
        ['feelings', 'Hopeful', 3],
        ['feelings', 'Neutral', 4],
        ['feelings', 'Joyful', 5],
        ['feelings', 'Lonely', 6],
        ['feelings', 'Spacious', 7],
        ['feelings', 'Frustrated', 8],
        ['feelings', 'Tender', 9],
        // emotional_tone (6)
        ['emotional_tone', 'Joy', 0],
        ['emotional_tone', 'Anxiety/fear', 1],
        ['emotional_tone', 'Calm', 2],
        ['emotional_tone', 'Restlessness', 3],
        ['emotional_tone', 'Openness', 4],
        ['emotional_tone', 'Irritation', 5],
        // thought_types (10)
        ['thought_types', 'Planning & future management', 0],
        ['thought_types', 'Fear or defensive thinking', 1],
        ['thought_types', 'Self-criticism or self-protection', 2],
        ['thought_types', 'Desire / craving / wanting', 3],
        ['thought_types', 'Emotional replaying or storytelling', 4],
        ['thought_types', 'Judgment or comparison', 5],
        ['thought_types', 'Fantasy or escape thinking', 6],
        ['thought_types', 'Identity-based thinking', 7],
        ['thought_types', 'Problem-solving / fixing', 8],
        ['thought_types', 'Presence / simple awareness', 9],
        // posture (6)
        ['posture', 'Spine Aligned & Grounded', 0],
        ['posture', 'Slouched', 1],
        ['posture', 'Alert', 2],
        ['posture', 'Contracted', 3],
        ['posture', 'Open', 4],
        ['posture', 'Tense', 5],
        // dt_donkey (9) — donkey-pole labels, paired by sort_order with dt_tiger
        ['dt_donkey', 'The world was happening to me', 0],
        ['dt_donkey', 'My emotions felt completely solid', 1],
        ['dt_donkey', 'My thoughts felt unquestionably true', 2],
        ['dt_donkey', 'I felt trapped inside circumstances', 3],
        ['dt_donkey', 'I forgot I could change causes', 4],
        ['dt_donkey', 'Time scarcity', 5],
        ['dt_donkey', 'Blame', 6],
        ['dt_donkey', 'Mental looping', 7],
        ['dt_donkey', 'Externalizing causes', 8],
        // dt_tiger (9) — tiger-pole labels, paired by sort_order with dt_donkey
        ['dt_tiger', 'I remembered experience is changing', 0],
        ['dt_tiger', 'I noticed thoughts arising and passing', 1],
        ['dt_tiger', 'I saw emotions as movements, not identity', 2],
        ['dt_tiger', 'I remembered I can plant different causes', 3],
        ['dt_tiger', 'I paused before fully believing the story', 4],
        ['dt_tiger', 'Possibility & spaciousness', 5],
        ['dt_tiger', 'Cause and effect', 6],
        ['dt_tiger', 'Awareness during reaction', 7],
        ['dt_tiger', 'Creating new causes', 8],
      ];

      chips.forEach(([list_name, label, sort_order]) => {
        db.executeSync(
          `INSERT INTO chips (list_name, label, sort_order) VALUES (?, ?, ?);`,
          [list_name, label, sort_order],
        );
      });
    },
  },
];
