/**
 * facadeTextures.js
 * 台灣街景「分層」建築立面系統：
 *  - 1 樓店面貼圖 (騎樓店街、便利商店、銀行大廳、小吃店、住宅一樓、藥局診所)
 *  - 2 樓以上樓層貼圖 (磁磚公寓、洗石子老公寓、帶狀窗辦公大樓、玻璃帷幕、新建大樓、老透天、粉彩住宅、混凝土老宅)
 *  - 依建築高度挑選樣式，並以頂點色做每棟建築的明暗/色偏變化，徹底消除「一整排長得一樣」的單調感
 *  - 自建牆面幾何：1 樓與 2 樓以上分段貼圖，樓層高度固定 3.3m，不再每 12m 重複出現店面
 */

import * as THREE from 'three';

// 樓層/貼圖尺寸 (公尺)
export const SHOP_H = 4.5;       // 1 樓高度
export const TILE_W = 10.5;      // 貼圖橫向涵蓋公尺
export const UPPER_TILE_H = 13.2; // 4 層樓 x 3.3m

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finish(canvas, repeat = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glassGradient(ctx, y, h, c1 = '#4f7893', c2 = '#8fb4c8') {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

function noise(ctx, w, h, count, alpha = 0.08) {
  for (let i = 0; i < count; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function drawAC(ctx, x, y, w = 38, h = 24) {
  ctx.fillStyle = '#e8eaec';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#b8bcc0';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 9);
  ctx.strokeStyle = '#8a8e92';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 7 + i * 4);
    ctx.lineTo(x + w - 5, y + 7 + i * 4);
    ctx.stroke();
  }
}

function drawGrill(ctx, x, y, w, h, color = '#3d3d3d') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w * i) / 4, y);
    ctx.lineTo(x + (w * i) / 4, y + h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.5);
  ctx.lineTo(x + w, y + h * 0.5);
  ctx.stroke();
}

function drawWindow(ctx, x, y, w, h, frame = '#e3e6e8', glass = null, split = true) {
  ctx.fillStyle = frame;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = glass || glassGradient(ctx, y, h);
  ctx.fillRect(x, y, w, h);
  if (split) {
    ctx.fillStyle = frame;
    ctx.fillRect(x + w / 2 - 1.5, y, 3, h);
  }
  // 反光斜線
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h);
  ctx.lineTo(x + w * 0.5, y);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// 2 樓以上貼圖 (512 x 640，涵蓋 3 開間 x 4 層)
// ---------------------------------------------------------------------------
const UW = 512, UH = 640, FLOOR = UH / 4, BAY = UW / 3;

function upperTileApartment(variant = 0) {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  const walls = ['#cbb89d', '#d4c4a8', '#bda98a'];
  ctx.fillStyle = walls[variant % 3];
  ctx.fillRect(0, 0, UW, UH);
  // 二丁掛磁磚
  ctx.strokeStyle = 'rgba(80,60,40,0.22)';
  ctx.lineWidth = 1;
  for (let y = 0; y < UH; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(UW, y); ctx.stroke(); }
  for (let r = 0; r < UH / 10; r++) {
    for (let x = (r % 2) * 17; x < UW; x += 34) { ctx.beginPath(); ctx.moveTo(x, r * 10); ctx.lineTo(x, r * 10 + 10); ctx.stroke(); }
  }
  noise(ctx, UW, UH, 2500, 0.07);
  for (let f = 0; f < 4; f++) {
    // 每層陽台板/樓板線
    ctx.fillStyle = 'rgba(235,230,220,0.9)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 16, UW, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 6, UW, 4);
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 28, by = f * FLOOR + 26;
      const big = (f + b + variant) % 3 !== 0;
      const ww = big ? 112 : 78, wh = 86;
      drawWindow(ctx, bx, by, ww, wh, '#dfe3e5');
      if (((f * 3 + b + variant) % 2) === 0) drawGrill(ctx, bx - 4, by - 4, ww + 8, wh + 8);
      if ((f + b * 2 + variant) % 3 === 1) drawAC(ctx, bx + ww + 8, by + wh - 14);
      if ((f + b) % 4 === 2) {
        // 陽台盆栽
        ctx.fillStyle = '#3f7a3c';
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(bx + 8 + k * 14, by + wh + 14, 7, 0, Math.PI * 2); ctx.fill(); }
      }
      if ((f * 5 + b * 3 + variant) % 7 === 0) {
        // 曬衣桿 + 衣物
        const cols = ['#d9534f', '#f0ad4e', '#5bc0de', '#f5f5f5'];
        for (let k = 0; k < 4; k++) { ctx.fillStyle = cols[k]; ctx.fillRect(bx + 4 + k * 22, by + wh + 6, 14, 22); }
      }
    }
  }
  return finish(c);
}

