import TrendChart from "@/components/TrendChart";
import type { TrendPoint } from "@/lib/supabase/types";

/**
 * 趋势图演示页 — 模拟数据
 */
const mockData: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date("2026-06-20");
  d.setDate(d.getDate() + i);
  const base = 3.5 + Math.sin(i * 0.4) * 0.8 + (i > 20 ? 0.5 : 0);
  return { date: d.toISOString().split("T")[0], price: parseFloat((base + Math.random() * 0.3).toFixed(2)) };
});

const avgPrice = parseFloat((mockData.reduce((s, d) => s + d.price, 0) / mockData.length).toFixed(2));

export default function TrendDemoPage() {
  return (
    <div className="page-content min-h-screen max-w-lg mx-auto px-4 py-10" style={{ background: "var(--paper-base)" }}>
      <h1 className="text-aged-heavy text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-body)", color: "var(--ink-primary)" }}>
        TrendChart 组件演示
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
        模拟数据：6月20日 – 7月19日 · 西红柿 · 均价 ¥{avgPrice.toFixed(2)}/斤
      </p>
      <div className="border-sketch p-4" style={{ background: "var(--paper-light)" }}>
        <TrendChart data={mockData} avgPrice={avgPrice} unit="元/斤" />
      </div>
      <div className="mt-8 text-xs" style={{ color: "var(--ink-faint)" }}>
        <p>鼠标悬停查看每日价格 · 虚线为30日均价</p>
      </div>
    </div>
  );
}