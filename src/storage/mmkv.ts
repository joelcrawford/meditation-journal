import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV({id: 'journal'});

export const STORAGE_KEYS = {
  STREAK: 'streak.current',
  OBJECT_CURRENT_ID: 'object.current_id',
  DEFAULT_DURATION: 'session.default_duration_seconds',
  NOTIF_MORNING: 'notifications.morning_time',
  NOTIF_AFTERNOON: 'notifications.afternoon_time',
  NOTIF_EVENING: 'notifications.evening_time',
  NOTIF_MORNING_ENABLED: 'notifications.morning_enabled',
  NOTIF_AFTERNOON_ENABLED: 'notifications.afternoon_enabled',
  NOTIF_EVENING_ENABLED: 'notifications.evening_enabled',
  NOTIF_LAST_SCHEDULED: 'notifications.last_scheduled_date',
  PENDING_NAV: 'pending.navigation',
  BELL_SOUND: 'bell.sound',
  TIMER_ELAPSED: 'timer.elapsed',
  TIMER_STATE: 'timer.paused_state',
  ADMIN_ENABLED: 'dev.admin_enabled',
  ACTIVE_PROFILE: 'dev.active_profile',
} as const;