function upperTileWashStone() {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b8b3a8';
  ctx.fillRect(0, 0, UW, UH);
  noise(ctx, UW, UH, 9000, 0.12);
  // 雨漬
  for (let i = 0; i < 18; i++) {
    const g = ctx.createLinearGradient(0, 0, 0, 130);
    const x = Math.random() * UW, y = Math.random() * UH;
    g.addColorStop(0, 'rgba(60,50,40,0.18)'); g.addColorStop(1, 'rgba(60,50,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 10 + Math.random() * 14, 130);
  }
  for (let f = 0; f < 4; f++) {
    ctx.fillStyle = 'rgba(70,65,60,0.25)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 10, UW, 6);
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 34, by = f * FLOOR + 30;
      drawWindow(ctx, bx, by, 100, 84, '#9aa09f', glassGradient(ctx, by, 84, '#46606f', '#7f9aa6'));
      drawGrill(ctx, bx - 5, by - 5, 110, 94, '#5a3a28');
      if ((f + b) % 3 === 0) drawAC(ctx, bx + 36, by + 94);
    }
  }
  return finish(c);
}

function upperTileOffice() {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d6d9db';
  ctx.fillRect(0, 0, UW, UH);
  noise(ctx, UW, UH, 3000, 0.06);
  for (let f = 0; f < 4; f++) {
    const y = f * FLOOR + 22;
    ctx.fillStyle = glassGradient(ctx, y, 104, '#36607f', '#7aa7c2');
    ctx.fillRect(0, y, UW, 104);
    ctx.fillStyle = '#9ea4a8';
    for (let x = 0; x <= UW; x += 64) ctx.fillRect(x - 2, y, 4, 104);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = 20; x < UW; x += 130) ctx.fillRect(x, y, 22, 104);
    ctx.fillStyle = '#8c9296';
    ctx.fillRect(0, y + 104, UW, 5);
    // 不規則亮燈/窗簾
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(250,240,200,0.28)' : 'rgba(200,210,220,0.3)';
      ctx.fillRect(Math.floor(Math.random() * 8) * 64, y, 64, 104);
    }
  }
  return finish(c);
}

