import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {getLocalDateString, getPreviousDay} from '../utils/date';
import type {SessionRepository} from '../repositories/interfaces';

export class StreakService {
  constructor(private repo: SessionRepository) {}

  getCurrentStreak(): number {
    return storage.getNumber(STORAGE_KEYS.STREAK) ?? 0;
  }

  recomputeAndCache(): number {
    const dates = this.repo.findAllCompleteDatesDesc();
    const streak = this.computeStreak(dates);
    storage.set(STORAGE_KEYS.STREAK, streak);
    return streak;
  }

  private computeStreak(datesDesc: string[]): number {
    if (datesDesc.length === 0) return 0;

    const today = getLocalDateString();
    const yesterday = getPreviousDay(today);

    // Most recent session must be today or yesterday to have any streak
    if (datesDesc[0] < yesterday) return 0;

    // Start checking from whichever is most recent
    let expected = datesDesc[0] === today ? today : yesterday;
    let streak = 0;

    for (const date of datesDesc) {
      if (date === expected) {
        streak++;
        expected = getPreviousDay(expected);
      } else if (date < expected) {
        break;
      }
    }

    return streak;
  }
}
