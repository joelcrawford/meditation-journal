import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors, Spacing, Typography, Radius} from '../theme';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {bellService} from '../services/BellService';
import {BELL_STEMS, bellDisplayName} from '../constants/bells';

export function BellPickerScreen() {
  const [selected, setSelected] = useState(
    storage.getString(STORAGE_KEYS.BELL_SOUND) ?? 'tibetan-bowl',
  );

  function handleSelect(stem: string) {
    storage.set(STORAGE_KEYS.BELL_SOUND, stem);
    setSelected(stem);
    bellService.previewBell(stem).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Tap a bell to preview</Text>
        <View style={styles.card}>
          {BELL_STEMS.map((stem, i) => (
            <TouchableOpacity
              key={stem}
              style={[styles.row, i < BELL_STEMS.length - 1 && styles.rowBorder]}
              onPress={() => handleSelect(stem)}>
              <Text style={styles.rowLabel}>{bellDisplayName(stem)}</Text>
              {selected === stem && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.paper},
  content: {paddingHorizontal: 20, paddingTop: Spacing.sp4, paddingBottom: 48},

  hint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: Spacing.sp3,
  },

  card: {
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: Radius.lg,
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

  rowLabel: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 16,
    color: Colors.ink,
  },
  checkmark: {
    fontSize: 16,
    color: Colors.moss,
    fontWeight: '600',
  },
});
