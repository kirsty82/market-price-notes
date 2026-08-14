"""
回填脚本 — 一次性爬取近30天历史数据并写入 Supabase
用法:
    python backfill_30days.py              # 回填全部三城近30天数据
    python backfill_30days.py --dry-run    # 试运行（不写入数据库）
    python backfill_30days.py --city beijing  # 只回填指定城市
"""
import argparse
import logging
import sys
import time
from datetime import date, timedelta

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
    parser = argparse.ArgumentParser(description="菜市场30天历史数据回填")
    parser.add_argument("--dry-run", action="store_true", help="试运行，不写入数据库")
    parser.add_argument("--city", type=str, help="只回填指定城市 (beijing/shanghai/guangzhou)")
    parser.add_argument("--days", type=int, default=30, help="回溯天数，默认30天")
    args = parser.parse_args()

    setup_logging()
    logger = logging.getLogger("backfill")

    target_date = date.today()
    days_back = args.days

    logger.info(f"{'='*60}")
    logger.info(f"30天历史数据回填启动")
    logger.info(f"日期范围: {(target_date - timedelta(days=days_back)).isoformat()} ~ {target_date.isoformat()}")
    logger.info(f"模式: {'试运行（不写入）' if args.dry_run else '正式写入'}")
    logger.info(f"{'='*60}")

    if args.city:
        cities_to_crawl = {args.city: CITIES[args.city]} if args.city in CITIES else {}
        if not cities_to_crawl:
            logger.error(f"未知城市: {args.city}，可选: {list(CITIES.keys())}")
            sys.exit(1)
    else:
        cities_to_crawl = CITIES

    all_records = []
    start_time = time.time()

    for city_key, city_info in cities_to_crawl.items():
        if not city_info.get("enabled", True):
            continue

        city_start = time.time()
        logger.info(f"\n{'─'*40}")
        logger.info(f"开始回填 {city_info['name']}（回溯 {days_back} 天）")
        logger.info(f"{'─'*40}")

        try:
            if city_key == "beijing":
                records = fetch_beijing_prices(target_date, days_back=days_back)
            elif city_key == "shanghai":
                records = fetch_shanghai_prices(target_date, days_back=days_back)
            elif city_key == "guangzhou":
                records = fetch_guangzhou_prices(target_date, days_back=days_back)
            else:
                continue

            city_elapsed = time.time() - city_start
            logger.info(f"{city_info['name']}: 获取 {len(records)} 条记录，耗时 {city_elapsed:.1f}s")
            all_records.extend(records)

        except Exception as e:
            logger.error(f"{city_info['name']}: 回填异常: {e}")
            continue

    total_elapsed = time.time() - start_time
    logger.info(f"\n{'='*60}")
    logger.info(f"回填完成: 共 {len(all_records)} 条记录，总耗时 {total_elapsed:.1f}s")
    logger.info(f"{'='*60}")

    if not all_records:
        logger.warning("未获取到任何数据")
        return

    # 按城市和日期统计
    from collections import Counter
    city_counts = Counter(r["city"] for r in all_records)
    date_counts = Counter(r["price_date"] for r in all_records)
    for city_key, count in sorted(city_counts.items()):
        city_name = CITIES.get(city_key, {}).get("name", city_key)
        logger.info(f"  {city_name}: {count} 条")
    logger.info(f"  覆盖日期: {len(date_counts)} 天")

    if args.dry_run:
        logger.info("\n[试运行] 跳过数据库写入，预览前 10 条:")
        for r in all_records[:10]:
            logger.info(f"  {r['standard_name']} | {r['city']} | {r['price_date']} | ¥{r['price']}")
    else:
        logger.info("\n写入 Supabase...")
        try:
            success_count = save_prices(all_records)
            logger.info(f"成功写入 {success_count}/{len(all_records)} 条记录")
        except Exception as e:
            logger.error(f"数据库写入失败: {e}")
            sys.exit(1)

    logger.info(f"\n回填任务结束")


if __name__ == "__main__":
    main()