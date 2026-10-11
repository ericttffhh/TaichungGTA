/**
 * taiwanStreetscape.js
 * 臺灣特色街景建築與路口號誌核心系統：
 * 1. 3D 臺灣經典騎樓透天街屋 (Arcade Shophouse with Covered Walkway & Pillars)
 *    - 1F 內退騎樓步道 (行人可走入)、磨石子地坪、騎樓承重立柱、店面背牆
 *    - 2F~5F 懸臂外推量體 (覆蓋於騎樓上方)、二丁掛磁磚/洗石子/花草鐵窗立面
 *    - 3D 立體橫式店面看板、突出車道側掛燈箱、冷氣室外機、防盜鐵窗花、頂樓白鐵水塔與女兒牆
 * 2. 密集成排連棟街屋填充器 (Dense Row-House Infill)，徹底消除街區空洞與稀疏
 * 3. 臺灣標準 L 型懸臂號誌桿、紅黃綠三色號誌、倒數行人小綠人與綠底白字路名牌
 */

import * as THREE from 'three';
import * as BufferGeometryUtils from './libs/three/addons/utils/BufferGeometryUtils.js';

// ============================================================================
// 1. 臺灣騎樓與街景高品質貼圖工廠
// ============================================================================
export class TaiwanStreetscapeTextures {
  static _cache = new Map();

