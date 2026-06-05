import React, {useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Line, Path, Text as SvgText} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {DayArc} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CHART_H = 180;
const LABEL_W = 36;   // left margin for Tiger/Donkey labels
const PAD_R = 8;
const AXIS_H = 22;    // bottom margin for column labels
const SVG_H = CHART_H + AXIS_H;
const CP_FRAC = 0.45; // bezier control point horizontal offset fraction
const STROKE_W = 1.5;
const CLAY_OPACITY = 0.4;
const MOSS_OPACITY = 0.6;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yPos(score: number): number {
  return (1 - score) * CHART_H;
}

// Build SVG cubic-bezier path through a sequence of {x,y} points.
// Each segment uses horizontal tangents: cp1 stays at a.y, cp2 stays at b.y.
function arcPath(pts: {x: number; y: number}[]): string | null {
  if (pts.length < 2) return null;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const cp1x = (a.x + CP_FRAC * dx).toFixed(1);
    const cp2x = (b.x - CP_FRAC * dx).toFixed(1);
    d += ` C ${cp1x} ${a.y.toFixed(1)} ${cp2x} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

function getPoints(
  arc: DayArc,
  colX: number[],
): {x: number; y: number}[] {
  const bands = [arc.morning, arc.afternoon, arc.evening];
  return bands
    .map((score, i) =>
      score !== null ? {x: colX[i], y: yPos(score)} : null,
    )
    .filter((p): p is {x: number; y: number} => p !== null);
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: DayArc[]};

export function SpectrumRiverChart({data}: Props) {
  const [width, setWidth] = useState(0);

  // Need at least 2 bands per arc to draw — filter here for empty-state check
  const drawable = data.filter(
    arc =>
      [arc.morning, arc.afternoon, arc.evening].filter(v => v !== null).length >= 2,
  );

  if (drawable.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete check-ins over multiple days to see your daily arc.
        </Text>
      </View>
    );
  }

  const plotW = width - LABEL_W - PAD_R;
  const colX = [0, 0.5, 1].map(t => LABEL_W + t * plotW);

  const clayArcs = drawable.filter(a => !a.hasSit);
  const mossArcs = drawable.filter(a => a.hasSit);

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
              y1={yPos(v)}
              x2={width - PAD_R}
              y2={yPos(v)}
              stroke={Colors.sepia}
              strokeWidth={1}
            />
          ))}

          {/* Vertical column markers */}
          {colX.map((x, i) => (
            <Line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={CHART_H}
              stroke={Colors.sepia}
              strokeWidth={1}
              opacity={0.6}
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

          {/* Clay arcs (non-sit days) — drawn first, underneath */}
          {clayArcs.map(arc => {
            const pts = getPoints(arc, colX);
            const d = arcPath(pts);
            return d ? (
              <Path
                key={arc.date}
                d={d}
                stroke={Colors.clay}
                strokeWidth={STROKE_W}
                fill="none"
                opacity={CLAY_OPACITY}
              />
            ) : null;
          })}

          {/* Moss arcs (sit days) — drawn last, on top */}
          {mossArcs.map(arc => {
            const pts = getPoints(arc, colX);
            const d = arcPath(pts);
            return d ? (
              <Path
                key={arc.date}
                d={d}
                stroke={Colors.moss}
                strokeWidth={STROKE_W}
                fill="none"
                opacity={MOSS_OPACITY}
              />
            ) : null;
          })}

          {/* X-axis column labels */}
          {(['Morning', 'Afternoon', 'Evening'] as const).map((label, i) => (
            <SvgText
              key={label}
              x={colX[i]}
              y={CHART_H + AXIS_H - 4}
              textAnchor="middle"
              fontSize={9}
              fontFamily="Newsreader-Regular"
              fill={Colors.inkGhost}>
              {label}
            </SvgText>
          ))}
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
