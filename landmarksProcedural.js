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

    // 後方鋼構拱形月台雨棚 (玻璃 + 鋼骨)
    const vault = new THREE.Mesh(
      new THREE.CylinderGeometry(15, 15, hallW, 20, 1, true, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide })
    );
    vault.rotation.z = Math.PI / 2;
    vault.rotation.y = 0;
    vault.scale.set(0.55, 1, 1);
    vault.position.set(0, 0, 8);
    // 以 rotation 調整後讓半圓朝上
    vault.rotation.set(0, 0, Math.PI / 2);
    vault.rotation.order = 'ZYX';
    const vaultGroup = new THREE.Group();
    vaultGroup.add(vault);
    vaultGroup.rotation.y = Math.PI / 2;
    vaultGroup.position.set(0, 0.2, 14);
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
      rib.position.set(x, 0.2, 14);
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
  // 大慶車站：高架月台 + 橋墩 + 波浪形白色雨棚 + 地面站房
  // =========================================================================
  static buildDaqingStation() {
    const group = new THREE.Group();
    const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#b5b6b2') });
    const deckY = 9.5;
    const L = 200;

    // 高架橋面 (雙軌 + 月台)
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L, 2.2, 24), conc);
    deck.position.set(0, deckY - 1.1, 0); group.add(deck);
    const deckTop = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 22), new THREE.MeshLambertMaterial({ color: 0x8c8e8f }));
    deckTop.position.set(0, deckY + 0.15, 0); group.add(deckTop);
    // 軌道 (兩條)
    const railMat = new THREE.MeshLambertMaterial({ color: 0x585b5e });
    for (const z of [-3.2, 3.2]) {
      for (const dz of [-0.72, 0.72]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.18, 0.12), railMat);
        rail.position.set(0, deckY + 0.42, z + dz); group.add(rail);
      }
    }
    // 月台 (兩側)
    const platMat = new THREE.MeshLambertMaterial({ color: 0xc9c7c0 });
    for (const z of [-8.2, 8.2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(120, 0.5, 4.4), platMat);
      p.position.set(0, deckY + 0.55, z); group.add(p);
      const yl = new THREE.Mesh(new THREE.BoxGeometry(120, 0.02, 0.3), new THREE.MeshBasicMaterial({ color: 0xf1c40f }));
      yl.position.set(0, deckY + 0.82, z + (z < 0 ? 1.6 : -1.6)); group.add(yl);
    }
    // 橋墩 (每 20m 一座 T 型墩)
    for (let x = -L / 2 + 10; x <= L / 2 - 10; x += 20) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(2.6, deckY - 2.2, 3.4), conc);
      col.position.set(x, (deckY - 2.2) / 2, 0); group.add(col);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 20), conc);
      cap.position.set(x, deckY - 3, 0); group.add(cap);
    }
    // 波浪形白色月台雨棚 (以多段傾斜板近似)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f6, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide });
    const seg = 2.5;
    for (let x = -60; x < 60; x += seg) {
      const h = 5.2 + Math.sin((x / 60) * Math.PI * 2.4) * 1.6;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(seg + 0.1, 0.35, 21), roofMat);
      slab.position.set(x + seg / 2, deckY + h + 2, 0);
      slab.rotation.x = 0.0;
      group.add(slab);
    }
    const postMat = new THREE.MeshLambertMaterial({ color: 0xdfe3e4 });
    for (let x = -57.5; x <= 57.5; x += 12.5) {
      for (const z of [-9.5, 9.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 7.6, 8), postMat);
        post.position.set(x, deckY + 3.8, z); group.add(post);
      }
    }
    // 地面站房 (玻璃 + 綠色捷運線標示)，位於橋下南側
    const hallGlass = new THREE.Mesh(new THREE.BoxGeometry(38, 10, 20), glass(0x9bc9d6));
    hallGlass.position.set(-30, 5, 24); group.add(hallGlass);
    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(42, 1.2, 24), conc);
    hallRoof.position.set(-30, 10.6, 24); group.add(hallRoof);
    const greenBand = new THREE.Mesh(new THREE.BoxGeometry(42.2, 1.6, 24.2), new THREE.MeshLambertMaterial({ color: 0x1e9e59 }));
    greenBand.position.set(-30, 9.4, 24); group.add(greenBand);
    return group;
  }
}
