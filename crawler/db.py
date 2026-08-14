"""
Supabase 数据库操作模块
负责：城市/分类/商品/价格 的 CRUD 操作
使用 service_role key 以绕过 RLS 写入限制
"""
import logging
from datetime import date
from typing import Dict, List, Optional

from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY

logger = logging.getLogger(__name__)

# Debug: print key status
import sys as _sys
_stderr = _sys.stderr
_stderr.write(f"[DB] URL={SUPABASE_URL}\n")
_stderr.write(f"[DB] SERVICE_KEY={'***' if SUPABASE_SERVICE_KEY else 'EMPTY'}\n")
_stderr.write(f"[DB] ANON_KEY={'***' if SUPABASE_ANON_KEY else 'EMPTY'}\n")
_stderr.flush()

# Supabase 客户端（service_role 用于写入，anon 用于读取）
_supabase: Optional[Client] = None
_supabase_readonly: Optional[Client] = None


def get_supabase() -> Client:
    """获取 Supabase 客户端（写入权限）"""
    global _supabase
    if _supabase is None:
        _stderr.write(f"[DB] get_supabase: SERVICE_KEY length={len(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else 0}\n")
        _stderr.flush()
        if not SUPABASE_SERVICE_KEY:
            raise ValueError("未配置 SUPABASE_SERVICE_KEY 环境变量，无法写入数据")
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase


def get_supabase_readonly() -> Client:
    """获取 Supabase 只读客户端"""
    global _supabase_readonly
    if _supabase_readonly is None:
        _supabase_readonly = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _supabase_readonly


# ============================================================
# 城市操作
# ============================================================
def get_cities() -> List[Dict]:
    """获取所有城市"""
    client = get_supabase_readonly()
    result = client.table("cities").select("*").order("sort_order").execute()
    return result.data


def get_city_by_slug(slug: str) -> Optional[Dict]:
    """根据 slug 查找城市"""
    client = get_supabase_readonly()
    result = client.table("cities").select("*").eq("slug", slug).execute()
    return result.data[0] if result.data else None


def ensure_city(name: str, slug: str, sort_order: int = 0) -> Dict:
    """确保城市存在，不存在则创建"""
    client = get_supabase()
    existing = get_city_by_slug(slug)
    if existing:
        return existing

    result = client.table("cities").insert({
        "name": name,
        "slug": slug,
        "sort_order": sort_order,
    }).execute()
    logger.info(f"数据库: 创建城市 {name} ({slug})")
    return result.data[0]


# ============================================================
# 分类操作
# ============================================================
def get_categories() -> List[Dict]:
    """获取所有分类"""
    client = get_supabase_readonly()
    result = client.table("categories").select("*").order("sort_order").execute()
    return result.data


def get_category_by_slug(slug: str) -> Optional[Dict]:
    """根据 slug 查找分类"""
    client = get_supabase_readonly()
    result = client.table("categories").select("*").eq("slug", slug).execute()
    return result.data[0] if result.data else None


def ensure_category(name: str, slug: str, sort_order: int = 0) -> Dict:
    """确保分类存在，不存在则创建"""
    client = get_supabase()
    existing = get_category_by_slug(slug)
    if existing:
        return existing

    result = client.table("categories").insert({
        "name": name,
        "slug": slug,
        "sort_order": sort_order,
    }).execute()
    logger.info(f"数据库: 创建分类 {name} ({slug})")
    return result.data[0]


# ============================================================
# 商品操作
# ============================================================
def get_product_by_name_category(name: str, category_id: str) -> Optional[Dict]:
    """根据名称和分类查找商品"""
    client = get_supabase_readonly()
    result = client.table("products").select("*").eq("name", name).eq("category_id", category_id).execute()
    return result.data[0] if result.data else None


def ensure_product(name: str, category_id: str, unit: str = "元/500克") -> Dict:
    """确保商品存在，不存在则创建"""
    client = get_supabase()
    existing = get_product_by_name_category(name, category_id)
    if existing:
        return existing

    result = client.table("products").insert({
        "name": name,
        "category_id": category_id,
        "unit": unit,
    }).execute()
    logger.debug(f"数据库: 创建商品 {name}")
    return result.data[0]


# ============================================================
# 价格操作
# ============================================================
def get_product_id_map() -> Dict[str, str]:
    """
    获取所有商品名称→ID的映射
    返回: {商品名: product_id}
    """
    client = get_supabase_readonly()
    result = client.table("products").select("id, name").execute()
    return {item["name"]: item["id"] for item in result.data}


def get_city_id_map() -> Dict[str, str]:
    """
    获取所有城市 slug→ID 的映射
    返回: {slug: city_id}
    """
    client = get_supabase_readonly()
    result = client.table("cities").select("id, slug").execute()
    return {item["slug"]: item["id"] for item in result.data}


def upsert_price(product_id: str, city_id: str, price: float, price_date: str) -> bool:
    """
    插入或更新价格记录（使用 upsert 避免重复）
    Returns: 是否成功
    """
    client = get_supabase()
    try:
        result = client.table("prices").upsert({
            "product_id": product_id,
            "city_id": city_id,
            "price": round(price, 2),
            "price_date": price_date,
        }, on_conflict="product_id, city_id, price_date").execute()
        return True
    except Exception as e:
        logger.error(f"数据库: upsert 价格失败 {product_id}/{price_date}: {e}")
        return False


def save_prices(records: List[Dict]) -> int:
    """
    批量保存价格记录
    Args:
        records: [{standard_name, city, price, price_date, unit, category?}, ...]
    Returns: 成功保存的记录数
    """
    # 1. 确保基础设施存在
    categories = {
        "蔬菜": ensure_category("蔬菜", "vegetable", 1),
        "肉禽蛋": ensure_category("肉禽蛋", "meat", 2),
        "水果": ensure_category("水果", "fruit", 3),
        "粮油": ensure_category("粮油", "grain", 4),
        "水产": ensure_category("水产", "aquatic", 5),
    }

    cities = {
        "beijing": ensure_city("北京", "beijing", 1),
        "shanghai": ensure_city("上海", "shanghai", 2),
        "guangzhou": ensure_city("广州", "guangzhou", 3),
    }

    # 2. 确保所有商品存在
    product_map = get_product_id_map()
    city_map = get_city_id_map()

    success_count = 0
    for record in records:
        standard_name = record["standard_name"]
        city_key = record["city"]
        category_key = record.get("category", "蔬菜")

        # 确定分类
        if category_key not in categories:
            logger.warning(f"数据库: 未知分类 '{category_key}'，商品 '{standard_name}' 默认归入蔬菜")
            category_key = "蔬菜"

        cat_id = categories[category_key]["id"]
        city_id = city_map.get(city_key)

        if not city_id:
            logger.warning(f"数据库: 未知城市 {city_key}")
            continue

        # 确保商品存在
        if standard_name not in product_map:
            product = ensure_product(standard_name, cat_id, record.get("unit", "元/500克"))
            product_map[standard_name] = product["id"]

        product_id = product_map[standard_name]

        # 价格单位转换（广州是元/公斤，需要转换为元/500克保持统一）
        price = record["price"]
        if record.get("unit") == "元/公斤":
            price = price / 2  # 转换为元/500克

        # 保存价格
        if upsert_price(product_id, city_id, price, record["price_date"]):
            success_count += 1

    return success_count


if __name__ == "__main__":
    # 测试：列出当前数据库中的城市和商品数量
    logging.basicConfig(level=logging.INFO)
    cities = get_cities()
    products = get_product_id_map()
    print(f"城市: {len(cities)} 个")
    print(f"商品: {len(products)} 个")