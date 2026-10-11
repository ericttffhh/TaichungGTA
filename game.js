/**
 * 臺中狂飆 (TAICHUNG RUSH) - 核心遊戲引擎
 * 採用 OpenStreetMap 真實圖資 (taichung-map-data.json) + Google Maps 導航地圖系統
 * 技術架構：ES Module + Three.js + cannon-es + BufferGeometryUtils
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WorldChunkManager } from './chunkManager.js';
import { TaiwanTextureFactory, TAIWAN_BUILDING_STYLES } from './textures.js';
import { GtaGameplayManager } from './gtaGameplay.js';
import { LandmarkBuilder } from './landmarkBuilder.js';
import { soundManager } from './soundSystem.js';
import { TaiwanTrafficSignalSystem, TaiwanStreetscapeTextures } from './taiwanStreetscape.js';

window.THREE = THREE;
window.CANNON = CANNON;
window.soundManager = soundManager;

// ============================================================================
// 台中真實 3D 地標模型配置表 (嚴格立著排好、底面切齊地表、真實比例尺與旋轉)
// CAD/Sketchup 導出為英吋 (1 inch = 0.0254m)，需縮放 0.0254
// 旋轉原理：內部模型校正 rotX 使 Z-up 轉為 Y-up，外層容器旋轉 rotY (繞世界垂直 Y 軸，不傾斜)
// 大慶車站已透過 gltfpack 優化為 4.4MB (DaqingRailwayStation_opt.glb)
// ============================================================================
export const LANDMARK_CONFIGS = [
  {
    id: 'taichung_station',
    name: '臺中火車站 & 站前廣場',
    category: 'tra',
    badge: '國定古蹟 · 1917 新文藝復興鐘樓紅磚車站',
    address: '台中市中區臺灣大道一段1號',
    builder: 'buildTaichungStation',
    x: -5.0,
    z: 145.0,
    rotY: Math.PI * 0.22,
    boxW: 90, boxH: 26, boxD: 70,
    exclusionRadius: 40,
    spawnOffset: { x: -25, z: -65 },
    yOffset: 0
  },
  {
    id: 'lifang_aimei',
    name: '李方艾美酒店 (原金沙大樓)',
    category: 'spot',
    badge: '中區第一高樓 · 173m 玻璃帷幕地標',
    address: '台中市中區建國路111號',
    builder: 'buildLiFangAimei',
    x: -158.2,
    z: 138.8,
    rotY: Math.PI * 0.18,
    boxW: 55, boxH: 178, boxD: 55,
    exclusionRadius: 42,
    spawnOffset: { x: -28, z: 6 },
    yOffset: 0
  },
  {
    id: 'asia_grand_hotel',
    name: '亞洲大飯店 / 榮達大樓',
    category: 'spot',
    badge: '中區歷史摩天樓 · 175m 階梯石材塔樓',
    address: '台中市中區臺灣大道一段與民權路口',
    builder: 'buildAsiaGrandHotel',
    x: -159.6,
    z: -58.0,
    rotY: Math.PI * 0.18,
    boxW: 68, boxH: 175, boxD: 60,
    exclusionRadius: 42,
    spawnOffset: { x: 22, z: 0 },
    yOffset: 0
  },
  {
    id: 'museum_science',
    name: '國立自然科學博物館 (科博館)',
    category: 'spot',
    badge: '全台首座科學博物館 · 太空劇場銀球與植物園溫室',
    address: '台中市北區館前路1號',
    builder: 'buildScienceMuseum',
    x: -2130.1,
    z: -2183.0,
    rotY: 0,
    boxW: 360, boxH: 40, boxD: 280,
    exclusionRadius: 100,
    spawnOffset: { x: 0, z: 120 },
    yOffset: 0
  },
  {
    id: 'museum_fine_arts',
    name: '國立臺灣美術館 (國美館)',
    category: 'spot',
    badge: '亞洲最大美術館之一 · 幾何白色現代展館群',
    address: '台中市西區五權西路一段2號',
    builder: 'buildFineArtsMuseum',
    x: -2296.6,
    z: -341.6,
    rotY: 0,
    boxW: 280, boxH: 35, boxD: 215,
    exclusionRadius: 90,
    spawnOffset: { x: 0, z: 110 },
    yOffset: 0
  },
  {
    id: 'daqing_station',
    name: '大慶車站 (臺鐵/捷運綠線 G13)',
    category: 'tra',
    badge: '臺鐵與台中捷運高架共構轉乘樞紐',
    address: '台中市南區建國北路一段159號',
    builder: 'buildDaqingStation',
    x: -3833.7,
    z: 2118.2,
    rotY: Math.PI * 0.22,
    boxW: 240, boxH: 26, boxD: 60,
    exclusionRadius: 55,
    spawnOffset: { x: 15, z: 45 },
    yOffset: 0
  },
  {
    id: 'taichung_park',
    name: '台中公園 湖心亭',
    category: 'spot',
    badge: '市徽象徵 · 市定古蹟',
    address: '台中市北區雙十路一段65號 (台中公園內)',
    builder: 'buildTaichungParkPavilion',
    x: 30.5,
    z: -757.0,
    boxW: 44, boxH: 15, boxD: 40,
    exclusionRadius: 42,
    spawnOffset: { x: 75, z: 25 }, // 精準傳送至台中公園大門口雙十路一段車道上，絕不落入湖水水塘中！
    yOffset: 0
  },
  {
    id: 'taichung_theater',
    name: '台中國家歌劇院',
    category: 'spot',
    badge: '世界第九大新地標 · 伊東豊雄',
    address: '台中市西屯區惠來路二段101號 (七期市政特區)',
    builder: 'buildNationalTaichungTheater',
    x: -4520.6,
    z: -2760.7,
    boxW: 86, boxH: 46, boxD: 66, // 實體尺寸 約 71m x 52m x 46m
    exclusionRadius: 50,
    spawnOffset: { x: 108, z: 12 }, // 惠來路二段 / 市政北五路路口 (實際 OSM 道路)
    yOffset: 0
  },
  {
    id: 'luce_chapel',
    name: '東海大學 路思義教堂',
    category: 'spot',
    badge: '國定古蹟 · 貝聿銘代表作',
    address: '台中市西屯區台灣大道四段1727號 (東海大學校內)',
    builder: 'buildLuceMemorialChapel',
    x: -8573.9,
    z: -4541.8,
    boxW: 30, boxH: 16, boxD: 20,
    exclusionRadius: 30,
    spawnOffset: { x: -38, z: -39 }, // 約農路 (校內實際道路)，不再落在草坪中央
    yOffset: 0
  },
  {
    id: 'miyahara',
    name: '宮原眼科',
    category: 'spot',
    badge: '歷史建築 · 1927 日治古典騎樓',
    address: '台中市中區中山路20號 (綠川水岸旁)',
    builder: 'buildMiyahara',
    x: -121.9,
    z: 22.3,
    boxW: 42, boxH: 18, boxD: 24,
    exclusionRadius: 30,
    spawnOffset: { x: -32, z: 14 }, // 中山路路面
    yOffset: 0
  },
  {
    id: 'second_market',
    name: '台中第二市場 六角樓',
    category: 'spot',
    badge: '百年歷史市場 · 1917 六角核心樓',
    address: '台中市中區三民路二段87號 (三民路/中山路口)',
    builder: 'buildSecondMarketHexagonalTower',
    x: -629.8,
    z: -500.9,
    boxW: 36, boxH: 20, boxD: 36,
    exclusionRadius: 32,
    spawnOffset: { x: 24, z: -4 },
    yOffset: 0
  }
];

// ============================================================================
// 1. 常數設定與座標轉換 (Web Mercator 轉 3D 公尺世界座標)
// ============================================================================

// 以「台中火車站」 (經度 120.685, 緯度 24.138) 作為 3D 空間的原點 (0, 0, 0)
export const ORIGIN_LON = 120.685;
export const ORIGIN_LAT = 24.138;

// WGS84 地球半徑與投影常數
const EARTH_RADIUS = 6378137;
const DEG_TO_RAD = Math.PI / 180;
const COS_LAT0 = Math.cos(ORIGIN_LAT * DEG_TO_RAD);

// 經緯度 轉 3D 空間 X/Z 公尺 (X: 東向正, Z: 北向負，符合 Three.js 標準座標系)
export function geoToMeters(lon, lat) {
  const x = (lon - ORIGIN_LON) * DEG_TO_RAD * EARTH_RADIUS * COS_LAT0;
  const z = -(lat - ORIGIN_LAT) * DEG_TO_RAD * EARTH_RADIUS;
  return { x, z };
}

// 臺中行政區劃精準判斷系統 (依據官方界線界樁與重要地標坐標即時判斷中區、南區、西區、北區、西屯區、南屯區、東區、烏日區等)
export function getDistrictName(x, z) {
  // 1. 南區 (South District): 大慶車站 (-3833.7, 2118.2)、中山醫學大學、建國北路、工學路、復興路
  const distToDaqing = Math.hypot(x - (-3833.7), z - 2118.2);
  if (distToDaqing < 2200 || (z > 680 && x < 250 && x > -4200)) {
    return '南區';
  }

  // 2. 西屯區 (Xitun District): 台中國家歌劇院 (-4520, -2760)、秋紅谷、逢甲、東海路思義教堂、七期市政特區
  if (x < -3200 && z < -1000) {
    return '西屯區';
  }

  // 3. 南屯區 (Nantun District): 文心森林公園、南屯老街、豐樂雕塑公園
  if (x < -2400 && z >= -1000 && z <= 900) {
    return '南屯區';
  }

  // 4. 北區 (North District): 國立自然科學博物館 (科博館 -2130, -2183)、台中公園、一中街商圈、中友百貨
  if (z < -650 && x >= -2500 && x < 1000) {
    return '北區';
  }

  // 5. 北屯區 (Beitun District): 洲際棒球場、大坑
  if (z < -2500 && x >= 500) {
    return '北屯區';
  }

  // 6. 西區 (West District): 國立臺灣美術館 (國美館 -2296, -341)、勤美草悟道、審計新村
  if (x < -1200 && x >= -3200 && z >= -1200 && z <= 680) {
    return '西區';
  }

  // 7. 東區 (East District): 臺中車站後站、三井 LaLaport、台中糖廠、旱溪
  if (x > 220 && z >= -1000 && z <= 2000) {
    return '東區';
  }

  // 8. 烏日區 (Wuri District): 高鐵台中站
  if (z > 3200 || (x < -4200 && z > 1800)) {
    return '烏日區';
  }

  // 9. 中區 (Central District): 臺中火車站站前、綠川、柳川、第二市場、宮原眼科
  return '中區';
}

// ============================================================================
// 2. 材質生成器 (Procedural Textures)
// ============================================================================
class TextureGenerator {
  // 屋頂水泥防水層貼圖 (深灰色混凝土防水層，絕無窗戶)
  static createRoofTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#64748b';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  // 台灣真實都會商圈街景立面 (1F 經典店面看板：7-11、全家、繼光香香雞、太陽餅、珍奶 + 2F~高樓冷氣室外機與鐵窗)
  static createFacadeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 外牆底色 (現代混和建材灰米色 / 二丁掛磁磚)
    ctx.fillStyle = '#b2bec3';
    ctx.fillRect(0, 0, 1024, 512);

    // 磁磚溝縫紋理
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    for (let y = 0; y < 512; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    for (let x = 0; x < 1024; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // ★★★ 1F 真實台灣街景商圈店面 (8大經典知名店家與招牌) ★★★
    const stores = [
      { name: '7-ELEVEN', bg: '#00805a', text: '#ffffff', stripe: '#f37021' },
      { name: 'FamilyMart', bg: '#00a0e9', text: '#ffffff', stripe: '#009944' },
      { name: '繼光香香雞', bg: '#c0392b', text: '#ffeaa7', stripe: '#e74c3c' },
      { name: '太陽堂太陽餅', bg: '#d35400', text: '#ffffff', stripe: '#e67e22' },
      { name: '50嵐 經典手搖', bg: '#0984e3', text: '#fdcb6e', stripe: '#ffeaa7' },
      { name: '清心福全', bg: '#10ac84', text: '#ffffff', stripe: '#1dd1a1' },
      { name: '八方雲集鍋貼', bg: '#b33939', text: '#ffda79', stripe: '#cd6133' },
      { name: '台灣彩券', bg: '#f1c40f', text: '#c0392b', stripe: '#e74c3c' }
    ];

    const colW = 1024 / 8;
    for (let c = 0; c < 8; c++) {
      const st = stores[c];
      const sx = c * colW + 4;
      const sy = 375; // 1F 底層
      const sw = colW - 8;
      const sh = 132;

      // 店面大門與明亮玻璃櫥窗
      ctx.fillStyle = '#f5f6fa';
      ctx.fillRect(sx, sy, sw, sh);

      // 店內溫暖照明
      ctx.fillStyle = 'rgba(255, 234, 167, 0.45)';
      ctx.fillRect(sx + 4, sy + 38, sw - 8, sh - 46);

      // 店門邊框
      ctx.strokeStyle = '#2f3542';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // 招牌主看板背景
      ctx.fillStyle = st.bg;
      ctx.fillRect(sx + 2, sy + 4, sw - 4, 30);

      // 招牌彩色飾條
      ctx.fillStyle = st.stripe;
      ctx.fillRect(sx + 2, sy + 30, sw - 4, 4);

      // 招牌發光品牌文字
      ctx.fillStyle = st.text;
      ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.name, sx + sw / 2, sy + 23);

      // 台灣特色直式凸出側招牌 (側掛燈箱)
      ctx.fillStyle = st.bg;
      ctx.fillRect(sx + 2, sy - 40, 12, 36);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx + 4, sy - 36, 8, 28);
    }
    ctx.textAlign = 'left';

    // ★★★ 2F ~ 4F 現代商辦與公寓住宅立面 (含窗櫺、夜間生活燈光、冷氣室外機) ★★★
    const floors = 3;
    const cols = 8;
    const floorH = 365 / floors;

    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * colW + 18;
        const wy = f * floorH + 18;
        const ww = colW - 36;
        const wh = floorH - 40;

        // 窗框
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

        // 窗戶玻璃 (夜間部分窗戶發出暖黃/淡藍燈光，極具生活感)
        const isLit = (f + c) % 2 === 0;
        ctx.fillStyle = isLit ? '#ffeaa7' : '#1e272e';
        ctx.fillRect(wx, wy, ww, wh);

        // 窗櫺十字分割
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy);
        ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh / 2);
        ctx.lineTo(wx + ww, wy + wh / 2);
        ctx.stroke();

        // 台灣特色冷氣室外機 (每間常有懸掛於窗台邊)
        if ((f + c) % 3 === 0) {
          ctx.fillStyle = '#dcdde1';
          ctx.fillRect(wx + ww - 24, wy + wh + 2, 22, 14);
          ctx.strokeStyle = '#718093';
          ctx.strokeRect(wx + ww - 24, wy + wh + 2, 22, 14);
          ctx.fillStyle = '#2f3542';
          ctx.beginPath();
          ctx.arc(wx + ww - 13, wy + wh + 9, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 樓層橫樑分隔線
      ctx.fillStyle = '#837466';
      ctx.fillRect(0, f * floorH + floorH - 6, 1024, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // 人行道紅灰雙色透水磚材質 (含導盲磚飾條與路緣石)
  static createSidewalkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 混凝土底色
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(0, 0, 256, 256);

    // 紅灰相間連鎖地磚網格 (16x16 塊)
    const tileSize = 32;
    for (let y = 0; y < 256; y += tileSize) {
      for (let x = 0; x < 256; x += tileSize) {
        const isRed = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isRed ? '#d35400' : '#7f8c8d';
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        // 磚面微雜訊顆粒
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(x + 6, y + 6, tileSize - 12, tileSize - 12);
      }
    }

    // 中央黃色導盲磚飾條
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(116, 0, 24, 256);
    ctx.fillStyle = '#e67e22';
    for (let y = 4; y < 256; y += 12) {
      ctx.fillRect(118, y, 20, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 8);
    return texture;
  }

  // 瀝青柏油路面材質 (含中央雙黃線與快慢車道虛線)
  static createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 柏油底色
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    // 瀝青砂石微顆粒
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b2e35' : '#181a1d';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    // 中央雙黃線 (台灣標準市區幹道線)
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0); ctx.lineTo(250, 512);
    ctx.moveTo(262, 0); ctx.lineTo(262, 512);
    ctx.stroke();

    // 兩側車道白色虛線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([32, 24]);
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 512);
    ctx.moveTo(384, 0); ctx.lineTo(384, 512);
    ctx.stroke();

    // 道路兩側白邊實線
    ctx.setLineDash([]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(16, 512);
    ctx.moveTo(496, 0); ctx.lineTo(496, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  // 十字路口專用材質 (支援台灣一般標準路口與火車站周邊淨空黃色網狀線)
  static createCrossroadTexture(hasYellowBox = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 瀝青底色與砂石顆粒
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b2e35' : '#181a1d';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    if (hasYellowBox) {
      // 火車站周邊 / 特殊淨空路口：中央黃色網狀線 (淨空區 - 台灣交警標準規格)
      const bx = 156, by = 156, bw = 200, bh = 200;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw, bh);
      ctx.clip();
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3.5;
      for (let offset = -bw * 2; offset <= bw * 2; offset += 24) {
        ctx.beginPath();
        ctx.moveTo(bx + offset, by);
        ctx.lineTo(bx + offset + bh, by + bh);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(bx + offset, by + bh);
        ctx.lineTo(bx + offset + bh, by);
        ctx.stroke();
      }
      ctx.restore();

      // 黃色網狀線外框實線
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 5;
      ctx.strokeRect(bx, by, bw, bh);
    } else {
      // 台灣標準十字路口：斑馬線前【機車停等區】(Scooter Waiting Box)
      const drawScooterBox = (x, y, w, h, isVertical) => {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        if (isVertical) {
          ctx.fillText('機車停等區', x + w / 2, y + h / 2 + 4);
        } else {
          ctx.fillText('機車', x + w / 2, y + h / 2 - 2);
          ctx.fillText('停等區', x + w / 2, y + h / 2 + 10);
        }
      };

      // 4 個入口方向繪製機車停等區 (位於停止線前)
      drawScooterBox(160, 92, 192, 38, true);   // 上
      drawScooterBox(160, 382, 192, 38, true);  // 下
      drawScooterBox(92, 160, 38, 192, false);  // 左
      drawScooterBox(382, 160, 38, 192, false); // 右
    }

    // 行人穿越道 (斑馬線) 繪製函式
    const drawZebra = (x, y, w, h, isVertical) => {
      ctx.fillStyle = '#ffffff';
      if (isVertical) {
        for (let curX = x + 4; curX <= x + w - 16; curX += 26) {
          ctx.fillRect(curX, y, 16, h);
        }
      } else {
        for (let curY = y + 4; curY <= y + h - 16; curY += 26) {
          ctx.fillRect(x, curY, w, 16);
        }
      }
    };

    // 4 側斑馬線 (寬度 52px，白條 16px、間隔 10px)
    drawZebra(140, 48, 232, 42, true);   // 上方
    drawZebra(140, 422, 232, 42, true);  // 下方
    drawZebra(48, 140, 42, 232, false);  // 左側
    drawZebra(422, 140, 42, 232, false); // 右側

    // 停止線 (斑馬線後方白色實線)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(140, 36); ctx.lineTo(372, 36);   // 上
    ctx.moveTo(140, 476); ctx.lineTo(372, 476); // 下
    ctx.moveTo(36, 140); ctx.lineTo(36, 372);   // 左
    ctx.moveTo(476, 140); ctx.lineTo(476, 372); // 右
    ctx.stroke();

    // 路口轉彎導引虛線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(140, 140, 70, 0, Math.PI * 0.5);
    ctx.arc(372, 140, 70, Math.PI * 0.5, Math.PI);
    ctx.arc(372, 372, 70, Math.PI, Math.PI * 1.5);
    ctx.arc(140, 372, 70, Math.PI * 1.5, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // 丁字 / 三叉路口專用材質 (含 3 方向斑馬紋行人穿越道、停止線與直行幹道邊線)
  static createTeeJunctionTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b2e35' : '#181a1d';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    // 直行主幹道頂部邊界與路標實線
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(250, 0); ctx.lineTo(250, 160);
    ctx.moveTo(262, 0); ctx.lineTo(262, 160);
    ctx.stroke();

    const drawZebra = (x, y, w, h, isVertical) => {
      ctx.fillStyle = '#ffffff';
      if (isVertical) {
        for (let curX = x + 4; curX <= x + w - 16; curX += 26) {
          ctx.fillRect(curX, y, 16, h);
        }
      } else {
        for (let curY = y + 4; curY <= y + h - 16; curY += 26) {
          ctx.fillRect(x, curY, w, 16);
        }
      }
    };

    drawZebra(140, 410, 232, 52, true);  // 下方支道
    drawZebra(50, 140, 52, 232, false);  // 左側
    drawZebra(410, 140, 52, 232, false); // 右側

    // 停止線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(140, 476); ctx.lineTo(372, 476); // 下方支道停止線
    ctx.moveTo(36, 140); ctx.lineTo(36, 372);   // 左
    ctx.moveTo(476, 140); ctx.lineTo(476, 372); // 右
    ctx.stroke();

    // 轉向導引虛線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(372, 372, 120, Math.PI, Math.PI * 1.5);
    ctx.arc(140, 372, 120, Math.PI * 1.5, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  // 地表草皮/廣場基礎材質
  static createGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1b1e22';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#23272c' : '#141618';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 60);
    return texture;
  }

  // 台灣高架高速公路與快速道路專用貼圖 (台74線環線、國道一號高架：深色粗糙瀝青、雙車道白虛線、黃色內側路肩、白色外側路肩、反光標記)
  static createHighwayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1c1f24';
    ctx.fillRect(0, 0, 512, 1024);

    for (let i = 0; i < 16000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#16181c' : '#262a30';
      ctx.fillRect(Math.random() * 512, Math.random() * 1024, 2, 2);
    }

    // 內側亮黃色路肩實線
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(35, 0); ctx.lineTo(35, 1024);
    ctx.stroke();

    // 外側亮白色路肩實線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(477, 0); ctx.lineTo(477, 1024);
    ctx.stroke();

    // 中央多車道白色虛線 (快慢車道分道線)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.setLineDash([70, 70]);
    [145, 256, 367].forEach((laneX) => {
      ctx.beginPath();
      ctx.moveTo(laneX, 0);
      ctx.lineTo(laneX, 1024);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 貓眼石反光標記 (黃色與白色反光凸起標記)
    ctx.fillStyle = '#fff9c4';
    for (let y = 35; y < 1024; y += 140) {
      [145, 256, 367].forEach((laneX) => {
        ctx.fillRect(laneX - 3, y - 5, 6, 10);
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 4);
    return tex;
  }

  // 台灣高速公路/快速道路綠色門架路牌貼圖
  static createHighwaySignTexture(signText = '【 74 快速道路 】 環線 快官 ｜ 大里 ｜ 潭子') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(signText, 256, 48);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffeb3b';
    ctx.fillText('SPEED LIMIT 80 km/h  ▲ 出口 300m', 256, 90);

    return new THREE.CanvasTexture(canvas);
  }

  // 台灣經典行人專用號誌 (小綠人走動動畫張與小紅人站立張)
  static createPedestrianSignalTextures() {
    // 1. 小紅人站立 (Standing Red Man)
    const redCanvas = document.createElement('canvas');
    redCanvas.width = 64; redCanvas.height = 64;
    const rCtx = redCanvas.getContext('2d');
    rCtx.fillStyle = '#111111'; rCtx.fillRect(0, 0, 64, 64);
    rCtx.fillStyle = '#ff1744';
    // 頭
    rCtx.beginPath(); rCtx.arc(32, 16, 7, 0, Math.PI * 2); rCtx.fill();
    // 軀幹
    rCtx.fillRect(28, 25, 8, 16);
    // 垂直雙手
    rCtx.fillRect(21, 26, 5, 14);
    rCtx.fillRect(38, 26, 5, 14);
    // 垂直站立雙腿
    rCtx.fillRect(27, 43, 4, 15);
    rCtx.fillRect(33, 43, 4, 15);
    const redManTex = new THREE.CanvasTexture(redCanvas);

    // 2. 小綠人邁步 Pose 1 (Walking Green Man Pose 1)
    const g1Canvas = document.createElement('canvas');
    g1Canvas.width = 64; g1Canvas.height = 64;
    const g1Ctx = g1Canvas.getContext('2d');
    g1Ctx.fillStyle = '#111111'; g1Ctx.fillRect(0, 0, 64, 64);
    g1Ctx.fillStyle = '#00e676';
    // 頭 (微向前傾)
    g1Ctx.beginPath(); g1Ctx.arc(35, 16, 7, 0, Math.PI * 2); g1Ctx.fill();
    // 軀幹
    g1Ctx.fillRect(30, 24, 7, 16);
    // 擺動手臂
    g1Ctx.fillRect(38, 26, 7, 4); g1Ctx.fillRect(43, 30, 4, 10);
    g1Ctx.fillRect(21, 27, 8, 4);
    // 大步邁開雙腿
    g1Ctx.fillRect(24, 42, 6, 16);
    g1Ctx.fillRect(36, 42, 6, 16);
    const greenMan1Tex = new THREE.CanvasTexture(g1Canvas);

    // 3. 小綠人邁步 Pose 2 (Walking Green Man Pose 2)
    const g2Canvas = document.createElement('canvas');
    g2Canvas.width = 64; g2Canvas.height = 64;
    const g2Ctx = g2Canvas.getContext('2d');
    g2Ctx.fillStyle = '#111111'; g2Ctx.fillRect(0, 0, 64, 64);
    g2Ctx.fillStyle = '#00e676';
    // 頭
    g2Ctx.beginPath(); g2Ctx.arc(33, 16, 7, 0, Math.PI * 2); g2Ctx.fill();
    // 軀幹
    g2Ctx.fillRect(29, 24, 7, 16);
    // 反向擺臂
    g2Ctx.fillRect(20, 26, 7, 4); g2Ctx.fillRect(17, 30, 4, 10);
    g2Ctx.fillRect(36, 27, 8, 4);
    // 交叉雙腿
    g2Ctx.fillRect(32, 42, 6, 16);
    g2Ctx.fillRect(26, 42, 6, 16);
    const greenMan2Tex = new THREE.CanvasTexture(g2Canvas);

    return { redManTex, greenMan1Tex, greenMan2Tex };
  }
}

// ============================================================================
// 3. 幾何體建構與 UV 座標校正工具
// ============================================================================
export class GeometryBuilder {
  /**
   * 自動校正側邊外牆與屋頂 UV 貼圖，依據高度與水平跨度貼附，消除拉伸
   */
  static correctBuildingUVs(geometry, floorHeight = 3.5, unitWidth = 4.0) {
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = geometry.attributes.uv;
    if (!pos || !norm || !uv) return;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      if (Math.abs(ny) > 0.65) {
        // 屋頂水平頂面 (使用水泥防水層材質比例)
        uv.setXY(i, x / 16.0, z / 16.0);
      } else {
        // 側邊垂直外牆：根據法線主方向選擇投影軸向
        const horizontalCoord = Math.abs(nx) > Math.abs(nz) ? z : x;
        uv.setXY(i, horizontalCoord / unitWidth, y / floorHeight);
      }
    }
    uv.needsUpdate = true;
  }

  /**
   * 將單一閉合多邊形環拉伸為 3D 建築幾何體 (確保垂直立著沿 +Y 軸拉伸)
   */
  static extrudePolygon(ringPoints, height) {
    if (!ringPoints || ringPoints.length < 3) return null;

    // 計算多邊形質心
    let cx = 0, cz = 0;
    const n = ringPoints.length;
    for (let i = 0; i < n; i++) {
      cx += ringPoints[i].x;
      cz += ringPoints[i].z;
    }
    cx /= n;
    cz /= n;

    // 計算有向面積，確保逆時針 (CCW) 順序以保證頂點法線朝外
    let signedArea = 0;
    for (let i = 0; i < n; i++) {
      const p1 = ringPoints[i];
      const p2 = ringPoints[(i + 1) % n];
      signedArea += (p1.x - cx) * (-(p2.z - cz)) - (p2.x - cx) * (-(p1.z - cz));
    }
    const pts = signedArea < 0 ? [...ringPoints].reverse() : ringPoints;

    // 建立 Shape
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x - cx, -(pts[0].z - cz));
    for (let i = 1; i < n; i++) {
      shape.lineTo(pts[i].x - cx, -(pts[i].z - cz));
    }
    shape.closePath();

    // 拉伸幾何體 (深度沿著 Z 軸)
    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
      steps: 1
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 旋轉使拉伸高度完全沿著世界 Y 軸向上 (立著建好)
    geom.rotateX(-Math.PI / 2);
    // 平移回世界座標中心
    geom.translate(cx, 0, cz);

    // 計算頂點法線
    geom.computeVertexNormals();

    // 依據建築坐標分配 16 款台灣在地風格外牆材質，鄰近建築保證絕不重複！
    const nonIndexedGeom = geom.toNonIndexed();
    const styleIdx = 1 + TaiwanTextureFactory.getBuildingStyleIndex(cx, cz);
    const pos = nonIndexedGeom.attributes.position;
    const norm = nonIndexedGeom.attributes.normal;
    const uv = nonIndexedGeom.attributes.uv;
    const totalVerts = pos.count;

    nonIndexedGeom.clearGroups();
    let currentMat = null;
    let groupStart = 0;
    for (let i = 0; i < totalVerts; i += 3) {
      const ny = (norm.getY(i) + norm.getY(i + 1) + norm.getY(i + 2)) / 3;
      const isRoof = Math.abs(ny) > 0.65;
      const mat = isRoof ? 0 : styleIdx;
      if (mat !== currentMat) {
        if (currentMat !== null) {
          nonIndexedGeom.addGroup(groupStart, i - groupStart, currentMat);
        }
        currentMat = mat;
        groupStart = i;
      }
    }
    if (currentMat !== null) {
      nonIndexedGeom.addGroup(groupStart, totalVerts - groupStart, currentMat);
    }

    // 校正 UV：1F 商業門面與騎樓 (y <= 4.0)，2F~高樓向上延伸窗櫺、鐵花窗、冷氣機 (y > 4.0，絕不採樣 1F 店面橫招牌，徹底杜絕橫向條碼重複！)
    for (let i = 0; i < totalVerts; i++) {
      const ny = norm.getY(i);
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (Math.abs(ny) > 0.65) {
        uv.setXY(i, x / 16.0, z / 16.0);
      } else {
        const nx = norm.getX(i);
        const nz = norm.getZ(i);
        const hCoord = Math.abs(nx) > Math.abs(nz) ? z : x;
        if (y <= 4.0) {
          const u = (Math.abs(hCoord) / 8.0) % 1.0;
          const v = (y / 4.0) * 0.28;
          uv.setXY(i, u, v);
        } else {
          const u = (Math.abs(hCoord) / 6.0) % 1.0;
          const upperRatio = (y - 4.0) / Math.max(4.0, height - 4.0);
          const v = 0.35 + Math.min(0.60, upperRatio * 0.60);
          uv.setXY(i, u, v);
        }
      }
    }
    uv.needsUpdate = true;

    return { geometry: nonIndexedGeom, center: { x: cx, z: cz }, height };
  }

  /**
   * 生成真實台灣特色 3D 連棟透天街屋/騎樓商辦實體建模
   * (包含主樓體、1F店面橫式大招牌看版、側掛凸出立體燈箱招牌、騎樓支撐柱、頂樓白鐵水塔)
   */
  static createShophouseGeometry(center, faceAngle, width, depth, height) {
    const merge = BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries;

    // 依建築坐標分配 16 款台灣在地風格外牆材質，鄰近街屋保證絕不重複！
    const styleIdx = 1 + TaiwanTextureFactory.getBuildingStyleIndex(center.x, center.z);

    // 1. 建築本體 (透天店面/商辦住宅)
    const mainBox = new THREE.BoxGeometry(width, height, depth).toNonIndexed();
    mainBox.translate(0, height / 2, 0);

    // 2. 1F 騎樓店面橫式立體大看板 (向前凸出 0.5m，厚度 1.5m，位於 2.4m~3.9m 高度)
    const signH = 1.5;
    const signY = 3.15;
    const canopyBox = new THREE.BoxGeometry(width * 0.98, signH, 0.5).toNonIndexed();
    canopyBox.translate(0, signY, depth / 2 + 0.25);

    // 3. 台灣特色垂直側掛凸出立體燈箱招牌 (向道路外側懸掛 1.3m)
    const bladeBox = new THREE.BoxGeometry(0.25, 3.2, 1.3).toNonIndexed();
    bladeBox.translate(width * 0.44, 5.0, depth / 2 + 0.65);

    // 4. 騎樓前側承重方柱 (左右各一根，構成台灣標誌性騎樓柱)
    const pillarW = 0.55;
    const pillarH = 2.4;
    const p1 = new THREE.BoxGeometry(pillarW, pillarH, pillarW).toNonIndexed();
    p1.translate(-width / 2 + pillarW / 2 + 0.1, pillarH / 2, depth / 2 - pillarW / 2);

    const p2 = new THREE.BoxGeometry(pillarW, pillarH, pillarW).toNonIndexed();
    p2.translate(width / 2 - pillarW / 2 - 0.1, pillarH / 2, depth / 2 - pillarW / 2);

    // 5. 頂樓白鐵圓柱水塔 (台灣屋頂經典特徵)
    const tankCyl = new THREE.CylinderGeometry(1.1, 1.1, 2.2, 8).toNonIndexed();
    tankCyl.translate(width * 0.22, height + 1.1, -depth * 0.15);

    // ------------------------------------------------------------------------
    // 精準設定各部件的 UV 貼圖與材質分組 (在局部坐標系下，徹底消除橫向重複拉伸！)
    // ------------------------------------------------------------------------
    // A. 處理 mainBox 的 UV 與材質分組
    const pos = mainBox.attributes.position;
    const norm = mainBox.attributes.normal;
    const uv = mainBox.attributes.uv;
    const count = pos.count;

    mainBox.clearGroups();
    let currentMat = null;
    let groupStart = 0;

    for (let i = 0; i < count; i += 3) {
      const ny = (norm.getY(i) + norm.getY(i + 1) + norm.getY(i + 2)) / 3;
      const isRoof = Math.abs(ny) > 0.7;
      const mat = isRoof ? 0 : styleIdx;
      if (mat !== currentMat) {
        if (currentMat !== null) mainBox.addGroup(groupStart, i - groupStart, currentMat);
        currentMat = mat;
        groupStart = i;
      }
    }
    if (currentMat !== null) mainBox.addGroup(groupStart, count - groupStart, currentMat);

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      if (Math.abs(ny) > 0.7) {
        // 屋頂 / 地板 (Material 0)
        uv.setXY(i, x / 8.0, z / 8.0);
      } else if (nz > 0.7) {
        // ★ 正立面 (面向街道，Z=+depth/2)：U 嚴格從 0 到 1 完整展現一間店家，絕不重複且文字正常正向 (非鏡像)！
        const u = Math.max(0.001, Math.min(0.999, 1.0 - ((x / width) + 0.5)));
        let v;
        if (y <= 4.0) {
          v = (y / 4.0) * 0.28;
        } else {
          const upperRatio = (y - 4.0) / Math.max(4.0, height - 4.0);
          v = 0.30 + Math.min(0.68, upperRatio * 0.68);
        }
        uv.setXY(i, u, v);
      } else if (nz < -0.7) {
        // 背面：採樣上方住宅外牆磁磚與窗戶
        const u = (1.0 - ((x / width) + 0.5)) % 1.0;
        const v = 0.38 + (Math.min(1.0, y / height) * 0.55);
        uv.setXY(i, u, v);
      } else {
        // 側面 (隔壁鄰舍共用牆/側巷)：採樣上方外牆磁磚
        const u = ((z / depth) + 0.5) % 1.0;
        const v = 0.38 + (Math.min(1.0, y / height) * 0.55);
        uv.setXY(i, u, v);
      }
    }
    uv.needsUpdate = true;

    // B. 處理 canopyBox (1F 橫式凸出看板)
    const cPos = canopyBox.attributes.position;
    const cNorm = canopyBox.attributes.normal;
    const cUv = canopyBox.attributes.uv;
    canopyBox.clearGroups();
    canopyBox.addGroup(0, cPos.count, styleIdx);
    for (let i = 0; i < cPos.count; i++) {
      const x = cPos.getX(i);
      const y = cPos.getY(i);
      const nz = cNorm.getZ(i);
      if (nz > 0.7) {
        // 正面：精準對齊橫式招牌區間 (V: 0.14 ~ 0.26)，水平文字正向
        const u = Math.max(0.001, Math.min(0.999, 1.0 - ((x / width) + 0.5)));
        const v = 0.14 + ((y - (signY - signH / 2)) / signH) * 0.12;
        cUv.setXY(i, u, v);
      } else {
        cUv.setXY(i, 0.5, 0.22);
      }
    }
    cUv.needsUpdate = true;

    // C. 處理 bladeBox (側掛發光立體燈箱招牌)
    const bPos = bladeBox.attributes.position;
    const bNorm = bladeBox.attributes.normal;
    const bUv = bladeBox.attributes.uv;
    bladeBox.clearGroups();
    bladeBox.addGroup(0, bPos.count, styleIdx);
    for (let i = 0; i < bPos.count; i++) {
      const z = bPos.getZ(i);
      const y = bPos.getY(i);
      const nx = bNorm.getX(i);
      if (Math.abs(nx) > 0.7) {
        const u = Math.max(0.01, Math.min(0.09, ((z - (depth / 2)) / 1.3) * 0.08));
        const v = Math.max(0.3, Math.min(0.6, 0.3 + ((y - 3.4) / 3.2) * 0.3));
        bUv.setXY(i, u, v);
      } else {
        bUv.setXY(i, 0.05, 0.45);
      }
    }
    bUv.needsUpdate = true;

    // D. 處理柱子與水塔
    p1.clearGroups(); p1.addGroup(0, p1.attributes.position.count, styleIdx);
    p2.clearGroups(); p2.addGroup(0, p2.attributes.position.count, styleIdx);
    tankCyl.clearGroups(); tankCyl.addGroup(0, tankCyl.attributes.position.count, 0);

    // 合併全部幾何體
    const merged = merge.call(BufferGeometryUtils, [mainBox, canopyBox, bladeBox, p1, p2, tankCyl], true);
    if (!merged) return null;

    // 旋轉面向道路，並平移至世界座標
    merged.rotateY(faceAngle);
    merged.translate(center.x, 0, center.z);
    merged.computeVertexNormals();

    return merged;
  }

  /**
   * 依據 highway 類型取得道路真實寬度 (公尺)
   */
  static getRoadWidth(highwayType) {
    switch (highwayType) {
      case 'motorway':
      case 'trunk':
      case 'primary':
        return 14.0; // 主幹道 (例如台灣大道、建國路、雙十路)
      case 'secondary':
      case 'tertiary':
        return 9.5;  // 次要幹道 (例如自由路、三民路、民權路)
      case 'residential':
      case 'living_street':
      case 'service':
      default:
        return 6.5;  // 巷弄生活道路
      case 'footway':
      case 'pedestrian':
      case 'path':
        return 3.5;  // 步道
    }
  }

  /**
   * 計算折線各點的平行法向量與斜接比例 (Miter Join)，確保彎道平滑等寬且邊界完全平行
   */
  static computeParallelMiterOffsets(points) {
    const numPts = points.length;
    const offsets = [];

    for (let i = 0; i < numPts; i++) {
      const cur = points[i];
      if (i === 0) {
        const dx = points[1].x - cur.x;
        const dz = points[1].z - cur.z;
        const len = Math.hypot(dx, dz) || 1;
        offsets.push({ nx: -dz / len, nz: dx / len, miter: 1.0 });
      } else if (i === numPts - 1) {
        const dx = cur.x - points[i - 1].x;
        const dz = cur.z - points[i - 1].z;
        const len = Math.hypot(dx, dz) || 1;
        offsets.push({ nx: -dz / len, nz: dx / len, miter: 1.0 });
      } else {
        const prev = points[i - 1];
        const next = points[i + 1];
        const dx1 = cur.x - prev.x;
        const dz1 = cur.z - prev.z;
        const len1 = Math.hypot(dx1, dz1) || 1;
        const n1x = -dz1 / len1, n1z = dx1 / len1;

        const dx2 = next.x - cur.x;
        const dz2 = next.z - cur.z;
        const len2 = Math.hypot(dx2, dz2) || 1;
        const n2x = -dz2 / len2, n2z = dx2 / len2;

        let mx = n1x + n2x;
        let mz = n1z + n2z;
        const mLen = Math.hypot(mx, mz);
        if (mLen < 0.001) {
          offsets.push({ nx: n1x, nz: n1z, miter: 1.0 });
        } else {
          mx /= mLen;
          mz /= mLen;
          const dot = mx * n1x + mz * n1z;
          const miter = Math.min(1.4, Math.max(0.75, 1.0 / Math.max(0.2, dot)));
          offsets.push({ nx: mx, nz: mz, miter });
        }
      }
    }
    return offsets;
  }

  /**
   * 折線共線點幾何簡化 (去除直線上的微小冗餘節點，降低 70% 頂點與三角面)
   */
  static simplifyPolyline(points, tolerance = 0.4) {
    if (!points || points.length <= 2) return points || [];
    const result = [points[0]];
    let last = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const cur = points[i];
      const next = points[i + 1];
      const dx = next.x - last.x;
      const dz = next.z - last.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;
      const dist = Math.abs((cur.x - last.x) * dz - (cur.z - last.z) * dx) / Math.sqrt(lenSq);
      if (dist > tolerance) {
        result.push(cur);
        last = cur;
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  /**
   * 將 LineString 折線生成具備嚴格平行彎道 (Parallel Turn Offset) 與瀝青貼圖 UV 的 3D 道路網格
   */
  static createRoadMeshGeometry(points, width) {
    if (!points || points.length < 2) return null;
    const cleanPts = GeometryBuilder.simplifyPolyline(points, 0.4);
    if (!cleanPts || cleanPts.length < 2) return null;

    const numPts = cleanPts.length;
    const halfWidth = width / 2;
    const offsets = GeometryBuilder.computeParallelMiterOffsets(cleanPts);

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    let totalDist = 0;

    for (let i = 0; i < numPts; i++) {
      const cur = cleanPts[i];
      const off = offsets[i];
      const offX = off.nx * (halfWidth * off.miter);
      const offZ = off.nz * (halfWidth * off.miter);

      if (i > 0) {
        const pdx = cur.x - cleanPts[i - 1].x;
        const pdz = cur.z - cleanPts[i - 1].z;
        totalDist += Math.hypot(pdx, pdz);
      }

      const vCoord = totalDist / 8.0;

      // 左側頂點 (Y 設為 0.080m)
      positions.push(cur.x + offX, 0.08, cur.z + offZ);
      normals.push(0, 1, 0);
      uvs.push(0, vCoord);

      // 右側頂點
      positions.push(cur.x - offX, 0.08, cur.z - offZ);
      normals.push(0, 1, 0);
      uvs.push(1, vCoord);

      if (i < numPts - 1) {
        const idx = i * 2;
        indices.push(idx, idx + 1, idx + 2);
        indices.push(idx + 1, idx + 3, idx + 2);
      }
    }

    if (positions.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 生成道路兩側加高人行道 (嚴格平行平滑彎道、垂直路緣石與紅灰透水鋪面)
   */
  static createSidewalkMeshGeometry(points, roadWidth, sidewalkWidth = 2.4) {
    if (!points || points.length < 2) return null;
    const cleanPts = GeometryBuilder.simplifyPolyline(points, 0.4);
    if (!cleanPts || cleanPts.length < 2) return null;

    const numPts = cleanPts.length;
    const halfRoadW = roadWidth / 2;
    const roadY = 0.08;
    const sidewalkY = 0.22; // 台灣標準路緣石高度 14cm
    const offsets = GeometryBuilder.computeParallelMiterOffsets(cleanPts);

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    let totalDist = 0;

    for (let i = 0; i < numPts; i++) {
      const cur = cleanPts[i];
      const off = offsets[i];
      const m = off.miter;

      const curbX = off.nx * (halfRoadW * m);
      const curbZ = off.nz * (halfRoadW * m);
      const outerX = off.nx * ((halfRoadW + sidewalkWidth) * m);
      const outerZ = off.nz * ((halfRoadW + sidewalkWidth) * m);

      if (i > 0) {
        const pdx = cur.x - cleanPts[i - 1].x;
        const pdz = cur.z - cleanPts[i - 1].z;
        totalDist += Math.hypot(pdx, pdz);
      }

      const vCoord = totalDist / 3.6;
      const baseIdx = i * 6;

      // 0: 左路緣石底端
      positions.push(cur.x + curbX, roadY, cur.z + curbZ);
      normals.push(-off.nx, 0, -off.nz);
      uvs.push(0, vCoord);

      // 1: 左路緣石頂端
      positions.push(cur.x + curbX, sidewalkY, cur.z + curbZ);
      normals.push(0, 1, 0);
      uvs.push(0.08, vCoord);

      // 2: 左人行道外側
      positions.push(cur.x + outerX, sidewalkY, cur.z + outerZ);
      normals.push(0, 1, 0);
      uvs.push(1.0, vCoord);

      // 3: 右路緣石底端
      positions.push(cur.x - curbX, roadY, cur.z - curbZ);
      normals.push(off.nx, 0, off.nz);
      uvs.push(0, vCoord);

      // 4: 右路緣石頂端
      positions.push(cur.x - curbX, sidewalkY, cur.z - curbZ);
      normals.push(0, 1, 0);
      uvs.push(0.08, vCoord);

      // 5: 右人行道外側
      positions.push(cur.x - outerX, sidewalkY, cur.z - outerZ);
      normals.push(0, 1, 0);
      uvs.push(1.0, vCoord);

      if (i < numPts - 1) {
        const nextBase = (i + 1) * 6;
        // 左側垂直路緣立面 (0, 1, next0, next1)
        indices.push(baseIdx + 0, baseIdx + 1, nextBase + 0);
        indices.push(nextBase + 0, baseIdx + 1, nextBase + 1);

        // 左側水平人行鋪面 (1, 2, next1, next2)
        indices.push(baseIdx + 1, baseIdx + 2, nextBase + 1);
        indices.push(nextBase + 1, baseIdx + 2, nextBase + 2);

        // 右側垂直路緣立面 (3, next3, 4, next4)
        indices.push(baseIdx + 3, nextBase + 3, baseIdx + 4);
        indices.push(nextBase + 3, nextBase + 4, baseIdx + 4);

        // 右側水平人行鋪面 (4, next4, 5, next5)
        indices.push(baseIdx + 4, nextBase + 4, baseIdx + 5);
        indices.push(nextBase + 4, nextBase + 5, baseIdx + 5);
      }
    }

    if (positions.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 生成路口獨立四邊形網格 (高度 0.082m，略高於路面 2mm，徹底消除 Z-fighting)
   */
  static createIntersectionQuadGeometry(cx, cz, radius, angle = 0) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const R = radius;
    const Y = 0.082;

    const corners = [
      { lx: -R, lz: -R, u: 0, v: 0 },
      { lx: R, lz: -R, u: 1, v: 0 },
      { lx: R, lz: R, u: 1, v: 1 },
      { lx: -R, lz: R, u: 0, v: 1 }
    ];

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [0, 1, 2, 0, 2, 3];

    for (let i = 0; i < 4; i++) {
      const c = corners[i];
      const wx = cx + c.lx * cosA - c.lz * sinA;
      const wz = cz + c.lx * sinA + c.lz * cosA;
      positions.push(wx, Y, wz);
      normals.push(0, 1, 0);
      uvs.push(c.u, c.v);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }

  /**
   * 生成台灣高架高速公路與快速道路幾何體 (台74線環線、國道一號高架、中投高架)
   * 包含：
   * 1. 寬敞 4~6 線道高架瀝青鋪面 (高程 Y = 9.8m)
   * 2. 混凝土預力箱梁結構底座 (向內斜切 45 度排水箱梁)
   * 3. 兩側外緣混凝土紐澤西防撞護欄與防眩隔音板 (高程 9.8m -> 11.1m)
   * 4. 匝道平緩爬坡接合地面 (Y: 0.15m -> 9.8m)
   */
  static createElevatedHighwayGeometry(points, width = 16.5, isRamp = false) {
    if (!points || points.length < 2) return null;
    const cleanPts = GeometryBuilder.simplifyPolyline(points, 0.6);
    if (!cleanPts || cleanPts.length < 2) return null;

    const numPts = cleanPts.length;
    const halfWidth = width / 2;
    const offsets = GeometryBuilder.computeParallelMiterOffsets(cleanPts);

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // 計算沿線高程：主線為離地 9.8m 高架橋，匝道則平緩爬坡
    const elevations = [];
    let totalLen = 0;
    for (let i = 0; i < numPts - 1; i++) {
      totalLen += Math.hypot(cleanPts[i + 1].x - cleanPts[i].x, cleanPts[i + 1].z - cleanPts[i].z);
    }

    let accLen = 0;
    for (let i = 0; i < numPts; i++) {
      if (i > 0) {
        accLen += Math.hypot(cleanPts[i].x - cleanPts[i - 1].x, cleanPts[i].z - cleanPts[i - 1].z);
      }
      if (isRamp) {
        const ratio = totalLen > 0 ? accLen / totalLen : 0;
        elevations.push(0.15 + ratio * 9.65);
      } else {
        elevations.push(9.8);
      }
    }

    let totalDist = 0;
    for (let i = 0; i < numPts; i++) {
      const cur = cleanPts[i];
      const off = offsets[i];
      const yDeck = elevations[i];
      const yBarrier = yDeck + 1.25;
      const yGirder = Math.max(0.08, yDeck - 1.45);

      if (i > 0) {
        totalDist += Math.hypot(cur.x - cleanPts[i - 1].x, cur.z - cleanPts[i - 1].z);
      }
      const vCoord = totalDist / 14.0;

      const lx = off.nx * (halfWidth * off.miter);
      const lz = off.nz * (halfWidth * off.miter);
      const gx = off.nx * ((halfWidth - 1.2) * off.miter);
      const gz = off.nz * ((halfWidth - 1.2) * off.miter);

      const base = i * 6;
      // 0: 左橋面鋪面 (Deck Left)
      positions.push(cur.x + lx, yDeck, cur.z + lz);
      normals.push(0, 1, 0);
      uvs.push(0, vCoord);

      // 1: 右橋面鋪面 (Deck Right)
      positions.push(cur.x - lx, yDeck, cur.z - lz);
      normals.push(0, 1, 0);
      uvs.push(1, vCoord);

      // 2: 左護欄頂端 (Barrier Left)
      positions.push(cur.x + lx, yBarrier, cur.z + lz);
      normals.push(-off.nx, 0.3, -off.nz);
      uvs.push(0.05, vCoord);

      // 3: 右護欄頂端 (Barrier Right)
      positions.push(cur.x - lx, yBarrier, cur.z - lz);
      normals.push(off.nx, 0.3, off.nz);
      uvs.push(0.95, vCoord);

      // 4: 左箱梁底端 (Girder Left)
      positions.push(cur.x + gx, yGirder, cur.z + gz);
      normals.push(0, -1, 0);
      uvs.push(0.15, vCoord);

      // 5: 右箱梁底端 (Girder Right)
      positions.push(cur.x - gx, yGirder, cur.z - gz);
      normals.push(0, -1, 0);
      uvs.push(0.85, vCoord);

      if (i < numPts - 1) {
        // 主橋面鋪面 (0, 1)
        indices.push(base, base + 1, base + 6);
        indices.push(base + 1, base + 7, base + 6);

        // 左防撞護欄壁面 (0 -> 2)
        indices.push(base, base + 2, base + 6);
        indices.push(base + 2, base + 8, base + 6);

        // 右防撞護欄壁面 (1 -> 3)
        indices.push(base + 1, base + 7, base + 3);
        indices.push(base + 3, base + 7, base + 9);

        // 箱梁底面 (4, 5)
        indices.push(base + 4, base + 10, base + 5);
        indices.push(base + 5, base + 10, base + 11);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return { geom, elevations, cleanPts };
  }

  /**
   * 生成高架道路下方的立體混凝土雙柱橋墩 (通達地面 Y = 0)
   */
  static createHighwayPiers(cleanPts, elevations, interval = 36) {
    if (!cleanPts || cleanPts.length < 2) return null;
    const pierGeoms = [];
    const pillarProto = new THREE.CylinderGeometry(1.0, 1.15, 9.6, 12);
    const capProto = new THREE.BoxGeometry(15.0, 1.3, 2.8);
    capProto.translate(0, 4.6, 0);
    const combinedPier = BufferGeometryUtils.mergeGeometries([pillarProto, capProto]);

    let dist = 0;
    for (let i = 0; i < cleanPts.length - 1; i++) {
      const p1 = cleanPts[i];
      const p2 = cleanPts[i + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

      dist += segLen;
      if (dist >= interval && elevations[i] > 6.0) {
        dist = 0;
        const pier = combinedPier.clone();
        pier.rotateY(angle + Math.PI / 2);
        pier.translate(p1.x, elevations[i] / 2, p1.z);
        pierGeoms.push(pier);
      }
    }
    return pierGeoms.length > 0 ? BufferGeometryUtils.mergeGeometries(pierGeoms) : null;
  }

  /**
   * 沿著路段起點向後修剪，使路面與人行道乾淨停在路口外緣
   */
  static trimPolylineStart(points, jCenter, radius) {
    if (!points || points.length < 2) return null;
    const d0 = Math.hypot(points[0].x - jCenter.x, points[0].z - jCenter.z);
    if (d0 >= radius) return points;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const d1 = Math.hypot(p1.x - jCenter.x, p1.z - jCenter.z);
      const d2 = Math.hypot(p2.x - jCenter.x, p2.z - jCenter.z);
      if (d1 < radius && d2 >= radius) {
        const t = (radius - d1) / Math.max(0.001, d2 - d1);
        return [{ x: p1.x + (p2.x - p1.x) * t, z: p1.z + (p2.z - p1.z) * t }, ...points.slice(i + 1)];
      }
    }
    return null;
  }

  /**
   * 沿著路段終點向前修剪，使路面與人行道乾淨停在路口外緣
   */
  static trimPolylineEnd(points, jCenter, radius) {
    if (!points || points.length < 2) return null;
    const dLast = Math.hypot(points[points.length - 1].x - jCenter.x, points[points.length - 1].z - jCenter.z);
    if (dLast >= radius) return points;
    for (let i = points.length - 1; i > 0; i--) {
      const p1 = points[i];
      const p2 = points[i - 1];
      const d1 = Math.hypot(p1.x - jCenter.x, p1.z - jCenter.z);
      const d2 = Math.hypot(p2.x - jCenter.x, p2.z - jCenter.z);
      if (d1 < radius && d2 >= radius) {
        const t = (radius - d1) / Math.max(0.001, d2 - d1);
        return [...points.slice(0, i), { x: p1.x + (p2.x - p1.x) * t, z: p1.z + (p2.z - p1.z) * t }];
      }
    }
    return null;
  }
}

// ============================================================================
// 4. 車輛物理系統 (Vehicle Physics & Visuals)
// ============================================================================
class Vehicle {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.type = 'scooter'; // 'scooter' (勁戰 125) 或 'supercar' (經典超跑)
    this.speed = 0;
    this.gear = 1;
    this.health = 100;
    this.armor = 100;
    this.boost = 100;

    this.steerAngle = 0;
    this.currentYaw = -Math.PI / 2; // 面向西側 (台灣大道核心街區，兩側高樓林立)

    this.meshGroup = new THREE.Group();
    this.scene.add(this.meshGroup);

    this.body = null;
    this.initPhysics();
    this.buildModel();
  }

  initPhysics() {
    // 車體物理剛體 (底盤碰撞盒)
    const chassisShape = new CANNON.Box(new CANNON.Vec3(0.9, 0.45, 1.8));
    this.body = new CANNON.Body({
      mass: 450,
      shape: chassisShape,
      linearDamping: 0.2,
      angularDamping: 0.8
    });

    // 初始生成於台中台灣大道一段 (兩側店家建築林立，朝向台中市中心繁華街道)
    this.currentYaw = -Math.PI / 2;
    this.body.position.set(-160, 1.0, 8);
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.currentYaw);
    this.physicsWorld.addBody(this.body);

    // 監聽物理碰撞，觸發剛體撞擊與板金擠壓物理音效
    this.body.addEventListener('collide', (e) => {
      if (!e.contact) return;
      const impact = e.contact.getImpactVelocityAlongNormal();
      if (impact > 2.6) {
        soundManager.playCrash(Math.min(2.5, impact / 9));
      }
    });
  }

  buildModel() {
    while (this.meshGroup.children.length > 0) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }

    if (this.type === 'scooter') {
      // ★ 勁戰 125 台灣經典白牌運動速克達 (鷹眼車頭、可轉向龍頭把手、後照鏡、防燙蓋排氣管、珍奶飲料架、白牌車牌與台灣騎士)
      const paintMat = new THREE.MeshStandardMaterial({ color: 0x1b4965, roughness: 0.25, metalness: 0.45 });
      const matteMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.85, metalness: 0.1 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.2, metalness: 0.85 });
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const amberMat = new THREE.MeshBasicMaterial({ color: 0xff9800 });
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

      // 1. 車體下底盤與腳踏板
      const floorboard = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.65), matteMat);
      floorboard.position.set(0, 0.32, 0.1);
      this.meshGroup.add(floorboard);

      // 前置杯架與經典台灣珍珠奶茶
      const cupGeom = new THREE.CylinderGeometry(0.045, 0.038, 0.12, 10);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xfff0db, roughness: 0.4 });
      const bobaCup = new THREE.Mesh(cupGeom, cupMat);
      bobaCup.position.set(0.14, 0.46, 0.38);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14), new THREE.MeshBasicMaterial({ color: 0xe74c3c }));
      straw.position.set(0.14, 0.54, 0.38);
      straw.rotation.z = 0.2;
      this.meshGroup.add(bobaCup);
      this.meshGroup.add(straw);

      // 2. 空氣力學運動化車頭斜板 (Aerodynamic Front Cowl)
      const cowlGeom = new THREE.BoxGeometry(0.54, 0.58, 0.42);
      cowlGeom.translate(0, 0, 0);
      const cowl = new THREE.Mesh(cowlGeom, paintMat);
      cowl.position.set(0, 0.72, 0.68);
      cowl.rotation.x = -0.25;
      this.meshGroup.add(cowl);

      // 雙鷹眼 LED 大燈 (左/右分離大燈)
      [-0.15, 0.15].forEach((lx) => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), lightMat);
        eye.position.set(lx, 0.74, 0.88);
        eye.rotation.x = -0.25;
        this.meshGroup.add(eye);

        const sig = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.03), amberMat);
        sig.position.set(lx * 1.5, 0.68, 0.84);
        this.meshGroup.add(sig);
      });

      // 3. 轉向龍頭把手、數位儀表與雙後照鏡 (Handlebar & Mirrors)
      this.handlebarGroup = new THREE.Group();
      this.handlebarGroup.position.set(0, 1.08, 0.55);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35), chromeMat);
      this.handlebarGroup.add(stem);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.04), matteMat);
      bar.position.set(0, 0.15, 0);
      this.handlebarGroup.add(bar);

      // 橡膠把手握把
      [-0.32, 0.32].forEach((gx) => {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.12), matteMat);
        grip.rotation.z = Math.PI / 2;
        grip.position.set(gx, 0.15, 0);
        this.handlebarGroup.add(grip);

        // 照後鏡支架與鏡面 (Rear-view Mirrors)
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18), chromeMat);
        stalk.position.set(gx * 0.9, 0.24, 0.04);
        stalk.rotation.z = gx > 0 ? -0.35 : 0.35;
        this.handlebarGroup.add(stalk);

        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.02), matteMat);
        mirror.position.set(gx * 1.15, 0.32, 0.05);
        this.handlebarGroup.add(mirror);
      });

      // 數位液晶儀表板
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      dash.position.set(0, 0.16, -0.04);
      dash.rotation.x = -0.6;
      this.handlebarGroup.add(dash);
      this.meshGroup.add(this.handlebarGroup);

      // 4. 車尾側蓋與雙色防滑座墊 (Stepped Two-Tone Seat)
      const tailBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.95), paintMat);
      tailBody.position.set(0, 0.65, -0.28);
      this.meshGroup.add(tailBody);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.88), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }));
      seat.position.set(0, 0.88, -0.26);
      this.meshGroup.add(seat);

      // 運動化分離式後扶手尾翼
      const grabRail = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.28), chromeMat);
      grabRail.position.set(0, 0.92, -0.72);
      this.meshGroup.add(grabRail);

      // 尾燈與方向燈
      const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.04), tailMat);
      tailLight.position.set(0, 0.72, -0.76);
      this.meshGroup.add(tailLight);

      // 台灣白牌專用車牌 (ABC-8888)
      const plateGeom = new THREE.BoxGeometry(0.22, 0.12, 0.015);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const plate = new THREE.Mesh(plateGeom, plateMat);
      plate.position.set(0, 0.52, -0.84);
      plate.rotation.x = -0.2;
      this.meshGroup.add(plate);

      // 5. 機械排氣管 (經典右側運動防燙蓋排氣管)
      const pipeGeom = new THREE.CylinderGeometry(0.05, 0.06, 0.68, 12);
      pipeGeom.rotateX(Math.PI / 2);
      const muffler = new THREE.Mesh(pipeGeom, matteMat);
      muffler.position.set(0.26, 0.32, -0.52);
      muffler.rotation.y = -0.15;
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.48), chromeMat);
      shield.position.set(0.29, 0.34, -0.52);
      this.meshGroup.add(muffler);
      this.meshGroup.add(shield);

      // 6. 前後 12 吋運動鋁圈與碟煞卡鉗 (Wheels & Disc Brakes)
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.9 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4, metalness: 0.7 });
      const discMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.2, metalness: 0.9 });

      const buildScooterWheel = (isFront) => {
        const wg = new THREE.Group();
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.15, 18), tireMat);
        tire.rotation.z = Math.PI / 2;
        wg.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 12), rimMat);
        rim.rotation.z = Math.PI / 2;
        wg.add(rim);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.17, 12), discMat);
        disc.rotation.z = Math.PI / 2;
        wg.add(disc);
        return wg;
      };

      const fWheel = buildScooterWheel(true);
      fWheel.position.set(0, 0.28, 0.78);
      this.meshGroup.add(fWheel);

      const rWheel = buildScooterWheel(false);
      rWheel.position.set(0, 0.28, -0.65);
      this.meshGroup.add(rWheel);

      // 7. ★ 經典台灣騎士 (Taiwanese Rider on Scooter)
      const riderGroup = new THREE.Group();
      riderGroup.position.set(0, 0, 0);

      // 安全帽 (3/4 罩安全帽 + 掀蓋透明風鏡)
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 }));
      helmet.position.set(0, 1.76, -0.05);
      riderGroup.add(helmet);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 }));
      visor.position.set(0, 1.74, 0.08);
      riderGroup.add(visor);

      // 上半身連帽外套/防風夾克
      const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.24), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 }));
      jacket.position.set(0, 1.38, -0.06);
      jacket.rotation.x = 0.15;
      riderGroup.add(jacket);

      // 雙手握緊龍頭把手
      [-0.18, 0.18].forEach((ax) => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.7 }));
        arm.position.set(ax, 1.34, 0.16);
        arm.rotation.x = -0.85;
        arm.rotation.z = ax > 0 ? -0.2 : 0.2;
        riderGroup.add(arm);
      });

      // 腿部與踩在腳踏板之雙腳
      [-0.14, 0.14].forEach((lx) => {
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.14), new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.8 }));
        thigh.position.set(lx, 0.88, 0.05);
        thigh.rotation.x = 0.85;
        riderGroup.add(thigh);

        const shin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.1), new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.8 }));
        shin.position.set(lx, 0.58, 0.22);
        riderGroup.add(shin);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.18), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
        shoe.position.set(lx, 0.4, 0.24);
        riderGroup.add(shoe);
      });

      this.meshGroup.add(riderGroup);
    } else if (this.type === 'taxi') {
      // ★ 臺中經典小黃計程車 (Toyota Altis/Wish 造型 + 車頂 TAXI 燈箱 + 門側方格拉條 + 營業車牌)
      const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.25, metalness: 0.35 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2634, roughness: 0.1, metalness: 0.8 });
      const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.2, metalness: 0.9 });

      // 車身底盤
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.5, 3.8), yellowPaint);
      chassis.position.y = 0.38;
      this.meshGroup.add(chassis);

      // 車頂座艙與車窗
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 2.0), glassMat);
      cabin.position.set(0, 0.82, -0.15);
      this.meshGroup.add(cabin);

      // 車側黑白相間計程車棋盤格條紋
      const stripeCanvas = document.createElement('canvas');
      stripeCanvas.width = 256; stripeCanvas.height = 32;
      const sCtx = stripeCanvas.getContext('2d');
      sCtx.fillStyle = '#fbc02d'; sCtx.fillRect(0, 0, 256, 32);
      for (let x = 0; x < 256; x += 16) {
        sCtx.fillStyle = (x / 16) % 2 === 0 ? '#111111' : '#ffffff';
        sCtx.fillRect(x, 8, 16, 16);
      }
      const stripeTex = new THREE.CanvasTexture(stripeCanvas);
      const stripeMat = new THREE.MeshBasicMaterial({ map: stripeTex });

      [-0.9, 0.9].forEach((dx) => {
        const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 2.2), stripeMat);
        sideStripe.position.set(dx, 0.52, -0.1);
        this.meshGroup.add(sideStripe);

        // 後視鏡
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.16), yellowPaint);
        mirror.position.set(dx * 0.96, 0.78, 0.75);
        this.meshGroup.add(mirror);
      });

      // 車頂發光 TAXI 燈箱 (TAXI · 個人 · 臺中)
      const taxiSignCanvas = document.createElement('canvas');
      taxiSignCanvas.width = 256; taxiSignCanvas.height = 96;
      const tCtx = taxiSignCanvas.getContext('2d');
      tCtx.fillStyle = '#ffffff'; tCtx.fillRect(0, 0, 256, 96);
      tCtx.fillStyle = '#d32f2f'; tCtx.font = 'bold 36px sans-serif';
      tCtx.textAlign = 'center'; tCtx.fillText('TAXI', 128, 44);
      tCtx.fillStyle = '#1976d2'; tCtx.font = 'bold 20px "Noto Sans TC", sans-serif';
      tCtx.fillText('個人 · 臺中', 128, 80);
      const signTex = new THREE.CanvasTexture(taxiSignCanvas);

      const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.26), new THREE.MeshBasicMaterial({ map: signTex }));
      taxiSign.position.set(0, 1.15, -0.15);
      this.meshGroup.add(taxiSign);

      // 車頭水箱護罩鍍鉻飾條與大燈
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.04), chromeMat);
      grille.position.set(0, 0.42, 1.91);
      this.meshGroup.add(grille);

      [-0.65, 0.65].forEach((hx) => {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        head.position.set(hx, 0.45, 1.91);
        this.meshGroup.add(head);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.04), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
        tail.position.set(hx, 0.52, -1.91);
        this.meshGroup.add(tail);
      });

      // 紅色營業車牌 (TDC-1688)
      const redPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: 0xc0392b }));
      redPlate.position.set(0, 0.28, 1.92);
      this.meshGroup.add(redPlate);

      // 4 個輪胎與鋁圈
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const wheelGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16);
      wheelGeom.rotateZ(Math.PI / 2);
      [-0.92, 0.92].forEach((wx) => {
        [1.15, -1.15].forEach((wz) => {
          const wMesh = new THREE.Mesh(wheelGeom, wheelMat);
          wMesh.position.set(wx, 0.36, wz);
          this.meshGroup.add(wMesh);
        });
      });
    } else if (this.type === 'police') {
      // ★ 臺中市政府警察局 巡邏警車 (黑白經典巡邏車塗裝 + 車頂紅藍 LED 爆閃警燈條 + 警徽)
      const whitePaint = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
      const navyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.52, 3.8), whitePaint);
      chassis.position.y = 0.38;
      this.meshGroup.add(chassis);

      // 前後車門深黑藍色警用區塊
      [-0.91, 0.91].forEach((dx) => {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.36, 1.8), navyMat);
        door.position.set(dx, 0.44, 0);
        this.meshGroup.add(door);
      });

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.5, 2.0), glassMat);
      cabin.position.set(0, 0.82, -0.15);
      this.meshGroup.add(cabin);

      // 車頂警燈與中央警報蜂鳴器
      const lightBarBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.22), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      lightBarBase.position.set(0, 1.12, -0.15);
      this.meshGroup.add(lightBarBase);

      const redStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0xff1744 }));
      redStrobe.position.set(-0.3, 1.2, -0.15);
      this.meshGroup.add(redStrobe);

      const blueStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.2), new THREE.MeshBasicMaterial({ color: 0x0066ff }));
      blueStrobe.position.set(0.3, 1.2, -0.15);
      this.meshGroup.add(blueStrobe);

      const sirenSpeaker = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), new THREE.MeshStandardMaterial({ color: 0xdcdde1 }));
      sirenSpeaker.position.set(0, 1.2, -0.15);
      this.meshGroup.add(sirenSpeaker);

      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
      const wheelGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16);
      wheelGeom.rotateZ(Math.PI / 2);
      [-0.92, 0.92].forEach((wx) => {
        [1.15, -1.15].forEach((wz) => {
          const wMesh = new THREE.Mesh(wheelGeom, wheelMat);
          wMesh.position.set(wx, 0.36, wz);
          this.meshGroup.add(wMesh);
        });
      });
    } else {
      // 狂飆經典紅黑超跑
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x850000, roughness: 0.2, metalness: 0.7 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 3.6), bodyMat);
      chassis.position.y = 0.35;
      this.meshGroup.add(chassis);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.8), glassMat);
      cabin.position.set(0, 0.75, -0.2);
      this.meshGroup.add(cabin);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 });
      const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 16);
      wheelGeom.rotateZ(Math.PI / 2);
      [-0.88, 0.88].forEach((wx) => {
        [1.1, -1.1].forEach((wz) => {
          const wMesh = new THREE.Mesh(wheelGeom, wheelMat);
          wMesh.position.set(wx, 0.35, wz);
          this.meshGroup.add(wMesh);
        });
      });
    }

    this.meshGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  toggleVehicleType() {
    const types = ['scooter', 'supercar', 'police', 'taxi'];
    const curIdx = types.indexOf(this.type);
    this.type = types[(curIdx + 1) % types.length];
    this.buildModel();
    soundManager.playVehicleSwitch();

    const badgeName = document.getElementById('hud-veh-name');
    const badgeIcon = document.querySelector('.veh-icon');
    const titles = {
      scooter: '勁戰 125 經典機車',
      supercar: '臺中狂飆 競技超跑',
      police: '臺中市警察局 巡邏警車',
      taxi: '臺中經典小黃 計程車'
    };
    const icons = {
      scooter: '🛵',
      supercar: '🏎️',
      police: '🚔',
      taxi: '🚕'
    };
    if (badgeName) badgeName.textContent = titles[this.type];
    if (badgeIcon) badgeIcon.textContent = icons[this.type];
  }

  update(inputs, dt) {
    if (!this.body) return;

    let maxSpeed = 95;
    let accelRate = 30;
    if (this.type === 'supercar') {
      maxSpeed = 160;
      accelRate = 48;
    } else if (this.type === 'police') {
      maxSpeed = 135;
      accelRate = 40;
    } else if (this.type === 'taxi') {
      maxSpeed = 115;
      accelRate = 34;
    }

    const steerSpeed = 4.0;
    const maxSteer = 0.55;

    // 氮氣加速 (Nitro Boost)
    if (inputs.boost && this.boost > 5) {
      maxSpeed *= 1.35;
      accelRate *= 1.8;
      this.boost = Math.max(0, this.boost - dt * 25);
    } else {
      this.boost = Math.min(100, this.boost + dt * 8);
    }
    const nosBar = document.getElementById('nos-bar');
    if (nosBar) nosBar.style.width = `${this.boost}%`;


    // 1. 平滑轉向角度控制
    if (inputs.left) {
      this.steerAngle = Math.max(-maxSteer, this.steerAngle - steerSpeed * dt);
    } else if (inputs.right) {
      this.steerAngle = Math.min(maxSteer, this.steerAngle + steerSpeed * dt);
    } else {
      this.steerAngle *= 0.82; // 快速自動回正
    }

    // 2. 獲取車頭前進方向向量與右側橫向向量
    const forwardX = Math.sin(this.currentYaw);
    const forwardZ = Math.cos(this.currentYaw);
    const rightX = Math.cos(this.currentYaw);
    const rightZ = -Math.sin(this.currentYaw);

    // 3. 分解當前車速向量 (km/h)
    const vel = this.body.velocity;
    const currentFwdSpeed = (vel.x * forwardX + vel.z * forwardZ) * 3.6;
    const currentSideSpeed = (vel.x * rightX + vel.z * rightZ) * 3.6;

    // 4. 油門驅動與減速倒車
    let targetFwdSpeed = currentFwdSpeed;
    if (inputs.forward) {
      targetFwdSpeed = Math.min(maxSpeed, currentFwdSpeed + accelRate * dt * 3.6);
    } else if (inputs.backward) {
      targetFwdSpeed = Math.max(-32, currentFwdSpeed - accelRate * 0.75 * dt * 3.6);
    } else {
      targetFwdSpeed *= 0.985; // 自然路面滑行阻力
    }

    // 5. 煞車制動
    if (inputs.brake) {
      targetFwdSpeed *= 0.91;
    }

    // 6. 輪胎橡膠抓地力模擬 (強效消除側滑，保留過彎流暢手感)
    const newFwdVel = targetFwdSpeed / 3.6;
    const newSideVel = (currentSideSpeed * 0.12) / 3.6;

    this.body.velocity.x = forwardX * newFwdVel + rightX * newSideVel;
    this.body.velocity.z = forwardZ * newFwdVel + rightZ * newSideVel;
    // 限制 Y 軸速度，確保貼地行駛不隨意飛起
    this.body.velocity.y = Math.min(0.2, this.body.velocity.y);

    // 7. 阿克曼運動轉向動力學 (當車輛具有前進/後退速度時自然偏轉，杜絕原地陀螺自旋)
    const speedRatio = Math.min(1.0, Math.abs(currentFwdSpeed) / 10.0);
    const turnSign = currentFwdSpeed >= -1 ? 1 : -1;
    const yawRate = -this.steerAngle * speedRatio * turnSign * 2.6;
    this.currentYaw += yawRate * dt;

    // 8. 剛體朝向更新與防翻覆完全水平鎖定
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.currentYaw);
    this.body.angularVelocity.set(0, 0, 0); // 鎖定角速度，保證不翻車

    // 保持最低離地高度
    if (this.body.position.y < 0.45) {
      this.body.position.y = 0.45;
    }

    // 9. 時速與檔位更新
    this.speed = Math.round(Math.abs(targetFwdSpeed));
    if (this.speed < 20) this.gear = 1;
    else if (this.speed < 45) this.gear = 2;
    else if (this.speed < 75) this.gear = 3;
    else if (this.speed < 110) this.gear = 4;
    else this.gear = 5;

    // 10. 同步 Three.js 視覺模型
    this.meshGroup.position.copy(this.body.position);
    this.meshGroup.quaternion.copy(this.body.quaternion);

    // 機車壓車過彎傾角視覺反饋
    if (this.type === 'scooter') {
      const leanAngle = -this.steerAngle * speedRatio * 0.32;
      this.meshGroup.rotateZ(leanAngle);
    }

    // 11. 擬真 Web Audio 引擎動態聲浪、氮氣與輪胎抓地力音效
    const isAccelerating = !!(inputs.forward || inputs.backward);
    const isBoosting = !!(inputs.boost && this.boost > 5);
    const isDrifting = (inputs.brake && this.speed > 14) || (Math.abs(currentSideSpeed) > 11 && this.speed > 22);

    soundManager.updateEngine(this.type, this.speed, isAccelerating, !!inputs.brake, isBoosting, dt);
    soundManager.setBoost(isBoosting);
    soundManager.setDrift(isDrifting, Math.min(1.5, Math.abs(currentSideSpeed) / 12 + (inputs.brake ? 0.7 : 0)));
  }

  resetPosition() {
    this.currentYaw = -Math.PI / 2;
    this.body.position.set(-160, 1.0, 8);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.currentYaw);
    this.speed = 0;
    this.steerAngle = 0;
    soundManager.playResetFlip();
  }
}