  static finish(canvas, repeat = true) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  // A. 騎樓步道地坪 (磨石子與紅地磚，帶黃銅分隔線)
  static createArcadeFloorTexture() {
    const key = 'arcade_floor';
    if (this._cache.has(key)) return this._cache.get(key);

    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');

    // 磨石子底色
    ctx.fillStyle = '#b8af9c';
    ctx.fillRect(0, 0, 512, 512);

    // 黑色、白色、深紅洗石子顆粒
    const speckles = ['#ffffff', '#2d3436', '#636e72', '#844234', '#dfd5c6'];
    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = speckles[i % speckles.length];
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2.5);
    }

    // 黃銅分隔金屬條與紅地磚拼花 (每 64px 一格)
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 3;
    for (let p = 0; p <= 512; p += 64) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
    }

    // 磚塊交錯深色勾縫
    ctx.strokeStyle = 'rgba(60, 45, 30, 0.4)';
    ctx.lineWidth = 1.5;
    for (let p = 0; p <= 512; p += 32) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
    }

    const tex = this.finish(c);
    this._cache.set(key, tex);
    return tex;
  }

  // B. 臺灣 1F 騎樓內退店面貼圖 (10 款真實臺灣常見商家)
  static createStorefrontTextures() {
    const key = 'storefronts_list';
    if (this._cache.has(key)) return this._cache.get(key);

    const STORES = [
      {
        id: '711',
        brand: '7-ELEVEN',
        sub: 'CITY CAFE · 24H · 茶葉蛋熱騰騰供應中',
        bg: '#00805a',
        stripe: '#f37021',
        textCol: '#ffffff',
        type: 'cvs'
      },
      {
        id: 'family',
        brand: 'FamilyMart 全家',
        sub: '全家就是你家 · Fami!ce 霜淇淋 · 咖啡',
        bg: '#00a0e9',
        stripe: '#009944',
        textCol: '#ffffff',
        type: 'cvs'
      },
      {
        id: '50lan',
        brand: '50嵐 經典茶飲',
        sub: '四季春青茶 · 波霸珍奶 · 冰淇淋紅茶',
        bg: '#ffc107',
        stripe: '#0d47a1',
        textCol: '#0d47a1',
        type: 'drink'
      },
      {
        id: 'breakfast',
        brand: '瑞麟美而美 · 早午餐',
        sub: '現烤總匯三明治 · 鐵板蛋餅 · 大杯冰奶茶',
        bg: '#e67e22',
        stripe: '#f1c40f',
        textCol: '#ffffff',
        type: 'food'
      },
      {
        id: 'bento',
        brand: '正忠排骨便當',
        sub: '招牌排骨飯 · 燒烤雞腿 · 附每日熱湯飲料',
        bg: '#c0392b',
        stripe: '#f39c12',
        textCol: '#ffffff',
        type: 'food'
      },
      {
        id: 'motor',
        brand: 'KYMCO 光陽機車 · 專業維修',
        sub: '機油更換 · 排氣檢驗 · 道路救援 · 正廠零件',
        bg: '#0652dd',
        stripe: '#ea2027',
        textCol: '#ffffff',
        type: 'service'
      },
      {
        id: 'pharmacy',
        brand: '大樹連鎖藥局 · 健保特約',
        sub: '慢性病處方箋調劑 · 婦嬰專業 · 醫學保健',
        bg: '#00a8ff',
        stripe: '#4cd137',
        textCol: '#ffffff',
        type: 'medical'
      },
      {
        id: 'lottery',
        brand: '台灣彩券 Taiwan Lottery',
        sub: '威力彩頭獎上看10億 · 大樂透 · 刮刮樂',
        bg: '#f1c40f',
        stripe: '#e74c3c',
        textCol: '#c0392b',
        type: 'shop'
      },
      {
        id: 'hardware',
        brand: '興發五金水電 · 刻印配鎖',
        sub: '水電材料 · 油漆防漏 · 遙控器複製 · 通水管',
        bg: '#2c3e50',
        stripe: '#e67e22',
        textCol: '#ffffff',
        type: 'service'
      },
      {
        id: 'shutter',
        brand: '永安堂中醫診所 · 傳統民宅',
        sub: '針灸推拿 · 內服中藥 · 週日休診',
        bg: '#57606f',
        stripe: '#c0392b',
        textCol: '#ffffff',
        type: 'shutter'
      }
    ];

    const textures = STORES.map(st => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 512;
      const ctx = c.getContext('2d');

      // 騎樓深色陰影與牆面底色
      ctx.fillStyle = '#22252a';
      ctx.fillRect(0, 0, 1024, 512);

      // 上方店面大招牌橫樑 (Y: 20 ~ 130)
      ctx.fillStyle = st.bg;
      ctx.fillRect(20, 20, 984, 110);
      ctx.strokeStyle = st.stripe;
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 984, 110);

      // 招牌副條紋
      ctx.fillStyle = st.stripe;
      ctx.fillRect(24, 114, 976, 12);

      // 招牌店名大字
      ctx.fillStyle = st.textCol;
      ctx.font = '900 48px "Noto Sans TC", "PingFang TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.brand, 512, 80);

      // 副標題小字
      ctx.fillStyle = st.textCol === '#ffffff' ? '#ffeaa7' : st.textCol;
      ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
      ctx.fillText(st.sub, 512, 110);

      // 門面下方結構 (Y: 140 ~ 512)
      if (st.type === 'cvs') {
        const grad = ctx.createLinearGradient(0, 140, 0, 512);
        grad.addColorStop(0, '#dff9fb');
        grad.addColorStop(1, '#c7ecee');
        ctx.fillStyle = grad;
        ctx.fillRect(40, 150, 944, 340);

        ctx.strokeStyle = '#535c68';
        ctx.lineWidth = 4;
        for (let x = 40; x <= 984; x += 188) {
          ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 490); ctx.stroke();
        }

        const cols = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22', '#9b59b6'];
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = cols[i % cols.length];
          ctx.fillRect(60 + i * 38, 280 + (i % 3) * 45, 28, 55);
        }

        ctx.fillStyle = '#00805a';
        ctx.fillRect(480, 260, 64, 200);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('自動門', 512, 350);
      } else if (st.type === 'shutter') {
        ctx.fillStyle = '#718093';
        ctx.fillRect(40, 140, 944, 350);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2.5;
        for (let y = 144; y < 490; y += 12) {
          ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(984, y); ctx.stroke();
        }
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(482, 220, 60, 60);
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.strokeRect(482, 220, 60, 60);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
        ctx.fillText('春', 512, 264);
      } else {
        ctx.fillStyle = '#dcdde1';
        ctx.fillRect(40, 140, 944, 350);

        ctx.fillStyle = '#f5f6fa';
        ctx.fillRect(80, 200, 520, 260);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(630, 220, 310, 240);

        ctx.fillStyle = '#2f3542';
        ctx.fillRect(100, 220, 480, 100);
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
        ctx.fillText('★ 人氣推薦 · 現點現做 · 歡迎光臨 ★', 340, 260);

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(120, 440); ctx.lineTo(340, 220); ctx.stroke();
      }

      return this.finish(c);
    });

    this._cache.set(key, textures);
    return textures;
  }

  // C. 臺灣 2F~5F 住宅與商辦立面貼圖 (二丁掛磁磚、洗石子、花草鐵窗花、冷氣排管)
  static createUpperFacadeTextures() {
    const key = 'upper_facades_list';
    if (this._cache.has(key)) return this._cache.get(key);

    const WALL_VARIANTS = [
      { name: 'tw_tile_cream', bg: '#dfd7c5', mortar: '#b5a993', isTile: true },
      { name: 'tw_tile_red', bg: '#b26857', mortar: '#7f3c2e', isTile: true },
      { name: 'tw_wash_stone', bg: '#a49f94', mortar: '#6d685e', isWash: true },
      { name: 'tw_mosaic_yellow', bg: '#e0c98f', mortar: '#a89462', isMosaic: true },
      { name: 'tw_modern_glass', bg: '#3a728e', mortar: '#1a3c4f', isGlass: true }
    ];

    const textures = WALL_VARIANTS.map((wv, vIdx) => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 640;
      const ctx = c.getContext('2d');

      ctx.fillStyle = wv.bg;
      ctx.fillRect(0, 0, 512, 640);

      if (wv.isTile) {
        ctx.strokeStyle = wv.mortar;
        ctx.lineWidth = 1.2;
        const th = 16, tw = 44;
        let row = 0;
        for (let y = 0; y < 640; y += th) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
          const off = (row % 2) * (tw / 2);
          for (let x = -tw; x < 512 + tw; x += tw) {
            ctx.beginPath(); ctx.moveTo(x + off, y); ctx.lineTo(x + off, y + th); ctx.stroke();
          }
          row++;
        }
      } else if (wv.isWash) {
        for (let i = 0; i < 9000; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#2d3436';
          ctx.fillRect(Math.random() * 512, Math.random() * 640, 2, 2);
        }
      } else if (wv.isGlass) {
        const grad = ctx.createLinearGradient(0, 0, 512, 640);
        grad.addColorStop(0, '#2980b9');
        grad.addColorStop(0.5, '#6dd5fa');
        grad.addColorStop(1, '#1b4f72');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 640);
      }

      // 4 層樓窗戶與鐵窗花 (每層高 160px)
      const floorH = 160;
      for (let f = 0; f < 4; f++) {
        const fy = f * floorH;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, fy + floorH - 8, 512, 8);

        for (let b = 0; b < 3; b++) {
          const wx = b * 168 + 24;
          const wy = fy + 24;
          const ww = 120;
          const wh = 96;

          ctx.fillStyle = '#2d3436';
          ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

          ctx.fillStyle = ((f + b + vIdx) % 2 === 0) ? '#4a6984' : '#2c3e50';
          ctx.fillRect(wx, wy, ww, wh);

          ctx.strokeStyle = '#636e72';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
          ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
          ctx.stroke();

          ctx.strokeStyle = '#dfe6e9';
          ctx.lineWidth = 2;
          ctx.strokeRect(wx + 4, wy + 4, ww - 8, wh - 8);
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, wy + 4); ctx.lineTo(wx + ww - 4, wy + wh / 2);
          ctx.lineTo(wx + ww / 2, wy + wh - 4); ctx.lineTo(wx + 4, wy + wh / 2);
          ctx.closePath();
          ctx.stroke();

          if ((f + b * 2) % 3 === 0) {
            ctx.fillStyle = '#f1f2f6';
            ctx.fillRect(wx + ww - 38, wy + wh - 6, 42, 26);
            ctx.strokeStyle = '#747d8c';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx + ww - 38, wy + wh - 6, 42, 26);
            ctx.fillStyle = '#2f3542';
            ctx.beginPath();
            ctx.arc(wx + ww - 18, wy + wh + 7, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      return this.finish(c);
    });

    this._cache.set(key, textures);
    return textures;
  }

  // D. 臺灣經典綠底白字路名牌貼圖 (白框 + 白字)
  static createStreetSignTexture(streetName = '臺灣大道一段') {
    const key = `street_sign_${streetName}`;
    if (this._cache.has(key)) return this._cache.get(key);

    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');

    // 臺灣標準路標深綠底色
    ctx.fillStyle = '#0f6b3e';
    ctx.fillRect(0, 0, 512, 128);

    // 白色外框雙線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, 488, 104);

    // 白色粗體中文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Noto Sans TC", "PingFang TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(streetName, 256, 64);

    const tex = this.finish(c, false);
    this._cache.set(key, tex);
    return tex;
  }
}

