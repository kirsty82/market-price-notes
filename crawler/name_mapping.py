"""
品种名称标准化映射
将各城市发改委的不同名称映射到统一标准名称
"""
from typing import Dict, Optional

# ============================================================
# 标准名称 → 各城市本地名称 映射
# 格式: { 标准名: { "beijing": "北京名称", "shanghai": "上海名称", "guangzhou": "广州名称" } }
# ============================================================
STANDARD_NAME_MAP: Dict[str, Dict[str, str]] = {
    # ---- 叶菜类 ----
    "大白菜":     {"beijing": "大白菜",     "shanghai": "大白菜",     "guangzhou": "绍菜(大白菜)"},
    "菠菜":       {"beijing": "菠菜",       "shanghai": "菠菜",       "guangzhou": "菠菜"},
    "生菜":       {"beijing": "生菜",       "shanghai": "生菜",       "guangzhou": "生菜"},
    "芹菜":       {"beijing": "芹菜",       "shanghai": "芹菜",       "guangzhou": "本地芹菜"},
    "韭菜":       {"beijing": "韭菜",       "shanghai": "韭菜",       "guangzhou": "韭菜"},
    "油麦菜":     {"beijing": "油麦菜",     "shanghai": None,         "guangzhou": "油麦菜"},
    "小白菜":     {"beijing": "小白菜",     "shanghai": "杭白菜",     "guangzhou": "矮脚白菜(奶白菜)"},
    "油菜":       {"beijing": "油菜",       "shanghai": "青菜",       "guangzhou": "本地白菜"},
    "圆白菜":     {"beijing": "圆白菜",     "shanghai": "卷心菜",     "guangzhou": "椰菜"},
    "菜花":       {"beijing": "菜花",       "shanghai": "花菜",       "guangzhou": "椰菜花（花菜）"},
    "西兰花":     {"beijing": None,          "shanghai": "西兰花",     "guangzhou": "西兰花"},
    "莴笋":       {"beijing": "莴笋",       "shanghai": "莴苣",       "guangzhou": "莴笋"},
    "西洋菜":     {"beijing": None,          "shanghai": None,         "guangzhou": "西洋菜"},
    "空心菜":     {"beijing": None,          "shanghai": "蕹菜",       "guangzhou": "水空心菜"},
    "菜心":       {"beijing": None,          "shanghai": "鸡毛菜",     "guangzhou": "本地菜心"},
    "芥兰":       {"beijing": None,          "shanghai": None,         "guangzhou": "芥兰"},
    "上海青":     {"beijing": None,          "shanghai": None,         "guangzhou": "小塘白菜（上海青）"},
    "西生菜":     {"beijing": None,          "shanghai": None,         "guangzhou": "西生菜"},

    # ---- 茄果类 ----
    "西红柿":     {"beijing": "西红柿",     "shanghai": "西红柿",     "guangzhou": "西红柿"},
    "茄子":       {"beijing": "圆茄子",     "shanghai": "茄子",       "guangzhou": "茄瓜(茄子)"},
    "青椒":       {"beijing": "青椒",       "shanghai": "青椒",       "guangzhou": "圆椒"},
    "尖椒":       {"beijing": "尖椒",       "shanghai": "尖椒",       "guangzhou": "青尖椒"},
    "黄瓜":       {"beijing": "黄瓜",       "shanghai": "黄瓜",       "guangzhou": "青瓜(黄瓜)"},
    "冬瓜":       {"beijing": "冬瓜",       "shanghai": "冬瓜",       "guangzhou": "青皮冬瓜"},  # 青皮冬瓜 → 冬瓜
    "苦瓜":       {"beijing": "苦瓜",       "shanghai": None,         "guangzhou": "苦瓜"},
    "南瓜":       {"beijing": None,          "shanghai": None,         "guangzhou": "南瓜"},
    "丝瓜":       {"beijing": None,          "shanghai": None,         "guangzhou": "丝瓜"},
    "西葫芦":     {"beijing": None,          "shanghai": "西葫芦",     "guangzhou": "云南小瓜"},

    # ---- 根茎类 ----
    "土豆":       {"beijing": "土豆",       "shanghai": "土豆",       "guangzhou": "土豆"},
    "白萝卜":     {"beijing": "白萝卜",     "shanghai": "萝卜",       "guangzhou": "白萝卜"},
    "胡萝卜":     {"beijing": "胡萝卜",     "shanghai": "胡萝卜",     "guangzhou": "红萝卜"},
    "洋葱":       {"beijing": "葱头",       "shanghai": "洋葱",       "guangzhou": "洋葱"},
    "生姜":       {"beijing": "生姜",       "shanghai": "生姜",       "guangzhou": "大肉姜(生姜)"},
    "大蒜":       {"beijing": "大蒜",       "shanghai": "蒜头",       "guangzhou": "蒜头"},
    "大葱":       {"beijing": "大葱",       "shanghai": None,         "guangzhou": None},
    "莲藕":       {"beijing": None,          "shanghai": None,         "guangzhou": "莲藕"},

    # ---- 豆类 ----
    "豆角":       {"beijing": "豆角",       "shanghai": "刀豆",       "guangzhou": "青豆角"},
    "豇豆":       {"beijing": None,          "shanghai": "豇豆",       "guangzhou": "白豆角"},
    "荷兰豆":     {"beijing": None,          "shanghai": None,         "guangzhou": "荷兰豆"},
    "黄豆芽":     {"beijing": "黄豆芽",     "shanghai": None,         "guangzhou": None},
    "绿豆芽":     {"beijing": "绿豆芽",     "shanghai": None,         "guangzhou": "小豆芽菜(绿豆芽)"},

    # ---- 葱蒜类 ----
    "蒜苔":       {"beijing": "蒜苗",       "shanghai": "蒜苔",       "guangzhou": "蒜心(蒜苔)"},
    "蒜苗":       {"beijing": None,          "shanghai": None,         "guangzhou": "大蒜(蒜苗)"},

    # ---- 菌菇类 ----
    "平菇":       {"beijing": "平菇",       "shanghai": "鲜蘑菇",     "guangzhou": None},
    "香菇":       {"beijing": None,          "shanghai": "鲜香菇",     "guangzhou": None},

    # ---- 肉类（统一作为商品） ----
    "鸡蛋":       {"beijing": "鸡蛋",       "shanghai": "鸡蛋",       "guangzhou": "红壳鸡蛋"},
    "猪精瘦肉":   {"beijing": "鲜猪肉",     "shanghai": "鲜猪肉(精瘦肉)", "guangzhou": "精瘦肉"},
    "猪五花肉":   {"beijing": None,          "shanghai": "鲜猪肉(肋条肉)", "guangzhou": "肋条肉(五花肉)"},
    "猪排骨":     {"beijing": None,          "shanghai": "鲜猪肉(肋排)", "guangzhou": "排骨"},
    "牛肉":       {"beijing": "鲜牛肉",     "shanghai": "鲜牛肉(牛腩)", "guangzhou": "鲜牛肉"},
    "鲜羊肉":     {"beijing": "鲜羊肉",     "shanghai": None,         "guangzhou": None},
    "鸡肉":       {"beijing": "白条鸡",     "shanghai": "鸡肉",       "guangzhou": "生宰光鸡(白条鸡)"},
    "鸭子":       {"beijing": "鸭子",       "shanghai": None,         "guangzhou": None},
    "白条猪":     {"beijing": "白条猪",     "shanghai": None,         "guangzhou": None},

    # ---- 水产 ----
    "草鱼":       {"beijing": "草鱼",       "shanghai": "草鱼",       "guangzhou": "原条草鱼(1000克左右一条)"},
    "鲫鱼":       {"beijing": None,          "shanghai": "鲫鱼",       "guangzhou": "鲫鱼"},
    "鲢鱼":       {"beijing": "鲢鱼",       "shanghai": "花鲢",       "guangzhou": "原条鳙鱼(花鲢、胖头鱼)"},
    "带鱼":       {"beijing": "带鱼",       "shanghai": "带鱼",       "guangzhou": "冻带鱼"},
    "黄鱼":       {"beijing": None,          "shanghai": "黄鱼",       "guangzhou": "冻黄花鱼(黄鱼)"},
    "基围虾":     {"beijing": None,          "shanghai": "基围虾",     "guangzhou": None},
    "鱿鱼":       {"beijing": None,          "shanghai": None,         "guangzhou": "鱿鱼"},
    "生鱼":       {"beijing": None,          "shanghai": None,         "guangzhou": "生鱼"},
    "黄鳝":       {"beijing": None,          "shanghai": None,         "guangzhou": "黄鳝"},
    "鲈鱼":       {"beijing": None,          "shanghai": None,         "guangzhou": "鲈鱼"},
    "鲮鱼":       {"beijing": None,          "shanghai": None,         "guangzhou": "原条鲮鱼"},
    "红三鱼":     {"beijing": None,          "shanghai": None,         "guangzhou": "红三鱼（金钱鱼)"},
    "开刀草鱼":   {"beijing": None,          "shanghai": None,         "guangzhou": "开刀草鱼"},
    "开刀鳙鱼":   {"beijing": None,          "shanghai": None,         "guangzhou": "开刀鳙鱼"},

    # ---- 广州特有蔬菜 ----
    "大芥菜":     {"beijing": None,          "shanghai": None,         "guangzhou": "大芥菜"},
    "西芹":       {"beijing": None,          "shanghai": None,         "guangzhou": "西芹"},

    # ---- 广州特有肉类 ----
    "猪后腿肉":   {"beijing": None,          "shanghai": "鲜猪肉(带皮后腿肉)", "guangzhou": "有皮上肉（带皮后腿肉）"},
    "冻鸡翼":     {"beijing": None,          "shanghai": None,         "guangzhou": "冻鸡翼"},
    "冻凤爪":     {"beijing": None,          "shanghai": None,         "guangzhou": "冻凤爪"},

    # ---- 水果 ----
    "苹果":       {"beijing": None,          "shanghai": "苹果",       "guangzhou": "苹果"},
    "香蕉":       {"beijing": None,          "shanghai": "香蕉",       "guangzhou": "香蕉"},
    "西瓜":       {"beijing": None,          "shanghai": "西瓜",       "guangzhou": "西瓜"},
    "橙子":       {"beijing": None,          "shanghai": "橙子",       "guangzhou": "橙子"},
    "梨":         {"beijing": None,          "shanghai": "梨",         "guangzhou": "雪梨"},
    "葡萄":       {"beijing": None,          "shanghai": "葡萄",       "guangzhou": "红提"},

    # ---- 粮油 ----
    "粳米":       {"beijing": "粳米",       "shanghai": None,         "guangzhou": None},
    "富强粉":     {"beijing": "富强粉",     "shanghai": None,         "guangzhou": None},
    "标准粉":     {"beijing": "标准粉",     "shanghai": None,         "guangzhou": None},
    "鲁花花生油": {"beijing": "鲁花花生油", "shanghai": None,         "guangzhou": None},
    "金龙鱼大豆调和油": {"beijing": "金龙鱼大豆调和油", "shanghai": None, "guangzhou": None},
    "大豆油":     {"beijing": "大豆油",     "shanghai": None,         "guangzhou": None},
}

