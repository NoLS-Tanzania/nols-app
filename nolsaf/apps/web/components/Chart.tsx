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
  plugins?: any[];
};

export default function Chart<T extends ChartType = ChartType>({ type, data, options, height, onCanvas, plugins }: ChartProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any | null>(null);
  const onCanvasRef = useRef<typeof onCanvas>(onCanvas);

  useEffect(() => {
    onCanvasRef.current = onCanvas;
  }, [onCanvas]);

  type Destroyable = { destroy: () => void };

  // Initialize (or re-initialize) chart instance only when `type` changes.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!ChartCtor) {
        const mod = await import("chart.js/auto");
        ChartCtor = (mod as { default: ChartCtorType }).default;
      }
      if (cancelled) return;

      if (chartRef.current && (chartRef.current as Destroyable).destroy) {
        try {
          (chartRef.current as Destroyable).destroy();
        } catch {}
      }
      chartRef.current = null;

      if (canvasRef.current && ChartCtor) {
        const cfg: ChartConfiguration<T> = { type, data, options } as ChartConfiguration<T>;
        if (plugins && plugins.length) cfg.plugins = plugins as any;
        chartRef.current = new ChartCtor(canvasRef.current, cfg) as unknown;
      }

      try {
        onCanvasRef.current && onCanvasRef.current(canvasRef.current);
      } catch {}
    })();

    return () => {
      cancelled = true;
      if (chartRef.current && (chartRef.current as Destroyable).destroy) {
        try {
          (chartRef.current as Destroyable).destroy();
        } catch {}
      }
      chartRef.current = null;
      try {
        onCanvasRef.current && onCanvasRef.current(null);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Update data/options without recreating the chart (prevents blinking).
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.data = data as any;
      chartRef.current.options = (options ?? {}) as any;
      if (plugins) {
        chartRef.current.config.plugins = plugins as any;
      }
      chartRef.current.update("none");
    } catch {}
  }, [data, options, plugins]);

  return (
    <div className={styles.container} style={height ? { minHeight: `${height}px` } : undefined}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
