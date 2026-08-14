"""
上海发改委菜篮子价格爬虫
数据来源: https://www.shanghai.gov.cn/nw17239/
通过搜索最新价格信息页，下载 XLS 附件获取每日零售价格
"""
import io
import logging
import re
from datetime import date, timedelta
from typing import List, Dict, Optional

import pandas as pd
import requests
from bs4 import BeautifulSoup

from config import REQUEST_TIMEOUT, REQUEST_HEADERS
from name_mapping import local_to_standard

logger = logging.getLogger(__name__)

# 上海便民提示列表页
SHANGHAI_LIST_URL = "https://www.shanghai.gov.cn/nw17239/index.html"
# 价格信息标题关键词（注意：必须精确匹配"上海市主要主副食品"，避免匹配到区级页面）
PRICE_TITLE_KEYWORDS = [
    "上海市主要主副食品品种价格信息表",  # 全市价格（优先）
    "主要主副食品品种价格信息表",        # 全市价格（备选）
]
# XLS 中的蔬菜品种列名（第4行表头，从第26列开始）
SHANGHAI_VEGETABLE_COLUMNS = [
    "青菜", "鸡毛菜", "杭白菜", "卷心菜", "菠菜", "芹菜",
    "生菜", "韭菜", "米苋", "蕹菜", "草头", "大白菜",
    "黄瓜", "西红柿", "土豆", "茄子", "刀豆", "萝卜",
    "冬瓜", "胡萝卜", "青椒", "尖椒", "花菜", "莴苣",
    "豇豆", "茭白", "鲜香菇", "鲜蘑菇", "蒜苔", "生姜",
    "蒜头", "洋葱", "西兰花", "西葫芦",
]
# 肉类
SHANGHAI_MEAT_COLUMNS = [
    "鲜猪肉(精瘦肉)", "鲜猪肉(肋条肉)", "鲜猪肉(带皮后腿肉)", "鲜猪肉(肋排)",
    "鲜牛肉(腱子肉)", "鲜牛肉(牛腩)", "鲜羊肉", "鸡肉", "鸡蛋",
]
# 水产
SHANGHAI_FISH_COLUMNS = [
    "带鱼", "黄鱼", "草鱼", "花鲢", "鲫鱼", "基围虾",
]
# 水果
SHANGHAI_FRUIT_COLUMNS = [
    "橙子", "苹果", "香蕉", "梨", "西瓜", "葡萄",
]

# 所有可映射的品种列名
SHANGHAI_ALL_COLUMNS = (
    SHANGHAI_VEGETABLE_COLUMNS + SHANGHAI_MEAT_COLUMNS +
    SHANGHAI_FISH_COLUMNS + SHANGHAI_FRUIT_COLUMNS
)

# 构建品种→分类的快速查找表
_SHANGHAI_CATEGORY_MAP = {}
for name in SHANGHAI_VEGETABLE_COLUMNS:
    _SHANGHAI_CATEGORY_MAP[name] = "蔬菜"
for name in SHANGHAI_MEAT_COLUMNS:
    _SHANGHAI_CATEGORY_MAP[name] = "肉禽蛋"
for name in SHANGHAI_FISH_COLUMNS:
    _SHANGHAI_CATEGORY_MAP[name] = "水产"
for name in SHANGHAI_FRUIT_COLUMNS:
    _SHANGHAI_CATEGORY_MAP[name] = "水果"


def _get_shanghai_category(variety_name: str) -> str:
    """根据品种名获取上海分类"""
    return _SHANGHAI_CATEGORY_MAP.get(variety_name, "蔬菜")


