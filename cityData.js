/**
 * 台中市區圖資與路網核心數據 (CityData)
 * 嚴格對標 Google Maps 台中市區真實路網 (中區、西區、北區、南區、東區、西屯七期)
 * 特別鎖定【第五張圖：台中車站周邊高精度真實街區】
 */

export const CityConfig = {
  centerCoord: { lat: 24.1368, lon: 120.6850 }, // 台中車站座標
  scaleLat: 111000,
  scaleLon: 101000
};

// 1. 台中車站周邊真實道路網 (對標第五張圖真實街道)
export const DOWNTOWN_ROADS = [
  // 主幹大道
  { name: '臺灣大道一段', en: 'Taiwan Blvd Sec 1', type: 'arterial', x1: -320, z1: 0, x2: 65, z2: 0, width: 22 },
  { name: '建國路', en: 'Jianguo Rd', type: 'arterial', x1: 58, z1: -280, x2: 58, z2: 260, width: 20 },
  
  // 綠川水岸兩側道路
  { name: '綠川西街', en: 'Luchuan W. St', type: 'secondary', x1: -12, z1: -220, x2: -12, z2: 240, width: 10 },
  { name: '綠川東街', en: 'Luchuan E. St', type: 'secondary', x1: 12, z1: -220, x2: 12, z2: 240, width: 10 },

  // 中區縱向棋盤道路 (平行建國路)
  { name: '繼光街', en: 'Jiguang St (Pedestrian)', type: 'shopping', x1: -45, z1: -220, x2: -45, z2: 220, width: 11 },
  { name: '自由路二段', en: 'Ziyou Rd Sec 2 (Sun Cake)', type: 'arterial', x1: -95, z1: -260, x2: -95, z2: 240, width: 19 },
  { name: '市府路', en: 'Shifu Rd', type: 'secondary', x1: -145, z1: -240, x2: -145, z2: 220, width: 14 },
  { name: '三民路二段', en: 'Sanmin Rd Sec 2 (Market)', type: 'arterial', x1: -195, z1: -260, x2: -195, z2: 240, width: 18 },
  { name: '中華路一段', en: 'Zhonghua Rd Sec 1 (Night Market)', type: 'secondary', x1: -260, z1: -260, x2: -260, z2: 240, width: 16 },

  // 中區橫向棋盤道路 (平行臺灣大道)
  { name: '公園路', en: 'Gongyuan Rd (Park)', type: 'arterial', x1: -320, z1: -140, x2: 65, z2: -140, width: 18 },
  { name: '光復路', en: 'Guangfu Rd', type: 'secondary', x1: -300, z1: -95, x2: 60, z2: -95, width: 13 },
  { name: '成功路', en: 'Chenggong Rd', type: 'secondary', x1: -300, z1: -48, x2: 60, z2: -48, width: 13 },
  { name: '中山路', en: 'Zhongshan Rd (Miyahara)', type: 'secondary', x1: -300, z1: 48, x2: 60, z2: 48, width: 14 },
  { name: '民族路', en: 'Minzu Rd (Golden Plaza)', type: 'secondary', x1: -300, z1: 95, x2: 60, z2: 95, width: 14 },
  { name: '民權路', en: 'Minquan Rd (Old City Hall)', type: 'arterial', x1: -320, z1: 155, x2: 65, z2: 155, width: 19 },

  // 台中後站 (東區)
  { name: '新民街', en: 'Xinmin St', type: 'secondary', x1: 105, z1: -160, x2: 105, z2: 80, width: 12 },
  { name: '大智北路', en: 'Dazhi N. Rd', type: 'secondary', x1: 65, z1: -40, x2: 240, z2: -40, width: 16 },
  { name: '復興路四段', en: 'Fuxing Rd Sec 4', type: 'arterial', x1: 135, z1: -260, x2: 135, z2: 240, width: 18 }
];

