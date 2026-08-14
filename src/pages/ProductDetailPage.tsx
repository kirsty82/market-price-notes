import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getProductDetail } from "@/lib/data";
import type { PriceEvaluation, PriceTrend } from "@/lib/supabase/types";
import TrendChart from "@/components/TrendChart";

/**
 * 商品详情页 — 价格走势 + 评价
 * Vite 版：useEffect 从 Supabase 获取数据，纯客户端渲染
 */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const cityId = searchParams.get("city") || "";

  const [trend, setTrend] = useState<PriceTrend | null>(null);
  const [evaluation, setEvaluation] = useState<PriceEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !cityId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProductDetail({ productId: id, cityId })
      .then(({ trend: t, evaluation: e }) => {
        if (cancelled) return;
        setTrend(t);
        setEvaluation(e);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, cityId]);

  // 无 cityId
  if (!cityId) {
    return (
      <div className="page-content min-h-screen flex items-center justify-center" style={{ background: "var(--paper-base)" }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>请选择城市</p>
          <Link to="/" className="text-sm underline-sketch" style={{ color: "var(--canopy-rose)" }}>← 返回首页</Link>
        </div>
      </div>
    );
  }

  // 加载中 — 极简指示器，不遮挡页面
  if (loading) {
    return (
      <div className="page-content min-h-screen max-w-lg mx-auto pt-6 px-4 pb-12" style={{ background: "var(--paper-base)" }}>
        <div className="flex items-center justify-center py-32">
          <LoadingSketch />
        </div>
      </div>
    );
  }

  // 错误
  if (error || !evaluation) {
    return (
      <div className="page-content min-h-screen flex items-center justify-center" style={{ background: "var(--paper-base)" }}>
        <div className="text-center">
          <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>{error || "暂无该商品的价格数据"}</p>
          <Link to={`/?city=${cityId}`} className="text-sm underline-sketch" style={{ color: "var(--canopy-rose)" }}>← 返回首页</Link>
        </div>
      </div>
    );
  }

  const fluctuation = evaluation.fluctuation;
  const isUp = fluctuation > 0;
  const isDown = fluctuation < 0;

  const priceLevelColors: Record<string, { bg: string; border: string; text: string }> = {
    便宜: { bg: "var(--price-down-bg)", border: "var(--price-down)", text: "var(--price-down)" },
    正常: { bg: "var(--price-stable-bg)", border: "var(--price-stable)", text: "var(--price-stable)" },
    偏贵: { bg: "var(--price-up-bg)", border: "var(--price-up)", text: "var(--price-up)" },
  };
  const pc = priceLevelColors[evaluation.price_level];

  return (
    <div className="page-content min-h-screen max-w-lg mx-auto pt-6 px-4 pb-12" style={{ background: "var(--paper-base)" }}>
      {/* 返回链接 — CTA 滑出按钮（参照 Uiverse.io alexmaracinaru） */}
      <Link to={`/?city=${cityId}`} className="cta-back"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          padding: "12px 18px",
          border: "none",
          background: "none",
          cursor: "pointer",
          textDecoration: "none",
          transition: "all 0.2s ease",
        }}>
        {/* 模拟 ::before — 圆角方块，hover 展开为全宽 */}
        <span className="cta-bg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "block",
            borderRadius: "50px",
            background: "rgba(212, 149, 138, 0.18)",
            width: "42px",
            height: "42px",
            transition: "all 0.3s ease",
            zIndex: 0,
          }}
        />
        <span style={{ position: "relative", zIndex: 1, fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--canopy-rose)" }}>
          返回笔记
        </span>
        <svg className="cta-arrow" viewBox="0 0 16 14" fill="none" stroke="var(--canopy-rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            position: "relative",
            zIndex: 1,
            top: 0,
            marginLeft: "10px",
            width: "15px",
            height: "12px",
            transform: "translateX(-5px)",
            transition: "all 0.3s ease",
          }}>
          <path d="M7 1 L1 7 L7 13" /><line x1="1" y1="7" x2="15" y2="7" />
        </svg>
      </Link>

      <style>{`
        .cta-back:hover .cta-bg { width: 100% !important; }
        .cta-back:hover .cta-arrow { transform: translateX(0) !important; }
        .cta-back:active { transform: scale(0.95) !important; }
      `}</style>

      {/* 商品名称 */}
      <div className="mt-6 mb-5">
        <h1 className="text-aged-heavy text-2xl font-semibold" style={{ fontFamily: "var(--font-body)", color: "var(--ink-primary)" }}>
          {evaluation.product_name}
        </h1>
        <span className="text-xs mt-1" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
          {evaluation.city_name} · {evaluation.unit}
        </span>
      </div>

      {/* 今日价格卡片 */}
      <div className="relative overflow-hidden p-5 mb-5 rounded-lg" style={{ background: "var(--paper-light)", border: "1px solid var(--rule-color)" }}>
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t-lg" style={{ background: "var(--canopy-rose)", opacity: 0.3 }} />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>今日价格</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="price-tag" style={{ fontFamily: "var(--font-mono)", fontSize: "2.2rem", color: "var(--ink-primary)", fontWeight: 600, lineHeight: 1 }}>
                ¥{evaluation.latest_price.toFixed(2)}
              </span>
              <span className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>/{evaluation.unit}</span>
            </div>
            <span className="text-xs mt-1 block" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>
              更新于 {evaluation.latest_date}
            </span>
          </div>
          <span className={`stamp-badge ${evaluation.price_level === "偏贵" ? "stamp-badge-up" : ""} mt-2`}
            style={{ color: pc.text, borderColor: pc.border, background: pc.bg, fontSize: "0.75rem", padding: "4px 14px" }}>
            {evaluation.price_level}
          </span>
        </div>
      </div>

      {/* 波动率 */}
      <div className="flex gap-3 mb-5">
        <StatCard label="30日均价" value={`¥${evaluation.avg_price_30d.toFixed(2)}`} />
        <StatCard label="波动率" value={`${isUp ? "+" : ""}${fluctuation.toFixed(1)}%`}
          valueColor={isUp ? "var(--price-up)" : isDown ? "var(--price-down)" : "var(--price-stable)"} />
        <StatCard label="趋势" value={evaluation.price_level} />
      </div>

      {/* 走势图 */}
      {trend && trend.trend.length > 0 && (
        <div className="p-4 mb-5 rounded-lg" style={{ background: "var(--paper-light)", border: "1px solid var(--rule-color)" }}>
          <div className="flex items-center gap-2 mb-3">
            <WavyLineSketch />
            <span className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-primary)" }}>30日价格走势</span>
          </div>
          <TrendChart data={trend.trend} avgPrice={trend.avg_price} unit={evaluation.unit} />
        </div>
      )}

      {/* 调查笔记 */}
      <div className="p-4 mb-8 rounded-lg" style={{ background: "var(--paper-light)", border: "1px solid var(--rule-color)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>— Field Notes —</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)", color: "var(--ink-secondary)" }}>
          {evaluation.price_level_reason}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex-1 p-3 rounded-lg" style={{ background: "var(--paper-light)", border: "1px solid var(--rule-color)" }}>
      <span className="block text-xs mb-1" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}>{label}</span>
      <span className="text-sm font-semibold price-tag" style={{ fontFamily: "var(--font-mono)", color: valueColor || "var(--ink-primary)" }}>{value}</span>
    </div>
  );
}

function BackArrowSketch() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 14" fill="none" stroke="var(--canopy-rose)" strokeWidth="1.3" strokeLinecap="round">
      <path d="M7 1 L1 7 L7 13" /><line x1="1" y1="7" x2="15" y2="7" />
    </svg>
  );
}

function WavyLineSketch() {
  return (
    <svg className="w-5 h-4" viewBox="0 0 20 6" fill="none" stroke="var(--canopy-rose)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
      <path d="M1 3 Q 5 0.5 10 3 T 19 3" />
    </svg>
  );
}

/** 极简加载动画 — 手绘风格三条波浪线，不遮挡页面 */
function LoadingSketch() {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg className="w-8 h-8 animate-pulse" viewBox="0 0 32 32" fill="none" stroke="var(--ink-muted)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
        <path d="M2 10 Q 8 4 16 10 T 30 10" />
        <path d="M2 16 Q 8 10 16 16 T 30 16" />
        <path d="M2 22 Q 8 16 16 22 T 30 22" />
      </svg>
      <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--ink-muted)" }}>翻页中...</span>
    </div>
  );
}