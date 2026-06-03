import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {notificationService} from '../services/NotificationService';
import {getDb} from '../db';
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

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();

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
  const [defaultDuration, setDefaultDuration] = useState(
    Math.round((storage.getNumber(STORAGE_KEYS.DEFAULT_DURATION) ?? 1200) / 60),
  );

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

  function adjustDuration(delta: number) {
    const next = Math.min(180, Math.max(1, defaultDuration + delta));
    setDefaultDuration(next);
    storage.set(STORAGE_KEYS.DEFAULT_DURATION, next * 60);
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

        {/* Session Defaults */}
        <Text style={styles.sectionLabel}>SESSION DEFAULTS</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, {backgroundColor: Colors.mossPale}]}>
                <Text style={styles.iconText}>⏱</Text>
              </View>
              <View>
                <Text style={styles.rowLabel}>Default duration</Text>
                <Text style={styles.rowSub}>Pre-fills the duration stepper</Text>
              </View>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDuration(-5)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{defaultDuration} min</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => adjustDuration(5)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.row}
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
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.infoValue}>{pkgVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Minimum iOS</Text>
            <Text style={styles.infoValue}>16.4</Text>
          </View>
        </View>

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

  stepper: {flexDirection: 'row', alignItems: 'center', gap: 8},
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.stone100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {fontSize: 16, color: Colors.inkSoft, lineHeight: 20},
  stepValue: {fontFamily: 'Newsreader-Medium', fontSize: 14, color: Colors.ink, minWidth: 48, textAlign: 'center'},
});
