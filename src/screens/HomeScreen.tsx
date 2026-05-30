import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {
  sessionService,
  checkinService,
  streakService,
  meditationObjectService,
} from '../services';
import {
  formatDisplayDate,
  getGreeting,
  getDayCount,
  formatTimestamp,
  getDateNDaysAgo,
  getLocalDateString,
} from '../utils/date';
import type {Session, Checkin, MeditationObject} from '../types';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function useHomeData() {
  const [sessions, setSessions] = useState<Session[]>(() =>
    sessionService.getTodaysSessions(),
  );
  const [checkins, setCheckins] = useState(() =>
    checkinService.getTodayCheckins(),
  );
  const [streak, setStreak] = useState(() => streakService.getCurrentStreak());
  const [currentObject, setCurrentObject] = useState<MeditationObject>(() =>
    meditationObjectService.getCurrentObject(),
  );

  useFocusEffect(
    useCallback(() => {
      setSessions(sessionService.getTodaysSessions());
      setCheckins(checkinService.getTodayCheckins());
      setStreak(streakService.getCurrentStreak());
      setCurrentObject(meditationObjectService.getCurrentObject());
    }, []),
  );

  return {sessions, checkins, streak, currentObject};
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {sessions, checkins, streak, currentObject} = useHomeData();

  const isFirstRun =
    sessions.length === 0 &&
    checkins.morning === null &&
    checkins.afternoon === null &&
    checkins.evening === null;

  const todayStatus = sessionService.getTodayStatus();

  function openObjectSheet() {
    navigation.navigate('MeditationObjectSheet');
  }

  function beginEntry() {
    navigation.navigate('Before');
  }

  function openCheckin(type: 'morning' | 'afternoon' | 'evening') {
    navigation.navigate('CheckinModal', {checkinType: type});
  }

  if (isFirstRun) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}>
          <HomeHeader onSettingsPress={openObjectSheet} />
          <FirstRunHero
            currentObject={currentObject}
            onChangeObject={openObjectSheet}
            onBegin={beginEntry}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HomeHeader onSettingsPress={openObjectSheet} />
        <StreakCard streak={streak} />

        <Text style={styles.sectionLabel}>TODAY'S SESSIONS</Text>
        {sessions.map(s => (
          <SessionCard
            key={s.id}
            session={s}
            objectName={currentObject.name}
            onCompletePress={() =>
              navigation.navigate('After', {sessionId: s.id})
            }
          />
        ))}
        <SessionCTA status={todayStatus} onBegin={beginEntry} />

        <Text style={[styles.sectionLabel, {marginTop: Spacing.sp6}]}>
          CHECK-INS
        </Text>
        {(
          [
            {type: 'morning', label: 'Morning', time: '8:00 AM'},
            {type: 'afternoon', label: 'Afternoon', time: '1:00 PM'},
            {type: 'evening', label: 'Evening', time: '7:00 PM'},
          ] as const
        ).map(slot => (
          <CheckinRow
            key={slot.type}
            label={slot.label}
            time={slot.time}
            checkin={checkins[slot.type]}
            onPress={() => openCheckin(slot.type)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HomeHeader({onSettingsPress}: {onSettingsPress: () => void}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.dateLabel}>{formatDisplayDate()}</Text>
        <Text style={styles.greeting}>{getGreeting()}</Text>
      </View>
      <TouchableOpacity style={styles.settingsBtn} onPress={onSettingsPress}>
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
    </View>
  );
}

function FirstRunHero({
  currentObject,
  onChangeObject,
  onBegin,
}: {
  currentObject: MeditationObject;
  onChangeObject: () => void;
  onBegin: () => void;
}) {
  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🪷</Text>
        <Text style={styles.heroTitle}>Begin your practice</Text>
        <Text style={styles.heroSub}>
          A quiet space to track each sit and notice the mind, one day at a
          time.
        </Text>
      </View>

      <View style={styles.objectCard}>
        <View style={styles.objectCardLeft}>
          <View style={styles.objectIconBg}>
            <Text style={styles.objectIconText}>◉</Text>
          </View>
          <View>
            <Text style={styles.objectName}>{currentObject.name}</Text>
            <Text style={styles.objectMeta}>Your starting object</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onChangeObject}>
          <Text style={styles.changeLink}>Change</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={onBegin}>
        <Text style={styles.primaryBtnText}>Begin your first entry</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, {marginTop: Spacing.sp6}]}>
        HOW IT WORKS
      </Text>
      {[
        {
          step: 'Before you sit',
          rest: ', note how the mind feels in a few taps.',
        },
        {
          step: 'After your sit',
          rest: ', reflect on what arose — distractions, body, emotion.',
        },
        {
          step: 'Through the day',
          rest: ', quick check-ins help you notice the mind off the cushion.',
        },
      ].map(({step, rest}, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepNum}>{i + 1}</Text>
          <Text style={styles.stepText}>
            <Text style={styles.stepBold}>{step}</Text>
            {rest}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StreakCard({streak}: {streak: number}) {
  const today = getLocalDateString();
  const dots = Array.from({length: 7}, (_, i) => {
    const date = getDateNDaysAgo(6 - i);
    return {date, isToday: date === today};
  });

  const completedDates = new Set(
    sessionService
      .getSessionsByDateRange(getDateNDaysAgo(6), today)
      .filter(s => s.stage === 'complete')
      .map(s => s.date),
  );

  return (
    <View style={styles.streakCard}>
      <View style={styles.streakLeft}>
        <View style={styles.flameBg}>
          <Text style={styles.flameEmoji}>🔥</Text>
        </View>
        <View>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>
      <View style={styles.dotsRow}>
        {dots.map(({date, isToday}) => {
          const completed = completedDates.has(date);
          return (
            <View
              key={date}
              style={[
                styles.dot,
                completed
                  ? styles.dotCompleted
                  : isToday
                  ? styles.dotToday
                  : styles.dotEmpty,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function SessionCard({
  session,
  objectName,
  onCompletePress,
}: {
  session: Session;
  objectName: string;
  onCompletePress: () => void;
}) {
  const isComplete = session.stage === 'complete';
  const iconBg = isComplete ? Colors.mossPale : Colors.clayPale;
  const iconColor = isComplete ? Colors.moss : Colors.clay;
  const badgeBg = isComplete ? Colors.mossPale : Colors.clayPale;
  const badgeText = isComplete ? Colors.moss : Colors.clay;
  const badgeLabel = isComplete ? 'Done' : 'In progress';

  const meta = session.start_time
    ? formatTimestamp(session.start_time) +
      (isComplete && session.duration_seconds
        ? ` · ${Math.round(session.duration_seconds / 60)} min`
        : ' · Before saved')
    : isComplete
    ? 'Complete'
    : 'Before saved';

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTop}>
        <View style={styles.sessionLeft}>
          <View style={[styles.sessionIcon, {backgroundColor: iconBg}]}>
            <Text style={[styles.sessionIconText, {color: iconColor}]}>✦</Text>
          </View>
          <View>
            <Text style={styles.sessionName}>{objectName}</Text>
            <Text style={styles.sessionMeta}>{meta}</Text>
          </View>
        </View>
        <View style={[styles.badge, {backgroundColor: badgeBg}]}>
          <Text style={[styles.badgeText, {color: badgeText}]}>
            {badgeLabel}
          </Text>
        </View>
      </View>
      {!isComplete && (
        <TouchableOpacity
          style={styles.completeInline}
          onPress={onCompletePress}>
          <Text style={styles.completeInlineText}>Complete entry →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SessionCTA({
  status,
  onBegin,
}: {
  status: 'none' | 'before_saved' | 'complete';
  onBegin: () => void;
}) {
  if (status === 'none') {
    return (
      <TouchableOpacity style={styles.primaryBtn} onPress={onBegin}>
        <Text style={styles.primaryBtnText}>Begin today's entry</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={styles.addSitBtn} onPress={onBegin}>
      <Text style={styles.addSitText}>+ Add another sit</Text>
    </TouchableOpacity>
  );
}

function CheckinRow({
  label,
  time,
  checkin,
  onPress,
}: {
  label: string;
  time: string;
  checkin: Checkin | null;
  onPress: () => void;
}) {
  const done = checkin !== null;
  return (
    <TouchableOpacity style={styles.checkinRow} onPress={onPress}>
      <View style={styles.checkinLeft}>
        <View style={styles.checkinIconBg}>
          <Text style={styles.checkinIconText}>
            {label === 'Morning' ? '☀' : label === 'Afternoon' ? '☁' : '🌙'}
          </Text>
        </View>
        <View>
          <Text style={styles.checkinName}>{label}</Text>
          <Text style={styles.checkinTime}>{time}</Text>
        </View>
      </View>
      <View style={[styles.checkinCircle, done && styles.checkinCircleDone]}>
        {done && <Text style={styles.checkinCheck}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  scroll: {flex: 1},
  content: {paddingHorizontal: 20, paddingBottom: 40},

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 18,
  },
  dateLabel: {
    ...Typography.micro,
    marginBottom: 2,
  },
  greeting: {
    ...Typography.title,
    color: Colors.ink,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.stone100,
    borderWidth: 1,
    borderColor: Colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {fontSize: 16, color: Colors.inkFaint},

  sectionLabel: {
    ...Typography.micro,
    marginBottom: Spacing.sp2,
  },

  // First-run hero
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  heroIcon: {fontSize: 48, marginBottom: 20},
  heroTitle: {...Typography.title, color: Colors.ink, marginBottom: 10, textAlign: 'center'},
  heroSub: {...Typography.body, color: Colors.inkSoft, textAlign: 'center'},

  objectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 14,
  },
  objectCardLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  objectIconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.mossPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectIconText: {fontSize: 16, color: Colors.moss},
  objectName: {...Typography.label, color: Colors.ink},
  objectMeta: {...Typography.caption},
  changeLink: {
    ...Typography.label,
    color: Colors.moss,
  },

  primaryBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sp3,
  },
  primaryBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
    fontWeight: '500',
  },

  addSitBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4C9B5',
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.sp2,
  },
  addSitText: {...Typography.label, color: Colors.inkFaint},

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: Spacing.sp2,
    paddingHorizontal: Spacing.sp4,
    marginBottom: 7,
  },
  stepNum: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 13,
    color: Colors.moss,
    width: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  stepText: {...Typography.caption, color: Colors.inkSoft, flex: 1},
  stepBold: {fontFamily: 'Newsreader-SemiBold', color: Colors.inkSoft},

  // Streak card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.ink,
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  streakLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  flameBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239,159,39,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameEmoji: {fontSize: 20},
  streakNumber: {fontFamily: 'Fraunces-Regular', fontSize: 28, color: Colors.paper},
  streakLabel: {fontSize: 11, color: 'rgba(250,250,248,0.45)'},
  dotsRow: {flexDirection: 'row', gap: 5},
  dot: {width: 8, height: 8, borderRadius: 4},
  dotCompleted: {backgroundColor: Colors.mossBright},
  dotToday: {backgroundColor: 'rgba(123,163,132,0.35)'},
  dotEmpty: {backgroundColor: 'rgba(255,255,255,0.12)'},

  // Session card
  sessionCard: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: Colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionLeft: {flexDirection: 'row', alignItems: 'center', gap: 11},
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionIconText: {fontSize: 14},
  sessionName: {...Typography.label, color: Colors.ink},
  sessionMeta: {fontSize: 11, color: Colors.inkFaint, marginTop: 1},
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 16,
  },
  badgeText: {fontSize: 11, fontFamily: 'Newsreader-Medium'},
  completeInline: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.stone100,
  },
  completeInlineText: {fontSize: 13, fontFamily: 'Newsreader-Medium', color: Colors.moss},

  // Check-in row
  checkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
    marginBottom: 7,
  },
  checkinLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  checkinIconBg: {width: 32, height: 32, justifyContent: 'center', alignItems: 'center'},
  checkinIconText: {fontSize: 16},
  checkinName: {...Typography.label, color: Colors.inkSoft},
  checkinTime: {fontSize: 11, color: Colors.inkFaint, marginTop: 1},
  checkinCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D4C9B5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinCircleDone: {
    backgroundColor: Colors.moss,
    borderColor: Colors.moss,
  },
  checkinCheck: {fontSize: 11, color: '#fff', fontWeight: '700'},
});
