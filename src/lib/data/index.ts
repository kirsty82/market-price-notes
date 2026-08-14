/**
 * 数据访问层 — 统一入口
 */
export { getCities } from "./cities";
export { getCategories, getCategoriesByCity } from "./categories";
export { getProducts, getProductDetail, preloadProductDetail } from "./products";

// 类型重导出
export type {
  City,
  Category,
  Product,
  ProductWithPrice,
  PriceRecord,
  PriceLevel,
  PriceEvaluation,
  PriceTrend,
  TrendPoint,
  ProductQueryParams,
  PriceEvaluationParams,
  PriceTrendParams,
} from "@/lib/supabase/types";