function upperTileCurtainWall() {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, UW, UH);
  g.addColorStop(0, '#2f6f8e'); g.addColorStop(0.5, '#5aa0bd'); g.addColorStop(1, '#2b5f7c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, UW, UH);
  for (let f = 0; f < 4; f++) {
    // 樓板遮蔽帶
    ctx.fillStyle = 'rgba(20,32,44,0.78)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 34, UW, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, f * FLOOR, UW, 8);
  }
  ctx.fillStyle = '#1d2831';
  for (let x = 0; x <= UW; x += 64) ctx.fillRect(x - 2, 0, 4, UH);
  // 隨機反射/開窗
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`;
    ctx.fillRect(Math.floor(Math.random() * 8) * 64 + 2, Math.floor(Math.random() * 4) * FLOOR, 60, FLOOR - 36);
  }
  return finish(c);
}

function upperTileModern(variant = 0) {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = variant ? '#dcd9d2' : '#eceae4';
  ctx.fillRect(0, 0, UW, UH);
  noise(ctx, UW, UH, 2200, 0.05);
  for (let f = 0; f < 4; f++) {
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 14, by = f * FLOOR + 16;
      // 落地玻璃門 + 玻璃欄杆陽台
      ctx.fillStyle = glassGradient(ctx, by, FLOOR - 40, '#3f6f8c', '#8cb8cc');
      ctx.fillRect(bx, by, BAY - 28, FLOOR - 40);
      ctx.fillStyle = '#c4c8ca';
      ctx.fillRect(bx + (BAY - 28) / 2 - 2, by, 4, FLOOR - 40);
      ctx.fillStyle = 'rgba(190,225,240,0.55)';
      ctx.fillRect(bx - 6, by + FLOOR - 62, BAY - 16, 30);
      ctx.strokeStyle = '#8a8f92';
      ctx.strokeRect(bx - 6, by + FLOOR - 62, BAY - 16, 30);
      ctx.fillStyle = '#a7abae';
      ctx.fillRect(bx - 10, by + FLOOR - 34, BAY - 8, 8);
    }
    ctx.fillStyle = variant ? '#8f8a82' : '#9b9e9f';
    for (let b = 0; b <= 3; b++) ctx.fillRect(b * BAY - 3, f * FLOOR, 6, FLOOR);
  }
  return finish(c);
}

function upperTileOldHouse() {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8d6c52';
  ctx.fillRect(0, 0, UW, UH);
  ctx.strokeStyle = 'rgba(40,25,15,0.35)';
  for (let y = 0; y < UH; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(UW, y); ctx.stroke(); }
  for (let r = 0; r < UH / 14; r++) for (let x = (r % 2) * 24; x < UW; x += 48) { ctx.beginPath(); ctx.moveTo(x, r * 14); ctx.lineTo(x, r * 14 + 14); ctx.stroke(); }
  noise(ctx, UW, UH, 4000, 0.1);
  for (let f = 0; f < 4; f++) {
    ctx.fillStyle = '#d2c3a5';
    ctx.fillRect(0, f * FLOOR + FLOOR - 12, UW, 8);
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 44, by = f * FLOOR + 34;
      drawWindow(ctx, bx, by, 82, 82, '#6b5a48', glassGradient(ctx, by, 82, '#3a4a52', '#5c717a'));
      drawGrill(ctx, bx - 6, by - 6, 94, 94, '#7a2c1d');
      // 鐵皮遮雨棚
      ctx.fillStyle = '#5d7a66';
      ctx.fillRect(bx - 12, by - 14, 106, 8);
    }
  }
  return finish(c);
}

function upperTilePastel(variant = 0) {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  const cols = ['#cfe0c8', '#e9d0cf', '#d6dde8', '#efe3c1'];
  ctx.fillStyle = cols[variant % cols.length];
  ctx.fillRect(0, 0, UW, UH);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < UH; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(UW, y); ctx.stroke(); }
  for (let x = 0; x < UW; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, UH); ctx.stroke(); }
  noise(ctx, UW, UH, 1800, 0.06);
  for (let f = 0; f < 4; f++) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 12, UW, 7);
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 30, by = f * FLOOR + 28;
      drawWindow(ctx, bx, by, 108, 88, '#8a6a4a');
      if ((f + b) % 2 === 0) drawAC(ctx, bx + 120, by + 52);
    }
  }
  return finish(c);
}

function upperTileConcrete() {
  const c = document.createElement('canvas');
  c.width = UW; c.height = UH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9ba0a3';
  ctx.fillRect(0, 0, UW, UH);
  noise(ctx, UW, UH, 7000, 0.12);
  for (let i = 0; i < 14; i++) {
    const g = ctx.createLinearGradient(0, 0, 0, 160);
    const x = Math.random() * UW, y = Math.random() * UH;
    g.addColorStop(0, 'rgba(30,30,30,0.22)'); g.addColorStop(1, 'rgba(30,30,30,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 8 + Math.random() * 20, 160);
  }
  for (let f = 0; f < 4; f++) {
    ctx.fillStyle = 'rgba(40,40,40,0.35)';
    ctx.fillRect(0, f * FLOOR + FLOOR - 8, UW, 5);
    for (let b = 0; b < 3; b++) {
      const bx = b * BAY + 20, by = f * FLOOR + 22;
      drawWindow(ctx, bx, by, 50, 96, '#7c8286', glassGradient(ctx, by, 96, '#3d4f5a', '#6d848f'), false);
      drawWindow(ctx, bx + 70, by, 50, 96, '#7c8286', glassGradient(ctx, by, 96, '#3d4f5a', '#6d848f'), false);
      if ((f + b) % 4 === 1) drawAC(ctx, bx + 128, by + 60);
    }
  }
  return finish(c);
}

// ---------------------------------------------------------------------------
// 1 樓店面貼圖 (1024 x 440，涵蓋 10.5m x 4.5m)
// ---------------------------------------------------------------------------
const SW = 1024, SH = 440;
const SHOP_NAMES = ['早餐店', '五金行', '排骨飯', '藥局', '眼鏡行', '房屋仲介', '手搖飲', '麵店', '洗衣店', '機車行', '水果行', '小吃部', '美髮', '診所', '文具行', '燒臘', '豆漿店', '牙醫診所', '補習班', '便當'];
const SIGN_COLORS = ['#c0392b', '#f39c12', '#16a085', '#2c3e50', '#8e44ad', '#d35400', '#1e8449', '#f1c40f', '#2471a3', '#ffffff'];

function drawSign(ctx, x, y, w, h, text, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  const light = ['#ffffff', '#f1c40f'].includes(bg);
  ctx.fillStyle = light ? '#222' : '#fff';
  ctx.font = `bold ${Math.floor(h * 0.62)}px "Noto Sans TC","PingFang TC",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 2);
}

