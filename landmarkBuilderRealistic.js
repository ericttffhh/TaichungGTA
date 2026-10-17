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
  // 東海大學路思義教堂：貝聿銘雙曲拋物面薄殼 (長約 26m、寬 16m、高 15m)
  // 四片分離雙曲拋物面曲面、天窗採光玻璃帶、菱形琉璃磚、懸空十字架與東海草坪
  // =========================================================================
  static buildLuceMemorialChapel() {
    const group = new THREE.Group();
    group.name = 'luce_memorial_chapel';

    const L = 13;   // 半長 (沿 x)
    const B = 8.0;  // 半寬 (沿 z)
    const H = 15.2; // 山牆高度
    const baseY = 0.35;

    // 寬闊微傾斜草坪與洗石子基座
    const lawnGeom = new THREE.BoxGeometry(L * 2 + 18, 0.3, B * 2 + 16);
    const lawn = new THREE.Mesh(lawnGeom, new THREE.MeshLambertMaterial({ color: 0x437a3b }));
    lawn.position.y = 0.15;
    lawn.receiveShadow = true;
    group.add(lawn);

    const podium = new THREE.Mesh(
      new THREE.BoxGeometry(L * 2 + 6, baseY, B * 2 + 5),
      new THREE.MeshLambertMaterial({ color: 0xd9d4c8 })
    );
    podium.position.y = baseY / 2 + 0.15;
    podium.receiveShadow = true;
    group.add(podium);

    const tile = diamondTileTexture();
    tile.repeat.set(10, 5);
    const shellMat = new THREE.MeshStandardMaterial({
      map: tile,
      roughness: 0.35,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const ribMat = new THREE.MeshStandardMaterial({ color: 0xbfb6a4, roughness: 0.6 });

    // 四片分離雙曲拋物面薄殼 (4 Distinct Hyperbolic Paraboloid Shells)
    const buildShellQuarter = (sX, sZ) => {
      const geom = new THREE.PlaneGeometry(1, 1, 24, 18);
      const pos = geom.attributes.position;
      const uv = geom.attributes.uv;

      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5; // 0 (中心) .. 1 (端點山牆)
        const w = pos.getY(i) + 0.5; // 0 (脊線採光帶縫隙) .. 1 (落地基礎)

        // 雙曲拋物面幾何方程式 (中間收緊高聳、兩端舒展低伏)
        const curX = sX * (u * (L - 0.25) + 0.25);
        const curY = H * (1 - w * 0.95) * (0.38 + 0.62 * u * u) + baseY;
        const curZ = sZ * (w * (B - 0.3) + 0.25);

        pos.setXYZ(i, curX, curY, curZ);
        uv.setXY(i, u, w);
      }
      geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, shellMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 生成前左、前右、後左、後右四片曲面薄殼
    group.add(
      buildShellQuarter(1, 1),
      buildShellQuarter(1, -1),
      buildShellQuarter(-1, 1),
      buildShellQuarter(-1, -1)
    );

    // 脊線採光玻璃帶 (Top Ridge Glass Skylight Slot)
    const skylightMat = new THREE.MeshStandardMaterial({
      color: 0x88d8f0,
      metalness: 0.6,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const skylight = new THREE.Mesh(
      new THREE.BoxGeometry(L * 2 - 1, 0.25, 0.5),
      skylightMat
    );
    skylight.position.set(0, H + baseY - 0.1, 0);
    group.add(skylight);

    // 兩端山牆菱形鋼構玻璃帷幕 (Gable Glass Curtain Walls with Mullions)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x9fe3ea,
      metalness: 0.5,
      roughness: 0.1,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide
    });

    const gable = new THREE.Shape();
    gable.moveTo(-B, 0);
    gable.lineTo(B, 0);
    gable.lineTo(0.35, H);
    gable.lineTo(-0.35, H);
    gable.closePath();

    for (const sx of [1, -1]) {
      const g = new THREE.Mesh(new THREE.ShapeGeometry(gable), glassMat);
      g.rotation.y = Math.PI / 2;
      g.position.set(sx * L, baseY, 0);
      group.add(g);

      // 菱形鋁合金鋼櫺格網
      for (let gy = 2.0; gy < H - 1; gy += 2.2) {
        const spanW = B * (1 - gy / H) * 2;
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.08, spanW),
          ribMat
        );
        mullion.position.set(sx * L, baseY + gy, 0);
        group.add(mullion);
      }
    }

    // 教堂內部神聖懸空白色十字架 (Iconic Interior Floating Cross)
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      emissive: 0xffffff,
      emissiveIntensity: 0.4
    });
    const interiorCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.8, 0.25), crossMat);
    interiorCrossV.position.set(0, baseY + 6.2, 0);
    const interiorCrossH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 2.4), crossMat);
    interiorCrossH.position.set(0, baseY + 7.4, 0);
    group.add(interiorCrossV, interiorCrossH);

    // 山牆頂端外側純白十字架 (Roof Spire Cross)
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), crossMat);
    crossV.position.set(L, baseY + H + 1.7, 0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 1.8), crossMat);
    crossH.position.set(L, baseY + H + 2.5, 0);
    group.add(crossV, crossH);

    // 入口平台步階 (Grand Entrance Steps)
    const steps = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.35, B * 2 + 2),
      new THREE.MeshLambertMaterial({ color: 0xc8c3b6 })
    );
    steps.position.set(L + 4.0, 0.175, 0);
    steps.receiveShadow = true;
    group.add(steps);

    return group;
  }

  // =========================================================================
  // 宮原眼科：1927 日治新巴洛克紅磚二層建築與現代鋼構幾何採光天棚
  // 一樓拱圈騎樓拱頂石、復古黃銅吊燈、二樓拱窗、古典紅磚雕花、綠川水岸
  // =========================================================================
  static buildMiyahara() {
    const group = new THREE.Group();
    group.name = 'miyahara_historic_landmark';

    const W = 40, D = 22, H = 12;
    const brick = new THREE.MeshLambertMaterial({ map: brickTexture(), side: THREE.DoubleSide });
    const white = new THREE.MeshLambertMaterial({ color: 0xeee8da });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1f1715, emissive: 0x2d1a0e, emissiveIntensity: 0.5 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x1c2b3a,
      metalness: 0.6,
      roughness: 0.18,
      emissive: 0x152535,
      emissiveIntensity: 0.45
    });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4, metalness: 0.8 });

    // 內核空間 (洞口後方展示霍格華茲風挑高木質書塔與金箔包裝櫃)
    const core = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, H, D - 0.4), dark);
    core.position.y = H / 2;
    group.add(core);

    const frontHoles = () => {
      const holes = [];
      const bay = 5.0;
      const n = Math.floor(W / bay); // 8 個連續拱圈
      const start = -(n * bay) / 2;
      for (let i = 0; i < n; i++) {
        const cx = start + bay * (i + 0.5);
        holes.push(archHole(cx - 1.7, cx + 1.7, 0.05, 3.6));
        holes.push(archHole(cx - 1.0, cx + 1.0, 6.4, 8.9));
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
        holes.push(archHole(cx - 1.2, cx + 1.2, 0.05, 3.4));
        holes.push(archHole(cx - 1.0, cx + 1.0, 6.4, 8.9));
      }
      return holes;
    };

    const walls = new THREE.Group();
    addFourWalls(walls, W / 2, D / 2, H, 1.2, frontHoles, sideHoles, brick);
    walls.children.forEach((m) => {
      const dir = new THREE.Vector3(m.position.x, 0, m.position.z).normalize();
      m.position.x -= dir.x * 1.2;
      m.position.z -= dir.z * 1.2;
    });
    group.add(walls);

    // 拱圈拱頂石 (Keystones) 與立柱柱頭雕花飾塊
    const bayW = 5.0;
    const startW = -(Math.floor(W / bayW) * bayW) / 2;
    for (let i = 0; i < Math.floor(W / bayW); i++) {
      const cx = startW + bayW * (i + 0.5);
      // 一樓拱頂石
      const ks1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.35), white);
      ks1.position.set(cx, 3.65, D / 2 + 0.05);
      group.add(ks1);

      // 二樓拱頂石
      const ks2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), white);
      ks2.position.set(cx, 8.95, D / 2 + 0.05);
      group.add(ks2);

      // 騎樓內部復古黃銅吊燈 (Vintage Brass Arcade Lanterns)
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.16, 0.45, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffeedd,
          emissive: 0xffa502,
          emissiveIntensity: 0.65,
          roughness: 0.2
        })
      );
      lantern.position.set(cx, 3.2, D / 2 - 2.2);
      group.add(lantern);

      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), brassMat);
      chain.position.set(cx, 3.75, D / 2 - 2.2);
      group.add(chain);
    }

    // 二樓窗內透光玻璃 (位於洞口後方)
    const glassBox = new THREE.Mesh(new THREE.BoxGeometry(W - 1.6, 4.2, D - 1.6), glass);
    glassBox.position.y = 7.6;
    group.add(glassBox);

    // 白色橫向古典水平飾帶與簷口線腳 (Cornice & Belt Courses)
    const belt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.45, D + 0.8), white);
    belt.position.y = 5.2;
    group.add(belt);

    const cornice = new THREE.Mesh(new THREE.BoxGeometry(W + 1.4, 0.9, D + 1.4), white);
    cornice.position.y = H + 0.45;
    group.add(cornice);

    // 【重要建築特色】：現代幾何鋼構斜面玻璃採光天棚 (Modern Geometric Steel & Glass Roof)
    // 宮原眼科最著名的是在古蹟紅磚之上加蓋的幾何三角玻璃天窗
    const skylightGeo = new THREE.ConeGeometry(1, 4.2, 4, 1, false);
    skylightGeo.rotateY(Math.PI / 4);
    const skylightRoof = new THREE.Mesh(
      skylightGeo,
      new THREE.MeshStandardMaterial({
        color: 0x487eb0,
        metalness: 0.7,
        roughness: 0.15,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      })
    );
    skylightRoof.scale.set((W + 1.0) / 2 / 0.7071, 1, (D + 1.0) / 2 / 0.7071);
    skylightRoof.position.y = H + 0.9 + 2.1;
    group.add(skylightRoof);

    // 天棚幾何鋼構外骨架 (Steel Trusses)
    for (const sx of [-12, -6, 0, 6, 12]) {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.18), steelMat);
      truss.position.set(sx, H + 2.8, 0);
      group.add(truss);
    }

    // 屋頂老虎窗 (Dormers)
    for (const cx of [-12, 0, 12]) {
      const dormer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 1.6), brick);
      dormer.position.set(cx, H + 1.8, D / 2 - 3.6);
      group.add(dormer);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), white);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(cx, H + 3.1, D / 2 - 3.6);
      group.add(cap);
    }

    // 正面中央巴洛克山牆 (Baroque Pediment)
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-5.0, 0);
    pedShape.lineTo(5.0, 0);
    pedShape.lineTo(0, 3.6);
    pedShape.closePath();
    const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(pedShape, { depth: 1.4, bevelEnabled: false }), white);
    ped.position.set(0, H + 0.9, D / 2 - 1.4);
    group.add(ped);

    // 山牆中央圓形勳章浮雕 (Baroque Medallion Cartouche)
    const cartouche = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 16), white);
    cartouche.rotation.x = Math.PI / 2;
    cartouche.position.set(0, H + 2.4, D / 2 + 0.05);
    group.add(cartouche);

    // 經典燙金復古書法大招牌「宮原眼科」
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(10.5, 2.0),
      new THREE.MeshBasicMaterial({ map: signTexture('宮原眼科') })
    );
    sign.position.set(0, 4.6, D / 2 + 0.05);
    group.add(sign);

    // 騎樓洗石子與紅地磚地面
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.35, D + 4), new THREE.MeshLambertMaterial({ color: 0x9a948a }));
    floor.position.set(0, 0.175, 1.0);
    floor.receiveShadow = true;
    group.add(floor);

    return group;
  }
}
