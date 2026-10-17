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
  // 大慶高架車站 (臺鐵/捷運綠線 G13 跨線共構轉乘樞紐)
  // 嚴格對齊高架鐵路廊道高度 Y=14.5m，無縫包覆雙向軌道與月台
  // =========================================================================
  static buildDaqingStation() {
    const group = new THREE.Group();
    const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#b5b6b2') });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.7 });
    const whiteRoofMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide });
    const yellowTileMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
    const glassMat = glass(0x9bc9d6);
    const traBlueMat = new THREE.MeshLambertMaterial({ color: 0x01579b });
    const mrtGreenMat = new THREE.MeshLambertMaterial({ color: 0x1e9e59 });

    const deckY = 14.5; // 嚴格對齊臺鐵高架鐵路廊道高度
    const L = 180;      // 站台長度

    // 1. 兩座高架島式月台 (1A/1B, 2A/2B 雙島四線月台層，高度 Y=15.35，高出軌道 0.85m)
    [-5.6, 5.6].forEach((pz) => {
      // 月台主體
      const plat = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 4.2), conc);
      plat.position.set(0, deckY + 0.45, pz);
      group.add(plat);

      // 黃色盲人警示鋪面 (兩側邊緣)
      [-1.9, 1.9].forEach(dz => {
        const tactile = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, 0.35), yellowTileMat);
        tactile.position.set(0, deckY + 0.92, pz + dz);
        group.add(tactile);
      });

      // 乘客等待座椅與候車亭立柱
      for (let x = -L / 2 + 15; x <= L / 2 - 15; x += 22) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8 }));
        bench.position.set(x, deckY + 1.15, pz);
        group.add(bench);

        // 月台發車動態資訊螢幕 (PIDS)
        const pids = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x212121 }));
        pids.position.set(x, deckY + 3.2, pz);
        group.add(pids);

        const led = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xff9100, emissive: 0xff9100, emissiveIntensity: 2.5 }));
        led.position.set(x, deckY + 3.2, pz);
        group.add(led);
      }
    });

    // 2. 招牌波浪形白色挑高月台雨棚 (Wave Canopy overhead)
    const canopyW = 22;
    const seg = 3.0;
    for (let x = -L / 2 + 10; x <= L / 2 - 10; x += seg) {
      const h = 4.6 + Math.sin((x / 35) * Math.PI) * 1.8;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(seg + 0.1, 0.32, canopyW), whiteRoofMat);
      slab.position.set(x + seg / 2, deckY + h + 1.2, 0);
      group.add(slab);
    }

    // 鋼構人字型支撐柱
    for (let x = -L / 2 + 15; x <= L / 2 - 15; x += 18) {
      [-5.6, 5.6].forEach(pz => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.8, 8), steelMat);
        post.position.set(x, deckY + 3.4, pz);
        group.add(post);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 3.8), steelMat);
        arm.position.set(x, deckY + 5.8, pz);
        arm.rotation.x = pz > 0 ? 0.35 : -0.35;
        group.add(arm);
      });
    }

    // 3. 跨線天橋與捷運綠線 G13 轉乘連通道 (Transfer Concourse, Y=16.5m)
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(26, 4.2, 38), conc);
    bridge.position.set(0, deckY + 2.1, 8);
    group.add(bridge);

    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(25.6, 2.6, 37.6), glassMat);
    bridgeGlass.position.set(0, deckY + 2.5, 8);
    group.add(bridgeGlass);

    // 4. 地面車站站房與玻璃挑高大廳 (Ground Station Hall, 建國北路一段側)
    const hall = new THREE.Mesh(new THREE.BoxGeometry(48, deckY, 22), conc);
    hall.position.set(0, deckY / 2, 22);
    group.add(hall);

    const hallGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(46, deckY - 1.5, 21.6), glassMat);
    hallGlassMesh.position.set(0, deckY / 2, 22.2);
    group.add(hallGlassMesh);

    // 臺鐵與捷運標誌帶
    const traBand = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 0.4), traBlueMat);
    traBand.position.set(-11, deckY - 1.0, 33.3);
    group.add(traBand);

    const mrtBand = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 0.4), mrtGreenMat);
    mrtBand.position.set(11, deckY - 1.0, 33.3);
    group.add(mrtBand);

    // 大慶車站站名牌燈箱
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }));
    signBox.position.set(0, deckY + 1.2, 27.2);
    group.add(signBox);

    // 5. 支撐高架站房之八角混凝土排柱與承重帽梁
    for (let x = -L / 2 + 10; x <= L / 2 - 10; x += 25) {
      const pierCol = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, deckY - 1.2, 8), conc);
      pierCol.position.set(x, (deckY - 1.2) / 2, 0);
      group.add(pierCol);

      const crossHead = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 18), conc);
      crossHead.position.set(x, deckY - 1.4, 0);
      group.add(crossHead);
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
  // 四至邊界：北臨工學路、南臨高工路、西臨工學六街、東臨工學二街
  // 100% 依據官方校區平面圖與真實 Overture 建築足跡進行超精細 3D 程序化建模：
  // 1. 南門迎賓軸：高工路正門牌樓、金色校名、傳達室、景觀水池(噴泉)、椰林花圃大道、12齒綠色齒輪校徽
  // 2. 中軸教學核心：中工大樓(挑高羅馬前廊/鐘樓/時鐘/校徽山牆)、第二實習大樓、第一實習大樓、宏毅樓
  // 3. 西側專業系館：化工圖傳大樓(沿工學六街)、員生社、中餐烘焙教室
  // 4. 東南實習廠區：機械大樓、機械工場、汽車板金大樓(挑高捲門/維修斜坡)、機械冷凍大樓(散熱塔/吊車樑)
  // 5. 體育運動專區：400m 國際標準 8 跑道紅色 PU 運動場、天然草皮足球場、司令台(雙層看台/遮陽膜頂/旗桿)、球場群
  // 6. 北校區：體育館(樂群堂，鮮亮橘色大拱頂)、學生餐廳、圖書館、女生宿舍、百齡樓、誠樸樓、集賢堂、懷思樓、工學路後門
  // 7. 親水生態水系：穿校生態小河(旱溪支流/綠川排水)蜿蜒流經東南校區，搭配雙座漢白玉人行景觀拱橋
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
    const courtBlueMat = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
    const courtGreenMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
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

    // 迎賓中央景觀水池 (Scenic Reflection Pool, 18m x 44m，位於校門與中工大樓之間)
    const poolX = -52, poolZ = 125;
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

    // 水池兩側對稱常綠樹球與花圃步道
    [-1, 1].forEach(side => {
      for (let z = 100; z <= 155; z += 12) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8),
          new THREE.MeshLambertMaterial({ color: 0x1b5e20 }));
        shrub.position.set(poolX + side * 14.5, 1.45, z);
        group.add(shrub);
      }
    });

    // =========================================================================
    // 2. 臺中高工 12 齒綠色齒輪校徽產生器 (TCIVS Gear Crest)
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
    // 3. 中軸教學核心大樓群 (中工大樓、第二實習大樓、第一實習大樓、宏毅樓)
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

    // 屋頂建築製圖採光天窗排 (Shed Skylights)
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
    // 4. 西側專業系館與生活設施 (化工圖傳大樓、員生社、中餐烘焙教室)
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
    // 5. 東南實習廠區 (機械大樓、汽車板金大樓、機械冷凍大樓、機械工場)
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
    // 6. 400m 國際標準田徑運動場 (Stadium) 與體育球場群 (東側工學二街側)
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

    // 多功能室外球場群 (排球場與壓克力籃球場，x: 60, z: 45)
    [-14, 14].forEach(cz => {
      const court = new THREE.Mesh(new THREE.BoxGeometry(28, 0.06, 16), courtBlueMat);
      court.position.set(trackX, 0.33, 45 + cz);
      group.add(court);

      // 籃球架與透明籃板
      [-14, 14].forEach(bx => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8), steelMat);
        pole.position.set(trackX + bx, 1.9, 45 + cz);
        group.add(pole);

        const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
        board.position.set(trackX + bx - (bx > 0 ? 0.3 : -0.3), 3.4, 45 + cz);
        group.add(board);
      });
    });

    // =========================================================================
    // 7. 北校區 (工學路側)：體育館 (橘色大拱頂)、圖書館、女生宿舍、誠樸樓、工學路後門
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
    // 8. 穿校親水小河 (旱溪支流/綠川排水) 與白色景觀拱橋
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
    // 9. 校園四周黑色鍛鐵安全圍牆與路緣
    // =========================================================================
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, metalness: 0.8 });
    const fenceS = new THREE.Mesh(new THREE.BoxGeometry(330, 2.2, 0.2), wallMat);
    fenceS.position.set(0, 1.1, 198); group.add(fenceS);
    const fenceN = new THREE.Mesh(new THREE.BoxGeometry(330, 2.2, 0.2), wallMat);
    fenceN.position.set(0, 1.1, -198); group.add(fenceN);
    const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 396), wallMat);
    fenceW.position.set(-165, 1.1, 0); group.add(fenceW);
    const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 396), wallMat);
    fenceE.position.set(165, 1.1, 0); group.add(fenceE);

    return group;
  }
}