// ============================================================================
// 2. 臺灣騎樓透天街屋 3D 幾何建構器 (Procedural Taiwan Arcade Shophouse)
// ============================================================================
export class TaiwanArcadeBuilder {
  /**
   * 生成單棟逼真臺灣騎樓街屋幾何
   * Material Index 對照表：
   * 0: 屋頂水泥
   * 1: 騎樓磨石子地坪
   * 2: 騎樓正面承重立柱
   * 3: 白鐵不鏽鋼水塔
   * 4 ~ 13: 10 款真實臺灣騎樓店面
   * 14 ~ 18: 5 款真實臺灣住宅/商辦上層立面
   */
  static createArcadeShophouseMesh(center, faceAngle, width, depth, height, styleIdx = 0) {
    const arcadeDepth = 3.2; // 騎樓淨退縮深度 3.2 米
    const arcadeH = 3.5;     // 騎樓淨高度 3.5 米
    const upperH = height - arcadeH;

    const parts = [];

    const matStore = 4 + (styleIdx % 10);
    const matUpper = 14 + ((styleIdx + 1) % 5);

    // 1. 1F 騎樓地坪 (高度 0.22m 與人行道平接)
    const floorGeom = new THREE.BoxGeometry(width * 0.98, 0.08, arcadeDepth).toNonIndexed();
    floorGeom.translate(0, 0.18, depth / 2 - arcadeDepth / 2);
    floorGeom.clearGroups();
    floorGeom.addGroup(0, floorGeom.attributes.position.count, 1);
    parts.push(floorGeom);

    // 2. 1F 內退店面本體 (Recessed Ground Floor Mass)
    // BoxGeometry 非索引面順序：+X(0..5), -X(6..11), +Y(12..17), -Y(18..23), +Z(24..29, 正面店門看板), -Z(30..35)
    const backDepth = depth - arcadeDepth;
    const groundBox = new THREE.BoxGeometry(width, arcadeH, backDepth).toNonIndexed();
    groundBox.translate(0, arcadeH / 2, -arcadeDepth / 2);
    groundBox.clearGroups();
    groundBox.addGroup(0, 24, 0);             // 左右隔戶牆、頂底為素色水泥
    groundBox.addGroup(24, 6, matStore);      // +Z 面為真實臺灣商家店面 (玻璃門、櫃台、招牌)
    groundBox.addGroup(30, 6, 0);             // -Z 背面後巷素色
    parts.push(groundBox);

    // 3. 騎樓正面承重立柱 (Arcade Pillars / 亭仔腳柱)
    const colW = 0.52;
    const colGeom1 = new THREE.BoxGeometry(colW, arcadeH, colW).toNonIndexed();
    colGeom1.translate(-width / 2 + colW / 2 + 0.1, arcadeH / 2, depth / 2 - colW / 2 - 0.1);
    colGeom1.clearGroups();
    colGeom1.addGroup(0, colGeom1.attributes.position.count, 2);
    parts.push(colGeom1);

    const colGeom2 = new THREE.BoxGeometry(colW, arcadeH, colW).toNonIndexed();
    colGeom2.translate(width / 2 - colW / 2 - 0.1, arcadeH / 2, depth / 2 - colW / 2 - 0.1);
    colGeom2.clearGroups();
    colGeom2.addGroup(0, colGeom2.attributes.position.count, 2);
    parts.push(colGeom2);

    // 4. 2F ~ 5F 懸臂外推主體量體 (Cantilevered Upper Building Mass)
    const upperBox = new THREE.BoxGeometry(width, upperH, depth).toNonIndexed();
    upperBox.translate(0, arcadeH + upperH / 2, 0);
    upperBox.clearGroups();
    upperBox.addGroup(0, 12, matUpper);       // +X, -X 側牆二丁掛磁磚
    upperBox.addGroup(12, 6, 0);              // +Y 屋頂混凝土
    upperBox.addGroup(18, 6, 0);              // -Y 騎樓頂棚水泥平頂
    upperBox.addGroup(24, 6, matUpper);       // +Z 正立面 (磁磚、鐵窗花、冷氣室外機)
    upperBox.addGroup(30, 6, matUpper);       // -Z 背立面
    parts.push(upperBox);

    // 5. 3D 橫式店面主招牌
    const signH = 1.35;
    const signBox = new THREE.BoxGeometry(width * 0.96, signH, 0.45).toNonIndexed();
    signBox.translate(0, arcadeH + signH / 2 - 0.2, depth / 2 + 0.22);
    signBox.clearGroups();
    signBox.addGroup(0, 24, 0);               // 邊框外殼
    signBox.addGroup(24, 6, matStore);        // 正面店招
    signBox.addGroup(30, 6, 0);               // 背面底座
    parts.push(signBox);

    // 6. 3D 側掛直立式街道燈箱招牌 (面朝車道兩端行車視角 +X/-X)
    const bladeW = 0.24, bladeH = 2.8, bladeD = 1.3;
    const bladeBox = new THREE.BoxGeometry(bladeW, bladeH, bladeD).toNonIndexed();
    bladeBox.translate(width * 0.45, arcadeH + bladeH / 2 + 0.8, depth / 2 + bladeD / 2);
    bladeBox.clearGroups();
    bladeBox.addGroup(0, 12, matStore);       // +X, -X 兩側燈箱展示面
    bladeBox.addGroup(12, 24, 0);             // 燈箱邊框與底座素色金屬
    parts.push(bladeBox);

    // 7. 頂樓加蓋設施 (白鐵不鏽鋼水塔 + 女兒牆)
    const tank = new THREE.CylinderGeometry(0.85, 0.85, 1.8, 10).toNonIndexed();
    tank.translate(width * 0.22, height + 0.9, -depth * 0.15);
    tank.clearGroups();
    tank.addGroup(0, tank.attributes.position.count, 3);
    parts.push(tank);

    const parapet = new THREE.BoxGeometry(width * 0.98, 0.9, depth * 0.98).toNonIndexed();
    parapet.translate(0, height + 0.45, 0);
    parapet.clearGroups();
    parapet.addGroup(0, parapet.attributes.position.count, 0);
    parts.push(parapet);

    // 保留各部件獨立群組，完美映射多重材質陣列
    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    if (!merged) return null;

    merged.clearGroups();
    let gOffset = 0;
    for (const p of parts) {
      const pCount = p.index ? p.index.count : p.attributes.position.count;
      if (p.groups && p.groups.length > 0) {
        for (const grp of p.groups) {
          merged.addGroup(gOffset + grp.start, grp.count, grp.materialIndex);
        }
      } else {
        merged.addGroup(gOffset, pCount, 0);
      }
      gOffset += pCount;
    }

    merged.rotateY(faceAngle);
    merged.translate(center.x, 0, center.z);
    merged.computeVertexNormals();

    return merged;
  }
}

