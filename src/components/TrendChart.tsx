import { useEffect, useRef, useState } from "react";
import type { TrendPoint } from "@/lib/supabase/types";

export type { TrendPoint };

interface TrendChartProps {
  data: TrendPoint[];
  avgPrice: number;
  unit: string;
  className?: string;
}

export default function TrendChart({ data, avgPrice, unit, className = "" }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; price: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const pad = { top: 20, right: 16, bottom: 28, left: 8 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const prices = data.map((d) => d.price);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    const dataRange = dataMax - dataMin || 1;
    // Y轴下边界留15%呼吸空间，上边界留5%，但不低于0
    const min = Math.max(0, dataMin - dataRange * 0.15);
    const max = dataMax + dataRange * 0.05;
    const range = max - min || 1;
    const yScale = (v: number) => pad.top + ph * (1 - (v - min) / range);

    // 绘制
    ctx.clearRect(0, 0, w, h);

    // 渐变填充
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, "rgba(212, 149, 138, 0.12)");
    grad.addColorStop(1, "rgba(212, 149, 138, 0.01)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pad.left, yScale(prices[0]));
    for (let i = 0; i < prices.length; i++) {
      ctx.lineTo(pad.left + (pw / (prices.length - 1)) * i, yScale(prices[i]));
    }
    ctx.lineTo(pad.left + pw, h - pad.bottom);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.closePath();
    ctx.fill();

    // 价格线
    ctx.strokeStyle = "rgba(180, 120, 100, 0.7)";
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pad.left, yScale(prices[0]));
    for (let i = 1; i < prices.length; i++) {
      ctx.lineTo(pad.left + (pw / (prices.length - 1)) * i, yScale(prices[i]));
    }
    ctx.stroke();

    // 均价虚线
    ctx.strokeStyle = "rgba(155, 142, 122, 0.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yScale(avgPrice));
    ctx.lineTo(pad.left + pw, yScale(avgPrice));
    ctx.stroke();
    ctx.setLineDash([]);

    // 均价标签
    ctx.fillStyle = "var(--ink-muted)";
    ctx.font = "10px var(--font-mono)";
    ctx.textAlign = "right";
    ctx.fillText(`均价 ¥${avgPrice.toFixed(2)}`, pad.left + pw, yScale(avgPrice) - 4);

    // 鼠标交互
    const handleMouse = (e: MouseEvent) => {
      const mx = e.clientX - rect.left;
      const idx = Math.round(((mx - pad.left) / pw) * (prices.length - 1));
      const clamped = Math.max(0, Math.min(prices.length - 1, idx));
      const px = pad.left + (pw / (prices.length - 1)) * clamped;
      const py = yScale(prices[clamped]);
      setTooltip({ x: px, y: py, date: data[clamped].date, price: prices[clamped] });
    };

    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("mouseleave", () => setTooltip(null));
    return () => {
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("mouseleave", () => setTooltip(null));
    };
  }, [data, avgPrice]);

  if (data.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs" style={{ color: "var(--price-up)" }}>最高 ¥{Math.max(...data.map((d) => d.price)).toFixed(2)}</span>
        <span className="text-xs" style={{ color: "var(--ink-primary)", fontFamily: "var(--font-mono)" }}>当前 ¥{data[data.length - 1].price.toFixed(2)}</span>
      </div>
      <div className="relative" style={{ height: "240px" }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
        {tooltip && (
          <div className="absolute pointer-events-none" style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}>
            <div className="px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: "var(--paper-base)", border: "1px solid var(--ink-faint)", fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>
              {formatDateFull(tooltip.date)} · ¥{tooltip.price.toFixed(2)}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: "rgba(180, 120, 100, 0.7)" }} />
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>价格走势</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: "rgba(155, 142, 122, 0.35)", borderTop: "1px dashed rgba(155, 142, 122, 0.35)" }} />
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>30日均价</span>
        </div>
      </div>
    </div>
  );
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}