// ============================================================================
// 5. Google Maps 經典導航地圖系統 (GoogleMapSystem)
// 包含市區真實路網、捷運綠線 G00~G18、台鐵高架、六大地標與即時 GPS 導航
// ============================================================================
class GoogleMapSystem {
  constructor(app) {
    this.app = app;
    this.modal = document.getElementById('full-map-modal');
    this.canvas = document.getElementById('big-map-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.isOpen = false;
    this.zoom = 1.15;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    this.selectedPlace = null;
    this.currentFilter = 'all';

    this.initEvents();
  }

  initEvents() {
    if (!this.canvas) return;

    // 視窗大小改變
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.resize();
        this.render();
      }
    });

    // 關閉按鈕
    document.getElementById('btn-close-map')?.addEventListener('click', () => {
      this.close();
    });

    // 搜尋功能
    const searchInput = document.getElementById('gmaps-search-input');
    const searchBtn = document.getElementById('gmaps-search-btn');
    const handleSearch = () => {
      const q = (searchInput?.value || '').trim().toLowerCase();
      if (!q) return;

      // 優先搜尋真實地標
      const lmHit = LANDMARK_CONFIGS.find((p) => p.name && p.name.toLowerCase().includes(q));
      if (lmHit) {
        this.openPlaceCard(lmHit);
        this.panX = -lmHit.x;
        this.panY = -lmHit.z;
        this.zoom = 1.6;
        this.render();
        return;
      }

      // 搜尋真實道路名稱 (由 OSM 圖資提供)
      const roadHit = this.app.roadSegments.find((r) => r.name && r.name.toLowerCase().includes(q));
      if (roadHit && roadHit.points.length > 0) {
        const mid = roadHit.points[Math.floor(roadHit.points.length / 2)];
        this.panX = -mid.x;
        this.panY = -mid.z;
        this.zoom = 1.8;
        this.setGPS(mid.x, mid.z, roadHit.name);
        this.render();
        return;
      }

      this.app.showToast(`🔍 找不到「${q}」，請搜尋台中地標或路名 (如：台中車站、台灣大道、自由路)`);
    };

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch();
    });
    searchBtn?.addEventListener('click', handleSearch);

    // 分類 Chips
    document.querySelectorAll('.gmaps-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.gmaps-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter || 'all';
        this.render();
      });
    });

    // 縮放與定位按鈕
    document.getElementById('map-zoom-in')?.addEventListener('click', () => {
      this.zoom = Math.min(3.5, this.zoom * 1.3);
      this.render();
    });
    document.getElementById('map-zoom-out')?.addEventListener('click', () => {
      this.zoom = Math.max(0.35, this.zoom * 0.77);
      this.render();
    });
    document.getElementById('map-center-player')?.addEventListener('click', () => {
      if (this.app.vehicle?.body) {
        this.panX = -this.app.vehicle.body.position.x;
        this.panY = -this.app.vehicle.body.position.z;
        this.zoom = 1.3;
        this.render();
      }
    });
    document.getElementById('map-reset-view')?.addEventListener('click', () => {
      this.panX = 0;
      this.panY = 0;
      this.zoom = 0.85;
      this.render();
    });

    // 地點卡片關閉與導航
    document.getElementById('btn-close-place-card')?.addEventListener('click', () => {
      document.getElementById('gmaps-place-card')?.classList.add('hidden');
      this.selectedPlace = null;
      this.render();
    });

    document.getElementById('place-nav-btn')?.addEventListener('click', () => {
      if (this.selectedPlace) {
        this.setGPS(this.selectedPlace.x, this.selectedPlace.z, this.selectedPlace.name);
      }
    });

    document.getElementById('gmaps-route-btn')?.addEventListener('click', () => {
      if (this.selectedPlace) {
        this.setGPS(this.selectedPlace.x, this.selectedPlace.z, this.selectedPlace.name);
      } else {
        this.setGPS(-5.0, 125.5, '臺中火車站 & 站前廣場');
      }
    });

    document.getElementById('btn-clear-gps')?.addEventListener('click', () => {
      this.clearGPS();
    });

    // 地圖拖曳平移
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.isOpen) return;
      const dx = (e.clientX - this.dragStartX) / (this.zoom * 0.8);
      const dy = (e.clientY - this.dragStartY) / (this.zoom * 0.8);
      this.panX += dx;
      this.panY += dy;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // 滾輪縮放
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        this.zoom = Math.min(3.5, Math.max(0.35, this.zoom * factor));
        this.render();
      },
      { passive: false }
    );

    // 點擊地圖選擇地點
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      const scale = 0.8 * this.zoom;

      const wx = (clickX - cx) / scale - this.panX;
      const wz = (clickY - cy) / scale - this.panY;

      // 檢查命中真實地標
      let hit = null;
      for (const p of LANDMARK_CONFIGS) {
        if (Math.hypot(p.x - wx, p.z - wz) < 26 / scale) {
          hit = p;
          break;
        }
      }

      if (hit) {
        this.openPlaceCard(hit);
        this.render();
      } else {
        this.setGPS(wx, wz, `自訂導航位置 (${Math.round(wx)}, ${Math.round(wz)})`);
      }
    });
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  open() {
    this.isOpen = true;
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }
    soundManager.playMapToggle(true);
    // 預設將地圖中心對齊玩家目前位置
    if (this.app.vehicle?.body) {
      this.panX = -this.app.vehicle.body.position.x;
      this.panY = -this.app.vehicle.body.position.z;
    }
    this.resize();
    this.render();
  }

  close() {
    this.isOpen = false;
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
    soundManager.playMapToggle(false);
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  openPlaceCard(place) {
    this.selectedPlace = place;
    const card = document.getElementById('gmaps-place-card');
    if (!card) return;

    const badgeEl = document.getElementById('place-badge');
    const titleEl = document.getElementById('place-title');
    const addrEl = document.getElementById('place-address');

    if (badgeEl) badgeEl.textContent = place.code ? `捷運 ${place.code} · 車站` : place.badge || '經典真實地標';
    if (titleEl) titleEl.textContent = place.code ? `${place.name} (${place.code})` : place.name;
    if (addrEl) addrEl.textContent = place.address || '台中市區核心街道';

    card.classList.remove('hidden');
  }

  setGPS(x, z, name) {
    this.app.gpsTarget = { x, z, name };
    const hint = document.getElementById('gps-target-hint');
    const nameEl = document.getElementById('gps-target-name');
    const pinEl = document.getElementById('minimap-gps-pin');

    if (hint) hint.classList.remove('hidden');
    if (nameEl) nameEl.textContent = name;
    if (pinEl) pinEl.classList.remove('hidden');

    soundManager.playGPSRoute();
    this.app.showToast(`🚩 GPS 導航已鎖定：${name}`);
    if (this.isOpen) this.render();
  }

  clearGPS() {
    this.app.gpsTarget = null;
    const hint = document.getElementById('gps-target-hint');
    const pinEl = document.getElementById('minimap-gps-pin');
    if (hint) hint.classList.add('hidden');
    if (pinEl) pinEl.classList.add('hidden');
    soundManager.playUIClick();
    this.app.showToast('已清除 GPS 導航');
    if (this.isOpen) this.render();
  }

  // ★★★ 嚴格依照真實 OpenStreetMap 圖資渲染導航地圖 (徹底告別任何假圖層干擾) ★★★
  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.8 * this.zoom;

    // 1. Google Maps 經典乾淨底色 (#f1f3f4)
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(this.panX, this.panY);

    const roadsToDraw = this.app.roadSegments && this.app.roadSegments.length > 0 ? this.app.roadSegments : [];

    // 2. 繪製 OSM 真實道路底層邊框 (Casing)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    roadsToDraw.forEach((rd) => {
      const isMajor = rd.name.includes('大道') || rd.name.includes('路') || rd.width >= 10;
      const isTaiwanBlvd = rd.name.includes('臺灣大道') || rd.name.includes('台灣大道');

      ctx.strokeStyle = isTaiwanBlvd ? '#ea8600' : (isMajor ? '#c5c9d0' : '#dadce0');
      ctx.lineWidth = Math.max(5, (rd.width || 8) * 1.1);
      ctx.beginPath();
      const pts = rd.points;
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].z);
        else ctx.lineTo(pts[i].x, pts[i].z);
      }
      ctx.stroke();
    });

    // 3. 繪製 OSM 真實道路中心面 (Google Maps 金黃主幹道與白面街道)
    roadsToDraw.forEach((rd) => {
      const isTaiwanBlvd = rd.name.includes('臺灣大道') || rd.name.includes('台灣大道');
      const isMajor = rd.name.includes('大道') || rd.width >= 12;

      ctx.strokeStyle = isTaiwanBlvd ? '#fbbc04' : (isMajor ? '#fefefe' : '#ffffff');
      ctx.lineWidth = Math.max(3.5, (rd.width || 8) * 0.75);
      ctx.beginPath();
      const pts = rd.points;
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].z);
        else ctx.lineTo(pts[i].x, pts[i].z);
      }
      ctx.stroke();
    });

    // 4. 繪製 OSM 真實路名標註
    ctx.fillStyle = '#2d3436';
    const labeledNames = new Set();
    roadsToDraw.forEach((rd) => {
      if (!rd.name || rd.name === '市區道路' || labeledNames.has(rd.name) || rd.points.length < 2) return;
      labeledNames.add(rd.name);

      const pts = rd.points;
      const mid = pts[Math.floor(pts.length / 2)];
      const isMajor = rd.name.includes('大道') || rd.name.includes('路');

      ctx.font = isMajor ? 'bold 12px "Noto Sans TC", sans-serif' : '10px "Noto Sans TC", sans-serif';
      ctx.fillText(rd.name, mid.x + 3, mid.z - 3);
    });

    // 5. 繪製經典真實 3D 地標金黃星座標記
    LANDMARK_CONFIGS.forEach((lm) => {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(lm.x, lm.z, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(lm.x, lm.z, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d35400';
      ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
      ctx.fillText(`🏛️ ${lm.name}`, lm.x + 12, lm.z + 4);
    });

    // 6. 選中地點聚焦點
    if (this.selectedPlace) {
      const sp = this.selectedPlace;
      ctx.fillStyle = 'rgba(26, 115, 232, 0.25)';
      ctx.beginPath();
      ctx.arc(sp.x, sp.z, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sp.x, sp.z, 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. GPS 導航路線 (Google Maps 藍色路徑)
    if (this.app.gpsTarget && this.app.vehicle?.body) {
      const px = this.app.vehicle.body.position.x;
      const pz = this.app.vehicle.body.position.z;
      const tx = this.app.gpsTarget.x;
      const tz = this.app.gpsTarget.z;

      ctx.strokeStyle = 'rgba(26, 115, 232, 0.35)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(tx, tz);
      ctx.stroke();

      ctx.strokeStyle = '#1a73e8';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(px, pz);
      ctx.lineTo(tx, tz);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ea4335';
      ctx.beginPath();
      ctx.arc(tx, tz, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d93025';
      ctx.font = 'bold 13px "Noto Sans TC", sans-serif';
      ctx.fillText(`🚩 ${this.app.gpsTarget.name}`, tx + 12, tz + 4);
    }

    // 8. 玩家位置 (Google Maps 藍色圓點 + 視角光錐)
    if (this.app.vehicle?.body) {
      const px = this.app.vehicle.body.position.x;
      const pz = this.app.vehicle.body.position.z;
      const heading = this.app.vehicle.meshGroup.rotation.y;

      ctx.save();
      ctx.translate(px, pz);
      ctx.rotate(-heading);

      const fovGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 50);
      fovGrad.addColorStop(0, 'rgba(66, 133, 244, 0.5)');
      fovGrad.addColorStop(1, 'rgba(66, 133, 244, 0)');
      ctx.fillStyle = fovGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 50, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4285f4';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}


// ============================================================================
// 6. 街道公共設施系統 (StreetPropsSystem) - 路燈與紅綠燈 (InstancedMesh 60 FPS)
// ============================================================================
class StreetPropsSystem {
  constructor(scene, roadSegments, junctions = []) {
    this.scene = scene;
    this.roadSegments = roadSegments;
    // 依距離市中心 (0, 0) 排序路口，確保市中心與玩家出生地周遭優先完整覆蓋紅綠燈
    this.junctions = (junctions && junctions.length > 0)
      ? [...junctions].sort((a, b) => (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z))
      : [];
    this.signalTimer = 0;
    this.streetlightsMesh = null;
    this.lanternsMesh = null;
    this.treesMesh = null;
    this.trafficSignalsPoleMesh = null;
    this.streetSignMesh = null;
    this.redMesh = null;
    this.yellowMesh = null;
    this.greenMesh = null;
    this.lightPositions = [];
    this.buildProps();
  }

  buildProps() {
    // ----------------------------------------------------
    // A. 台灣標準市區路燈 (鋼構燈桿 + 外伸燈臂 + 暖白發光燈頭)
    // ----------------------------------------------------
    const poleGeom = new THREE.CylinderGeometry(0.08, 0.12, 6.2, 8);
    poleGeom.translate(0, 3.1, 0);
    const armGeom = new THREE.BoxGeometry(0.1, 0.1, 2.2);
    armGeom.translate(0, 6.1, 1.0);
    const headGeom = new THREE.BoxGeometry(0.3, 0.14, 0.6);
    headGeom.translate(0, 6.05, 2.0);
    const combinedPole = BufferGeometryUtils.mergeGeometries([poleGeom, armGeom, headGeom]);

    const lanternGeom = new THREE.BoxGeometry(0.26, 0.06, 0.52);
    lanternGeom.translate(0, 5.96, 2.0);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d4b5c, metalness: 0.65, roughness: 0.35 });
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfff6cf });

    const matrices = [];
    const lanternMatrices = [];
    const treeMatrices = [];
    const dummy = new THREE.Object3D();

    const isNearJunction = (px, pz) => {
      if (!this.junctions || this.junctions.length === 0) return false;
      for (let j = 0; j < this.junctions.length; j++) {
        const jn = this.junctions[j];
        const distSq = (px - jn.x) ** 2 + (pz - jn.z) ** 2;
        if (distSq < (jn.radius + 6.5) ** 2) return true;
      }
      return false;
    };

    // 嚴格判定點是否落入任何車道瀝青路面或路口 (杜絕路中央長樹與路燈)
    const isPointOnRoad = (px, pz) => {
      if (isNearJunction(px, pz)) return true;
      if (!this.roadSegments) return false;
      for (let i = 0; i < this.roadSegments.length; i++) {
        const seg = this.roadSegments[i];
        const pts = seg.points;
        const hw = seg.width / 2 + 1.0;
        for (let j = 0; j < pts.length - 1; j++) {
          const p1 = pts[j];
          const p2 = pts[j + 1];
          const minX = Math.min(p1.x, p2.x) - hw;
          const maxX = Math.max(p1.x, p2.x) + hw;
          if (px < minX || px > maxX) continue;
          const minZ = Math.min(p1.z, p2.z) - hw;
          const maxZ = Math.max(p1.z, p2.z) + hw;
          if (pz < minZ || pz > maxZ) continue;

          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const lenSq = dx * dx + dz * dz;
          if (lenSq === 0) continue;
          const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (pz - p1.z) * dz) / lenSq));
          const cx = p1.x + t * dx;
          const cz = p1.z + t * dz;
          const dSq = (px - cx) ** 2 + (pz - cz) ** 2;
          if (dSq < hw * hw) return true;
        }
      }
      return false;
    };

    // 優先從市中心向外排佈，長路段中點取樣，嚴格避開任何路口中央與車道
    for (let r = 0; r < this.roadSegments.length; r++) {
      const road = this.roadSegments[r];
      if (!road.points || road.points.length < 2 || road.width < 5) continue;
      const pts = road.points;
      const halfW = road.width / 2;

      for (let p = 0; p < pts.length - 1; p++) {
        const p1 = pts[p];
        const p2 = pts[p + 1];
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        if (len < 24.0) continue;

        const nx = -dz / len;
        const nz = dx / len;
        const angle = Math.atan2(dx, dz);

        const mx = (p1.x + p2.x) * 0.5;
        const mz = (p1.z + p2.z) * 0.5;

        // 右側路燈 (放置於人行道路緣外側，嚴格驗證非道路)
        if (matrices.length < 450) {
          const lx = mx - nx * (halfW + 0.9);
          const lz = mz - nz * (halfW + 0.9);

          if (!isPointOnRoad(lx, lz)) {
            dummy.position.set(lx, 0.22, lz);
            dummy.rotation.set(0, angle - Math.PI / 2, 0);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();

            matrices.push(dummy.matrix.clone());
            lanternMatrices.push(dummy.matrix.clone());
          }
        }

        // 左側台灣經典行道樹 (放置於左側人行道外緣，嚴格驗證非道路)
        if (treeMatrices.length < 350 && (r + p) % 2 === 0) {
          const tx = mx + nx * (halfW + 1.6);
          const tz = mz + nz * (halfW + 1.6);

          if (!isPointOnRoad(tx, tz)) {
            dummy.position.set(tx, 0.15, tz);
            dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
            const s = 0.85 + Math.random() * 0.3;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            treeMatrices.push(dummy.matrix.clone());
          }
        }
      }
      if (matrices.length >= 450 && treeMatrices.length >= 350) break;
    }

    if (matrices.length > 0) {
      this.streetlightsMesh = new THREE.InstancedMesh(combinedPole, poleMat, matrices.length);
      this.lanternsMesh = new THREE.InstancedMesh(lanternGeom, lanternMat, lanternMatrices.length);
      for (let i = 0; i < matrices.length; i++) {
        this.streetlightsMesh.setMatrixAt(i, matrices[i]);
        this.lanternsMesh.setMatrixAt(i, lanternMatrices[i]);
      }
      this.streetlightsMesh.instanceMatrix.needsUpdate = true;
      this.lanternsMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(this.streetlightsMesh);
      this.scene.add(this.lanternsMesh);
    }

    // 加入台灣行道樹網格 (60 FPS InstancedMesh)
    if (treeMatrices.length > 0) {
      const trunk = new THREE.CylinderGeometry(0.18, 0.24, 2.6, 8).toNonIndexed();
      trunk.translate(0, 1.3, 0);
      const canopy = new THREE.ConeGeometry(1.8, 3.4, 8).toNonIndexed();
      canopy.translate(0, 3.6, 0);
      const combinedTree = BufferGeometryUtils.mergeGeometries([trunk, canopy], false);
      if (combinedTree) {
        combinedTree.computeVertexNormals();
        combinedTree.computeBoundingSphere();
        const treeMat = new THREE.MeshStandardMaterial({
          color: 0x2e7d32,
          roughness: 0.8,
          metalness: 0.05
        });
        this.treesMesh = new THREE.InstancedMesh(combinedTree, treeMat, treeMatrices.length);
        for (let i = 0; i < treeMatrices.length; i++) {
          this.treesMesh.setMatrixAt(i, treeMatrices[i]);
        }
        this.treesMesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.treesMesh);
      }
    }

    // ----------------------------------------------------
    // B. 路口三色號誌紅綠燈 (L型懸臂鋼桿 + 橫式號誌燈箱 + 遮光罩 + 綠底白字路名牌 + 行人號誌箱)
    // ----------------------------------------------------
    const signalPoleGeom = TaiwanTrafficSignalSystem.createSignalPoleGeometry();
    const signalPoleMat = new THREE.MeshStandardMaterial({
      color: 0x2b343d,
      roughness: 0.45,
      metalness: 0.55
    });

    const { lensR, lensY, lensG } = TaiwanTrafficSignalSystem.createLensesGeometry();
    const streetSignTex = TaiwanStreetscapeTextures.createStreetSignTexture('臺灣大道');
    const plateGeom = new THREE.PlaneGeometry(2.2, 0.55);
    plateGeom.translate(2.2, 6.8, 0.05);
    const plateMat = new THREE.MeshBasicMaterial({ map: streetSignTex });

    const lightPositions = [];

    // 遍歷所有市區與主要路口，在轉角人行道緣石精準架設 L 型懸臂號誌桿
    if (this.junctions && this.junctions.length > 0) {
      for (let j = 0; j < this.junctions.length; j++) {
        const jn = this.junctions[j];
        if (jn.connectedCount < 2) continue;

        const R = jn.radius || 10.0;
        const cosA = Math.cos(jn.primaryAngle || 0);
        const sinA = Math.sin(jn.primaryAngle || 0);

        // 於路口對角兩側人行道轉角 (Corner Curb) 放置號誌桿
        const cornerOffsets = [
          { lx: R - 0.6, lz: -(R - 0.6), dir: "NS", rot: jn.primaryAngle || 0 },
          { lx: -(R - 0.6), lz: R - 0.6, dir: "EW", rot: (jn.primaryAngle || 0) + Math.PI * 0.5 }
        ];

        for (let c = 0; c < cornerOffsets.length; c++) {
          const co = cornerOffsets[c];
          const wx = jn.x + co.lx * cosA - co.lz * sinA;
          const wz = jn.z + co.lx * sinA + co.lz * cosA;

          dummy.position.set(wx, 0.22, wz);
          dummy.rotation.set(0, co.rot, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          lightPositions.push({
            matrix: dummy.matrix.clone(),
            dir: co.dir
          });
          if (lightPositions.length >= 1000) break;
        }
        if (lightPositions.length >= 1000) break;
      }
    }

    if (lightPositions.length > 0) {
      this.trafficSignalsPoleMesh = new THREE.InstancedMesh(signalPoleGeom, signalPoleMat, lightPositions.length);
      this.streetSignMesh = new THREE.InstancedMesh(plateGeom, plateMat, lightPositions.length);
      this.redMesh = new THREE.InstancedMesh(lensR, new THREE.MeshBasicMaterial({ color: 0x220000 }), lightPositions.length);
      this.yellowMesh = new THREE.InstancedMesh(lensY, new THREE.MeshBasicMaterial({ color: 0x221a00 }), lightPositions.length);
      this.greenMesh = new THREE.InstancedMesh(lensG, new THREE.MeshBasicMaterial({ color: 0x002211 }), lightPositions.length);

      for (let i = 0; i < lightPositions.length; i++) {
        const lp = lightPositions[i];
        this.trafficSignalsPoleMesh.setMatrixAt(i, lp.matrix);
        this.streetSignMesh.setMatrixAt(i, lp.matrix);
        this.redMesh.setMatrixAt(i, lp.matrix);
        this.yellowMesh.setMatrixAt(i, lp.matrix);
        this.greenMesh.setMatrixAt(i, lp.matrix);
      }

      this.trafficSignalsPoleMesh.instanceMatrix.needsUpdate = true;
      this.streetSignMesh.instanceMatrix.needsUpdate = true;
      this.redMesh.instanceMatrix.needsUpdate = true;
      this.yellowMesh.instanceMatrix.needsUpdate = true;
      this.greenMesh.instanceMatrix.needsUpdate = true;

      this.scene.add(this.trafficSignalsPoleMesh);
      this.scene.add(this.streetSignMesh);
      this.scene.add(this.redMesh);
      this.scene.add(this.yellowMesh);
      this.scene.add(this.greenMesh);
      this.lightPositions = lightPositions;

      // 行人號誌小綠人 / 小紅人貼圖面板
      try {
        const tex = TextureGenerator.createPedestrianSignalTextures();
        const pedGeom = new THREE.PlaneGeometry(0.26, 0.52);
        pedGeom.translate(0, 2.8, 0.40);
        const mk = (map) => new THREE.InstancedMesh(pedGeom, new THREE.MeshBasicMaterial({ map }), lightPositions.length);
        this.pedRed = mk(tex.redManTex);
        this.pedGreen1 = mk(tex.greenMan1Tex);
        this.pedGreen2 = mk(tex.greenMan2Tex);
        this.pedZero = new THREE.Matrix4().makeScale(0, 0, 0);
        [this.pedRed, this.pedGreen1, this.pedGreen2].forEach((m) => {
          m.frustumCulled = false;
          this.scene.add(m);
        });
        this.pedKey = null;
      } catch (e) {
        console.warn('行人號誌降級:', e);
      }
    }
  }

  update(dt) {
    if (!this.lightPositions || !this.redMesh) return;
    this.signalTimer += dt;
    const cycle = 24.0;
    const t = this.signalTimer % cycle;

    const redColor = new THREE.Color(0xff1522);
    const redOff = new THREE.Color(0x220000);
    const yellowColor = new THREE.Color(0xffb703);
    const yellowOff = new THREE.Color(0x221a00);
    const greenColor = new THREE.Color(0x00e676);
    const greenOff = new THREE.Color(0x002211);

    for (let i = 0; i < this.lightPositions.length; i++) {
      const isNS = this.lightPositions[i].dir === "NS";
      if (isNS) {
        if (t < 10) {
          this.redMesh.setColorAt(i, redOff);
          this.yellowMesh.setColorAt(i, yellowOff);
          this.greenMesh.setColorAt(i, greenColor);
        } else if (t < 12) {
          this.redMesh.setColorAt(i, redOff);
          this.yellowMesh.setColorAt(i, yellowColor);
          this.greenMesh.setColorAt(i, greenOff);
        } else {
          this.redMesh.setColorAt(i, redColor);
          this.yellowMesh.setColorAt(i, yellowOff);
          this.greenMesh.setColorAt(i, greenOff);
        }
      } else {
        if (t < 12) {
          this.redMesh.setColorAt(i, redColor);
          this.yellowMesh.setColorAt(i, yellowOff);
          this.greenMesh.setColorAt(i, greenOff);
        } else if (t < 22) {
          this.redMesh.setColorAt(i, redOff);
          this.yellowMesh.setColorAt(i, yellowOff);
          this.greenMesh.setColorAt(i, greenColor);
        } else {
          this.redMesh.setColorAt(i, redOff);
          this.yellowMesh.setColorAt(i, yellowColor);
          this.greenMesh.setColorAt(i, greenOff);
        }
      }
    }
    if (this.redMesh.instanceColor) this.redMesh.instanceColor.needsUpdate = true;
    if (this.yellowMesh.instanceColor) this.yellowMesh.instanceColor.needsUpdate = true;
    if (this.greenMesh.instanceColor) this.greenMesh.instanceColor.needsUpdate = true;

    this.updatePedSignals(t);
  }

  // 行人號誌：小綠人 (這步行動畫) / 小紅人 (站立)，僅在狀態改變時更新矩陣以節省效能
  updatePedSignals(t) {
    if (!this.pedRed || !this.pedGreen1) return;
    const frame = Math.floor(this.signalTimer * 2) % 2;
    const nsWalk = t < 10, ewWalk = t >= 12 && t < 22;
    const key = `${nsWalk ? 1 : 0}${ewWalk ? 1 : 0}${frame}`;
    if (key === this.pedKey) return;
    this.pedKey = key;
    for (let i = 0; i < this.lightPositions.length; i++) {
      const lp = this.lightPositions[i];
      const walk = lp.dir === 'NS' ? nsWalk : ewWalk;
      this.pedRed.setMatrixAt(i, walk ? this.pedZero : lp.matrix);
      this.pedGreen1.setMatrixAt(i, walk && frame === 0 ? lp.matrix : this.pedZero);
      this.pedGreen2.setMatrixAt(i, walk && frame === 1 ? lp.matrix : this.pedZero);
    }
    this.pedRed.instanceMatrix.needsUpdate = true;
    this.pedGreen1.instanceMatrix.needsUpdate = true;
    this.pedGreen2.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================================
// 7. AI 智慧交通系統 (TrafficSystem) - 計程車、自小客車、機車、黑白警車與爆閃警燈
// ============================================================================
class TrafficSystem {
  constructor(scene, roadSegments) {
    this.scene = scene;
    this.roadSegments = roadSegments;
    this.vehicles = [];
    this.time = 0;
    this.initPool();
  }

  initPool() {
    if (!this.roadSegments || this.roadSegments.length === 0) return;

    // 建立 24 輛 AI 車輛 (包含 4 輛台灣警車、6 輛小黃計程車、10 輛一般轎車、4 輛經典機車)
    const types = [
      'police', 'taxi', 'sedan', 'sedan', 'scooter',
      'police', 'taxi', 'sedan', 'sedan', 'scooter',
      'police', 'taxi', 'sedan', 'sedan', 'taxi',
      'police', 'taxi', 'sedan', 'sedan', 'taxi',
      'scooter', 'sedan', 'sedan', 'scooter'
    ];

    types.forEach((type, idx) => {
      const roadIdx = (idx * 5) % this.roadSegments.length;
      const road = this.roadSegments[roadIdx];
      if (!road || road.points.length < 2) return;

      const group = new THREE.Group();
      let strobes = null;

      if (type === 'police') {
        strobes = this.buildPoliceCar(group);
      } else if (type === 'taxi') {
        this.buildTaxi(group);
      } else if (type === 'scooter') {
        this.buildScooter(group);
      } else {
        const colors = [0xf8f9fa, 0x1e272e, 0x7f8c8d, 0x0984e3, 0xb2bec3];
        this.buildSedan(group, colors[idx % colors.length]);
      }

      this.scene.add(group);

      this.vehicles.push({
        group,
        type,
        strobes,
        roadIdx,
        pointIdx: 0,
        t: Math.random(),
        speed: type === 'police' ? 14 : (type === 'scooter' ? 10 : 11 + Math.random() * 3),
        laneOffset: 2.2 // 台灣靠右行駛車道偏移
      });
    });
  }

  buildSedan(group, color) {
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 });

    // 底盤主車體
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.2), bodyMat);
    chassis.position.y = 0.55;
    group.add(chassis);

    // 車頂車窗駕駛艙
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2.2), glassMat);
    cabin.position.set(0, 1.15, -0.2);
    group.add(cabin);

    // 4 個輪胎
    [-0.95, 0.95].forEach((wx) => {
      [-1.3, 1.3].forEach((wz) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.34, wz);
        group.add(wheel);
      });
    });

    // 頭燈與尾燈
    const hLight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hLight.position.set(0, 0.6, 2.12);
    group.add(hLight);

    const tLight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.08), new THREE.MeshBasicMaterial({ color: 0xff1122 }));
    tLight.position.set(0, 0.6, -2.12);
    group.add(tLight);
  }

  buildTaxi(group) {
    this.buildSedan(group, 0xf1c40f);
    // 車頂 TAXI 經典黃色發光燈箱
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffeaa7 })
    );
    taxiSign.position.set(0, 1.55, -0.2);
    group.add(taxiSign);
  }

  buildPoliceCar(group) {
    // 台灣經典黑白相間警車 (白車身、黑車門)
    this.buildSedan(group, 0xffffff);

    const blackDoorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    [-0.94, 0.94].forEach((dx) => {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 1.8), blackDoorMat);
      door.position.set(dx, 0.58, -0.1);
      group.add(door);
    });

    // 車頂紅藍警用爆閃排燈
    const lightBarFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
    );
    lightBarFrame.position.set(0, 1.5, -0.2);
    group.add(lightBarFrame);

    const leftStrobe = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.14, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xff0022 })
    );
    leftStrobe.position.set(-0.3, 1.58, -0.2);
    group.add(leftStrobe);

    const rightStrobe = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.14, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x0055ff })
    );
    rightStrobe.position.set(0.3, 1.58, -0.2);
    group.add(rightStrobe);

    return { leftStrobe, rightStrobe };
  }

  buildScooter(group) {
    const scMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.4 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.3 });
    const riderMat = new THREE.MeshStandardMaterial({ color: 0xd63031 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // 機車車身
    const scBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.8), bodyMat);
    scBody.position.y = 0.45;
    group.add(scBody);

    // 龍頭把手
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), scMat);
    handle.position.set(0, 0.9, 0.6);
    group.add(handle);

    // 前後輪
    [-0.65, 0.65].forEach((wz) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10), scMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.24, wz);
      group.add(w);
    });

    // 騎士身體與安全帽
    const rider = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.4), riderMat);
    rider.position.set(0, 0.95, -0.1);
    group.add(rider);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), helmetMat);
    helmet.position.set(0, 1.4, -0.1);
    group.add(helmet);
  }

  update(dt, playerVehicle) {
    this.time += dt;
    const playerPos = playerVehicle?.meshGroup?.position;

    // 爆閃警燈交替切換 (5 Hz)
    const isRedFlash = Math.floor(this.time * 9) % 2 === 0;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const road = this.roadSegments[v.roadIdx];
      if (!road || road.points.length < 2) continue;

      // 警車爆閃燈特效
      if (v.strobes) {
        v.strobes.leftStrobe.material.color.setHex(isRedFlash ? 0xff0022 : 0x220005);
        v.strobes.rightStrobe.material.color.setHex(!isRedFlash ? 0x0066ff : 0x000a22);
      }

      const pts = road.points;
      const p1 = pts[v.pointIdx];
      const p2 = pts[Math.min(v.pointIdx + 1, pts.length - 1)];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLen = Math.hypot(dx, dz);

      if (segLen > 0.1) {
        v.t += (v.speed * dt) / segLen;
        if (v.t >= 1.0) {
          v.t = 0;
          v.pointIdx++;
          if (v.pointIdx >= pts.length - 1) {
            v.pointIdx = 0;
            v.roadIdx = (v.roadIdx + 1) % this.roadSegments.length;
          }
        }

        const nx = -dz / segLen;
        const nz = dx / segLen;

        const curX = p1.x + dx * v.t + nx * v.laneOffset;
        const curZ = p1.z + dz * v.t + nz * v.laneOffset;

        v.group.position.set(curX, 0.08, curZ);
        v.group.rotation.y = Math.atan2(dx, dz);

        // 與玩家防碰撞避讓：若距玩家太近自動減速
        if (playerPos) {
          const distToPlayer = Math.hypot(curX - playerPos.x, curZ - playerPos.z);
          if (distToPlayer > 180) {
            // 太遠時重新生成於玩家前方路段，確保繁華車流環繞
            v.roadIdx = (v.roadIdx + 3) % this.roadSegments.length;
            v.pointIdx = 0;
            v.t = 0;
          }
        }
      }
    }
  }
}

