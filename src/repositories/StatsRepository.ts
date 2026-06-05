import {getDb, chipMap} from '../db';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {CHIP_LIST} from '../constants/chips';
import {getDateNDaysAgo} from '../utils/date';
import type {
  BeforeMindPoint,
  ChipFrequency,
  ToggleLean,
  DayArc,
  ToggleMapPoint,
  SummaryStats,
} from '../types';

type DTValue = 'donkey' | 'tiger' | 'neither';

function cutoff(days: number): string {
  return days === 0 ? '0000-01-01' : getDateNDaysAgo(days);
}

function longestStreakFromDates(datesAsc: string[]): number {
  if (datesAsc.length === 0) return 0;
  let max = 1;
  let run = 1;
  for (let i = 1; i < datesAsc.length; i++) {
    const prev = new Date(datesAsc[i - 1] + 'T00:00:00');
    const curr = new Date(datesAsc[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      if (run > max) max = run;
    } else {
      run = 1;
    }
  }
  return max;
}

export class StatsRepository {
  // Chart 1 — dot cloud: one dominant valence group per complete session
  getBeforeMindDrift(days: number): BeforeMindPoint[] {
    const from = cutoff(days);
    const rows = getDb().executeSync(
      `SELECT
         s.date,
         s.created_at,
         CASE
           WHEN SUM(CASE c.valence_group WHEN 'settled'   THEN 1 ELSE 0 END) >=
                SUM(CASE c.valence_group WHEN 'unsettled' THEN 1 ELSE 0 END)
            AND SUM(CASE c.valence_group WHEN 'settled'   THEN 1 ELSE 0 END) >=
                SUM(CASE c.valence_group WHEN 'mixed'     THEN 1 ELSE 0 END)
           THEN 'settled'
           WHEN SUM(CASE c.valence_group WHEN 'unsettled' THEN 1 ELSE 0 END) >=
                SUM(CASE c.valence_group WHEN 'mixed'     THEN 1 ELSE 0 END)
           THEN 'unsettled'
           ELSE 'mixed'
         END as valence_group
       FROM sessions s, json_each(s.before_mind) je
       JOIN chips c ON c.id = CAST(je.value AS INTEGER)
       WHERE s.stage = 'complete'
         AND s.before_mind IS NOT NULL
         AND c.valence_group IS NOT NULL
         AND s.date >= ?
       GROUP BY s.id, s.date, s.created_at
       ORDER BY s.created_at ASC`,
      [from],
    ).rows as {date: string; created_at: number; valence_group: string}[];

    return rows.map(r => ({
      date: r.date,
      createdAt: r.created_at,
      valenceGroup: r.valence_group as BeforeMindPoint['valenceGroup'],
    }));
  }

  // Chart 2 — top 5 distraction chips by frequency
  getDistractionFrequency(days: number): ChipFrequency[] {
    const from = cutoff(days);
    const rows = getDb().executeSync(
      `SELECT c.label, COUNT(*) as count
       FROM sessions s, json_each(s.during_distractions) je
       JOIN chips c ON c.id = CAST(je.value AS INTEGER)
       WHERE s.stage = 'complete'
         AND s.during_distractions IS NOT NULL
         AND s.date >= ?
       GROUP BY c.id, c.label
       ORDER BY count DESC
       LIMIT 5`,
      [from],
    ).rows as ChipFrequency[];

    return rows;
  }

  // Chart 3 — per-toggle D/T lean (0 = always donkey, 1 = always tiger, 0.5 = neutral)
  getToggleLeans(days: number): ToggleLean[] {
    const from = cutoff(days);
    const rows = getDb().executeSync(
      `SELECT donkey_tiger FROM checkins
       WHERE donkey_tiger IS NOT NULL AND date >= ?`,
      [from],
    ).rows as {donkey_tiger: string}[];

    const tigerChips = Array.from(chipMap.values())
      .filter(c => c.list_name === CHIP_LIST.DT_TIGER)
      .sort((a, b) => a.sort_order - b.sort_order);

    const counts = Array.from({length: 9}, () => ({tiger: 0, donkey: 0}));
    for (const row of rows) {
      const values: DTValue[] = JSON.parse(row.donkey_tiger);
      values.forEach((v, i) => {
        if (v === 'tiger') counts[i].tiger++;
        else if (v === 'donkey') counts[i].donkey++;
      });
    }

    return tigerChips.map((chip, i) => {
      const {tiger, donkey} = counts[i];
      const scored = tiger + donkey;
      return {name: chip.label, lean: scored > 0 ? tiger / scored : 0.5};
    });
  }

  // Chart 4 — spectrum river: one DayArc per date, morning/afternoon/evening dt_scores
  getSpectrumRiverData(days: number): DayArc[] {
    const from = cutoff(days);
    const rows = getDb().executeSync(
      `SELECT
         c.date,
         c.type,
         c.dt_score,
         EXISTS(
           SELECT 1 FROM sessions s
           WHERE s.date = c.date AND s.stage = 'complete'
         ) as had_sit
       FROM checkins c
       WHERE c.date >= ?
         AND c.dt_score IS NOT NULL
       ORDER BY c.date ASC, c.type ASC`,
      [from],
    ).rows as {date: string; type: string; dt_score: number; had_sit: 0 | 1}[];

    const byDate = new Map<string, DayArc>();
    for (const row of rows) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, {
          date: row.date,
          morning: null,
          afternoon: null,
          evening: null,
          hasSit: row.had_sit === 1,
        });
      }
      const arc = byDate.get(row.date)!;
      arc.hasSit = arc.hasSit || row.had_sit === 1;
      if (row.type === 'morning') arc.morning = row.dt_score;
      else if (row.type === 'afternoon') arc.afternoon = row.dt_score;
      else if (row.type === 'evening') arc.evening = row.dt_score;
    }

    return Array.from(byDate.values());
  }

  // Chart 5 — toggle map: lean, frequency, consistency per toggle
  getToggleMapData(days: number): ToggleMapPoint[] {
    const from = cutoff(days);
    const rows = getDb().executeSync(
      `SELECT donkey_tiger FROM checkins
       WHERE donkey_tiger IS NOT NULL AND date >= ?`,
      [from],
    ).rows as {donkey_tiger: string}[];

    const tigerChips = Array.from(chipMap.values())
      .filter(c => c.list_name === CHIP_LIST.DT_TIGER)
      .sort((a, b) => a.sort_order - b.sort_order);

    const counts = Array.from({length: 9}, () => ({tiger: 0, donkey: 0, neither: 0}));
    for (const row of rows) {
      const values: DTValue[] = JSON.parse(row.donkey_tiger);
      values.forEach((v, i) => {
        if (v === 'tiger') counts[i].tiger++;
        else if (v === 'donkey') counts[i].donkey++;
        else counts[i].neither++;
      });
    }

    const total = rows.length;

    return tigerChips.map((chip, i) => {
      const {tiger, donkey, neither} = counts[i];
      const scored = tiger + donkey;
      const lean = scored > 0 ? tiger / scored : 0.5;
      const freq = total > 0 ? (total - neither) / total : 0;
      const majority = scored > 0 ? Math.max(tiger, donkey) / scored : 0.5;
      const consistency = scored > 0 ? majority : 0;
      return {name: chip.label, lean, freq, consistency};
    });
  }

  getTotalSits(): number {
    const row = getDb().executeSync(
      `SELECT COUNT(*) as n FROM sessions WHERE stage = 'complete'`,
    ).rows[0] as {n: number};
    return row.n;
  }

  // Section 4 — plain numbers
  getSummaryStats(): SummaryStats {
    const main = getDb().executeSync(
      `SELECT
         COUNT(*) as totalSits,
         COALESCE(SUM(duration_seconds), 0) as totalSeconds,
         MIN(date) as sittingSince
       FROM sessions
       WHERE stage = 'complete'`,
    ).rows[0] as {totalSits: number; totalSeconds: number; sittingSince: string | null};

    const dateRows = getDb().executeSync(
      `SELECT DISTINCT date FROM sessions WHERE stage = 'complete' ORDER BY date ASC`,
    ).rows as {date: string}[];

    return {
      totalSits: main.totalSits,
      currentStreak: storage.getNumber(STORAGE_KEYS.STREAK) ?? 0,
      longestStreak: longestStreakFromDates(dateRows.map(r => r.date)),
      totalSeconds: main.totalSeconds,
      sittingSince: main.sittingSince,
    };
  }
}

export const statsRepository = new StatsRepository();
