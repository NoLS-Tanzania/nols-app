import { AppText, colors, spacing } from "@nolsaf/native-ui";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { EarningsChartPoint } from "../driver/types";

type EarningsLineChartProps = {
  data: EarningsChartPoint[];
  height?: number;
};

const VIEWBOX_WIDTH = 300;
const PAD_X = 8;

type Point = { x: number; y: number };

function buildSmoothPath(points: Point[]) {
  if (points.length < 2) return "";

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export function EarningsLineChart({ data, height = 90 }: EarningsLineChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((point) => point.amount), 1);
  const usableWidth = VIEWBOX_WIDTH - PAD_X * 2;
  const stepX = data.length > 1 ? usableWidth / (data.length - 1) : 0;
  const padY = 10;
  const plotHeight = height - padY * 2;

  const points: Point[] = data.map((point, index) => {
    const x = data.length > 1 ? PAD_X + index * stepX : VIEWBOX_WIDTH / 2;
    const y = padY + plotHeight - (point.amount / max) * plotHeight;
    return { x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.16} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#earningsFill)" />
        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />
        {points.map((point, index) => {
          const isLast = index === points.length - 1;
          return isLast ? (
            <Circle key={index} cx={point.x} cy={point.y} r={4.5} fill={colors.primary} stroke={colors.white} strokeWidth={2} />
          ) : null;
        })}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((point, index) => {
          const isLast = index === data.length - 1;
          return (
            <AppText key={index} variant="caption" tone={isLast ? "primary" : "muted"} weight={isLast ? "bold" : "regular"} style={styles.label}>
              {point.day}
            </AppText>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing[2]
  },
  label: {
    flex: 1,
    textAlign: "center"
  }
});
