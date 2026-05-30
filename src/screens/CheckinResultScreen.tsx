import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CheckinResult'>;
type Route = RouteProp<RootStackParamList, 'CheckinResult'>;

const TYPE_LABELS = {
  morning: 'Morning check-in',
  afternoon: 'Afternoon check-in',
  evening: 'Evening check-in',
};

function getScoreLabel(score: number | null): string {
  if (score === null) return 'Nothing stood out';
  if (score >= 0.8) return 'Clear and aware';
  if (score >= 0.6) return 'Mostly aware';
  if (score >= 0.4) return 'Mixed';
  if (score >= 0.2) return 'Somewhat caught';
  return 'Caught in story';
}

const MARKER_SIZE = 22;

export function CheckinResultScreen() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const {dt_score, tiger, donkey, neutralCount, type} = params;

  const allNeutral = dt_score === null;
  const markerPosition = dt_score ?? 0.5; // 0.0 = full donkey, 1.0 = full tiger

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>

        {/* Dismiss */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => navigation.popToTop()}>
          <Text style={styles.dismissText}>×</Text>
        </TouchableOpacity>

        <View style={styles.main}>
          {/* Eyebrow + label */}
          <Text style={styles.eyebrow}>{TYPE_LABELS[type]}</Text>
          <Text style={styles.scoreLabel}>{getScoreLabel(dt_score)}</Text>

          {!allNeutral && (
            <Text style={styles.scoreLine}>
              {tiger} tiger · {donkey} donkey · {neutralCount} neutral
            </Text>
          )}

          {/* Meter */}
          {!allNeutral && (
            <View style={styles.meterSection}>
              <View style={styles.meterTrack}>
                <View style={[styles.meterSegment, {backgroundColor: Colors.clayPale}]} />
                <View style={[styles.meterSegment, {backgroundColor: Colors.sepia}]} />
                <View style={[styles.meterSegment, {backgroundColor: Colors.mossPale}]} />
                {/* Marker */}
                <View
                  style={[
                    styles.meterMarker,
                    {
                      left: `${markerPosition * 100}%` as any,
                      marginLeft: -(MARKER_SIZE / 2),
                    },
                  ]}
                />
              </View>
              <View style={styles.meterLabels}>
                <Text style={styles.donkeyLabel}>🫏 Donkey</Text>
                <Text style={styles.tigerLabel}>Tiger 🐯</Text>
              </View>
            </View>
          )}

          {allNeutral && (
            <Text style={styles.quietNote}>
              A quiet check-in — nothing stood out strongly.
            </Text>
          )}

          {/* Breakdown */}
          <View style={styles.breakdown}>
            <BreakdownBox value={tiger} label="Tiger" color={Colors.mossDeep} />
            <BreakdownBox value={donkey} label="Donkey" color={Colors.clay} />
            <BreakdownBox value={neutralCount} label="Neutral" color={Colors.inkFaint} />
          </View>
        </View>

        {/* Done */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.popToTop()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function BreakdownBox({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={boxStyles.box}>
      <Text style={[boxStyles.number, {color}]}>{value}</Text>
      <Text style={boxStyles.caption}>{label.toUpperCase()}</Text>
    </View>
  );
}

const boxStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  number: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 24,
    marginBottom: 4,
  },
  caption: {...Typography.micro},
});

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Spacing.sp5,
    paddingBottom: Spacing.sp5,
    justifyContent: 'space-between',
  },

  dismissBtn: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sepia,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sp5,
  },
  dismissText: {fontSize: 18, color: Colors.inkFaint, lineHeight: 28},

  main: {flex: 1, justifyContent: 'center'},

  eyebrow: {...Typography.micro, marginBottom: 8},
  scoreLabel: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 30,
    color: Colors.ink,
    marginBottom: 8,
  },
  scoreLine: {...Typography.label, color: Colors.inkFaint, marginBottom: Spacing.sp6},
  quietNote: {
    ...Typography.body,
    color: Colors.inkSoft,
    textAlign: 'center',
    marginBottom: Spacing.sp6,
  },

  meterSection: {marginBottom: Spacing.sp7},
  meterTrack: {
    height: 14,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  meterSegment: {flex: 1},
  meterMarker: {
    position: 'absolute',
    top: -(MARKER_SIZE - 14) / 2,
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: Colors.moss,
    borderWidth: 3,
    borderColor: Colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  donkeyLabel: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 11,
    color: Colors.clay,
  },
  tigerLabel: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 11,
    color: Colors.mossDeep,
  },

  breakdown: {
    flexDirection: 'row',
    gap: Spacing.sp2,
    marginTop: Spacing.sp7,
  },

  doneBtn: {
    backgroundColor: Colors.ink,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: Spacing.sp5,
  },
  doneBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.paper,
  },
});