// 2. 綠川水岸 (Luchuan Waterfront) 水體河道與拱橋
export const LUCHUAN_CANAL = {
  x: 0,
  width: 12,
  zStart: -240,
  zEnd: 240,
  bridges: [
    { name: '櫻橋 (臺灣大道)', z: 0, width: 22 },
    { name: '中山綠橋 (中山路)', z: 48, width: 15 },
    { name: '民族橋 (民族路)', z: 95, width: 15 },
    { name: '成功橋 (成功路)', z: -48, width: 14 },
    { name: '光復橋 (光復路)', z: -95, width: 14 },
    { name: '民權橋 (民權路)', z: 155, width: 20 }
  ]
};

// 3. 台中公園 (Taichung Park) 與 湖心亭 (Pavilion)
export const TAICHUNG_PARK_ZONE = {
  minX: -190,
  maxX: 40,
  minZ: -280,
  maxZ: -140,
  lake: { cx: -75, cz: -210, rx: 70, rz: 45 },
  pavilion: { x: -75, z: -210 }
};

// 4. 帝國製糖廠臺中營業所 & 湧泉公園湖泊 (後站湖景)
export const SUGAR_FACTORY_ZONE = {
  minX: 165,
  maxX: 260,
  minZ: -170,
  maxZ: -30,
  lake: { cx: 215, cz: -100, rx: 42, rz: 55 },
  factory: { x: 235, z: -145 }
};

// 5. 台中捷運綠線 (Taichung MRT Green Line 18 座車站完整座標)
export const MRT_GREEN_LINE_DATA = [
  { code: 'G00', name: '北屯總站', en: 'Beitun Main Station', x: -30, z: -430 },
  { code: 'G03', name: '舊社', en: 'Jiushe', x: -45, z: -380 },
  { code: 'G04', name: '松竹', en: 'Songzhu', x: -65, z: -330, transfer: '台鐵' },
  { code: 'G05', name: '四維國小', en: 'Siwei Elementary', x: -95, z: -280 },
  { code: 'G06', name: '文心中清', en: 'Wenxin Zhongqing', x: -135, z: -235 },
  { code: 'G07', name: '文心崇德', en: 'Wenxin Chongde', x: -175, z: -190 },
  { code: 'G08', name: '文華高中', en: 'Wenhua High School', x: -210, z: -145 },
  { code: 'G09', name: '文心櫻花', en: 'Wenxin Yinghua', x: -240, z: -100 },
  { code: 'G10', name: '市政府', en: 'Taichung City Hall', x: -260, z: -50, hub: true },
  { code: 'G10a', name: '水安宮', en: 'Shuian Temple', x: -265, z: 0 },
  { code: 'G11', name: '文心森林公園', en: 'Wenxin Forest Park', x: -260, z: 50 },
  { code: 'G12', name: '南屯', en: 'Nantun', x: -250, z: 100 },
  { code: 'G13', name: '豐樂公園', en: 'Feng-le Sculpture Park', x: -230, z: 155 },
  { code: 'G14', name: '大慶', en: 'Daqing', x: -200, z: 215, transfer: '台鐵' },
  { code: 'G15', name: '九張犁', en: 'Jiuzhangli', x: -175, z: 260 },
  { code: 'G16', name: '九德', en: 'Jiude', x: -160, z: 300 },
  { code: 'G17', name: '烏日', en: 'Wuri', x: -155, z: 340 },
  { code: 'G18', name: '高鐵台中站', en: 'HSR Taichung', x: -170, z: 385, hub: true }
];

// 6. 台鐵高架鐵路山線車站 (TRA Mountain Railway)
export const TRA_LINE_DATA = [
  { name: '豐原車站', x: 50, z: -520 },
  { name: '潭子車站', x: 35, z: -410 },
  { name: '松竹車站', x: -65, z: -330, transfer: '捷運G04' },
  { name: '太原車站', x: 10, z: -250 },
  { name: '精武車站', x: 20, z: -190 },
  { name: '台中車站', x: 75, z: 0, hub: true },
  { name: '五權車站', x: -50, z: 160 },
  { name: '大慶車站', x: -200, z: 215, transfer: '捷運G14' },
  { name: '烏日車站', x: -155, z: 340 },
  { name: '新烏日車站', x: -170, z: 385, hub: true }
];

