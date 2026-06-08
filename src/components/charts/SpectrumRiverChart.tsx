import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle, Line, Rect, Text as SvgText} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {DayArc} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CHART_H = 180;
const LABEL_W = 36;
const PAD_R = 8;
const AXIS_H = 22;
const SVG_H = CHART_H + AXIS_H;
const SIT_DOT_R = 2.5;
const MAX_COLS = 60; // cap visible days to keep columns legible

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TernaryFracs = {tigerFrac: number; neutralFrac: number; donkeyFrac: number; total: number};

function ternaryFromArc(arc: DayArc): TernaryFracs {
  const slots = [arc.morning, arc.afternoon, arc.evening].filter(
    (v): v is number => v !== null,
  );
  const total = slots.length;
  if (total === 0) return {tigerFrac: 0, neutralFrac: 0, donkeyFrac: 0, total: 0};
  const tiger = slots.filter(v => v > 0.6).length;
  const donkey = slots.filter(v => v < 0.4).length;
  const neutral = total - tiger - donkey;
  return {
    tigerFrac: tiger / total,
    neutralFrac: neutral / total,
    donkeyFrac: donkey / total,
    total,
  };
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${d}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: DayArc[]};

export function SpectrumRiverChart({data}: Props) {
  const [width, setWidth] = useState(0);

  const drawable = data.filter(arc => ternaryFromArc(arc).total > 0);

  if (drawable.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete check-ins over multiple days to see your daily arc.
        </Text>
      </View>
    );
  }

  // Show most recent MAX_COLS days
  const visible = drawable.slice(-MAX_COLS);
  const n = visible.length;
  const plotW = width - LABEL_W - PAD_R;
  const step = n > 1 ? plotW / n : plotW;
  const colW = Math.max(2, Math.min(7, step - 1.5));

  return (
    <View
      style={styles.container}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={SVG_H}>
          {/* Horizontal hairlines at 25%, 50%, 75% */}
          {[0.25, 0.5, 0.75].map(v => (
            <Line
              key={v}
              x1={LABEL_W}
              y1={(1 - v) * CHART_H}
              x2={width - PAD_R}
              y2={(1 - v) * CHART_H}
              stroke={Colors.sepia}
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          <SvgText
            x={LABEL_W - 4}
            y={10}
            textAnchor="end"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            Tiger
          </SvgText>
          <SvgText
            x={LABEL_W - 4}
            y={CHART_H}
            textAnchor="end"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            Donkey
          </SvgText>

          {/* Ternary columns */}
          {visible.map((arc, i) => {
            const {tigerFrac, neutralFrac, donkeyFrac} = ternaryFromArc(arc);
            const cx = LABEL_W + (i + 0.5) * step;
            const x = cx - colW / 2;
            const colOpacity = arc.hasSit ? 0.85 : 0.45;

            const tigerH = tigerFrac * CHART_H;
            const neutralH = neutralFrac * CHART_H;
            const donkeyH = donkeyFrac * CHART_H;

            return (
              <React.Fragment key={arc.date}>
                {tigerH > 0 && (
                  <Rect
                    x={x}
                    y={0}
                    width={colW}
                    height={tigerH}
                    fill={Colors.moss}
                    opacity={colOpacity}
                  />
                )}
                {neutralH > 0 && (
                  <Rect
                    x={x}
                    y={tigerH}
                    width={colW}
                    height={neutralH}
                    fill={Colors.inkGhost}
                    opacity={colOpacity * 0.7}
                  />
                )}
                {donkeyH > 0 && (
                  <Rect
                    x={x}
                    y={tigerH + neutralH}
                    width={colW}
                    height={donkeyH}
                    fill={Colors.clay}
                    opacity={colOpacity}
                  />
                )}
                {/* Sit-day dot below the column */}
                {arc.hasSit && (
                  <Circle
                    cx={cx}
                    cy={CHART_H - SIT_DOT_R - 1}
                    r={SIT_DOT_R}
                    fill={Colors.moss}
                    opacity={0.9}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* X-axis date labels */}
          {visible.length > 0 && (
            <>
              <SvgText
                x={LABEL_W}
                y={CHART_H + AXIS_H - 4}
                textAnchor="start"
                fontSize={9}
                fontFamily="Newsreader-Regular"
                fill={Colors.inkGhost}>
                {formatDate(visible[0].date)}
              </SvgText>
              <SvgText
                x={width - PAD_R}
                y={CHART_H + AXIS_H - 4}
                textAnchor="end"
                fontSize={9}
                fontFamily="Newsreader-Regular"
                fill={Colors.inkGhost}>
                Now
              </SvgText>
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
