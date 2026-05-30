import {getLocalDateString} from '../utils/date';
import type {CheckinRepository} from '../repositories/interfaces';
import type {Checkin, NewCheckinData} from '../types';

export class CheckinService {
  constructor(private repo: CheckinRepository) {}

  getTodayCheckins(): {
    morning: Checkin | null;
    afternoon: Checkin | null;
    evening: Checkin | null;
  } {
    const checkins = this.repo.findByDate(getLocalDateString());
    return {
      morning: checkins.find(c => c.type === 'morning') ?? null,
      afternoon: checkins.find(c => c.type === 'afternoon') ?? null,
      evening: checkins.find(c => c.type === 'evening') ?? null,
    };
  }

  createCheckin(data: NewCheckinData): Checkin {
    return this.repo.insert(data);
  }

  getCheckinsByDate(date: string): Checkin[] {
    return this.repo.findByDate(date);
  }
}
