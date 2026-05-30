import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import type {NavigationContainerRef} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import notifee, {EventType} from '@notifee/react-native';
import {initializeDatabase} from './src/db';
import {storage, STORAGE_KEYS} from './src/storage/mmkv';
import {streakService} from './src/services';
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
    notificationService.requestPermission();
    notificationService.topUp();

    // Handle any pending navigation from a background notification tap
    const pending = storage.getString(STORAGE_KEYS.PENDING_NAV);
    if (pending) {
      storage.remove(STORAGE_KEYS.PENDING_NAV);
      try {
        const {screen, params} = JSON.parse(pending);
        setTimeout(() => navigationRef.current?.navigate(screen as any, params), 300);
      } catch {}
    }

    // Handle foreground notification taps
    return notifee.onForegroundEvent(({type, detail}) => {
      if (type !== EventType.PRESS) return;
      const data = detail.notification?.data ?? {};
      const {checkinType, kind, sessionId} = data as Record<string, string>;
      if (checkinType) {
        navigationRef.current?.navigate('CheckinModal', {
          checkinType: checkinType as 'morning' | 'afternoon' | 'evening',
        });
      } else if (kind === 'incomplete_session' && sessionId) {
        navigationRef.current?.navigate('After', {sessionId: Number(sessionId)});
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
