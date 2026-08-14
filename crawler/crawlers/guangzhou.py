"""
广州发改委菜篮子价格爬虫
数据来源: http://121.8.226.252/basic/sendReportInfoes
通过访问 HTML 报表页面获取每日零售价格
"""
import logging
import re
from datetime import date, timedelta
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup
from html import unescape

from config import REQUEST_TIMEOUT, REQUEST_HEADERS
from name_mapping import local_to_standard

logger = logging.getLogger(__name__)

# 广州菜篮子价格系统基础 URL
GZ_BASE_URL = "http://121.8.226.252/basic/sendReportInfoes"

# 报表配置: (报表名, srhSrId, srhReportId)
GZ_REPORTS = [
    # 全市菜篮子平均零售价（蔬菜+肉禽蛋+水产，共68个品种）
    ("全市菜篮子", 2, 15),
    # 米袋子行情（粮油类，14个品种）
    ("米袋子", 4, 16),
    # 水果价格（11个品种）
    ("水果", 7, 313),
]

# ============================================================
# 广州 HTML 报表分区头 → 分类 映射
# 全市菜篮子报表包含 4 个分区，需要按分区头正确分类
# ============================================================
GZ_SECTION_CATEGORY_MAP = {
    "蔬菜": "蔬菜",
    "水产": "水产",
    "肉禽蛋": "肉禽蛋",
    "冰冻及冰鲜品": None,  # 混合分区，需逐项判断
}

# 冰冻及冰鲜品分区中的水产关键词
FROZEN_AQUATIC_KEYWORDS = ["鱼", "鱿", "虾", "蟹", "贝", "螺", "蛏", "蚝", "蚬", "蚌"]

# 水果报表（独立报表 srhReportId=313）中的品种
FRUIT_STANDARD_NAMES = {
    "苹果", "香蕉", "西瓜", "橙子", "梨", "葡萄",
}


def fetch_guangzhou_prices(target_date: Optional[date] = None, days_back: int = 0) -> List[Dict]:
    """
    爬取广州所有菜篮子品种零售价格
    Args:
        target_date: 目标日期，默认今天
        days_back: 回溯天数，0=仅当天，30=近30天（逐日循环请求）
    Returns:
        [{standard_name, local_name, price, price_date, unit, category}, ...]
    """
    if target_date is None:
        target_date = date.today()

    all_records = []
    seen_dates = set()  # 去重：同一天不重复爬取

    for day_offset in range(days_back + 1):
        current_date = target_date - timedelta(days=day_offset)
        date_str = current_date.isoformat()

        if date_str in seen_dates:
            continue
        seen_dates.add(date_str)

        for report_name, sr_id, report_id in GZ_REPORTS:
            try:
                url = f"{GZ_BASE_URL}/sendReportDeatil?srhSrId={sr_id}&srhReportId={report_id}&srhCycle={date_str}"
                logger.info(f"广州: 获取 {report_name}({date_str}) → {url}")

                records = _fetch_gz_report(url, date_str, report_name)
                all_records.extend(records)

            except Exception as e:
                logger.error(f"广州: {report_name}({date_str}) 爬取异常: {e}")

    # 按报表统计
    from collections import Counter
    report_counts = Counter()
    for r in all_records:
        report_counts[r.get("_report", "未知")] += 1
    for report_name, count in report_counts.items():
        logger.info(f"广州: {report_name} → {count} 条记录")

    return all_records


