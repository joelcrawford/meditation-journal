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
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {ChipGrid} from '../components/ChipGrid';
import {StagePips} from '../components/StagePips';
import {CHIP_LIST} from '../constants/chips';
import {sessionService, meditationObjectService} from '../services';
import {notificationService} from '../services/NotificationService';
import {getDayCount} from '../utils/date';
import type {RootStackParamList} from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Before'>;

export function BeforeScreen() {
  const navigation = useNavigation<Nav>();
  const currentObject = meditationObjectService.getCurrentObject();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [observations, setObservations] = useState('');

  function toggleChip(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  function saveBeforeEntry() {
    return sessionService.createBeforeEntry({
      meditation_object_id: currentObject.id,
      before_mind: selectedIds.length ? JSON.stringify(selectedIds) : undefined,
      before_observations: observations.trim() || undefined,
    });
  }

  function handleStartSitting() {
    const session = saveBeforeEntry();
    notificationService.scheduleIncompleteSessionFollowUp(session.id);
    navigation.navigate('Timer', {sessionId: session.id});
  }

  function handleCompleteNow() {
    const session = saveBeforeEntry();
    navigation.navigate('After', {sessionId: session.id});
  }

  const dayCount = getDayCount(currentObject.start_date);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          <StagePips current={1} />

          {/* Object pill */}
          <View style={styles.objectPill}>
            <Text style={styles.objectPillText}>
              ◉ {currentObject.name} · Day {dayCount}
            </Text>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>How does the mind feel?</Text>
          <Text style={styles.subheading}>
            Take a moment before sitting. No right answers.
          </Text>

          {/* Mind state chips */}
          <Text style={styles.prompt}>Select all that apply</Text>
          <ChipGrid
            listName={CHIP_LIST.BEFORE_MIND}
            selectedIds={selectedIds}
            onToggle={toggleChip}
          />

          {/* Observations */}
          <Text style={[styles.prompt, {marginTop: Spacing.sp5}]}>
            Other observations
          </Text>
          <TextInput
            style={styles.textarea}
            value={observations}
            onChangeText={setObservations}
            placeholder="Anything else worth noting…"
            placeholderTextColor={Colors.sepia}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          {/* CTAs */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleStartSitting}>
            <Text style={styles.primaryBtnText}>→ Start sitting</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleCompleteNow}>
            <Text style={styles.secondaryBtnText}>Complete entry now</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Use "Complete entry" if you're filling this in after the sit
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  scroll: {flex: 1},
  content: {
    paddingHorizontal: 20,
    paddingTop: Spacing.sp4,
    paddingBottom: 40,
  },

  objectPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.mossPale,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: Spacing.sp5,
  },
  objectPillText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 13,
    color: Colors.mossDeep,
  },

  heading: {
    ...Typography.title,
    color: Colors.ink,
    marginBottom: 6,
  },
  subheading: {
    ...Typography.body,
    color: Colors.inkSoft,
    marginBottom: Spacing.sp5,
  },

  prompt: {
    ...Typography.micro,
    marginBottom: Spacing.sp2,
  },

  textarea: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.md,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontFamily: 'Newsreader-Regular',
    fontSize: 15,
    color: Colors.inkSoft,
    minHeight: 68,
  },

  primaryBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sp6,
    marginBottom: Spacing.sp2,
  },
  primaryBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: Spacing.sp3,
  },
  secondaryBtnText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 15,
    color: Colors.inkFaint,
  },

  hint: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
