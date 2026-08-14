/**
 * ProductList — 商品列表
 * 接收筛选参数 + 数据，直接渲染
 */
import type { ProductWithPrice } from "@/lib/supabase/types";
import ProductCard from "./ProductCard";

interface ProductListProps {
  products: ProductWithPrice[];
  cityId: string;
  searchTerm: string;
}

export default function ProductList({ products, cityId, searchTerm }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <EmptyStateIllustration />
        <p className="mt-4 text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--ink-muted)" }}>
          {searchTerm ? "未找到匹配的记录 · 试试其他关键词" : "暂无调查记录 · 等待数据录入"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3">
      {products.map((product, index) => (
        <ProductCard key={product.id} id={product.id} name={product.name}
          categoryName={product.category_name} unit={product.unit}
          latestPrice={product.latest_price} avgPrice30d={product.avg_price_30d}
          fluctuation={product.fluctuation} priceLevel={product.price_level}
          cityId={cityId} index={index} />
      ))}
    </div>
  );
}

function EmptyStateIllustration() {
  return (
    <svg viewBox="0 0 80 80" className="w-20 h-auto opacity-35" fill="none" stroke="var(--ink-faint)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 14 L58 14 Q60 14 60 16 L60 64 Q60 66 58 66 L22 66 Q20 66 20 64 L20 16 Q20 14 22 14 Z" />
      <line x1="40" y1="14" x2="40" y2="66" strokeWidth="0.8" opacity="0.5" />
      <line x1="26" y1="24" x2="36" y2="24" /><line x1="26" y1="31" x2="36" y2="31" /><line x1="26" y1="38" x2="36" y2="38" />
      <line x1="44" y1="24" x2="54" y2="24" /><line x1="44" y1="31" x2="52" y2="31" /><line x1="44" y1="38" x2="54" y2="38" />
      <line x1="26" y1="45" x2="36" y2="45" /><line x1="44" y1="45" x2="50" y2="45" />
      <path d="M52 14 Q 58 6 64 8 Q 62 12 56 16" /><line x1="56" y1="16" x2="50" y2="22" />
      <path d="M62 56 Q 62 52 66 52 L68 52 Q72 52 72 56 L72 62 Q72 64 68 64 L66 64 Q62 64 62 62 Z" />
      <line x1="67" y1="52" x2="67" y2="49" /><line x1="65" y1="49" x2="69" y2="49" />
    </svg>
  );
}