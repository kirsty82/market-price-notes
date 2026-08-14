@echo off
REM 菜市场价格爬虫 — 每日定时任务入口
REM 每天自动爬取北京、上海、广州三城当日菜篮子价格并写入 Supabase
cd /d "d:\菜市场\crawler"
"C:\Users\kirsty\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\vm\tools\python\python.exe" main.py >> crawler.log 2>&1
echo [%date% %time%] 爬虫任务完成 >> crawler.log