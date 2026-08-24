/**
 * 菜市场价格查询 — Supabase REST API 封装
 * 与 Web 版查询逻辑完全一致
 * 数据表：cities, categories, products, prices
 */

function getConfig() {
  const app = getApp();
  return {
    baseUrl: app.globalData.supabaseUrl,
    apiKey: app.globalData.supabaseKey
  };
}

function request(path, method = 'GET', body) {
  const { baseUrl, apiKey } = getConfig();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method,
      header: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: body,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ status: res.statusCode, message: res.data });
        }
      },
      fail(err) { reject(err); }
    });
  });
}

/** 获取所有城市 */
function getCities() {
  return request('/rest/v1/cities?select=*&order=sort_order.asc');
}

/** 获取某城市有价格的品类（与 Web 版 getCategoriesByCity 逻辑一致） */
async function getCategoriesByCity(cityId) {
  // 查询 1：该城市有价格的商品 ID
  const priceData = await request(`/rest/v1/prices?select=product_id&city_id=eq.${cityId}`);
  if (!priceData || priceData.length === 0) return [];

  const productIds = [...new Set(priceData.map(p => p.product_id))];

  // 查询 2：通过 products JOIN categories 获取分类
  const productData = await request(
    `/rest/v1/products?select=category_id,categories(id,name,slug,sort_order)&id=in.(${productIds.join(',')})`
  );

  const catMap = new Map();
  for (const row of productData || []) {
    const cat = row.categories;
    if (cat && !catMap.has(cat.id)) {
      catMap.set(cat.id, cat);
    }
  }
  return [...catMap.values()].sort((a, b) => a.sort_order - b.sort_order);
}

/** 获取商品列表（与 Web 版 getProducts 逻辑一致） */
async function getProducts(cityId, categoryId, search) {
  // 查询 1：商品 + 分类名
  let productQuery = `/rest/v1/products?select=*,categories!inner(name)&order=name.asc`;
  if (categoryId) productQuery += `&category_id=eq.${categoryId}`;
  if (search) productQuery += `&name=ilike.*${encodeURIComponent(search)}*`;

  const products = await request(productQuery);
  if (!products || products.length === 0) return [];

  const productIds = products.map(p => p.id);

  // 查询 2：30 天价格
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const prices = await request(
    `/rest/v1/prices?select=product_id,price,price_date&product_id=in.(${productIds.join(',')})&city_id=eq.${cityId}&price_date=gte.${dateStr}&order=price_date.desc`
  );

  // 聚合价格
  const priceMap = new Map();
  for (const pid of productIds) {
    const pp = (prices || []).filter(p => p.product_id === pid);
    if (pp.length === 0) { priceMap.set(pid, { latest: null, latestDate: null, avg: null }); continue; }
    const avg = pp.reduce((s, p) => s + p.price, 0) / pp.length;
    priceMap.set(pid, { latest: pp[0].price, latestDate: pp[0].price_date, avg: parseFloat(avg.toFixed(2)) });
  }

  return products.map(p => {
    const catName = (p.categories || {}).name || '';
    const pm = priceMap.get(p.id);
    const fluctuation = pm.latest !== null && pm.avg !== null && pm.avg !== 0
      ? parseFloat((((pm.latest - pm.avg) / pm.avg) * 100).toFixed(1)) : null;
    const priceLevel = fluctuation !== null ? computePriceLevel(fluctuation) : null;
    return {
      id: p.id, name: p.name, category_id: p.category_id, unit: p.unit,
      category_name: catName, latest_price: pm.latest, latest_date: pm.latestDate,
      avg_price_30d: pm.avg, fluctuation, price_level: priceLevel
    };
  }).filter(p => p.latest_price !== null);
}

/** 计算价格等级（与 Web 版一致） */
function computePriceLevel(fluctuation) {
  if (fluctuation < -5) return '便宜';
  if (fluctuation > 5) return '偏贵';
  return '正常';
}

/** 获取商品详情：价格趋势 + 评估（与 Web 版 fetchProductDetail 完全一致） */
async function getProductDetail(productId, cityId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

  const [priceRes, productRes, cityRes] = await Promise.all([
    request(`/rest/v1/prices?select=price,price_date&product_id=eq.${productId}&city_id=eq.${cityId}&price_date=gte.${dateStr}&order=price_date.asc`),
    request(`/rest/v1/products?select=name,unit&id=eq.${productId}`),
    request(`/rest/v1/cities?select=name&id=eq.${cityId}`)
  ]);

  const prices = priceRes || [];
  const product = (productRes && productRes.length > 0) ? productRes[0] : null;
  const city = (cityRes && cityRes.length > 0) ? cityRes[0] : null;
  const productName = product ? product.name : '';
  const productUnit = product ? product.unit : '元/斤';
  const cityName = city ? city.name : '';

  const trend = { trend: prices.map(p => ({ date: p.price_date, price: p.price })) };
  const avgPrice = prices.length > 0
    ? parseFloat((prices.reduce((s, p) => s + p.price, 0) / prices.length).toFixed(2)) : 0;
  trend.avg_price = avgPrice;
  trend.product_name = productName;
  trend.city_name = cityName;
  trend.unit = productUnit;

  let evaluation = null;
  if (prices.length > 0) {
    const sortedDesc = [...prices].sort((a, b) => new Date(b.price_date) - new Date(a.price_date));
    const latestPrice = sortedDesc[0].price;
    const latestDate = sortedDesc[0].price_date;
    const avgPrice30d = parseFloat((prices.reduce((s, p) => s + p.price, 0) / prices.length).toFixed(2));
    const fluctuation = parseFloat((((latestPrice - avgPrice30d) / avgPrice30d) * 100).toFixed(1));
    const priceLevel = computePriceLevel(fluctuation);
    evaluation = {
      product_name: productName, city_name: cityName, unit: productUnit,
      latest_price: latestPrice, latest_date: latestDate, avg_price_30d: avgPrice30d,
      fluctuation, price_level: priceLevel,
      price_level_reason: buildReason(productName, fluctuation, priceLevel)
    };
  }

  return { trend, evaluation };
}

/** 生成价格评估理由（与 Web 版 buildReason 一致） */
function buildReason(productName, fluctuation, level) {
  const absPct = Math.abs(fluctuation).toFixed(1);
  const direction = fluctuation >= 0 ? '高于' : '低于';
  switch (level) {
    case '便宜': return `${productName}当前价格${direction}30天均价${absPct}%，超过10%，价格实惠`;
    case '偏贵': return `${productName}当前价格${direction}30天均价${absPct}%，超过10%，价格偏高`;
    default: return `${productName}当前价格${direction}30天均价${absPct}%，在±10%以内，价格平稳`;
  }
}

module.exports = { getCities, getCategoriesByCity, getProducts, getProductDetail };