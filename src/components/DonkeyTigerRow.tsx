import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Colors} from '../theme';

export type DTValue = 'donkey' | 'tiger' | 'neither';

type Props = {
  donkeyLabel: string;
  tigerLabel: string;
  value: DTValue;
  onToggle: (pole: 'donkey' | 'tiger') => void;
};

export function DonkeyTigerRow({donkeyLabel, tigerLabel, value, onToggle}: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.pole, styles.poleLeft, value === 'donkey' && styles.donkeyActive]}
        onPress={() => onToggle('donkey')}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.poleText,
            styles.poleTextLeft,
            value === 'donkey' && styles.donkeyActiveText,
          ]}
          maxFontSizeMultiplier={1.4}>
          {donkeyLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pole, styles.poleRight, value === 'tiger' && styles.tigerActive]}
        onPress={() => onToggle('tiger')}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.poleText,
            styles.poleTextRight,
            value === 'tiger' && styles.tigerActiveText,
          ]}
          maxFontSizeMultiplier={1.4}>
          {tigerLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8},
  pole: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: Colors.sepia,
    backgroundColor: Colors.paperCard,
  },
  poleLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  poleRight: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  poleText: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 13,
    color: Colors.inkSoft,
  },
  poleTextLeft: {textAlign: 'left'},
  poleTextRight: {textAlign: 'right'},
  donkeyActive: {
    backgroundColor: Colors.clayPale,
    borderColor: Colors.clay,
  },
  donkeyActiveText: {
    color: Colors.clay,
    fontFamily: 'Newsreader-Medium',
  },
  tigerActive: {
    backgroundColor: Colors.mossPale,
    borderColor: Colors.moss,
  },
  tigerActiveText: {
    color: Colors.mossDeep,
    fontFamily: 'Newsreader-Medium',
  },
});
