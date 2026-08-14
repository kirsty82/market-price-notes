"""
北京发改委蔬菜/肉蛋水产/粮食/食用油价格爬虫
数据来源: http://project.fgw.beijing.gov.cn/bmcx/
通过下载 XLS 文件获取每日农贸零售价格
"""
import io
import logging
from datetime import date, timedelta
from typing import List, Dict, Optional

import pandas as pd
import requests

from config import REQUEST_TIMEOUT, REQUEST_HEADERS
from name_mapping import local_to_standard

logger = logging.getLogger(__name__)

# ============================================================
# 北京商品 E-Code 映射表（按品类分组）
# 格式: { E-Code: (本地名称, 品类分类) }
# ============================================================
BEIJING_PRODUCT_CODES = {
    # ---- 蔬菜（31种） ----
    "E000002": ("大白菜", "蔬菜"),
    "E000003": ("圆白菜", "蔬菜"),
    "E000004": ("黄瓜", "蔬菜"),
    "E000005": ("西红柿", "蔬菜"),
    "E000006": ("圆茄子", "蔬菜"),
    "E000007": ("青椒", "蔬菜"),
    "E000008": ("土豆", "蔬菜"),
    "E000009": ("菜花", "蔬菜"),
    "E000010": ("油菜", "蔬菜"),
    "E000011": ("芹菜", "蔬菜"),
    "E000012": ("白萝卜", "蔬菜"),
    "E000013": ("心里美萝卜", "蔬菜"),
    "E000014": ("胡萝卜", "蔬菜"),
    "E000015": ("冬瓜", "蔬菜"),
    "E000016": ("菠菜", "蔬菜"),
    "E000017": ("小白菜", "蔬菜"),
    "E000018": ("莴笋", "蔬菜"),
    "E000019": ("豆角", "蔬菜"),
    "E000020": ("韭菜", "蔬菜"),
    "E000021": ("蒜苗", "蔬菜"),
    "E000022": ("生菜", "蔬菜"),
    "E000023": ("尖椒", "蔬菜"),
    "E000024": ("平菇", "蔬菜"),
    "E000025": ("苦瓜", "蔬菜"),
    "E000026": ("葱头", "蔬菜"),
    "E000027": ("绿豆芽", "蔬菜"),
    "E000028": ("黄豆芽", "蔬菜"),
    "E000029": ("大蒜", "蔬菜"),
    "E000030": ("大葱", "蔬菜"),
    "E000031": ("生姜", "蔬菜"),
    "E000032": ("油麦菜", "蔬菜"),

    # ---- 肉禽蛋（7种） ----
    "E000084": ("白条猪", "肉禽蛋"),
    "E000086": ("鲜羊肉", "肉禽蛋"),
    "E000090": ("白条鸡", "肉禽蛋"),
    "E000095": ("鸭子", "肉禽蛋"),
    "E000097": ("鸡蛋", "肉禽蛋"),
    "E000190": ("鲜猪肉", "肉禽蛋"),
    "E001507": ("鲜牛肉", "肉禽蛋"),

    # ---- 水产（3种） ----
    "E000099": ("带鱼", "水产"),
    "E000103": ("草鱼", "水产"),
    "E000106": ("鲢鱼", "水产"),

    # ---- 粮食（3种） ----
    "E000124": ("粳米", "粮油"),
    "E001480": ("富强粉", "粮油"),
    "E001481": ("标准粉", "粮油"),

    # ---- 食用油（3种） ----
    "E000071": ("鲁花花生油", "粮油"),
    "E000073": ("金龙鱼大豆调和油", "粮油"),
    "E000080": ("大豆油", "粮油"),
}

# XLS 下载 URL 模板（2026-08 起仅支持 HTTPS，HTTP 端口已关闭）
BEIJING_XLS_URL = "https://project.fgw.beijing.gov.cn/bmcx/{code}/download/{code}.xls"

# 关注的价格列：农贸零售价格（列名可能包含空格）
PRICE_COLUMN_KEYWORDS = ["农贸零售价格", "农贸零售"]


