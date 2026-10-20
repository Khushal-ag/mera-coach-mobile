import React, { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { BMI_BANDS, BMI_GAUGE, BMI_TICKS } from '../../constants/publicBmi';
import { FontFamily, headingFont } from '../../constants/theme';
import { gaugeAngle, gaugeArcPath, gaugePoint } from '../../utils/publicBmi';

interface BmiGaugeProps {
  /** BMI shown on the dial; ignored while locked. */
  bmi: number;
  /** Locked until the visitor leaves their details: no needle or number, a padlock instead. */
  locked: boolean;
  label: string;
}

const LOCK_FILL = '#ffffff';
const LOCK_INK = '#254a39';
const NEEDLE_MS = 1100;

/** Half-circle BMI dial drawn like the web home gauge (same bands, ticks and needle). */
export default function BmiGauge({ bmi, locked, label }: BmiGaugeProps) {
  const { cx, cy, r, stroke } = BMI_GAUGE;
  // The needle sweeps from the left end (180 degrees) to the BMI once the dial unlocks.
  const [angle, setAngle] = useState(180);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const target = gaugeAngle(bmi);
    const id = progress.addListener(({ value }) => setAngle(180 + (target - 180) * value));
    if (locked) {
      progress.setValue(0);
    } else {
      Animated.timing(progress, {
        toValue: 1,
        duration: NEEDLE_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }).start();
    }
    return () => {
      progress.stopAnimation();
      progress.removeListener(id);
    };
  }, [locked, bmi, progress]);

  const tip = gaugePoint(angle, r - 18);

  return (
    <Svg
      width="100%"
      viewBox="0 0 320 214"
      style={{ aspectRatio: 320 / 214 }}
      accessibilityRole="image"
      accessibilityLabel={locked ? 'BMI result locked' : `BMI ${bmi.toFixed(1)}, ${label}`}
    >
      {BMI_BANDS.map(band => (
        <Path
          key={band.from}
          d={gaugeArcPath(band.from, band.to)}
          fill="none"
          stroke={band.color}
          strokeWidth={stroke}
        />
      ))}
      {BMI_TICKS.map(tick => {
        const a = gaugeAngle(tick);
        const at = gaugePoint(a, r + stroke / 2 + 13);
        const anchor = a > 100 ? 'end' : a < 80 ? 'start' : 'middle';
        return (
          <SvgText
            key={tick}
            x={at.x}
            y={at.y + 4}
            textAnchor={anchor}
            fill="rgba(255,255,255,0.7)"
            fontSize={12}
            fontFamily={headingFont.semibold}
          >
            {tick}
          </SvgText>
        );
      })}
      {locked ? (
        <G>
          <Path
            d={`M ${cx - 9} ${cy + 12} v-8 a9 9 0 0 1 18 0 v8`}
            fill="none"
            stroke={LOCK_FILL}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Rect x={cx - 17} y={cy + 12} width={34} height={27} rx={6} fill={LOCK_FILL} />
          <Circle cx={cx} cy={cy + 23} r={3.4} fill={LOCK_INK} />
          <Rect x={cx - 1.6} y={cy + 24} width={3.2} height={8} rx={1.6} fill={LOCK_INK} />
          <SvgText
            x={cx}
            y={cy + 62}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={13}
            fontFamily={FontFamily.semibold}
          >
            Locked
          </SvgText>
        </G>
      ) : (
        <G>
          <Line
            x1={cx}
            y1={cy}
            x2={tip.x}
            y2={tip.y}
            stroke="#ffffff"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Circle cx={cx} cy={cy} r={9} fill="#ffffff" />
          <SvgText
            x={cx}
            y={cy + 42}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={28}
            fontFamily={headingFont.extraBold}
          >
            {bmi.toFixed(1)}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 60}
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontSize={12}
            fontFamily={FontFamily.semibold}
          >
            BMI
          </SvgText>
        </G>
      )}
    </Svg>
  );
}
