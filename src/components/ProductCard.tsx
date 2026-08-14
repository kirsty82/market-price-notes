import { Link } from "react-router-dom";
import { preloadProductDetail } from "@/lib/data";
import type { PriceLevel } from "@/lib/supabase/types";

/**
 * 商品卡片 — 手绘噪点按钮风格
 * 完全参照 Uiverse.io 代码：
 *   - button-cosm 曲线装饰始终可见（左侧）
 *   - highlight 荧光笔波浪描边，hover 画出，active 变色
 *   - 静态无动画，保留 hover/active 交互
 * 保留价签文字：编号、分类、品名、价格、30日均、涨跌幅、印章
 */
export default function ProductCard({
  id, name, categoryName, unit, latestPrice, avgPrice30d, fluctuation, priceLevel, cityId, index = 0,
}: {
  id: string; name: string; categoryName: string; unit: string;
  latestPrice: number | null; avgPrice30d: number | null;
  fluctuation: number | null; priceLevel: PriceLevel | null;
  cityId: string; index?: number;
}) {
  const isUp = fluctuation !== null && fluctuation > 0;
  const isDown = fluctuation !== null && fluctuation < 0;

  const handleMouseEnter = () => {
    preloadProductDetail({ productId: id, cityId });
  };

  const uid = id.replace(/-/g, "");

  return (
    <>
      {/* ================================================================
          SVG 手绘噪点滤镜（隐藏 defs）
          参数完全参照参考代码
          ================================================================ */}
      <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
        <defs>
          <filter id={`hd-n-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={`hd-nt-${uid}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* ================================================================
          卡片外层 — overflow:visible 确保曲线不被裁剪
          ================================================================ */}
      <Link
        to={`/product/${id}?city=${cityId}`}
        onMouseEnter={handleMouseEnter}
        onFocus={handleMouseEnter}
        className={`block relative card-btn-${uid}`}
        style={{ overflow: "visible" }}
      >
        {/* ---- 左侧曲线装饰（button-cosm，始终可见） ---- */}
        <svg
          className={`absolute pointer-events-none card-cosm-${uid}`}
          style={{
            fill: "#33333366",
            transition: "0.3s ease-out",
            scale: "0.32",
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 2,
            width: "128px",
            height: "128px",
            translate: "calc(-100% + 56px) 0.5rem",
            overflow: "visible",
          }}
          viewBox="0 0 256 256"
          fill="none"
        >
          <path
            d="M243.07324,157.43945c-1.2334-1.47949-23.18847-27.34619-60.46972-41.05859-1.67579-17.97412-8.25293-34.36328-18.93653-46.87158C149.41309,52.8208,128.78027,44,104,44,54.51074,44,22.10059,88.57715,20.74512,90.4751a3.99987,3.99987,0,0,0,6.50781,4.65234C27.5625,94.6958,58.68359,52,104,52c22.36816,0,40.89648,7.85107,53.584,22.70508,8.915,10.437,14.65625,23.9541,16.65528,38.894A133.54185,133.54185,0,0,0,136,108c-25.10742,0-46.09473,6.48486-60.69434,18.75391-12.65234,10.63379-19.91015,25.39355-19.91015,40.49463a43.61545,43.61545,0,0,0,12.69336,31.21923C76.98438,207.3208,89.40234,212,104,212c23.98047,0,44.37305-9.4668,58.97461-27.37744,12.74512-15.6333,20.05566-37.145,20.05566-59.01953,0-.1128-.001-.22559-.001-.33838,33.62988,13.48486,53.62207,36.96631,53.89746,37.2959a4.00015,4.00015,0,0,0,6.14648-5.1211ZM104,204c-27.89746,0-40.60449-19.05078-40.60449-36.75146C63.39551,142.56592,86.11621,116,136,116a124.37834,124.37834,0,0,1,38.97266,6.32617q.05712,1.63038.05761,3.27686C175.03027,177.07129,139.29785,204,104,204Z"
            fill="#33333366"
          />
        </svg>

        {/* ---- 价签内容容器 ---- */}
        <div
          className={`relative card-inner-${uid}`}
          style={{
            background: "#FDF8EC",
            border: "none",
            borderRadius: "1.6rem",
            boxShadow: "#33333366 3px 3px 0 1px",
            overflow: "hidden",
          }}
        >
          {/* ---- 荧光笔波浪描边叠层（highlight） ---- */}
          <svg
            className={`absolute inset-0 w-full h-full pointer-events-none card-hl-${uid}`}
            viewBox="0 0 145 78"
            preserveAspectRatio="none"
          >
            <g transform="translate(-171.5, -126.1)">
              <path
                d="M180.02826,169.45123c0,0 12.65228,-25.55115 24.2441,-25.66863c6.39271,-0.06479 -5.89143,46.12943 4.90937,50.63857c10.22345,4.2681 24.14292,-52.38336 37.86455,-59.80493c3.31715,-1.79413 -5.35094,45.88889 -0.78872,58.34589c5.19371,14.18125 33.36934,-58.38221 36.43049,-56.91633c4.67078,2.23667 -0.06338,44.42744 5.22574,47.53647c6.04041,3.55065 19.87185,-20.77286 19.87185,-20.77286"
                fill="none"
                stroke="rgba(255, 225, 0, 0.5)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeMiterlimit="10"
              />
            </g>
          </svg>

          {/* ---- 内容区 ---- */}
          <div className="px-4 pt-3 pb-1">
            {/* 票头：编号 · 分类 */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs tracking-[0.05em] font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#332820" }}>
                #{String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-xs tracking-[0.04em]" style={{ fontFamily: "var(--font-mono)", color: "#5C4F42" }}>
                {categoryName}
              </span>
            </div>

            {/* 品名 */}
            <div className="mb-0.5">
              <span className="text-base font-bold tracking-[0.03em]" style={{ fontFamily: "var(--font-body)", color: "#2B1F14" }}>
                {name}
              </span>
            </div>

            {/* 价格 — 大字右对齐 */}
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-xs tracking-[0.04em]" style={{ fontFamily: "var(--font-mono)", color: "#5C4F42" }}>
                {unit}
              </span>
              <span className="tracking-[0.02em]" style={{ fontFamily: "var(--font-mono)", color: "#2B1F14", fontSize: "1.4rem", fontWeight: 600 }}>
                ¥{latestPrice !== null ? latestPrice.toFixed(2) : "—.—"}
              </span>
            </div>
          </div>

          {/* 虚线分割 */}
          <div className="mx-3" style={{ borderTop: "1px dashed rgba(51,51,51,0.15)" }} />

          {/* 底部信息栏 — 右侧留空给印章 */}
          <div className="flex items-center justify-between px-4 py-2" style={{ paddingRight: "52px" }}>
            <span className="text-xs tracking-[0.03em]" style={{ fontFamily: "var(--font-mono)", color: "#5C4F42" }}>
              30日均 ¥{avgPrice30d !== null ? avgPrice30d.toFixed(2) : "—.—"}
            </span>
            {fluctuation !== null && (
              <span className="text-xs font-semibold tracking-[0.03em]" style={{
                fontFamily: "var(--font-mono)",
                color: isUp ? "#B0453A" : isDown ? "#5A6B42" : "#6B5E50",
              }}>
                {isUp ? "+" : ""}{fluctuation.toFixed(1)}%
              </span>
            )}
          </div>

          {/* 美式印章 — 右下角 */}
          {priceLevel && (
            <ReceiptStamp level={priceLevel} />
          )}
        </div>
      </Link>

      {/* ================================================================
          卡片 CSS — 参照参考代码，静态无动画
          ================================================================ */}
      <style>{`
        .card-btn-${uid} {
          transition: 0.3s ease-in-out;
          cursor: pointer;
          user-select: none;
          filter: url(#hd-n-${uid});
        }

        /* highlight 波浪描边默认隐藏 */
        .card-hl-${uid} {
          stroke-dasharray: 800;
          stroke-dashoffset: 800;
          transition: none;
        }

        /* ====== 仅鼠标/触控笔设备启用 hover 效果 ======
           移动端触碰不会触发 hover，避免黄线残留 */
        @media (hover: hover) and (pointer: fine) {
          .card-hl-${uid} {
            transition: stroke-dashoffset 0.5s ease-in-out;
          }
          .card-btn-${uid}:hover .card-hl-${uid} {
            stroke-dashoffset: 0;
          }
          .card-btn-${uid}:hover .card-cosm-${uid} {
            rotate: -15deg;
            translate: calc(-100% + 54px) 0.9rem;
          }
        }

        /* active：按压内阴影 + 描边变色（所有设备通用） */
        .card-btn-${uid}:active .card-inner-${uid} {
          box-shadow: inset #333333f1 3px 3px 0 1px;
        }
        .card-btn-${uid}:active .card-hl-${uid} {
          stroke-dashoffset: 800;
          animation:
            hl-pulse-${uid} 5s infinite,
            hl-color-${uid} 0.5s forwards;
        }
        .card-btn-${uid}:active .card-cosm-${uid} {
          fill: #333333f1;
          rotate: -135deg;
          translate: calc(-100% + 58px) 1.1rem;
          animation: none;
        }
        .card-btn-${uid}:active {
          filter: url(#hd-nt-${uid});
        }

        @keyframes hl-pulse-${uid} {
          0%   { stroke-dashoffset: 0; }
          25%  { stroke-dashoffset: 800; }
          50%  { stroke-dashoffset: 800; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes hl-color-${uid} {
          0%   { stroke: rgba(255, 225, 0, 0.5); }
          100% { stroke: #bc4e2666; }
        }
      `}</style>
    </>
  );
}

/* ================================================================
   美式印章 — 三层圆环 + 星点装饰 + 半透明墨迹
   位置：右下角，略溢出卡片边框
   ================================================================ */
function ReceiptStamp({ level }: { level: PriceLevel }) {
  const stampColors: Record<PriceLevel, string> = {
    便宜: "#5A6B42",
    正常: "#6B5E50",
    偏贵: "#B0453A",
  };
  const color = stampColors[level];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "-2px",
        right: "-4px",
        transform: "rotate(-4deg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "42px",
        height: "42px",
        pointerEvents: "none",
      }}
    >
      <svg viewBox="0 0 50 50" width="42" height="42" style={{ position: "absolute", inset: 0 }} fill="none">
        <circle cx="25" cy="25" r="23" stroke={color} strokeWidth="2" opacity="0.8" />
        <circle cx="25" cy="25" r="18" stroke={color} strokeWidth="1" opacity="0.55" strokeDasharray="3 2.5" />
        <circle cx="25" cy="25" r="13" stroke={color} strokeWidth="1.2" opacity="0.65" />
        {[
          [25, 2.5], [25, 47.5], [2.5, 25], [47.5, 25],
          [9.5, 9.5], [40.5, 9.5], [9.5, 40.5], [40.5, 40.5],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.1} fill={color} opacity="0.65" />
        ))}
      </svg>
      <span
        style={{
          fontFamily: "var(--font-english), sans-serif",
          fontSize: "0.36rem",
          fontWeight: 700,
          color: color,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: 0.85,
          lineHeight: 1.2,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {level}
      </span>
    </div>
  );
}