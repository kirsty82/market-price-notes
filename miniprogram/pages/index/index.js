// 菜市场价格查询 — 首页（与 Web 版一致）
const { getCities, getCategoriesByCity, getProducts } = require('../../utils/supabase');

Page({
  data: {
    cities: [],
    categories: [],
    products: [],
    currentCityId: '',
    currentCategoryId: '',
    searchKeyword: '',
    loading: true,
    error: null,
    dateStr: '',
    weekDay: '',
    dayNum: '',
    selectedCityName: '',
    searchValue: ''
  },

  onLoad() {
    this.initDate();
    this.loadCities();
  },

  initDate() {
    const today = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    this.setData({
      dateStr: `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`,
      weekDay: weekDays[today.getDay()],
      dayNum: String(today.getDate()).padStart(2, '0')
    });
  },

  async loadCities() {
    try {
      const cities = await getCities();
      this.setData({ cities: cities || [] });
      if (cities && cities.length > 0) {
        const cityId = cities[0].id;
        this.setData({ currentCityId: cityId, selectedCityName: cities[0].name });
        this.loadCategories(cityId);
        this.loadProducts(cityId);
      }
    } catch (err) {
      console.error('加载城市失败:', err);
    }
  },

  async loadCategories(cityId) {
    try {
      const cats = await getCategoriesByCity(cityId);
      this.setData({ categories: cats || [] });
    } catch (err) {
      console.error('加载品类失败:', err);
    }
  },

  async loadProducts(cityId, categoryId, search) {
    this.setData({ loading: true, error: null });
    try {
      const products = await getProducts(
        cityId || this.data.currentCityId,
        categoryId !== undefined ? categoryId : (this.data.currentCategoryId || undefined),
        search !== undefined ? search : (this.data.searchKeyword || undefined)
      );
      this.setData({ products: products || [], loading: false });
    } catch (err) {
      console.error('加载商品失败:', err);
      this.setData({ error: '加载失败', loading: false });
    }
  },

  switchCity(e) {
    const cityId = e.currentTarget.dataset.id;
    if (cityId === this.data.currentCityId) return;
    const city = this.data.cities.find(c => c.id === cityId);
    this.setData({
      currentCityId: cityId,
      currentCategoryId: '',
      selectedCityName: city ? city.name : ''
    });
    this.loadCategories(cityId);
    this.loadProducts(cityId, null, '');
  },

  switchCategory(e) {
    const catId = e.currentTarget.dataset.id;
    const newCat = catId === this.data.currentCategoryId ? '' : catId;
    this.setData({ currentCategoryId: newCat });
    this.loadProducts(undefined, newCat, undefined);
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value });
  },

  onSearchConfirm(e) {
    const keyword = e.detail.value || this.data.searchValue;
    this.setData({ searchKeyword: keyword });
    this.loadProducts(undefined, undefined, keyword);
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&city=${this.data.currentCityId}`
    });
  },

  onPullDownRefresh() {
    this.loadProducts().then(() => wx.stopPullDownRefresh());
  }
});