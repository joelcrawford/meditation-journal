import {getDb} from '../db';
import type {Checkin, NewCheckinData} from '../types';
import type {CheckinRepository} from './interfaces';

export class LocalCheckinRepository implements CheckinRepository {
  findByDate(date: string): Checkin[] {
    const result = getDb().executeSync(
      'SELECT * FROM checkins WHERE date = ? ORDER BY timestamp ASC',
      [date],
    );
    return result.rows as Checkin[];
  }

  insert(data: NewCheckinData): Checkin {
    const db = getDb();
    db.executeSync(
      `INSERT INTO checkins (timestamp, date, type, posture, feelings, emotional_tone,
        thoughts, donkey_tiger, dt_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.timestamp,
        data.date,
        data.type,
        data.posture ?? null,
        data.feelings ?? null,
        data.emotional_tone ?? null,
        data.thoughts ?? null,
        data.donkey_tiger ?? null,
        data.dt_score ?? null,
        data.created_at,
      ],
    );
    const inserted = db.executeSync(
      'SELECT * FROM checkins WHERE rowid = last_insert_rowid()',
    );
    return inserted.rows[0] as Checkin;
  }

  delete(id: number): void {
    getDb().executeSync('DELETE FROM checkins WHERE id = ?', [id]);
  }
}
