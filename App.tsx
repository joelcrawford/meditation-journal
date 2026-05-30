import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {initializeDatabase} from './src/db';
import {storage, STORAGE_KEYS} from './src/storage/mmkv';
import {streakService} from './src/services';
import {RootNavigator} from './src/navigation/RootNavigator';

// Synchronous launch sequence — completes before first render
initializeDatabase();
if (storage.getNumber(STORAGE_KEYS.DEFAULT_DURATION) == null) {
  storage.set(STORAGE_KEYS.DEFAULT_DURATION, 1200);
}
streakService.recomputeAndCache();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
