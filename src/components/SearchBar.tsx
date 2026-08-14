import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useState, useTransition } from "react";

/**
 * 搜索框 — 田野调查笔记风格
 * Find: 标签 + 底部手绘下划线输入框
 * 300ms 防抖 + useTransition 避免输入过程中频繁阻塞 UI
 */
export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  const updateSearch = useCallback(
    (term: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams);
        if (term) params.set("search", term);
        else params.delete("search");
        navigate(`/?${params.toString()}`, { replace: true });
      });
    },
    [navigate, searchParams]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    window.clearTimeout((e.target as any)._debounce);
    (e.target as any)._debounce = window.setTimeout(() => updateSearch(v), 300);
  };

  return (
    <div className="relative flex items-center gap-2">
      <span className="shrink-0 text-lg tracking-[0.04em] uppercase" style={{ fontFamily: "var(--font-english)", color: "var(--ink-muted)" }}>Find:</span>
      <div className="relative flex-1">
        <input type="text" value={value} onChange={handleChange} placeholder="记录商品名称..."
          className="w-full h-9 px-0 bg-transparent text-sm outline-none placeholder:opacity-35"
          style={{ fontFamily: "var(--font-body)", color: "var(--ink-primary)", borderBottom: "1.5px solid var(--ink-faint)", transition: "border-color 0.2s ease" }}
          onFocus={(e) => { e.target.style.borderBottomColor = "var(--canopy-rose)"; }}
          onBlur={(e) => { e.target.style.borderBottomColor = "var(--ink-faint)"; }} />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"><MagnifyingGlassSketch /></span>
      </div>
    </div>
  );
}

function MagnifyingGlassSketch() {
  return (
    <svg className="w-4 h-4 opacity-35" viewBox="0 0 20 20" fill="none" stroke="var(--ink-secondary)" strokeWidth="1.2" strokeLinecap="round">
      <path d="M2 8.5 Q 2 3 8.5 3 Q 15 3 15 8.5 Q 15 14 8.5 14 Q 2 14 2 8.5 Z" />
      <line x1="13" y1="13" x2="18" y2="18" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="1" fill="var(--ink-secondary)" stroke="none" opacity="0.5" />
    </svg>
  );
}