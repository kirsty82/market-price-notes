import { useNavigate, useSearchParams } from "react-router-dom";
import { useTransition } from "react";
import type { City, Category } from "@/lib/supabase/types";

/**
 * 城市选择器 — 滑框按钮
 * 参照 Uiverse.io TISEPSE 按钮样式
 */
export default function CitySelector({ cities, selectedId }: { cities: City[]; selectedId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  const handleSelect = (cityId: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("city", cityId);
      navigate(`/?${params.toString()}`, { replace: true });
    });
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1.5">
      {cities.map((city) => {
        const isActive = city.id === selectedId;
        return (
          <TisepseButton key={city.id} label={city.name} isActive={isActive} onClick={() => handleSelect(city.id)} />
        );
      })}
    </div>
  );
}

/**
 * 分类标签栏 — 滑框按钮
 */
export function CategoryTabs({ categories, selectedId }: { categories: Category[]; selectedId: string | null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [, startTransition] = useTransition();

  const handleSelect = (categoryId: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (categoryId) params.set("category", categoryId);
      else params.delete("category");
      navigate(`/?${params.toString()}`, { replace: true });
    });
  };

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1" style={{ borderBottom: "1px solid var(--rule-color)" }}>
      <TisepseButton label="全部" isActive={selectedId === null} onClick={() => handleSelect(null)} />
      {categories.map((cat) => {
        const isActive = cat.id === selectedId;
        return (
          <TisepseButton key={cat.id} label={cat.name} isActive={isActive} onClick={() => handleSelect(cat.id)} />
        );
      })}
    </div>
  );
}

/* ================================================================
   Neumorphic 按钮（参照 Uiverse.io adamgiebl）
   四方圆角，内凹阴影，与纸张色系协调
   ================================================================ */
function TisepseButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  const bg = "#FDF8F2";           /* paper-light 浅暖纸色 */
  const shadowDark = "#D5CCC2";   /* ink-faint 暗影 */
  const shadowLight = "#FFFEF7";  /* 纸白 亮影 */
  const border = "#C8BEB3";       /* 灰棕边框 */
  const textColor = "#5C5248";    /* ink-primary */

  return (
    <button
      onClick={onClick}
      className="shrink-0"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "2.2rem",
        padding: "0 1.2em",
        appearance: "none",
        outline: "none",
        background: bg,
        borderRadius: "8px",
        border: `2px solid ${border}`,
        boxShadow: isActive
          ? `inset 3px 3px 6px ${shadowDark}, inset -3px -3px 6px ${shadowLight}`
          : `inset 2px 2px 5px ${shadowDark}, inset -2px -2px 5px ${shadowLight}`,
        transition: "all 0.2s ease-in-out",
        fontFamily: "var(--font-body)",
        fontSize: "0.8rem",
        fontWeight: 600,
        color: textColor,
        letterSpacing: "0.04em",
        lineHeight: 1,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `inset 1.5px 1.5px 4px ${shadowDark}, inset -1.5px -1.5px 4px ${shadowLight}, 1.5px 1.5px 4px ${shadowDark}, -1.5px -1.5px 4px ${shadowLight}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = isActive
          ? `inset 3px 3px 6px ${shadowDark}, inset -3px -3px 6px ${shadowLight}`
          : `inset 2px 2px 5px ${shadowDark}, inset -2px -2px 5px ${shadowLight}`;
      }}
    >
      {label}
    </button>
  );
}