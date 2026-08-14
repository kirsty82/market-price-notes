"""
菜市场价格爬虫 — 全局配置
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# ============================================================
# Supabase 配置
# ============================================================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tlcotxodgogynrcyfsuc.supabase.co")
# anon key 用于前端读取，service_role key 用于爬虫写入
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ============================================================
# 城市配置
# ============================================================
CITIES = {
    "beijing": {
        "name": "北京",
        "slug": "beijing",
        "enabled": True,
    },
    "shanghai": {
        "name": "上海",
        "slug": "shanghai",
        "enabled": True,
    },
    "guangzhou": {
        "name": "广州",
        "slug": "guangzhou",
        "enabled": True,
    },
}

# ============================================================
# 请求配置
# ============================================================
REQUEST_TIMEOUT = 30
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# ============================================================
# 日志配置
# ============================================================
LOG_FILE = os.path.join(os.path.dirname(__file__), "crawler.log")