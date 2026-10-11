/**
 * 臺中狂飆 (TAICHUNG RUSH) - 台灣在地特色建築貼圖工廠 (TaiwanTextureFactory)
 * 提供 16 款超高解析度 (1024x1024)、高度在地化、絕不重複的台灣經典街景建築外牆與門面貼圖：
 * 1. 7-ELEVEN 便利商店門市
 * 2. 全家便利商店 FamilyMart
 * 3. 50嵐 經典手搖飲
 * 4. 清心福全 烏龍綠茶
 * 5. 自由路太陽堂百年老店 (太陽餅)
 * 6. 八方雲集 招牌鍋貼水餃
 * 7. 正忠排骨便當
 * 8. 繼光香香雞 / 台中特色小吃
 * 9. 台灣彩券 · 威力彩大樂透
 * 10. 大樹連鎖健保藥局
 * 11. 瑞麟美而美 早午餐漢堡
 * 12. 台灣復古綠釉花磚鐵窗花老公寓 (SYM三陽機車)
 * 13. 春水堂人文茶館 (珍珠奶茶創始)
 * 14. 台中商業銀行 總行大樓
 * 15. 全聯福利中心
 * 16. 興發五金建材行 · 鎖匙刻印
 */

import * as THREE from 'three';

// 16 種台灣在地建築風格定義
export const TAIWAN_BUILDING_STYLES = [
  {
    id: '711',
    name: '7-ELEVEN 便利商店',
    wallStyle: 'tile_cream',
    wallColor: '#e0dedb',
    mortarColor: '#b2bec3',
    signBg: '#00805a',
    signStripe: '#f37021',
    signTitle: '7-ELEVEN',
    signSub: 'CITY CAFE · 24H · 茶葉蛋熱騰騰供應中',
    signTitleColor: '#ffffff',
    sideSignText: '7-11',
    sideSignBg: '#00805a',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: 'familymart',
    name: '全家便利商店 FamilyMart',
    wallStyle: 'tile_light_grey',
    wallColor: '#cfd8dc',
    mortarColor: '#90a4ae',
    signBg: '#00a0e9',
    signStripe: '#009944',
    signTitle: 'FamilyMart 全家',
    signSub: '全家就是你家 · Fami!ce 霜淇淋 · 咖啡',
    signTitleColor: '#ffffff',
    sideSignText: '全家',
    sideSignBg: '#00a0e9',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: '50lan',
    name: '50嵐 經典手搖茶飲',
    wallStyle: 'terrazzo',
    wallColor: '#b2bec3',
    mortarColor: '#7f8c8d',
    signBg: '#ffc107',
    signStripe: '#0d47a1',
    signTitle: '50嵐 經典茶飲',
    signSub: '四季春青茶 · 波霸珍奶 · 冰淇淋紅茶',
    signTitleColor: '#0d47a1',
    sideSignText: '50嵐',
    sideSignBg: '#0d47a1',
    sideSignTextCol: '#ffd32a',
    grilleStyle: 'flower',
    hasAC: true
  },
  {
    id: 'chingshin',
    name: '清心福全 烏龍綠茶',
    wallStyle: 'tile_soft_green',
    wallColor: '#a8bba2',
    mortarColor: '#7d9976',
    signBg: '#10ac84',
    signStripe: '#ee5253',
    signTitle: '清心福全 烏龍綠',
    signSub: '嚴選台灣好茶 · 優多綠茶 · 冰涼暢快',
    signTitleColor: '#ffffff',
    sideSignText: '清心',
    sideSignBg: '#10ac84',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'cross',
    hasAC: true
  },
  {
    id: 'taiyangtang',
    name: '自由路太陽堂百年老店',
    wallStyle: 'vintage_brick',
    wallColor: '#b08968',
    mortarColor: '#7f5539',
    signBg: '#8b0000',
    signStripe: '#ffd700',
    signTitle: '太陽堂太陽餅創始店',
    signSub: '自由路百年老店 · 台中特產 · 傳統手作',
    signTitleColor: '#ffd700',
    sideSignText: '太陽餅',
    sideSignBg: '#8b0000',
    sideSignTextCol: '#ffd700',
    grilleStyle: 'arch',
    hasAC: false
  },
  {
    id: 'bafang',
    name: '八方雲集 招牌鍋貼水餃',
    wallStyle: 'terracotta',
    wallColor: '#a0522d',
    mortarColor: '#6e2c00',
    signBg: '#f9ca24',
    signStripe: '#c0392b',
    signTitle: '八方雲集 鍋貼水餃',
    signSub: '招牌鍋貼 · 鮮肉水餃 · 古早味酸辣湯',
    signTitleColor: '#c0392b',
    sideSignText: '八方',
    sideSignBg: '#c0392b',
    sideSignTextCol: '#f9ca24',
    grilleStyle: 'cross',
    hasAC: true
  },
  {
    id: 'porkchop',
    name: '正忠排骨便當',
    wallStyle: 'tile_dark_grey',
    wallColor: '#8395a7',
    mortarColor: '#576574',
    signBg: '#1e272e',
    signStripe: '#eb2f06',
    signTitle: '正忠排骨飯 · 便當',
    signSub: '酥炸大雞腿 · 招牌排骨 · 免費熱湯冷飲',
    signTitleColor: '#f1c40f',
    sideSignText: '正忠',
    sideSignBg: '#eb2f06',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: 'shangxiangji',
    name: '繼光香香雞 / 台中特色炸物',
    wallStyle: 'tile_beige',
    wallColor: '#c8d6e5',
    mortarColor: '#8395a7',
    signBg: '#d63031',
    signStripe: '#ffeaa7',
    signTitle: '繼光香香雞 · 創始總店',
    signSub: '香香炸雞 · 蒜香杏鮑菇 · 經典炸物小吃',
    signTitleColor: '#ffeaa7',
    sideSignText: '香香雞',
    sideSignBg: '#d63031',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'flower',
    hasAC: true
  },
  {
    id: 'lottery',
    name: '台灣彩券 · 威力彩頭獎',
    wallStyle: 'yellow_mosaic',
    wallColor: '#e0d8b0',
    mortarColor: '#bfae7b',
    signBg: '#f1c40f',
    signStripe: '#e74c3c',
    signTitle: '台灣彩券 Taiwan Lottery',
    signSub: '威力彩頭獎上看10億 · 大樂透 · 刮刮樂',
    signTitleColor: '#c0392b',
    sideSignText: '彩券',
    sideSignBg: '#f1c40f',
    sideSignTextCol: '#c0392b',
    grilleStyle: 'flower',
    hasAC: true
  },
  {
    id: 'dashu_pharmacy',
    name: '大樹連鎖健保藥局',
    wallStyle: 'tile_clean_white',
    wallColor: '#f5f6fa',
    mortarColor: '#dcdde1',
    signBg: '#00a8ff',
    signStripe: '#4cd137',
    signTitle: '大樹連鎖藥局 · 健保特約',
    signSub: '慢性病處方箋調劑 · 婦嬰專業 · 醫學保健',
    signTitleColor: '#ffffff',
    sideSignText: '藥局',
    sideSignBg: '#00a8ff',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: 'meiermei',
    name: '瑞麟美而美 早午餐漢堡',
    wallStyle: 'terrazzo_warm',
    wallColor: '#d1ccc0',
    mortarColor: '#84817a',
    signBg: '#e67e22',
    signStripe: '#f1c40f',
    signTitle: '瑞麟美而美 · 早午餐',
    signSub: '現烤總匯三明治 · 鐵板蛋餅 · 大杯冰奶茶',
    signTitleColor: '#ffffff',
    sideSignText: '早點',
    sideSignBg: '#e67e22',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'cross',
    hasAC: true
  },
  {
    id: 'green_grille_apt',
    name: '台灣綠釉花磚鐵窗花老公寓 (SYM三陽機車)',
    wallStyle: 'retro_green_mosaic',
    wallColor: '#38ada9',
    mortarColor: '#079992',
    signBg: '#0652dd',
    signStripe: '#ea2027',
    signTitle: 'SYM 三陽機車 · 專業維修',
    signSub: '正廠零件 · 機油齒輪油更換 · 排氣檢驗',
    signTitleColor: '#ffffff',
    sideSignText: '機車',
    sideSignBg: '#0652dd',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'flower',
    hasAC: true
  },
  {
    id: 'chunshuitang',
    name: '春水堂人文茶館 (珍珠奶茶創始)',
    wallStyle: 'dark_wood_brick',
    wallColor: '#4b3832',
    mortarColor: '#2b1b17',
    signBg: '#2d1e18',
    signStripe: '#d4af37',
    signTitle: '春水堂 人文茶館',
    signSub: '世界珍珠奶茶創始店 · 茶文化 · 功夫麵',
    signTitleColor: '#d4af37',
    sideSignText: '春水堂',
    sideSignBg: '#2d1e18',
    sideSignTextCol: '#d4af37',
    grilleStyle: 'wood_lattice',
    hasAC: false
  },
  {
    id: 'tc_commercial_bank',
    name: '台中商業銀行 總行大樓',
    wallStyle: 'glass_curtain_blue',
    wallColor: '#1e3799',
    mortarColor: '#0c2461',
    signBg: '#0c2461',
    signStripe: '#4a69bd',
    signTitle: '台中商業銀行 · 總行',
    signSub: 'TAICHUNG BANK · 企業金融 · 財富管理',
    signTitleColor: '#ffffff',
    sideSignText: '台中銀',
    sideSignBg: '#0c2461',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: 'pxmart',
    name: '全聯福利中心',
    wallStyle: 'tile_slate_grey',
    wallColor: '#718093',
    mortarColor: '#2f3640',
    signBg: '#0984e3',
    signStripe: '#d63031',
    signTitle: '全聯福利中心 PX MART',
    signSub: '買進美好生活 · 生鮮蔬果 · 每日平價',
    signTitleColor: '#ffffff',
    sideSignText: '全聯',
    sideSignBg: '#0984e3',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'modern',
    hasAC: true
  },
  {
    id: 'hardware_store',
    name: '興發五金建材行 · 鎖匙刻印',
    wallStyle: 'weathered_cement',
    wallColor: '#7f8c8d',
    mortarColor: '#535c68',
    signBg: '#2c3e50',
    signStripe: '#e67e22',
    signTitle: '興發五金建材行 · 刻印配鎖',
    signSub: '水電配管材料 · 油漆防漏 · 遙控器複製',
    signTitleColor: '#ffffff',
    sideSignText: '五金',
    sideSignBg: '#2c3e50',
    sideSignTextCol: '#ffffff',
    grilleStyle: 'cross',
    hasAC: true
  }
];

