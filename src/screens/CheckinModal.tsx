import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {ChipGrid} from '../components/ChipGrid';
import {DonkeyTigerRow} from '../components/DonkeyTigerRow';
import type {DTValue} from '../components/DonkeyTigerRow';
import {CHIP_LIST} from '../constants/chips';
import {chipMap} from '../db';
import {checkinService} from '../services';
import {getLocalDateString, formatTimestamp} from '../utils/date';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CheckinModal'>;
type Route = RouteProp<RootStackParamList, 'CheckinModal'>;

const TYPE_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export function CheckinModal() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const {checkinType} = params;

  const [postureIds, setPostureIds] = useState<number[]>([]);
  const [feelingsIds, setFeelingsIds] = useState<number[]>([]);
  const [emotionalIds, setEmotionalIds] = useState<number[]>([]);
  const [thoughtIds, setThoughtIds] = useState<number[]>([]);
  const [dtValues, setDtValues] = useState<DTValue[]>(Array(9).fill('neither'));

  const dtPairs = useMemo(() => {
    const donkey = Array.from(chipMap.values())
      .filter(c => c.list_name === CHIP_LIST.DT_DONKEY)
      .sort((a, b) => a.sort_order - b.sort_order);
    const tiger = Array.from(chipMap.values())
      .filter(c => c.list_name === CHIP_LIST.DT_TIGER)
      .sort((a, b) => a.sort_order - b.sort_order);
    return donkey.map((d, i) => ({donkey: d.label, tiger: tiger[i]?.label ?? ''}));
  }, []);

  function toggleChips(
    ids: number[],
    setIds: React.Dispatch<React.SetStateAction<number[]>>,
    id: number,
  ) {
    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  function toggleDT(idx: number, pole: 'donkey' | 'tiger') {
    setDtValues(prev => {
      const next = [...prev] as DTValue[];
      next[idx] = prev[idx] === pole ? 'neither' : pole;
      return next;
    });
  }

  function handleSave() {
    const tigerCount = dtValues.filter(v => v === 'tiger').length;
    const donkeyCount = dtValues.filter(v => v === 'donkey').length;
    const scored = tigerCount + donkeyCount;
    const dtScore = scored > 0 ? tigerCount / scored : null;
    const now = Math.floor(Date.now() / 1000);

    checkinService.createCheckin({
      timestamp: now,
      date: getLocalDateString(),
      type: checkinType,
      posture: postureIds.length ? JSON.stringify(postureIds) : undefined,
      feelings: feelingsIds.length ? JSON.stringify(feelingsIds) : undefined,
      emotional_tone: emotionalIds.length ? JSON.stringify(emotionalIds) : undefined,
      thoughts: thoughtIds.length ? JSON.stringify(thoughtIds) : undefined,
      donkey_tiger: JSON.stringify(dtValues),
      dt_score: dtScore,
      created_at: now,
    });

    navigation.replace('CheckinResult', {
      dt_score: dtScore,
      tiger: tigerCount,
      donkey: donkeyCount,
      neutralCount: 9 - tigerCount - donkeyCount,
      type: checkinType,
    });
  }

  const nowTs = Math.floor(Date.now() / 1000);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>
            {TYPE_LABELS[checkinType]} check-in
          </Text>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>
          {formatTimestamp(nowTs)} · How am I carrying myself right now?
        </Text>

        <Section label="POSTURE">
          <ChipGrid
            listName={CHIP_LIST.POSTURE}
            selectedIds={postureIds}
            onToggle={id => toggleChips(postureIds, setPostureIds, id)}
          />
        </Section>

        <Section label="FEELINGS">
          <ChipGrid
            listName={CHIP_LIST.FEELINGS}
            selectedIds={feelingsIds}
            onToggle={id => toggleChips(feelingsIds, setFeelingsIds, id)}
            columns={3}
          />
        </Section>

        <Section label="EMOTIONAL TONE">
          <ChipGrid
            listName={CHIP_LIST.EMOTIONAL_TONE}
            selectedIds={emotionalIds}
            onToggle={id => toggleChips(emotionalIds, setEmotionalIds, id)}
            columns={3}
          />
        </Section>

        <Section label="THOUGHTS">
          <ChipGrid
            listName={CHIP_LIST.THOUGHT_TYPES}
            selectedIds={thoughtIds}
            onToggle={id => toggleChips(thoughtIds, setThoughtIds, id)}
          />
        </Section>

        {/* Donkey/Tiger */}
        <View style={styles.dtSection}>
          <Text style={styles.dtLabel}>Donkey Tiger mind check</Text>
          <Text style={styles.dtPrompt}>
            For each, what felt most true? Tap a side, or leave neutral.
          </Text>
          <View style={styles.dtHeader}>
            <Text style={styles.dtDonkeyHeader}>🫏 Donkey</Text>
            <Text style={styles.dtTigerHeader}>Tiger 🐯</Text>
          </View>
          <View style={styles.dtRows}>
            {dtPairs.map((pair, i) => (
              <DonkeyTigerRow
                key={i}
                donkeyLabel={pair.donkey}
                tigerLabel={pair.tiger}
                value={dtValues[i]}
                onToggle={pole => toggleDT(i, pole)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save check-in</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {marginBottom: Spacing.sp5},
  label: {...Typography.micro, marginBottom: Spacing.sp2},
});

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paperCard},
  scroll: {flex: 1},
  content: {paddingHorizontal: 20, paddingBottom: 40},

  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.sepia,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {fontFamily: 'Fraunces-Regular', fontSize: 22, color: Colors.ink},
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {fontSize: 18, color: Colors.inkFaint, lineHeight: 28},
  meta: {...Typography.caption, marginBottom: Spacing.sp6},

  dtSection: {marginBottom: Spacing.sp5},
  dtLabel: {...Typography.micro, marginBottom: 4},
  dtPrompt: {...Typography.caption, marginBottom: Spacing.sp3},
  dtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sp2,
  },
  dtDonkeyHeader: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 11,
    color: Colors.clay,
  },
  dtTigerHeader: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 11,
    color: Colors.mossDeep,
  },
  dtRows: {gap: 7},

  saveBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
  },
});