// ============================================================================
// 8. NPC 行人系統 (PedestrianSystem) - 市民行人與巡邏警察 (附肢體走動、物理被撞擊飛與警方通緝)
// ============================================================================
class PedestrianSystem {
  constructor(scene, roadSegments, app = null) {
    this.scene = scene;
    this.roadSegments = roadSegments;
    this.app = app;
    this.pedestrians = [];
    this.initPool();
  }

  initPool() {
    if (!this.roadSegments || this.roadSegments.length === 0) return;

    // 建立 45 位真實活生生台中市民與警察 (支援走動、轉向與被車輛撞飛物理)
    const totalPeds = 45;
    for (let i = 0; i < totalPeds; i++) {
      const isPolice = i % 8 === 0;
      const roadIdx = (i * 3) % this.roadSegments.length;
      const road = this.roadSegments[roadIdx];
      if (!road || road.points.length < 2) continue;

      const group = new THREE.Group();
      const parts = this.buildHumanoid(group, isPolice, i);
      this.scene.add(group);

      this.pedestrians.push({
        group,
        isPolice,
        parts,
        roadIdx,
        pointIdx: 0,
        t: Math.random(),
        walkPhase: Math.random() * Math.PI * 2,
        speed: 1.25 + Math.random() * 0.45,
        side: i % 2 === 0 ? 1 : -1,
        state: "walking", // "walking" | "hit" | "down"
        vx: 0, vy: 0, vz: 0,
        spinSpeed: 0,
        downTimer: 0
      });
    }
  }

