import { useEffect, useRef, useState } from "react";
import type { TrendPoint } from "@/lib/supabase/types";

export type { TrendPoint };

interface TrendChartProps {
  data: TrendPoint[];
  avgPrice: number;
  unit: string;
  priceLevel?: "便宜" | "正常" | "偏贵" | null;
  className?: string;
}

/**
 * 手绘风格价格走势图
 * - Y轴使用 nice number 算法生成合理刻度（避免标签重复）
 * - 5条水平网格线 + 左侧价格刻度标签
 * - 均价线：虚线（4+4），玫瑰色 50% 不透明度
 * - 价格折线：主墨色，1.5px，round join/cap
 * - 数据点：2.5px 半径实心圆点
 * - 标注：左上角"最高"（muted），右上角"当前"（按价格等级着色粗体）
 */
export default function TrendChart({ data, avgPrice, unit, priceLevel, className = "" }: TrendChartProps) {
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

    // 顶部留 22px 给"最高/当前"标注，避免与折线重叠
    const pad = { top: 22, right: 12, bottom: 8, left: 44 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const prices = data.map((d) => d.price);
    const dataMin = Math.min(...prices);
    const dataMax = Math.max(...prices);
    const dataRange = dataMax - dataMin || 1;

    // Y轴边界：底部留15%呼吸空间，顶部留5%，但不低于0
    const rawMin = Math.max(0, dataMin - dataRange * 0.15);
    const rawMax = dataMax + dataRange * 0.05;
    const rawRange = rawMax - rawMin || 1;

    // ========== Nice Number 算法：计算合理的刻度步长 ==========
    // 目标5条网格线（4个间隔）
    const targetTicks = 5;
    const rawStep = rawRange / (targetTicks - 1);
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep: number;
    if (residual < 1.5) niceStep = 1 * mag;
    else if (residual < 3) niceStep = 2 * mag;
    else if (residual < 7) niceStep = 5 * mag;
    else niceStep = 10 * mag;

    // 扩展 min/max 到 niceStep 的整数倍
    let niceMin = Math.floor(rawMin / niceStep) * niceStep;
    let niceMax = Math.ceil(rawMax / niceStep) * niceStep;
    // niceMin 不低于0
    if (niceMin < 0) niceMin = 0;

    // 根据步长确定小数位数
    let decimals: number;
    if (niceStep >= 1) decimals = 0;
    else if (niceStep >= 0.1) decimals = 1;
    else if (niceStep >= 0.01) decimals = 2;
    else decimals = 3;

    // 生成刻度值
    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + niceStep * 0.001; v += niceStep) {
      ticks.push(Number(v.toFixed(decimals)));
    }
    // 确保最后一个刻度包含 niceMax
    if (ticks[ticks.length - 1] < niceMax) {
      ticks.push(Number(niceMax.toFixed(decimals)));
    }

    const chartMin = ticks[0];
    const chartMax = ticks[ticks.length - 1];
    const chartRange = chartMax - chartMin || 1;
    const yScale = (v: number) => pad.top + ph * (1 - (v - chartMin) / chartRange);

    // 获取CSS变量颜色
    const styles = getComputedStyle(document.documentElement);
    const inkPrimary = styles.getPropertyValue("--ink-primary").trim() || "#5C5248";
    const inkMuted = styles.getPropertyValue("--ink-muted").trim() || "#B5A99C";
    const inkFaint = styles.getPropertyValue("--ink-faint").trim() || "#D5CCC2";
    const canopyRose = styles.getPropertyValue("--canopy-rose").trim() || "#D4958A";

    function hexWithAlpha(hex: string, alpha: number): string {
      const h = hex.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function fmt(v: number): string {
      return `¥${v.toFixed(decimals)}`;
    }

    // 绘制
    ctx.clearRect(0, 0, w, h);

    // 1. 水平网格线（faint 色，0.5px）
    ctx.strokeStyle = hexWithAlpha(inkFaint, 0.25);
    ctx.lineWidth = 0.5;
    ticks.forEach((tickVal) => {
      const y = yScale(tickVal);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();
    });

    // 2. Y轴刻度标签（等宽小字 muted）
    ctx.fillStyle = hexWithAlpha(inkMuted, 0.9);
    ctx.font = '10px "IBM Plex Mono", "Courier New", monospace';
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ticks.forEach((tickVal) => {
      const y = yScale(tickVal);
      ctx.fillText(fmt(tickVal), pad.left - 6, y);
    });

    // 3. 均价线：虚线（4+4），玫瑰色 50%
    const avgY = yScale(avgPrice);
    ctx.strokeStyle = hexWithAlpha(canopyRose, 0.5);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, avgY);
    ctx.lineTo(pad.left + pw, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. 价格折线：主墨色，1.5px，round
    ctx.strokeStyle = inkPrimary;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < prices.length; i++) {
      const x = pad.left + (pw / (prices.length - 1)) * i;
      const y = yScale(prices[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. 数据点：2.5px 半径实心圆点
    ctx.fillStyle = inkPrimary;
    for (let i = 0; i < prices.length; i++) {
      const x = pad.left + (pw / (prices.length - 1)) * i;
      const y = yScale(prices[i]);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. 顶部标注（在 pad.top 区域内绘制，不会与折线重叠）
    const labelY = 4; // 距离canvas顶部4px

    // 左上角"最高 ¥X.XX"（muted，加粗，与"当前"一致）
    ctx.fillStyle = hexWithAlpha(inkMuted, 0.9);
    ctx.font = 'bold 11px "IBM Plex Mono", "Courier New", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`最高 ¥${dataMax.toFixed(2)}`, pad.left, labelY);

    // 右上角"当前 ¥X.XX"（按价格等级着色，粗体）
    const currentPrice = prices[prices.length - 1];
    let currentColor = inkPrimary;
    if (priceLevel === "偏贵") {
      currentColor = styles.getPropertyValue("--price-up").trim() || "#B0453A";
    } else if (priceLevel === "便宜") {
      currentColor = styles.getPropertyValue("--price-down").trim() || "#5A6B42";
    }
    ctx.fillStyle = currentColor;
    ctx.font = 'bold 11px "IBM Plex Mono", "Courier New", monospace';
    ctx.textAlign = "right";
    ctx.fillText(`当前 ¥${currentPrice.toFixed(2)}`, pad.left + pw, labelY);

    // 鼠标交互 — tooltip
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
  }, [data, avgPrice, priceLevel]);

  if (data.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <div className="relative" style={{ height: "200px" }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
        {tooltip && (
          <div className="absolute pointer-events-none" style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}>
            <div className="px-2 py-1 rounded text-xs whitespace-nowrap" style={{ background: "var(--paper-base)", border: "1px solid var(--ink-faint)", fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>
              {formatDateFull(tooltip.date)} · ¥{tooltip.price.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
