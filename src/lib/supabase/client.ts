/**
 * Supabase 客户端初始化
 * Vite 环境变量：VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * 公共匿名客户端
 * 所有表已启用 RLS，仅允许 SELECT 操作
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "public" },
});