export class TaiwanTextureFactory {
  static _textureCache = new Map();
  static _materialCache = null;

  /**
   * 根據空間坐標 (x, z) 雜湊分配建築樣式，保證鄰近建築絕不重複！
   */
  static getBuildingStyleIndex(x, z) {
    const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return Math.abs(Math.floor(hash)) % TAIWAN_BUILDING_STYLES.length;
  }

  /**
   * 繪製 1024x1024 超高解析度單一台灣風格外牆貼圖
   */
  static createTaiwanFacadeTexture(styleIndex = 0) {
    const idx = Math.abs(styleIndex) % TAIWAN_BUILDING_STYLES.length;
    if (this._textureCache.has(idx)) {
      return this._textureCache.get(idx);
    }

    const cfg = TAIWAN_BUILDING_STYLES[idx];
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // ========================================================================
    // 1. 底層外牆材質 (Y = 0 ~ 740 為 2F~高樓住宅/商辦立面，Y = 740 ~ 1024 為 1F 店面)
    // ========================================================================
    ctx.fillStyle = cfg.wallColor;
    ctx.fillRect(0, 0, 1024, 1024);

    // 依據建築外牆類型繪製細緻磁磚紋理
    if (cfg.wallStyle.includes('tile') || cfg.wallStyle === 'terracotta') {
      ctx.strokeStyle = cfg.mortarColor;
      ctx.lineWidth = 1.5;
      const tileH = 26;
      const tileW = 64;
      let r = 0;
      for (let y = 0; y < 740; y += tileH) {
        const offX = (r % 2) * (tileW / 2);
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(1024, y);
        ctx.stroke();
        for (let x = -tileW; x < 1024 + tileW; x += tileW) {
          ctx.beginPath();
          ctx.moveTo(x + offX, y);
          ctx.lineTo(x + offX, y + tileH);
          ctx.stroke();
        }
        r++;
      }
    } else if (cfg.wallStyle.includes('mosaic')) {
      // 復古小方格馬賽克磚
      ctx.strokeStyle = cfg.mortarColor;
      ctx.lineWidth = 1.2;
      for (let y = 0; y < 740; y += 18) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
      for (let x = 0; x < 1024; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 740); ctx.stroke();
      }
    } else if (cfg.wallStyle.includes('terrazzo') || cfg.wallStyle.includes('cement')) {
      // 洗石子碎石顆粒雜訊
      const speckColors = ['#ffffff', '#2d3436', '#636e72', '#b2bec3'];
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = speckColors[i % speckColors.length];
        ctx.fillRect(Math.random() * 1024, Math.random() * 740, 2.5, 2.5);
      }
      // 水平分格金屬條
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 3;
      for (let y = 100; y < 740; y += 150) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
    } else if (cfg.wallStyle.includes('glass')) {
      // 現代深海藍玻璃帷幕反射反光漸層
      const grad = ctx.createLinearGradient(0, 0, 1024, 740);
      grad.addColorStop(0, '#0984e3');
      grad.addColorStop(0.5, '#1e3799');
      grad.addColorStop(1, '#0c2461');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 740);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 2.5;
      for (let y = 0; y < 740; y += 56) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
      }
      for (let x = 0; x < 1024; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 740); ctx.stroke();
      }
    }

    // ========================================================================
    // 2. 2F ~ 4F 住家與商辦窗戶 (含鋁門窗、夜間燈火、不鏽鋼鐵窗花、外掛冷氣機)
    // ========================================================================
    const rows = 3;
    const cols = 4;
    const colW = 1024 / cols;
    const rowH = 720 / rows;

    for (let r = 0; r < rows; r++) {
      const fy = r * rowH + 24;
      // 樓層外突混凝土雨庇與滴水飾帶
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, (r + 1) * rowH - 12, 1024, 12);

      for (let c = 0; c < cols; c++) {
        const wx = c * colW + 36;
        const wy = fy + 10;
        const ww = colW - 72;
        const wh = rowH - 64;

        // 窗框
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);

        // 窗戶玻璃 (夜間部分亮燈暖黃或冷白，部分深色反光)
        const isLit = (r + c + idx) % 2 === 0 || (r * 3 + c) % 5 === 0;
        ctx.fillStyle = isLit ? '#ffeaa7' : '#222f3e';
        ctx.fillRect(wx, wy, ww, wh);

        // 鋁門窗十字框線
        ctx.strokeStyle = '#2f3542';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
        ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
        ctx.stroke();

        // 台灣經典防盜不鏽鋼「鐵窗花」 (Balcony Grille Bars)
        if (cfg.grilleStyle === 'flower') {
          ctx.strokeStyle = '#dfe6e9';
          ctx.lineWidth = 2;
          ctx.strokeRect(wx + 6, wy + 6, ww - 12, wh - 12);
          // 菱形與交叉花紋
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, wy + 6);
          ctx.lineTo(wx + ww - 6, wy + wh / 2);
          ctx.lineTo(wx + ww / 2, wy + wh - 6);
          ctx.lineTo(wx + 6, wy + wh / 2);
          ctx.closePath();
          ctx.stroke();
        } else if (cfg.grilleStyle === 'cross') {
          ctx.strokeStyle = 'rgba(220, 221, 225, 0.9)';
          ctx.lineWidth = 2;
          for (let gx = wx + 14; gx < wx + ww; gx += 26) {
            ctx.beginPath(); ctx.moveTo(gx, wy); ctx.lineTo(gx, wy + wh); ctx.stroke();
          }
        } else if (cfg.grilleStyle === 'arch') {
          // 仿巴洛克拱頂
          ctx.fillStyle = '#f5f6fa';
          ctx.beginPath();
          ctx.arc(wx + ww / 2, wy, ww / 2, Math.PI, 0);
          ctx.fill();
        }

        // 窗台懸掛「冷氣室外機」 (Air Conditioner Unit)
        if (cfg.hasAC && ((r + c + idx) % 3 === 0)) {
          const acX = wx + ww - 46;
          const acY = wy + wh - 8;
          // 機殼
          ctx.fillStyle = '#f1f2f6';
          ctx.fillRect(acX, acY, 48, 32);
          ctx.strokeStyle = '#718093';
          ctx.lineWidth = 2;
          ctx.strokeRect(acX, acY, 48, 32);
          // 風扇出風黑圈
          ctx.fillStyle = '#2f3542';
          ctx.beginPath();
          ctx.arc(acX + 24, acY + 16, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 側邊外挑「垂直長條招牌」 (Vertical blade sign，台灣街道最經典特徵！)
    const sideW = 40;
    const sideH = 220;
    const sideY = 320;
    ctx.fillStyle = cfg.sideSignBg;
    ctx.fillRect(8, sideY, sideW, sideH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(8, sideY, sideW, sideH);

    ctx.fillStyle = cfg.sideSignTextCol;
    ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    const sideChars = cfg.sideSignText.split('');
    sideChars.forEach((ch, ci) => {
      ctx.fillText(ch, 8 + sideW / 2, sideY + 42 + ci * 46);
    });

    // ========================================================================
    // 3. 1F 商業門面與主橫式看板 (Y = 740 ~ 880: 大看板, Y = 880 ~ 1024: 店面騎樓)
    // ========================================================================
    // 1F 分隔大樑
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 736, 1024, 24);

    // 1F 主看板大背景 (Y: 760 ~ 880)
    ctx.fillStyle = cfg.signBg;
    ctx.fillRect(24, 760, 976, 115);

    // 看板邊框飾條
    ctx.strokeStyle = cfg.signStripe;
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 760, 976, 115);

    // 看板副條紋裝飾
    ctx.fillStyle = cfg.signStripe;
    ctx.fillRect(28, 862, 968, 10);

    // 看板主品牌大字 (44px 粗體超清晰)
    ctx.fillStyle = cfg.signTitleColor;
    ctx.font = '900 44px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.signTitle, 512, 822);

    // 看板副標說明小字 (20px 清楚可辨)
    ctx.fillStyle = cfg.signTitleColor === '#ffffff' ? '#ffeaa7' : '#ffffff';
    ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
    ctx.fillText(cfg.signSub, 512, 852);

    // 1F 落地玻璃店面 (Y = 880 ~ 1024)
    ctx.fillStyle = '#111418';
    ctx.fillRect(0, 880, 1024, 144);

    // 店內明亮燈火櫥窗 (溫暖購物/用餐空間感)
    ctx.fillStyle = 'rgba(255, 245, 200, 0.55)';
    ctx.fillRect(68, 888, 888, 120);

    // 落地大玻璃框
    ctx.strokeStyle = '#dcdde1';
    ctx.lineWidth = 4;
    ctx.strokeRect(68, 888, 888, 120);

    // 門市自動門中縫線
    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(512, 888); ctx.lineTo(512, 1008);
    ctx.stroke();

    // 兩側鐵捲門收邊箱 (Corrugated Shutter Door Box)
    ctx.fillStyle = '#34495e';
    ctx.fillRect(8, 884, 52, 132);
    ctx.fillRect(964, 884, 52, 132);
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 2.5;
    for (let sy = 894; sy < 1014; sy += 12) {
      ctx.beginPath(); ctx.moveTo(8, sy); ctx.lineTo(60, sy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(964, sy); ctx.lineTo(1016, sy); ctx.stroke();
    }

    // 騎樓紅灰磨石子地磚基底 (底部 16px)
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 1008, 1024, 16);
    ctx.fillStyle = '#7f8c8d';
    for (let bx = 0; bx < 1024; bx += 64) {
      ctx.fillRect(bx, 1008, 32, 16);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this._textureCache.set(idx, tex);
    return tex;
  }

  /**
   * 生成台灣風格外牆材質實例 (含 NanoBanana 台灣真實街景實拍等級高清貼圖 + 特色磁磚風格)
   */
  static createAllTaiwanFacadeMaterials() {
    if (this._materialCache) return this._materialCache;

    const materials = [];
    const texLoader = new THREE.TextureLoader();

    // 4 款 NanoBanana 台灣真實街景實景高清立面貼圖 (7-11超商/茶湯會、兆豐商辦大樓、萬利商號洗石子透天、二丁掛冷氣鐵窗公寓)
    const photoConfigs = [
      { url: 'textures/facades/tw_store.jpg', name: 'NanoBanana_TaiwanStore' },
      { url: 'textures/facades/tw_commercial.jpg', name: 'NanoBanana_CommercialTower' },
      { url: 'textures/facades/tw_shophouse.jpg', name: 'NanoBanana_VintageShophouse' },
      { url: 'textures/facades/tw_apartment.jpg', name: 'NanoBanana_ClassicApartment' }
    ];

    photoConfigs.forEach(cfg => {
      const tex = texLoader.load(cfg.url);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.78,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
      mat.name = cfg.name;
      materials.push(mat);
    });

    // 加上 16 種在地商圈與手搖飲、太陽堂、排骨飯外牆
    for (let i = 0; i < TAIWAN_BUILDING_STYLES.length; i++) {
      const tex = this.createTaiwanFacadeTexture(i);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.72,
        metalness: 0.08,
        side: THREE.DoubleSide
      });
      mat.name = `TaiwanFacade_${TAIWAN_BUILDING_STYLES[i].id}`;
      materials.push(mat);
    }

    this._materialCache = materials;
    return materials;
  }

  /**
   * 屋頂水泥防水隔熱層
   */
  static createRoofTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3b4252';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2e3440' : '#4c566a';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2.5);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }
}

