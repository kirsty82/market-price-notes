import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCities, getCategoriesByCity, getProducts } from "@/lib/data";
import type { City, Category, ProductWithPrice } from "@/lib/supabase/types";
import CitySelector from "@/components/CitySelector";
import CategoryTabs from "@/components/CategoryTabs";
import SearchBar from "@/components/SearchBar";
import ProductList from "@/components/ProductList";
import ProductListSkeleton from "@/components/ProductListSkeleton";

/**
 * 首页 — 农业调查笔记
 * Vite 版：useEffect 从 Supabase 获取数据，纯客户端渲染
 * 路由切换时仅重新获取商品列表，cities/categories 缓存
 */
export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cityParam = searchParams.get("city") || "";
  const categoryParam = searchParams.get("category") || null;
  const searchParam = searchParams.get("search") || "";

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      const c = await getCities();
      if (cancelled) return;
      setCities(c);
    }
    loadMeta();
    return () => { cancelled = true; };
  }, []);

  // 当城市切换时，重新加载该城市有数据的分类列表
  useEffect(() => {
    if (!cityParam) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    getCategoriesByCity(cityParam)
      .then((cat) => { if (!cancelled) setCategories(cat); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, [cityParam]);

  useEffect(() => {
    if (cities.length > 0 && !cityParam) {
      const params = new URLSearchParams(searchParams);
      params.set("city", cities[0].id);
      navigate(`/?${params.toString()}`, { replace: true });
    }
  }, [cities, cityParam, navigate, searchParams]);

  useEffect(() => {
    if (!cityParam) return;
    let cancelled = false;
    getProducts({ cityId: cityParam, categoryId: categoryParam ?? undefined, search: searchParam || undefined })
      .then((data) => { if (!cancelled) setProducts(data); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) { setLoading(false); setIsInitialLoad(false); } });
    return () => { cancelled = true; };
  }, [cityParam, categoryParam, searchParam]);

  const selectedCity = cities.find((c) => c.id === cityParam);
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDay = ["日", "一", "二", "三", "四", "五", "六"][today.getDay()];

  return (
    <div className="page-content min-h-screen max-w-lg mx-auto" style={{ background: "var(--paper-base)" }}>
      {/* 标题区 — 手绘农产品插画横幅，融合进页面背景 */}
      <header className="text-center px-0 pt-0 pb-2">
        {/* 横幅容器 — 全宽无边框，底部渐变融入页面 */}
        <div className="relative w-full mb-4" style={{ marginTop: "-8px" }}>
          <img
            src="/textures/banner-crayon-v9.jpg"
            alt=""
            className="w-full block"
            style={{
              objectFit: "contain",
              maxHeight: "240px",
            }}
          />
          {/* 底部渐变遮罩 — 微调边缘，主体融合已在图片内处理 */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: "16px",
              background: "linear-gradient(to bottom, transparent 0%, var(--paper-base) 100%)",
            }}
          />
          {/* 左右两侧渐变遮罩 — 软化边缘 */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none"
            style={{
              width: "24px",
              background: "linear-gradient(to right, var(--paper-base) 0%, transparent 100%)",
            }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: "24px",
              background: "linear-gradient(to left, var(--paper-base) 0%, transparent 100%)",
            }}
          />
        </div>
        <div className="px-4">
          <h1 className="text-aged-heavy leading-none tracking-[0.04em]" style={{ fontFamily: "var(--font-english)", fontSize: "clamp(2.5rem, 6.5vw, 3.2rem)", color: "var(--ink-primary)", lineHeight: 0.85 }}>
            FIELD MARKET<br /><span style={{ fontSize: "clamp(1.8rem, 4.8vw, 2.4rem)", letterSpacing: "0.06em" }}>PRICE NOTES</span>
          </h1>
          <div className="flex justify-center my-2"><DividerOrnament /></div>
          <div className="flex items-center justify-center gap-3 text-xs">
            <span style={{ fontFamily: "var(--font-handwriting)", color: "var(--ink-muted)", fontSize: "0.9rem" }}>NO. {String(today.getDate()).padStart(2, "0")}</span>
            <span style={{ color: "var(--ink-faint)" }}>·</span>
            <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-muted)" }}>{dateStr} 星期{weekDay}</span>
            <span style={{ color: "var(--ink-faint)" }}>·</span>
            <span style={{ fontFamily: "var(--font-body)", color: "var(--ink-secondary)", fontWeight: 600 }}>{selectedCity?.name ?? "选择城市"}</span>
          </div>
        </div>
      </header>

      {/* 功能区 */}
      <section className="mb-4 px-4">
        <div className="mb-3">{cities.length > 0 && <CitySelector cities={cities} selectedId={cityParam} />}</div>
        <div className="mb-3"><SearchBar defaultValue={searchParam} /></div>
        <div>{categories.length > 0 && <CategoryTabs categories={categories} selectedId={categoryParam} />}</div>
      </section>

      {/* 商品列表 */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-handwriting)", color: "var(--ink-muted)" }}>— Price Ledger —</span>
          <div className="flex-1 h-px" style={{ background: "var(--rule-color)" }} />
        </div>
        {isInitialLoad && loading ? <ProductListSkeleton /> : <ProductList products={products} cityId={cityParam} searchTerm={searchParam} />}
      </section>

      <footer className="mt-8 mb-4 text-center px-4">
        <div className="flex justify-center mb-2"><DividerOrnament /></div>
        <p className="text-xs tracking-[0.1em]" style={{ fontFamily: "var(--font-body)", color: "var(--ink-faint)" }}>手工记录 · 每日更新 · 数据仅供参考</p>
      </footer>
    </div>
  );
}

function DividerOrnament() {
  return (
    <svg viewBox="0 0 180 10" className="w-36 h-auto" fill="none" stroke="var(--ink-faint)" strokeWidth="1" strokeLinecap="round">
      <path d="M8 5 Q 30 2 55 5 T 100 4.5 T 145 5 T 172 5" opacity="0.5" />
      <polygon points="90,2 93,5 90,8 87,5" fill="var(--canopy-rose)" stroke="none" opacity="0.4" />
    </svg>
  );
}