# 反向索引：城市本地名 → 标准名
_REVERSE_MAP: Dict[str, Dict[str, str]] = {}

def _build_reverse_map():
    """构建反向索引（城市本地名 → 标准名）"""
    global _REVERSE_MAP
    if _REVERSE_MAP:
        return
    for city_key in ["beijing", "shanghai", "guangzhou"]:
        _REVERSE_MAP[city_key] = {}
        for std_name, city_names in STANDARD_NAME_MAP.items():
            local_name = city_names.get(city_key)
            if local_name:
                _REVERSE_MAP[city_key][local_name] = std_name

_build_reverse_map()


def local_to_standard(city: str, local_name: str) -> Optional[str]:
    """
    将城市本地名称转换为标准名称
    Args:
        city: 城市key (beijing/shanghai/guangzhou)
        local_name: 城市发改委数据中的本地名称
    Returns:
        标准名称，如果不在映射表中返回 None
    """
    # 精确匹配
    result = _REVERSE_MAP.get(city, {}).get(local_name)
    if result:
        return result

    # 模糊匹配：尝试去掉括号内容后匹配（同时处理中英文括号）
    for bracket in ["(", "（"]:
        if bracket in local_name:
            short_name = local_name.split(bracket)[0].strip()
            result = _REVERSE_MAP.get(city, {}).get(short_name)
            if result:
                return result

    return None


def get_city_name(city: str, standard_name: str) -> Optional[str]:
    """获取标准名称在特定城市的本地名称"""
    return STANDARD_NAME_MAP.get(standard_name, {}).get(city)


def get_all_standard_names() -> list:
    """获取所有标准名称"""
    return list(STANDARD_NAME_MAP.keys())


def get_city_vegetable_count(city: str) -> int:
    """获取某城市可映射的品种数量"""
    count = 0
    for std_name, city_names in STANDARD_NAME_MAP.items():
        if city_names.get(city):
            count += 1
    return count