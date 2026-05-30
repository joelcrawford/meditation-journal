/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee, {EventType} from '@notifee/react-native';
import {createMMKV} from 'react-native-mmkv';

// Background notification handler — must be registered outside React
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type !== EventType.PRESS) return;
  const data = detail.notification?.data ?? {};
  const {checkinType, kind, sessionId} = data;
  if (!checkinType && !kind) return;

  // Store pending navigation for App.tsx to pick up on mount
  const storage = createMMKV({id: 'journal'});
  if (checkinType) {
    storage.set(
      'pending.navigation',
      JSON.stringify({screen: 'CheckinModal', params: {checkinType}}),
    );
  } else if (kind === 'incomplete_session' && sessionId) {
    storage.set(
      'pending.navigation',
      JSON.stringify({screen: 'After', params: {sessionId: Number(sessionId)}}),
    );
  }
});

AppRegistry.registerComponent(appName, () => App);
