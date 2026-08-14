# 菜市场价格查询 (Market Price Notes)

农业调查手册风格的蔬菜/肉禽蛋/水产/水果价格查询 Web 应用，数据来源于北京、上海、广州三地发改委官方菜篮子价格。

## 技术栈

- **前端**: React 19 + TypeScript + Vite 6 + TailwindCSS 4
- **路由**: React Router v7
- **图表**: Chart.js 4
- **数据库**: Supabase (PostgreSQL)
- **爬虫**: Python 3.10 + pandas + BeautifulSoup4

## 项目结构

```
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── lib/data/           # 数据访问层
│   ├── lib/supabase/       # Supabase 客户端 & 类型
│   └── pages/              # 页面组件
├── crawler/                # Python 爬虫
│   ├── crawlers/           # 各城市爬虫
│   ├── main.py             # 爬虫主入口
│   ├── config.py           # 全局配置
│   ├── db.py               # 数据库操作
│   └── name_mapping.py     # 品种名称标准化
├── public/                 # 静态资源
│   ├── fonts/              # 字体文件
│   └── textures/           # 纹理图片
├── schema.sql              # 数据库表结构
└── seed.sql                # 种子数据
```

## 快速开始

### 前端开发

```bash
npm install
npm run dev        # 启动开发服务器 (http://localhost:5173)
npm run build      # 生产构建
npm run preview    # 预览生产构建
```

### 爬虫运行

```bash
cd crawler
pip install -r requirements.txt
python main.py                          # 爬取今天的数据
python main.py --date 2026-08-06        # 爬取指定日期
python main.py --days-back 30           # 回填近30天数据
python main.py --city beijing           # 只爬取指定城市
python main.py --dry-run                # 试运行（不写入数据库）
```

### 数据库初始化

在 Supabase SQL Editor 中依次执行：
1. `schema.sql` — 创建表结构和 RLS 策略
2. `seed.sql` — 导入种子数据

## 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

```
VITE_SUPABASE_URL=<你的 Supabase URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<你的 anon key>
SUPABASE_SERVICE_KEY=<你的 service_role key>  # 爬虫写入需要
```

## 定时任务

爬虫通过 TRAE 定时任务每天 12:00（北京时间）自动运行，爬取三城当日菜篮子价格。