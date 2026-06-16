import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, Typography} from '../theme';
import {sessionService} from '../services';
import {notificationService} from '../services/NotificationService';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SitComplete'>;
type Route = RouteProp<RootStackParamList, 'SitComplete'>;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SitCompleteScreen() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const {sessionId, elapsedSeconds} = params;

  function handleContinue() {
    navigation.replace('After', {sessionId});
  }

  function handleDiscard() {
    Alert.alert(
      'Discard this sit?',
      'The session will be permanently removed.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            notificationService.cancelIncompleteSessionFollowUp(sessionId).catch(() => {});
            storage.remove(STORAGE_KEYS.TIMER_STATE);
            storage.remove(STORAGE_KEYS.TIMER_ELAPSED);
            sessionService.deleteSession(sessionId);
            navigation.popToTop();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.label}>You completed</Text>
        <Text style={styles.duration}>{formatDuration(elapsedSeconds)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
          <Text style={styles.discardBtnText}>Discard session</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sp3,
  },
  label: {
    ...Typography.micro,
  },
  duration: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 64,
    lineHeight: 72,
    color: Colors.ink,
    letterSpacing: -1,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: Spacing.sp6,
    gap: Spacing.sp2,
  },
  continueBtn: {
    backgroundColor: Colors.moss,
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
  },
  discardBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  discardBtnText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 14,
    color: Colors.clay,
    textDecorationLine: 'underline',
  },
});
