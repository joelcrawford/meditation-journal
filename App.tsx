import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import type {NavigationContainerRef} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import notifee, {EventType} from '@notifee/react-native';
import {initializeDatabase} from './src/db';
import {storage, STORAGE_KEYS} from './src/storage/mmkv';
import {streakService, sessionService} from './src/services';
import {notificationService} from './src/services/NotificationService';
import {RootNavigator} from './src/navigation/RootNavigator';
import type {RootStackParamList} from './src/navigation/types';

// Synchronous launch sequence
initializeDatabase();
if (storage.getNumber(STORAGE_KEYS.DEFAULT_DURATION) == null) {
  storage.set(STORAGE_KEYS.DEFAULT_DURATION, 1200);
}
streakService.recomputeAndCache();

export const navigationRef =
  React.createRef<NavigationContainerRef<RootStackParamList>>();

export default function App() {
  useEffect(() => {
    // Request permissions and top up notification schedule (non-blocking)
    notificationService.requestPermission().then(granted => {
      if (granted) notificationService.topUp();
    });

    // Clear any stale timer-end notifications from previous sessions
    notificationService.cancelAllTimerEndNotifications().catch(() => {});

    // Handle any pending navigation from a background notification tap
    const pending = storage.getString(STORAGE_KEYS.PENDING_NAV);
    if (pending) {
      storage.remove(STORAGE_KEYS.PENDING_NAV);
      try {
        const {screen, params} = JSON.parse(pending);
        setTimeout(() => navigationRef.current?.navigate(screen as any, params), 300);
      } catch {}
    }

    // Handle foreground notification taps and action presses
    return notifee.onForegroundEvent(({type, detail}) => {
      const data = (detail.notification?.data ?? {}) as Record<string, string>;
      const {checkinType, kind, sessionId} = data;

      if (type === EventType.PRESS) {
        if (checkinType) {
          navigationRef.current?.navigate('CheckinModal', {
            checkinType: checkinType as 'morning' | 'afternoon' | 'evening',
          });
        } else if (kind === 'incomplete_session' && sessionId) {
          navigationRef.current?.navigate('After', {sessionId: Number(sessionId)});
        } else if (kind === 'timer_end' && sessionId) {
          navigationRef.current?.navigate('After', {sessionId: Number(sessionId)});
        }
      } else if (type === EventType.ACTION_PRESS) {
        const actionId = detail.pressAction?.id;
        if (kind === 'incomplete_session' && sessionId) {
          if (actionId === 'discard') {
            sessionService.deleteSession(Number(sessionId));
          } else if (actionId === 'complete') {
            navigationRef.current?.navigate('After', {sessionId: Number(sessionId)});
          }
        }
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