def _search_price_pages_in_html(html: str, start_date: date, end_date: date) -> List[tuple]:
    """
    在 HTML 中搜索日期范围内的所有价格信息页链接
    Returns: [(url, page_date), ...]
    """
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    # 编译日期正则：匹配 "2026年08月06日" 格式
    date_pattern = re.compile(r'(\d{4})年(\d{2})月(\d{2})日')

    for a_tag in soup.find_all('a'):
        title = a_tag.get('title', '') or a_tag.get_text(strip=True)
        href = a_tag.get('href', '')

        if not href:
            continue

        for keyword in PRICE_TITLE_KEYWORDS:
            if keyword in title:
                # 尝试从标题中提取日期
                date_match = date_pattern.search(title)
                if date_match:
                    try:
                        page_date = date(
                            int(date_match.group(1)),
                            int(date_match.group(2)),
                            int(date_match.group(3)),
                        )
                        # 只保留日期范围内的
                        if start_date <= page_date <= end_date:
                            if href.startswith('/'):
                                href = "https://www.shanghai.gov.cn" + href
                            results.append((href, page_date))
                    except ValueError:
                        pass
                break  # 已匹配关键词，不需要检查其他关键词

    return results


def find_historical_price_pages(target_date: Optional[date] = None, days_back: int = 0) -> List[tuple]:
    """
    在便民提示列表中查找指定日期范围内的所有价格信息页
    会翻页扫描直到覆盖全部日期范围
    Args:
        target_date: 目标日期，默认今天
        days_back: 回溯天数，0=仅当天
    Returns:
        [(page_url, page_date), ...] 价格详情页 URL 和对应日期列表
    """
    if target_date is None:
        target_date = date.today()

    start_date = target_date - timedelta(days=days_back)
    found_pages = []  # [(url, date), ...]
    found_dates = set()

    max_pages = 50  # 最多翻50页，防止无限循环
    page_num = 0

    while page_num < max_pages:
        if page_num == 0:
            page_url = SHANGHAI_LIST_URL
        else:
            page_url = f"https://www.shanghai.gov.cn/nw17239/index_{page_num + 1}.html"

        try:
            logger.info(f"上海: 扫描列表第{page_num + 1}页 → {page_url}")
            resp = requests.get(page_url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
            resp.encoding = 'utf-8'

            if resp.status_code != 200:
                logger.warning(f"上海: 第{page_num + 1}页 HTTP {resp.status_code}，停止翻页")
                break

            page_results = _search_price_pages_in_html(resp.text, start_date, target_date)
            if not page_results:
                # 如果当前页没有任何匹配，检查是否已经超出日期范围
                # 如果已找到的日期已覆盖起始日期，可以停止
                if found_dates and min(found_dates) <= start_date:
                    logger.info("上海: 已覆盖全部日期范围，停止翻页")
                    break

            for url, page_date in page_results:
                if page_date not in found_dates:
                    found_pages.append((url, page_date))
                    found_dates.add(page_date)
                    logger.info(f"上海: 找到价格页 {page_date} → {url}")

            # 如果已找到的日期已覆盖起始日期，停止翻页
            if found_dates and min(found_dates) <= start_date:
                logger.info(f"上海: 已覆盖 {start_date} ~ {target_date}，停止翻页")
                break

        except Exception as e:
            logger.error(f"上海: 第{page_num + 1}页请求失败: {e}")
            break

        page_num += 1

    logger.info(f"上海: 共找到 {len(found_pages)} 个历史价格页")
    return found_pages


def extract_xls_url(page_url: str) -> Optional[str]:
    """
    从价格详情页提取 XLS 附件下载链接
    支持两种格式：
    1. 直接链接: <a href="...xls">
    2. /cmsres/ 路径: <a href="/cmsres/.../xxx.xls">
    """
    try:
        resp = requests.get(page_url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        for a_tag in soup.find_all('a'):
            href = a_tag.get('href', '')
            if not href:
                continue
            # 匹配 .xls 或 .xlsx 结尾的链接，以及 /cmsres/ 路径
            if href.endswith('.xls') or href.endswith('.xlsx') or '/cmsres/' in href:
                if href.startswith('/'):
                    href = "https://www.shanghai.gov.cn" + href
                logger.info(f"上海: 找到 XLS 附件 → {href}")
                return href

        logger.warning(f"上海: 页面中未找到 XLS 附件 {page_url}")
        return None

    except Exception as e:
        logger.error(f"上海: 提取 XLS URL 失败: {e}")
        return None


def fetch_shanghai_prices(target_date: Optional[date] = None, days_back: int = 0) -> List[Dict]:
    """
    爬取上海所有主副食品零售价格
    Args:
        target_date: 目标日期，默认今天
        days_back: 回溯天数，0=仅当天
    Returns:
        [{standard_name, local_name, price, price_date, unit}, ...]
    """
    if target_date is None:
        target_date = date.today()

    # 1. 找到所有历史价格信息页
    # 如果当天无数据，自动回退到最近一天（最多回溯 3 天）
    price_pages = None
    actual_days_back = days_back
    for try_back in range(days_back, days_back + 4):
        price_pages = find_historical_price_pages(target_date, try_back)
        if price_pages:
            if try_back > days_back:
                found_dates = sorted(set(p[1] for p in price_pages))
                logger.info(f"上海: 当天无数据，回退到最近可用日期 {found_dates[-1]}")
            break

    if not price_pages:
        logger.warning("上海: 未找到任何价格信息页（已回溯 3 天）")
        return []

    # 2. 逐页下载 XLS 并解析
    all_records = []
    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)

    for page_url, page_date in price_pages:
        try:
            xls_url = extract_xls_url(page_url)
            if not xls_url:
                logger.warning(f"上海: {page_date} 未找到 XLS 附件，跳过")
                continue

            resp = session.get(xls_url, timeout=REQUEST_TIMEOUT)
            if resp.status_code != 200:
                logger.warning(f"上海: {page_date} XLS 下载失败 HTTP {resp.status_code}")
                continue

            df = pd.read_excel(io.BytesIO(resp.content), header=None)
            records = _parse_shanghai_xls(df, page_date)
            all_records.extend(records)
            logger.info(f"上海: {page_date} → {len(records)} 条记录")

        except Exception as e:
            logger.error(f"上海: {page_date} 处理失败: {e}")
            continue

    return all_records


def _parse_shanghai_xls(df: pd.DataFrame, target_date: date) -> List[Dict]:
    """
    解析上海 XLS 文件
    结构: 行0-3为表头，行4为品种名，行5为规格，行6为单位，行7为全市均价，行8+为各监测点
    """
    if df.empty or len(df) < 8:
        return []

    # 第4行是品种名称（0-indexed: row 4）
    if len(df) <= 4:
        return []
    variety_row = df.iloc[4]

    # 第7行是全市均价（0-indexed: row 7）
    if len(df) <= 7:
        return []
    price_row = df.iloc[7]

    # 第2行包含采价日期
    date_str = None
    if len(df) > 2:
        for col_idx in range(min(10, len(df.columns))):
            cell = str(df.iloc[2, col_idx])
            if "采价时间" in cell:
                date_match = re.search(r'(\d{4})年(\d{2})月(\d{2})日', cell)
                if date_match:
                    date_str = f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
                break

    records = []

    for col_idx in range(2, len(df.columns)):  # 从第2列开始是品种数据
        variety_name = str(variety_row.iloc[col_idx]).strip() if col_idx < len(variety_row) else ""
        if not variety_name or variety_name == "nan":
            continue

        # 检查是否在可映射列表中
        if variety_name not in SHANGHAI_ALL_COLUMNS:
            continue

        # 获取均价
        price_val = price_row.iloc[col_idx] if col_idx < len(price_row) else None
        if price_val is None or pd.isna(price_val):
            continue

        try:
            price = float(price_val)
        except (ValueError, TypeError):
            continue

        # 映射到标准名称
        standard_name = local_to_standard("shanghai", variety_name)
        if standard_name is None:
            standard_name = variety_name

        records.append({
            "standard_name": standard_name,
            "local_name": variety_name,
            "city": "shanghai",
            "price": price,
            "price_date": date_str or target_date.isoformat(),
            "unit": "元/500克",
            "category": _get_shanghai_category(variety_name),
        })

    # 统计各分类数量
    from collections import Counter
    cat_counts = Counter(r["category"] for r in records)
    cat_summary = ", ".join(f"{c}:{n}" for c, n in sorted(cat_counts.items()))
    logger.info(f"上海: 解析到 {len(records)} 个品种价格 ({cat_summary})")
    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = fetch_shanghai_prices(date.today())
    print(f"上海: 共获取 {len(data)} 条价格记录")
    for d in data[:5]:
        print(f"  {d['standard_name']} | {d['price_date']} | ¥{d['price']}")