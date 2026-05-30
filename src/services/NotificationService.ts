import notifee, {
  AuthorizationStatus,
  TriggerType,
  EventType,
} from '@notifee/react-native';
import type {TriggerNotification} from '@notifee/react-native';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {getLocalDateString} from '../utils/date';

const CHANNEL_ID = 'checkins';

const SLOTS = [
  {
    key: 'morning' as const,
    timeKey: STORAGE_KEYS.NOTIF_MORNING,
    enabledKey: STORAGE_KEYS.NOTIF_MORNING_ENABLED,
    defaultTime: '08:00',
    label: 'Morning',
  },
  {
    key: 'afternoon' as const,
    timeKey: STORAGE_KEYS.NOTIF_AFTERNOON,
    enabledKey: STORAGE_KEYS.NOTIF_AFTERNOON_ENABLED,
    defaultTime: '13:00',
    label: 'Afternoon',
  },
  {
    key: 'evening' as const,
    timeKey: STORAGE_KEYS.NOTIF_EVENING,
    enabledKey: STORAGE_KEYS.NOTIF_EVENING_ENABLED,
    defaultTime: '19:00',
    label: 'Evening',
  },
];

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const py = dt.getFullYear();
  const pm = String(dt.getMonth() + 1).padStart(2, '0');
  const pd = String(dt.getDate()).padStart(2, '0');
  return `${py}-${pm}-${pd}`;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const fromMs = new Date(fy, fm - 1, fd).getTime();
  const toMs = new Date(ty, tm - 1, td).getTime();
  return Math.round((toMs - fromMs) / 86400000);
}

class NotificationService {
  async requestPermission(): Promise<boolean> {
    await notifee.createChannel({id: CHANNEL_ID, name: 'Check-in reminders'});
    await notifee.setNotificationCategories([
      {
        id: 'incomplete_session',
        actions: [
          {id: 'complete', title: 'Complete'},
          {id: 'discard', title: 'Discard', destructive: true},
        ],
      },
    ]);
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  async topUp(): Promise<void> {
    const lastScheduled = storage.getString(STORAGE_KEYS.NOTIF_LAST_SCHEDULED);
    if (!lastScheduled) {
      await this._scheduleBatch(14);
      return;
    }
    const today = getLocalDateString();
    const daysRemaining = daysBetween(today, lastScheduled);
    if (daysRemaining < 7) {
      await notifee.cancelTriggerNotifications();
      await this._scheduleBatch(14);
    }
  }

  async reschedule(): Promise<void> {
    await notifee.cancelTriggerNotifications();
    await this._scheduleBatch(14);
  }

  private async _scheduleBatch(days: number): Promise<void> {
    const today = getLocalDateString();
    const [ty, tm, td] = today.split('-').map(Number);
    const startOfDay = new Date(ty, tm - 1, td).getTime();

    for (const slot of SLOTS) {
      const enabled = storage.getBoolean(slot.enabledKey) ?? true;
      if (!enabled) continue;

      const time = storage.getString(slot.timeKey) ?? slot.defaultTime;
      const [h, m] = time.split(':').map(Number);
      const offsetMs = h * 3600000 + m * 60000;

      for (let day = 0; day < days; day++) {
        const ts = startOfDay + day * 86400000 + offsetMs;
        if (ts <= Date.now()) continue;

        await notifee.createTriggerNotification(
          {
            title: `${slot.label} check-in`,
            body: 'Take a moment to check in.',
            data: {checkinType: slot.key},
            ios: {categoryId: 'checkin'},
            android: {channelId: CHANNEL_ID},
          },
          {type: TriggerType.TIMESTAMP, timestamp: ts},
        );
      }
    }

    storage.set(STORAGE_KEYS.NOTIF_LAST_SCHEDULED, addDays(today, days));
  }

  async scheduleIncompleteSessionFollowUp(sessionId: number): Promise<void> {
    const ts = Date.now() + 3 * 3600000; // 3 hours from now
    await notifee.createTriggerNotification(
      {
        id: String(sessionId),
        title: 'Complete your entry?',
        body: "You started a sit earlier — finish reflecting when you're ready.",
        data: {sessionId: String(sessionId), kind: 'incomplete_session'},
        ios: {categoryId: 'incomplete_session'},
        android: {channelId: CHANNEL_ID},
      },
      {type: TriggerType.TIMESTAMP, timestamp: ts},
    );
  }

  async cancelIncompleteSessionFollowUp(sessionId: number): Promise<void> {
    await notifee.cancelTriggerNotification(String(sessionId));
  }
}

export const notificationService = new NotificationService();
export {EventType};
