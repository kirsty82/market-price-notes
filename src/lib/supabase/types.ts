/**
 * 数据库表类型定义
 * 与 schema.sql 表结构一一对应
 */

/** 城市字典 */
export interface City {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

/** 商品分类字典 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

/** 商品 */
export interface Product {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  image_url: string | null;
  is_hot: boolean;
  created_at: string;
}

/** 商品列表项（含价格聚合信息） */
export interface ProductWithPrice extends Product {
  category_name: string;
  latest_price: number | null;
  latest_date: string | null;
  avg_price_30d: number | null;
  fluctuation: number | null;
  price_level: PriceLevel | null;
}

/** 每日价格记录 */
export interface PriceRecord {
  id: string;
  product_id: string;
  city_id: string;
  price: number;
  price_date: string;
  created_at: string;
}

/** 价格评价等级 */
export type PriceLevel = "便宜" | "正常" | "偏贵";

/** 价格评价结果 */
export interface PriceEvaluation {
  product_name: string;
  city_name: string;
  unit: string;
  latest_price: number;
  latest_date: string;
  avg_price_30d: number;
  fluctuation: number;
  price_level: PriceLevel;
  price_level_reason: string;
}

/** 价格趋势数据点 */
export interface TrendPoint {
  date: string;
  price: number;
}

/** 价格趋势 */
export interface PriceTrend {
  product_name: string;
  city_name: string;
  unit: string;
  avg_price: number;
  trend: TrendPoint[];
}

/** 商品查询参数 */
export interface ProductQueryParams {
  cityId: string;
  categoryId?: string;
  search?: string;
}

/** 价格评价输入 */
export interface PriceEvaluationParams {
  productId: string;
  cityId: string;
}

/** 价格趋势输入 */
export interface PriceTrendParams {
  productId: string;
  cityId: string;
  days?: number;
}