def _fetch_gz_report(url: str, date_str: str, report_name: str) -> List[Dict]:
    """获取单个广州报表"""
    try:
        resp = requests.get(url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
        resp.encoding = 'utf-8'

        if resp.status_code != 200:
            logger.warning(f"广州: {report_name}({date_str}) HTTP {resp.status_code}")
            return []

        records = _parse_gz_html(resp.text, date_str, report_name)
        # 为每条记录标记来源报表
        for r in records:
            r["_report"] = report_name
        return records

    except Exception as e:
        logger.error(f"广州: {report_name}({date_str}) 请求失败: {e}")
        return []


def _parse_gz_html(html: str, date_str: str, report_name: str) -> List[Dict]:
    """
    解析广州 HTML 报表
    全市菜篮子报表包含多个分区（蔬菜/水产/肉禽蛋/冰冻及冰鲜品），
    需要按分区头正确分类，避免水产和水果混入蔬菜
    """
    soup = BeautifulSoup(html, 'html.parser')

    # 查找数据表格
    table = soup.find('table', class_='gridtable')
    if not table:
        table = soup.find('table')
    if not table:
        logger.warning(f"广州: {report_name} 未找到数据表格")
        return []

    # 米袋子报表：直接按粮油分类
    if "米袋子" in report_name:
        return _parse_simple_table(table, date_str, "粮油", report_name)

    # 水果报表：直接按水果分类
    if "水果" in report_name:
        return _parse_simple_table(table, date_str, "水果", report_name)

    # 全市菜篮子报表：需要检测分区头
    return _parse_sectioned_table(table, date_str, report_name)


def _parse_simple_table(table, date_str: str, category: str, report_name: str) -> List[Dict]:
    """解析简单报表（米袋子、水果等单一分类报表）"""
    records = []
    rows = table.find_all('tr')

    for row in rows:
        cells = row.find_all('td')
        if len(cells) < 3:
            continue

        local_name = cells[0].get_text(strip=True)
        unit = cells[1].get_text(strip=True) if len(cells) > 1 else ""
        price_str = cells[2].get_text(strip=True) if len(cells) > 2 else ""

        if not local_name or not price_str:
            continue
        if local_name in ["品种", "名称", "商品"]:
            continue

        try:
            price = float(price_str.replace(",", ""))
        except ValueError:
            continue

        standard_name = local_to_standard("guangzhou", local_name)
        if standard_name is None:
            standard_name = local_name

        records.append({
            "standard_name": standard_name,
            "local_name": local_name,
            "city": "guangzhou",
            "price": price,
            "price_date": date_str,
            "unit": _normalize_unit(unit),
            "category": category,
        })

    return records


def _parse_sectioned_table(table, date_str: str, report_name: str) -> List[Dict]:
    """
    解析带分区的全市菜篮子报表
    检测分区头行（含 colspan 的 td），按分区正确分配分类
    全市菜篮子表格每行有3组商品（品种 | 单位 | 价格），共9列
    """
    records = []
    rows = table.find_all('tr')
    current_category = "蔬菜"  # 默认分类

    for row in rows:
        cells = row.find_all('td')

        # 检测分区头行：带有 colspan 且文本匹配分区关键词
        if len(cells) == 1 and cells[0].get('colspan'):
            section_text = cells[0].get_text(strip=True)
            for section_key, category in GZ_SECTION_CATEGORY_MAP.items():
                if section_key in section_text:
                    current_category = category if category else section_key
                    logger.debug(f"广州: 检测到分区 [{section_text}] → {current_category}")
                    break
            continue

        # 跳过空行
        if len(cells) < 3:
            continue

        # 全市菜篮子每行有3组商品（品种/单位/价格），每组3列，共9列
        # 逐组解析
        for group_start in range(0, len(cells), 3):
            if group_start + 2 >= len(cells):
                break

            local_name = cells[group_start].get_text(strip=True)
            unit = cells[group_start + 1].get_text(strip=True)
            price_str = cells[group_start + 2].get_text(strip=True)

            if not local_name or not price_str:
                continue
            if local_name in ["品种", "名称", "商品"]:
                continue

            try:
                price = float(price_str.replace(",", ""))
            except ValueError:
                continue

            # 映射到标准名称
            standard_name = local_to_standard("guangzhou", local_name)
            if standard_name is None:
                standard_name = local_name

            # 确定分类：冰冻及冰鲜品分区需要逐项判断
            if current_category == "冰冻及冰鲜品":
                if any(kw in local_name for kw in FROZEN_AQUATIC_KEYWORDS):
                    category = "水产"
                else:
                    category = "肉禽蛋"
            elif current_category in ("蔬菜", "水产", "肉禽蛋", "水果", "粮油"):
                category = current_category
            else:
                category = "其他"

            records.append({
                "standard_name": standard_name,
                "local_name": local_name,
                "city": "guangzhou",
                "price": price,
                "price_date": date_str,
                "unit": _normalize_unit(unit),
                "category": category,
            })

    # 统计各分类数量
    from collections import Counter
    cat_counts = Counter(r["category"] for r in records)
    cat_summary = ", ".join(f"{c}:{n}" for c, n in sorted(cat_counts.items()))
    logger.info(f"广州: {report_name} → {len(records)} 条 ({cat_summary})")

    return records


def _normalize_unit(unit: str) -> str:
    """标准化计量单位"""
    unit = unit.strip()
    if "公斤" in unit:
        return "元/公斤"
    if "500克" in unit or "斤" in unit:
        return "元/500克"
    if "桶" in unit or "升" in unit:
        return "元/桶"
    return unit or "元/公斤"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = fetch_guangzhou_prices(date.today())
    print(f"广州: 共获取 {len(data)} 条价格记录")
    for d in data[:5]:
        print(f"  [{d.get('category', '')}] {d['standard_name']} | {d['price_date']} | ¥{d['price']}")