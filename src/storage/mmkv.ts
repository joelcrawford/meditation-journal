import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV({id: 'journal'});

export const STORAGE_KEYS = {
  STREAK: 'streak.current',
  OBJECT_CURRENT_ID: 'object.current_id',
  DEFAULT_DURATION: 'session.default_duration_seconds',
  NOTIF_MORNING: 'notifications.morning_time',
  NOTIF_AFTERNOON: 'notifications.afternoon_time',
  NOTIF_EVENING: 'notifications.evening_time',
  NOTIF_LAST_SCHEDULED: 'notifications.last_scheduled_date',
} as const;
