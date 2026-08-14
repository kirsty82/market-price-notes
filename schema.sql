-- ============================================================
-- 菜市场价格查询 V1 — 数据库 Schema
-- 目标平台: Supabase (PostgreSQL)
-- 生成日期: 2026-07-19
-- 执行方式: Supabase Dashboard → SQL Editor → 全选执行
-- ============================================================

-- 0. 扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. 城市字典
-- ============================================================
CREATE TABLE IF NOT EXISTS cities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(20)  NOT NULL UNIQUE,
    slug        VARCHAR(20)  NOT NULL UNIQUE,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  cities        IS '城市字典';
COMMENT ON COLUMN cities.id     IS '城市唯一标识';
COMMENT ON COLUMN cities.name   IS '城市名称（北京/上海/广州/深圳）';
COMMENT ON COLUMN cities.slug   IS 'URL 友好标识，如 beijing';

-- ============================================================
-- 2. 分类字典
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(20)  NOT NULL UNIQUE,
    slug        VARCHAR(20)  NOT NULL UNIQUE,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  categories        IS '商品分类字典';
COMMENT ON COLUMN categories.name   IS '分类名称（蔬菜/水果/肉类）';
COMMENT ON COLUMN categories.slug   IS 'URL 友好标识，如 vegetable';

-- ============================================================
-- 3. 商品表
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL,
    category_id UUID         NOT NULL REFERENCES categories(id),
    unit        VARCHAR(10)  NOT NULL DEFAULT '元/斤',
    image_url   TEXT,
    is_hot      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- 同分类下商品名唯一，避免重复
    UNIQUE(name, category_id)
);

COMMENT ON TABLE  products             IS '商品主表';
COMMENT ON COLUMN products.name        IS '商品名称（如"西红柿"）';
COMMENT ON COLUMN products.category_id IS '所属分类';
COMMENT ON COLUMN products.unit        IS '计价单位';
COMMENT ON COLUMN products.is_hot      IS '是否首页热门商品';

-- 分类筛选索引
CREATE INDEX IF NOT EXISTS idx_products_category
    ON products(category_id);

-- 商品名称模糊搜索索引（需要 pg_trgm 扩展）
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
    ON products USING gin (name gin_trgm_ops);

-- ============================================================
-- 4. 首页热门商品配置
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order  SMALLINT     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE(product_id)
);

COMMENT ON TABLE  hot_products             IS '首页热门商品配置';
COMMENT ON COLUMN hot_products.product_id  IS '关联商品';
COMMENT ON COLUMN hot_products.sort_order  IS '展示排序';

-- ============================================================
-- 5. 价格表（核心数据表）
-- ============================================================
CREATE TABLE IF NOT EXISTS prices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    city_id     UUID         NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
    price_date  DATE         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- 同一商品 + 同一城市 + 同一天，仅允许一条记录
    CONSTRAINT uq_prices_product_city_date UNIQUE(product_id, city_id, price_date)
);

COMMENT ON TABLE  prices             IS '每日价格快照';
COMMENT ON COLUMN prices.product_id  IS '关联商品';
COMMENT ON COLUMN prices.city_id     IS '关联城市';
COMMENT ON COLUMN prices.price       IS '当日价格（元/斤）';
COMMENT ON COLUMN prices.price_date  IS '价格日期';

-- 核心查询索引：按商品+城市+日期范围查趋势
CREATE INDEX IF NOT EXISTS idx_prices_product_city_date
    ON prices(product_id, city_id, price_date DESC);

-- 按日期范围查询（用于数据校验、批量导出）
CREATE INDEX IF NOT EXISTS idx_prices_date
    ON prices(price_date);

-- ============================================================
-- 6. Row Level Security（仅允许匿名读取）
-- ============================================================

-- 启用 RLS
ALTER TABLE cities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hot_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices       ENABLE ROW LEVEL SECURITY;

-- 匿名读取策略
CREATE POLICY "anon_select" ON cities       FOR SELECT USING (true);
CREATE POLICY "anon_select" ON categories   FOR SELECT USING (true);
CREATE POLICY "anon_select" ON products     FOR SELECT USING (true);
CREATE POLICY "anon_select" ON hot_products FOR SELECT USING (true);
CREATE POLICY "anon_select" ON prices       FOR SELECT USING (true);

-- ============================================================
-- 执行完毕
-- ============================================================
-- 下一步：
--   1. 在 Supabase SQL Editor 中全选执行本文件
--   2. 执行 seed.sql 导入测试数据
--   3. 在 Supabase Dashboard → Table Editor 验证数据