"use client";
import { useEffect, useRef } from "react";
import type { ChartType, ChartData, ChartOptions, ChartConfiguration } from "chart.js";
import styles from "./Chart.module.css";

// We will dynamically import chart.js only on client
type ChartCtorType = typeof import("chart.js").Chart;
let ChartCtor: ChartCtorType | null = null;

export type ChartProps<T extends ChartType = ChartType> = {
  type: T;
  data: ChartData<T>;
  options?: ChartOptions<T>;
  height?: number;
  onCanvas?: (canvas: HTMLCanvasElement | null) => void;
};

export default function Chart<T extends ChartType = ChartType>({ type, data, options, onCanvas }: ChartProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<unknown | null>(null);
  type Destroyable = { destroy: () => void };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ChartCtor) {
        // dynamic import of chart.js auto-registered bundle
        const mod = await import("chart.js/auto");
        ChartCtor = (mod as { default: ChartCtorType }).default;
      }
      if (cancelled) return;

      if (chartRef.current && (chartRef.current as Destroyable).destroy) {
        (chartRef.current as Destroyable).destroy();
      }
      if (canvasRef.current && ChartCtor) {
        const cfg: ChartConfiguration<T> = { type, data, options } as ChartConfiguration<T>;
        chartRef.current = new ChartCtor(canvasRef.current, cfg) as unknown;
      }
  // expose canvas to parent if requested
  try { onCanvas && onCanvas(canvasRef.current); } catch {}
    })();

    return () => {
      cancelled = true;
      if (chartRef.current && (chartRef.current as Destroyable).destroy) {
        try { (chartRef.current as Destroyable).destroy(); } catch {}
      }
      chartRef.current = null;
  try { onCanvas && onCanvas(null); } catch {}
    };
  }, [type, data, options, onCanvas]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
