// 商品详情页 — 与 Web 版 ProductDetailPage 一致
const { getProductDetail } = require('../../utils/supabase');

Page({
  data: {
    productName: '',
    cityName: '',
    unit: '',
    latestPrice: 0,
    latestDate: '',
    avgPrice30d: 0,
    fluctuation: 0,
    priceLevel: '',
    priceLevelReason: '',
    trend: [],
    avgPrice: 0,
    loading: true,
    error: null
  },

  onLoad(options) {
    const { id, city } = options;
    this.loadDetail(id, city);
  },

  async loadDetail(productId, cityId) {
    this.setData({ loading: true, error: null });
    try {
      const { trend: trendData, evaluation } = await getProductDetail(productId, cityId);
      const trendList = trendData?.trend || [];
      const avgPrice = trendData?.avg_price || 0;
      this.setData({
        productName: evaluation.product_name,
        cityName: evaluation.city_name,
        unit: evaluation.unit,
        latestPrice: evaluation.latest_price,
        latestDate: evaluation.latest_date,
        avgPrice30d: evaluation.avg_price_30d,
        fluctuation: evaluation.fluctuation || 0,
        priceLevel: evaluation.price_level,
        priceLevelReason: evaluation.price_level_reason,
        trend: trendList,
        avgPrice: avgPrice,
        loading: false
      });
      // 数据加载完成后绘制走势图
      if (trendList.length > 0) {
        setTimeout(() => this.drawChart(trendList, avgPrice), 300);
      }
    } catch (err) {
      console.error('加载详情失败:', err);
      this.setData({ error: '加载失败', loading: false });
    }
  },

  drawChart(trendData, avgPrice) {
    const query = wx.createSelectorQuery();
    query.select('#trendCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const w = res[0].width;
        const h = res[0].height;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const pad = { top: 20, right: 20, bottom: 30, left: 55 };
        const pw = w - pad.left - pad.right;
        const ph = h - pad.top - pad.bottom;

        const prices = trendData.map(d => d.price);
        const dataMin = Math.min(...prices);
        const dataMax = Math.max(...prices);
        const dataRange = dataMax - dataMin || 1;
        const min = Math.max(0, dataMin - dataRange * 0.15);
        const max = dataMax + dataRange * 0.05;
        const range = max - min || 1;

        const yScale = (v) => pad.top + ph * (1 - (v - min) / range);
        const xScale = (i) => pad.left + (pw * i) / (prices.length - 1);

        // 网格线
        const gridLines = 5;
        ctx.strokeStyle = 'rgba(180, 170, 155, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= gridLines; i++) {
          const y = pad.top + (ph * i) / gridLines;
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(w - pad.right, y);
          ctx.stroke();
          const val = (max - (range * i) / gridLines).toFixed(1);
          ctx.fillStyle = '#B5A99C';
          ctx.font = '10px "IBM Plex Mono"';
          ctx.textAlign = 'right';
          ctx.fillText(`¥${val}`, pad.left - 6, y + 4);
        }

        // 均价线
        const avgY = yScale(avgPrice);
        ctx.strokeStyle = 'rgba(212, 149, 138, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pad.left, avgY);
        ctx.lineTo(w - pad.right, avgY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 价格线
        ctx.strokeStyle = '#5C5248';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        prices.forEach((p, i) => {
          const x = xScale(i);
          const y = yScale(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 数据点
        prices.forEach((p, i) => {
          const x = xScale(i);
          const y = yScale(p);
          ctx.fillStyle = '#5C5248';
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // 左侧 "最高 ¥X.XX"
        ctx.fillStyle = '#B5A99C';
        ctx.font = '10px "IBM Plex Mono"';
        ctx.textAlign = 'left';
        ctx.fillText(`最高 ¥${dataMax.toFixed(2)}`, pad.left, pad.top - 4);

        // 右侧 "当前 ¥X.XX"
        const lastPrice = prices[prices.length - 1];
        ctx.fillStyle = '#5C5248';
        ctx.font = 'bold 11px "IBM Plex Mono"';
        ctx.textAlign = 'right';
        ctx.fillText(`当前 ¥${lastPrice.toFixed(2)}`, w - pad.right, pad.top - 4);
      });
  },

  goBack() {
    wx.navigateBack();
  }
});