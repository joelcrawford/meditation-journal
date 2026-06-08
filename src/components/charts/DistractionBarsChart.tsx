import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle, Line, Rect} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {ChipFrequency} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const LABEL_W = 88;
const COUNT_W = 30;
const ROW_H = 26;
const ROW_GAP = 10;
const BAR_H = 8;
const DOT_R = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trendColor(trend: 'up' | 'stable' | 'down'): string {
  if (trend === 'down') return Colors.moss;    // decreasing = improving
  if (trend === 'up') return Colors.clay;      // increasing = worsening
  return Colors.inkGhost;                      // stable
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: ChipFrequency[]};

export function DistractionBarsChart({data}: Props) {
  const [barAreaW, setBarAreaW] = useState(0);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete a few sits to see your top distractions.
        </Text>
      </View>
    );
  }

  const maxCount = data[0].count;

  return (
    <View
      style={styles.chart}
      onLayout={e =>
        setBarAreaW(e.nativeEvent.layout.width - LABEL_W - COUNT_W)
      }>
      {data.map((item, i) => {
        const filledW =
          barAreaW > 0
            ? Math.max(0, (item.count / maxCount) * (barAreaW - DOT_R))
            : 0;
        const cy = ROW_H / 2;
        const barY = (ROW_H - BAR_H) / 2;

        const color = trendColor(item.trend);

        return (
          <View
            key={item.label}
            style={[styles.row, i > 0 && {marginTop: ROW_GAP}]}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            {barAreaW > 0 && (
              <Svg width={barAreaW} height={ROW_H}>
                {/* floor hairline */}
                <Line
                  x1={0}
                  y1={cy}
                  x2={barAreaW}
                  y2={cy}
                  stroke={Colors.sepia}
                  strokeWidth={1}
                />
                {/* bar */}
                <Rect
                  x={0}
                  y={barY}
                  width={filledW}
                  height={BAR_H}
                  rx={3}
                  fill={color}
                />
                {/* end-dot */}
                <Circle cx={filledW} cy={cy} r={DOT_R} fill={color} />
              </Svg>
            )}
            <Text style={styles.count}>{item.count}×</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_H,
  },
  label: {
    width: LABEL_W,
    fontFamily: 'Newsreader-Regular',
    fontSize: 12,
    color: Colors.inkSoft,
    paddingRight: 6,
  },
  count: {
    width: COUNT_W,
    fontFamily: 'Newsreader-Regular',
    fontSize: 11,
    color: Colors.inkFaint,
    textAlign: 'right',
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