// 7. 台中市區知名 POI 地標總表 (中區/西區/北區/東區/西屯)
export const TAICHUNG_URBAN_POIS = [
  // 站前核心 (第五張圖標誌)
  { name: '台中車站 (新站高架穹頂)', category: 'tra', x: 75, z: 0, rating: 4.9, badge: '交通樞紐', address: '台中市中區台灣大道一段1號' },
  { name: '李方艾美金沙大樓', category: 'spot', x: 55, z: 95, rating: 4.8, badge: '170m 旋轉飛碟', address: '台中市中區建國路111號' },
  { name: '宮原眼科冰品旗艦', category: 'food', x: -12, z: 48, rating: 4.7, badge: '歷史老店', address: '台中市中區中山路20號' },
  { name: '自由路太陽餅博物館', category: 'food', x: -95, z: 20, rating: 4.8, badge: '台中名產', address: '台中市中區自由路二段145號' },
  { name: '繼光香香雞創始總店', category: 'food', x: -45, z: 25, rating: 4.6, badge: '繼光街美食', address: '台中市中區繼光街91號' },
  { name: '第二市場 (老牌炒麵)', category: 'food', x: -195, z: 45, rating: 4.8, badge: '東泉辣醬', address: '台中市中區三民路二段87號' },
  { name: '台中公園 (湖心亭)', category: 'spot', x: -75, z: -210, rating: 4.8, badge: '百年古蹟', address: '台中市北區公園路37-1號' },
  { name: '日曜天地 OUTLET', category: 'mall', x: 35, z: -140, rating: 4.6, badge: '精品暢貨', address: '台中市中區自由路二段94號' },
  { name: '帝國製糖廠 (湧泉公園)', category: 'spot', x: 235, z: -145, rating: 4.8, badge: '歷史生態', address: '台中市東區樂業路30號' },
  { name: 'LaLaport 台中購物中心', category: 'mall', x: 210, z: -220, rating: 4.9, badge: '巨型商場', address: '台中市東區進德路600號' },

  // 市區周邊核心
  { name: '一中街商圈', category: 'food', x: -95, z: -320, rating: 4.8, badge: '夜市商圈', address: '台中市北區一中街' },
  { name: '勤美誠品草悟道', category: 'spot', x: -220, z: -60, rating: 4.8, badge: '市民廣場', address: '台中市西區公益路68號' },
  { name: '台中國家歌劇院', category: 'spot', x: -260, z: -110, rating: 4.9, badge: '國際地標', address: '台中市西屯區惠來路二段101號' },
  { name: '七期新光三越/大遠百', category: 'mall', x: -245, z: -90, rating: 4.9, badge: '百貨店王', address: '台中市西屯區台灣大道三段301號' },
  { name: '秋紅谷景觀生態公園', category: 'spot', x: -280, z: -80, rating: 4.8, badge: '生態滯洪', address: '台中市西屯區朝富路30號' }
];

if (typeof window !== 'undefined') {
  window.CityConfig = CityConfig;
  window.DOWNTOWN_ROADS = DOWNTOWN_ROADS;
  window.LUCHUAN_CANAL = LUCHUAN_CANAL;
  window.TAICHUNG_PARK_ZONE = TAICHUNG_PARK_ZONE;
  window.SUGAR_FACTORY_ZONE = SUGAR_FACTORY_ZONE;
  window.MRT_GREEN_LINE_DATA = MRT_GREEN_LINE_DATA;
  window.TRA_LINE_DATA = TRA_LINE_DATA;
  window.TAICHUNG_URBAN_POIS = TAICHUNG_URBAN_POIS;
}