function shopArcade(variant = 0) {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9d2c3';
  ctx.fillRect(0, 0, SW, SH);
  // 騎樓下暗色店面
  ctx.fillStyle = '#2c2a28';
  ctx.fillRect(70, 110, SW - 140, SH - 130);
  const shops = 3;
  const sw = (SW - 140) / shops;
  for (let i = 0; i < shops; i++) {
    const x = 70 + i * sw;
    const name = SHOP_NAMES[(i * 7 + variant * 3) % SHOP_NAMES.length];
    drawSign(ctx, x + 8, 118, sw - 16, 56, name, SIGN_COLORS[(i * 3 + variant) % SIGN_COLORS.length]);
    // 玻璃櫥窗
    ctx.fillStyle = glassGradient(ctx, 190, 190, '#e9d9b0', '#b79f6a');
    ctx.fillRect(x + 14, 190, sw - 28, 190);
    // 商品色塊
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = SIGN_COLORS[(i + k * 2 + variant) % SIGN_COLORS.length];
      ctx.fillRect(x + 28 + k * ((sw - 70) / 6), 300 + (k % 2) * 12, (sw - 70) / 6 - 8, 66);
    }
    // 鐵捲門收起一半
    if ((i + variant) % 2 === 0) {
      ctx.fillStyle = '#9aa0a6';
      ctx.fillRect(x + 14, 182, sw - 28, 52);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let y = 186; y < 232; y += 6) { ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + sw - 14, y); ctx.stroke(); }
    }
  }
  // 騎樓柱
  ctx.fillStyle = '#c9c2b2';
  ctx.fillRect(0, 0, 70, SH);
  ctx.fillRect(SW - 70, 0, 70, SH);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(66, 0, 8, SH);
  ctx.fillRect(SW - 74, 0, 8, SH);
  // 騎樓上緣深梁
  ctx.fillStyle = '#b7b0a0';
  ctx.fillRect(0, 0, SW, 100);
  noise(ctx, SW, SH, 2500, 0.07);
  ctx.fillStyle = '#6b6b6b';
  ctx.fillRect(0, SH - 22, SW, 22);
  return finish(c);
}

function shopConvenience() {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f2f0';
  ctx.fillRect(0, 0, SW, SH);
  // 三色招牌帶
  ctx.fillStyle = '#e8671d'; ctx.fillRect(0, 40, SW, 22);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 62, SW, 14);
  ctx.fillStyle = '#1f9d55'; ctx.fillRect(0, 76, SW, 22);
  drawSign(ctx, 330, 104, 360, 50, '便利商店 24H', '#1f9d55');
  // 大面落地玻璃
  ctx.fillStyle = glassGradient(ctx, 166, 240, '#cfe7f0', '#8fb8c8');
  ctx.fillRect(40, 166, SW - 80, 240);
  ctx.fillStyle = '#d0d3d6';
  for (let x = 40; x <= SW - 40; x += (SW - 80) / 4) ctx.fillRect(x - 3, 166, 6, 240);
  // 貨架/海報
  const colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#e67e22'];
  for (let i = 0; i < 18; i++) { ctx.fillStyle = colors[i % 5]; ctx.fillRect(60 + i * 52, 250 + (i % 3) * 30, 38, 40); }
  ctx.fillStyle = '#555'; ctx.fillRect(0, SH - 24, SW, 24);
  return finish(c);
}

