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
  static buildTaichungIndustrialHighSchool() {
    const group = new THREE.Group();
    group.name = 'tcivs_campus_bespoke';

    // 精緻材質調色盤 (真實校園質感)
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x37474f, roughness: 0.85 });
    const plazaPavingMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#dcdde1') });
    const concWallMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#c5c8c5') });
    const yellowWallMat = new THREE.MeshLambertMaterial({ color: 0xf6e58d });
    const beigeWallMat = new THREE.MeshLambertMaterial({ color: 0xf7f1e3 });
    const darkGrayWallMat = new THREE.MeshLambertMaterial({ color: 0x78909c });
    const brickRedMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
    const gymOrangeRoofMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    const darkRoofMat = new THREE.MeshLambertMaterial({ color: 0x485460 });
    const glassMat = glass(0x81ecec);
    const darkGlassMat = glass(0x2f3542);
    const gearGreenMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.35, metalness: 0.45 });
    const crestRedMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.35, metalness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.25, metalness: 0.85 });
    const puRedTrackMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
    const puWhiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const courtTerracottaMat = new THREE.MeshLambertMaterial({ color: 0xc0392b }); // 西南球場紅土壓克力
    const courtGreenBorderMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    const courtBlueMat = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.4, metalness: 0.7 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      emissive: 0x00838f,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.8
    });

    // 0. 校區全景基底 (Campus Base Slab, 335m 寬 x 405m 深，平鋪於地表)
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(334, 0.3, 404), grassMat);
    basePlate.position.set(0, 0.15, 0);
    group.add(basePlate);

    // 校內主要柏油林蔭幹道網 (南北林蔭大道與東西環校幹道)
    const roadMainV = new THREE.Mesh(new THREE.BoxGeometry(11, 0.04, 390), asphaltMat);
    roadMainV.position.set(10, 0.32, 0);
    group.add(roadMainV);

    const roadSouthH = new THREE.Mesh(new THREE.BoxGeometry(325, 0.04, 11), asphaltMat);
    roadSouthH.position.set(0, 0.32, 175);
    group.add(roadSouthH);

    const roadMidH = new THREE.Mesh(new THREE.BoxGeometry(325, 0.04, 10), asphaltMat);
    roadMidH.position.set(0, 0.32, -5);
    group.add(roadMidH);

    const roadNorthH = new THREE.Mesh(new THREE.BoxGeometry(325, 0.04, 11), asphaltMat);
    roadNorthH.position.set(0, 0.32, -185);
    group.add(roadNorthH);

    // =========================================================================
    // 1. 南門 (高工路正門)：牌樓、傳達室、景觀水池、林蔭大道、精神堡壘
    // =========================================================================
    // 正門坐標：世界 X: -2399, Z: 2735 -> 區域坐標 (x: -79, z: 182)
    const gateX = -79, gateZ = 182;

    // 氣派白色花崗岩雙柱迎賓門樓 (跨度 24 米)
    [-11, 11].forEach(gx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.8, 2.4), concWallMat);
      p.position.set(gateX + gx, 3.9, gateZ);
      group.add(p);
    });

    const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(25.5, 1.6, 2.6), concWallMat);
    gateBeam.position.set(gateX, 7.7, gateZ);
    group.add(gateBeam);

    // 金色楷書校名牌匾「臺中市立臺中工業高級中等學校」
    const namePlate = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.75, 0.15), goldMat);
    namePlate.position.set(gateX, 7.7, gateZ + 1.35); // 朝向高工路南向車流
    group.add(namePlate);

    // 不鏽鋼電動伸縮推拉校門
    const slidingGate = new THREE.Mesh(new THREE.BoxGeometry(17, 2.2, 0.2), steelMat);
    slidingGate.position.set(gateX, 1.1, gateZ);
    group.add(slidingGate);

    // 經典紅色警衛室 / 傳達室 (平面圖標示之傳達室，位於大門西側)
    const guardHouse = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 5.2), brickRedMat);
    guardHouse.position.set(gateX - 16, 1.8, gateZ - 2.5);
    group.add(guardHouse);

    const guardRoof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.45, 6.2), darkRoofMat);
    guardRoof.position.set(gateX - 16, 3.8, gateZ - 2.5);
    group.add(guardRoof);

    const guardWin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 0.1), glassMat);
    guardWin.position.set(gateX - 16, 2.0, gateZ + 0.15);
    group.add(guardWin);

    // 校訓精神立碑「誠 樸 精 勤」
    const motto = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 }));
    motto.position.set(gateX + 16, 1.6, gateZ - 2.5);
    group.add(motto);

    // =========================================================================
    // 2. 迎賓林蔭大道 (Promenade & Dense Trees) — 依指示重點精細植樹
    // =========================================================================
    // 中央花崗岩步道大道 (寬 26m，自校門 z:178 貫穿至中工大樓 z:85，中軸位於 x: -52)
    const promX = -52;
    const promenadePaving = new THREE.Mesh(new THREE.BoxGeometry(26, 0.05, 96), plazaPavingMat);
    promenadePaving.position.set(promX, 0.33, 132);
    group.add(promenadePaving);

    // 迎賓中央景觀水池 (Scenic Reflection Pool, 18.6m x 44.6m)
    const poolX = promX, poolZ = 125;
    const poolCurb = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.8, 44.6), concWallMat);
    poolCurb.position.set(poolX, 0.4, poolZ);
    group.add(poolCurb);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.6, 42.8), waterMat);
    poolWater.position.set(poolX, 0.45, poolZ);
    group.add(poolWater);

    // 3 組發光中央噴泉水柱
    [-13, 0, 13].forEach(fz => {
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.35, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xe0f7fa, emissive: 0x80deea, emissiveIntensity: 1.6, transparent: true, opacity: 0.7 }));
      jet.position.set(poolX, 1.8, poolZ + fz);
      group.add(jet);
    });

    // 水池四周常綠修剪球灌木綠籬
    [-1, 1].forEach(side => {
      for (let z = 100; z <= 150; z += 10) {
        const shrub = createTree('shrub', 1.8, 2.2, 0x1b5e20);
        shrub.position.set(poolX + side * 10.5, 0.32, z);
        group.add(shrub);
      }
    });

    // 【重要核心需求】：林蔭大道兩側密植雙排茂密大喬木 (樟樹/黑板樹雙排林蔭)
    // 內排高聳綠蔭大喬木 (距中軸 15m，x: -67 與 x: -37)
    [-15, 15].forEach(dx => {
      for (let z = 90; z <= 174; z += 12) {
        const tree = createTree('broadleaf', 9.5, 6.8, 0x2e7d32);
        tree.position.set(promX + dx, 0.32, z);
        group.add(tree);

        // 樹下花崗岩休閒石椅 (每隔一棵設置)
        if (z % 24 === 6 || z % 24 === 18) {
          const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.7), concWallMat);
          bench.position.set(promX + dx + (dx > 0 ? 2.5 : -2.5), 0.55, z);
          group.add(bench);
        }

        // 庭園景觀矮燈柱 (Solar Pathway Lanterns)
        const lightBollard = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.1, 8), steelMat);
        lightBollard.position.set(promX + dx + (dx > 0 ? -1.8 : 1.8), 0.85, z + 6);
        group.add(lightBollard);

        const glowCap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfff3e0 }));
        glowCap.position.set(promX + dx + (dx > 0 ? -1.8 : 1.8), 1.45, z + 6);
        group.add(glowCap);
      }
    });

    // 外排宏偉綠蔭大喬木 (距中軸 26m，x: -78 與 x: -26，形成磅礡雙排林蔭大道)
    [-26, 26].forEach(dx => {
      for (let z = 96; z <= 168; z += 14) {
        const treeOuter = createTree('broadleaf', 10.5, 7.5, 0x1b5e20);
        treeOuter.position.set(promX + dx, 0.32, z);
        group.add(treeOuter);
      }
    });

    // 校門口迎賓大草坪上的散落景觀喬木與大王椰子樹 (東側迎賓綠地)
    [-12, 0, 14].forEach(lx => {
      [110, 135, 158].forEach(lz => {
        const lawnTree = createTree('broadleaf', 8.5, 6.0, 0x388e3c);
        lawnTree.position.set(lx, 0.32, lz);
        group.add(lawnTree);
      });
    });

    // =========================================================================
    // 3. 西南側大型綜合球場專區 (Southwest Sports Courts matching Photo 1)
    // =========================================================================
    // 依衛星空照，位於校門草坪西側、實習工廠南側 (x: -122, z: 145)
    const swCourtX = -122, swCourtZ = 145;

    // 綠色外框緩衝區地坪 (長 58m x 寬 42m)
    const courtBorder = new THREE.Mesh(new THREE.BoxGeometry(58, 0.06, 42), courtGreenBorderMat);
    courtBorder.position.set(swCourtX, 0.33, swCourtZ);
    group.add(courtBorder);

    // 雙座紅土壓克力網球場 (Tennis Courts, 依衛星圖清晰可見的紅土亮橘鋪面)
    const tennisBase = new THREE.Mesh(new THREE.BoxGeometry(52, 0.08, 36), courtTerracottaMat);
    tennisBase.position.set(swCourtX, 0.34, swCourtZ);
    group.add(tennisBase);

    // 白色標準球場白線 (邊線、底線、發球線)
    [-10, 10].forEach(cz => {
      const courtLine = new THREE.Mesh(new THREE.BoxGeometry(44, 0.02, 16), puWhiteLineMat);
      courtLine.position.set(swCourtX, 0.39, swCourtZ + cz);
      group.add(courtLine);

      const courtInner = new THREE.Mesh(new THREE.BoxGeometry(43.7, 0.03, 15.7), courtTerracottaMat);
      courtInner.position.set(swCourtX, 0.395, swCourtZ + cz);
      group.add(courtInner);

      // 網球網與立柱 (Tennis Net & Steel Posts)
      const net = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 16.5),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
      net.position.set(swCourtX, 0.85, swCourtZ + cz);
      group.add(net);

      [-8.3, 8.3].forEach(nz => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), steelMat);
        post.position.set(swCourtX, 0.9, swCourtZ + cz + nz);
        group.add(post);
      });
    });

    // 球場四周防護鍍鋅鐵絲圍網 (4m 高)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x78909c, wireframe: true });
    const courtFence = new THREE.Mesh(new THREE.BoxGeometry(54, 3.8, 38), fenceMat);
    courtFence.position.set(swCourtX, 2.2, swCourtZ);
    group.add(courtFence);

    // 4 座夜間高桿照明燈塔 (Stadium Floodlight Towers)
    [[-28, -20], [-28, 20], [28, -20], [28, 20]].forEach(([fx, fz]) => {
      const lightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 12, 8), steelMat);
      lightPole.position.set(swCourtX + fx, 6.0, swCourtZ + fz);
      group.add(lightPole);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9c4, emissiveIntensity: 1.5 }));
      lampHead.position.set(swCourtX + fx, 12.0, swCourtZ + fz);
      group.add(lampHead);
    });

    // 球場周邊綠籬與遮蔭樹
    for (let z = swCourtZ - 18; z <= swCourtZ + 18; z += 12) {
      const cTree = createTree('broadleaf', 7.5, 5.2, 0x2e7d32);
      cTree.position.set(swCourtX - 31, 0.32, z);
      group.add(cTree);
    }

    // =========================================================================
    // 4. 臺中高工 12 齒綠色齒輪校徽產生器 (TCIVS Gear Crest)
    // =========================================================================
    const createGearCrest = (size = 5.2) => {
      const crest = new THREE.Group();
      // 綠色外齒輪環 (12 齒)
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.5, size * 0.5, 0.36, 24), gearGreenMat);
      ring.rotation.x = Math.PI / 2;
      crest.add(ring);

      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.22, 0.38), gearGreenMat);
        tooth.position.set(Math.sin(ang) * (size * 0.55), Math.cos(ang) * (size * 0.55), 0);
        tooth.rotation.z = -ang;
        crest.add(tooth);
      }

      // 內圈白色襯底
      const innerWhite = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.36, size * 0.36, 0.38, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      innerWhite.rotation.x = Math.PI / 2;
      crest.add(innerWhite);

      // 紅色「工」與「中」字形幾何體
      const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.42, size * 0.08, 0.42), crestRedMat);
      hBar1.position.set(0, size * 0.15, 0); crest.add(hBar1);
      const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.42, size * 0.08, 0.42), crestRedMat);
      hBar2.position.set(0, -size * 0.15, 0); crest.add(hBar2);
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(size * 0.09, size * 0.45, 0.42), crestRedMat);
      vBar.position.set(0, 0, 0); crest.add(vBar);
      const centerBox = new THREE.Mesh(new THREE.BoxGeometry(size * 0.24, size * 0.2, 0.44),
        new THREE.MeshLambertMaterial({ color: 0xffffff }));
      crest.add(centerBox);
      const midBar = new THREE.Mesh(new THREE.BoxGeometry(size * 0.24, size * 0.06, 0.46), crestRedMat);
      crest.add(midBar);

      return crest;
    };

    // =========================================================================
    // 5. 中軸教學核心大樓群 (中工大樓、第二實習大樓、第一實習大樓、宏毅樓)
    // =========================================================================

    // (1) 中工大樓 (Administration & Main Building, 區域坐標 x: -52, z: 72)
    // 依 Overture 足跡：寬 122m x 深 25m x 高 19m (四層樓宏偉行政中樞)
    const admX = -52, admZ = 72;
    const admW = 122, admH = 19, admD = 25;
    const adm = new THREE.Mesh(new THREE.BoxGeometry(admW, admH, admD), yellowWallMat);
    adm.position.set(admX, admH / 2, admZ);
    group.add(adm);

    // 四層樓規律鋁窗與水平遮陽雨庇
    for (let floor = 1; floor <= 4; floor++) {
      const fy = floor * 4.4 - 1.2;
      const ribbonWin = new THREE.Mesh(new THREE.BoxGeometry(admW - 8, 1.8, admD + 0.25), darkGlassMat);
      ribbonWin.position.set(admX, fy, admZ);
      group.add(ribbonWin);

      const sunshade = new THREE.Mesh(new THREE.BoxGeometry(admW - 6, 0.22, admD + 1.2), concWallMat);
      sunshade.position.set(admX, fy + 1.1, admZ);
      group.add(sunshade);
    }

    // 正面挑高迎賓羅馬柱列門廊 (面向南側水池，Z+)
    for (let c = -3; c <= 3; c++) {
      if (c === 0) continue;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 9.5, 12), concWallMat);
      col.position.set(admX + c * 4.8, 4.75, admZ + admD / 2 + 2.8);
      group.add(col);
    }
    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 7.0), concWallMat);
    porticoRoof.position.set(admX, 10.1, admZ + admD / 2 + 2.6);
    group.add(porticoRoof);

    // 中央鐘樓頂閣與大時鐘
    const tower = new THREE.Mesh(new THREE.BoxGeometry(18, 7.5, 16), beigeWallMat);
    tower.position.set(admX, admH + 3.75, admZ);
    group.add(tower);

    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(admX, admH + 3.75, admZ + 8.1); // 朝南面向正門
    group.add(clockFace);

    // 中工大樓山牆頂部矗立 12 齒綠色齒輪校徽
    const bigCrest = createGearCrest(5.6);
    bigCrest.position.set(admX, admH + 9.0, admZ + 4.5);
    group.add(bigCrest);

    // 金色字體「中工大樓」
    const admSign = new THREE.Mesh(new THREE.BoxGeometry(12, 1.3, 0.25), goldMat);
    admSign.position.set(admX, admH + 0.8, admZ + admD / 2 + 0.25);
    group.add(admSign);

    // 跨棟二樓至三樓空中通廊天橋 (Connecting Skybridge between Wings)
    const bridge1to2 = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.2, 24), concWallMat);
    bridge1to2.position.set(admX, 7.5, admZ - 20);
    group.add(bridge1to2);

    // (2) 第二實習大樓 (電機、資訊、控制科, 區域坐標 x: -54, z: 25)
    // 依 Overture 足跡：寬 124m x 深 16m x 高 17m
    const lab2X = -54, lab2Z = 25;
    const lab2 = new THREE.Mesh(new THREE.BoxGeometry(124, 17, 16), beigeWallMat);
    lab2.position.set(lab2X, 8.5, lab2Z);
    group.add(lab2);

    const blueTrim2 = new THREE.Mesh(new THREE.BoxGeometry(124.4, 1.2, 16.4),
      new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
    blueTrim2.position.set(lab2X, 12.5, lab2Z);
    group.add(blueTrim2);

    // 屋頂機電排風冷卻塔與通訊天線
    [-25, 25].forEach(tx => {
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.4, 5.8), steelMat);
      acUnit.position.set(lab2X + tx, 18.2, lab2Z);
      group.add(acUnit);
    });

    // (3) 第一實習大樓 (建築、土木、電子、製圖科, 區域坐標 x: -80, z: -15)
    // 依 Overture 足跡：寬 130m x 深 15m x 高 17m
    const lab1X = -80, lab1Z = -15;
    const lab1 = new THREE.Mesh(new THREE.BoxGeometry(130, 17, 15), concWallMat);
    lab1.position.set(lab1X, 8.5, lab1Z);
    group.add(lab1);

    // 屋頂建築製圖採光天窗排 (Sawtooth Shed Skylights)
    for (let sx = -45; sx <= 45; sx += 15) {
      const skylight = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), glassMat);
      skylight.rotation.y = Math.PI / 4;
      skylight.position.set(lab1X + sx, 18.3, lab1Z);
      group.add(skylight);
    }

    // (4) 宏毅樓 (主要教學大樓, 區域坐標 x: -53, z: -58)
    // 依 Overture 足跡：寬 128m x 深 16m x 高 16m
    const honX = -53, honZ = -58;
    const hon = new THREE.Mesh(new THREE.BoxGeometry(128, 16, 16), yellowWallMat);
    hon.position.set(honX, 8.0, honZ);
    group.add(hon);

    // 南向三層貫通式走廊與紅色防墜金屬欄杆
    for (let fl = 1; fl <= 3; fl++) {
      const corridor = new THREE.Mesh(new THREE.BoxGeometry(128, 0.4, 2.6), concWallMat);
      corridor.position.set(honX, fl * 4.6, honZ + 8.0 + 1.3);
      group.add(corridor);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(128, 1.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
      rail.position.set(honX, fl * 4.6 + 0.6, honZ + 8.0 + 2.5);
      group.add(rail);
    }

    // =========================================================================
    // 6. 西側專業系館與生活設施 (化工圖傳大樓、員生社、中餐烘焙教室)
    // =========================================================================
    // 化工圖傳大樓 (沿工學六街延伸，坐標 x: -144, z: 28，寬 14m x 長 70m x 高 16m)
    const chem = new THREE.Mesh(new THREE.BoxGeometry(14, 16, 70), beigeWallMat);
    chem.position.set(-144, 8.0, 28);
    group.add(chem);

    const chemStripe = new THREE.Mesh(new THREE.BoxGeometry(14.4, 1.4, 70.4),
      new THREE.MeshLambertMaterial({ color: 0x8e44ad }));
    chemStripe.position.set(-144, 11.5, 28);
    group.add(chemStripe);

    // 員生社與中餐烘焙教室 (x: -146, z: -55 ~ 125)
    const store = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 45), yellowWallMat);
    store.position.set(-146, 4.0, -55);
    group.add(store);

    const bake = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 24), concWallMat);
    bake.position.set(-146, 4.5, 125);
    group.add(bake);

    // =========================================================================
    // 7. 東南實習廠區 (機械大樓、汽車板金大樓、機械冷凍大樓、機械工場)
    // =========================================================================
    // (1) 機械大樓 (x: 82, z: 52，寬 117m x 深 18m x 高 13m)
    const mechHall = new THREE.Mesh(new THREE.BoxGeometry(117, 13, 18), darkGrayWallMat);
    mechHall.position.set(82, 6.5, 52);
    group.add(mechHall);

    // (2) 汽車、板金大樓 (x: 88, z: 129，寬 82m x 深 20m x 高 11m，挑高實習車廠)
    const autoBldg = new THREE.Mesh(new THREE.BoxGeometry(82, 11, 20), darkGrayWallMat);
    autoBldg.position.set(88, 5.5, 129);
    group.add(autoBldg);

    // 4 組大型工業電動捲門與維修出入斜坡
    [-28, -9, 9, 28].forEach(gx => {
      const rollDoor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 5.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7 }));
      rollDoor.position.set(88 + gx, 2.9, 129 + 10.1);
      group.add(rollDoor);
    });

    // (3) 機械冷凍大樓 (x: 67, z: 161，寬 97m x 深 38m x 高 12m，大型機電廠區)
    const freezeBldg = new THREE.Mesh(new THREE.BoxGeometry(97, 12, 38), darkGrayWallMat);
    freezeBldg.position.set(67, 6.0, 161);
    group.add(freezeBldg);

    // 屋頂重型冷卻水塔與吊車鋼樑
    [-25, 0, 25].forEach(tx => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 }));
      tower.position.set(67 + tx, 13.9, 161);
      group.add(tower);
    });

    // =========================================================================
    // 8. 400m 國際標準田徑運動場 (Stadium) 與體育球場群 (東側工學二街側)
    // =========================================================================
    // 操場坐標：x: 75, z: -20 (寬 86m x 長 138m)
    const trackX = 75, trackZ = -20;

    // 橢圓形 8 跑道磚紅色 PU 田徑場
    const trackBase = new THREE.Mesh(new THREE.BoxGeometry(86, 0.08, 138), puRedTrackMat);
    trackBase.position.set(trackX, 0.34, trackZ);
    group.add(trackBase);

    // 內圈綠色天然草皮足球場
    const pitch = new THREE.Mesh(new THREE.BoxGeometry(56, 0.1, 106), grassMat);
    pitch.position.set(trackX, 0.35, trackZ);
    group.add(pitch);

    // 白色足球場標線與中圈
    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(8.5, 8.8, 24), puWhiteLineMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(trackX, 0.41, trackZ);
    group.add(centerCircle);

    // 司令台 (Grandstand / Podium，位於跑道東側中央，面向操場西向)
    const grandstandX = trackX + 43 + 3.0;
    const grandstand = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.0, 28), concWallMat);
    grandstand.position.set(grandstandX, 1.0, trackZ);
    group.add(grandstand);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.38, 30),
      new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3, metalness: 0.1 }));
    canopy.position.set(grandstandX - 1.2, 5.6, trackZ);
    group.add(canopy);

    // 司令台三支不鏽鋼旗桿
    [-5, 0, 5].forEach(fz => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 }));
      pole.position.set(grandstandX + 1.2, 4.75, trackZ + fz);
      group.add(pole);
    });

    // 400m 操場四角體育場高桿探照燈 (Stadium Floodlights)
    [[-45, -70], [-45, 70], [45, -70], [45, 70]].forEach(([lx, lz]) => {
      const floodPole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 16, 8), steelMat);
      floodPole.position.set(trackX + lx, 8.0, trackZ + lz);
      group.add(floodPole);

      const lampBank = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9c4, emissiveIntensity: 1.8 }));
      lampBank.position.set(trackX + lx, 16.5, trackZ + lz);
      group.add(lampBank);
    });

    // 操場外圍綠化遮蔭樹 (環繞跑道東南與北側)
    for (let z = -80; z <= 80; z += 18) {
      const tEast = createTree('broadleaf', 8.5, 6.0, 0x2e7d32);
      tEast.position.set(trackX + 52, 0.32, trackZ + z);
      group.add(tEast);
    }

    // =========================================================================
    // 9. 北校區 (工學路側)：體育館 (橘色大拱頂)、圖書館、女生宿舍、誠樸樓、工學路後門
    // =========================================================================
    // (1) 體育館 (樂群堂, 平面圖右上角鮮亮橘色大方塊，坐標 x: 123, z: -138)
    // 依 Overture 足跡：寬 63m x 深 52m x 高 16m
    const gymX = 123, gymZ = -138;
    const gymW = 63, gymH = 16, gymD = 52;
    const gym = new THREE.Mesh(new THREE.BoxGeometry(gymW, gymH, gymD), concWallMat);
    gym.position.set(gymX, gymH / 2, gymZ);
    group.add(gym);

    // 標誌性亮橘色半圓拱弧形大屋頂 (Signature Orange Barrel Roof)
    // 使用精確向上起拱二維截面放樣，頂底完全在 Y >= 16m 之上，絕不穿入地下或導致整體包圍盒浮空
    const roofH = 6.5;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-gymD / 2, 0);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = -gymD / 2 + t * gymD;
      const y = (1 - Math.pow(x / (gymD / 2), 2)) * roofH;
      roofShape.lineTo(x, y);
    }
    roofShape.lineTo(gymD / 2, 0);
    roofShape.closePath();

    const roofGeom = new THREE.ExtrudeGeometry(roofShape, { depth: gymW, bevelEnabled: false });
    roofGeom.center();
    roofGeom.translate(0, roofH / 2, 0);
    const gymRoof = new THREE.Mesh(roofGeom, gymOrangeRoofMat);
    gymRoof.rotation.y = Math.PI / 2;
    gymRoof.position.set(gymX, gymH, gymZ);
    group.add(gymRoof);

    // (2) 學生餐廳 (x: 123, z: -96，寬 43m x 深 26m)
    const cafe = new THREE.Mesh(new THREE.BoxGeometry(43, 9, 26), beigeWallMat);
    cafe.position.set(123, 4.5, -96);
    group.add(cafe);

    // (3) 圖書館 & 百齡樓 (x: -40, z: -94 與 x: -13, z: -111)
    const lib = new THREE.Mesh(new THREE.BoxGeometry(36, 15, 23), concWallMat);
    lib.position.set(-40, 7.5, -94);
    group.add(lib);

    const libGlass = new THREE.Mesh(new THREE.BoxGeometry(36.4, 8, 14), glassMat);
    libGlass.position.set(-40, 7.5, -94);
    group.add(libGlass);

    // (4) 誠樸樓 & 集賢堂 & 懷思樓 (西北校區)
    // 誠樸樓 (x: -92, z: -141，寬 118m x 深 16m)
    const cheng = new THREE.Mesh(new THREE.BoxGeometry(118, 15, 16), yellowWallMat);
    cheng.position.set(-92, 7.5, -141);
    group.add(cheng);

    // 懷思樓 (x: -12, z: -167)
    const huai = new THREE.Mesh(new THREE.BoxGeometry(52, 14, 10), beigeWallMat);
    huai.position.set(-12, 7.0, -167);
    group.add(huai);

    // (5) 工學路後門 (North Gate, z: -195)
    [-9, 9].forEach(gx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.5, 1.8), concWallMat);
      p.position.set(-12 + gx, 2.75, -195);
      group.add(p);
    });
    const northGateBeam = new THREE.Mesh(new THREE.BoxGeometry(20, 1.2, 2.0), concWallMat);
    northGateBeam.position.set(-12, 5.5, -195);
    group.add(northGateBeam);

    // =========================================================================
    // 10. 穿校親水小河 (旱溪支流/綠川排水) 與白色景觀拱橋
    // =========================================================================
    // 蜿蜒穿過東南實習廠區旁的小河 (自 x: 30, z: 90 流向 x: 135, z: 180)
    const river = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 130), waterMat);
    river.position.set(78, 0.2, 135);
    river.rotation.y = -0.65;
    group.add(river);

    // 2 座白色人行拱橋
    [105, 155].forEach(rz => {
      const rx = 78 + (rz - 135) * Math.tan(0.65);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 5.5), concWallMat);
      bridge.position.set(rx, 0.7, rz);
      bridge.rotation.y = -0.65;
      group.add(bridge);

      [-2.5, 2.5].forEach(dy => {
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.15),
          new THREE.MeshLambertMaterial({ color: 0xffffff }));
        handrail.position.set(rx, 1.3, rz + dy);
        handrail.rotation.y = -0.65;
        group.add(handrail);
      });
    });

    // =========================================================================
    // 11. 校外周邊設施 (高工路四線道、公車候車亭、安全圍牆與行道樹)
    // =========================================================================
    // 南側高工路路面 (寬 22m，延伸覆蓋南校門外)
    const gaogongRoad = new THREE.Mesh(new THREE.BoxGeometry(334, 0.1, 24), asphaltMat);
    gaogongRoad.position.set(0, 0.18, 204);
    group.add(gaogongRoad);

    // 高工路雙黃實線中央分隔線與車道虛線
    const doubleYellow = new THREE.Mesh(new THREE.BoxGeometry(334, 0.02, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
    doubleYellow.position.set(0, 0.24, 204);
    group.add(doubleYellow);

    // 正門前行人穿越道 (Zebra Crosswalk)
    for (let bx = -10; bx <= 10; bx += 2.5) {
      const zebra = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 16), puWhiteLineMat);
      zebra.position.set(gateX + bx, 0.25, 204);
      group.add(zebra);
    }

    // 「台中高工」公車站候車亭 (高工路人行道側)
    const tcivsBusStop = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 2.8),
      new THREE.MeshStandardMaterial({ color: 0xffffff }));
    tcivsBusStop.position.set(gateX + 28, 1.6, 194);
    group.add(tcivsBusStop);

    const busSign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x01579b, emissive: 0x01579b, emissiveIntensity: 1.2 }));
    busSign.position.set(gateX + 28, 3.4, 195.4);
    group.add(busSign);

    // 高工路人行道行道樹
    for (let x = -150; x <= 150; x += 25) {
      if (Math.abs(x - gateX) < 18) continue; // 避開校門口出入車道
      const streetTree = createTree('broadleaf', 8.0, 5.5, 0x2e7d32);
      streetTree.position.set(x, 0.24, 194);
      group.add(streetTree);
    }

    // 校園四周黑色鍛鐵安全圍牆與路緣
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, metalness: 0.8 });
    const fenceS = new THREE.Mesh(new THREE.BoxGeometry(330, 2.2, 0.2), wallMat);
    fenceS.position.set(0, 1.1, 186); group.add(fenceS);
    const fenceN = new THREE.Mesh(new THREE.BoxGeometry(330, 2.2, 0.2), wallMat);
    fenceN.position.set(0, 1.1, -198); group.add(fenceN);
    const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 384), wallMat);
    fenceW.position.set(-165, 1.1, -6); group.add(fenceW);
    const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 384), wallMat);
    fenceE.position.set(165, 1.1, -6); group.add(fenceE);

    return group;
  }
}
