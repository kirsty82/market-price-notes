"""
清理旧数据脚本
删除 seed.sql 中插入的所有模拟数据，保留表结构
执行顺序：prices → hot_products → products → 删除深圳城市
"""
import logging
import sys
import os

# 确保能加载 config
sys.path.insert(0, os.path.dirname(__file__))

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("cleanup")

# 已知的 seed 数据 ID（来自 seed.sql）
SHENZHEN_ID = "1ec22351-66b7-4105-85fb-a6bba3a981e4"

# 旧商品 ID 列表
OLD_PRODUCT_IDS = [
    "5bff4a85-68db-4f82-a669-a9a6f1043630",  # 西红柿
    "77ca9879-ffb9-4375-bdff-3dc0a222a4b8",  # 黄瓜
    "8b2ac980-1588-4ad4-a294-721fd14c9ecf",  # 白菜
    "802651fa-0037-456f-a2c6-772513c44513",  # 土豆
    "fb8d8cf6-35a2-4a38-afea-7760f0763cb4",  # 苹果
    "21c13718-6444-4bcf-9e1c-474a5ff1f710",  # 香蕉
    "d3e9cbee-ed89-43d9-8b1a-fd1d2871020e",  # 猪肉
    "013064ca-7a3c-46dd-9a61-79be6721fe79",  # 牛肉
    "d8f7d9b1-e928-44a8-9444-81714dc226ef",  # 鸡蛋
]

OLD_HOT_PRODUCT_IDS = [
    "51d477ca-b9aa-4c4e-99cf-481eeea314ec",
    "1f927dea-a71e-45f3-9212-27d20de7833a",
    "c68f0080-17aa-4831-8f22-5eec1ba0ce05",
    "0f22fe98-2511-42ef-b017-4a5dfa563f5d",
    "7f8f9f03-2f4d-4556-bf4b-1926e3f58287",
]


def main():
    logger.info("=" * 50)
    logger.info("开始清理旧数据")
    logger.info(f"Supabase URL: {SUPABASE_URL}")
    logger.info(f"Service Key 长度: {len(SUPABASE_SERVICE_KEY) if SUPABASE_SERVICE_KEY else 0}")
    logger.info("=" * 50)

    if not SUPABASE_SERVICE_KEY:
        logger.error("未配置 SUPABASE_SERVICE_KEY，无法执行清理")
        sys.exit(1)

    # 创建客户端
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # 步骤1: 删除所有旧价格数据（按日期范围：2026-06-20 ~ 2026-07-19）
    logger.info("\n[步骤1] 删除旧价格数据...")
    try:
        result = client.table("prices").delete().gte("price_date", "2026-06-20").lte("price_date", "2026-07-19").execute()
        # 检查返回的数据
        count = len(result.data) if result.data else 0
        logger.info(f"  已删除 {count} 条价格记录")
    except Exception as e:
        logger.error(f"  删除价格数据失败: {e}")
        logger.info("  尝试按 ID 逐个删除...")
        # 先查询所有旧价格
        price_result = client.table("prices").select("id").gte("price_date", "2026-06-20").lte("price_date", "2026-07-19").execute()
        if price_result.data:
            for p in price_result.data:
                try:
                    client.table("prices").delete().eq("id", p["id"]).execute()
                except Exception as e2:
                    logger.error(f"  删除价格 {p['id']} 失败: {e2}")
            logger.info(f"  已处理 {len(price_result.data)} 条价格记录")

    # 步骤2: 删除热门商品配置
    logger.info("\n[步骤2] 删除旧热门商品配置...")
    try:
        result = client.table("hot_products").delete().in_("id", OLD_HOT_PRODUCT_IDS).execute()
        count = len(result.data) if result.data else 0
        logger.info(f"  已删除 {count} 条热门商品配置")
    except Exception as e:
        logger.error(f"  删除热门商品配置失败: {e}")

    # 步骤3: 删除旧商品
    logger.info("\n[步骤3] 删除旧商品...")
    try:
        result = client.table("products").delete().in_("id", OLD_PRODUCT_IDS).execute()
        count = len(result.data) if result.data else 0
        logger.info(f"  已删除 {count} 个商品")
    except Exception as e:
        logger.error(f"  删除商品失败: {e}")

    # 步骤4: 删除深圳城市
    logger.info("\n[步骤4] 删除深圳城市...")
    try:
        result = client.table("cities").delete().eq("id", SHENZHEN_ID).execute()
        count = len(result.data) if result.data else 0
        logger.info(f"  已删除深圳城市记录")
    except Exception as e:
        logger.error(f"  删除深圳城市失败: {e}")

    # 步骤5: 验证清理结果
    logger.info("\n[步骤5] 验证清理结果...")
    try:
        cities = client.table("cities").select("name, slug").execute()
        categories = client.table("categories").select("name, slug").execute()
        products = client.table("products").select("name").execute()
        prices = client.table("prices").select("id", count="exact").execute()

        logger.info(f"  城市: {len(cities.data)} 个 - {[c['name'] for c in cities.data]}")
        logger.info(f"  分类: {len(categories.data)} 个 - {[c['name'] for c in categories.data]}")
        logger.info(f"  商品: {len(products.data)} 个")
        logger.info(f"  价格: {len(prices.data)} 条")
    except Exception as e:
        logger.error(f"  验证失败: {e}")

    logger.info("\n" + "=" * 50)
    logger.info("清理完成！")
    logger.info("=" * 50)


if __name__ == "__main__":
    main()