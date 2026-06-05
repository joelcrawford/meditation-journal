import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle, Line, Rect} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {ToggleLean} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const LABEL_W = 120;
const ROW_H = 34;
const ROW_GAP = 8;
const BAR_H = 8;
const DOT_R = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function barColor(lean: number): string {
  if (lean > 0.6) return Colors.moss;
  if (lean < 0.4) return Colors.clay;
  return Colors.inkGhost;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: ToggleLean[]};

export function ToggleLeanChart({data}: Props) {
  const [barAreaW, setBarAreaW] = useState(0);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete a few check-ins to see your D/T toggle leans.
        </Text>
      </View>
    );
  }

  const cx = barAreaW / 2;
  const maxHalf = cx - DOT_R;
  const cy = ROW_H / 2;
  const barY = (ROW_H - BAR_H) / 2;

  return (
    <View style={styles.chart}>
      {/* Column headers */}
      <View style={styles.headers}>
        <View style={{width: LABEL_W}} />
        <View style={styles.headerBar}>
          <Text style={styles.headerLabel}>Donkey</Text>
          <Text style={styles.headerLabel}>Tiger</Text>
        </View>
      </View>

      {/* Rows */}
      <View
        style={styles.rows}
        onLayout={e => setBarAreaW(e.nativeEvent.layout.width - LABEL_W)}>
        {data.map((item, i) => {
          const deviation = item.lean - 0.5;
          const barW = Math.abs(deviation) * 2 * maxHalf;
          const isTiger = deviation >= 0;
          const barX = isTiger ? cx : cx - barW;
          const dotX = isTiger ? cx + barW : cx - barW;
          const color = barColor(item.lean);

          return (
            <View
              key={item.name}
              style={[styles.row, i > 0 && {marginTop: ROW_GAP}]}>
              <Text style={styles.label} numberOfLines={2}>
                {item.name}
              </Text>
              {barAreaW > 0 && (
                <Svg width={barAreaW} height={ROW_H}>
                  {/* centre hairline */}
                  <Line
                    x1={cx}
                    y1={0}
                    x2={cx}
                    y2={ROW_H}
                    stroke={Colors.sepia}
                    strokeWidth={1}
                  />
                  {/* bar */}
                  {barW > 0 && (
                    <Rect
                      x={barX}
                      y={barY}
                      width={barW}
                      height={BAR_H}
                      rx={3}
                      fill={color}
                    />
                  )}
                  {/* end-dot */}
                  {barW > 0 && (
                    <Circle cx={dotX} cy={cy} r={DOT_R} fill={color} />
                  )}
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
