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
import Svg, {Circle} from 'react-native-svg';
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
import {getDayCount} from '../utils/date';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Timer'>;
type Route = RouteProp<RootStackParamList, 'Timer'>;

type Phase = 'idle' | 'running' | 'paused';

const PRESETS = [5, 10, 15, 20, 30, 45, 60];
const RING_R = 100;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

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

  useEffect(() => {
    bellService.loadSound().catch(() => {});
    return () => {
      bellService.unloadSound().catch(() => {});
  // deactivateKeepAwake();
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

  // Stable: deps are all refs or stable navigation/params
  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
// deactivateKeepAwake();
    bellService.playBell().catch(() => {});
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    storage.set(STORAGE_KEYS.TIMER_ELAPSED, elapsedSecRef.current);
    navigation.replace('After', {sessionId});
  }, [stopInterval, sessionId, navigation]);

  // 1A — AppState correction: when app returns to foreground, resync countdown
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active' || endTimeRef.current === null) return;
      const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        handleComplete();
      } else {
        elapsedSecRef.current = totalSecRef.current - remaining;
        setRemainingSec(remaining);
      }
    });
    return () => sub.remove();
  }, [handleComplete]);

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
      elapsedSecRef.current += 1;
      setRemainingSec(prev => {
        if (prev <= 1) {
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
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
// activateKeepAwake(); // TODO: add native keep-awake
    bellService.playBell().catch(() => {});
    scheduleEndNotification(endMs).catch(() => {});
    startInterval();
  }

  function handlePause() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
// deactivateKeepAwake();
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
    scheduleEndNotification(endMs).catch(() => {});
    setPhase('running');
// activateKeepAwake(); // TODO: add native keep-awake
    startInterval();
  }

  function handleAdjustRunning(deltaMin: number) {
    setRemainingSec(prev => Math.max(60, Math.min(prev + deltaMin * 60, 10800)));
  }

  function handleFinishEarly() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
    storage.remove(STORAGE_KEYS.TIMER_STATE);
    storage.set(STORAGE_KEYS.TIMER_ELAPSED, elapsedSecRef.current);
    navigation.replace('After', {sessionId});
  }

  function handleDiscard() {
    stopInterval();
    cancelEndNotification();
    endTimeRef.current = null;
// deactivateKeepAwake();
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

  const progress = totalSecRef.current > 0 ? remainingSec / totalSecRef.current : 1;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.runningContent}>

        {/* Progress ring */}
        <View style={styles.ringWrapper}>
          <Svg width={240} height={240} style={styles.ring}>
            <Circle cx={120} cy={120} r={RING_R} stroke={Colors.sepia} strokeWidth={6} fill="none" />
            <Circle
              cx={120} cy={120} r={RING_R}
              stroke={phase === 'paused' ? Colors.inkGhost : Colors.moss}
              strokeWidth={6} fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation={-90} origin="120, 120"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.countdown}>{formatCountdown(remainingSec)}</Text>
            {phase === 'paused' && (
              <Text style={styles.pausedLabel}>paused</Text>
            )}
          </View>
        </View>

        {/* Controls — differ by phase */}
        {phase === 'running' ? (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.adjBtn} onPress={() => handleAdjustRunning(-1)}>
              <Text style={styles.adjBtnText}>−1 min</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pauseBtn} onPress={handlePause}>
              <Text style={styles.pauseBtnText}>⏸</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjBtn} onPress={() => handleAdjustRunning(1)}>
              <Text style={styles.adjBtnText}>+1 min</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
            <Text style={styles.resumeBtnText}>▶  Resume</Text>
          </TouchableOpacity>
        )}

        {/* Bottom actions — always visible */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleFinishEarly}>
            <Text style={styles.finishText}>Finish sit</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>·</Text>
          <TouchableOpacity onPress={handleDiscard}>
            <Text style={styles.discardText}>Discard</Text>
          </TouchableOpacity>
        </View>

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

  runningContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sp6,
  },

  ringWrapper: {width: 240, height: 240, justifyContent: 'center', alignItems: 'center'},
  ring: {position: 'absolute'},
  ringCenter: {justifyContent: 'center', alignItems: 'center'},
  countdown: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 52,
    color: Colors.ink,
    letterSpacing: -1,
  },

  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  adjBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.paperCard,
  },
  adjBtnText: {fontFamily: 'Newsreader-Medium', fontSize: 14, color: Colors.inkSoft},

  pauseBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseBtnText: {fontSize: 22, color: Colors.mossPale},

  pausedLabel: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 13,
    color: Colors.inkFaint,
    letterSpacing: 1,
    marginTop: 4,
  },

  resumeBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  resumeBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 17,
    color: Colors.mossPale,
  },

  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sp2,
  },
  finishText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 14,
    color: Colors.moss,
    textDecorationLine: 'underline',
  },
  linkDivider: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 14,
    color: Colors.sepia,
  },
  discardText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 14,
    color: Colors.clay,
    textDecorationLine: 'underline',
  },
});
