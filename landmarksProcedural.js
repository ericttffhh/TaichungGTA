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
  static buildTaichungIndustrialHighSchool() {
    const group = new THREE.Group();
    group.name = 'tcivs_campus_procedural';

    // 材質庫
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
    const concMat = new THREE.MeshLambertMaterial({ map: concreteTexture('#c5c8c5') });
    const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const brickRedMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
    const yellowWallMat = new THREE.MeshLambertMaterial({ color: 0xf6e58d });
    const beigeWallMat = new THREE.MeshLambertMaterial({ color: 0xf7f1e3 });
    const orangeRoofMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    const darkRoofMat = new THREE.MeshLambertMaterial({ color: 0x57606f });
    const glassMat = glass(0x81ecec);
    const gearGreenMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.35, metalness: 0.4 });
    const crestRedMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.35, metalness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.25, metalness: 0.85 });
    const trackRedMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const courtBlueMat = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      emissive: 0x00838f,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.8
    });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.4, metalness: 0.7 });

    // A. 校園基地地坪 (Campus Ground Slab, 260m x 340m, 坐標原點設在校區中心)
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(264, 0.3, 344), grassMat);
    basePlate.position.set(0, 0.15, 0);
    group.add(basePlate);

    // 校內主要柏油幹道與中央景觀花崗岩廣場
    const roadH = new THREE.Mesh(new THREE.BoxGeometry(260, 0.04, 12), asphaltMat);
    roadH.position.set(0, 0.32, -40);
    group.add(roadH);

    const roadV = new THREE.Mesh(new THREE.BoxGeometry(10, 0.04, 300), asphaltMat);
    roadV.position.set(5, 0.32, 0);
    group.add(roadV);

    const centralPlaza = new THREE.Mesh(new THREE.BoxGeometry(110, 0.06, 120), concMat);
    centralPlaza.position.set(-20, 0.33, -100);
    group.add(centralPlaza);

    // =========================================================================
    // 1. 南側高工路正門牌樓、傳達室、景觀水池與迎賓林蔭花圃
    // =========================================================================
    const gateZ = -162;

    // 氣派白色花崗岩雙柱門樓
    [-12, 12].forEach(gx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.5, 2.4), concMat);
      p.position.set(gx, 3.75, gateZ);
      group.add(p);
    });

    const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(26.4, 1.6, 2.6), concMat);
    gateBeam.position.set(0, 7.5, gateZ);
    group.add(gateBeam);

    // 金色楷書校名牌匾「臺中市立臺中工業高級中等學校」
    const namePlate = new THREE.Mesh(new THREE.BoxGeometry(18, 0.75, 0.15), goldMat);
    namePlate.position.set(0, 7.5, gateZ - 1.35);
    group.add(namePlate);

    // 不鏽鋼電動伸縮校門
    const slidingGate = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 0.2), steelMat);
    slidingGate.position.set(0, 1.1, gateZ);
    group.add(slidingGate);

    // 紅色警衛室 / 傳達室 (平面圖左下角標記之紅色傳達室)
    const guardHouse = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.6, 5.0), brickRedMat);
    guardHouse.position.set(-17.5, 1.8, gateZ + 3.0);
    group.add(guardHouse);

    const guardRoof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 5.8), darkRoofMat);
    guardRoof.position.set(-17.5, 3.8, gateZ + 3.0);
    group.add(guardRoof);

    const guardWin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 0.1), glassMat);
    guardWin.position.set(-17.5, 2.0, gateZ + 0.45);
    group.add(guardWin);

    // 校訓精神立碑「誠 樸 精 勤」
    const motto = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 }));
    motto.position.set(17.5, 1.6, gateZ + 3.0);
    group.add(motto);

    // 中央迎賓長形景觀水池 (Scenic Reflection Pool, 18m x 42m)
    const poolX = -20, poolZ = -105;
    const poolCurb = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.8, 42.4), concMat);
    poolCurb.position.set(poolX, 0.4, poolZ);
    group.add(poolCurb);

    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.6, 40.8), waterMat);
    poolWater.position.set(poolX, 0.45, poolZ);
    group.add(poolWater);

    // 3 組發光噴泉水柱
    [-12, 0, 12].forEach(fz => {
      const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 2.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xe0f7fa, emissive: 0x80deea, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
      jet.position.set(poolX, 1.6, poolZ + fz);
      group.add(jet);
    });

    // 水池兩側對稱常綠樹球與花圃
    [-1, 1].forEach(side => {
      for (let z = -140; z <= -70; z += 12) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8),
          new THREE.MeshLambertMaterial({ color: 0x1b5e20 }));
        shrub.position.set(poolX + side * 14.5, 1.5, z);
        group.add(shrub);
      }
    });

    // =========================================================================
    // 2. 經典象徵：12 齒綠色齒輪校徽 (TCIVS Gear Crest)
    // =========================================================================
    const createGearCrest = (size = 4.2) => {
      const crest = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.5, size * 0.5, 0.35, 24), gearGreenMat);
      ring.rotation.x = Math.PI / 2;
      crest.add(ring);

      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(size * 0.16, size * 0.22, 0.36), gearGreenMat);
        tooth.position.set(Math.sin(ang) * (size * 0.55), Math.cos(ang) * (size * 0.55), 0);
        tooth.rotation.z = -ang;
        crest.add(tooth);
      }

      const innerWhite = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.36, size * 0.36, 0.37, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      innerWhite.rotation.x = Math.PI / 2;
      crest.add(innerWhite);

      const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.42, size * 0.08, 0.4), crestRedMat);
      hBar1.position.set(0, size * 0.15, 0); crest.add(hBar1);
      const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.42, size * 0.08, 0.4), crestRedMat);
      hBar2.position.set(0, -size * 0.15, 0); crest.add(hBar2);
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(size * 0.09, size * 0.45, 0.4), crestRedMat);
      vBar.position.set(0, 0, 0); crest.add(vBar);
      const centerBox = new THREE.Mesh(new THREE.BoxGeometry(size * 0.24, size * 0.2, 0.42),
        new THREE.MeshLambertMaterial({ color: 0xffffff }));
      crest.add(centerBox);
      const midBar = new THREE.Mesh(new THREE.BoxGeometry(size * 0.24, size * 0.06, 0.44), crestRedMat);
      crest.add(midBar);

      return crest;
    };

    // =========================================================================
    // 3. 核心教學與實習大樓群
    // =========================================================================

    // (1) 中工大樓 (Administration & Main Hall, 正對景觀水池, Z = -58)
    const admW = 74, admH = 19, admD = 22;
    const adm = new THREE.Mesh(new THREE.BoxGeometry(admW, admH, admD), yellowWallMat);
    adm.position.set(poolX, admH / 2, -58);
    group.add(adm);

    for (let floor = 1; floor <= 4; floor++) {
      const fy = floor * 4.2 - 1.2;
      const ribbonWin = new THREE.Mesh(new THREE.BoxGeometry(admW - 6, 1.8, admD + 0.2), glassMat);
      ribbonWin.position.set(poolX, fy, -58);
      group.add(ribbonWin);
    }

    for (let c = -2; c <= 2; c++) {
      if (c === 0) continue;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 9, 12), concMat);
      col.position.set(poolX + c * 5.2, 4.5, -58 - admD / 2 - 2.8);
      group.add(col);
    }
    const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 6.5), concMat);
    porticoRoof.position.set(poolX, 9.6, -58 - admD / 2 - 2.5);
    group.add(porticoRoof);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 14), beigeWallMat);
    tower.position.set(poolX, admH + 3.25, -58);
    group.add(tower);

    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(poolX, admH + 3.25, -58 - 7.1);
    group.add(clockFace);

    const bigCrest = createGearCrest(5.2);
    bigCrest.position.set(poolX, admH + 7.8, -58 - 4.5);
    group.add(bigCrest);

    const admSign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.2), goldMat);
    admSign.position.set(poolX, admH + 0.8, -58 - admD / 2 - 0.2);
    group.add(admSign);

    // (2) 第二實習大樓 (電機、資訊、控制科, Z = -18)
    const lab2 = new THREE.Mesh(new THREE.BoxGeometry(78, 17, 22), beigeWallMat);
    lab2.position.set(poolX, 8.5, -18);
    group.add(lab2);

    const blueTrim2 = new THREE.Mesh(new THREE.BoxGeometry(78.4, 1.2, 22.4),
      new THREE.MeshLambertMaterial({ color: 0x0288d1 }));
    blueTrim2.position.set(poolX, 12, -18);
    group.add(blueTrim2);

    [-18, 18].forEach(tx => {
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 5.0), steelMat);
      acUnit.position.set(poolX + tx, 18.1, -18);
      group.add(acUnit);
    });

    // (3) 第一實習大樓 (建築、土木、電子、製圖科, Z = +22)
    const lab1 = new THREE.Mesh(new THREE.BoxGeometry(78, 17, 22), concMat);
    lab1.position.set(poolX, 8.5, 22);
    group.add(lab1);

    for (let sx = -30; sx <= 30; sx += 12) {
      const skylight = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2.4, 4), glassMat);
      skylight.rotation.y = Math.PI / 4;
      skylight.position.set(poolX + sx, 18.2, 22);
      group.add(skylight);
    }

    // (4) 宏毅樓 (主要教學大樓, Z = +62)
    const honW = 82, honH = 16, honD = 18;
    const hon = new THREE.Mesh(new THREE.BoxGeometry(honW, honH, honD), yellowWallMat);
    hon.position.set(poolX, honH / 2, 62);
    group.add(hon);

    for (let fl = 1; fl <= 3; fl++) {
      const corridor = new THREE.Mesh(new THREE.BoxGeometry(honW, 0.4, 2.6), concMat);
      corridor.position.set(poolX, fl * 4.5, 62 - honD / 2 - 1.3);
      group.add(corridor);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(honW, 1.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0xd32f2f }));
      rail.position.set(poolX, fl * 4.5 + 0.6, 62 - honD / 2 - 2.5);
      group.add(rail);
    }

    // (5) 化工圖傳大樓 (西側沿工學六街, X = -108, Z = 0)
    const chem = new THREE.Mesh(new THREE.BoxGeometry(18, 15, 64), beigeWallMat);
    chem.position.set(-108, 7.5, 0);
    group.add(chem);

    const chemStripe = new THREE.Mesh(new THREE.BoxGeometry(18.4, 1.4, 64.4),
      new THREE.MeshLambertMaterial({ color: 0x8e44ad }));
    chemStripe.position.set(-108, 10.5, 0);
    group.add(chemStripe);

    // =========================================================================
    // 4. 東南實習廠區 (汽車板金大樓 & 機械冷凍大樓)
    // =========================================================================
    const factoryMat = new THREE.MeshLambertMaterial({ color: 0x78909c });

    const autoBldg = new THREE.Mesh(new THREE.BoxGeometry(56, 10.5, 26), factoryMat);
    autoBldg.position.set(68, 5.25, -125);
    group.add(autoBldg);

    [-16, 0, 16].forEach(gx => {
      const rollDoor = new THREE.Mesh(new THREE.BoxGeometry(6.5, 5.5, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7 }));
      rollDoor.position.set(68 + gx, 2.75, -125 + 13.1);
      group.add(rollDoor);
    });

    const mechBldg = new THREE.Mesh(new THREE.BoxGeometry(56, 11, 24), factoryMat);
    mechBldg.position.set(68, 5.5, -78);
    group.add(mechBldg);

    [-12, 12].forEach(tx => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 3.2, 16),
        new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.6 }));
      tower.position.set(68 + tx, 12.6, -78);
      group.add(tower);
    });

    // =========================================================================
    // 5. 400m 國際標準田徑運動場 (Track & Field Stadium) & 球場群
    // =========================================================================
    const trackX = 64, trackZ = 45;

    const trackBase = new THREE.Mesh(new THREE.BoxGeometry(86, 0.08, 138), trackRedMat);
    trackBase.position.set(trackX, 0.34, trackZ);
    group.add(trackBase);

    const pitch = new THREE.Mesh(new THREE.BoxGeometry(56, 0.1, 106),
      new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
    pitch.position.set(trackX, 0.35, trackZ);
    group.add(pitch);

    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(8.5, 8.8, 24), lineWhiteMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(trackX, 0.41, trackZ);
    group.add(centerCircle);

    const podiumX = trackX + 43 + 3.0;
    const grandstand = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 26), concMat);
    grandstand.position.set(podiumX, 0.9, trackZ);
    group.add(grandstand);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.35, 28),
      new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.3, metalness: 0.1 }));
    canopy.position.set(podiumX - 1.0, 5.2, trackZ);
    group.add(canopy);

    [-4, 0, 4].forEach(fz => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 9, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 }));
      pole.position.set(podiumX + 1.2, 4.5, trackZ + fz);
      group.add(pole);
    });

    [-14, 14].forEach(cz => {
      const court = new THREE.Mesh(new THREE.BoxGeometry(26, 0.06, 16), courtBlueMat);
      court.position.set(trackX, 0.33, -20 + cz);
      group.add(court);

      [-13, 13].forEach(bx => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8), steelMat);
        pole.position.set(trackX + bx, 1.9, -20 + cz);
        group.add(pole);

        const board = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }));
        board.position.set(trackX + bx - (bx > 0 ? 0.3 : -0.3), 3.4, -20 + cz);
        group.add(board);
      });
    });

    // =========================================================================
    // 6. 北校區：體育館 (樂群堂)、圖書館、學生餐廳、誠樸樓、懷思樓、工學路後門
    // =========================================================================
    const gymW = 46, gymH = 15, gymD = 48;
    const gym = new THREE.Mesh(new THREE.BoxGeometry(gymW, gymH, gymD), concMat);
    gym.position.set(74, gymH / 2, 135);
    group.add(gym);

    const gymRoof = new THREE.Mesh(
      new THREE.CylinderGeometry(gymW / 2 + 0.5, gymW / 2 + 0.5, gymD + 2, 24, 1, false, 0, Math.PI),
      orangeRoofMat
    );
    gymRoof.rotation.z = Math.PI / 2;
    gymRoof.position.set(74, gymH, 135);
    group.add(gymRoof);

    const lib = new THREE.Mesh(new THREE.BoxGeometry(28, 14, 26), beigeWallMat);
    lib.position.set(20, 7, 125);
    group.add(lib);

    const libGlass = new THREE.Mesh(new THREE.BoxGeometry(28.4, 8, 18), glassMat);
    libGlass.position.set(20, 6, 125);
    group.add(libGlass);

    const northHall = new THREE.Mesh(new THREE.BoxGeometry(64, 15, 20), yellowWallMat);
    northHall.position.set(-45, 7.5, 135);
    group.add(northHall);

    [-8, 8].forEach(gx => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5.5, 1.8), concMat);
      p.position.set(gx, 2.75, 164);
      group.add(p);
    });
    const northGateBeam = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 2.0), concMat);
    northGateBeam.position.set(0, 5.5, 164);
    group.add(northGateBeam);

    // =========================================================================
    // 7. 穿校親水小河 (旱溪支流/綠川排水) 與白色拱橋
    // =========================================================================
    const river = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 130), waterMat);
    river.position.set(48, 0.2, -80);
    river.rotation.y = 0.28;
    group.add(river);

    [-110, -55].forEach(bz => {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.6, 5.5), concMat);
      bridge.position.set(48 + (bz + 80) * 0.28, 0.7, bz);
      bridge.rotation.y = 0.28;
      group.add(bridge);

      [-2.5, 2.5].forEach(dy => {
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(18, 0.9, 0.15),
          new THREE.MeshLambertMaterial({ color: 0xffffff }));
        handrail.position.set(48 + (bz + 80) * 0.28, 1.3, bz + dy);
        handrail.rotation.y = 0.28;
        group.add(handrail);
      });
    });

    // =========================================================================
    // 8. 校園四周黑色鍛鐵安全圍牆與路緣
    // =========================================================================
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, metalness: 0.8 });
    const fenceS = new THREE.Mesh(new THREE.BoxGeometry(260, 2.2, 0.2), wallMat);
    fenceS.position.set(0, 1.1, -164); group.add(fenceS);
    const fenceN = new THREE.Mesh(new THREE.BoxGeometry(260, 2.2, 0.2), wallMat);
    fenceN.position.set(0, 1.1, 164); group.add(fenceN);
    const fenceW = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 328), wallMat);
    fenceW.position.set(-130, 1.1, 0); group.add(fenceW);
    const fenceE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 328), wallMat);
    fenceE.position.set(130, 1.1, 0); group.add(fenceE);

    return group;
  }
}
