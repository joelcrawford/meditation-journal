import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../theme';

type Props = {current: 1 | 2};

export function StagePips({current}: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.pip, styles.pipFilled]} />
      <View style={[styles.pip, current === 2 ? styles.pipFilled : styles.pipEmpty]} />
      <Text style={styles.label}>{current} of 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipFilled: {backgroundColor: Colors.moss},
  pipEmpty: {backgroundColor: Colors.sepia},
  label: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 12,
    color: Colors.inkFaint,
    marginLeft: 2,
  },
});