  buildHumanoid(group, isPolice, seed = 0) {
    const skinTones = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642];
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinTones[seed % skinTones.length],
      roughness: 0.65
    });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.9 });

    // 頭部
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat);
    head.position.y = 1.62;
    group.add(head);

    // 頭髮 / 警帽 / 安全帽
    if (isPolice) {
      const policeCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.16, 0.1, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a252f })
      );
      policeCap.position.set(0, 1.77, 0.02);
      group.add(policeCap);
    } else {
      const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.26), hairMat);
      hair.position.set(0, 1.76, 0);
      group.add(hair);
    }

    // 軀幹衣服 (台灣經典多元服裝風格)
    let shirtMat, pantsMat;
    if (isPolice) {
      shirtMat = new THREE.MeshStandardMaterial({ color: 0xccff00, roughness: 0.5 }); // 螢光反光背心
      pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a252f, roughness: 0.8 });
    } else {
      // 學生制服、上班族襯衫、休閒黃T恤、排汗衫
      const shirtColors = [
        0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0xe67e22,
        0xecf0f1, 0x34495e, 0x9b59b6, 0x16a085, 0xff7675
      ];
      shirtMat = new THREE.MeshStandardMaterial({
        color: shirtColors[seed % shirtColors.length],
        roughness: 0.6
      });
      const pantsColors = [0x2c3e50, 0x34495e, 0x1e272e, 0x7f8c8d, 0x2d3436];
      pantsMat = new THREE.MeshStandardMaterial({
        color: pantsColors[(seed * 2) % pantsColors.length],
        roughness: 0.8
      });
    }

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.6, 0.22), shirtMat);
    torso.position.y = 1.18;
    group.add(torso);

    // 手臂與腿關節樞紐
    const armGeom = new THREE.BoxGeometry(0.1, 0.52, 0.1);
    armGeom.translate(0, -0.24, 0);

    const leftArm = new THREE.Mesh(armGeom, shirtMat);
    leftArm.position.set(0.26, 1.42, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, shirtMat);
    rightArm.position.set(-0.26, 1.42, 0);
    group.add(rightArm);

    const legGeom = new THREE.BoxGeometry(0.14, 0.66, 0.14);
    legGeom.translate(0, -0.32, 0);

    const leftLeg = new THREE.Mesh(legGeom, pantsMat);
    leftLeg.position.set(0.11, 0.72, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, pantsMat);
    rightLeg.position.set(-0.11, 0.72, 0);
    group.add(rightLeg);

    return { torso, leftArm, rightArm, leftLeg, rightLeg };
  }

  update(dt, playerVehicle) {
    const playerPos = playerVehicle?.meshGroup?.position;
    const carSpeedKmh = playerVehicle ? (playerVehicle.speed || 0) * 3.6 : 0;

    for (let i = 0; i < this.pedestrians.length; i++) {
      const p = this.pedestrians[i];

      // --------------------------------------------------
      // A. 被撞擊飛空中的物理運動 (Ragdoll Knockback)
      // --------------------------------------------------
      if (p.state === "hit") {
        p.vy -= 18.0 * dt; // 重力加速度
        p.group.position.x += p.vx * dt;
        p.group.position.y += p.vy * dt;
        p.group.position.z += p.vz * dt;

        p.group.rotation.x += p.spinSpeed * dt;
        p.group.rotation.z += p.spinSpeed * 0.6 * dt;

        // 落地判定 (摔在地面 Y=0.22)
        if (p.group.position.y <= 0.22) {
          p.group.position.y = 0.22;
          p.vy = 0;
          p.vx *= 0.3;
          p.vz *= 0.3;
          p.group.rotation.x = Math.PI * 0.5; // 躺平倒地
          p.group.rotation.z = 0;
          p.state = "down";
          p.downTimer = 0;
        }
        continue;
      }

      // --------------------------------------------------
      // B. 倒地狀態倒數與重生地點更新
      // --------------------------------------------------
      if (p.state === "down") {
        p.downTimer += dt;
        if (p.downTimer > 7.0 && playerPos) {
          // 重新復活分派至玩家前方人行道
          this.respawnNearPlayer(p, playerPos);
        }
        continue;
      }

      // --------------------------------------------------
      // C. 正常沿著人行道漫步
      // --------------------------------------------------
      const road = this.roadSegments[p.roadIdx];
      if (!road || road.points.length < 2) {
        if (playerPos) this.respawnNearPlayer(p, playerPos);
        continue;
      }

      const pts = road.points;
      const p1 = pts[p.pointIdx];
      const p2 = pts[Math.min(p.pointIdx + 1, pts.length - 1)];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLen = Math.hypot(dx, dz);

      if (segLen > 0.1) {
        p.t += (p.speed * dt) / segLen;
        if (p.t >= 1.0) {
          p.t = 0;
          p.pointIdx++;
          if (p.pointIdx >= pts.length - 1) {
            p.pointIdx = 0;
            p.roadIdx = (p.roadIdx + 1) % this.roadSegments.length;
          }
        }

        const nx = -dz / segLen;
        const nz = dx / segLen;

        // 走在人行道上 (高程 Y = 0.22，偏移 halfRoadWidth + 1.2m)
        const swOffset = (road.width / 2 + 1.2) * p.side;
        const curX = p1.x + dx * p.t + nx * swOffset;
        const curZ = p1.z + dz * p.t + nz * swOffset;

        p.walkPhase += dt * p.speed * 4.8;
        const swing = Math.sin(p.walkPhase) * 0.45;

        // 自然走動擺動肢體
        p.parts.leftLeg.rotation.x = swing;
        p.parts.rightLeg.rotation.x = -swing;
        p.parts.leftArm.rotation.x = -swing * 0.8;
        p.parts.rightArm.rotation.x = swing * 0.8;
        p.parts.torso.position.y = 1.18 + Math.abs(Math.sin(p.walkPhase)) * 0.03;

        p.group.position.set(curX, 0.22, curZ);
        p.group.rotation.set(0, Math.atan2(dx, dz), 0);

        // --------------------------------------------------
        // D. 車輛撞擊檢測 (車速 > 6 km/h 撞擊飛人 + 通緝警方抓捕)
        // --------------------------------------------------
        if (playerPos) {
          const distToCar = Math.hypot(curX - playerPos.x, curZ - playerPos.z);
          const hitRadius = (playerVehicle.type === "scooter" ? 1.4 : 2.1);

          if (distToCar < hitRadius && carSpeedKmh > 7.0) {
            // ★ 撞擊行人！觸發物理擊飛與 GTA 通緝
            p.state = "hit";

            const carRotY = playerVehicle.meshGroup.rotation.y;
            const carFwdX = Math.sin(carRotY);
            const carFwdZ = Math.cos(carRotY);
            const impactForce = Math.min(26, carSpeedKmh * 0.45 + 5.0);

            p.vx = carFwdX * impactForce + (Math.random() - 0.5) * 4.0;
            p.vy = 5.2 + Math.random() * 2.5; // 挑飛至空中
            p.vz = carFwdZ * impactForce + (Math.random() - 0.5) * 4.0;
            p.spinSpeed = (Math.random() - 0.5) * 16.0;

            // 肢體被撞擊變形
            p.parts.leftLeg.rotation.x = Math.PI * 0.4;
            p.parts.rightLeg.rotation.x = -Math.PI * 0.3;
            p.parts.leftArm.rotation.z = Math.PI * 0.6;
            p.parts.rightArm.rotation.z = -Math.PI * 0.6;

            // 撞擊音效回饋
            if (window.soundManager) {
              window.soundManager.playCrash(0.8);
            }

            // GTA 通緝系統：通緝星級提升！警方全面圍捕！
            if (this.app?.gtaManager) {
              const starsToAdd = carSpeedKmh > 55 ? 2 : 1;
              this.app.gtaManager.addWanted(starsToAdd);
              this.app.gtaManager.addCash(-500); // 扣除肇事賠償金
            }
            if (this.app) {
              this.app.showToast("💥 肇事撞擊行人！臺中市警察局全面發布通緝！");
            }
            continue;
          }

          // 太遠時 (超過 150m) 重新分派到玩家身旁人行道，確保身邊總是充滿行人
          if (distToCar > 150) {
            this.respawnNearPlayer(p, playerPos);
          }
        }
      }
    }
  }

  // 將行人平滑重新分派至玩家身旁半徑 30m~85m 的街道人行道上
  respawnNearPlayer(p, playerPos) {
    if (!this.roadSegments || this.roadSegments.length === 0) return;
    const len = this.roadSegments.length;
    const startIdx = Math.floor(Math.random() * len);

    for (let k = 0; k < 60; k++) {
      const idx = (startIdx + k) % len;
      const road = this.roadSegments[idx];
      if (road && road.points.length >= 2) {
        const midPt = road.points[Math.floor(road.points.length / 2)];
        const dist = Math.hypot(midPt.x - playerPos.x, midPt.z - playerPos.z);
        if (dist >= 25 && dist <= 110) {
          p.roadIdx = idx;
          p.pointIdx = 0;
          p.t = Math.random() * 0.8;
          p.state = "walking";
          p.group.rotation.set(0, 0, 0);
          return;
        }
      }
    }
    // 找不到就隨機取一段
    p.roadIdx = (p.roadIdx + 3) % len;
    p.pointIdx = 0;
    p.t = 0;
    p.state = "walking";
    p.group.rotation.set(0, 0, 0);
  }
}

