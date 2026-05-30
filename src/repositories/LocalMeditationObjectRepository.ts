import {getDb} from '../db';
import type {MeditationObject, NewObjectData} from '../types';
import type {MeditationObjectRepository} from './interfaces';

export class LocalMeditationObjectRepository
  implements MeditationObjectRepository
{
  findActive(): MeditationObject {
    const result = getDb().executeSync(
      'SELECT * FROM meditation_objects WHERE is_active = 1 LIMIT 1',
    );
    return result.rows[0] as MeditationObject;
  }

  findAll(): MeditationObject[] {
    const result = getDb().executeSync(
      'SELECT * FROM meditation_objects ORDER BY start_date DESC',
    );
    return result.rows as MeditationObject[];
  }

  insert(data: NewObjectData, startDate: number): MeditationObject {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.executeSync(
      `INSERT INTO meditation_objects (name, description, notes, start_date, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [data.name, data.description ?? null, data.notes ?? null, startDate, now],
    );
    const inserted = db.executeSync(
      'SELECT * FROM meditation_objects WHERE rowid = last_insert_rowid()',
    );
    return inserted.rows[0] as MeditationObject;
  }

  deactivate(id: number, endedDate: number): void {
    getDb().executeSync(
      'UPDATE meditation_objects SET is_active = 0, ended_date = ? WHERE id = ?',
      [endedDate, id],
    );
  }
}
