import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Line} from 'react-native-svg';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {statsRepository} from '../repositories/StatsRepository';
import {MindDriftChart} from '../components/charts/MindDriftChart';
import {DistractionBarsChart} from '../components/charts/DistractionBarsChart';
import {ToggleLeanChart} from '../components/charts/ToggleLeanChart';
import {SpectrumRiverChart} from '../components/charts/SpectrumRiverChart';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Stats'>;

type TimeRange = 7 | 30 | 0;
const RANGES: {label: string; value: TimeRange}[] = [
  {label: '7d', value: 7},
  {label: '30d', value: 30},
  {label: 'All', value: 0},
];

export function StatsScreen() {
  const navigation = useNavigation<Nav>();
  const [range, setRange] = useState<TimeRange>(30);

  const driftData = useMemo(
    () => statsRepository.getBeforeMindDrift(range),
    [range],
  );
  const distractionData = useMemo(
    () => statsRepository.getDistractionFrequency(range),
    [range],
  );
  const toggleLeansData = useMemo(
    () => statsRepository.getToggleLeans(range),
    [range],
  );
  const riverData = useMemo(
    () => statsRepository.getSpectrumRiverData(range),
    [range],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Patterns</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Line x1="5" y1="5" x2="19" y2="19" stroke={Colors.inkFaint} strokeWidth={2} strokeLinecap="round" />
            <Line x1="19" y1="5" x2="5" y2="19" stroke={Colors.inkFaint} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      <View style={styles.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r.value}
            style={[styles.rangeBtn, range === r.value && styles.rangeBtnActive]}
            onPress={() => setRange(r.value)}>
            <Text
              style={[
                styles.rangeBtnText,
                range === r.value && styles.rangeBtnTextActive,
              ]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        <Text style={styles.sectionLabel}>BEFORE SITTING</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mind state drift</Text>
          <MindDriftChart data={driftData} />
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>THE PRACTICE</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Distractions during sits</Text>
          <DistractionBarsChart data={distractionData} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>D/T toggle leans</Text>
          <ToggleLeanChart data={toggleLeansData} />
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>CHECK-INS</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spectrum river</Text>
          <SpectrumRiverChart data={riverData} />
        </View>
        <PlaceholderCard
          title="Toggle map"
          detail="Scatter — lean × frequency, sized by consistency"
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>BY THE NUMBERS</Text>
        <PlaceholderCard
          title="Summary stats"
          detail="Total sits · streak · time · sitting since"
        />

      </ScrollView>
    </SafeAreaView>
  );
}

function PlaceholderCard({title, detail}: {title: string; detail: string}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDetail}>{detail}</Text>
      <View style={styles.cardPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sp5,
    paddingTop: Spacing.sp4,
    paddingBottom: Spacing.sp3,
  },
  title: {
    ...Typography.title,
    color: Colors.ink,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sp5,
    marginBottom: Spacing.sp4,
    backgroundColor: Colors.stone100,
    borderRadius: Radius.pill,
    padding: 3,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: Spacing.sp2,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  rangeBtnActive: {
    backgroundColor: Colors.paperCard,
    shadowColor: Colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  rangeBtnText: {
    ...Typography.label,
    color: Colors.inkGhost,
  },
  rangeBtnTextActive: {
    color: Colors.ink,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.sp5,
    paddingBottom: Spacing.sp8,
  },
  sectionLabel: {
    ...Typography.micro,
    marginBottom: Spacing.sp3,
  },
  sectionLabelSpaced: {
    marginTop: Spacing.sp6,
  },
  card: {
    backgroundColor: Colors.paperCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.sepia,
    padding: Spacing.sp4,
    marginBottom: Spacing.sp3,
  },
  cardTitle: {
    ...Typography.heading,
    color: Colors.ink,
    marginBottom: Spacing.sp1,
  },
  cardDetail: {
    ...Typography.caption,
    marginBottom: Spacing.sp4,
  },
  cardPlaceholder: {
    height: 120,
    backgroundColor: Colors.stone100,
    borderRadius: Radius.sm,
  },
});