def fetch_beijing_prices(target_date: Optional[date] = None, days_back: int = 0) -> List[Dict]:
    """
    爬取北京所有品类的农贸零售价格
    Args:
        target_date: 目标日期，默认今天
        days_back: 回溯天数，0=仅当天，30=近30天
    Returns:
        [{standard_name, local_name, price, price_date, unit, category}, ...]
    """
    if target_date is None:
        target_date = date.today()

    start_date = target_date - timedelta(days=days_back) if days_back > 0 else target_date

    results = []
    session = requests.Session()
    session.headers.update(REQUEST_HEADERS)

    for code, (local_name, category) in BEIJING_PRODUCT_CODES.items():
        try:
            url = BEIJING_XLS_URL.format(code=code)
            logger.info(f"北京: 下载 {local_name}({code}) → {url}")

            resp = session.get(url, timeout=REQUEST_TIMEOUT)
            if resp.status_code != 200:
                logger.warning(f"北京: {local_name} 下载失败 HTTP {resp.status_code}")
                continue

            # 解析 XLS（取日期范围内的全部数据）
            df = pd.read_excel(io.BytesIO(resp.content), header=None)
            records = _parse_beijing_xls(df, local_name, category, start_date, target_date)
            results.extend(records)
            if records:
                dates = sorted(set(r["price_date"] for r in records))
                logger.info(f"北京: {local_name} → {len(records)} 条 ({dates[0]} ~ {dates[-1]})")

        except Exception as e:
            logger.error(f"北京: {local_name} 爬取异常: {e}")

    return results


def _parse_beijing_xls(df: pd.DataFrame, local_name: str, category: str,
                        start_date: date, end_date: date) -> List[Dict]:
    """
    解析北京 XLS 文件，返回日期范围内的全部记录。
    如果目标日期范围内无数据，自动回退到 XLS 中最新可用日期。
    XLS 结构: 第一行标题，第二行开始是数据
    列: 序号 | 时间 | 批发价格 | 农贸零售价格 | 超市零售价格
    """
    if df.empty or len(df) < 2:
        return []

    # 找到表头行
    header_row = None
    price_col_idx = None

    for row_idx in range(min(5, len(df))):
        for col_idx in range(len(df.columns)):
            cell_val = str(df.iloc[row_idx, col_idx]).strip()
            for keyword in PRICE_COLUMN_KEYWORDS:
                if keyword in cell_val:
                    header_row = row_idx
                    price_col_idx = col_idx
                    break
            if price_col_idx is not None:
                break
        if price_col_idx is not None:
            break

    if price_col_idx is None:
        logger.warning(f"北京: {local_name} XLS 中未找到农贸零售价格列")
        return []

    # 找到日期列
    date_col_idx = None
    if header_row is not None:
        for col_idx in range(len(df.columns)):
            cell_val = str(df.iloc[header_row, col_idx]).strip()
            if "时间" in cell_val or "日期" in cell_val:
                date_col_idx = col_idx
                break

    # 第一遍：收集所有有效记录和日期
    all_records = []
    data_start = (header_row or 0) + 1

    for row_idx in range(data_start, len(df)):
        try:
            # 解析日期
            if date_col_idx is not None:
                date_val = df.iloc[row_idx, date_col_idx]
                if pd.isna(date_val):
                    continue
                try:
                    if hasattr(date_val, 'date'):
                        record_date = date_val.date()
                    else:
                        record_date = pd.to_datetime(date_val).date()
                except Exception:
                    continue
            else:
                continue

            # 解析价格
            price_val = df.iloc[row_idx, price_col_idx]
            if pd.isna(price_val):
                continue
            price = float(price_val)

            all_records.append((record_date, price))
        except (ValueError, TypeError):
            continue

    if not all_records:
        return []

    # 找出 XLS 中所有可用日期
    available_dates = sorted(set(r[0] for r in all_records))
    latest_date = available_dates[-1]

    # 检查目标日期范围内是否有数据
    records_in_range = [(d, p) for d, p in all_records if start_date <= d <= end_date]

    if records_in_range:
        # 目标日期范围内有数据，直接使用
        selected_records = records_in_range
    else:
        # 目标日期范围内无数据，回退到 XLS 中最新的日期
        logger.warning(
            f"北京: {local_name} XLS中无{start_date}~{end_date}数据，"
            f"回退到最新可用日期 {latest_date} (可用日期: {available_dates[0]} ~ {latest_date})"
        )
        selected_records = [(d, p) for d, p in all_records if d == latest_date]

    # 输出结果
    records = []
    standard_name = local_to_standard("beijing", local_name)
    if standard_name is None:
        standard_name = local_name

    for record_date, price in selected_records:
        records.append({
            "standard_name": standard_name,
            "local_name": local_name,
            "city": "beijing",
            "price": price,
            "price_date": record_date.isoformat(),
            "unit": "元/500克",
            "category": category,
        })

    return records


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    data = fetch_beijing_prices(date.today())
    print(f"北京: 共获取 {len(data)} 条价格记录")
    for d in data[:5]:
        print(f"  {d['standard_name']} | {d['price_date']} | ¥{d['price']}")