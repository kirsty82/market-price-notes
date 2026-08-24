// 菜市场价格查询 — 小程序入口
App({
  globalData: {
    supabaseUrl: 'https://tlcotxodgogynrcyfsuc.supabase.co',
    supabaseKey: 'sb_publishable_UKe1wFQLNk1_0qpmmC3uig_kkr0dO7j',
    currentCity: 'beijing'
  },

  onLaunch() {
    // 加载英文字体（Bebas Neue 用于标题）
    wx.loadFontFace({
      family: 'Bebas Neue',
      source: 'url("https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2")',
      success: () => console.log('Bebas Neue 字体加载成功'),
      fail: (err) => console.log('Bebas Neue 字体加载失败，使用系统字体:', err)
    });

    // 加载等宽字体（IBM Plex Mono 用于数字）
    wx.loadFontFace({
      family: 'IBM Plex Mono',
      source: 'url("https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2")',
      success: () => console.log('IBM Plex Mono 字体加载成功'),
      fail: (err) => console.log('IBM Plex Mono 字体加载失败，使用系统字体:', err)
    });
  }
});