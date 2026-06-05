import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {BeforeMindPoint} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CHART_H = 160;  // plot area height
const LABEL_W = 68;   // left column for Y-axis labels
const PAD_R = 10;     // right padding
const AXIS_H = 20;    // bottom row for X-axis labels
const DOT_R = 3.5;

const SVG_H = CHART_H + AXIS_H;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALENCE: Record<string, number> = {settled: 1, mixed: 0.5, unsettled: 0};
const DOT_COLOR: Record<string, string> = {
  settled: Colors.moss,
  mixed: Colors.inkGhost,
  unsettled: Colors.clay,
};

function xPlot(i: number, n: number, w: number): number {
  const plotW = w - LABEL_W - PAD_R;
  return LABEL_W + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
}

function yPlot(valence: number): number {
  return (1 - valence) * CHART_H;
}

// Linear regression — returns predicted y at x=0 and x=n-1
function trendEnds(valences: number[]): {y0: number; y1: number} {
  const n = valences.length;
  if (n < 2) return {y0: valences[0] ?? 0.5, y1: valences[0] ?? 0.5};
  const mx = (n - 1) / 2;
  const my = valences.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (valences[i] - my);
    den += (i - mx) ** 2;
  }
  const m = den !== 0 ? num / den : 0;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {y0: clamp(my - m * mx), y1: clamp(my + m * mx)};
}

function formatOldestDate(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: BeforeMindPoint[]};

export function MindDriftChart({data}: Props) {
  const [width, setWidth] = useState(0);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete a few sits to see your mind-state pattern.
        </Text>
      </View>
    );
  }

  const valences = data.map(p => VALENCE[p.valenceGroup] ?? 0.5);
  const {y0, y1} = trendEnds(valences);
  const n = data.length;

  return (
    <View
      style={styles.container}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={SVG_H}>
          {/* Hairlines at 25%, 50%, 75% valence */}
          {[0.25, 0.5, 0.75].map(v => (
            <Line
              key={v}
              x1={LABEL_W}
              y1={yPlot(v)}
              x2={width - PAD_R}
              y2={yPlot(v)}
              stroke={Colors.sepia}
              strokeWidth={1}
            />
          ))}

          {/* Y-axis labels */}
          <SvgText
            x={LABEL_W - 6}
            y={10}
            textAnchor="end"
            fontSize={10}
            fontFamily="Newsreader-Medium"
            fill={Colors.inkFaint}>
            Settled
          </SvgText>
          <SvgText
            x={LABEL_W - 6}
            y={22}
            textAnchor="end"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            calm · open · clear
          </SvgText>
          <SvgText
            x={LABEL_W - 6}
            y={CHART_H - 13}
            textAnchor="end"
            fontSize={10}
            fontFamily="Newsreader-Medium"
            fill={Colors.inkFaint}>
            Unsettled
          </SvgText>
          <SvgText
            x={LABEL_W - 6}
            y={CHART_H - 1}
            textAnchor="end"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            scattered · heavy
          </SvgText>

          {/* Trend line */}
          {n >= 2 && (
            <Path
              d={`M ${xPlot(0, n, width)} ${yPlot(y0)} L ${xPlot(n - 1, n, width)} ${yPlot(y1)}`}
              stroke={Colors.inkGhost}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              opacity={0.55}
            />
          )}

          {/* Dots */}
          {data.map((point, i) => (
            <Circle
              key={`${point.date}-${i}`}
              cx={xPlot(i, n, width)}
              cy={yPlot(VALENCE[point.valenceGroup] ?? 0.5)}
              r={DOT_R}
              fill={DOT_COLOR[point.valenceGroup] ?? Colors.inkGhost}
              opacity={0.85}
            />
          ))}

          {/* X-axis labels */}
          <SvgText
            x={LABEL_W}
            y={CHART_H + AXIS_H - 3}
            textAnchor="start"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            {formatOldestDate(data[0].date)}
          </SvgText>
          <SvgText
            x={width - PAD_R}
            y={CHART_H + AXIS_H - 3}
            textAnchor="end"
            fontSize={9}
            fontFamily="Newsreader-Regular"
            fill={Colors.inkGhost}>
            Now
          </SvgText>
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
