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
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Radius, Spacing, Typography} from '../theme';
import {meditationObjectService} from '../services';
import {getDayCount, formatDateRange} from '../utils/date';

export function MeditationObjectSheet() {
  const navigation = useNavigation();
  const currentObject = meditationObjectService.getCurrentObject();
  const history = meditationObjectService
    .getObjectHistory()
    .filter(o => o.is_active === 0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  function handleSetNewObject() {
    if (!name.trim()) return;
    meditationObjectService.setCurrentObject({
      name: name.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    navigation.goBack();
  }

  const dayCount = getDayCount(currentObject.start_date);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">

          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Meditation object</Text>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => navigation.goBack()}>
              <Text style={styles.dismissText}>×</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.meta}>Your current focus for practice</Text>

          {/* Current object card */}
          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>CURRENT OBJECT</Text>
            <View style={styles.currentRow}>
              <View style={styles.currentIconBg}>
                <Text style={styles.currentIconText}>◉</Text>
              </View>
              <View>
                <Text style={styles.currentName}>{currentObject.name}</Text>
                <Text style={styles.currentInfo}>
                  Day {dayCount} · Started{' '}
                  {formatDateRange(currentObject.start_date).replace(
                    ' – present',
                    '',
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Set new object */}
          <Text style={styles.sectionLabel}>SET NEW OBJECT</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Metta, body scan, open awareness…"
              placeholderTextColor={Colors.sepia}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Description{' '}
              <Text style={styles.optional}>Optional</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the practice…"
              placeholderTextColor={Colors.sepia}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Notes <Text style={styles.optional}>Optional</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Intentions, teacher instructions, anything to remember…"
              placeholderTextColor={Colors.sepia}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
            onPress={handleSetNewObject}
            disabled={!name.trim()}>
            <Text style={styles.primaryBtnText}>Set new object</Text>
          </TouchableOpacity>

          {/* Previous objects */}
          {history.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, {marginTop: Spacing.sp6}]}>
                PREVIOUS OBJECTS
              </Text>
              {history.map(obj => (
                <View key={obj.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <View style={styles.historyDot} />
                    <View>
                      <Text style={styles.historyName}>{obj.name}</Text>
                      <Text style={styles.historyDates}>
                        {formatDateRange(obj.start_date, obj.ended_date)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>
                      {getDayCount(obj.start_date, obj.ended_date)} days
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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

  meta: {...Typography.caption, marginBottom: 24},

  currentCard: {
    backgroundColor: Colors.ink,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  currentLabel: {
    fontSize: 11,
    fontFamily: 'Newsreader-Medium',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(250,250,248,0.4)',
    marginBottom: 10,
  },
  currentRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  currentIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(93,202,165,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentIconText: {fontSize: 16, color: Colors.mossBright},
  currentName: {fontSize: 15, fontFamily: 'Newsreader-Medium', color: Colors.paper},
  currentInfo: {fontSize: 11, color: 'rgba(250,250,248,0.45)', marginTop: 2},

  sectionLabel: {
    ...Typography.micro,
    marginBottom: Spacing.sp2,
  },

  fieldGroup: {marginBottom: 16},
  fieldLabel: {
    fontSize: 11,
    fontFamily: 'Newsreader-Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.inkFaint,
    marginBottom: 6,
  },
  optional: {
    fontSize: 11,
    fontFamily: 'Newsreader-Regular',
    textTransform: 'none',
    letterSpacing: 0,
    color: Colors.inkGhost,
  },
  input: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: 'Newsreader-Regular',
    color: Colors.inkSoft,
  },
  textarea: {
    height: 96,
    paddingTop: 11,
  },

  primaryBtn: {
    backgroundColor: Colors.moss,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sp3,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.mossPale,
  },
  primaryBtnText: {
    fontFamily: 'Newsreader-Medium',
    fontSize: 16,
    color: Colors.mossPale,
  },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 7,
  },
  historyLeft: {flexDirection: 'row', alignItems: 'center', gap: 10},
  historyDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.sepia,
  },
  historyName: {...Typography.label, color: Colors.inkSoft},
  historyDates: {fontSize: 11, color: Colors.inkFaint, marginTop: 1},
  daysBadge: {
    backgroundColor: Colors.stone100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  daysBadgeText: {fontSize: 11, fontFamily: 'Newsreader-Medium', color: Colors.inkFaint},
});
