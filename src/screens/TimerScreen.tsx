import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AppState,
} from 'react-native';
import type {AppStateStatus} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {StagePips} from '../components/StagePips';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {sessionService, meditationObjectService} from '../services';
import {notificationService} from '../services/NotificationService';
import {bellService} from '../services/BellService';
import {liveActivityService} from '../services/LiveActivityService';
import {getDayCount} from '../utils/date';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Timer'>;
type Route = RouteProp<RootStackParamList, 'Timer'>;

type Phase = 'idle' | 'running' | 'paused';

const PRESETS = [5, 10, 15, 20, 30, 45, 60];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerScreen() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const {sessionId} = params;

  const currentObject = meditationObjectService.getCurrentObject();
  const dayCount = getDayCount(currentObject.start_date);

  const [durationMin, setDurationMin] = useState(
    Math.round((storage.getNumber(STORAGE_KEYS.DEFAULT_DURATION) ?? 1200) / 60),
  );

  // Restore paused state if the user navigated away while timer was running
  const savedStateRaw = storage.getString(STORAGE_KEYS.TIMER_STATE);
  const savedState = savedStateRaw ? (() => { try { return JSON.parse(savedStateRaw); } catch { return null; } })() : null;
  const hasSavedState = savedState?.sessionId === sessionId;

  const [phase, setPhase] = useState<Phase>(hasSavedState ? 'paused' : 'idle');
  const [remainingSec, setRemainingSec] = useState(hasSavedState ? savedState.remainingSec : 0);

  // totalSec lives in a ref so the completion handler always reads the current value
  const totalSecRef = useRef(hasSavedState ? savedState.totalSec : 0);
  const elapsedSecRef = useRef(hasSavedState ? savedState.elapsedSec : 0);
  const endTimeRef = useRef<number | null>(null); // absolute ms when sit ends
  const endNotifIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);
  const pendingNavigateRef = useRef(false);

  useEffect(() => {
    bellService.loadSound().catch(() => {});
    return () => {
      bellService.unloadSound().catch(() => {});
      bellService.deactivateKeepAwake().catch(() => {});
      bellService.stopSilentLoop().catch(() => {});
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    storage.set(STORAGE_KEYS.DEFAULT_DURATION, durationMin * 60);
  }, [durationMin]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
    bellService.deactivateKeepAwake().catch(() => {});
    bellService.stopSilentLoop().catch(() => {});
    bellService.playBell().catch(() => {});
    liveActivityService.end().catch(() => {});
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    storage.set(STORAGE_KEYS.TIMER_ELAPSED, elapsedSecRef.current);
    if (AppState.currentState === 'active') {
      navigation.replace('SitComplete', {sessionId, elapsedSeconds: elapsedSecRef.current});
    } else {
      // Background: defer navigation until app becomes active
      pendingNavigateRef.current = true;
    }
  }, [stopInterval, sessionId, navigation]);

  // Resync on foreground — also picks up any navigation deferred from background completion
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (pendingNavigateRef.current) {
        pendingNavigateRef.current = false;
        navigation.replace('SitComplete', {sessionId, elapsedSeconds: elapsedSecRef.current});
        return;
      }
      if (endTimeRef.current === null) return;
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        handleComplete();
      } else {
        elapsedSecRef.current = totalSecRef.current - remaining;
        setRemainingSec(remaining);
      }
    });
    return () => sub.remove();
  }, [handleComplete, sessionId, navigation]);

  async function scheduleEndNotification(endMs: number) {
    const id = `timer-end-${sessionId}`;
    await notificationService.scheduleTimerEnd(sessionId, id, endMs);
    endNotifIdRef.current = id;
  }

  function cancelEndNotification() {
    if (endNotifIdRef.current) {
      notificationService.cancelTimerEnd(endNotifIdRef.current).catch(() => {});
      endNotifIdRef.current = null;
    }
  }

  function startInterval() {
    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      elapsedSecRef.current = totalSecRef.current - remaining;
      if (remaining <= 0) {
        handleComplete();
      } else {
        setRemainingSec(remaining);
      }
    }, 1000);
  }

  function handlePlay() {
    const sec = durationMin * 60;
    totalSecRef.current = sec;
    elapsedSecRef.current = 0;
    const endMs = Date.now() + sec * 1000;
    endTimeRef.current = endMs;
    setRemainingSec(sec);
    setPhase('running');
    bellService.activateKeepAwake().catch(() => {});
    bellService.playBell().catch(() => {});
    bellService.startSilentLoop().catch(() => {});
    scheduleEndNotification(endMs).catch(() => {});
    liveActivityService.start(currentObject.name, endMs).catch(() => {});
    startInterval();
  }

  function handlePause() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
    bellService.stopSilentLoop().catch(() => {});
    liveActivityService.end().catch(() => {});
    storage.set(STORAGE_KEYS.TIMER_STATE, JSON.stringify({
      sessionId,
      remainingSec,
      totalSec: totalSecRef.current,
      elapsedSec: elapsedSecRef.current,
    }));
    setPhase('paused');
  }

  function handleResume() {
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    const endMs = Date.now() + remainingSec * 1000;
    endTimeRef.current = endMs;
    bellService.activateKeepAwake().catch(() => {});
    bellService.startSilentLoop().catch(() => {});
    scheduleEndNotification(endMs).catch(() => {});
    liveActivityService.start(currentObject.name, endMs).catch(() => {});
    setPhase('running');
    startInterval();
  }

  function handleAdjustRunning(deltaMin: number) {
    setRemainingSec(prev => {
      const next = Math.max(60, Math.min(prev + deltaMin * 60, 10800));
      const newEndMs = Date.now() + next * 1000;
      endTimeRef.current = newEndMs;
      liveActivityService.update(newEndMs).catch(() => {});
      scheduleEndNotification(newEndMs).catch(() => {});
      return next;
    });
  }

  function handleFinishEarly() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
    bellService.deactivateKeepAwake().catch(() => {});
    bellService.stopSilentLoop().catch(() => {});
    liveActivityService.end().catch(() => {});
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    storage.set(STORAGE_KEYS.TIMER_ELAPSED, elapsedSecRef.current);
    navigation.replace('After', {sessionId});
  }

  function handleDiscard() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
    bellService.deactivateKeepAwake().catch(() => {});
    bellService.stopSilentLoop().catch(() => {});
    liveActivityService.end().catch(() => {});
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    sessionService.deleteSession(sessionId);
    notificationService.cancelIncompleteSessionFollowUp(sessionId).catch(() => {});
    navigation.popToTop();
  }

  function handleBackFromIdle() {
    sessionService.deleteSession(sessionId);
    notificationService.cancelIncompleteSessionFollowUp(sessionId).catch(() => {});
    navigation.goBack();
  }

  function adjustDuration(delta: number) {
    setDurationMin(prev => Math.min(180, Math.max(1, prev + delta)));
  }

  if (phase === 'idle') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>

          <TouchableOpacity style={styles.backBtn} onPress={handleBackFromIdle}>
            <Text style={styles.backBtnText}>← Before</Text>
          </TouchableOpacity>

          <StagePips current={2} />

          <View style={styles.objectRow}>
            <Text style={styles.objectText}>◉ {currentObject.name} · Day {dayCount}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MeditationObjectSheet')}>
              <Text style={styles.editLink}>Edit ›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.durationDisplay}>{durationMin}</Text>
          <Text style={styles.durationUnit}>minutes</Text>

          <View style={styles.presetRow}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.presetChip, durationMin === p && styles.presetChipActive]}
                onPress={() => setDurationMin(p)}>
                <Text style={[styles.presetChipText, durationMin === p && styles.presetChipTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fineTuneRow}>
            <TouchableOpacity style={styles.fineBtn} onPress={() => adjustDuration(-1)}>
              <Text style={styles.fineBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.fineTuneLabel}>{durationMin} min</Text>
            <TouchableOpacity style={styles.fineBtn} onPress={() => adjustDuration(1)}>
              <Text style={styles.fineBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
            <Text style={styles.playBtnText}>▶</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Tap to begin · bell will sound</Text>

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.darkSafe} edges={['top', 'bottom']}>
      <View style={styles.darkContent}>
        <Text style={styles.darkCountdown}>{formatCountdown(remainingSec)}</Text>
        {phase === 'paused' && (
          <Text style={styles.darkPausedLabel}>paused</Text>
        )}
        {phase === 'running' ? (
          <TouchableOpacity style={styles.darkControlPill} onPress={handlePause}>
            <Text style={styles.darkControlPillText}>pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.darkControlPill, styles.darkControlPillActive]} onPress={handleResume}>
            <Text style={[styles.darkControlPillText, styles.darkControlPillTextActive]}>resume</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.darkBottom}>
        <TouchableOpacity onPress={handleFinishEarly}>
          <Text style={styles.darkBottomLink}>Finish sit</Text>
        </TouchableOpacity>
        <Text style={styles.darkBottomDot}>·</Text>
        <TouchableOpacity onPress={handleDiscard}>
          <Text style={styles.darkBottomLink}>Discard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},

  content: {
    paddingHorizontal: 20,
    paddingTop: Spacing.sp3,
    paddingBottom: 40,
    alignItems: 'center',
  },

  backBtn: {alignSelf: 'flex-start', marginBottom: Spacing.sp3},
  backBtnText: {fontFamily: 'Newsreader-Regular', fontSize: 15, color: Colors.inkFaint},

  objectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: Colors.mossPale,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: Spacing.sp6,
    marginTop: Spacing.sp2,
  },
  objectText: {fontFamily: 'Newsreader-Medium', fontSize: 13, color: Colors.mossDeep},
  editLink: {fontFamily: 'Newsreader-Regular', fontSize: 13, color: Colors.moss},

  durationDisplay: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 96,
    lineHeight: 100,
    color: Colors.ink,
    letterSpacing: -2,
  },
  durationUnit: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 16,
    color: Colors.inkFaint,
    marginBottom: Spacing.sp6,
  },

  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.sp4,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.paperCard,
  },
  presetChipActive: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  presetChipText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 14,
    color: Colors.inkSoft,
  },
  presetChipTextActive: {color: Colors.mossPale},

  fineTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing.sp7,
  },
  fineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.stone100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fineBtnText: {fontSize: 20, color: Colors.inkSoft, lineHeight: 24},
  fineTuneLabel: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 15,
    color: Colors.ink,
    minWidth: 60,
    textAlign: 'center',
  },

  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sp4,
  },
  playBtnText: {fontSize: 28, color: Colors.mossPale},

  hint: {...Typography.caption, textAlign: 'center'},

  darkSafe: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sp5,
  },
  darkCountdown: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 80,
    lineHeight: 88,
    color: Colors.paper,
    letterSpacing: -2,
  },
  darkPausedLabel: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(244,239,230,0.35)',
    marginTop: -Spacing.sp3,
  },
  darkControlPill: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(244,239,230,0.18)',
  },
  darkControlPillActive: {
    borderColor: 'rgba(244,239,230,0.5)',
  },
  darkControlPillText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 15,
    color: 'rgba(244,239,230,0.45)',
  },
  darkControlPillTextActive: {
    color: Colors.paper,
  },
  darkBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: Spacing.sp6,
  },
  darkBottomLink: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 13,
    color: 'rgba(244,239,230,0.25)',
  },
  darkBottomDot: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 13,
    color: 'rgba(244,239,230,0.15)',
  },
});
