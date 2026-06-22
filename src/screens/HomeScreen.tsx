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
import Svg, {Path, Rect} from 'react-native-svg';
import {statsRepository} from '../repositories/StatsRepository';
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
  isWithinGraceWindow,
} from '../utils/date';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {reloadChips} from '../db';
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
  const [activeProfile, setActiveProfile] = useState<string | undefined>(
    storage.getString(STORAGE_KEYS.ACTIVE_PROFILE),
  );

  const refresh = useCallback(() => {
    setSessions(sessionService.getTodaysSessions());
    setCheckins(checkinService.getTodayCheckins());
    setStreak(streakService.getCurrentStreak());
    setCurrentObject(meditationObjectService.getCurrentObject());
    setActiveProfile(storage.getString(STORAGE_KEYS.ACTIVE_PROFILE));
  }, []);

  useFocusEffect(refresh);

  return {sessions, setSessions, checkins, setCheckins, streak, currentObject, activeProfile, setActiveProfile, refresh};
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const {sessions, setSessions, checkins, setCheckins, streak, currentObject, activeProfile, refresh} = useHomeData();

  const isFirstRun = statsRepository.getTotalSits() === 0;

  const todayStatus = sessionService.getTodayStatus();

  function openObjectSheet() {
    navigation.navigate('Settings');
  }

  function openStats() {
    navigation.navigate('Stats');
  }

  function handleDismissBanner() {
    storage.remove(STORAGE_KEYS.ACTIVE_PROFILE);
    reloadChips();
    streakService.recomputeAndCache();
    refresh();
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
        {activeProfile && <DevBanner profileName={activeProfile} onDismiss={handleDismissBanner} />}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}>
          <HomeHeader onSettingsPress={openObjectSheet} onStatsPress={openStats} />
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
      {activeProfile && <DevBanner profileName={activeProfile} onDismiss={handleDismissBanner} />}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HomeHeader onSettingsPress={openObjectSheet} onStatsPress={openStats} />
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
            onDelete={
              s.stage === 'complete' && isWithinGraceWindow(s.updated_at)
                ? () => {
                    sessionService.deleteSession(s.id);
                    streakService.recomputeAndCache();
                    setSessions(sessionService.getTodaysSessions());
                  }
                : undefined
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
            onDelete={
              checkins[slot.type] && isWithinGraceWindow(checkins[slot.type]!.created_at)
                ? () => {
                    checkinService.deleteCheckin(checkins[slot.type]!.id);
                    setCheckins(checkinService.getTodayCheckins());
                  }
                : undefined
            }
          />
        ))}

        <MiniStatsCard streak={streak} onPress={openStats} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HomeHeader({
  onSettingsPress,
  onStatsPress,
}: {
  onSettingsPress: () => void;
  onStatsPress: () => void;
}) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.dateLabel}>{formatDisplayDate()}</Text>
        <Text style={styles.greeting}>{getGreeting()}</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={onStatsPress}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Rect x="3" y="13" width="4" height="8" rx="1" fill={Colors.inkFaint} />
            <Rect x="10" y="6" width="4" height="15" rx="1" fill={Colors.inkFaint} />
            <Rect x="17" y="9" width="4" height="12" rx="1" fill={Colors.inkFaint} />
          </Svg>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onSettingsPress}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"
              fill={Colors.inkFaint}
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DevBanner({profileName, onDismiss}: {profileName: string; onDismiss: () => void}) {
  const display = profileName.charAt(0).toUpperCase() + profileName.slice(1);
  return (
    <View style={styles.devBanner}>
      <Text style={styles.devBannerText}>[DEV] Viewing as {display}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Text style={styles.devBannerClose}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function MiniStatsCard({streak, onPress}: {streak: number; onPress: () => void}) {
  const totalSits = statsRepository.getTotalSits();
  return (
    <TouchableOpacity style={styles.miniStatsCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStatBlock}>
          <Text style={styles.miniStatNum}>{streak}</Text>
          <Text style={styles.miniStatLabel}>day streak</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStatBlock}>
          <Text style={styles.miniStatNum}>{totalSits}</Text>
          <Text style={styles.miniStatLabel}>total sits</Text>
        </View>
      </View>
      <Text style={styles.miniStatsLink}>Patterns →</Text>
    </TouchableOpacity>
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
  onDelete,
}: {
  session: Session;
  objectName: string;
  onCompletePress: () => void;
  onDelete?: () => void;
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
      {onDelete && (
        <TouchableOpacity style={styles.deleteInline} onPress={onDelete}>
          <Text style={styles.deleteInlineText}>Delete entry</Text>
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
  onDelete,
}: {
  label: string;
  time: string;
  checkin: Checkin | null;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const done = checkin !== null;
  return (
    <View style={styles.checkinRowWrap}>
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
        <View style={styles.checkinRight}>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Text style={styles.checkinDeleteText}>Delete</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.checkinCircle, done && styles.checkinCircleDone]}>
            {done && <Text style={styles.checkinCheck}>✓</Text>}
          </View>
        </View>
      </TouchableOpacity>
    </View>
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
  deleteInline: {
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: Colors.stone100,
    alignItems: 'flex-start',
  },
  deleteInlineText: {fontSize: 12, fontFamily: 'Newsreader-Regular', color: Colors.clay},

  // Check-in row
  checkinRowWrap: {marginBottom: 7},
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
  },
  checkinLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  checkinRight: {flexDirection: 'row', alignItems: 'center', gap: 10},
  checkinDeleteText: {fontSize: 12, fontFamily: 'Newsreader-Regular', color: Colors.clay},
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

  // Header actions
  headerActions: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sp2},
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.stone100,
    borderWidth: 1,
    borderColor: Colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mini stats card
  miniStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: Spacing.sp5,
    marginBottom: Spacing.sp3,
  },
  miniStatsRow: {flexDirection: 'row', alignItems: 'center', gap: 16},
  miniStatBlock: {alignItems: 'center', minWidth: 48},
  miniStatNum: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 26,
    color: Colors.ink,
    lineHeight: 30,
  },
  miniStatLabel: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 11,
    color: Colors.inkGhost,
    marginTop: 1,
  },
  miniStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.sepia,
  },
  miniStatsLink: {
    ...Typography.label,
    color: Colors.moss,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#c0392b',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  devBannerText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 13,
    color: '#fff',
  },
  devBannerClose: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 16,
    color: '#fff',
    opacity: 0.85,
  },
});