// ============================================================================
// 9. 核心遊戲應用程式 (TaichungRushApp)
// ============================================================================
export class TaichungRushApp {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physicsWorld = null;

    // 載具系統
    this.vehicle = null;
    this.inputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false
    };

    // OSM 建築與道路網格
    this.buildingMesh = null;
    this.roadMesh = null;
    this.sidewalkMesh = null;
    this.roadSegments = []; // 用於 Minimap 與路名偵測
    this.roadGrid = new Map(); // 空間網格化路網 (每格 200m，避免全圖 6 萬條道路每幀暴搜)
    this.lastStreetDetectTime = 0;
    this.minimapFrameCount = 0;
    this.chunkManager = null; // 動態區塊串流生成系統 (WorldChunkManager)

    // 街道設施、AI交通與NPC行人
    this.streetPropsSystem = null;
    this.trafficSystem = null;
    this.pedestrianSystem = null;

    // 燈光與陰影
    this.dirLight = null;

    // UI 元件
    this.loader = document.getElementById('loader');
    this.ldStage = document.getElementById('ld-stage');
    this.ldStageEn = document.getElementById('ld-stage-en');
    this.ldPct = document.getElementById('ld-pct');
    this.ldFill = document.getElementById('ld-fill');
    this.ldReadyBox = document.getElementById('ld-ready-box');
    this.btnEnterGame = document.getElementById('btn-enter-game');
    this.hudLayer = document.getElementById('hud');
    this.speedVal = document.getElementById('speed-val');
    this.gearVal = document.getElementById('gear-val');
    this.locationName = document.getElementById('location-name');
    this.streetTag = document.getElementById('street-tag');
    this.toastNotice = document.getElementById('toast-notice');

    // Minimap 小地圖
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // 系統地標管理
    this.landmarks = [];
    this.currentLandmarkIdx = 0;
    this.gpsTarget = null;

    // 啟動流程
    this.initThree();
    this.initPhysics();
    this.gtaManager = new GtaGameplayManager(this);
    this.initControls();
    this.mapSystem = new GoogleMapSystem(this);
    window.taichungApp = this;
    this.loadMapAndBuildWorld();
  }

  // 提示框
  showToast(msg) {
    if (!this.toastNotice) return;
    this.toastNotice.textContent = msg;
    this.toastNotice.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastNotice?.classList.remove('show');
    }, 3200);
  }

  // 更新載入條進度
  updateProgress(pct, stageZh, stageEn) {
    if (this.ldPct) this.ldPct.innerHTML = `${Math.round(pct)}<i>%</i>`;
    if (this.ldFill) this.ldFill.style.width = `${pct}%`;
    if (this.ldStage && stageZh) this.ldStage.textContent = stageZh;
    if (this.ldStageEn && stageEn) this.ldStageEn.textContent = stageEn;
  }

  initThree() {
    this.timeOfDay = 'day'; // 預設為明亮陽光普照的【晴朗白晝】光影系統！
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x64b5f6); // 蔚藍澄澈白晝天空
    this.scene.fog = new THREE.FogExp2(0x90caf9, 0.00065); // 柔和自然遠景大氣霧 (清晰可見遠方台中天際線與山脈)

    // 第三人稱追蹤相機
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 1600);
    this.camera.position.set(-50, 6, -12);

    // WebGL 渲染器 (最佳化 60 FPS 幀率 + 柔和陰影)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = true; // 啟用高效能柔和陰影！
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    // 環境光
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    // 半球自然天光 (天空蔚藍、地面大地反光)
    this.hemiLight = new THREE.HemisphereLight(0xcce7ff, 0x8a9b7a, 0.65);
    this.scene.add(this.hemiLight);

    // 陽光平行光 (動態跟隨玩家，精確 75m 緊湊陰影視錐體，毫無任何效能負擔，穩鎖 60 FPS)
    this.dirLight = new THREE.DirectionalLight(0xfff9e6, 1.5);
    this.dirLight.position.set(70, 160, 50);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 280;
    this.dirLight.shadow.camera.left = -45;
    this.dirLight.shadow.camera.right = 45;
    this.dirLight.shadow.camera.top = 45;
    this.dirLight.shadow.camera.bottom = -45;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 天空耀眼太陽光球
    const sunGeom = new THREE.SphereGeometry(16, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunMesh.position.set(250, 400, 180);
    this.scene.add(this.sunMesh);

    // 地基平面 (寬廣台中市區地面，MeshLambertMaterial 極速渲染)
    const groundGeom = new THREE.PlaneGeometry(18000, 18000);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({
      map: TextureGenerator.createGroundTexture()
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ★ 白天 / 夕陽 / 夜景 真實光影切換系統 (可按 L 鍵或點擊 HUD 時鐘切換)
  setTimeOfDay(mode = 'day') {
    this.timeOfDay = mode;
    const hudClock = document.getElementById('hud-clock');

    if (mode === 'day') {
      this.scene.background.setHex(0x64b5f6);
      this.scene.fog.color.setHex(0x90caf9);
      this.scene.fog.density = 0.00065;
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.85;
      this.hemiLight.color.setHex(0xcce7ff);
      this.hemiLight.groundColor.setHex(0x8a9b7a);
      this.hemiLight.intensity = 0.65;
      this.dirLight.color.setHex(0xfff9e6);
      this.dirLight.intensity = 1.5;
      this.dirLight.castShadow = true;
      if (hudClock) hudClock.textContent = '☀️ 14:00';
      this.showToast('☀️ 已啟用【晴朗白晝】真實光影系統 (60 FPS 高效能)');
    } else if (mode === 'sunset') {
      this.scene.background.setHex(0xe65100);
      this.scene.fog.color.setHex(0xff8a65);
      this.scene.fog.density = 0.00085;
      this.ambientLight.color.setHex(0xffcc80);
      this.ambientLight.intensity = 0.7;
      this.hemiLight.color.setHex(0xffb74d);
      this.hemiLight.groundColor.setHex(0x5d4037);
      this.hemiLight.intensity = 0.55;
      this.dirLight.color.setHex(0xffa726);
      this.dirLight.intensity = 1.35;
      this.dirLight.castShadow = true;
      if (hudClock) hudClock.textContent = '🌇 17:45';
      this.showToast('🌇 已切換至【黃金夕陽】光影系統');
    } else {
      this.scene.background.setHex(0x0f141d);
      this.scene.fog.color.setHex(0x131828);
      this.scene.fog.density = 0.0022;
      this.ambientLight.color.setHex(0x2c3e50);
      this.ambientLight.intensity = 0.45;
      this.hemiLight.color.setHex(0x37474f);
      this.hemiLight.groundColor.setHex(0x212121);
      this.hemiLight.intensity = 0.35;
      this.dirLight.color.setHex(0x7986cb);
      this.dirLight.intensity = 0.5;
      this.dirLight.castShadow = false;
      if (hudClock) hudClock.textContent = '🌙 21:30';
      this.showToast('🌙 已切換至【璀璨夜城】光影系統');
    }
  }

  initPhysics() {
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);
    this.physicsWorld.defaultContactMaterial.friction = 0.45;
    this.physicsWorld.defaultContactMaterial.restitution = 0.05;

    // 地面靜態物理碰撞層
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.physicsWorld.addBody(groundBody);

    // 建立車輛實例
    this.vehicle = new Vehicle(this.scene, this.physicsWorld);
  }

  cycleTimeOfDay() {
    const order = ['day', 'sunset', 'night'];
    const next = order[(order.indexOf(this.timeOfDay) + 1) % order.length];
    this.setTimeOfDay(next);
  }

  initControls() {
    const clockEl = document.getElementById('hud-clock');
    if (clockEl) {
      clockEl.style.cursor = 'pointer';
      clockEl.title = '切換日夜 (L)';
      clockEl.addEventListener('click', () => this.cycleTimeOfDay());
      if (this.timeOfDay === 'day') clockEl.textContent = '☀️ 14:00';
    }
    const onKey = (e, state) => {
      // 忽略輸入框打字事件
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const code = e.code;
      const key = e.key;

      // 地圖開啟時，WASD 不駕駛，按下 M 或 Escape 關閉地圖
      if (this.mapSystem && this.mapSystem.isOpen) {
        if (state && (code === 'KeyM' || key === 'm' || key === 'M' || code === 'Escape')) {
          this.mapSystem.close();
        }
        return;
      }

      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          this.inputs.forward = state;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputs.backward = state;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.inputs.left = state;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputs.right = state;
          break;
        case 'Space':
          this.inputs.brake = state;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.inputs.boost = state;
          break;
      }

      if (state && code === 'KeyF') {
        this.vehicle.toggleVehicleType();
      }

      if (state && code === 'KeyL') {
        this.cycleTimeOfDay();
      }

      if (state && code === 'KeyE') {
        this.eatEgg();
      }

      if (state && code === 'KeyR') {
        this.vehicle.resetPosition();
      }

      if (state && code === 'KeyT') {
        this.teleportToLandmark();
      }

      if (state && code === 'KeyQ') {
        this.gtaManager?.triggerMission();
      }

      if (state && code === 'KeyJ') {
        this.gtaManager?.shootGun();
      }

      if (state && code === 'KeyH') {
        this.gtaManager?.triggerHorn();
      }

      if (state && (code === 'KeyN' || key === 'n' || key === 'N')) {
        this.toggleRadio();
      }

      if (state && (code === 'KeyB' || key === 'b' || key === 'B')) {
        this.nextRadioStation();
      }

      if (state && (code === 'KeyM' || key === 'm' || key === 'M')) {
        this.mapSystem.toggle();
      }
    };

    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));

    // 按鈕綁定
    document.getElementById('btn-reset')?.addEventListener('click', () => this.vehicle.resetPosition());
    document.getElementById('btn-landmark')?.addEventListener('click', () => this.teleportToLandmark());
    document.getElementById('btn-swap-veh')?.addEventListener('click', () => this.vehicle.toggleVehicleType());
    document.getElementById('btn-eat')?.addEventListener('click', () => this.eatEgg());
    document.getElementById('btn-eat-egg')?.addEventListener('click', () => this.eatEgg());
    document.getElementById('btn-mission')?.addEventListener('click', () => this.gtaManager?.triggerMission());
    document.getElementById('btn-shoot')?.addEventListener('click', () => this.gtaManager?.shootGun());
    document.getElementById('btn-horn')?.addEventListener('click', () => this.gtaManager?.triggerHorn());
    document.getElementById('btn-radio')?.addEventListener('click', () => this.toggleRadio());

    // 大地圖按鈕與 Minimap 點擊打開
    document.getElementById('btn-open-map')?.addEventListener('click', () => this.mapSystem.open());
    document.getElementById('minimap-widget')?.addEventListener('click', () => this.mapSystem.open());

    // 進入遊戲按鈕
    if (this.btnEnterGame) {
      this.btnEnterGame.addEventListener('click', () => {
        this.loader.classList.remove('loader-active');
        this.loader.classList.add('hidden');
        if (this.hudLayer) this.hudLayer.classList.remove('hidden');
        soundManager.init();
        soundManager.playVehicleSwitch();
      });
    }

    // 360 度滑鼠視角自由環繞控制 (Mouse Orbit Controls)
    this.orbitYaw = 0;
    this.orbitPitch = 0.32;
    this.orbitDist = 5.8;
    this.isMouseDragging = false;
    this.mouseDragStartX = 0;
    this.mouseDragStartY = 0;
    this.lastOrbitInteractionTime = 0;

    window.addEventListener('mousedown', (e) => {
      // 點擊 UI 按鈕或大地圖時不旋轉鏡頭
      if (e.target.closest('#hud, #full-map-modal, button, input, .minimap-wrapper')) return;
      this.isMouseDragging = true;
      this.mouseDragStartX = e.clientX;
      this.mouseDragStartY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDragging) return;
      const dx = e.clientX - this.mouseDragStartX;
      const dy = e.clientY - this.mouseDragStartY;
      this.mouseDragStartX = e.clientX;
      this.mouseDragStartY = e.clientY;

      this.orbitYaw -= dx * 0.0055;
      this.orbitPitch = Math.max(-0.06, Math.min(1.22, this.orbitPitch + dy * 0.0045));
      this.lastOrbitInteractionTime = performance.now();
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDragging = false;
    });

    window.addEventListener(
      'wheel',
      (e) => {
        if (this.mapSystem && this.mapSystem.isOpen) return;
        this.orbitDist = Math.max(3.8, Math.min(24.0, this.orbitDist + e.deltaY * 0.012));
      },
      { passive: false }
    );
  }

  eatEgg() {
    this.vehicle.health = 100;
    const hpBar = document.getElementById('health-bar');
    if (hpBar) hpBar.style.width = '100%';
    soundManager.playEatEgg();
    this.showToast('🥚 享用超商熱騰騰茶葉蛋！體力完全恢復！');
  }

  // 車載 FM 電台開關與切換
  toggleRadio() {
    const isPlaying = soundManager.toggleRadio();
    const st = soundManager.getCurrentStation();
    this.showToast(isPlaying ? `📻 車載電台已開啟：${st.name}` : '🔇 車載電台已關閉');
  }

  nextRadioStation() {
    const st = soundManager.nextStation();
    if (st) {
      this.showToast(`📻 切換電台頻道：${st.name}`);
    }
  }

  // 尋找目標點最近的道路路網座標 (保證傳送 100% 在馬路上，絕不傳入建築物內部)
  findNearestRoadPoint(x, z, maxDist = 450) {
    if (!this.roadSegments || this.roadSegments.length === 0) {
      return { x, z, angle: 0, roadName: '市區主要道路' };
    }
    let bestDistSq = Infinity;
    let bestPoint = { x, z, angle: 0, roadName: '市區主要道路' };

    const candidateRoads = this.getNearbyRoads(x, z);
    const roadsToSearch = (candidateRoads && candidateRoads.length > 0) ? candidateRoads : this.roadSegments;

    for (let r = 0; r < roadsToSearch.length; r++) {
      const road = roadsToSearch[r];
      const pts = road.points;
      if (!pts || pts.length < 2) continue;

      // 快速包圍盒粗篩
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];

        const minSegX = Math.min(p1.x, p2.x) - maxDist;
        const maxSegX = Math.max(p1.x, p2.x) + maxDist;
        const minSegZ = Math.min(p1.z, p2.z) - maxDist;
        const maxSegZ = Math.max(p1.z, p2.z) + maxDist;
        if (x < minSegX || x > maxSegX || z < minSegZ || z > maxSegZ) continue;

        const segDx = p2.x - p1.x;
        const segDz = p2.z - p1.z;
        const segLenSq = segDx * segDx + segDz * segDz;
        if (segLenSq < 0.2) continue;

        let t = ((x - p1.x) * segDx + (z - p1.z) * segDz) / segLenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = p1.x + t * segDx;
        const projZ = p1.z + t * segDz;
        const distSq = (x - projX) ** 2 + (z - projZ) ** 2;

        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          const roadAngle = Math.atan2(segDx, segDz);
          bestPoint = {
            x: projX,
            z: projZ,
            angle: roadAngle,
            roadName: road.name || '台中市區道路'
          };
        }
      }
    }

    if (bestDistSq <= maxDist * maxDist) {
      return bestPoint;
    }
    return { x, z, angle: 0, roadName: '台中市區道路' };
  }

  // 依照真實坐標與路網最近點，傳送到合法馬路路面 (絕不卡進建築物內)
  teleportToCoords(targetX, targetZ, name = '目標位置') {
    soundManager.playTeleport();
    const roadPt = this.findNearestRoadPoint(targetX, targetZ, 450);
    const spawnX = roadPt.x;
    const spawnZ = roadPt.z;
    const faceAngle = roadPt.angle;

    this.vehicle.body.position.set(spawnX, 1.2, spawnZ);
    this.vehicle.body.velocity.set(0, 0, 0);
    this.vehicle.body.angularVelocity.set(0, 0, 0);
    this.vehicle.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), faceAngle);
    this.vehicle.currentYaw = faceAngle;
    this.vehicle.speed = 0;
    this.vehicle.meshGroup.position.set(spawnX, 1.2, spawnZ);
    this.vehicle.meshGroup.quaternion.copy(this.vehicle.body.quaternion);

    // 相機鏡頭平滑置於車身後方 (5.8 米最佳第三人稱視角，完全維持於道路中線淨空區)
    const camBackDist = 5.8;
    const camBackX = spawnX - Math.sin(faceAngle) * camBackDist;
    const camBackZ = spawnZ - Math.cos(faceAngle) * camBackDist;
    this.camera.position.set(camBackX, 2.8, camBackZ);
    this.camera.lookAt(spawnX, 1.4, spawnZ);

    if (this.chunkManager) {
      this.chunkManager.update({ x: spawnX, y: 1.2, z: spawnZ }, 0.016, this.vehicle.body);
    }

    if (this.locationName) {
      this.locationName.textContent = `📍 已傳送至：${name} (${roadPt.roadName})`;
    }
    this.showToast(`🚀 已傳送至道路：${name}`);
  }

  // 快速前往/切換台中各大地標 (精準吸附於地標正前方道路路網上，絕不穿入建築內部)
  teleportToLandmark(idx) {
    if (!this.landmarks || this.landmarks.length === 0) return;
    if (typeof idx === 'object' && idx !== null) {
      idx = idx.id || idx.name;
    }
    if (typeof idx === 'string') {
      const foundIdx = this.landmarks.findIndex(l => l.id === idx || l.name?.includes(idx));
      this.currentLandmarkIdx = foundIdx !== -1 ? foundIdx : 0;
    } else if (idx !== undefined) {
      this.currentLandmarkIdx = idx % this.landmarks.length;
    } else {
      this.currentLandmarkIdx = (this.currentLandmarkIdx + 1) % this.landmarks.length;
    }

    const lm = this.landmarks[this.currentLandmarkIdx];
    const targetX = lm.x + (lm.spawnOffset?.x || 0);
    const targetZ = lm.z + (lm.spawnOffset?.z || 0);
    this.teleportToCoords(targetX, targetZ, lm.name);
  }

  // 核心載入：讀取 taichung-map-data.json 並透過 BufferGeometryUtils 合併網格
  async loadMapAndBuildWorld() {
    try {
      this.updateProgress(10, '讀取臺中路網與 OSM 圖資...', 'Downloading OSM Road Network...');
      const overturePromise = fetch('./taichung_overture_buildings.geojson')
        .then((r) => (r.ok ? r.json() : null))
        .catch((err) => { console.warn('Overture GeoJSON 載入降級:', err); return null; });
      const response = await fetch('./taichung-map-data.json');
      if (!response.ok) {
        throw new Error(`無法載入 taichung-map-data.json: HTTP ${response.status}`);
      }

      this.updateProgress(25, '讀取 Overture Maps 全臺中建築圖資 (169MB)...', 'Loading Overture Buildings GeoJSON...');
      const geojson = await response.json();
      const features = geojson.features || [];

      const overtureGeojson = await overturePromise;

      this.updateProgress(45, '初始化 Overture 200m 動態區塊串流系統 (Chunk Streaming)...', 'Partitioning 200m spatial grid buckets...');
      this.chunkManager = new WorldChunkManager(this.scene, this.physicsWorld, {
        chunkSize: 200,
        loadRadius: 2, // 依需求載入以玩家為中心半徑 2 格 (5x5，方圓 500m) 的所有 Overture 建築群
        unloadRadius: 3
      });

      if (overtureGeojson && overtureGeojson.features) {
        this.chunkManager.initOverture(overtureGeojson, geojson);
      } else {
        this.chunkManager.init(geojson);
      }
      window.chunkManager = this.chunkManager;

      this.updateProgress(60, '鋪設市區道路網與人行道...', 'Generating road network & sidewalks...');
      await new Promise((r) => setTimeout(r, 40));

      const roadTexture = TextureGenerator.createRoadTexture();
      const crossroadTexture = TextureGenerator.createCrossroadTexture(false); // 台灣標準十字路口 (斑馬線+機車停等區+導引線)
      const yellowBoxTexture = TextureGenerator.createCrossroadTexture(true);  // 火車站/主要幹道淨空黃色網格路口
      const teeJunctionTexture = TextureGenerator.createTeeJunctionTexture();
      const sidewalkTexture = TextureGenerator.createSidewalkTexture();

      // 1. 收集範圍內道路 LineString
      let rawRoads = [];
      const highwayRoads = [];
      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        const props = feat.properties || {};
        const geom = feat.geometry;
        if (!geom) continue;

        const isTunnelWay = !!props.tunnel && props.tunnel !== 'no';
        if (!isTunnelWay && props.highway && (props.highway === 'motorway' || props.highway === 'trunk' || props.highway === 'motorway_link') && geom.type === 'LineString' && geom.coordinates && geom.coordinates.length >= 2) {
          const hm = geoToMeters(geom.coordinates[0][0], geom.coordinates[0][1]);
          if (hm.x * hm.x + hm.z * hm.z <= 7800 * 7800) {
            highwayRoads.push({ name: props.name || '快速道路', deckWidth: 16.5, coords: geom.coordinates.map((c) => geoToMeters(c[0], c[1])) });
          }
        }

        if (props.highway && geom.type === 'LineString' && geom.coordinates) {
          const coords = geom.coordinates;
          if (coords.length < 2) continue;

          const firstM = geoToMeters(coords[0][0], coords[0][1]);
          const distSqOrigin = firstM.x * firstM.x + firstM.z * firstM.z;
          let inCoverage = distSqOrigin <= 3800 * 3800; // 完整涵蓋臺中火車站至科博館與中西區所有市區街道與巷弄
          if (!inCoverage && LANDMARK_CONFIGS) {
            for (let l = 0; l < LANDMARK_CONFIGS.length; l++) {
              const lm = LANDMARK_CONFIGS[l];
              const dx = firstM.x - lm.x;
              const dz = firstM.z - lm.z;
              if (dx * dx + dz * dz <= 1600 * 1600) {
                inCoverage = true;
                break;
              }
            }
          }
          if (!inCoverage) continue;

          const ptsMeters = coords.map((c) => geoToMeters(c[0], c[1]));
          const width = GeometryBuilder.getRoadWidth(props.highway);
          rawRoads.push({
            name: props.name || '市區道路',
            highway: props.highway,
            width,
            coords: ptsMeters,
            tunnel: isTunnelWay,
            bridge: !!props.bridge && props.bridge !== 'no',
            layer: parseInt(props.layer, 10) || 0
          });
        }
      }

      // 1b. 過濾地下道/隧道，以及跨越其他地面道路的高架/立交橋 (否則會被攤平畫在地面上、與平面道路交錯成怪路)
      {
        const CELL = 60;
        const cellKey = (x, z) => `${Math.floor(x / CELL)}_${Math.floor(z / CELL)}`;
        const hash = new Map();
        const isGround = (r) => !r.tunnel && !r.bridge && r.layer <= 0;
        const addSeg = (a, b) => {
          const x0 = Math.floor(Math.min(a.x, b.x) / CELL), x1 = Math.floor(Math.max(a.x, b.x) / CELL);
          const z0 = Math.floor(Math.min(a.z, b.z) / CELL), z1 = Math.floor(Math.max(a.z, b.z) / CELL);
          for (let gx = x0; gx <= x1; gx++) {
            for (let gz = z0; gz <= z1; gz++) {
              const k = `${gx}_${gz}`;
              if (!hash.has(k)) hash.set(k, []);
              hash.get(k).push([a, b]);
            }
          }
        };
        for (const r of rawRoads) {
          if (!isGround(r)) continue;
          for (let i = 0; i < r.coords.length - 1; i++) addSeg(r.coords[i], r.coords[i + 1]);
        }
        const segCross = (p1, p2, p3, p4) => {
          const d = (p2.x - p1.x) * (p4.z - p3.z) - (p2.z - p1.z) * (p4.x - p3.x);
          if (Math.abs(d) < 1e-9) return false;
          const t = ((p3.x - p1.x) * (p4.z - p3.z) - (p3.z - p1.z) * (p4.x - p3.x)) / d;
          const u = ((p3.x - p1.x) * (p2.z - p1.z) - (p3.z - p1.z) * (p2.x - p1.x)) / d;
          return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98;
        };
        const crossesGround = (r) => {
          for (let i = 0; i < r.coords.length - 1; i++) {
            const a = r.coords[i], b = r.coords[i + 1];
            const x0 = Math.floor(Math.min(a.x, b.x) / CELL), x1 = Math.floor(Math.max(a.x, b.x) / CELL);
            const z0 = Math.floor(Math.min(a.z, b.z) / CELL), z1 = Math.floor(Math.max(a.z, b.z) / CELL);
            for (let gx = x0; gx <= x1; gx++) {
              for (let gz = z0; gz <= z1; gz++) {
                const list = hash.get(`${gx}_${gz}`);
                if (!list) continue;
                for (const [c, d] of list) if (segCross(a, b, c, d)) return true;
              }
            }
          }
          return false;
        };
        const before = rawRoads.length;
        rawRoads = rawRoads.filter((r) => {
          if (r.tunnel || r.layer < 0) return false;
          if (r.bridge || r.layer >= 1) return !crossesGround(r);
          return true;
        });
        console.log(`[TaichungRush] 道路過濾：移除 ${before - rawRoads.length} 條隧道/立交跨越路段`);
      }

      // 2. 節點訪問次數索引 (以 2.5m 空間網格聚合交匯點)
      const keyOf = (p) => `${Math.round(p.x * 0.4) * 2.5}_${Math.round(p.z * 0.4) * 2.5}`;
      const nodeVisits = new Map();
      for (let r = 0; r < rawRoads.length; r++) {
        const pts = rawRoads[r].coords;
        for (let i = 0; i < pts.length; i++) {
          const k = keyOf(pts[i]);
          nodeVisits.set(k, (nodeVisits.get(k) || 0) + 1);
        }
      }

      // 3. 在所有交匯路口節點將道路切分為獨立子路段 (確保路口皆為端點，杜絕人行道切穿主幹道)
      const splitRoads = [];
      for (let r = 0; r < rawRoads.length; r++) {
        const road = rawRoads[r];
        let cur = [road.coords[0]];
        for (let i = 1; i < road.coords.length; i++) {
          const pt = road.coords[i];
          cur.push(pt);
          const k = keyOf(pt);
          if (nodeVisits.get(k) > 1 && i < road.coords.length - 1) {
            if (cur.length >= 2) {
              splitRoads.push({ name: road.name, highway: road.highway, width: road.width, coords: cur });
            }
            cur = [pt];
          }
        }
        if (cur.length >= 2) {
          splitRoads.push({ name: road.name, highway: road.highway, width: road.width, coords: cur });
        }
      }

      // 4. 統計度數 >= 3 之路口節點 (十字路口與丁字/三叉路口)
      const junctionMap = new Map();
      for (let r = 0; r < splitRoads.length; r++) {
        const road = splitRoads[r];
        const pStart = road.coords[0];
        const pEnd = road.coords[road.coords.length - 1];

        [{ pt: pStart, isStart: true }, { pt: pEnd, isStart: false }].forEach(({ pt, isStart }) => {
          const k = keyOf(pt);
          if (nodeVisits.get(k) >= 2) {
            if (!junctionMap.has(k)) {
              junctionMap.set(k, {
                x: pt.x,
                z: pt.z,
                maxW: 0,
                connectedCount: 0,
                primaryAngle: 0
              });
            }
            const j = junctionMap.get(k);
            j.connectedCount++;
            if (road.width > j.maxW) {
              j.maxW = road.width;
              const nextPt = isStart ? road.coords[1] : road.coords[road.coords.length - 2];
              if (nextPt) {
                j.primaryAngle = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z);
              }
            }
          }
        });
      }

      for (const [k, j] of junctionMap) {
        j.radius = Math.max(5.0, Math.min(18.0, j.maxW / 2 + 1.2));
      }

      // 5. 道路與路口 9 大分區合併 (Sector Chunking: 2200m 網格，兼顧 60 FPS 視錐體剔除與極低 Draw Call)
      const ROAD_CHUNK_SIZE = 2200;
      const getChunkKey = (x, z) => `${Math.floor(x / ROAD_CHUNK_SIZE)}_${Math.floor(z / ROAD_CHUNK_SIZE)}`;

      const roadGeomsByChunk = new Map();
      const crossroadGeomsByChunk = new Map();
      const yellowBoxGeomsByChunk = new Map();
      const teeGeomsByChunk = new Map();
      const sidewalkGeomsByChunk = new Map();

      const addToChunk = (map, x, z, geom) => {
        const key = getChunkKey(x, z);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(geom);
      };

      for (let r = 0; r < splitRoads.length; r++) {
        const road = splitRoads[r];
        const pts = road.coords;
        if (!pts || pts.length < 2) continue;

        let segLen = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          segLen += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
        }
        if (segLen < 2.5) continue;

        const midX = (pts[0].x + pts[pts.length - 1].x) * 0.5;
        const midZ = (pts[0].z + pts[pts.length - 1].z) * 0.5;

        // ★ 道路柏油全面無縫連貫：道路本身不硬性截斷，在交匯處自然連續平滑重疊，杜絕破面與孔洞
        const roadGeom = GeometryBuilder.createRoadMeshGeometry(pts, road.width);
        if (roadGeom) addToChunk(roadGeomsByChunk, midX, midZ, roadGeom);

        // ★ 人行道：於交叉路口外緣乾淨收邊 (在交叉路口邊緣停止)，杜絕路緣石橫切車道
        if (road.width >= 4.5 && segLen >= 8.0) {
          const kStart = keyOf(pts[0]);
          const kEnd = keyOf(pts[pts.length - 1]);
          let swPts = pts;

          if (junctionMap.has(kStart)) {
            const j = junctionMap.get(kStart);
            const trimmed = GeometryBuilder.trimPolylineStart(swPts, j, j.radius);
            if (trimmed) swPts = trimmed;
          }
          if (junctionMap.has(kEnd)) {
            const j = junctionMap.get(kEnd);
            const trimmed = GeometryBuilder.trimPolylineEnd(swPts, j, j.radius);
            if (trimmed) swPts = trimmed;
          }

          if (swPts && swPts.length >= 2) {
            let swLen = 0;
            for (let i = 0; i < swPts.length - 1; i++) {
              swLen += Math.hypot(swPts[i + 1].x - swPts[i].x, swPts[i + 1].z - swPts[i].z);
            }
            if (swLen >= 6.0) {
              const sidewalkGeom = GeometryBuilder.createSidewalkMeshGeometry(swPts, road.width, 2.0);
              if (sidewalkGeom) addToChunk(sidewalkGeomsByChunk, midX, midZ, sidewalkGeom);
            }
          }
        }

        const segObj = {
          name: road.name,
          points: pts,
          width: road.width
        };
        this.roadSegments.push(segObj);

        // 空間網格化路網 (每格 200m，將道路分區快取，實現 O(1) 極速檢索)
        const cellSet = new Set();
        for (let p = 0; p < pts.length; p++) {
          const gx = Math.floor(pts[p].x / 200);
          const gz = Math.floor(pts[p].z / 200);
          cellSet.add(`${gx}_${gz}`);
        }
        for (const cellKey of cellSet) {
          if (!this.roadGrid.has(cellKey)) this.roadGrid.set(cellKey, []);
          this.roadGrid.get(cellKey).push(segObj);
        }
      }

      this.junctionList = Array.from(junctionMap.values());
      if (this.chunkManager) {
        this.chunkManager.roadGrid = this.roadGrid;
        this.chunkManager.roadSegments = this.roadSegments;
        this.chunkManager.junctionList = this.junctionList;
      }

      // 6b. 高架快速道路 (台74線 / 國道一號 / 中投)：高架橋面 + 橋墩 + 物理碰撞，地面道路維持於下方
      try {
        const highwayTex = TextureGenerator.createHighwayTexture();
        const deckGeomsByChunk = new Map();
        const pierGeomsByChunk = new Map();
        let deckBodies = 0;
        for (let h = 0; h < highwayRoads.length; h++) {
          const hr = highwayRoads[h];
          const res = GeometryBuilder.createElevatedHighwayGeometry(hr.coords, hr.deckWidth, false);
          if (!res) continue;
          const mid = res.cleanPts[Math.floor(res.cleanPts.length / 2)];
          addToChunk(deckGeomsByChunk, mid.x, mid.z, res.geom);
          const piers = GeometryBuilder.createHighwayPiers(res.cleanPts, res.elevations);
          if (piers) addToChunk(pierGeomsByChunk, mid.x, mid.z, piers);
          if (Math.hypot(mid.x, mid.z) < 4500) {
            for (let i = 0; i < res.cleanPts.length - 1 && deckBodies < 1800; i++) {
              const a = res.cleanPts[i], b = res.cleanPts[i + 1];
              const len = Math.hypot(b.x - a.x, b.z - a.z);
              if (len < 0.5) continue;
              const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(hr.deckWidth / 2, 0.3, len / 2 + 0.3)) });
              body.position.set((a.x + b.x) / 2, 9.5, (a.z + b.z) / 2);
              body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.atan2(b.x - a.x, b.z - a.z));
              this.physicsWorld.addBody(body);
              deckBodies++;
            }
          }
        }
        const deckMat = new THREE.MeshLambertMaterial({ map: highwayTex, side: THREE.DoubleSide });
        const pierMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6 });
        const addMerged = (map, mat) => {
          for (const [, geoms] of map) {
            const m = BufferGeometryUtils.mergeGeometries(geoms, false);
            if (!m) continue;
            const mesh = new THREE.Mesh(m, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
          }
        };
        addMerged(deckGeomsByChunk, deckMat);
        addMerged(pierGeomsByChunk, pierMat);
      } catch (hwErr) {
        console.warn('高架道路建構降級:', hwErr);
      }

      this.updateProgress(75, '幾何合併 (Draw Call 最佳化)...', 'Merging road & intersection geometries for 60 FPS...');
      await new Promise((r) => setTimeout(r, 40));

      // ------------------------------------------------------------------------
      // BufferGeometryUtils.mergeGeometries 分區塊合併道路、路口與人行道網格 (支援 GPU 視錐體剔除)
      // ------------------------------------------------------------------------
      const mergeFunc = (BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries).bind(BufferGeometryUtils);

      const roadMaterial = new THREE.MeshLambertMaterial({
        map: roadTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.2,
        polygonOffsetUnits: -1.2
      });

      const crossroadMaterial = new THREE.MeshLambertMaterial({
        map: crossroadTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.6,
        polygonOffsetUnits: -1.6
      });

      const yellowBoxMaterial = new THREE.MeshLambertMaterial({
        map: yellowBoxTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.6,
        polygonOffsetUnits: -1.6
      });

      const teeMaterial = new THREE.MeshLambertMaterial({
        map: teeJunctionTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.6,
        polygonOffsetUnits: -1.6
      });

      const sidewalkMaterial = new THREE.MeshLambertMaterial({
        map: sidewalkTexture,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -1.0
      });

      this.roadMeshes = [];
      this.sidewalkMeshes = [];

      const buildChunkMeshes = (chunkMap, material, storeList = null) => {
        for (const [key, geoms] of chunkMap) {
          if (!geoms || geoms.length === 0) continue;
          const merged = mergeFunc(geoms, false);
          if (merged) {
            merged.computeBoundingSphere();
            merged.computeBoundingBox();
            const mesh = new THREE.Mesh(merged, material);
            mesh.receiveShadow = true;
            mesh.frustumCulled = true; // 啟用自動視錐體剔除，僅渲染相機視野內道路！
            this.scene.add(mesh);
            if (storeList) storeList.push(mesh);
          }
        }
      };

      buildChunkMeshes(roadGeomsByChunk, roadMaterial, this.roadMeshes);
      buildChunkMeshes(crossroadGeomsByChunk, crossroadMaterial);
      buildChunkMeshes(yellowBoxGeomsByChunk, yellowBoxMaterial);
      buildChunkMeshes(teeGeomsByChunk, teeMaterial);
      buildChunkMeshes(sidewalkGeomsByChunk, sidewalkMaterial, this.sidewalkMeshes);

      this.roadMesh = this.roadMeshes[0] || null;
      this.sidewalkMesh = this.sidewalkMeshes[0] || null;

      // ------------------------------------------------------------------------
      // 載入臺中經典真實 3D 地標模型 (GLTFLoader)
      // 雙層 Group 架構：內部 innerModel 修正立姿，外部 parentGroup 旋轉方位世界 Y 軸
      // 徹底解決傾斜、翻轉、下沉問題，底面百分之百貼齊地表 Y=0！
      // ------------------------------------------------------------------------
      this.updateProgress(82, '載入臺中真實 3D 地標模型 (台中車站、李方艾美、科博館...)', 'Loading 3D landmark models...');
      const gltfLoader = new GLTFLoader();
      this.landmarks = [];

      for (let index = 0; index < LANDMARK_CONFIGS.length; index++) {
        const lm = LANDMARK_CONFIGS[index];
        try {
          const parentGroup = new THREE.Group();
          let innerModel = null;
          if (lm.file) {
            // 使用 encodeURI 處理檔名可能包含空格或特殊符號
            const gltf = await new Promise((resolve, reject) => {
              gltfLoader.load(encodeURI(lm.file), resolve, undefined, reject);
            });
            innerModel = gltf.scene;
            innerModel.scale.setScalar(lm.scale);
            if (lm.rotX) innerModel.rotation.x = lm.rotX;
            else innerModel.rotation.set(0, 0, 0);

            // ★★★ 核心修正：徹底過濾並銷毀「敷地低矮地形網格」與「空拍/衛星航照圖薄片」★★★
            innerModel.traverse((child) => {
              if (child.isMesh) {
                child.geometry.computeBoundingBox();
                const bb = child.geometry.boundingBox;
                const size = new THREE.Vector3();
                bb.getSize(size);

                const name = (child.name || '').toLowerCase();
                const matName = (child.material?.name || '').toLowerCase();

                // 1. 徹底過濾 Google Earth / 衛星空拍照片 / 地面地圖紋理
                const isAerialPhotoOrMap = (
                  name.includes('google') || name.includes('aerial') || name.includes('satellite') ||
                  name.includes('earth') || name.includes('map') || name.includes('ortho') ||
                  name.includes('photo') || name.includes('canvas') || name.includes('image') ||
                  name.includes('plate') || name.includes('terrain') || name.includes('ground') ||
                  name.includes('base') || name.includes('site') || name.includes('plan') ||
                  matName.includes('google') || matName.includes('aerial') || matName.includes('satellite') ||
                  matName.includes('earth') || matName.includes('map') || matName.includes('ortho') ||
                  matName.includes('photo') || matName.includes('image') || matName.includes('terrain') ||
                  matName.includes('ground') || matName.includes('base') || matName.includes('site')
                );

                // 2. 幾何形狀特徵過濾：航照底圖薄片必為面積超大且厚度極薄 (< 45 吋 / 1.1 米) 的單一平面片
                const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
                const isFlatTerrainSheet = (dims[0] < 45.0 && dims[1] > 500.0 && dims[2] > 500.0);

                if (isAerialPhotoOrMap || isFlatTerrainSheet) {
                  child.visible = false;
                  child.geometry = new THREE.BufferGeometry(); // 抹除頂點，杜絕被父容器包圍盒計入
                  return;
                }

                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                }
              }
            });
          } else if (lm.builder && typeof LandmarkBuilder[lm.builder] === 'function') {
            innerModel = LandmarkBuilder[lm.builder]();
            innerModel.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
          }

          if (!innerModel) continue;

          // 更新矩陣並精準取得「可見主體建築」包圍盒
          innerModel.updateMatrixWorld(true);
          const box = new THREE.Box3();
          innerModel.traverse((child) => {
            if (child.isMesh && child.visible) {
              box.expandByObject(child);
            }
          });

          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            innerModel.position.x = -center.x;
            innerModel.position.z = -center.z;
            innerModel.position.y = -box.min.y; // 建築底端精準平貼路面 Y = 0，徹底消除多餘底座，絕不浮空！
          }

          parentGroup.add(innerModel);

          // 放置於真實公尺世界坐標並繞垂直 Y 軸偏轉 (支援 yOffset 微調壓入地表，消弭懸空與地基土堤)
          parentGroup.position.set(lm.x, (lm.yOffset || 0), lm.z);
          if (lm.rotY) parentGroup.rotation.y = lm.rotY;

          this.scene.add(parentGroup);
          this.landmarks.push({ ...lm, model: parentGroup, innerModel });

          // 在 cannon-es 物理世界加入地標靜態碰撞體 (依建物角度偏轉，並內縮 20% 嚴格杜絕伸入馬路形成空氣牆)
          const lmBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3((lm.boxW * 0.78) / 2, lm.boxH / 2, (lm.boxD * 0.78) / 2)),
            position: new CANNON.Vec3(lm.x, lm.boxH / 2, lm.z)
          });
          if (lm.rotY) {
            lmBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), lm.rotY);
          }
          this.physicsWorld.addBody(lmBody);
          console.log(`[TaichungRush] 成功放置地標: ${lm.name} 於 (X:${lm.x}, Z:${lm.z})`);
        } catch (err) {
          console.warn(`[TaichungRush] 載入地標失敗 ${lm.name}:`, err);
        }
      }

      // 立即串流載入玩家初始位置 (台中火車站前廣場) 的 25 個 Chunk 建築
      if (this.chunkManager) {
        this.chunkManager.update({ x: 0, y: 1.2, z: 70 }, 0.016);
      }

      // ------------------------------------------------------------------------
      // 初始化街道公共設施、AI交通與NPC行人系統
      // ------------------------------------------------------------------------
      this.updateProgress(96, '生成路燈、交通號誌、AI車流與NPC行人...', 'Spawning traffic and pedestrians...');
      this.streetPropsSystem = new StreetPropsSystem(this.scene, this.roadSegments, this.junctionList || []);
      this.trafficSystem = new TrafficSystem(this.scene, this.roadSegments);
      this.pedestrianSystem = new PedestrianSystem(this.scene, this.roadSegments, this);

      // 載入完成
      this.updateProgress(100, '臺中市區街道鋪設完成！', 'Ready to Rush!');
      if (this.ldReadyBox) {
        this.ldReadyBox.classList.remove('hidden');
      }

      // 開始渲染循環
      this.animate();
    } catch (err) {
      console.error('[TaichungRush] 載入失敗:', err);
      if (this.ldStage) this.ldStage.textContent = `載入錯誤: ${err.message}`;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = 1 / 60;

    // 物理世界更新
    if (this.physicsWorld) {
      this.physicsWorld.step(dt);
    }

    // 車輛物理與視覺更新
    if (this.vehicle) {
      this.vehicle.update(this.inputs, dt);

      // HUD 時速與檔位更新
      if (this.speedVal) this.speedVal.textContent = this.vehicle.speed;
      if (this.gearVal) this.gearVal.textContent = this.vehicle.gear;

      // 360 度滑鼠視角自由環繞控制 (Mouse Orbit Camera)
      const carPos = this.vehicle.meshGroup.position;
      const carYaw = this.vehicle.currentYaw !== undefined ? this.vehicle.currentYaw : this.vehicle.meshGroup.rotation.y;

      // 若一段時間無手動旋轉且正在行駛，視角平滑回正到車尾
      if (!this.isMouseDragging && performance.now() - this.lastOrbitInteractionTime > 2200 && this.vehicle.speed > 8) {
        this.orbitYaw *= 0.96;
      }

      // 計算總相機偏角與球形三維軌道坐標
      const totalYaw = carYaw + this.orbitYaw;
      const horizDist = this.orbitDist * Math.cos(this.orbitPitch);
      const vertHeight = this.orbitDist * Math.sin(this.orbitPitch) + 1.2;

      const targetCamPos = new THREE.Vector3(
        carPos.x - Math.sin(totalYaw) * horizDist,
        carPos.y + vertHeight,
        carPos.z - Math.cos(totalYaw) * horizDist
      );

      this.camera.position.lerp(targetCamPos, 0.16);
      this.camera.lookAt(carPos.x, carPos.y + 1.2, carPos.z);

      // 平行光陰影中心跟隨玩家，兼顧大範圍與極致陰影細節
      if (this.dirLight) {
        this.dirLight.position.set(carPos.x + 120, 220, carPos.z + 100);
        this.dirLight.target.position.copy(carPos);
        this.dirLight.target.updateMatrixWorld();
      }

      // 偵測目前所在路名
      this.detectStreetName(carPos);

      // 動態區塊串流管理系統更新 (WorldChunkManager: 500m 半徑動態加載/卸載)
      if (this.chunkManager) {
        this.chunkManager.update(carPos, dt, this.vehicle.body);
      }

      // 繪製 Minimap 雷達小地圖
      this.drawMinimap(carPos);

      // GPS 導航距離更新
      if (this.gpsTarget) {
        const dist = Math.hypot(carPos.x - this.gpsTarget.x, carPos.z - this.gpsTarget.z);
        const distEl = document.getElementById('gps-dist-val');
        if (distEl) distEl.textContent = `(${Math.round(dist)} 公尺)`;

        if (dist < 22) {
          soundManager.playGPSArrival();
          this.showToast(`🎉 已抵達導航目的地：${this.gpsTarget.name}！`);
          this.mapSystem.clearGPS();
        }
      }

      // 若大地圖開啟中，更新地圖玩家圓點
      if (this.mapSystem && this.mapSystem.isOpen) {
        this.mapSystem.render();
      }
    }

    // GTA 核心玩法系統更新 (通緝星級、警車 AI 追擊、子彈射擊、街頭任務倒數)
    if (this.gtaManager) {
      this.gtaManager.update(dt);
    }

    // 街道號誌與路燈公共設施系統更新 (號誌時序切換)
    if (this.streetPropsSystem) {
      this.streetPropsSystem.update(dt);
    }

    // AI 車流更新 (計程車、房車、機車、黑白警車與爆閃警燈)
    if (this.trafficSystem) {
      this.trafficSystem.update(dt, this.vehicle);
    }

    // NPC 行人與巡邏員警步態動畫更新 (市民走動、手腳擺動、避讓)
    if (this.pedestrianSystem) {
      this.pedestrianSystem.update(dt, this.vehicle);
    }

    this.renderer.render(this.scene, this.camera);
  }

  getNearbyRoads(x, z) {
    if (!this.roadGrid || this.roadGrid.size === 0) return this.roadSegments || [];
    const gx = Math.floor(x / 200);
    const gz = Math.floor(z / 200);
    const result = [];
    const seen = new Set();
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const list = this.roadGrid.get(`${gx + ox}_${gz + oz}`);
        if (!list) continue;
        for (let i = 0; i < list.length; i++) {
          if (!seen.has(list[i])) {
            seen.add(list[i]);
            result.push(list[i]);
          }
        }
      }
    }
    return result;
  }

  detectStreetName(carPos) {
    const now = performance.now();
    if (now - this.lastStreetDetectTime < 350) return; // 0.35 秒節流，省下 98% CPU
    this.lastStreetDetectTime = now;

    const nearbyRoads = this.getNearbyRoads(carPos.x, carPos.z);
    if (!nearbyRoads || nearbyRoads.length === 0) return;
    let closestDist = Infinity;
    let closestName = '市區道路';

    for (let i = 0; i < nearbyRoads.length; i++) {
      const road = nearbyRoads[i];
      const pts = road.points;
      for (let p = 0; p < pts.length; p++) {
        const d = (pts[p].x - carPos.x) ** 2 + (pts[p].z - carPos.z) ** 2;
        if (d < closestDist) {
          closestDist = d;
          closestName = road.name;
        }
      }
    }

    if (closestDist < 120 * 120) {
      if (this.streetTag) this.streetTag.textContent = closestName;
      if (this.locationName && !this.gpsTarget) {
        this.locationName.textContent = `台中市 ${getDistrictName(carPos.x, carPos.z)}・${closestName}`;
      }
    }
  }

  // 繪製 HUD Minimap 雷達小地圖 (含附近道路、地標、GPS 導航路線與玩家三角形)
  drawMinimap(carPos) {
    this.minimapFrameCount = (this.minimapFrameCount || 0) + 1;
    if (this.minimapFrameCount % 2 !== 0) return; // 隔幀繪製 (30 FPS 雷達更新)，大幅釋放主線程 Canvas 開銷

    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.45;

    ctx.clearRect(0, 0, w, h);

    // 半透明深色雷達底色
    ctx.fillStyle = 'rgba(12, 14, 20, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // 繪製附近真實 Overture 建築物輪廓 (藍圖半透明幾何街廓，僅檢索方圓 180m)
    if (this.chunkManager) {
      const outlines = this.chunkManager.getBuildingOutlinesInRadius(carPos.x, carPos.z, 180);
      ctx.fillStyle = 'rgba(50, 70, 98, 0.45)';
      ctx.strokeStyle = 'rgba(88, 135, 205, 0.7)';
      ctx.lineWidth = 1;

      for (let b = 0; b < outlines.length; b++) {
        const ring = outlines[b];
        if (!ring || ring.length < 3) continue;

        ctx.beginPath();
        for (let p = 0; p < ring.length; p++) {
          const sx = cx + (ring[p].x - carPos.x) * scale;
          const sy = cy + (ring[p].z - carPos.z) * scale;
          if (p === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 繪製附近道路 (只繪製玩家當前周遭空間桶內的道路，瞬間完成)
    ctx.strokeStyle = 'rgba(180, 195, 215, 0.45)';
    ctx.lineWidth = 3;

    const nearbyRoads = this.getNearbyRoads(carPos.x, carPos.z);
    for (let r = 0; r < nearbyRoads.length; r++) {
      const road = nearbyRoads[r];
      const pts = road.points;
      if (pts.length < 2) continue;

      ctx.beginPath();
      for (let p = 0; p < pts.length; p++) {
        const sx = cx + (pts[p].x - carPos.x) * scale;
        const sy = cy + (pts[p].z - carPos.z) * scale;
        if (p === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // 繪製地標黃色星星標記
    if (this.landmarks && this.landmarks.length > 0) {
      this.landmarks.forEach((lm) => {
        const sx = cx + (lm.x - carPos.x) * scale;
        const sy = cy + (lm.z - carPos.z) * scale;
        if (sx >= 6 && sx <= w - 6 && sy >= 6 && sy <= h - 6) {
          ctx.fillStyle = '#f1c40f';
          ctx.beginPath();
          ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // 繪製 GPS 導航路線 (若已設定目標)
    if (this.gpsTarget) {
      const tx = cx + (this.gpsTarget.x - carPos.x) * scale;
      const ty = cy + (this.gpsTarget.z - carPos.z) * scale;

      ctx.strokeStyle = '#00d2d3';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // 導航目的地紅點
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 繪製雷達 AI 交通車輛與巡邏警車
    if (this.trafficSystem && this.trafficSystem.vehicles) {
      this.trafficSystem.vehicles.forEach((v) => {
        const vp = v.group.position;
        const sx = cx + (vp.x - carPos.x) * scale;
        const sy = cy + (vp.z - carPos.z) * scale;
        if (sx >= 4 && sx <= w - 4 && sy >= 4 && sy <= h - 4) {
          if (v.type === 'police') {
            ctx.fillStyle = Math.floor(performance.now() / 150) % 2 === 0 ? '#ff0033' : '#0066ff';
            ctx.beginPath();
            ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (v.type === 'taxi') {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(sx - 2, sy - 2, 4, 4);
          } else {
            ctx.fillStyle = '#dfe6e9';
            ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
          }
        }
      });
    }

    // 繪製雷達行人
    if (this.pedestrianSystem && this.pedestrianSystem.pedestrians) {
      this.pedestrianSystem.pedestrians.forEach((p) => {
        const pp = p.group.position;
        const sx = cx + (pp.x - carPos.x) * scale;
        const sy = cy + (pp.z - carPos.z) * scale;
        if (sx >= 4 && sx <= w - 4 && sy >= 4 && sy <= h - 4) {
          ctx.fillStyle = p.isPolice ? '#00d2d3' : '#2ecc71';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // 繪製玩家載具箭頭 (紅色三角)
    const carHeading = this.vehicle.meshGroup.rotation.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-carHeading);

    ctx.fillStyle = '#ff3838';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// 瀏覽器載入完成後自動初始化 (相容 module defer 與已就緒狀態)
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new TaichungRushApp();
  });
} else {
  window.gameApp = new TaichungRushApp();
}
