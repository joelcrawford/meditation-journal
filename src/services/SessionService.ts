import {getLocalDateString} from '../utils/date';
import type {SessionRepository} from '../repositories/interfaces';
import type {Session, NewBeforeData, AfterSessionData} from '../types';

export class SessionService {
  constructor(private repo: SessionRepository) {}

  getTodaysSessions(): Session[] {
    return this.repo.findByDate(getLocalDateString());
  }

  getTodayStatus(): 'none' | 'before_saved' | 'complete' {
    const sessions = this.getTodaysSessions();
    if (sessions.length === 0) return 'none';
    if (sessions.some(s => s.stage === 'complete')) return 'complete';
    return 'before_saved';
  }

  createBeforeEntry(data: NewBeforeData): Session {
    return this.repo.insert(getLocalDateString(), data);
  }

  completeAfterEntry(id: number, data: AfterSessionData): Session {
    return this.repo.completeAfter(id, data);
  }

  getSessionsByDateRange(from: string, to: string): Session[] {
    return this.repo.findByDateRange(from, to);
  }
}