// ============================================================================
// 3. 臺灣標準 L 型懸臂交通號誌燈系統 (Taiwan Cantilever Traffic Signals)
// ============================================================================
export class TaiwanTrafficSignalSystem {
  static createSignalPoleGeometry() {
    // 1. 直立號誌立桿 (7.0m 高)
    const post = new THREE.CylinderGeometry(0.12, 0.16, 7.0, 8).toNonIndexed();
    post.translate(0, 3.5, 0);

    // 2. 桿底黃黑斜紋防撞包覆
    const baseWrap = new THREE.CylinderGeometry(0.2, 0.24, 1.6, 8).toNonIndexed();
    baseWrap.translate(0, 0.8, 0);

    // 3. 橫向懸臂鋼構 (+X 延伸 5.2 米橫跨車道上空)
    const mastArm = new THREE.BoxGeometry(5.2, 0.14, 0.14).toNonIndexed();
    mastArm.translate(2.6, 6.35, 0);

    // 4. 車道主號誌燈箱 (橫式三色箱體，正面朝向 +Z 迎面來車)
    const sigBox = new THREE.BoxGeometry(1.4, 0.48, 0.38).toNonIndexed();
    sigBox.translate(4.2, 6.1, 0);

    // 5. 綠底白字路名牌背板 (安裝於懸臂上方)
    const streetPlate = new THREE.BoxGeometry(2.2, 0.55, 0.06).toNonIndexed();
    streetPlate.translate(2.2, 6.8, 0.02);

    // 6. 行人專用號誌燈箱 (立桿人行道側)
    const pedBox = new THREE.BoxGeometry(0.32, 0.64, 0.28).toNonIndexed();
    pedBox.translate(0, 2.8, 0.25);

    return BufferGeometryUtils.mergeGeometries([post, baseWrap, mastArm, sigBox, streetPlate, pedBox], false);
  }

  static createLensesGeometry() {
    // 車道號誌朝向 +Z (迎面車流視角)
    // 紅燈 (左側 x = 3.75)
    const lensR = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12).toNonIndexed();
    lensR.rotateX(Math.PI / 2);
    lensR.translate(3.75, 6.1, 0.2);

    // 黃燈 (中央 x = 4.20)
    const lensY = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12).toNonIndexed();
    lensY.rotateX(Math.PI / 2);
    lensY.translate(4.20, 6.1, 0.2);

    // 綠燈 (右側 x = 4.65)
    const lensG = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12).toNonIndexed();
    lensG.rotateX(Math.PI / 2);
    lensG.translate(4.65, 6.1, 0.2);

    return { lensR, lensY, lensG };
  }
}
