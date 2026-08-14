"""
数据库分类修正脚本
将误分类的商品（水产归入蔬菜/肉类、水果归入蔬菜、肉类归入蔬菜）修正到正确分类
用法:
    python fix_categories.py              # 仅预览
    python fix_categories.py --execute    # 执行修正
"""
import argparse
import logging
import sys

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)

# ============================================================
# 误分类商品清单（按当前分类 → 正确分类 分组）
# ============================================================

# 水产关键词 → 应属于"水产"
AQUATIC_NAMES = [
    "草鱼", "带鱼", "冻带鱼", "花鲢", "黄鱼", "基围虾", "鲫鱼",
    "开刀草鱼", "生鱼", "鱿鱼", "原条鲮鱼", "鲢鱼", "鲈鱼", "黄鳝",
    "红三鱼", "开刀鳙鱼", "原条鳙鱼(花鲢、胖头鱼)", "冻黄花鱼(黄鱼)",
    "原条草鱼(1000克左右一条)", "原条鲮鱼",
]

# 水果关键词 → 应属于"水果"
FRUIT_NAMES = [
    "苹果", "香蕉", "西瓜", "橙子", "梨", "葡萄", "雪梨", "红提",
    "潮州柑", "柚子",
]

# 肉类关键词 → 应属于"肉禽蛋"（仅限当前在蔬菜中的）
MEAT_NAMES_IN_VEGGIE = [
    "鸡蛋", "鸡肉", "鲜羊肉", "冻排骨", "冻鸡翼", "冻凤爪",
]

# 粮油
GRAIN_NAMES = [
    "粳米", "富强粉", "标准粉", "鲁花花生油", "金龙鱼大豆调和油", "大豆油",
]


def main():
    parser = argparse.ArgumentParser(description="修正数据库商品分类")
    parser.add_argument("--execute", action="store_true", help="执行修正（默认仅预览）")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    if not SUPABASE_SERVICE_KEY:
        logger.error("未配置 SUPABASE_SERVICE_KEY，无法操作数据库")
        sys.exit(1)

    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # 1. 获取所有分类
    cats = client.table("categories").select("*").execute()
    cat_map = {c["slug"]: c for c in cats.data}
    logger.info(f"分类: {list(cat_map.keys())}")

    # 2. 获取所有商品
    products = client.table("products").select("id, name, category_id").execute()
    logger.info(f"商品总数: {len(products.data)}")

    # 3. 构建修正映射
    fixes = []  # [(product_id, product_name, old_cat, new_cat_id), ...]

    for p in products.data:
        name = p["name"]
        cat_id = p["category_id"]

        # 找到当前分类 slug
        current_slug = None
        for slug, c in cat_map.items():
            if c["id"] == cat_id:
                current_slug = slug
                break

        # 判断正确分类
        correct_slug = None

        # 水产关键词
        if any(aq in name for aq in AQUATIC_NAMES if aq == name or aq in name):
            correct_slug = "aquatic"
        # 水果关键词
        elif any(f in name for f in FRUIT_NAMES if f == name or f in name):
            correct_slug = "fruit"
        # 肉类（仅当前在蔬菜中的）
        elif any(m in name for m in MEAT_NAMES_IN_VEGGIE if m == name or m in name):
            if current_slug == "vegetable":
                correct_slug = "meat"
        # 粮油
        elif any(g in name for g in GRAIN_NAMES if g == name or g in name):
            if current_slug != "grain":
                correct_slug = "grain"

        if correct_slug and correct_slug != current_slug:
            new_cat = cat_map.get(correct_slug)
            if new_cat:
                fixes.append((p["id"], name, current_slug, correct_slug, new_cat["id"]))

    # 4. 输出预览
    if not fixes:
        logger.info("没有需要修正的商品分类")
        return

    logger.info(f"\n找到 {len(fixes)} 个需要修正的商品:")
    for pid, name, old, new, _ in fixes:
        logger.info(f"  {name}: {old} → {new}")

    if not args.execute:
        logger.info(f"\n[预览模式] 使用 --execute 执行修正")
        return

    # 5. 执行修正
    logger.info(f"\n开始执行修正...")
    success = 0
    for pid, name, old, new, new_cat_id in fixes:
        try:
            client.table("products").update({"category_id": new_cat_id}).eq("id", pid).execute()
            logger.info(f"  ✓ {name}: {old} → {new}")
            success += 1
        except Exception as e:
            logger.error(f"  ✗ {name}: 修正失败: {e}")

    logger.info(f"\n修正完成: {success}/{len(fixes)} 个商品")


if __name__ == "__main__":
    main()