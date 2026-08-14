import { useNavigate, useSearchParams } from "react-router-dom";
import { useTransition } from "react";
import type { City } from "@/lib/supabase/types";

/**
 * 城市选择器 — 老式地图图例标签
 * 选中态：手绘波浪下划线，像被铅笔圈出的地点
 * isPending 时降低透明度，提供即时点击反馈
 */
export default function CitySelector({ cities, selectedId }: { cities: City[]; selectedId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (cityId: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("city", cityId);
      navigate(`/?${params.toString()}`, { replace: true });
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1.5 pl-3">
      {cities.map((city) => {
        const isActive = city.id === selectedId;
        return (
          <button key={city.id} onClick={() => handleSelect(city.id)}
            className="shrink-0 relative px-0 py-1 text-base transition-all duration-200"
            style={{
              fontFamily: isActive ? "var(--font-title)" : "var(--font-body)",
              color: isActive ? "var(--ink-primary)" : "var(--ink-muted)",
              fontWeight: isActive ? 600 : 400,
              letterSpacing: isActive ? "0.06em" : "0.02em",
              opacity: isPending ? 0.5 : 1,
            }}>
            {city.name}
            {isActive && <span className="absolute left-0 right-0 bottom-0" style={{ height: "3px", display: "block" }}><UnderlineSketch /></span>}
          </button>
        );
      })}
    </div>
  );
}

function UnderlineSketch() {
  return <svg viewBox="0 0 50 6" className="w-full h-full" preserveAspectRatio="none" fill="none" stroke="var(--canopy-rose)" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"><path d="M2 3 Q 12 0.5 25 3 T 48 2.5" /></svg>;
}