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
  const data = detail.notification?.data ?? {};
  const {checkinType, kind, sessionId} = data;

  if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    if (kind === 'incomplete_session' && sessionId) {
      if (actionId === 'discard') {
        // Directly delete via DB — no navigation needed
        const {getDb} = require('./src/db');
        getDb().executeSync('DELETE FROM sessions WHERE id = ?', [Number(sessionId)]);
      } else if (actionId === 'complete') {
        const storage = createMMKV({id: 'journal'});
        storage.set(
          'pending.navigation',
          JSON.stringify({screen: 'After', params: {sessionId: Number(sessionId)}}),
        );
      }
    }
    return;
  }

  if (type !== EventType.PRESS) return;
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
  } else if (kind === 'timer_end' && sessionId) {
    const elapsedSeconds = storage.getNumber('timer.elapsed') ?? 0;
    storage.set(
      'pending.navigation',
      JSON.stringify({screen: 'SitComplete', params: {sessionId: Number(sessionId), elapsedSeconds}}),
    );
  }
});

AppRegistry.registerComponent(appName, () => App);
