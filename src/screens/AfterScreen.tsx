import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {ChipGrid} from '../components/ChipGrid';
import {StagePips} from '../components/StagePips';
import {CHIP_LIST} from '../constants/chips';
import {chipMap} from '../db';
import {sessionService, meditationObjectService, streakService} from '../services';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {formatTimestamp} from '../utils/date';
import type {RootStackParamList} from '../navigation/types';
import {LocalSessionRepository} from '../repositories/LocalSessionRepository';

type Nav = NativeStackNavigationProp<RootStackParamList, 'After'>;
type Route = RouteProp<RootStackParamList, 'After'>;

const sessionRepo = new LocalSessionRepository();

export function AfterScreen() {
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<Route>();
  const {sessionId} = params;

  const session = sessionRepo.findById(sessionId);
  const currentObject = meditationObjectService.getCurrentObject();

  // Before recap
  const beforeLabels: string[] = session?.before_mind
    ? (JSON.parse(session.before_mind) as number[]).map(
        id => chipMap.get(id)?.label ?? '?',
      )
    : [];

  // Duration
  const defaultDuration = storage.getNumber(STORAGE_KEYS.DEFAULT_DURATION) ?? 1200;
  const [durationSeconds, setDurationSeconds] = useState(defaultDuration);

  function adjustDuration(delta: number) {
    setDurationSeconds(prev =>
      Math.min(10800, Math.max(60, prev + delta)),
    );
  }

  // Chip selections
  const [distractionIds, setDistractionIds] = useState<number[]>([]);
  const [bodyIds, setBodyIds] = useState<number[]>([]);
  const [emotionalIds, setEmotionalIds] = useState<number[]>([]);

  // Text fields
  const [strongestText, setStrongestText] = useState('');
  const [patternsText, setPatternsText] = useState('');
  const [bodyObsText, setBodyObsText] = useState('');
  const [emotionalObsText, setEmotionalObsText] = useState('');
  const [awarenessText, setAwarenessText] = useState('');
  const [lostText, setLostText] = useState('');

  function handleSave() {
    sessionService.completeAfterEntry(sessionId, {
      duration_seconds: durationSeconds,
      during_distractions: distractionIds.length
        ? JSON.stringify(distractionIds)
        : undefined,
      during_strongest: strongestText.trim() || undefined,
      during_patterns: patternsText.trim() || undefined,
      body_sensations: bodyIds.length ? JSON.stringify(bodyIds) : undefined,
      body_observations: bodyObsText.trim() || undefined,
      emotional_tone: emotionalIds.length
        ? JSON.stringify(emotionalIds)
        : undefined,
      emotional_observations: emotionalObsText.trim() || undefined,
      moments_of_awareness: awarenessText.trim() || undefined,
      lost_in_thought: lostText.trim() || undefined,
    });
    streakService.recomputeAndCache();
    navigation.popToTop();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          <StagePips current={2} />

          {/* Before recap card */}
          <View style={styles.recapCard}>
            <View style={styles.recapIcon}>
              <Text style={styles.recapIconText}>✓</Text>
            </View>
            <View style={styles.recapText}>
              <Text style={styles.recapChips} numberOfLines={1}>
                {beforeLabels.length > 0 ? beforeLabels.join(' · ') : '—'}
              </Text>
              <Text style={styles.recapMeta}>
                Before · {session?.start_time ? formatTimestamp(session.start_time) : '—'}
              </Text>
            </View>
          </View>

          {/* Duration */}
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>Duration</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => adjustDuration(-300)}>
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>
                {durationSeconds / 60} min
              </Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => adjustDuration(300)}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* During */}
          <SectionDivider label="DURING" />

          <Text style={styles.prompt}>What repeatedly pulled attention away?</Text>
          <ChipGrid
            listName={CHIP_LIST.DISTRACTIONS}
            selectedIds={distractionIds}
            onToggle={id =>
              setDistractionIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
              )
            }
          />
          <JournalField
            prompt="What captured the mind most strongly?"
            value={strongestText}
            onChange={setStrongestText}
            rows={2}
          />
          <JournalField
            prompt="Did you notice any repeating patterns?"
            value={patternsText}
            onChange={setPatternsText}
            rows={2}
          />

          {/* Body & Emotion */}
          <SectionDivider label="BODY & EMOTION" />

          <Text style={styles.prompt}>What was happening in the body?</Text>
          <ChipGrid
            listName={CHIP_LIST.BODY_SENSATIONS}
            selectedIds={bodyIds}
            onToggle={id =>
              setBodyIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
              )
            }
          />
          <JournalField
            prompt="Other observations"
            value={bodyObsText}
            onChange={setBodyObsText}
            rows={2}
          />

          <Text style={[styles.prompt, {marginTop: Spacing.sp4}]}>
            What emotional tone colored the meditation?
          </Text>
          <ChipGrid
            listName={CHIP_LIST.FEELINGS}
            selectedIds={emotionalIds}
            onToggle={id =>
              setEmotionalIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
              )
            }
            columns={3}
          />
          <JournalField
            prompt="Other observations"
            value={emotionalObsText}
            onChange={setEmotionalObsText}
            rows={2}
          />

          {/* Moments of awareness */}
          <SectionDivider label="MOMENTS OF AWARENESS" />

          <JournalField
            prompt="Was there any moment of…"
            placeholder="Clarity, stillness, equanimity, simple presence…"
            value={awarenessText}
            onChange={setAwarenessText}
            rows={3}
          />
          <JournalField
            prompt="Did you catch yourself becoming lost in thought? What happened?"
            value={lostText}
            onChange={setLostText}
            rows={3}
          />

          {/* Save */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save entry</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionDivider({label}: {label: string}) {
  return (
    <View style={divStyles.row}>
      <View style={divStyles.line} />
      <Text style={divStyles.label}>{label}</Text>
      <View style={divStyles.line} />
    </View>
  );
}

const divStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sp5,
    gap: 10,
  },
  line: {flex: 1, height: 1, backgroundColor: Colors.sepia},
  label: {...Typography.micro},
});

