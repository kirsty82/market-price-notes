"""快速测试各城市爬虫"""
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

from datetime import date
from crawlers.beijing import fetch_beijing_prices
from crawlers.shanghai import fetch_shanghai_prices
from crawlers.guangzhou import fetch_guangzhou_prices

today = date.today()

print("=" * 40)
print("测试北京爬虫...")
bj = fetch_beijing_prices(today)
print(f"北京: {len(bj)} 条记录")
for d in bj[:3]:
    print(f"  {d['standard_name']} | {d['price_date']} | {d['price']}")

print()
print("=" * 40)
print("测试上海爬虫...")
sh = fetch_shanghai_prices(today)
print(f"上海: {len(sh)} 条记录")
for d in sh[:3]:
    print(f"  {d['standard_name']} | {d['price_date']} | {d['price']}")

print()
print("=" * 40)
print("测试广州爬虫...")
gz = fetch_guangzhou_prices(today)
print(f"广州: {len(gz)} 条记录")
for d in gz[:3]:
    print(f"  {d['standard_name']} | {d['price_date']} | {d['price']}")

print()
print(f"总计: {len(bj) + len(sh) + len(gz)} 条")