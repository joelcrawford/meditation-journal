import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActionSheetIOS,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {notificationService} from '../services/NotificationService';
import {getDb} from '../db';
import {bellDisplayName} from '../constants/bells';
import {seedProfile, type ProfileName} from '../db/seedProfiles';
import {streakService} from '../services';
import type {RootStackParamList} from '../navigation/types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkgVersion: string = require('../../package.json').version;

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

function timeStrToDate(str: string): Date {
  const [h, m] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimeStr(str: string): string {
  const [h, m] = str.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const PROFILE_NAMES: ProfileName[] = ['bill', 'sally', 'maryanne', 'bartholemew'];
const PROFILE_DISPLAY: Record<ProfileName, string> = {
  bill: 'Bill (7 days, beginner)',
  sally: 'Sally (14 days, early practice)',
  maryanne: 'Maryanne (50 days, developing)',
  bartholemew: 'Bartholemew (150 days, experienced)',
};

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  const [adminTapCount, setAdminTapCount] = useState(0);
  const [adminEnabled, setAdminEnabled] = useState(
    storage.getBoolean(STORAGE_KEYS.ADMIN_ENABLED) ?? false,
  );
  const [activeProfile, setActiveProfile] = useState<string | undefined>(
    storage.getString(STORAGE_KEYS.ACTIVE_PROFILE),
  );

  const [morningTime, setMorningTime] = useState(
    storage.getString(STORAGE_KEYS.NOTIF_MORNING) ?? '08:00',
  );
  const [afternoonTime, setAfternoonTime] = useState(
    storage.getString(STORAGE_KEYS.NOTIF_AFTERNOON) ?? '13:00',
  );
  const [eveningTime, setEveningTime] = useState(
    storage.getString(STORAGE_KEYS.NOTIF_EVENING) ?? '19:00',
  );
  const [morningOn, setMorningOn] = useState(
    storage.getBoolean(STORAGE_KEYS.NOTIF_MORNING_ENABLED) ?? true,
  );
  const [afternoonOn, setAfternoonOn] = useState(
    storage.getBoolean(STORAGE_KEYS.NOTIF_AFTERNOON_ENABLED) ?? true,
  );
  const [eveningOn, setEveningOn] = useState(
    storage.getBoolean(STORAGE_KEYS.NOTIF_EVENING_ENABLED) ?? true,
  );
  const [showPicker, setShowPicker] = useState<'morning' | 'afternoon' | 'evening' | null>(null);

  const [currentBell, setCurrentBell] = useState(
    storage.getString(STORAGE_KEYS.BELL_SOUND) ?? 'tibetan-bowl',
  );

  // Refresh bell name when returning from picker
  useFocusEffect(() => {
    setCurrentBell(storage.getString(STORAGE_KEYS.BELL_SOUND) ?? 'tibetan-bowl');
  });

  function handleVersionTap() {
    const next = adminTapCount + 1;
    setAdminTapCount(next);
    if (next >= 5) {
      setAdminTapCount(0);
      const enabling = !adminEnabled;
      storage.set(STORAGE_KEYS.ADMIN_ENABLED, enabling);
      setAdminEnabled(enabling);
      if (!enabling) {
        storage.remove(STORAGE_KEYS.ACTIVE_PROFILE);
        setActiveProfile(undefined);
      }
    }
  }

  function handlePickProfile() {
    const options = [
      ...PROFILE_NAMES.map(n => PROFILE_DISPLAY[n]),
      'Reset to real data',
      'Cancel',
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Load test profile',
        message: 'This permanently replaces all app data.',
        options,
        destructiveButtonIndex: options.length - 2,
        cancelButtonIndex: options.length - 1,
      },
      buttonIndex => {
        if (buttonIndex === options.length - 1) return; // Cancel
        if (buttonIndex === options.length - 2) {
          // Reset to real data — same wipe as the main Reset button
          Alert.alert(
            'Reset all data?',
            'All sessions, check-ins, and preferences will be permanently deleted.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                  storage.remove(STORAGE_KEYS.ACTIVE_PROFILE);
                  setActiveProfile(undefined);
                  doReset();
                },
              },
            ],
          );
          return;
        }
        const name = PROFILE_NAMES[buttonIndex];
        const display = PROFILE_DISPLAY[name];
        Alert.alert(
          `Load ${display.split(' (')[0]}?`,
          'This permanently replaces all your current data with seed data. There is no undo.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Load profile',
              style: 'destructive',
              onPress: () => {
                seedProfile(name);
                streakService.recomputeAndCache();
                storage.set(STORAGE_KEYS.ACTIVE_PROFILE, name);
                setActiveProfile(name);
                navigation.popToTop();
              },
            },
          ],
        );
      },
    );
  }

  function handleTimeChange(
    slot: 'morning' | 'afternoon' | 'evening',
    _: unknown,
    date?: Date,
  ) {
    setShowPicker(null);
    if (!date) return;
    const str = dateToTimeStr(date);
    const key =
      slot === 'morning'
        ? STORAGE_KEYS.NOTIF_MORNING
        : slot === 'afternoon'
        ? STORAGE_KEYS.NOTIF_AFTERNOON
        : STORAGE_KEYS.NOTIF_EVENING;
    storage.set(key, str);
    if (slot === 'morning') setMorningTime(str);
    else if (slot === 'afternoon') setAfternoonTime(str);
    else setEveningTime(str);
    notificationService.reschedule();
  }

  function handleToggle(
    slot: 'morning' | 'afternoon' | 'evening',
    val: boolean,
  ) {
    const key =
      slot === 'morning'
        ? STORAGE_KEYS.NOTIF_MORNING_ENABLED
        : slot === 'afternoon'
        ? STORAGE_KEYS.NOTIF_AFTERNOON_ENABLED
        : STORAGE_KEYS.NOTIF_EVENING_ENABLED;
    storage.set(key, val);
    if (slot === 'morning') setMorningOn(val);
    else if (slot === 'afternoon') setAfternoonOn(val);
    else setEveningOn(val);
    notificationService.reschedule();
  }

  function confirmReset() {
    Alert.alert(
      'Reset all data?',
      'All sessions, check-ins, and preferences will be permanently deleted.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: doReset,
        },
      ],
    );
  }

  function doReset() {
    const db = getDb();
    db.executeSync('DELETE FROM sessions');
    db.executeSync('DELETE FROM checkins');
    db.executeSync('DELETE FROM meditation_objects');
    const now = Math.floor(Date.now() / 1000);
    db.executeSync(
      `INSERT INTO meditation_objects (name, description, start_date, is_active, created_at)
       VALUES ('Breath', 'Default object — update or replace anytime', ?, 1, ?)`,
      [now, now],
    );
    storage.clearAll();
    storage.set(STORAGE_KEYS.DEFAULT_DURATION, 1200);
    notificationService.reschedule();
    navigation.popToTop();
  }

  const slots = [
    {id: 'morning' as const, label: 'Morning', icon: '☀', time: morningTime, on: morningOn, iconBg: Colors.clayPale, iconColor: Colors.clay},
    {id: 'afternoon' as const, label: 'Afternoon', icon: '☀', time: afternoonTime, on: afternoonOn, iconBg: Colors.clayPale, iconColor: Colors.clay},
    {id: 'evening' as const, label: 'Evening', icon: '🌙', time: eveningTime, on: eveningOn, iconBg: Colors.mossPale, iconColor: Colors.moss},
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Meditation */}
        <Text style={styles.sectionLabel}>MEDITATION</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            onPress={() => navigation.navigate('MeditationObjectSheet')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, {backgroundColor: Colors.mossPale}]}>
                <Text style={styles.iconText}>◉</Text>
              </View>
              <View>
                <Text style={styles.rowLabel}>Meditation object</Text>
                <Text style={styles.rowSub}>Change your current focus</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('BellPicker')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, {backgroundColor: Colors.mossPale}]}>
                <Text style={styles.iconText}>🔔</Text>
              </View>
              <View>
                <Text style={styles.rowLabel}>Bell sound</Text>
                <Text style={styles.rowSub}>{bellDisplayName(currentBell)}</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Check-in Notifications */}
        <Text style={styles.sectionLabel}>CHECK-IN NOTIFICATIONS</Text>
        <View style={styles.card}>
          {slots.map((slot, i) => (
            <View
              key={slot.id}
              style={[styles.row, i < slots.length - 1 && styles.rowBorder]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, {backgroundColor: slot.iconBg}]}>
                  <Text style={[styles.iconText, {color: slot.iconColor}]}>{slot.icon}</Text>
                </View>
                <View>
                  <Text style={styles.rowLabel}>{slot.label}</Text>
                  <Text style={styles.rowSub}>Daily reminder</Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                {slot.on && (
                  <TouchableOpacity
                    style={styles.timeBtn}
                    onPress={() => setShowPicker(slot.id)}>
                    <Text style={styles.timeText}>{formatTimeStr(slot.time)}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                )}
                <Switch
                  value={slot.on}
                  onValueChange={val => handleToggle(slot.id, val)}
                  trackColor={{false: Colors.sepia, true: Colors.moss}}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Time pickers */}
        {showPicker && (
          <DateTimePicker
            mode="time"
            display="spinner"
            value={timeStrToDate(
              showPicker === 'morning'
                ? morningTime
                : showPicker === 'afternoon'
                ? afternoonTime
                : eveningTime,
            )}
            onChange={(e, d) => handleTimeChange(showPicker, e, d)}
          />
        )}

        {/* Notification preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>PREVIEW</Text>
          {[{title: 'Morning check-in', time: formatTimeStr(morningTime)},
            {title: 'Afternoon check-in', time: formatTimeStr(afternoonTime)}].map((n, i) => (
            <View key={i} style={[styles.notifBubble, i > 0 && {marginTop: 7}]}>
              <View style={styles.notifIcon}>
                <Text style={styles.notifIconText}>🪷</Text>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody}>Take a moment to check in.</Text>
              </View>
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={1}
            onPress={handleVersionTap}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.infoValue}>{pkgVersion}</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Minimum iOS</Text>
            <Text style={styles.infoValue}>16.4</Text>
          </View>
        </View>

        {/* Admin (unlocked by 5 taps on Version) */}
        {adminEnabled && (
          <>
            <Text style={styles.sectionLabel}>ADMIN</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.row, styles.rowBorder]}
                onPress={handlePickProfile}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBox, {backgroundColor: '#fde8e8'}]}>
                    <Text style={styles.iconText}>🧪</Text>
                  </View>
                  <View>
                    <Text style={styles.rowLabel}>Test profile</Text>
                    <Text style={styles.rowSub}>
                      {activeProfile
                        ? PROFILE_DISPLAY[activeProfile as ProfileName].split(' (')[0]
                        : 'None — using real data'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.row}>
                <Text style={[styles.rowSub, {flex: 1}]}>
                  Tap Version 5x to hide this section. Profiles permanently replace all data.
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Data */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={confirmReset}>
            <Text style={styles.destructiveLabel}>Reset all data…</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  content: {paddingHorizontal: 20, paddingTop: Spacing.sp4, paddingBottom: 48},

  sectionLabel: {
    ...Typography.micro,
    marginBottom: Spacing.sp2,
    marginTop: Spacing.sp5,
  },

  card: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 18,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.stone100,
  },
  rowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  rowRight: {flexDirection: 'row', alignItems: 'center', gap: 8},

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {fontSize: 16},

  rowLabel: {...Typography.label, color: Colors.ink},
  rowSub: {...Typography.caption, marginTop: 1},

  timeBtn: {flexDirection: 'row', alignItems: 'center', gap: 2},
  timeText: {fontFamily: 'Newsreader-Medium', fontSize: 15, color: Colors.inkSoft},
  chevron: {fontSize: 18, color: Colors.sepia, lineHeight: 22},
  infoValue: {fontFamily: 'Newsreader-Regular', fontSize: 14, color: Colors.inkFaint},
  destructiveLabel: {fontFamily: 'Newsreader-Regular', fontSize: 15, color: Colors.clay},

  previewCard: {
    backgroundColor: Colors.stone100,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 14,
    padding: 13,
    marginTop: Spacing.sp3,
  },
  previewLabel: {...Typography.micro, marginBottom: Spacing.sp2},
  notifBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.paperCard,
    borderRadius: 11,
    padding: 11,
    gap: 10,
  },
  notifIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: Colors.moss,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIconText: {fontSize: 14},
  notifTitle: {fontFamily: 'Newsreader-Medium', fontSize: 13, color: Colors.ink},
  notifBody: {fontFamily: 'Newsreader-Regular', fontSize: 11, color: Colors.inkFaint, marginTop: 1},
  notifTime: {fontFamily: 'Newsreader-Regular', fontSize: 11, color: Colors.inkFaint, paddingTop: 1},
});
