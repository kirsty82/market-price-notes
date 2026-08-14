/**
 * 城市数据访问层
 */
import { supabase } from "@/lib/supabase/client";
import type { City } from "@/lib/supabase/types";

/**
 * 获取全部城市列表，按 sort_order 排序
 */
export async function getCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`获取城市列表失败: ${error.message}`);
  }

  return data;
}