"""
菜市场价格爬虫 — 主入口
每日运行此脚本，自动爬取北京、上海、广州三城菜篮子价格
并写入 Supabase 数据库

用法:
    python main.py                      # 爬取今天的数据
    python main.py --date 2026-08-05    # 爬取指定日期
    python main.py --days-back 30       # 爬取近30天数据（回填历史）
    python main.py --dry-run            # 试运行（不写入数据库）
    python main.py --city beijing       # 只爬取指定城市
"""
import argparse
import logging
import sys
from datetime import date, datetime

from config import CITIES, LOG_FILE
from crawlers.beijing import fetch_beijing_prices
from crawlers.shanghai import fetch_shanghai_prices
from crawlers.guangzhou import fetch_guangzhou_prices
from db import save_prices


def setup_logging():
    """配置日志"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(LOG_FILE, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def main():
    parser = argparse.ArgumentParser(description="菜市场价格爬虫")
    parser.add_argument("--date", type=str, help="目标日期 YYYY-MM-DD，默认今天")
    parser.add_argument("--days-back", type=int, default=0, help="回溯天数，0=仅当天，30=近30天")
    parser.add_argument("--dry-run", action="store_true", help="试运行，不写入数据库")
    parser.add_argument("--city", type=str, help="只爬取指定城市 (beijing/shanghai/guangzhou)")
    args = parser.parse_args()

    setup_logging()
    logger = logging.getLogger("main")

    # 解析日期
    if args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d").date()
        except ValueError:
            logger.error(f"日期格式错误: {args.date}，应为 YYYY-MM-DD")
            sys.exit(1)
    else:
        target_date = date.today()

    logger.info(f"{'='*50}")
    logger.info(f"菜市场价格爬虫启动 — 目标日期: {target_date.isoformat()}, 回溯: {args.days_back}天")
    logger.info(f"{'='*50}")

    # 爬取各城市数据
    all_records = []

    if args.city:
        cities_to_crawl = {args.city: CITIES[args.city]} if args.city in CITIES else {}
        if not cities_to_crawl:
            logger.error(f"未知城市: {args.city}，可选: {list(CITIES.keys())}")
            sys.exit(1)
    else:
        cities_to_crawl = CITIES

    for city_key, city_info in cities_to_crawl.items():
        if not city_info.get("enabled", True):
            continue

        logger.info(f"\n--- 爬取 {city_info['name']} ---")

        if city_key == "beijing":
            records = fetch_beijing_prices(target_date, days_back=args.days_back)
        elif city_key == "shanghai":
            records = fetch_shanghai_prices(target_date, days_back=args.days_back)
        elif city_key == "guangzhou":
            records = fetch_guangzhou_prices(target_date, days_back=args.days_back)
        else:
            continue

        logger.info(f"{city_info['name']}: 获取 {len(records)} 条价格记录")
        all_records.extend(records)

    logger.info(f"\n总计: {len(all_records)} 条价格记录")

    if not all_records:
        logger.warning("未获取到任何价格数据，请检查网络或数据源")
        return

    # 按城市统计
    from collections import Counter
    city_counts = Counter(r["city"] for r in all_records)
    for city_key, count in city_counts.items():
        city_name = CITIES.get(city_key, {}).get("name", city_key)
        logger.info(f"  {city_name}: {count} 条")

    # 写入数据库
    if args.dry_run:
        logger.info("\n[试运行] 跳过数据库写入")
        logger.info("前 10 条记录预览:")
        for r in all_records[:10]:
            logger.info(f"  {r['standard_name']} | {r['city']} | {r['price_date']} | ¥{r['price']}")
    else:
        logger.info("\n写入数据库...")
        try:
            success_count = save_prices(all_records)
            logger.info(f"成功写入 {success_count}/{len(all_records)} 条记录")
        except Exception as e:
            logger.error(f"数据库写入失败: {e}")
            sys.exit(1)

    logger.info(f"\n{'='*50}")
    logger.info("爬虫任务完成")
    logger.info(f"{'='*50}")


if __name__ == "__main__":
    main()