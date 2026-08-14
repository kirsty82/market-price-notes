/**
 * 分类数据访问层 — 优化版
 * 1. 三次查询缩减为两次（prices → products+categories JOIN）
 * 2. 内存缓存避免重复查询
 */
import { supabase } from "@/lib/supabase/client";
import type { Category } from "@/lib/supabase/types";

/** 每个城市分类缓存 — 切换回已访问城市时免查询 */
const cache = new Map<string, Category[]>();

/**
 * 获取全部分类列表，按 sort_order 排序
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`获取分类列表失败: ${error.message}`);
  }

  return data;
}

/**
 * 获取指定城市下有价格数据的分类列表
 * 优化：两次查询（prices 获取 product_id → products+categories JOIN 获取分类）
 * 带内存缓存，切换回已访问城市时免查询
 */
export async function getCategoriesByCity(cityId: string): Promise<Category[]> {
  // 缓存命中直接返回
  const cached = cache.get(cityId);
  if (cached) return cached;

  // 查询 1：获取该城市有价格的商品 ID（去重）
  const { data: priceData, error: priceError } = await supabase
    .from("prices")
    .select("product_id")
    .eq("city_id", cityId);

  if (priceError) {
    throw new Error(`查询价格数据失败: ${priceError.message}`);
  }

  if (!priceData || priceData.length === 0) {
    cache.set(cityId, []);
    return [];
  }

  const productIds = [...new Set(priceData.map((p) => p.product_id))];

  // 查询 2：通过 products JOIN categories 一次获取分类详情
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("category_id, categories!inner(id, name, sort_order)")
    .in("id", productIds);

  if (productError) {
    throw new Error(`查询商品分类失败: ${productError.message}`);
  }

  // 去重并排序
  const categoryMap = new Map<string, Category>();
  for (const row of productData || []) {
    const cat = (row as any).categories;
    if (cat && !categoryMap.has(cat.id)) {
      categoryMap.set(cat.id, { id: cat.id, name: cat.name, sort_order: cat.sort_order });
    }
  }
  const result = [...categoryMap.values()].sort((a, b) => a.sort_order - b.sort_order);

  cache.set(cityId, result);
  return result;
}

/** 清除分类缓存（如数据更新后调用） */
export function clearCategoriesCache(): void {
  cache.clear();
}