import {getDb} from '../db';
import type {Session, NewBeforeData, AfterSessionData} from '../types';
import type {SessionRepository} from './interfaces';

export class LocalSessionRepository implements SessionRepository {
  findByDate(date: string): Session[] {
    const result = getDb().executeSync(
      'SELECT * FROM sessions WHERE date = ? ORDER BY created_at ASC',
      [date],
    );
    return result.rows as Session[];
  }

  findByDateRange(from: string, to: string): Session[] {
    const result = getDb().executeSync(
      'SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY date ASC, created_at ASC',
      [from, to],
    );
    return result.rows as Session[];
  }

  findById(id: number): Session | null {
    const result = getDb().executeSync(
      'SELECT * FROM sessions WHERE id = ?',
      [id],
    );
    return (result.rows[0] as Session) ?? null;
  }

  findAllCompleteDatesDesc(): string[] {
    const result = getDb().executeSync(
      "SELECT DISTINCT date FROM sessions WHERE stage = 'complete' ORDER BY date DESC",
    );
    return (result.rows as {date: string}[]).map(r => r.date);
  }

  insert(date: string, data: NewBeforeData): Session {
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    db.executeSync(
      `INSERT INTO sessions (date, start_time, meditation_object_id, before_mind, before_observations,
        stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'before', ?, ?)`,
      [
        date,
        now,
        data.meditation_object_id ?? null,
        data.before_mind ?? null,
        data.before_observations ?? null,
        now,
        now,
      ],
    );
    const inserted = db.executeSync(
      'SELECT * FROM sessions WHERE rowid = last_insert_rowid()',
    );
    return inserted.rows[0] as Session;
  }

  completeAfter(id: number, data: AfterSessionData): Session {
    const now = Math.floor(Date.now() / 1000);
    const db = getDb();
    db.executeSync(
      `UPDATE sessions SET
        duration_seconds = ?,
        during_distractions = ?,
        during_strongest = ?,
        during_patterns = ?,
        body_sensations = ?,
        body_observations = ?,
        emotional_tone = ?,
        emotional_observations = ?,
        moments_of_awareness = ?,
        lost_in_thought = ?,
        stage = 'complete',
        updated_at = ?
       WHERE id = ?`,
      [
        data.duration_seconds,
        data.during_distractions ?? null,
        data.during_strongest ?? null,
        data.during_patterns ?? null,
        data.body_sensations ?? null,
        data.body_observations ?? null,
        data.emotional_tone ?? null,
        data.emotional_observations ?? null,
        data.moments_of_awareness ?? null,
        data.lost_in_thought ?? null,
        now,
        id,
      ],
    );
    return this.findById(id) as Session;
  }

  delete(id: number): void {
    getDb().executeSync('DELETE FROM sessions WHERE id = ?', [id]);
  }
}
