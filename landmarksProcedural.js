/**
 * landmarksProcedural.js
 * 取代 GLB 的程序化地標建模 (依真實建築形制建立)：
 *  - 臺中火車站 (1917 新文藝復興風格紅磚白帶 + 綠銅瓦孟莎屋頂 + 後方鋼構拱形月台雨棚)
 *  - 李方艾美酒店 (高層玻璃帷幕塔樓 + 裙樓 + 皇冠頂)
 *  - 亞洲大飯店 / 榮達大樓 (石材外牆階梯退縮塔樓)
 *  - 國立自然科學博物館 (展示館群 + 太空劇場銀色球體 + 植物園溫室)
 *  - 國立臺灣美術館 (白色與玻璃量體交錯的現代美術館)
 *  - 大慶車站 (高架月台 + 橋墩 + 波浪形白色月台雨棚 + 地面站房)
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 貼圖
// ---------------------------------------------------------------------------
function finish(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function noise(ctx, w, h, n, a = 0.08) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// 玻璃帷幕 (週期：7.2m x 7.2m = 2 開間 x 2 層)
function glassTowerTexture(c1 = '#2f6f8e', c2 = '#7fb3c9', spandrel = '#1f2d38') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 256);
  gr.addColorStop(0, c1); gr.addColorStop(0.5, c2); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = spandrel;
  g.fillRect(0, 100, 256, 28); g.fillRect(0, 228, 256, 28);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(8, 6, 50, 90); g.fillRect(140, 134, 60, 90);
  g.fillStyle = '#c8d0d6';
  for (const x of [0, 128]) g.fillRect(x, 0, 3, 256);
  return finish(c);
}

// 石材外牆 + 規律開窗 (週期：7.2m x 7.2m)
function stoneGridTexture(wall = '#d8cdb8', glass = '#4d6b7d') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, 2500, 0.08);
  g.strokeStyle = 'rgba(80,70,55,0.25)';
  for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  for (const fy of [0, 128]) {
    for (const bx of [0, 128]) {
      const x = bx + 22, y = fy + 24;
      g.fillStyle = '#a79d8a'; g.fillRect(x - 4, y - 4, 88, 80);
      const gr = g.createLinearGradient(0, y, 0, y + 72);
      gr.addColorStop(0, glass); gr.addColorStop(1, '#86a3b3');
      g.fillStyle = gr; g.fillRect(x, y, 80, 72);
      g.fillStyle = '#a79d8a'; g.fillRect(x + 38, y, 4, 72);
    }
  }
  return finish(c);
}

// 白色美術館外牆 (週期 8m x 8m)：細縫板 + 條形窗
function whitePanelTexture(window = true) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#eeeeea'; g.fillRect(0, 0, 256, 256);
  noise(g, 256, 256, 1500, 0.05);
  g.strokeStyle = 'rgba(120,120,120,0.35)';
  g.lineWidth = 1.5;
  for (let x = 0; x <= 256; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (let y = 0; y <= 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  if (window) {
    g.fillStyle = '#25384a';
    g.fillRect(8, 98, 240, 60);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(24, 100, 70, 56);
  }
  return finish(c);
}

// 紅磚 + 白色石帶 + 拱窗 (台中車站主立面，週期 8m x 8m)
function stationFacadeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#a63f2c'; g.fillRect(0, 0, 256, 256);
  const bh = 8, bw = 22;
  for (let row = 0; row < 32; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 256 + bw; x += bw) {
      const s = (row * 5 + Math.floor(x / bw) * 11) % 3;
      g.fillStyle = ['#9a3828', '#ae4631', '#a03c2a'][s];
      g.fillRect(x + off + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  // 白色水平石帶
  g.fillStyle = '#eee7d6';
  g.fillRect(0, 0, 256, 10); g.fillRect(0, 118, 256, 12); g.fillRect(0, 246, 256, 10);
  // 拱窗 (每 8m 一組兩扇)
  for (const bx of [28, 156]) {
    for (const [wy, hh] of [[26, 84], [146, 84]]) {
      g.fillStyle = '#eee7d6';
      g.fillRect(bx - 5, wy + 10, 74, hh);
      g.beginPath(); g.arc(bx + 32, wy + 14, 37, Math.PI, 0); g.fill();
      g.fillStyle = '#26363f';
      g.fillRect(bx, wy + 14, 64, hh - 6);
      g.beginPath(); g.arc(bx + 32, wy + 14, 32, Math.PI, 0); g.fill();
      g.fillStyle = '#eee7d6'; g.fillRect(bx + 30, wy - 18, 4, hh + 24);
    }
  }
  return finish(c);
}

function greenCopperRoofTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4d8c7c'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(20,50,45,0.55)';
  for (let x = 0; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke(); }
  noise(g, 128, 128, 800, 0.1);
  return finish(c);
}

function concreteTexture(tint = '#c9c9c4') {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = tint; g.fillRect(0, 0, 128, 128);
  noise(g, 128, 128, 1400, 0.1);
  return finish(c);
}

// ---------------------------------------------------------------------------
// 以公尺為單位貼圖的方塊 (側面 UV = 面尺寸 / 週期)
// ---------------------------------------------------------------------------
function facadeBox(w, h, d, tex, period, roofMat) {
  const geom = new THREE.BoxGeometry(w, h, d);
  const uv = geom.attributes.uv;
  // BoxGeometry 面順序: +x, -x, +y, -y, +z, -z (每面 4 頂點)
  const faceDims = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const dims = faceDims[f];
    if (!dims) continue;
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * dims[0] / period, uv.getY(idx) * dims[1] / period);
    }
  }
  const sideMat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const roof = roofMat || new THREE.MeshLambertMaterial({ color: 0x8d8f91 });
  const mesh = new THREE.Mesh(geom, [sideMat, sideMat, roof, roof, sideMat, sideMat]);
  return mesh;
}

// 重新使用同一份貼圖時需複製 (repeat 不同)；此處貼圖皆為 Repeat，不需複製
function place(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

// 四坡/孟莎屋頂 (截頭四角錐)
function hipRoof(w, d, h, topScale, mat) {
  const geom = new THREE.CylinderGeometry(0.5 * topScale, 0.5, h, 4, 1);
  geom.rotateY(Math.PI / 4);
  geom.scale(w / 0.7071 / 1, 1, d / 0.7071 / 1);
  geom.scale(0.5, 1, 0.5);
  geom.scale(2, 1, 2);
  const m = new THREE.Mesh(geom, mat);
  return m;
}

const glass = (color = 0x8ec3dc) => new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.15, emissive: 0x0b2740, emissiveIntensity: 0.4, transparent: true, opacity: 0.82 });

// ---------------------------------------------------------------------------
// 3D 擬真植栽產生器 (大喬木/樟樹、大王椰子樹、修剪景觀灌木球)
// ---------------------------------------------------------------------------
function createTree(type = 'broadleaf', height = 8.5, spread = 6.0, foliageColor = 0x2e7d32) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a2e18 });
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x90a4ae });
  const soilMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });

  if (type === 'broadleaf') {
    // 樹穴石台與基底土壤
    const curb = new THREE.Mesh(new THREE.BoxGeometry(spread * 0.42, 0.16, spread * 0.42), curbMat);
    curb.position.y = 0.08;
    tree.add(curb);
    const soil = new THREE.Mesh(new THREE.BoxGeometry(spread * 0.36, 0.18, spread * 0.36), soilMat);
    soil.position.y = 0.09;
    tree.add(soil);

    // 主樹幹
    const trunkH = height * 0.52;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(spread * 0.08, spread * 0.14, trunkH, 7),
      trunkMat
    );
    trunk.position.y = trunkH / 2;
    tree.add(trunk);

    // 茂盛多層分團有機樹冠 (依真實台灣樟樹/榕樹形貌，以不同深淺綠色團簇交疊)
    const folMat = (foliageColor instanceof THREE.Material)
      ? foliageColor
      : new THREE.MeshLambertMaterial({ color: foliageColor });
    const subColor = new THREE.Color(foliageColor).offsetHSL(0.02, 0.05, -0.05);
    const folMatSub = new THREE.MeshLambertMaterial({ color: subColor });

    const mainDome = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.46, 1), folMat);
    mainDome.position.y = height * 0.74;
    tree.add(mainDome);

    const sub1 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.34, 1), folMatSub);
    sub1.position.set(spread * 0.22, height * 0.65, spread * 0.16);
    tree.add(sub1);

    const sub2 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.32, 1), folMat);
    sub2.position.set(-spread * 0.2, height * 0.67, -spread * 0.14);
    tree.add(sub2);

    const sub3 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.28, 1), folMatSub);
    sub3.position.set(-spread * 0.14, height * 0.62, spread * 0.2);
    tree.add(sub3);
  } else if (type === 'palm') {
    // 椰子樹 / 大王椰子 (台灣校園入口經典林蔭)
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, height, 8),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 })
    );
    trunk.position.y = height / 2;
    tree.add(trunk);

    const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 3.2), frondMat);
      frond.position.set(Math.sin(ang) * 1.35, height + 0.15, Math.cos(ang) * 1.35);
      frond.rotation.y = -ang;
      frond.rotation.x = 0.42;
      tree.add(frond);
    }
  } else if (type === 'shrub') {
    // 景觀修剪常綠球灌木
    const bushMat = new THREE.MeshLambertMaterial({ color: foliageColor || 0x1b5e20 });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(spread * 0.5, 8, 8), bushMat);
    bush.position.y = spread * 0.45;
    tree.add(bush);
  }

  return tree;
}

// ---------------------------------------------------------------------------
// 臺中高工 (TCIVS) 專屬高精細紋理生成器 (1:1 實拍照片考究還原)
// ---------------------------------------------------------------------------
function finishClamp(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 1.「躍升卓越 直踐實戰達人」巨型科技看板貼圖 (Photo 1)
function tcivsCyberBannerTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');

  // 深藍灰科技面板底色
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 256);
  bgGrad.addColorStop(0, '#0d131f');
  bgGrad.addColorStop(0.5, '#182030');
  bgGrad.addColorStop(1, '#0d131f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 256);

  // 科技幾何網格
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // 霓虹桃粉 (#e91e63) 與賽博藍青 (#00e5ff) 科技斜切外框
  ctx.strokeStyle = '#e91e63';
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 996, 228);

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(22, 22, 980, 212);

  // 四個角科技幾何裝飾塊
  ctx.fillStyle = '#e91e63';
  ctx.fillRect(10, 10, 36, 12);
  ctx.fillRect(10, 10, 12, 36);
  ctx.fillRect(978, 10, 36, 12);
  ctx.fillRect(1002, 10, 12, 36);
  ctx.fillRect(10, 234, 36, 12);
  ctx.fillRect(10, 210, 12, 36);
  ctx.fillRect(978, 234, 36, 12);
  ctx.fillRect(1002, 210, 12, 36);

  // 中間臺中高工 12 齒綠色齒輪校徽
  const cx = 512, cy = 108, r = 42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#00e676';
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const a1 = angle - 0.12, a2 = angle + 0.12;
    ctx.lineTo(Math.cos(a1) * (r + 10), Math.sin(a1) * (r + 10));
    ctx.lineTo(Math.cos(a2) * (r + 10), Math.sin(a2) * (r + 10));
    const nextA = angle + Math.PI / 12;
    ctx.lineTo(Math.cos(nextA) * r, Math.sin(nextA) * r);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d32f2f';
  ctx.font = '900 32px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('工', 0, 2);
  ctx.restore();

  // 兩側主標題文字：「躍升卓越」與「直踐實戰達人」
  ctx.font = '900 62px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fillText('躍升卓越', cx - 64, cy);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('直踐實戰達人', cx + 64, cy);
  ctx.shadowBlur = 0;

  // 下方專業群科副標題
  ctx.font = 'bold 24px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#80deea';
  ctx.fillText('機械群 · 動力機械群 · 電機電子群 · 化工群 · 土木建築群 · 設計群', cx, 196);

  return finishClamp(c);
}

// 2. 正門右側白色磁磚基座英文校名「Taichung Industrial Senior High School」(Photo 1)
function tcivsWhiteWallTextTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const ctx = c.getContext('2d');

  // 純白方塊磁磚底紋
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 1024, 128);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
  }
  for (let y = 0; y < 128; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }

  // 深藍黑色金屬立體字
  ctx.font = '900 44px "Arial", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillText('Taichung Industrial Senior High School', 514, 66);
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Taichung Industrial Senior High School', 512, 64);

  return finishClamp(c);
}

// 3. 正門高聳白色門柱/鐘樓豎立校名「臺中市立臺中工業高級中等學校」(Photo 1)
function tcivsTowerNameTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 1024;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f1f2f6';
  ctx.fillRect(0, 0, 128, 1024);
  noise(ctx, 128, 1024, 1200, 0.04);

  ctx.strokeStyle = '#ced6e0';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke();
  }

  const chars = '臺中市立臺中工業高級中等學校'.split('');
  ctx.font = 'bold 46px "DFKai-SB", "Noto Serif TC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const startY = 68;
  const stepY = (1024 - 136) / (chars.length - 1);
  chars.forEach((char, idx) => {
    const y = startY + idx * stepY;
    ctx.fillStyle = 'rgba(78, 52, 46, 0.35)';
    ctx.fillText(char, 66, y + 2);
    ctx.fillStyle = '#6d4c41';
    ctx.fillText(char, 64, y);
  });

  return finishClamp(c);
}

// 4. 正門左側全彩 LED 電子跑馬燈資訊牆貼圖 (Photo 1)
function tcivsLedMarqueeTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, 512, 192);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = 4; x < 512; x += 4) {
    for (let y = 4; y < 192; y += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 184);

  ctx.font = 'bold 24px "Noto Sans TC", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffb300';
  ctx.shadowColor = '#ffb300';
  ctx.shadowBlur = 8;
  ctx.fillText('【 臺中市立臺中高工 歡迎蒞臨 】', 256, 42);

  ctx.fillStyle = '#00e676';
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 8;
  ctx.fillText('全國技能競賽/技藝競賽 蟬聯全國總冠軍！', 256, 96);

  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 20px "Noto Sans TC", monospace';
  ctx.fillText('115學年度 實戰達人 · 金牌搖籃 · 卓越技職', 256, 148);
  ctx.shadowBlur = 0;

  return finishClamp(c);
}

// 5. 高工路大門口黃色網狀線「網狀禁止停車區」與路面字樣貼圖 (Photo 1)
function tcivsYellowBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#374151';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 496);

  ctx.lineWidth = 6;
  const step = 64;
  for (let i = -512; i < 1024; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 512); ctx.lineTo(i + 512, 0); ctx.stroke();
  }

  ctx.font = '900 64px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 6;
  ctx.fillText('停', 256, 420);
  ctx.font = 'bold 40px "Noto Sans TC", sans-serif';
  ctx.fillText('機車', 140, 420);
  ctx.fillText('禁止停車', 256, 100);

  return finishClamp(c);
}

// 6. 現代化技職校舍與實習工場立面貼圖 (Photo 3, 4, 5)
function tcivsWorkshopFacadeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');

  // 淺米灰磁磚牆面
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, 1800, 0.06);

  // 建築深藍科技橫條飾帶
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 116, 256, 18);
  ctx.fillRect(0, 236, 256, 12);

  // 水平帶狀玻璃窗與鋁格柵遮陽板
  for (const wy of [28, 148]) {
    // 窗框陰影
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, wy, 232, 60);

    // 玻璃深淺反光
    const winGrad = ctx.createLinearGradient(0, wy, 0, wy + 60);
    winGrad.addColorStop(0, '#1e293b');
    winGrad.addColorStop(0.5, '#475569');
    winGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = winGrad;
    ctx.fillRect(14, wy + 2, 228, 56);

    // 窗框垂直細欞
    ctx.fillStyle = '#cbd5e1';
    for (let x = 14; x <= 242; x += 38) {
      ctx.fillRect(x, wy, 3, 60);
    }
  }

  return finish(c);
}

// 7. 百年老榕樹產生器 (Photo 2 & 3: 迎賓大道壯麗綠色隧道)
function createTcivsBanyanTree(height = 9.5, spread = 9.0, leanX = 0) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x422a1d });
  const rootMat = new THREE.MeshLambertMaterial({ color: 0x372217 });
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x78909c });
  const soilMat = new THREE.MeshLambertMaterial({ color: 0x2e1e16 });

  // 樹穴石台與基底土壤
  const curb = new THREE.Mesh(new THREE.BoxGeometry(spread * 0.45, 0.2, spread * 0.45), curbMat);
  curb.position.y = 0.1;
  tree.add(curb);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(spread * 0.4, 0.22, spread * 0.4), soilMat);
  soil.position.y = 0.11;
  tree.add(soil);

  // 主樹幹 (蒼勁厚實質感)
  const trunkH = height * 0.48;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(spread * 0.09, spread * 0.18, trunkH, 8),
    trunkMat
  );
  trunk.position.set(leanX * 0.5, trunkH * 0.5, 0);
  trunk.rotation.z = -leanX * 0.08;
  tree.add(trunk);

  // 四周蔓生擴展的盤根板根
  for (let r = 0; r < 5; r++) {
    const angle = (r * Math.PI * 2) / 5;
    const buttress = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.7, spread * 0.26),
      rootMat
    );
    buttress.position.set(
      Math.sin(angle) * (spread * 0.16),
      0.35,
      Math.cos(angle) * (spread * 0.16)
    );
    buttress.rotation.y = angle;
    buttress.rotation.x = 0.2;
    tree.add(buttress);
  }

  // 蒼勁巨枝伸向路中 (拱向道路中央形成綠色隧道)
  const bough = new THREE.Mesh(
    new THREE.CylinderGeometry(spread * 0.07, spread * 0.11, spread * 0.55, 7),
    trunkMat
  );
  bough.position.set(leanX * 1.6, trunkH + 0.8, 0);
  bough.rotation.z = -leanX * 0.35;
  tree.add(bough);

  // 垂掛氣生根
  for (let ar = 0; ar < 8; ar++) {
    const aerialRoot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.03, 3.8, 5),
      rootMat
    );
    const ox = leanX * 1.5 + (Math.random() - 0.5) * spread * 0.4;
    const oz = (Math.random() - 0.5) * spread * 0.45;
    aerialRoot.position.set(ox, trunkH - 0.3, oz);
    tree.add(aerialRoot);
  }

  // 茂盛拱形樹冠：多層有機團簇形成厚實蓊鬱樹蔭
  const folMatDeep = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
  const folMatMid = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
  const folMatLight = new THREE.MeshLambertMaterial({ color: 0x388e3c });

  const mainDome = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.52, 1), folMatDeep);
  mainDome.position.set(leanX * 2.2, height * 0.82, 0);
  tree.add(mainDome);

  const subDome1 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.42, 1), folMatMid);
  subDome1.position.set(leanX * 1.6, height * 0.72, spread * 0.25);
  tree.add(subDome1);

  const subDome2 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.4, 1), folMatLight);
  subDome2.position.set(leanX * 1.6, height * 0.74, -spread * 0.25);
  tree.add(subDome2);

  const subDome3 = new THREE.Mesh(new THREE.DodecahedronGeometry(spread * 0.36, 1), folMatMid);
  subDome3.position.set(0, height * 0.68, 0);
  tree.add(subDome3);

  // 老榕樹旁經典校園黃黑斜紋柱路燈 (Photo 2)
  const lampGroup = new THREE.Group();
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.24, 0.9, 8),
    new THREE.MeshLambertMaterial({ color: 0xfacc15 })
  );
  lampBase.position.y = 0.45;
  lampGroup.add(lampBase);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 })
  );
  pole.position.y = 2.4;
  lampGroup.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.08, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x475569 })
  );
  arm.position.set(leanX * 0.35, 4.4, 0);
  lampGroup.add(arm);

  const lightHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.12, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0xfff9c4, emissiveIntensity: 1.0 })
  );
  lightHead.position.set(leanX * 0.65, 4.35, 0);
  lampGroup.add(lightHead);

  lampGroup.position.set(leanX * 0.7, 0, spread * 0.32);
  tree.add(lampGroup);

  return tree;
}

export class ProceduralLandmarks {
  // =========================================================================
  // 臺中火車站 (1917 新文藝復興風格)：立面朝向本地 -z
  // =========================================================================
  static buildTaichungStation() {
    const group = new THREE.Group();
    group.name = 'taichung_station_procedural';
    const brick = stationFacadeTexture();
    const copper = new THREE.MeshLambertMaterial({ map: greenCopperRoofTexture(), side: THREE.DoubleSide });
    const roofGray = new THREE.MeshLambertMaterial({ color: 0x6f7b78 });

    const hallW = 84, hallD = 22, hallH = 15;
    const hall = facadeBox(hallW, hallH, hallD, brick, 8, roofGray);
    place(hall, 0, hallH / 2, -14);
    group.add(hall);

    // 孟莎坡屋頂 (截頭錐)
    const hallRoof = hipRoof(hallW * 0.5, hallD * 0.5, 4.5, 0.82, copper);
    hallRoof.position.set(0, hallH + 2.25, -14);
    group.add(hallRoof);

    // 中央鐘塔式主館 + 左右角塔
    const addPavilion = (x, w, d, h, roofH) => {
      const p = facadeBox(w, h, d, brick, 8, roofGray);
      place(p, x, h / 2, -14 - (d - hallD) / 2 - 0.0);
      group.add(p);
      const r = hipRoof(w * 0.5, d * 0.5, roofH, 0.62, copper);
      r.position.set(x, h + roofH / 2, p.position.z);
      group.add(r);
      // 頂部採光塔
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 3.2, 8), new THREE.MeshLambertMaterial({ color: 0xeee7d6 }));
      lantern.position.set(x, h + roofH + 1.6, p.position.z);
      group.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.2, 8), copper);
      cap.position.set(x, h + roofH + 4.3, p.position.z);
      group.add(cap);
    };
    addPavilion(0, 24, 26, 21, 8);
    addPavilion(-36, 14, 24, 19, 6.5);
    addPavilion(36, 14, 24, 19, 6.5);

    // 前廊柱列 (白色石柱)
    const colMat = new THREE.MeshLambertMaterial({ color: 0xeee7d6 });
    for (let i = -5; i <= 5; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 6.5, 10), colMat);
      col.position.set(i * 3.4, 3.25, -27.2);
      group.add(col);
    }
    const porch = new THREE.Mesh(new THREE.BoxGeometry(38, 0.8, 4.2), colMat);
    porch.position.set(0, 6.9, -26.3);
    group.add(porch);

    // 站前廣場基座與月台地坪 (高出地表 0.28m，徹底消除周邊道路人行道掩埋與破面)
    const plazaMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#c8ccc7') });
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(hallW + 20, 0.35, 102), plazaMat);
    plaza.position.set(0, 0.175, 4);
    plaza.receiveShadow = true;
    group.add(plaza);

    // 後方鋼構拱形月台雨棚 (玻璃 + 鋼骨) - 頂部拱形半圓拱高抬升至月台上方，絕不潛入地底
    const vault = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 15, hallW, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })
    );
    vault.rotation.z = Math.PI / 2;
    vault.scale.set(0.55, 1, 1);
    const vaultGroup = new THREE.Group();
    vaultGroup.add(vault);
    vaultGroup.rotation.y = Math.PI / 2;
    vaultGroup.position.set(0, 8.25, 14); // 抬升至 y=8.25 使下緣恰好平貼月台 y=0.35
    group.add(vaultGroup);

    // 月台平面
    const platform = new THREE.Mesh(new THREE.BoxGeometry(hallW, 0.5, 34), new THREE.MeshLambertMaterial({ map: concreteTexture('#b9bbb8') }));
    platform.position.set(0, 0.25, 12);
    group.add(platform);

    // 鋼骨拱肋
    const ribMat = new THREE.MeshLambertMaterial({ color: 0x4b5358 });
    for (let x = -hallW / 2; x <= hallW / 2; x += 7) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(15, 0.28, 6, 20, Math.PI), ribMat);
      rib.scale.set(1, 0.55, 1);
      rib.position.set(x, 8.25, 14);
      rib.rotation.set(0, 0, 0);
      group.add(rib);
    }
    return group;
  }

  // =========================================================================
  // 高層塔樓共用
  // =========================================================================
  static _tower({ baseW, baseD, baseH, shaftW, shaftD, shaftH, crownW, crownD, crownH, spire, baseTex, shaftTex, crownTex }) {
    const group = new THREE.Group();
    const flat = new THREE.MeshLambertMaterial({ color: 0x9a9fa3 });
    const base = facadeBox(baseW, baseH, baseD, baseTex, 7.2, flat);
    place(base, 0, baseH / 2, 0);
    group.add(base);
    const shaft = facadeBox(shaftW, shaftH, shaftD, shaftTex, 7.2, flat);
    place(shaft, 0, baseH + shaftH / 2, 0);
    group.add(shaft);
    const crown = facadeBox(crownW, crownH, crownD, crownTex, 7.2, flat);
    place(crown, 0, baseH + shaftH + crownH / 2, 0);
    group.add(crown);
    const topY = baseH + shaftH + crownH;
    const mech = new THREE.Mesh(new THREE.BoxGeometry(crownW * 0.5, 4, crownD * 0.5), new THREE.MeshLambertMaterial({ color: 0x8b9094 }));
    mech.position.set(0, topY + 2, 0);
    group.add(mech);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, spire, 8), new THREE.MeshLambertMaterial({ color: 0xcfd3d6 }));
    mast.position.set(0, topY + 4 + spire / 2, 0);
    group.add(mast);
    return group;
  }

  // 李方艾美酒店：藍綠玻璃帷幕高塔 (約 173m)
  static buildLiFangAimei() {
    const glassTex = glassTowerTexture('#2d7388', '#86c1d4', '#1b2c36');
    return ProceduralLandmarks._tower({
      baseW: 52, baseD: 50, baseH: 22,
      shaftW: 38, shaftD: 38, shaftH: 128,
      crownW: 28, crownD: 28, crownH: 12,
      spire: 10,
      baseTex: stoneGridTexture('#cdbfa6', '#476a7c'),
      shaftTex: glassTex,
      crownTex: glassTowerTexture('#3a8aa2', '#a5d6e6', '#1b2c36')
    });
  }

  // 亞洲大飯店 / 榮達大樓：米色石材外牆階梯退縮塔樓 (約 175m)
  static buildAsiaGrandHotel() {
    const g = ProceduralLandmarks._tower({
      baseW: 66, baseD: 56, baseH: 26,
      shaftW: 46, shaftD: 42, shaftH: 112,
      crownW: 34, crownD: 30, crownH: 26,
      spire: 12,
      baseTex: stoneGridTexture('#d9cdb4', '#52707f'),
      shaftTex: stoneGridTexture('#e2d8c2', '#4a6677'),
      crownTex: stoneGridTexture('#cfc3aa', '#50707f')
    });
    return g;
  }

  // =========================================================================
  // 國立自然科學博物館：展示館群 + 太空劇場球體 + 植物園玻璃溫室
  // =========================================================================
  static buildScienceMuseum() {
    const group = new THREE.Group();
    const white = whitePanelTexture(true);
    const flat = new THREE.MeshLambertMaterial({ color: 0xb7b9ba });
    // 主展示館 (長條橫向量體)
    const main = facadeBox(190, 22, 56, white, 8, flat);
    place(main, 0, 11, 0); group.add(main);
    // 前翼
    const wingL = facadeBox(70, 16, 40, white, 8, flat); place(wingL, -110, 8, 34); group.add(wingL);
    const wingR = facadeBox(70, 16, 40, white, 8, flat); place(wingR, 110, 8, 34); group.add(wingR);
    // 後方生命科學廳
    const back = facadeBox(120, 20, 50, white, 8, flat); place(back, 20, 10, -78); group.add(back);
    // 入口玻璃大廳
    const lobby = new THREE.Mesh(new THREE.BoxGeometry(46, 16, 14), glass());
    lobby.position.set(0, 8, 35); group.add(lobby);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(54, 0.8, 18), new THREE.MeshLambertMaterial({ color: 0xe9e9e6 }));
    canopy.position.set(0, 16.4, 36); group.add(canopy);
    // 太空劇場：銀色球體 (直徑約 44m 的半嵌球殼)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(23, 36, 24),
      new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.75, roughness: 0.22 })
    );
    dome.position.set(-95, 23, -52); group.add(dome);
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 4, 32), new THREE.MeshLambertMaterial({ color: 0xdedfe0 }));
    domeBase.position.set(-95, 2, -52); group.add(domeBase);
    // 植物園溫室 (玻璃半圓頂)
    const house = new THREE.Mesh(
      new THREE.CylinderGeometry(22, 22, 90, 24, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xa8d8d0, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    house.rotation.z = Math.PI / 2;
    house.rotation.y = Math.PI / 2;
    const houseGrp = new THREE.Group();
    houseGrp.add(house);
    houseGrp.position.set(125, 0, -70);
    houseGrp.rotation.y = 0;
    houseGrp.scale.set(1, 0.6, 0.9);
    group.add(houseGrp);
    const ribMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f0 });
    for (let i = -4; i <= 4; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(22, 0.35, 6, 24, Math.PI), ribMat);
      rib.scale.set(1, 0.6, 1);
      rib.position.set(125 + i * 9.5, 0, -70);
      rib.rotation.y = Math.PI / 2;
      group.add(rib);
    }
    return group;
  }

  // =========================================================================
  // 國立臺灣美術館：白色量體 + 玻璃大廳 + 雕塑公園
  // =========================================================================
  static buildFineArtsMuseum() {
    const group = new THREE.Group();
    const white = whitePanelTexture(false);
    const stripe = whitePanelTexture(true);
    const flat = new THREE.MeshLambertMaterial({ color: 0xdadad6 });
    const atrium = new THREE.Mesh(new THREE.BoxGeometry(76, 22, 54), glass(0x9fd0e4));
    atrium.position.set(0, 11, 0); group.add(atrium);
    const frame = new THREE.MeshLambertMaterial({ color: 0xf0f0ed });
    for (let x = -38; x <= 38; x += 9.5) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.7, 22.2, 54.4), frame);
      mull.position.set(x, 11, 0); group.add(mull);
    }
    const blocks = [
      { x: -88, z: 10, w: 96, d: 56, h: 15, tex: stripe },
      { x: 88, z: 10, w: 96, d: 56, h: 15, tex: stripe },
      { x: -55, z: -62, w: 70, d: 50, h: 11, tex: white },
      { x: 62, z: -60, w: 80, d: 46, h: 13, tex: white },
      { x: 0, z: -70, w: 40, d: 32, h: 20, tex: stripe }
    ];
    for (const b of blocks) {
      const m = facadeBox(b.w, b.h, b.d, b.tex, 8, flat);
      place(m, b.x, b.h / 2, b.z); group.add(m);
    }
    // 屋頂懸挑板
    const cantilever = new THREE.Mesh(new THREE.BoxGeometry(110, 1.2, 20), frame);
    cantilever.position.set(0, 22.8, 36); group.add(cantilever);
    // 雕塑公園 (草坪 + 幾件抽象雕塑)
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(150, 0.25, 40), new THREE.MeshLambertMaterial({ color: 0x5d9b55 }));
    lawn.position.set(0, 0.13, 60); group.add(lawn);
    const sculptMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.4, roughness: 0.4 });
    for (const [x, z, s] of [[-40, 60, 5], [10, 66, 7], [48, 58, 4.5]]) {
      const sc = new THREE.Mesh(new THREE.TorusKnotGeometry(s, s * 0.22, 60, 8), sculptMat);
      sc.position.set(x, s + 1.5, z); group.add(sc);
    }
    return group;
  }

  // =========================================================================
  // 大慶高架車站 (臺鐵/捷運綠線 G13 跨線共構轉乘樞紐 · 中山醫學大學)
  // 100% 依據真實衛星 3D 空照圖 1:1 精細建模：
  // 1. 臺鐵高架月台層 (Y=14.5m)：雙島四線月台、流線型銀灰金屬機翼曲面雨棚、中軸太陽能光電板列
  // 2. 跨路封閉式轉乘連通空橋 (Transfer Skybridge, Y=16.5m)：跨越建國北路一段，直通捷運穿堂層
  // 3. 捷運綠線 G13 大慶高架車站：翡翠綠流線型雨棚、全高式玻璃月台門、雙側式月台
  // 4. 捷運綠線超震撼 90 度大弧線高架橋：自文心南路優雅大轉彎切入大慶站，含隔音牆與橋墩
  // 5. 中山醫學大學附設醫院 (汝川醫療大樓)：18 層紅褐色醫療塔樓、白色窗帶、紅十字院徽、頂樓直升機停機坪、急診部專用車道
  // 6. 地面交通轉運樞紐：建國南北路、文心南路、大慶街、公車候車亭、計程車排班區、YouBike 2.0 租賃站與行道樹
  // =========================================================================
  static buildDaqingStation() {
    const group = new THREE.Group();
    group.name = 'daqing_station_bespoke';

    const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#b5b6b2') });
    const darkConc = new THREE.MeshLambertMaterial({ map: concreteTexture('#808e9b') });
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x37474f, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.7 });
    const silverRoofMat = new THREE.MeshStandardMaterial({ color: 0xd2d7df, roughness: 0.25, metalness: 0.65, side: THREE.DoubleSide });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0f2744, roughness: 0.2, metalness: 0.8, emissive: 0x071526, emissiveIntensity: 0.3 });
    const yellowTileMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const glassMat = glass(0x8ec3dc);
    const traBlueMat = new THREE.MeshLambertMaterial({ color: 0x01579b });
    const mrtGreenMat = new THREE.MeshLambertMaterial({ color: 0x1e9e59 });
    const hospitalRedMat = new THREE.MeshLambertMaterial({ color: 0xb7472a }); // 汝川大樓經典磚紅/紅褐色陶磚
    const hospitalBeigeMat = new THREE.MeshLambertMaterial({ color: 0xfaebd7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const redCrossMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f });

    const deckY = 14.5; // 嚴格對齊臺鐵高架軌道 Y=14.5m
    const L = 190;      // 站台長度

    // 0. 地面路基與周邊道路地坪 (建國北路一段、建國南路一段、文心南路與大慶街交叉口)
    const groundBase = new THREE.Mesh(new THREE.BoxGeometry(260, 0.3, 160), asphaltMat);
    groundBase.position.set(20, 0.15, 45);
    group.add(groundBase);

    // 車站周邊人行道鋪面
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(250, 0.15, 42), conc);
    sidewalk.position.set(0, 0.28, 26);
    group.add(sidewalk);

    // =========================================================================
    // 1. 臺鐵高架車站月台層 (Y=14.5m) 與雙島四線
    // =========================================================================
    [-5.6, 5.6].forEach(pz => {
      // 月台主體混凝土板 (厚 0.9m，頂部 Y=15.4m，高出軌道 0.9m)
      const plat = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 4.6), conc);
      plat.position.set(0, deckY + 0.45, pz);
      group.add(plat);

      // 黃色導盲磚/警戒線 (月台兩緣)
      [-2.1, 2.1].forEach(dz => {
        const tactile = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, 0.35), yellowTileMat);
        tactile.position.set(0, deckY + 0.92, pz + dz);
        group.add(tactile);
      });

      // 乘客等候座椅、動態資訊螢幕 (PIDS)、玻璃風雨等候亭
      for (let x = -L / 2 + 18; x <= L / 2 - 18; x += 24) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8 }));
        bench.position.set(x, deckY + 1.15, pz);
        group.add(bench);

        // PIDS 雙向懸吊資訊螢幕
        const pids = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.25),
          new THREE.MeshStandardMaterial({ color: 0x212121 }));
        pids.position.set(x, deckY + 3.4, pz);
        group.add(pids);

        const led = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.27),
          new THREE.MeshStandardMaterial({ color: 0xff9100, emissive: 0xff9100, emissiveIntensity: 2.2 }));
        led.position.set(x, deckY + 3.4, pz);
        group.add(led);
      }

      // 月台樓梯間與電梯塔 (貫通下層穿堂與地面)
      [-35, 35].forEach(sx => {
        const stairCore = new THREE.Mesh(new THREE.BoxGeometry(12, deckY + 1.2, 3.2), conc);
        stairCore.position.set(sx, (deckY + 1.2) / 2, pz);
        group.add(stairCore);

        const glassShaft = new THREE.Mesh(new THREE.BoxGeometry(3.6, deckY + 4.2, 3.0), glassMat);
        glassShaft.position.set(sx + (sx > 0 ? 8 : -8), (deckY + 4.2) / 2, pz);
        group.add(glassShaft);
      });
    });

    // =========================================================================
    // 2. 依衛星空照 1:1 打造：流線型銀灰金屬機翼曲面雨棚 + 頂部太陽能光電板列
    // =========================================================================
    const canopyW = 26;
    const canopySeg = 3.2;
    for (let x = -L / 2 + 8; x <= L / 2 - 8; x += canopySeg) {
      // 依空照圖機翼流線曲面起拱 (中央高、兩翼平緩外挑)
      const h = 5.2 + Math.sin(((x + L / 2) / L) * Math.PI) * 1.5;
      const wingSlab = new THREE.Mesh(new THREE.BoxGeometry(canopySeg + 0.1, 0.36, canopyW), silverRoofMat);
      wingSlab.position.set(x + canopySeg / 2, deckY + h + 1.5, 0);
      group.add(wingSlab);

      // 頂部中軸雙排深藍色太陽能光電板 (Photovoltaic Solar Panel Arrays)
      [-4.5, 4.5].forEach(sz => {
        const solar = new THREE.Mesh(new THREE.BoxGeometry(canopySeg - 0.2, 0.08, 6.2), solarMat);
        solar.position.set(x + canopySeg / 2, deckY + h + 1.72, sz);
        group.add(solar);
      });
    }

    // 鋼構 Y 型傘狀挑高支撐柱
    for (let x = -L / 2 + 15; x <= L / 2 - 15; x += 20) {
      [-5.6, 5.6].forEach(pz => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 6.5, 8), steelMat);
        post.position.set(x, deckY + 3.8, pz);
        group.add(post);

        [-1, 1].forEach(dir => {
          const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 4.2), steelMat);
          arm.position.set(x, deckY + 6.2, pz + dir * 1.8);
          arm.rotation.x = dir * 0.38;
          group.add(arm);
        });
      });
    }

    // =========================================================================
    // 3. 跨路封閉式轉乘連通天橋 (Enclosed Transfer Skybridge, Y=16.5m)
    // =========================================================================
    // 橫跨建國北路一段，長 24m x 寬 8m x 高 4.5m，無縫串聯臺鐵與捷運穿堂
    const skybridge = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.5, 26), whiteMat);
    skybridge.position.set(8, deckY + 3.2, 18);
    group.add(skybridge);

    const skyGlass = new THREE.Mesh(new THREE.BoxGeometry(8.7, 2.6, 25.4), glassMat);
    skyGlass.position.set(8, deckY + 3.4, 18);
    group.add(skyGlass);

    // =========================================================================
    // 4. 捷運綠線 G13 大慶高架車站 (TMRT Elevated Station, Y=16.5m, Z=32)
    // =========================================================================
    const mrtZ = 32;
    const mrtL = 110;

    // 捷運側式月台與軌道面
    const mrtPlat = new THREE.Mesh(new THREE.BoxGeometry(mrtL, 1.2, 18), conc);
    mrtPlat.position.set(0, deckY + 2.0, mrtZ);
    group.add(mrtPlat);

    // 翡翠綠流線型捷運月台雨棚 (Green Curved Canopy)
    const mrtRoof = new THREE.Mesh(new THREE.BoxGeometry(mrtL, 0.5, 20), mrtGreenMat);
    mrtRoof.position.set(0, deckY + 7.8, mrtZ);
    group.add(mrtRoof);

    // 全高式玻璃月台門 (PSD)
    [-7.2, 7.2].forEach(mz => {
      const psd = new THREE.Mesh(new THREE.BoxGeometry(mrtL - 10, 2.4, 0.15), glassMat);
      psd.position.set(0, deckY + 3.8, mrtZ + mz);
      group.add(psd);

      const psdHeader = new THREE.Mesh(new THREE.BoxGeometry(mrtL - 10, 0.35, 0.25), mrtGreenMat);
      psdHeader.position.set(0, deckY + 5.1, mrtZ + mz);
      group.add(psdHeader);
    });

    // 捷運大慶站名燈箱「大慶 Daqing G13」
    const mrtSign = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1e9e59, emissive: 0x1e9e59, emissiveIntensity: 1.2 }));
    mrtSign.position.set(0, deckY + 6.2, mrtZ + 10.2);
    group.add(mrtSign);

    // =========================================================================
    // 5. 依衛星空照 1:1 打造：捷運綠線超震撼 90 度大弧線高架橋 (Curved Viaduct Arc)
    // =========================================================================
    // 捷運綠線自文心南路 (北/東北) 順暢彎入大慶站 (西/西南)
    const curvePoints = [
      new THREE.Vector3(120, deckY + 2.0, 160),
      new THREE.Vector3(105, deckY + 2.0, 125),
      new THREE.Vector3(85, deckY + 2.0, 90),
      new THREE.Vector3(60, deckY + 2.0, 60),
      new THREE.Vector3(32, deckY + 2.0, 42),
      new THREE.Vector3(0, deckY + 2.0, mrtZ)
    ];

    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const len = p1.distanceTo(p2);
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

      // 箱型預力梁橋體
      const girder = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.8, len + 0.2), conc);
      girder.position.copy(mid);
      girder.rotation.y = angle;
      group.add(girder);

      // 外側翡翠綠吸音隔音牆 (Acoustic Sound Barrier)
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, len + 0.2), mrtGreenMat);
      barrier.position.set(mid.x + Math.cos(angle) * 4.6, mid.y + 1.6, mid.z - Math.sin(angle) * 4.6);
      barrier.rotation.y = angle;
      group.add(barrier);

      // 弧線高架橋單柱式重型圓柱橋墩 (落地至 Y=0)
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, deckY + 1.1, 12), darkConc);
      pier.position.set(p1.x, (deckY + 1.1) / 2, p1.z);
      group.add(pier);
    }

    // =========================================================================
    // 6. 依衛星空照 1:1 打造：中山醫學大學附設醫院 (汝川醫療大樓 + 附設校區)
    // =========================================================================
    // 坐標座落於文心南路與建國北路一段東北角 (x: 95, z: 82)
    const hospX = 95, hospZ = 82;

    // (1) 汝川醫療大樓 (18 層經典紅褐色現代醫療巨塔，寬 54m x 深 48m x 高 64m)
    const hospTower = new THREE.Mesh(new THREE.BoxGeometry(54, 64, 48), hospitalRedMat);
    hospTower.position.set(hospX, 32, hospZ);
    group.add(hospTower);

    // 階梯式退縮裙樓 (基座挑高 4 層)
    const hospPodium = new THREE.Mesh(new THREE.BoxGeometry(66, 16, 58), hospitalBeigeMat);
    hospPodium.position.set(hospX, 8, hospZ);
    group.add(hospPodium);

    // 18 層規律白色連續遮陽窗帶
    for (let f = 1; f <= 16; f++) {
      const fy = f * 3.8 + 2.0;
      const band = new THREE.Mesh(new THREE.BoxGeometry(54.4, 1.5, 48.4), glassMat);
      band.position.set(hospX, fy, hospZ);
      group.add(band);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(54.6, 0.25, 48.6), whiteMat);
      sill.position.set(hospX, fy + 0.85, hospZ);
      group.add(sill);
    }

    // 南北外牆標誌性紅色十字院徽 (Illuminated Red Cross)
    [24.3, -24.3].forEach(dz => {
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8.5, 0.3), redCrossMat);
      crossV.position.set(hospX, 54, hospZ + dz);
      group.add(crossV);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.8, 0.3), redCrossMat);
      crossH.position.set(hospX, 54, hospZ + dz);
      group.add(crossH);
    });

    // 屋頂緊急醫療直升機停機坪 (Rooftop Helipad)
    const helipad = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 22), darkConc);
    helipad.position.set(hospX, 64.6, hospZ);
    group.add(helipad);

    // 停機坪黃色導引圓圈與白色 "H" 標線
    const heliRing = new THREE.Mesh(new THREE.RingGeometry(6.8, 7.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
    heliRing.rotation.x = -Math.PI / 2;
    heliRing.position.set(hospX, 65.25, hospZ);
    group.add(heliRing);

    // "H" 字母
    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 7.0), whiteMat);
    hBar1.position.set(hospX - 2.5, 65.26, hospZ); group.add(hBar1);
    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 7.0), whiteMat);
    hBar2.position.set(hospX + 2.5, 65.26, hospZ); group.add(hBar2);
    const hBarMid = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.05, 0.8), whiteMat);
    hBarMid.position.set(hospX, 65.26, hospZ); group.add(hBarMid);

    // 地面急診部 (Emergency Room) 與救護車專用出入車道遮雨棚
    const erCanopy = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 14), whiteMat);
    erCanopy.position.set(hospX - 24, 5.2, hospZ + 18);
    group.add(erCanopy);

    const erSign = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xd32f2f, emissive: 0xd32f2f, emissiveIntensity: 1.8 }));
    erSign.position.set(hospX - 24, 6.2, hospZ + 25.1);
    group.add(erSign);

    // (2) 中山醫學大學教學研究大樓群 (CSMU Campus Wing, x: 145, z: 82)
    const uniBldg = new THREE.Mesh(new THREE.BoxGeometry(44, 26, 32), hospitalBeigeMat);
    uniBldg.position.set(hospX + 50, 13, hospZ);
    group.add(uniBldg);

    // =========================================================================
    // 7. 地面車站站房、轉乘大廳與公共交通設施 (建國北路側)
    // =========================================================================
    const hall = new THREE.Mesh(new THREE.BoxGeometry(52, deckY, 22), conc);
    hall.position.set(0, deckY / 2, 22);
    group.add(hall);

    const hallGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(50, deckY - 1.5, 21.6), glassMat);
    hallGlassMesh.position.set(0, deckY / 2, 22.2);
    group.add(hallGlassMesh);

    // 臺鐵與捷運色彩標誌帶
    const traBand = new THREE.Mesh(new THREE.BoxGeometry(25, 1.4, 0.4), traBlueMat);
    traBand.position.set(-12, deckY - 1.0, 33.3);
    group.add(traBand);

    const mrtBand = new THREE.Mesh(new THREE.BoxGeometry(25, 1.4, 0.4), mrtGreenMat);
    mrtBand.position.set(12, deckY - 1.0, 33.3);
    group.add(mrtBand);

    // 大慶車站站名牌燈箱
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(18, 1.4, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4 }));
    signBox.position.set(0, deckY + 1.2, 27.2);
    group.add(signBox);

    // 支撐高架站房之重型混凝土排柱與橫梁
    for (let x = -L / 2 + 10; x <= L / 2 - 10; x += 25) {
      const pierCol = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, deckY - 1.2, 8), conc);
      pierCol.position.set(x, (deckY - 1.2) / 2, 0);
      group.add(pierCol);

      const crossHead = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 20), conc);
      crossHead.position.set(x, deckY - 1.4, 0);
      group.add(crossHead);
    }

    // 公車候車亭與 YouBike 2.0 自行車租賃站
    const busShelter = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 3.2), whiteMat);
    busShelter.position.set(-35, 1.6, 38);
    group.add(busShelter);

    const youbikeKiosk = new THREE.Mesh(new THREE.BoxGeometry(8, 2.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf1c40f })); // YouBike 標誌黃色
    youbikeKiosk.position.set(35, 1.1, 38);
    group.add(youbikeKiosk);

    // 建國北路一段與文心南路兩側綠化行道樹
    for (let x = -L / 2 + 15; x <= L / 2 - 15; x += 22) {
      const stTree = createTree('broadleaf', 7.5, 5.2, 0x2e7d32);
      stTree.position.set(x, 0.28, 44);
      group.add(stTree);
    }

    return group;
  }

  // =========================================================================
  // 臺中高工校區 (Taichung Industrial High School / TCIVS)
  // 依據官方校區平面圖精確建模：
  // 1. 南側高工路正門牌樓、傳達室、景觀水池、林蔭花圃大道、12齒綠色齒輪校徽
  // 2. 中工大樓 (行政主樓/鐘樓/校徽山牆)、第二實習大樓、第一實習大樓、宏毅樓
  // 3. 西側化工圖傳大樓、東南汽車板金大樓、機械冷凍大樓實習廠區
  // 4. 東側 400m 標準田徑運動場 (8道紅PU跑道+足球場+司令台)、球場群
  // 5. 北側體育館 (亮橘色拱頂)、圖書館、學生餐廳、誠樸樓、懷思樓、工學路後門
  // 6. 穿校親水小河 (旱溪支流/綠川排水) 與白色景觀拱橋
  // =========================================================================
  // =========================================================================
  // 臺中市立臺中工業高級中等學校 (Taichung Industrial High School / TCIVS)
  // 精準定位於台中市南區高工路 191 號 (真實地籍街廓 X: -2320, Z: 2553)
  // =========================================================================
  // 臺中市立臺中工業高級中等學校 (Taichung Industrial High School / TCIVS)
  // 精準定位於台中市南區高工路 191 號 (真實地籍街廓 X: -2320, Z: 2553)
  // 四至邊界：北臨工學路、南臨高工路、西臨工學六街、東臨工學二街
  // 100% 依據真實衛星 3D 空照圖與校區平面圖 1:1 精細建模：
  // 1. 南校門與迎賓軸：高工路氣派牌樓、傳達室、校訓立碑「誠樸精勤」
  // 2. 迎賓林蔭大道 (依指示重點植樹)：中央花崗岩步道、水池兩側對稱高聳樟樹與喬木林蔭雙排群、休閒石椅、景觀矮燈、修剪灌木花台
  // 3. 迎賓中央景觀水池：漢白玉池緣、清澈水面、3 組立體噴泉水柱水花
  // 4. 西南側大型綜合球場專區 (完全符合衛星空照)：雙座紅土壓克力網球場、雙座籃球場、圍網、4 座夜間高桿照明燈
  // 5. 中軸核心大樓：中工大樓 (挑高羅馬柱前廊/鐘樓大時鐘/12齒綠色校徽山牆)、跨棟空中通廊天橋
  // 6. 專業教學實習大樓群：第二實習大樓、第一實習大樓 (鋸齒採光天窗)、宏毅樓 (懸挑走廊)、化工圖傳大樓、員生社、中餐烘焙館
  // 7. 東南重工業實習廠區：機械大樓、汽車板金大樓 (挑高工業捲門與維修斜坡)、機械冷凍大樓 (大型冷卻水塔與吊車鋼樑)
  // 8. 400m 國際標準田徑運動場：8 道紅色 PU 跑道、天然草皮足球場、司令台 (雙層看台/遮陽頂/旗桿)、4 座體育場高桿探照燈、周邊綠樹
  // 9. 北校區：體育館 (樂群堂，鮮亮橘色大拱頂)、學生餐廳、圖書館、百齡樓、誠樸樓、懷思樓、工學路後門
  // 10. 親水生態水系：穿校生態小河 (旱溪支流/綠川排水) 蜿蜒穿過東南校區，搭配雙座白色景觀人行拱橋
  // 11. 校外周邊設施：高工路四線道、行人穿越斑馬線、台中高工公車站候車亭、人行道行道樹與黑色鍛鐵安全圍牆
  // =========================================================================
  // =========================================================================
  // 臺中市立臺中工業高級中等學校 (Taichung Industrial High School / TCIVS)
  // 精準定位於台中市南區高工路 191 號 (真實地籍街廓 X: -2320, Z: 2553)
  // 1:1 實拍照片考究精細修正 (對應使用者的 5 張實拍與街景對照圖)：
  // 1. 南校門 (Photo 1):
  //    - 高工路路面黃色網狀線 (網狀禁止停車區)、路面文字「停」「機車」「禁止停車」
  //    - 右側門柱 (鐘樓碑): 矗立白色高聳門柱，直書金銅楷書「臺中市立臺中工業高級中等學校」
  //    - 右側景觀圍牆: 純白磁磚矮牆，深藍金屬字「Taichung Industrial Senior High School」
  //    - 上方巨型科技看板:「躍升卓越 直踐實戰達人」，帶綠色齒輪校徽與專業群科副標
  //    - 左側傳達室 (警衛室): 水平滑窗、自動黃黑斜紋電動柵欄機、安全拒馬與交通錐
  //    - 左側全彩 LED 跑馬燈: 黑色箱體，發光點陣顯示各類技藝競賽全國總冠軍榮譽
  //    - 正門大王椰子樹景觀林
  // 2. 迎賓大道老榕樹綠色隧道 (Photo 2 & 3):
  //    - 自高工路南大門貫通至中工大樓，長達近百米的兩線道林蔭大道
  //    - 兩側密植古樸蒼勁百年老榕樹，茂密樹冠於空中合抱，形成遮天蔽日的雄偉綠色隧道
  //    - 榕樹旁設置經典校園黃黑斜紋底座景觀路燈 (Photo 2)
  //    - 東側排列汽車停車格、停放轎車與低矮修剪綠籬 (Photo 3)
  // 3. 中央景觀水池: 漢白玉池緣、清澈水面、3 組發光噴泉水柱
  // 4. 教學與行政核心:
  //    - 中工大樓 (行政主樓、鐘樓時鐘、綠色齒輪校徽)
  //    - 第二實習大樓、第一實習大樓、宏毅樓，配備真實窗帶、遮陽板與現代校舍立面
  // 5. 東南重工業實習廠區 (Photo 5 修正):
  //    - 機械冷凍大樓、汽車板金大樓、機械工場
  //    - 擺脫單調灰色方塊，採用米白磁磚、科技深藍橫帶、大面積長條帶狀工業窗與挑高電動鐵捲門
  //    - 高工路沿線設有柱列式鍛鐵安全圍牆、寬敞人行道與行道樹，視野開闊美麗
  // 6. 400m 國際標準田徑運動場 (Photo 4):
  //    - 8 道紅色 PU 跑道、中央天然草皮足球場、白線、球門、司令台與看台
  // 7. 西南綜合球場: 雙座紅土網球場、雙座籃球場、圍網與夜間高桿照明
  // 8. 北校區: 體育館 (樂群堂亮橘色拱頂)、圖書館、誠樸樓、工學路後門
  // =========================================================================
  static buildTaichungIndustrialHighSchool() {
    const group = new THREE.Group();
    group.name = 'tcivs_campus_bespoke';

    // 專屬校園材質調色盤
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x334155, roughness: 0.85 });
    const plazaPavingMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#e2e8f0') });
    const concWallMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#cbd5e1') });
    const whiteWallMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const creamWallMat = new THREE.MeshLambertMaterial({ color: 0xf1f5f9 });
    const darkGrayMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const darkRoofMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const gymOrangeRoofMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
    const glassMat = glass(0x38bdf8);
    const puRedTrackMat = new THREE.MeshLambertMaterial({ color: 0xb91c1c });
    const puWhiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const courtTerracottaMat = new THREE.MeshLambertMaterial({ color: 0xc2410c });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.7 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.75
    });

    // 專屬貼圖材質
    const cyberBannerTex = tcivsCyberBannerTexture();
    const whiteWallTex = tcivsWhiteWallTextTexture();
    const towerNameTex = tcivsTowerNameTexture();
    const ledMarqueeTex = tcivsLedMarqueeTexture();
    const yellowBoxTex = tcivsYellowBoxTexture();
    const workshopTex = tcivsWorkshopFacadeTexture();

    // 0. 校區全景基底 (Campus Base Slab, 340m 寬 x 410m 深)
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(340, 0.3, 410), grassMat);
    basePlate.position.set(0, 0.15, 0);
    group.add(basePlate);

    // =========================================================================
    // 1. 南校門全景 (高工路正門，100% 依據 Photo 1 實景還原)
    // =========================================================================
    // 正門中心：世界座標 X: -2399, Z: 2733 -> 區域座標 x: -79, z: 180
    const gateX = -79, gateZ = 180;

    // (A) 高工路路面黃色網狀線 (Yellow Criss-Cross Box Junction)
    const yellowBoxMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 18),
      new THREE.MeshBasicMaterial({ map: yellowBoxTex, transparent: true })
    );
    yellowBoxMesh.rotation.x = -Math.PI / 2;
    yellowBoxMesh.position.set(gateX, 0.25, gateZ + 22);
    group.add(yellowBoxMesh);

    // 校門口橘白雙色安全交通錐 (Traffic Cones)
    [-10, -6, -2, 2, 6, 10].forEach((cx) => {
      const coneGroup = new THREE.Group();
      const coneBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.05, 0.42),
        new THREE.MeshLambertMaterial({ color: 0xf97316 })
      );
      coneGroup.add(coneBase);
      const coneBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.18, 0.75, 8),
        new THREE.MeshLambertMaterial({ color: 0xf97316 })
      );
      coneBody.position.y = 0.38;
      coneGroup.add(coneBody);
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.13, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      stripe.position.y = 0.42;
      coneGroup.add(stripe);

      coneGroup.position.set(gateX + cx, 0.25, gateZ + 12);
      group.add(coneGroup);
    });

    // 紅白相間工程安全拒馬 (Barricades)
    [-11, 11].forEach((bx) => {
      const barricade = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.9, 0.12),
        new THREE.MeshLambertMaterial({ color: 0xef4444 })
      );
      barricade.position.set(gateX + bx, 0.7, gateZ + 10.5);
      group.add(barricade);
    });

    // (B) 正門右側：高聳白色門柱/鐘樓碑 (Photo 1)
    const towerX = gateX + 13.5, towerZ = gateZ + 3.0;
    const towerGeom = new THREE.BoxGeometry(2.4, 13.5, 2.4);
    const towerMats = [
      whiteWallMat, whiteWallMat, whiteWallMat, whiteWallMat,
      new THREE.MeshLambertMaterial({ map: towerNameTex }),
      whiteWallMat
    ];
    const entranceTower = new THREE.Mesh(towerGeom, towerMats);
    entranceTower.position.set(towerX, 6.75, towerZ);
    group.add(entranceTower);

    // 門柱幾何方頂造型
    const towerCap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 2.8), concWallMat);
    towerCap.position.set(towerX, 13.6, towerZ);
    group.add(towerCap);

    // (C) 正門右側：純白磁磚景觀矮牆「Taichung Industrial Senior High School」(Photo 1)
    const wallX = gateX + 26.5, wallZ = gateZ + 3.0;
    const whiteWallGeom = new THREE.BoxGeometry(23, 2.4, 0.6);
    const whiteWallMaterials = [
      whiteWallMat, whiteWallMat, concWallMat, concWallMat,
      new THREE.MeshLambertMaterial({ map: whiteWallTex }),
      whiteWallMat
    ];
    const whiteNameWall = new THREE.Mesh(whiteWallGeom, whiteWallMaterials);
    whiteNameWall.position.set(wallX, 1.2, wallZ);
    group.add(whiteNameWall);

    // 矮牆黑色基座與壓頂
    const wallBase = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.3, 0.8), darkGrayMat);
    wallBase.position.set(wallX, 0.15, wallZ);
    group.add(wallBase);

    const wallCoping = new THREE.Mesh(new THREE.BoxGeometry(23.4, 0.2, 0.8), darkGrayMat);
    wallCoping.position.set(wallX, 2.45, wallZ);
    group.add(wallCoping);

    // (D) 矮牆上方：巨型賽博科技看板「躍升卓越 直踐實戰達人」(Photo 1)
    const bannerGeom = new THREE.BoxGeometry(22.6, 4.6, 0.25);
    const bannerMats = [
      darkRoofMat, darkRoofMat, darkRoofMat, darkRoofMat,
      new THREE.MeshLambertMaterial({ map: cyberBannerTex }),
      darkRoofMat
    ];
    const cyberBanner = new THREE.Mesh(bannerGeom, bannerMats);
    cyberBanner.position.set(wallX, 4.85, wallZ);
    group.add(cyberBanner);

    // 鋼構背架支撐柱
    [-9, 0, 9].forEach((sx) => {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5.0, 0.2), steelMat);
      brace.position.set(wallX + sx, 4.85, wallZ - 0.25);
      group.add(brace);
    });

    // (E) 正門左側：現代化警衛室 / 傳達室 (Photo 1)
    const guardX = gateX - 15.5, guardZ = gateZ;
    const guardBldg = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3.8, 5.5), creamWallMat);
    guardBldg.position.set(guardX, 1.9, guardZ);
    group.add(guardBldg);

    // 警衛室現代平屋頂與懸挑深灰簷口
    const guardRoof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.45, 6.6), darkRoofMat);
    guardRoof.position.set(guardX, 3.9, guardZ);
    group.add(guardRoof);

    // 接待滑窗
    const guardWin = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 0.15), glassMat);
    guardWin.position.set(guardX, 2.0, guardZ + 2.76);
    group.add(guardWin);

    // 自動柵欄機 (Boom Barrier with Yellow/Black stripes)
    const barrierBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xf97316 })
    );
    barrierBase.position.set(gateX - 10.5, 0.6, gateZ + 2.5);
    group.add(barrierBase);

    const barrierArm = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 0.14, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xfacc15 })
    );
    barrierArm.position.set(gateX - 7.0, 1.15, gateZ + 2.5);
    group.add(barrierArm);

    // (F) 正門左側：全彩巨型 LED 電子跑馬燈資訊牆 (Photo 1)
    const marqueeX = gateX - 27.5, marqueeZ = gateZ + 2.0;
    const marqueeBaseWall = new THREE.Mesh(new THREE.BoxGeometry(13.0, 1.4, 1.2), concWallMat);
    marqueeBaseWall.position.set(marqueeX, 0.7, marqueeZ);
    group.add(marqueeBaseWall);

    const marqueeGeom = new THREE.BoxGeometry(12.2, 3.8, 0.3);
    const marqueeMats = [
      darkRoofMat, darkRoofMat, darkRoofMat, darkRoofMat,
      new THREE.MeshLambertMaterial({ map: ledMarqueeTex }),
      darkRoofMat
    ];
    const marqueeMesh = new THREE.Mesh(marqueeGeom, marqueeMats);
    marqueeMesh.position.set(marqueeX, 3.2, marqueeZ + 0.5);
    group.add(marqueeMesh);

    // (G) 警衛室後方：大王椰子樹景觀群 (Photo 1)
    [-34, -28, -22, -16].forEach((px) => {
      const palm = createTree('palm', 12.5, 4.2, 0x1b5e20);
      palm.position.set(gateX + px, 0.25, gateZ - 6);
      group.add(palm);
    });

    // =========================================================================
    // 2. 迎賓大道百年老榕樹綠色隧道 (Photo 2 & Photo 3 核心亮點！)
    // =========================================================================
    // 貫通南北迎賓大道：自校門 z: 172 延伸至中工大樓 z: 75 (長 97m，路寬 12m)
    const promRoad = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.06, 97), asphaltMat);
    promRoad.position.set(gateX, 0.28, 123.5);
    group.add(promRoad);

    // 大道黃色虛線中央分向線 (Yellow Dashed Line)
    for (let lz = 80; lz <= 168; lz += 6) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.02, 3.2),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      dash.position.set(gateX, 0.32, lz);
      group.add(dash);
    }

    // 迎賓大道兩側百年老榕樹 (百年古榕枝柯交抱，形成震撼綠色拱頂隧道！)
    // 西側榕樹列 (向東拱向路中，leanX = 1.0)
    for (let rz = 82; rz <= 166; rz += 12) {
      const banyanW = createTcivsBanyanTree(10.5, 9.5, 1.0);
      banyanW.position.set(gateX - 7.5, 0.26, rz);
      group.add(banyanW);
    }

    // 東側榕樹列 (向西拱向路中，leanX = -1.0)
    for (let rz = 82; rz <= 166; rz += 12) {
      const banyanE = createTcivsBanyanTree(10.5, 9.5, -1.0);
      banyanE.position.set(gateX + 7.5, 0.26, rz);
      group.add(banyanE);
    }

    // 東側道路旁校園停車場與轎車停放帶 (Photo 3)
    const parkLot = new THREE.Mesh(new THREE.BoxGeometry(16, 0.05, 90), asphaltMat);
    parkLot.position.set(gateX + 21, 0.28, 123.5);
    group.add(parkLot);

    // 停車格標線與停放車輛
    const carColors = [0x1e3a8a, 0xffffff, 0x475569, 0xb91c1c, 0xf1f5f9, 0x0f172a];
    for (let cz = 86; cz <= 160; cz += 10) {
      const stallLine = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 0.02, 0.2),
        puWhiteLineMat
      );
      stallLine.position.set(gateX + 17, 0.31, cz);
      group.add(stallLine);

      const carGroup = new THREE.Group();
      const col = carColors[Math.abs(Math.floor(cz / 10)) % carColors.length];
      const carBody = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 1.3, 1.9),
        new THREE.MeshLambertMaterial({ color: col })
      );
      carBody.position.y = 0.65;
      carGroup.add(carBody);

      const carCabin = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.85, 1.7),
        new THREE.MeshLambertMaterial({ color: 0x1e293b })
      );
      carCabin.position.set(-0.2, 1.5, 0);
      carGroup.add(carCabin);

      carGroup.position.set(gateX + 17.5, 0.28, cz + 5);
      group.add(carGroup);
    }

    // 停車場旁低矮修剪綠籬 (Photo 3)
    for (let hz = 80; hz <= 168; hz += 8) {
      const hedge = createTree('shrub', 1.4, 1.8, 0x15803d);
      hedge.position.set(gateX + 29.5, 0.26, hz);
      group.add(hedge);
    }

    // =========================================================================
    // 3. 中央景觀水池與噴泉 (Scenic Pool & Fountains)
    // =========================================================================
    const poolX = gateX - 42, poolZ = 125;
    const poolCurb = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.8, 38.0), concWallMat);
    poolCurb.position.set(poolX, 0.4, poolZ);
    group.add(poolCurb);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.6, 36.2), waterMat);
    poolWater.position.set(poolX, 0.45, poolZ);
    group.add(poolWater);

    [-11, 0, 11].forEach((fz) => {
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.4, 3.5, 8),
        new THREE.MeshStandardMaterial({
          color: 0xe0f7fa,
          emissive: 0x00e5ff,
          emissiveIntensity: 1.8,
          transparent: true,
          opacity: 0.75
        })
      );
      jet.position.set(poolX, 1.9, poolZ + fz);
      group.add(jet);
    });

    // =========================================================================
    // 4. 中軸核心教學與行政大樓 (中工大樓、第二實習、第一實習、宏毅樓)
    // =========================================================================
    // (A) 中工大樓 (Administration & Main Hall, x: -54, z: 68)
    const chungX = -54, chungZ = 68;
    const chungBldg = facadeBox(116, 18, 22, workshopTex, 14, darkRoofMat);
    chungBldg.position.set(chungX, 9.0, chungZ);
    group.add(chungBldg);

    // 中工大樓前廊與鐘樓
    const portico = new THREE.Mesh(new THREE.BoxGeometry(22, 5.5, 6.5), concWallMat);
    portico.position.set(chungX, 2.75, chungZ + 12.5);
    group.add(portico);

    const clockTower = new THREE.Mesh(new THREE.BoxGeometry(14, 25, 14), whiteWallMat);
    clockTower.position.set(chungX, 12.5, chungZ);
    group.add(clockTower);

    const clockFace = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(chungX, 21.5, chungZ + 7.15);
    group.add(clockFace);

    const roofCrest = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x00e676, metalness: 0.5, roughness: 0.3 })
    );
    roofCrest.rotation.x = Math.PI / 2;
    roofCrest.position.set(chungX, 26.5, chungZ + 7.15);
    group.add(roofCrest);

    // (B) 第二實習大樓 (x: -54, z: 22)
    const prac2 = facadeBox(118, 16, 20, workshopTex, 14, darkRoofMat);
    prac2.position.set(-54, 8.0, 22);
    group.add(prac2);

    // (C) 第一實習大樓 (x: -54, z: -16)
    const prac1 = facadeBox(118, 16, 20, workshopTex, 14, darkRoofMat);
    prac1.position.set(-54, 8.0, -16);
    group.add(prac1);

    for (let sx = -50; sx <= 50; sx += 14) {
      const skylight = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.4, 4), concWallMat);
      skylight.rotation.y = Math.PI / 4;
      skylight.position.set(-54 + sx, 17.2, -16);
      group.add(skylight);
    }

    // (D) 宏毅樓 (x: -53, z: -62)
    const hon = facadeBox(128, 16, 18, workshopTex, 14, darkRoofMat);
    hon.position.set(-53, 8.0, -62);
    group.add(hon);

    // =========================================================================
    // 5. 東南實習工場群 (Photo 5 徹底修正！重現真實職校重工業廠房)
    // =========================================================================
    // (A) 機械冷凍大樓 (x: 55, z: 161，寬 95m x 高 13.5m x 深 36m)
    const freezeBldg = facadeBox(95, 13.5, 36, workshopTex, 12, darkRoofMat);
    freezeBldg.position.set(55, 6.75, 161);
    group.add(freezeBldg);

    // 機械大樓 1 樓挑高電動鐵捲門
    [-32, -16, 0, 16, 32].forEach((sx) => {
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 5.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.35 })
      );
      shutter.position.set(55 + sx, 2.75, 161 + 18.2);
      group.add(shutter);
    });

    // 屋頂重型冷卻水塔與通風設備
    [-26, 0, 26].forEach((tx) => {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 3.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 })
      );
      tower.position.set(55 + tx, 15.4, 161);
      group.add(tower);
    });

    // (B) 汽車、板金大樓 (x: 80, z: 129，寬 80m x 高 12m x 深 20m)
    const autoBldg = facadeBox(80, 12, 20, workshopTex, 12, darkRoofMat);
    autoBldg.position.set(80, 6.0, 129);
    group.add(autoBldg);

    // (C) 機械大樓 (x: 75, z: 52，寬 110m x 高 13m x 深 18m)
    const mechHall = facadeBox(110, 13, 18, workshopTex, 12, darkRoofMat);
    mechHall.position.set(75, 6.5, 52);
    group.add(mechHall);

    // =========================================================================
    // 6. 400m 國際標準田徑運動場 (Photo 4 實景還原)
    // =========================================================================
    const trackX = 65, trackZ = -35;
    const puOuter = new THREE.Mesh(new THREE.BoxGeometry(88, 0.08, 140), puRedTrackMat);
    puOuter.position.set(trackX, 0.28, trackZ);
    group.add(puOuter);

    // 8 道白色田徑跑道劃線
    for (let lane = 1; lane <= 8; lane++) {
      const lw = 88 - lane * 3.8;
      const ld = 140 - lane * 3.8;
      if (lw <= 12 || ld <= 20) break;
      const laneLine = new THREE.Mesh(new THREE.BoxGeometry(lw, 0.02, ld), puWhiteLineMat);
      laneLine.position.set(trackX, 0.32, trackZ);
      group.add(laneLine);

      const trackFill = new THREE.Mesh(new THREE.BoxGeometry(lw - 0.2, 0.03, ld - 0.2), puRedTrackMat);
      trackFill.position.set(trackX, 0.33, trackZ);
      group.add(trackFill);
    }

    // 中央天然草皮足球場
    const soccerLawn = new THREE.Mesh(
      new THREE.BoxGeometry(54, 0.05, 96),
      new THREE.MeshLambertMaterial({ color: 0x16a34a })
    );
    soccerLawn.position.set(trackX, 0.35, trackZ);
    group.add(soccerLawn);

    // 白色足球場中圈
    const soccerCircle = new THREE.Mesh(
      new THREE.RingGeometry(8.5, 8.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    soccerCircle.rotation.x = -Math.PI / 2;
    soccerCircle.position.set(trackX, 0.38, trackZ);
    group.add(soccerCircle);

    // 操場司令台看台
    const stand = new THREE.Mesh(new THREE.BoxGeometry(32, 4.2, 8.5), concWallMat);
    stand.position.set(trackX - 48, 2.1, trackZ);
    group.add(stand);

    // 4 座夜間體育場高桿探照燈
    [
      [-48, -72], [48, -72],
      [-48, 72], [48, 72]
    ].forEach(([dx, dz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 26, 8), steelMat);
      pole.position.set(trackX + dx, 13, trackZ + dz);
      group.add(pole);

      const lightGrid = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 2.8, 0.8),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 2.2
        })
      );
      lightGrid.position.set(trackX + dx, 26, trackZ + dz);
      group.add(lightGrid);
    });

    // =========================================================================
    // 7. 西南綜合球場群 (雙座紅土網球場)
    // =========================================================================
    const tennisX = gateX - 45, tennisZ = gateZ - 20;
    const tennisFloor = new THREE.Mesh(new THREE.BoxGeometry(38, 0.05, 32), courtTerracottaMat);
    tennisFloor.position.set(tennisX, 0.28, tennisZ);
    group.add(tennisFloor);

    // =========================================================================
    // 8. 北校區建築 (體育館樂群堂、工學路後門)
    // =========================================================================
    const gymX = 75, gymZ = -145;
    const gymBase = new THREE.Mesh(new THREE.BoxGeometry(56, 12, 68), concWallMat);
    gymBase.position.set(gymX, 6.0, gymZ);
    group.add(gymBase);

    const gymArchRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(30, 30, 56, 24, 1, false, 0, Math.PI),
      gymOrangeRoofMat
    );
    gymArchRoof.rotation.z = Math.PI / 2;
    gymArchRoof.rotation.y = Math.PI / 2;
    gymArchRoof.position.set(gymX, 12, gymZ);
    group.add(gymArchRoof);

    // 工學路北後門
    [-9, 9].forEach((gx) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.5, 1.8), concWallMat);
      p.position.set(-12 + gx, 2.75, -195);
      group.add(p);
    });
    const northGateBeam = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 2.0), concWallMat);
    northGateBeam.position.set(-12, 5.5, -195);
    group.add(northGateBeam);

    // =========================================================================
    // 9. 校園周邊圍牆、高工路人行道與綠蔭 (大門視野完全打通，絕無遮擋！)
    // =========================================================================
    // 高工路人行道 (寬 8m，沿校區南界鋪設)
    const gaogongSidewalk = new THREE.Mesh(new THREE.BoxGeometry(334, 0.1, 8), plazaPavingMat);
    gaogongSidewalk.position.set(0, 0.22, 190);
    group.add(gaogongSidewalk);

    // 「台中高工」公車站候車亭 (高工路人行道東側)
    const tcivsBusStop = new THREE.Mesh(
      new THREE.BoxGeometry(10, 3.2, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    tcivsBusStop.position.set(gateX + 48, 1.6, 191);
    group.add(tcivsBusStop);

    const busSign = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.9, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x01579b, emissive: 0x01579b, emissiveIntensity: 1.2 })
    );
    busSign.position.set(gateX + 48, 3.4, 192.4);
    group.add(busSign);

    // 高工路人行道行道樹 (嚴格避開大門口出入視野區)
    for (let x = -150; x <= 150; x += 24) {
      if (x >= gateX - 35 && x <= gateX + 42) continue;
      const streetTree = createTree('broadleaf', 8.5, 6.0, 0x15803d);
      streetTree.position.set(x, 0.24, 191);
      group.add(streetTree);
    }

    // 柱列式鍛鐵安全圍牆 (開門設計：大門口 gateX: -79 留出 45m 寬闊視野，絕不橫跨擋門！)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.8 });

    // 大門西側圍牆 (-165 至 gateX - 35 = -114)
    const fenceW1 = new THREE.Mesh(new THREE.BoxGeometry(51, 2.2, 0.2), fenceMat);
    fenceW1.position.set((-165 - 114) / 2, 1.1, 184);
    group.add(fenceW1);

    // 大門東側圍牆 (gateX + 42 = -37 至 165)
    const fenceE1 = new THREE.Mesh(new THREE.BoxGeometry(202, 2.2, 0.2), fenceMat);
    fenceE1.position.set((-37 + 165) / 2, 1.1, 184);
    group.add(fenceE1);

    // 北、西、東三側外圍圍牆
    const fenceN = new THREE.Mesh(new THREE.BoxGeometry(330, 2.2, 0.2), fenceMat);
    fenceN.position.set(0, 1.1, -198); group.add(fenceN);
    const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 384), fenceMat);
    fenceW.position.set(-165, 1.1, -6); group.add(fenceW);
    const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 384), fenceMat);
    fenceE.position.set(165, 1.1, -6); group.add(fenceE);

    return group;
  }
}