function shopBank() {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8a8d90';
  ctx.fillRect(0, 0, SW, SH);
  noise(ctx, SW, SH, 4000, 0.09);
  ctx.fillStyle = '#23303b'; ctx.fillRect(0, 36, SW, 66);
  drawSign(ctx, 300, 44, 420, 50, '商業銀行', '#0b3c5d');
  ctx.fillStyle = glassGradient(ctx, 120, 290, '#2f5f7d', '#79a3bc');
  ctx.fillRect(70, 120, SW - 140, 290);
  ctx.fillStyle = '#1c242c';
  for (let x = 70; x <= SW - 70; x += (SW - 140) / 5) ctx.fillRect(x - 3, 120, 6, 290);
  // 自動門
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(SW / 2 - 90, 160, 180, 250);
  ctx.fillStyle = '#666'; ctx.fillRect(0, SH - 24, SW, 24);
  return finish(c);
}

function shopEatery(variant = 0) {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = variant ? '#cdbd9d' : '#c9a98a';
  ctx.fillRect(0, 0, SW, SH);
  noise(ctx, SW, SH, 3500, 0.1);
  drawSign(ctx, 160, 52, 704, 92, SHOP_NAMES[(variant * 5 + 2) % SHOP_NAMES.length], variant ? '#c0392b' : '#f1c40f');
  // 紅燈籠
  for (const lx of [90, SW - 90]) {
    ctx.fillStyle = '#d62d20'; ctx.beginPath(); ctx.ellipse(lx, 120, 30, 38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(lx - 8, 76, 16, 8);
  }
  // 開放店面 + 半開鐵捲門
  ctx.fillStyle = '#2f2926'; ctx.fillRect(130, 170, SW - 260, 230);
  ctx.fillStyle = '#9aa0a6'; ctx.fillRect(130, 160, SW - 260, 70);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  for (let y = 164; y < 228; y += 6) { ctx.beginPath(); ctx.moveTo(130, y); ctx.lineTo(SW - 130, y); ctx.stroke(); }
  // 餐桌 + 菜單板
  ctx.fillStyle = '#e8e2d0';
  ctx.fillRect(170, 300, 140, 12); ctx.fillRect(400, 300, 140, 12);
  ctx.fillStyle = '#fafafa'; ctx.fillRect(650, 250, 150, 120);
  ctx.fillStyle = '#c0392b'; for (let i = 0; i < 6; i++) ctx.fillRect(664, 262 + i * 18, 120, 6);
  ctx.fillStyle = '#555'; ctx.fillRect(0, SH - 24, SW, 24);
  return finish(c);
}

function shopResidential() {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c4b8a4';
  ctx.fillRect(0, 0, SW, SH);
  noise(ctx, SW, SH, 3500, 0.1);
  // 鐵門 + 鐵窗
  ctx.fillStyle = '#5b3a2c'; ctx.fillRect(110, 90, 190, 310);
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3;
  for (let x = 124; x < 296; x += 18) { ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x, 396); ctx.stroke(); }
  drawWindow(ctx, 400, 150, 220, 160, '#d7d9db');
  drawGrill(ctx, 392, 142, 236, 176, '#3a3a3a');
  ctx.fillStyle = '#8f9396'; ctx.fillRect(710, 70, 210, 330);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  for (let y = 76; y < 396; y += 8) { ctx.beginPath(); ctx.moveTo(710, y); ctx.lineTo(920, y); ctx.stroke(); }
  // 盆栽
  ctx.fillStyle = '#9c5b3a'; ctx.fillRect(330, 346, 44, 50);
  ctx.fillStyle = '#3f7a3c'; ctx.beginPath(); ctx.arc(352, 336, 32, 0, Math.PI * 2); ctx.fill();
  // 機車 (剪影)
  ctx.fillStyle = '#1b2430'; ctx.fillRect(600, 340, 110, 36);
  ctx.beginPath(); ctx.arc(618, 392, 18, 0, Math.PI * 2); ctx.arc(694, 392, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#555'; ctx.fillRect(0, SH - 24, SW, 24);
  return finish(c);
}

function shopPharmacy() {
  const c = document.createElement('canvas');
  c.width = SW; c.height = SH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eef0ef';
  ctx.fillRect(0, 0, SW, SH);
  drawSign(ctx, 130, 40, 764, 90, '藥局 · 診所', '#16a085');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(110, 52, 56, 56);
  ctx.fillStyle = '#16a085'; ctx.fillRect(130, 58, 16, 44); ctx.fillRect(116, 72, 44, 16);
  ctx.fillStyle = glassGradient(ctx, 150, 250, '#dcefee', '#a8cdd0');
  ctx.fillRect(80, 150, SW - 160, 250);
  // 海報
  const pc = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
  for (let i = 0; i < 8; i++) { ctx.fillStyle = pc[i % 4]; ctx.fillRect(110 + i * 105, 180 + (i % 2) * 40, 70, 100); }
  ctx.fillStyle = '#cfd4d6';
  for (let x = 80; x <= SW - 80; x += (SW - 160) / 4) ctx.fillRect(x - 3, 150, 6, 250);
  ctx.fillStyle = '#666'; ctx.fillRect(0, SH - 24, SW, 24);
  return finish(c);
}

// ---------------------------------------------------------------------------
// 材質工廠
// ---------------------------------------------------------------------------
let _cache = null;

export function getFacadeMaterialSets() {
  if (_cache) return _cache;
  const mk = (map) => new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, vertexColors: true });
  const shops = [
    shopArcade(0), shopArcade(1), shopArcade(2), shopConvenience(), shopBank(),
    shopEatery(0), shopEatery(1), shopResidential(), shopPharmacy()
  ].map(mk);
  const uppers = [
    upperTileApartment(0), upperTileApartment(1), upperTileApartment(2), upperTileWashStone(), upperTileOffice(),
    upperTileCurtainWall(), upperTileModern(0), upperTileModern(1), upperTileOldHouse(),
    upperTilePastel(0), upperTilePastel(1), upperTilePastel(2), upperTileConcrete()
  ].map(mk);
  // 索引分類 (相對於 uppers 陣列)
  _cache = {
    shops,
    uppers,
    classes: {
      tall: [4, 5, 6, 7, 5, 4],            // >= 45m : 辦公/帷幕/新大樓
      high: [4, 5, 6, 7, 0, 9, 1],         // 20~45m
      mid: [0, 1, 2, 3, 9, 10, 11, 12, 6], // 10~20m : 公寓/洗石子/粉彩
      low: [8, 3, 0, 9, 10, 12, 2]         // < 10m : 老透天
    },
    shopByClass: {
      tall: [4, 4, 3, 8],
      high: [4, 3, 0, 1, 8, 5],
      mid: [0, 1, 2, 3, 5, 6, 7, 8],
      low: [7, 5, 6, 0, 2, 7]
    }
  };
  return _cache;
}

