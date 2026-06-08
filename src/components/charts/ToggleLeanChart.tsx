import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {ToggleHistory} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const LABEL_W = 120;
const ROW_H = 28;
const ROW_GAP = 10;
const DOT_R = 3.5;
const DOT_STEP = DOT_R * 2 + 3; // 10px per dot

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOT_COLOR = {
  tiger: Colors.moss,
  donkey: Colors.clay,
  neither: Colors.inkGhost,
};

const DOT_OPACITY = {
  tiger: 0.85,
  donkey: 0.85,
  neither: 0.4,
};

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: ToggleHistory[]};

export function ToggleLeanChart({data}: Props) {
  const [barAreaW, setBarAreaW] = useState(0);

  const hasAnyData = data.some(t => t.states.length > 0);

  if (!hasAnyData) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete a few check-ins to see your D/T toggle history.
        </Text>
      </View>
    );
  }

  const maxFit = barAreaW > 0 ? Math.floor(barAreaW / DOT_STEP) : 0;

  return (
    <View style={styles.chart}>
      {/* Header */}
      <View style={styles.headers}>
        <View style={{width: LABEL_W}} />
        <View style={styles.headerBar}>
          <Text style={styles.headerLabel}>older</Text>
          <Text style={styles.headerLabel}>recent →</Text>
        </View>
      </View>

      {/* Rows */}
      <View
        style={styles.rows}
        onLayout={e => setBarAreaW(e.nativeEvent.layout.width - LABEL_W)}>
        {data.map((item, i) => {
          const visible = maxFit > 0 ? item.states.slice(-maxFit) : [];

          return (
            <View
              key={item.name}
              style={[styles.row, i > 0 && {marginTop: ROW_GAP}]}>
              <Text style={styles.label} numberOfLines={2}>
                {item.name}
              </Text>
              {barAreaW > 0 && (
                <Svg width={barAreaW} height={ROW_H}>
                  {visible.map((state, j) => (
                    <Circle
                      key={j}
                      cx={j * DOT_STEP + DOT_R}
                      cy={ROW_H / 2}
                      r={DOT_R}
                      fill={DOT_COLOR[state]}
                      opacity={DOT_OPACITY[state]}
                    />
                  ))}
                </Svg>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    width: '100%',
  },
  headers: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  headerBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerLabel: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 10,
    color: Colors.inkFaint,
    letterSpacing: 0.3,
  },
  rows: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_H,
  },
  label: {
    width: LABEL_W,
    fontFamily: 'Newsreader-Regular',
    fontSize: 11,
    color: Colors.inkSoft,
    lineHeight: 15,
    paddingRight: 6,
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