function JournalField({
  prompt,
  placeholder,
  value,
  onChange,
  rows,
}: {
  prompt: string;
  placeholder?: string;
  value: string;
  onChange: (t: string) => void;
  rows: number;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.prompt}>{prompt}</Text>
      <TextInput
        style={[fieldStyles.input, {minHeight: rows * 38}]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.sepia}
        multiline
        numberOfLines={rows}
        textAlignVertical="top"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: {marginTop: Spacing.sp4},
  prompt: {...Typography.micro, marginBottom: Spacing.sp2},
  input: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: 'Newsreader-Regular',
    fontSize: 15,
    color: Colors.inkSoft,
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  scroll: {flex: 1},
  content: {
    paddingHorizontal: 20,
    paddingTop: Spacing.sp4,
    paddingBottom: 48,
  },

  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.stone100,
    borderRadius: Radius.md,
    padding: 12,
    gap: 10,
    marginBottom: Spacing.sp5,
  },
  recapIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.mossPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapIconText: {fontSize: 14, color: Colors.moss, fontWeight: '700'},
  recapText: {flex: 1},
  recapChips: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 14,
    color: Colors.inkSoft,
  },
  recapMeta: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: 2,
  },

  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sp2,
  },
  durationLabel: {...Typography.label, color: Colors.ink},
  stepper: {flexDirection: 'row', alignItems: 'center', gap: 12},
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.stone100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {fontSize: 18, color: Colors.inkSoft, lineHeight: 22},
  stepperValue: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 15,
    color: Colors.ink,
    minWidth: 56,
    textAlign: 'center',
  },

  prompt: {...Typography.micro, marginBottom: Spacing.sp2},

  saveBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sp6,
  },
  saveBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
  },
});