function hash2(x, z) {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/**
 * 建立分層貼圖建築幾何。
 * ring: [{x,z}] 世界座標；materialBase: 第一個店面材質在 materials 陣列中的索引 (之後接續上層材質)
 */
export function createLayeredBuildingGeometry(ring, height, cx, cz, shopBase, upperBase) {
  const sets = getFacadeMaterialSets();
  let pts = ring.slice();
  if (pts.length > 1 && Math.abs(pts[0].x - pts[pts.length - 1].x) < 1e-3 && Math.abs(pts[0].z - pts[pts.length - 1].z) < 1e-3) pts.pop();
  const n = pts.length;
  if (n < 3) return null;

  // 面積方向：令 A > 0
  let A = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    A += a.x * b.z - b.x * a.z;
  }
  if (A < 0) pts.reverse();

  const r0 = hash2(cx, cz), r1 = hash2(cz + 3.7, cx - 1.3), r2 = hash2(cx * 0.37, cz * 1.91);
  const cls = height >= 45 ? 'tall' : height >= 20 ? 'high' : height >= 10 ? 'mid' : 'low';
  const upperList = sets.classes[cls];
  const shopList = sets.shopByClass[cls];
  const upperIdx = upperBase + upperList[Math.floor(r0 * upperList.length) % upperList.length];
  const shopIdx = shopBase + shopList[Math.floor(r1 * shopList.length) % shopList.length];

  // 每棟建築的明暗/色偏
  const bright = 0.80 + r2 * 0.30;
  const warm = (r0 - 0.5) * 0.12;
  const col = [Math.min(1.1, bright + warm), bright, Math.min(1.1, bright - warm)];

  const shopTop = Math.min(SHOP_H, height * 0.75);
  const hasUpper = height > shopTop + 0.5;

  const pos = [], nor = [], uvs = [], colors = [];
  const roofPos = [], roofNor = [], roofUv = [], roofCol = [];
  const shopCount = { n: 0 };
  const shopArr = { pos: [], nor: [], uv: [], col: [] };
  const upperArr = { pos: [], nor: [], uv: [], col: [] };

  const pushQuad = (arr, a, b, y0, y1, nx, nz, u0, u1, v0, v1) => {
    const vert = (p, y, u, v) => {
      arr.pos.push(p.x, y, p.z);
      arr.nor.push(nx, 0, nz);
      arr.uv.push(u, v);
      arr.col.push(col[0], col[1], col[2]);
    };
    // (aB, aT, bB) , (bB, aT, bT) -> A>0 時法線朝外
    vert(a, y0, u0, v0); vert(a, y1, u0, v1); vert(b, y0, u1, v0);
    vert(b, y0, u1, v0); vert(a, y1, u0, v1); vert(b, y1, u1, v1);
  };

  let perim = r1 * TILE_W * 3; // 每棟起始貼圖偏移，讓相鄰建築開間錯開
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) continue;
    const nx = dz / len, nz = -dx / len;
    const u0 = perim / TILE_W, u1 = (perim + len) / TILE_W;
    perim += len;
    pushQuad(shopArr, a, b, 0, shopTop, nx, nz, u0, u1, 0, shopTop / SHOP_H);
    if (hasUpper) {
      pushQuad(upperArr, a, b, shopTop, height, nx, nz, u0, u1, 0, (height - shopTop) / UPPER_TILE_H);
    }
  }

  // 屋頂
  const contour = pts.map((p) => new THREE.Vector2(p.x, p.z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const rArr = { pos: [], nor: [], uv: [], col: [] };
  for (const t of tris) {
    let [i0, i1, i2] = t;
    const p0 = contour[i0], p1 = contour[i1], p2 = contour[i2];
    const cross2 = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if (cross2 > 0) { const tmp = i1; i1 = i2; i2 = tmp; } // 令法線朝 +Y
    for (const idx of [i0, i1, i2]) {
      const p = pts[idx];
      rArr.pos.push(p.x, height, p.z);
      rArr.nor.push(0, 1, 0);
      rArr.uv.push(p.x / 16, p.z / 16);
      rArr.col.push(0.9, 0.9, 0.9);
    }
  }

  const geom = new THREE.BufferGeometry();
  const allPos = [...rArr.pos, ...shopArr.pos, ...upperArr.pos];
  const allNor = [...rArr.nor, ...shopArr.nor, ...upperArr.nor];
  const allUv = [...rArr.uv, ...shopArr.uv, ...upperArr.uv];
  const allCol = [...rArr.col, ...shopArr.col, ...upperArr.col];
  geom.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(allNor, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(allCol, 3));

  const rCount = rArr.pos.length / 3, sCount = shopArr.pos.length / 3, uCount = upperArr.pos.length / 3;
  if (rCount) geom.addGroup(0, rCount, 0);
  if (sCount) geom.addGroup(rCount, sCount, shopIdx);
  if (uCount) geom.addGroup(rCount + sCount, uCount, upperIdx);
  return geom;
}
