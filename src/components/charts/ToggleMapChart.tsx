import React, {useState, useMemo} from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import Svg, {Line, Text as SvgText} from 'react-native-svg';
import {Colors, Typography} from '../../theme';
import type {ToggleMapPoint} from '../../types';

// ─── Layout constants ─────────────────────────────────────────────────────────

const CHART_H = 220;
const DOT_PAD = 16;   // keep dot centers this far from edges
const LABEL_H = 9;    // SVG text height estimate
const CHAR_W = 5.0;   // char width estimate at 9px Newsreader
const COLL_PAD = 3;   // bounding-box padding in collision check
const DOT_OPACITY = 0.75;
const DIM_OPACITY = 0.18;
const TIP_W = 162;

// ─── Types ────────────────────────────────────────────────────────────────────

type Dot = {
  name: string;
  lean: number;
  freq: number;
  consistency: number;
  cx: number;
  cy: number;
  r: number;
  color: string;
  baseOpacity: number;
  labelW: number;
  lx: number;
  ly: number;
};

type Box = {x1: number; y1: number; x2: number; y2: number};

// ─── Label placement ──────────────────────────────────────────────────────────

function placeDots(data: ToggleMapPoint[], width: number): Dot[] {
  const plotW = width - DOT_PAD * 2;
  const plotH = CHART_H - DOT_PAD * 2;

  const dots: Dot[] = data.map(t => {
    const diam = 10 + t.consistency * 20;
    const r = diam / 2;
    const cx = DOT_PAD + t.lean * plotW;
    const cy = CHART_H - DOT_PAD - t.freq * plotH;
    const color =
      t.lean > 0.6 ? Colors.moss : t.lean < 0.4 ? Colors.clay : Colors.inkGhost;
    // Fades when the toggle is rarely scored — high neither% = low freq
    const baseOpacity = Math.max(0.2, 0.25 + t.freq * 0.75);
    const labelW = t.name.length * CHAR_W;
    return {name: t.name, lean: t.lean, freq: t.freq, consistency: t.consistency, cx, cy, r, color, baseOpacity, labelW, lx: 0, ly: 0};
  });

  const placed: Box[] = [];

  function overlaps(b: Box): boolean {
    for (const p of placed) {
      if (b.x1 < p.x2 + COLL_PAD && b.x2 > p.x1 - COLL_PAD &&
          b.y1 < p.y2 + COLL_PAD && b.y2 > p.y1 - COLL_PAD) return true;
    }
    return false;
  }

  function overlapsDot(b: Box): boolean {
    for (const d of dots) {
      const pad = d.r + 2;
      if (b.x1 < d.cx + pad && b.x2 > d.cx - pad &&
          b.y1 < d.cy + pad && b.y2 > d.cy - pad) return true;
    }
    return false;
  }

  // Sort left-to-right so we place leftmost labels first — reduces conflicts
  [...dots].sort((a, b) => a.cx - b.cx).forEach(d => {
    const lw = d.labelW;
    const r = d.r;
    const candidates: {x: number; y: number}[] = [
      {x: d.cx + r + 4,         y: d.cy - LABEL_H / 2},     // right
      {x: d.cx - r - lw - 4,    y: d.cy - LABEL_H / 2},     // left
      {x: d.cx - lw / 2,        y: d.cy - r - LABEL_H - 4}, // above
      {x: d.cx - lw / 2,        y: d.cy + r + 4},            // below
    ];
    [-22, -32, 22, 32, -42, 42, -52, 52].forEach(dy => {
      candidates.push({x: d.cx + r + 4,      y: d.cy + dy});
      candidates.push({x: d.cx - r - lw - 4, y: d.cy + dy});
    });

    let chosen: {x: number; y: number} | null = null;
    for (const c of candidates) {
      const box: Box = {x1: c.x, y1: c.y, x2: c.x + lw, y2: c.y + LABEL_H};
      if (box.x1 < 1 || box.x2 > width - 1 || box.y1 < 1 || box.y2 > CHART_H - 1) continue;
      if (!overlaps(box) && !overlapsDot(box)) {
        chosen = c;
        placed.push(box);
        break;
      }
    }
    if (!chosen) {
      // Fallback: clamp to chart bounds, accept overlap
      chosen = {
        x: Math.min(width - lw - 1, d.cx + r + 4),
        y: Math.max(1, Math.min(CHART_H - LABEL_H - 1, d.cy - LABEL_H / 2)),
      };
    }
    d.lx = chosen.x;
    d.ly = chosen.y;
  });

  return dots;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {data: ToggleMapPoint[]};

export function ToggleMapChart({data}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const dots = useMemo(
    () => (width > 0 ? placeDots(data, width) : []),
    [data, width],
  );

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Complete check-ins with D/T toggles to see your pattern map.
        </Text>
      </View>
    );
  }

  function handleSelect(name: string) {
    setSelected(prev => (prev === name ? null : name));
  }

  const selectedDot = selected ? dots.find(d => d.name === selected) : null;

  // Tooltip position — prefer right of dot, flip left if near edge
  let tipLeft = 0;
  let tipTop = 0;
  if (selectedDot) {
    tipLeft = selectedDot.cx + selectedDot.r + 8;
    tipTop = selectedDot.cy - 44;
    if (tipLeft + TIP_W > width) {
      tipLeft = selectedDot.cx - selectedDot.r - TIP_W - 8;
    }
    if (tipTop < 2) tipTop = selectedDot.cy + selectedDot.r + 6;
    tipLeft = Math.max(0, Math.min(width - TIP_W, tipLeft));
    tipTop = Math.max(0, Math.min(CHART_H - 88, tipTop));
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => setSelected(null)}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={styles.container}>
      {width > 0 && (
        <>
          <Svg width={width} height={CHART_H}>
            {/* Quadrant hairlines */}
            <Line
              x1={0} y1={CHART_H / 2} x2={width} y2={CHART_H / 2}
              stroke={Colors.sepia} strokeWidth={0.5}
            />
            <Line
              x1={width / 2} y1={0} x2={width / 2} y2={CHART_H}
              stroke={Colors.sepia} strokeWidth={0.5}
            />

            {/* Connector hairlines from dot edge to label */}
            {dots.map(d => {
              const labelMidY = d.ly + LABEL_H / 2;
              const angle = Math.atan2(labelMidY - d.cy, d.lx - d.cx);
              const sx = d.cx + Math.cos(angle) * (d.r + 2);
              const sy = d.cy + Math.sin(angle) * (d.r + 2);
              return (
                <Line
                  key={`c-${d.name}`}
                  x1={sx} y1={sy} x2={d.lx} y2={labelMidY}
                  stroke={Colors.sepia} strokeWidth={0.5}
                  opacity={selected && selected !== d.name ? DIM_OPACITY : 0.65}
                />
              );
            })}

            {/* Persistent labels */}
            {dots.map(d => (
              <SvgText
                key={`l-${d.name}`}
                x={d.lx}
                y={d.ly + LABEL_H - 1}
                fontSize={9}
                fontFamily="Newsreader-Regular"
                fill={Colors.ink}
                opacity={selected && selected !== d.name ? DIM_OPACITY : 0.72}>
                {d.name}
              </SvgText>
            ))}
          </Svg>

          {/* Dots as TouchableOpacity — layered over SVG */}
          {dots.map(d => {
            const diam = d.r * 2;
            const opacity = selected
              ? selected === d.name ? 1 : DIM_OPACITY
              : d.baseOpacity;
            return (
              <TouchableOpacity
                key={`d-${d.name}`}
                style={[
                  styles.dot,
                  {
                    left: d.cx - d.r,
                    top: d.cy - d.r,
                    width: diam,
                    height: diam,
                    borderRadius: d.r,
                    backgroundColor: d.color,
                    opacity,
                  },
                ]}
                onPress={() => handleSelect(d.name)}
                activeOpacity={1}
              />
            );
          })}

          {/* Tooltip */}
          {selectedDot && (
            <View
              style={[styles.tooltip, {left: tipLeft, top: tipTop}]}
              pointerEvents="none">
              <Text style={styles.tipName}>{selectedDot.name}</Text>
              <Text style={styles.tipLine}>
                {selectedDot.lean > 0.6
                  ? 'Tiger-leaning'
                  : selectedDot.lean < 0.4
                  ? 'Donkey-leaning'
                  : 'Neutral'}
              </Text>
              <Text style={styles.tipLine}>
                Scored {Math.round(selectedDot.freq * 100)}% of check-ins
              </Text>
              <Text style={styles.tipLine}>
                {Math.round(selectedDot.consistency * 100)}% consistent
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: CHART_H,
  },
  dot: {
    position: 'absolute',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: Colors.paperCard,
    borderWidth: 1,
    borderColor: Colors.sepia,
    borderRadius: 8,
    padding: 9,
    width: TIP_W,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  tipName: {
    fontFamily: 'Fraunces-Regular',
    fontSize: 13,
    color: Colors.ink,
    marginBottom: 3,
  },
  tipLine: {
    fontFamily: 'Newsreader-Regular',
    fontSize: 11,
    color: Colors.inkSoft,
    lineHeight: 16,
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
