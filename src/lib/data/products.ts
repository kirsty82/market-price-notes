import { supabase } from "@/lib/supabase/client";
import type {
  PriceEvaluation,
  PriceLevel,
  PriceTrend,
  ProductQueryParams,
  PriceTrendParams,
  ProductWithPrice,
} from "@/lib/supabase/types";

// ============================================================
// 详情页预加载缓存 — hover 时触发，点击时瞬时获取
// ============================================================
type DetailResult = { trend: PriceTrend; evaluation: PriceEvaluation | null };
const detailCache = new Map<string, Promise<DetailResult>>();

function cacheKey(productId: string, cityId: string): string {
  return `${productId}:${cityId}`;
}

/** hover 预加载：不阻塞 UI，不返回数据 */
export function preloadProductDetail(params: PriceTrendParams): void {
  const key = cacheKey(params.productId, params.cityId);
  if (!detailCache.has(key)) {
    detailCache.set(key, fetchProductDetail(params));
  }
}

function computePriceLevel(fluctuation: number): PriceLevel {
  if (fluctuation < -5) return "便宜";
  if (fluctuation > 5) return "偏贵";
  return "正常";
}

function buildReason(productName: string, fluctuation: number, level: PriceLevel): string {
  const absPct = Math.abs(fluctuation).toFixed(1);
  const direction = fluctuation >= 0 ? "高于" : "低于";
  switch (level) {
    case "便宜": return `${productName}当前价格${direction}30天均价${absPct}%，超过10%，价格实惠`;
    case "偏贵": return `${productName}当前价格${direction}30天均价${absPct}%，超过10%，价格偏高`;
    default: return `${productName}当前价格${direction}30天均价${absPct}%，在±10%以内，价格平稳`;
  }
}

export async function getProducts(params: ProductQueryParams): Promise<ProductWithPrice[]> {
  const { cityId, categoryId, search } = params;
  let productQuery = supabase.from("products").select("*, categories!inner(name)").order("name");
  if (categoryId) productQuery = productQuery.eq("category_id", categoryId);
  if (search) productQuery = productQuery.ilike("name", `%${search}%`);
  const { data: products, error: productError } = await productQuery;
  if (productError) throw new Error(`获取商品列表失败: ${productError.message}`);
  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split("T")[0];
  const { data: prices, error: priceError } = await supabase
    .from("prices").select("product_id, price, price_date")
    .in("product_id", productIds).eq("city_id", cityId)
    .gte("price_date", dateStr).order("price_date", { ascending: false });
  if (priceError) throw new Error(`获取价格数据失败: ${priceError.message}`);

  const priceMap = new Map<string, { latest: number | null; latestDate: string | null; avg: number | null }>();
  for (const pid of productIds) {
    const pp = (prices || []).filter((p) => p.product_id === pid);
    if (pp.length === 0) { priceMap.set(pid, { latest: null, latestDate: null, avg: null }); continue; }
    const avg = pp.reduce((s, p) => s + p.price, 0) / pp.length;
    priceMap.set(pid, { latest: pp[0].price, latestDate: pp[0].price_date, avg: parseFloat(avg.toFixed(2)) });
  }

  return products.map((p) => {
    const catName = (p as any).categories?.name ?? "";
    const pm = priceMap.get(p.id)!;
    const fluctuation = pm.latest !== null && pm.avg !== null && pm.avg !== 0
      ? parseFloat((((pm.latest - pm.avg) / pm.avg) * 100).toFixed(1)) : null;
    return {
      id: p.id, name: p.name, category_id: p.category_id, unit: p.unit,
      image_url: p.image_url, is_hot: p.is_hot, created_at: p.created_at,
      category_name: catName, latest_price: pm.latest, latest_date: pm.latestDate,
      avg_price_30d: pm.avg, fluctuation,
      price_level: fluctuation !== null ? computePriceLevel(fluctuation) : null,
    };
  }).filter((p) => p.latest_price !== null); // 仅保留当前城市有价格的商品
}

/** 实际 Supabase 查询（内部函数） */
async function fetchProductDetail(
  params: PriceTrendParams
): Promise<DetailResult> {
  const { productId, cityId, days = 30 } = params;
  const limitDays = Math.min(days, 90);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - limitDays);
  const dateStr = startDate.toISOString().split("T")[0];

  const [priceRes, productRes, cityRes] = await Promise.all([
    supabase.from("prices").select("price, price_date").eq("product_id", productId).eq("city_id", cityId).gte("price_date", dateStr).order("price_date", { ascending: true }),
    supabase.from("products").select("name, unit").eq("id", productId).single(),
    supabase.from("cities").select("name").eq("id", cityId).single(),
  ]);
  if (priceRes.error) throw new Error(`获取价格数据失败: ${priceRes.error.message}`);

  const prices = priceRes.data || [];
  const productName = productRes.data?.name ?? "";
  const productUnit = productRes.data?.unit ?? "元/斤";
  const cityName = cityRes.data?.name ?? "";
  const trend = prices.map((p) => ({ date: p.price_date, price: p.price }));
  const avgPrice = trend.length > 0 ? parseFloat((trend.reduce((s, p) => s + p.price, 0) / trend.length).toFixed(2)) : 0;
  const priceTrend: PriceTrend = { product_name: productName, city_name: cityName, unit: productUnit, avg_price: avgPrice, trend };

  let evaluation: PriceEvaluation | null = null;
  if (prices.length > 0) {
    const sortedDesc = [...prices].sort((a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime());
    const latestPrice = sortedDesc[0].price;
    const latestDate = sortedDesc[0].price_date;
    const avgPrice30d = parseFloat((prices.reduce((s, p) => s + p.price, 0) / prices.length).toFixed(2));
    const fluctuation = parseFloat((((latestPrice - avgPrice30d) / avgPrice30d) * 100).toFixed(1));
    const priceLevel = computePriceLevel(fluctuation);
    evaluation = {
      product_name: productName, city_name: cityName, unit: productUnit,
      latest_price: latestPrice, latest_date: latestDate, avg_price_30d: avgPrice30d,
      fluctuation, price_level: priceLevel,
      price_level_reason: buildReason(productName, fluctuation, priceLevel),
    };
  }
  return { trend: priceTrend, evaluation };
}

/** 获取商品详情（带缓存，支持 hover 预加载） */
export async function getProductDetail(
  params: PriceTrendParams
): Promise<DetailResult> {
  const key = cacheKey(params.productId, params.cityId);
  const cached = detailCache.get(key);
  if (cached) return cached;

  const promise = fetchProductDetail(params);
  detailCache.set(key, promise);
  return promise;
}