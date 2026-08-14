/**
 * ProductListSkeleton — 商品列表加载骨架
 * 数据加载时显示，保持"笔记本"视觉连续性
 */
export default function ProductListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border-sketch relative overflow-hidden" style={{ background: "var(--paper-light)", height: "88px" }}>
          <div className="absolute left-11 top-0 bottom-0 w-px" style={{ background: "var(--margin-red)" }} />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-6 rounded" style={{ background: "var(--ink-faint)", opacity: 0.2 }} />
          <div className="relative flex items-center py-3.5 pl-[52px] pr-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-5 w-24 rounded" style={{ background: "var(--ink-faint)", opacity: 0.15 }} />
              <div className="h-3 w-12 rounded" style={{ background: "var(--ink-faint)", opacity: 0.1 }} />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-6 w-16 rounded" style={{ background: "var(--ink-faint)", opacity: 0.15 }} />
              <div className="h-3 w-8 rounded" style={{ background: "var(--ink-faint)", opacity: 0.1 }} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8" style={{ borderTop: "1px solid var(--rule-color)" }}>
            <div className="flex items-center gap-3 px-4 pl-[52px] h-full">
              <div className="h-3 w-20 rounded" style={{ background: "var(--ink-faint)", opacity: 0.1 }} />
              <div className="h-3 w-12 rounded" style={{ background: "var(--ink-faint)", opacity: 0.1 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}