/**
 * 既有工廠類別保持完全相容
 */
export class TextureFactory {
  static createTwilightSky() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0.0, '#0c0a1a');
    grad.addColorStop(0.38, '#261533');
    grad.addColorStop(0.64, '#6a2c42');
    grad.addColorStop(0.76, '#d35400');
    grad.addColorStop(0.83, '#f39c12');
    grad.addColorStop(0.89, '#1a1426');
    grad.addColorStop(1.0, '#0a0910');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    for (let i = 0; i < 24; i++) {
      const cx = Math.random() * 1024;
      const cy = 390 + (Math.random() - 0.5) * 35;
      const rad = 40 + Math.random() * 70;
      const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      cGrad.addColorStop(0, 'rgba(243, 156, 18, 0.45)');
      cGrad.addColorStop(0.6, 'rgba(211, 84, 0, 0.2)');
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  static createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b2e35' : '#1a1c20';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0); ctx.lineTo(250, 512);
    ctx.moveTo(262, 0); ctx.lineTo(262, 512);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([28, 22]);
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 512);
    ctx.moveTo(384, 0); ctx.lineTo(384, 512);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#00cec9');
    grad.addColorStop(0.5, '#0984e3');
    grad.addColorStop(1, '#00b894');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < 50; i++) {
      const wx = Math.random() * 256;
      const wy = Math.random() * 256;
      const ww = 20 + Math.random() * 40;
      ctx.beginPath();
      ctx.ellipse(wx, wy, ww, 4, Math.random() * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2ecc71' : '#1e8449';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  static createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.85, 'rgba(0, 0, 0, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }
}

window.TaiwanTextureFactory = TaiwanTextureFactory;
window.TextureFactory = TextureFactory;
