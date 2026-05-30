import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {chipMap} from '../db';
import {Colors, Radius} from '../theme';
import type {ChipListName} from '../constants/chips';

type Props = {
  listName: ChipListName;
  selectedIds: number[];
  onToggle: (id: number) => void;
  columns?: 2 | 3;
};

export function ChipGrid({listName, selectedIds, onToggle, columns = 2}: Props) {
  const chips = Array.from(chipMap.values())
    .filter(c => c.list_name === listName)
    .sort((a, b) => a.sort_order - b.sort_order);

  const selectedSet = new Set(selectedIds);

  // Build rows
  const rows: typeof chips[] = [];
  for (let i = 0; i < chips.length; i += columns) {
    rows.push(chips.slice(i, i + columns));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map(chip => {
            const active = selectedSet.has(chip.id);
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                onPress={() => onToggle(chip.id)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : styles.chipTextInactive,
                  ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Fill empty slots in last row */}
          {row.length < columns &&
            Array.from({length: columns - row.length}).map((_, i) => (
              <View key={`empty-${i}`} style={styles.chip} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {gap: 6},
  row: {flexDirection: 'row', gap: 6},
  chip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.mossPale,
    borderColor: Colors.moss,
  },
  chipInactive: {
    backgroundColor: Colors.paperCard,
    borderColor: Colors.sepia,
  },
  chipText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  chipTextActive: {
    color: Colors.mossDeep,
    fontFamily: 'Newsreader-Medium',
  },
  chipTextInactive: {
    color: Colors.inkSoft,
  },
});
