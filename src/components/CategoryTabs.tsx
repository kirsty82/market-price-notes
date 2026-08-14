import { useNavigate, useSearchParams } from "react-router-dom";
import { useTransition } from "react";
import type { Category } from "@/lib/supabase/types";

/**
 * 分类标签栏 — 笔记本章节分隔标签
 * isPending 时降低透明度，提供即时点击反馈
 */
export default function CategoryTabs({ categories, selectedId }: { categories: Category[]; selectedId: string | null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (categoryId: string | null) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (categoryId) params.set("category", categoryId);
      else params.delete("category");
      navigate(`/?${params.toString()}`, { replace: true });
    });
  };

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1" style={{ borderBottom: "1px solid var(--rule-color)" }}>
      <button onClick={() => handleSelect(null)}
        className="shrink-0 relative px-3 py-2 text-base transition-all duration-200"
        style={{
          fontFamily: selectedId === null ? "var(--font-title)" : "var(--font-body)",
          color: selectedId === null ? "var(--ink-primary)" : "var(--ink-muted)",
          fontWeight: selectedId === null ? 600 : 400,
          letterSpacing: "0.04em",
          opacity: isPending ? 0.5 : 1,
        }}>
        全部
        {selectedId === null && <span className="absolute left-0 right-0 bottom-0" style={{ height: "3px", background: "var(--canopy-rose)", opacity: 0.55 }} />}
      </button>
      {categories.map((cat) => {
        const isActive = cat.id === selectedId;
        return (
          <button key={cat.id} onClick={() => handleSelect(cat.id)}
            className="shrink-0 relative px-3 py-2 text-base transition-all duration-200"
            style={{
              fontFamily: isActive ? "var(--font-title)" : "var(--font-body)",
              color: isActive ? "var(--ink-primary)" : "var(--ink-muted)",
              fontWeight: isActive ? 600 : 400,
              letterSpacing: "0.04em",
              opacity: isPending ? 0.5 : 1,
            }}>
            {cat.name}
            {isActive && <span className="absolute left-0 right-0 bottom-0" style={{ height: "3px", background: "var(--canopy-rose)", opacity: 0.55 }} />}
          </button>
        );
      })}
    </div>
  );
}