/**
 * landmarkBuilderRealistic.js
 * 依真實尺寸重新建模的臺中地標 (國家歌劇院 / 路思義教堂 / 宮原眼科)
 * - 所有模型僅包含建築主體 + 緊貼建築的薄基座，不再有超出基地、壓到道路的大型地板/圓盤
 * - 使用「挖洞牆面 (ExtrudeGeometry + holes)」做出真實的拱圈、美聲涵洞與窗戶
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 貼圖 (UV 以公尺為單位，故 repeat 設為 1 / 每張貼圖涵蓋公尺數)
// ---------------------------------------------------------------------------
function brickTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#5a2a22';
  g.fillRect(0, 0, 512, 512);
  const bH = 20, bW = 46;
  for (let row = 0; row < 512 / bH; row++) {
    const off = row % 2 === 0 ? 0 : bW / 2;
    for (let x = -bW; x < 512 + bW; x += bW) {
      const shade = (row * 7 + Math.floor(x / bW) * 13) % 4;
      g.fillStyle = ['#9c3b2e', '#a8442f', '#8a3226', '#b34e38'][shade];
      g.fillRect(x + off + 2, row * bH + 2, bW - 4, bH - 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.42, 0.42);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function concreteTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#eceeef';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${150 + Math.random() * 60},${150 + Math.random() * 60},${150 + Math.random() * 60},0.12)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  g.strokeStyle = 'rgba(120,120,120,0.35)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 256); // 清水模板接縫
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.25, 0.25);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function diamondTileTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a10';
  g.fillRect(0, 0, 512, 512);
  const s = 32;
  for (let y = 0; y < 512; y += s) {
    for (let x = 0; x < 512; x += s) {
      g.save();
      g.translate(x + s / 2, y + s / 2);
      g.beginPath();
      g.moveTo(0, -s / 2 + 1); g.lineTo(s / 2 - 1, 0); g.lineTo(0, s / 2 - 1); g.lineTo(-s / 2 + 1, 0);
      g.closePath();
      const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      gr.addColorStop(0, '#f4c542'); gr.addColorStop(1, '#c98a1b');
      g.fillStyle = gr;
      g.fill();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text, bg = '#2b140a', fg = '#e9c46a') {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 1024, 192);
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(10, 10, 1004, 172);
  g.fillStyle = fg;
  g.font = 'bold 120px "Noto Serif TC", "PingFang TC", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// 挖洞牆面輔助
// ---------------------------------------------------------------------------
function archHole(x0, x1, y0, yTop) {
  const r = (x1 - x0) / 2;
  const p = new THREE.Path();
  p.moveTo(x0, y0);
  p.lineTo(x1, y0);
  p.lineTo(x1, yTop);
  p.absarc((x0 + x1) / 2, yTop, r, 0, Math.PI, false);
  p.lineTo(x0, y0);
  return p;
}

function rectHole(x0, x1, y0, y1) {
  const p = new THREE.Path();
  p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.lineTo(x0, y0);
  return p;
}

function circleHole(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return p;
}

function perforatedWall(w, h, depth, holes, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h);
  shape.lineTo(-w / 2, h);
  shape.lineTo(-w / 2, 0);
  shape.holes = holes;
  const geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 });
  return new THREE.Mesh(geom, material);
}

// 在方形量體四面貼上挖洞外牆 (front=+z, back=-z, right=+x, left=-x)
function addFourWalls(group, halfW, halfD, h, depth, holesFront, holesSide, mat) {
  const front = perforatedWall(halfW * 2, h, depth, holesFront(), mat);
  front.position.set(0, 0, halfD);
  const back = perforatedWall(halfW * 2, h, depth, holesFront(), mat);
  back.rotation.y = Math.PI;
  back.position.set(0, 0, -halfD);
  const right = perforatedWall(halfD * 2, h, depth, holesSide(), mat);
  right.rotation.y = Math.PI / 2;
  right.position.set(halfW, 0, 0);
  const left = perforatedWall(halfD * 2, h, depth, holesSide(), mat);
  left.rotation.y = -Math.PI / 2;
  left.position.set(-halfW, 0, 0);
  group.add(front, back, right, left);
}

export class RealisticLandmarks {
  // =========================================================================
  // 臺中國家歌劇院：純白清水混凝土 + 美聲涵洞(大小拱洞/圓洞) + 屋頂花園
  // 實際尺寸約 70m x 52m x 45m，無超大廣場地板
  // =========================================================================
  static buildNationalTaichungTheater() {
    const group = new THREE.Group();
    group.name = 'national_taichung_theater';

    const W = 68, D = 48, H = 44;
    const concrete = new THREE.MeshLambertMaterial({ map: concreteTexture(), side: THREE.DoubleSide });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x8fc4ee, metalness: 0.55, roughness: 0.18, emissive: 0x0d3050, emissiveIntensity: 0.55
    });

    // 薄基座：僅比建築大 3m
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(W + 6, 0.3, D + 6),
      new THREE.MeshLambertMaterial({ color: 0xcfd2d4 })
    );
    plinth.position.y = 0.15;
    group.add(plinth);

    // 玻璃/暗色內核 (透過牆面洞口可見)
    const core = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), glassMat);
    core.position.y = H / 2 + 0.3;
    group.add(core);

    const holesFront = () => [
      archHole(-30, -18, 1.8, 22),
      archHole(-12, 6, 1.8, 29),
      archHole(12, 24, 1.8, 16),
      circleHole(-22, 36, 3.8),
      circleHole(16, 31, 3.0),
      circleHole(-3, 41.2, 1.8)
    ];
    const holesSide = () => [
      archHole(-20, -8, 1.8, 18),
      archHole(2, 16, 1.8, 24),
      circleHole(-14, 33, 3.4),
      circleHole(9, 35, 3.0)
    ];

    const wallsGroup = new THREE.Group();
    addFourWalls(wallsGroup, W / 2, D / 2, H, 1.8, holesFront, holesSide, concrete);
    wallsGroup.position.y = 0.3;
    group.add(wallsGroup);

    // 屋頂板與屋頂花園
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 3.6, 1.4, D + 3.6), concrete);
    roof.position.y = H + 0.3 + 0.7;
    group.add(roof);

    const garden = new THREE.Mesh(
      new THREE.BoxGeometry(W - 8, 0.5, D - 8),
      new THREE.MeshLambertMaterial({ color: 0x4f9d4a })
    );
    garden.position.y = H + 1.7 + 0.25;
    group.add(garden);

    // 屋頂通風/天井曲面塔
    for (const [x, z, r] of [[-18, -8, 3.6], [14, -12, 3.0], [10, 8, 4.0]]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, 5, 18), concrete);
      tower.position.set(x, H + 4.4, z);
      group.add(tower);
    }

    return group;
  }

  // =========================================================================
  // 東海大學路思義教堂：貝聿銘雙曲拋物面薄殼 (長約 24m、寬 15m、高 15m)
  // =========================================================================
  static buildLuceMemorialChapel() {
    const group = new THREE.Group();
    group.name = 'luce_memorial_chapel';

    const L = 12;   // 半長 (沿 x)
    const B = 7.5;  // 半寬 (沿 z)
    const H = 15;   // 山牆高度
    const baseY = 0.4;

    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(L * 2 + 6, baseY, B * 2 + 5),
      new THREE.MeshLambertMaterial({ color: 0xd9d4c8 })
    );
    podium.position.y = baseY / 2;
    group.add(podium);

    const tile = diamondTileTexture();
    tile.repeat.set(10, 5);
    const shellMat = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide });

    const buildShell = (s) => {
      const geom = new THREE.PlaneGeometry(2, 1, 32, 16);
      const pos = geom.attributes.position;
      const uv = geom.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);              // -1..1 (沿長度)
        const w = pos.getY(i) + 0.5;        // 0 (屋脊) .. 1 (簷口)
        pos.setXYZ(i, u * L, H * (1 - w) * (0.42 + 0.58 * u * u) + baseY, s * w * B);
        uv.setXY(i, u * 0.5 + 0.5, w);
      }
      geom.computeVertexNormals();
      return new THREE.Mesh(geom, shellMat);
    };
    group.add(buildShell(1), buildShell(-1));

    // 兩端山牆玻璃 + 白色框
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x9fe3ea, metalness: 0.4, roughness: 0.12, transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    const gable = new THREE.Shape();
    gable.moveTo(-B, 0); gable.lineTo(B, 0); gable.lineTo(0.35, H); gable.lineTo(-0.35, H); gable.lineTo(-B, 0);
    for (const sx of [1, -1]) {
      const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), glassMat);
      g.rotation.y = Math.PI / 2;
      g.position.set(sx * L, baseY, 0);
      group.add(g);
    }

    // 山牆頂白色十字架
    const crossMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), crossMat);
    crossV.position.set(L, baseY + H + 1.6, 0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.6), crossMat);
    crossH.position.set(L, baseY + H + 2.4, 0);
    group.add(crossV, crossH);

    // 入口平台台階
    const steps = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, B * 2 + 2), new THREE.MeshLambertMaterial({ color: 0xc8c3b6 }));
    steps.position.set(L + 3.5, 0.15, 0);
    group.add(steps);

    return group;
  }

  // =========================================================================
  // 宮原眼科：1927 日治新巴洛克紅磚二層建築，一樓拱圈騎樓、二樓拱窗、四坡黑瓦屋頂
  // 實際尺寸約 40m x 22m x 15m
  // =========================================================================
  static buildMiyahara() {
    const group = new THREE.Group();
    group.name = 'miyahara_historic_landmark';

    const W = 40, D = 22, H = 12;
    const brick = new THREE.MeshLambertMaterial({ map: brickTexture(), side: THREE.DoubleSide });
    const white = new THREE.MeshLambertMaterial({ color: 0xeee8da });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2220, emissive: 0x3d2a14, emissiveIntensity: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1c2b3a, metalness: 0.6, roughness: 0.2, emissive: 0x1a2a3a, emissiveIntensity: 0.5 });

    // 內核 (洞口後方暗色空間)
    const core = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, H, D - 0.4), dark);
    core.position.y = H / 2;
    group.add(core);

    const frontHoles = () => {
      const holes = [];
      const bay = 5.0;
      const n = Math.floor(W / bay); // 8 個拱圈
      const start = -(n * bay) / 2;
      for (let i = 0; i < n; i++) {
        const cx = start + bay * (i + 0.5);
        holes.push(archHole(cx - 1.7, cx + 1.7, 0.05, 3.6));       // 一樓騎樓拱圈自地面 0.05m 開啟，徹底杜絕掩埋感
        holes.push(archHole(cx - 1.0, cx + 1.0, 6.4, 8.9));       // 二樓拱窗
      }
      return holes;
    };
    const sideHoles = () => {
      const holes = [];
      const bay = 5.5;
      const n = Math.floor(D / bay);
      const start = -(n * bay) / 2;
      for (let i = 0; i < n; i++) {
        const cx = start + bay * (i + 0.5);
        holes.push(archHole(cx - 1.2, cx + 1.2, 0.05, 3.4));       // 側向騎樓拱圈自地面開啟
        holes.push(archHole(cx - 1.0, cx + 1.0, 6.4, 8.9));
      }
      return holes;
    };

    const walls = new THREE.Group();
    addFourWalls(walls, W / 2, D / 2, H, 1.2, frontHoles, sideHoles, brick);
    // 內縮使牆面外側貼齊外輪廓
    walls.children.forEach((m) => {
      const dir = new THREE.Vector3(m.position.x, 0, m.position.z).normalize();
      m.position.x -= dir.x * 1.2;
      m.position.z -= dir.z * 1.2;
    });
    group.add(walls);

    // 二樓窗內玻璃 (位於洞口後方)
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(W - 1.6, 4.2, D - 1.6), glass);
    glassBox.position.y = 7.6;
    group.add(glassBox);

    // 白色橫向腰線與簷口
    const belt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.45, D + 0.6), white);
    belt.position.y = 5.2;
    group.add(belt);
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.9, D + 1.2), white);
    cornice.position.y = H + 0.45;
    group.add(cornice);

    // 四坡黑瓦屋頂
    const roofGeom = new THREE.ConeGeometry(1, 3.6, 4, 1, false);
    roofGeom.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeom, new THREE.MeshLambertMaterial({ color: 0x3a3f46, side: THREE.DoubleSide }));
    roof.scale.set((W + 1.0) / 2 / 0.7071, 1, (D + 1.0) / 2 / 0.7071);
    roof.position.y = H + 0.9 + 1.8;
    group.add(roof);

    // 屋頂老虎窗
    for (const cx of [-12, 0, 12]) {
      const dormer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.6), brick);
      dormer.position.set(cx, H + 1.8, D / 2 - 3.6);
      group.add(dormer);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), new THREE.MeshLambertMaterial({ color: 0x3a3f46 }));
      cap.rotation.y = Math.PI / 4;
      cap.position.set(cx, H + 3.1, D / 2 - 3.6);
      group.add(cap);
    }

    // 正面中央山牆 (入口強調)
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-4.5, 0); pedShape.lineTo(4.5, 0); pedShape.lineTo(0, 3.2); pedShape.lineTo(-4.5, 0);
    const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(pedShape, { depth: 1.4, bevelEnabled: false }), white);
    ped.position.set(0, H + 0.9, D / 2 - 1.4);
    group.add(ped);

    // 金字招牌「宮原眼科」
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1.9),
      new THREE.MeshBasicMaterial({ map: signTexture('宮原眼科') })
    );
    sign.position.set(0, 4.55, D / 2 + 0.05);
    group.add(sign);

    // 騎樓地面
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.25, D + 1), new THREE.MeshLambertMaterial({ color: 0x9a948a }));
    floor.position.y = 0.12;
    group.add(floor);

    return group;
  }
}
