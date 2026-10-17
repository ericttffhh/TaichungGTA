/**
 * landmarkBuilder.js
 * 臺中著名經典地標 專屬 3D 精品獨立建模器 (Procedural Bespoke Landmark Architecture)
 * 涵蓋：
 * 1. 台中公園 湖心亭 (Huxin Pavilion in Taichung Park) - 市徽象徵、日月湖、雙尖頂重簷、曲橋
 * 2. 臺中國家歌劇院 (National Taichung Theater) - 伊東豊雄美聲涵洞、有機曲面、空中花園、火山口通風塔
 * 3. 東海大學 路思義教堂 (Luce Memorial Chapel) - 貝聿銘雙曲拋物面、菱形黃色琉璃面磚、天窗玻璃帶、十字架
 * 4. 宮原眼科 (Miyahara) - 1927 日治古典紅磚拱圈騎樓、現代幾何鋼構玻璃帷幕天頂、復古金字木牌樓
 * 5. 臺中第二市場 六角樓 (Taichung Second Market) - 1917 六角核心木造鐘樓、三翼放射狀傳統市場長廊
 */

import * as THREE from 'three';
import { RealisticLandmarks } from './landmarkBuilderRealistic.js';
import { ProceduralLandmarks } from './landmarksProcedural.js';

// 輔助貼圖產生器 (輕量高畫質 Canvas Texture)
class LandmarkTextureHelper {
  // A. 菱形黃色琉璃面磚 (路思義教堂專用)
  static createDiamondTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d48817';
    ctx.fillRect(0, 0, 512, 512);

    const size = 32;
    for (let y = 0; y < 512; y += size) {
      for (let x = 0; x < 512; x += size) {
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.beginPath();
        ctx.moveTo(0, -size / 2 + 2);
        ctx.lineTo(size / 2 - 2, 0);
        ctx.lineTo(0, size / 2 - 2);
        ctx.lineTo(-size / 2 + 2, 0);
        ctx.closePath();

        // 溫潤金黃漸層琉璃釉彩
        const grad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
        grad.addColorStop(0, '#f9ca24');
        grad.addColorStop(0.5, '#f0932b');
        grad.addColorStop(1, '#d35400');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#6c3b06';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  // B. 日式古典綠釉瓦 / 歇山屋瓦 (湖心亭專用)
  static createTealRoofTileTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1e3d34';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = '#26584c';
      ctx.fillRect(0, y, 256, 12);
      ctx.fillStyle = '#112520';
      ctx.fillRect(0, y + 12, 256, 4);

      for (let x = 0; x < 256; x += 16) {
        ctx.fillStyle = '#3a7b6b';
        ctx.fillRect(x + 2, y + 2, 12, 8);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  // C. 1927 歷史英式紅磚牆 (宮原眼科專用)
  static createRedBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#4b1e19';
    ctx.fillRect(0, 0, 512, 512);

    const bH = 20;
    const bW = 46;
    for (let row = 0; row < 512 / bH; row++) {
      const offsetX = (row % 2 === 0) ? 0 : bW / 2;
      for (let x = -bW; x < 512 + bW; x += bW) {
        const vx = x + offsetX;
        ctx.fillStyle = (row + x) % 3 === 0 ? '#8e2a21' : ((row + x) % 5 === 0 ? '#a7372d' : '#7b241c');
        ctx.fillRect(vx + 2, row * bH + 2, bW - 4, bH - 4);

        // 磚面細微風化質感
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(vx + 4, row * bH + bH - 6, bW - 8, 3);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 4);
    return tex;
  }
}

export class LandmarkBuilder {
  /**
   * 1. 台中公園 湖心亭 (Huxin Pavilion)
   * 雙尖頂雙重簷歇山木造涼亭、日月湖景致、紅木拱橋與石造基座
   */
  static buildTaichungParkPavilion() {
    const group = new THREE.Group();
    group.name = 'taichung_park_huxin_pavilion';

    // A. 日月湖水面基底 (半徑 38 米圓形碧綠湖水)
    const lakeGeom = new THREE.CylinderGeometry(38, 38, 1.2, 32);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x16a085,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.82
    });
    const lake = new THREE.Mesh(lakeGeom, lakeMat);
    lake.position.y = 0.6;
    group.add(lake);

    // 湖岸圓形石駁坎
    const rimGeom = new THREE.RingGeometry(37.5, 40.5, 36);
    rimGeom.rotateX(-Math.PI / 2);
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    rim.position.y = 1.22;
    group.add(rim);

    // B. 湖中島台 (涼亭基座石台，圓角方形)
    const baseGeom = new THREE.BoxGeometry(22, 1.8, 16);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.set(0, 1.6, 0);
    group.add(baseMesh);

    // C. 湖心亭架高木地板與紅色欄杆
    const deckGeom = new THREE.BoxGeometry(20, 0.4, 14);
    const deckMat = new THREE.MeshLambertMaterial({ color: 0xa0522d });
    const deck = new THREE.Mesh(deckGeom, deckMat);
    deck.position.set(0, 2.7, 0);
    group.add(deck);

    // 白色與暗紅相間防護欄杆
    const railMat = new THREE.MeshLambertMaterial({ color: 0xf5f6fa });
    const railGeom = new THREE.BoxGeometry(19.6, 0.8, 0.2);
    const railFront = new THREE.Mesh(railGeom, railMat);
    railFront.position.set(0, 3.2, 6.8);
    const railBack = new THREE.Mesh(railGeom, railMat);
    railBack.position.set(0, 3.2, -6.8);
    group.add(railFront, railBack);

    // D. 涼亭 16 根深木色主支柱
    const colGeom = new THREE.CylinderGeometry(0.24, 0.24, 4.2, 12);
    const colMat = new THREE.MeshLambertMaterial({ color: 0x4a2311 });
    const xPositions = [-8.5, -3.0, 3.0, 8.5];
    const zPositions = [-5.5, 0, 5.5];

    xPositions.forEach(x => {
      zPositions.forEach(z => {
        const col = new THREE.Mesh(colGeom, colMat);
        col.position.set(x, 4.8, z);
        group.add(col);
      });
    });

    // E. 經典歇山重簷雙尖頂天棚 (Twin Peaks Oriental Roof)
    const roofTileTex = LandmarkTextureHelper.createTealRoofTileTexture();
    const roofMat = new THREE.MeshLambertMaterial({
      map: roofTileTex,
      side: THREE.DoubleSide
    });

    // 左右兩座四角攢尖頂 (雙峰並立)
    [-5.0, 5.0].forEach(peakX => {
      // 下層廣簷
      const lowerGeom = new THREE.ConeGeometry(7.2, 2.4, 4);
      lowerGeom.rotateY(Math.PI / 4);
      const lowerRoof = new THREE.Mesh(lowerGeom, roofMat);
      lowerRoof.position.set(peakX, 7.6, 0);
      group.add(lowerRoof);

      // 上層尖頂
      const upperGeom = new THREE.ConeGeometry(5.0, 2.6, 4);
      upperGeom.rotateY(Math.PI / 4);
      const upperRoof = new THREE.Mesh(upperGeom, roofMat);
      upperRoof.position.set(peakX, 9.4, 0);
      group.add(upperRoof);

      // 頂端金色寶頂 (Finial)
      const finialGeom = new THREE.SphereGeometry(0.45, 12, 12);
      const finialMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.2 });
      const finial = new THREE.Mesh(finialGeom, finialMat);
      finial.position.set(peakX, 11.0, 0);
      group.add(finial);
    });

    // 中央銜接屋脊
    const ridgeGeom = new THREE.BoxGeometry(6.5, 0.6, 2.2);
    const ridge = new THREE.Mesh(ridgeGeom, roofMat);
    ridge.position.set(0, 8.2, 0);
    group.add(ridge);

    // F. 紅木曲橋 (從島台延伸至湖岸)
    const bridgeGeom = new THREE.BoxGeometry(3.2, 0.4, 18);
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
    const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);
    bridge.position.set(0, 2.2, 16);
    group.add(bridge);

    // 橋墩
    for (let bz = 10; bz <= 22; bz += 4) {
      const pierGeom = new THREE.CylinderGeometry(0.2, 0.2, 2.0, 8);
      const pier1 = new THREE.Mesh(pierGeom, colMat);
      pier1.position.set(-1.4, 1.2, bz);
      const pier2 = new THREE.Mesh(pierGeom, colMat);
      pier2.position.set(1.4, 1.2, bz);
      group.add(pier1, pier2);
    }

    return group;
  }

  /**
   * 2. 臺中國家歌劇院 (National Taichung Theater)
   * 伊東豊雄設計、美聲涵洞曲面開口、純白清水混凝土主體、波浪天台空中花園、火山口煙囪
   */
  static buildNationalTaichungTheater() {
    const group = new THREE.Group();
    group.name = 'national_taichung_theater';

    // A. 現代極簡廣場地基 (88m x 78m)
    const plazaGeom = new THREE.BoxGeometry(92, 0.6, 84);
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0xbdc3c7 });
    const plaza = new THREE.Mesh(plazaGeom, plazaMat);
    plaza.position.y = 0.3;
    group.add(plaza);

    // 門前鏡面水池
    const poolGeom = new THREE.BoxGeometry(32, 0.3, 16);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.1, metalness: 0.5 });
    const pool = new THREE.Mesh(poolGeom, poolMat);
    pool.position.set(0, 0.65, 30);
    group.add(pool);

    // B. 主體純白建築量體 (80m x 32m x 68m)
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xf8f9fa });
    const bodyGeom = new THREE.BoxGeometry(78, 30, 64);
    const body = new THREE.Mesh(bodyGeom, concreteMat);
    body.position.set(0, 15.6, 0);
    group.add(body);

    // C. 伊東豊雄「美聲涵洞」(Sound Cave) 有機幾何鏤空與玻璃帷幕凹槽
    const caveGlassMat = new THREE.MeshStandardMaterial({
      color: 0x74b9ff,
      metalness: 0.85,
      roughness: 0.15,
      transparent: true,
      opacity: 0.72
    });

    // 正面主涵洞拱形開口群
    const caveConfigs = [
      { x: -24, y: 12, w: 16, h: 22, d: 4 },
      { x: 0, y: 14, w: 22, h: 26, d: 5 },
      { x: 24, y: 12, w: 16, h: 22, d: 4 }
    ];

    caveConfigs.forEach(cfg => {
      // 內凹曲面玻璃立面
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(cfg.w / 2, cfg.w / 2, cfg.h, 16, 1, false, 0, Math.PI), caveGlassMat);
      glass.rotation.z = Math.PI;
      glass.rotation.y = Math.PI / 2;
      glass.position.set(cfg.x, cfg.y, 32.2);
      group.add(glass);

      // 深色金屬格柵飾框
      const frameGeom = new THREE.TorusGeometry(cfg.w / 2, 0.6, 8, 24, Math.PI);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7 });
      const frame = new THREE.Mesh(frameGeom, frameMat);
      frame.position.set(cfg.x, cfg.y, 32.4);
      group.add(frame);
    });

    // D. 頂層波浪狀空中花園 (Rooftop Sky Garden)
    const gardenGeom = new THREE.CylinderGeometry(34, 35, 1.2, 24);
    const gardenMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
    const garden = new THREE.Mesh(gardenGeom, gardenMat);
    garden.position.set(0, 31.2, 0);
    group.add(garden);

    // 火山口紅色排氣通風錐 (Iconic Red Volcanic Funnels)
    const funnelMat = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
    const funnels = [
      { x: -18, z: -12, r1: 2.2, r2: 3.8, h: 4.8 },
      { x: 14, z: -16, r1: 1.8, r2: 3.2, h: 4.0 },
      { x: 12, z: 10, r1: 2.5, r2: 4.2, h: 5.5 }
    ];

    funnels.forEach(f => {
      const fGeom = new THREE.CylinderGeometry(f.r2, f.r1, f.h, 16);
      const funnel = new THREE.Mesh(fGeom, funnelMat);
      funnel.position.set(f.x, 33.6, f.z);
      group.add(funnel);
    });

    return group;
  }

  /**
   * 3. 東海大學 路思義教堂 (Luce Memorial Chapel)
   * 貝聿銘設計、雙曲拋物面曲面薄殼屋頂、金黃菱形琉璃面磚、脊部玻璃天窗、白色十字架
   */
  static buildLuceMemorialChapel() {
    const group = new THREE.Group();
    group.name = 'luce_memorial_chapel';

    // A. 東海廣闊大草坪基座
    const lawnGeom = new THREE.CylinderGeometry(42, 44, 1.2, 32);
    const lawnMat = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
    const lawn = new THREE.Mesh(lawnGeom, lawnMat);
    lawn.position.y = 0.6;
    group.add(lawn);

    // 教堂清水磚石地台
    const podiumGeom = new THREE.BoxGeometry(32, 0.6, 26);
    const podiumMat = new THREE.MeshLambertMaterial({ color: 0xdfe6e9 });
    const podium = new THREE.Mesh(podiumGeom, podiumMat);
    podium.position.set(0, 1.4, 0);
    group.add(podium);

    // B. 四片雙曲拋物面曲面翼 (Hyperbolic Paraboloid Shells)
    const tileTex = LandmarkTextureHelper.createDiamondTileTexture();
    const shellMat = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    // 建立教堂曲面薄殼 (參數化網格，向上收斂並優雅合攏)
    const shellWidth = 14;
    const shellHeight = 22;
    const shellDepth = 12;

    const buildCurvedWing = (sideX, sideZ) => {
      const geom = new THREE.PlaneGeometry(shellDepth, shellHeight, 16, 24);
      const pos = geom.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / shellDepth; // -0.5 ~ 0.5
        const v = (pos.getY(i) + shellHeight / 2) / shellHeight; // 0 ~ 1.0 (高度比例)

        // 雙曲拋物面彎曲方程：底部寬、中段收窄、脊部向中央內傾合攏
        const curveIn = Math.sin(v * Math.PI * 0.75) * 4.2;
        const lean = (1 - v) * 5.5 + 0.8;

        pos.setZ(i, (sideZ * (lean - curveIn)));
        pos.setX(i, pos.getX(i) * (1 - v * 0.38));
      }
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, shellMat);
      mesh.position.set(sideX * 0.6, 1.6 + shellHeight / 2, 0);
      mesh.rotation.y = (sideZ > 0 ? 0 : Math.PI);
      return mesh;
    };

    group.add(buildCurvedWing(-1, 1));
    group.add(buildCurvedWing(1, 1));
    group.add(buildCurvedWing(-1, -1));
    group.add(buildCurvedWing(1, -1));

    // C. 脊部與山牆連續玻璃天窗 (Central Ridge Skylight & Glass Gable)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x81ecec,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65
    });

    // 正面山牆三角透光窗
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-5.2, 0);
    gableShape.lineTo(5.2, 0);
    gableShape.lineTo(0.5, 21.8);
    gableShape.lineTo(-0.5, 21.8);
    gableShape.closePath();

    const gableGeom = new THREE.ShapeGeometry(gableShape);
    const frontGable = new THREE.Mesh(gableGeom, glassMat);
    frontGable.position.set(0, 1.6, 5.8);
    const backGable = new THREE.Mesh(gableGeom, glassMat);
    backGable.position.set(0, 1.6, -5.8);
    group.add(frontGable, backGable);

    // 脊部通長玻璃天窗帶
    const ridgeGlassGeom = new THREE.BoxGeometry(0.8, 0.4, 11.6);
    const ridgeGlass = new THREE.Mesh(ridgeGlassGeom, glassMat);
    ridgeGlass.position.set(0, 23.4, 0);
    group.add(ridgeGlass);

    // D. 頂端白色鋼構十字架 (Apex Cross)
    const crossMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.2, 0.25), crossMat);
    crossV.position.set(0, 25.2, 0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.25), crossMat);
    crossH.position.set(0, 25.8, 0);
    group.add(crossV, crossH);

    return group;
  }

  /**
   * 4. 宮原眼科 (Miyahara)
   * 1927 古典紅磚巴洛克式騎樓拱圈、立面圓拱門窗、現代幾何鋼構玻璃穹頂、復古金字木匾
   */
  static buildMiyahara() {
    const group = new THREE.Group();
    group.name = 'miyahara_historic_landmark';

    // A. 騎樓步道與地基
    const baseGeom = new THREE.BoxGeometry(32, 0.6, 26);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.3;
    group.add(base);

    // B. 一樓經典紅磚拱圈騎樓 (Colonnaded Arcade)
    const brickTex = LandmarkTextureHelper.createRedBrickTexture();
    const brickMat = new THREE.MeshLambertMaterial({ map: brickTex });

    // 實體紅磚外牆主柱群 (5 跨圓拱)
    const archCount = 5;
    const archWidth = 5.2;
    for (let i = 0; i < archCount; i++) {
      const px = (i - (archCount - 1) / 2) * archWidth;

      // 磚柱
      const pGeom = new THREE.BoxGeometry(1.2, 6.5, 1.4);
      const pier = new THREE.Mesh(pGeom, brickMat);
      pier.position.set(px, 3.8, 11.5);
      group.add(pier);

      // 柱頭線腳石雕
      const capGeom = new THREE.BoxGeometry(1.5, 0.35, 1.7);
      const capMat = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
      const cap = new THREE.Mesh(capGeom, capMat);
      cap.position.set(px, 7.2, 11.5);
      group.add(cap);

      // 拱圈跨樑
      if (i < archCount - 1) {
        const nextX = px + archWidth;
        const archSpan = new THREE.Mesh(new THREE.BoxGeometry(archWidth - 1.2, 1.4, 1.2), brickMat);
        archSpan.position.set((px + nextX) / 2, 7.4, 11.5);
        group.add(archSpan);
      }
    }

    // C. 二樓與主體紅磚樓身
    const upperGeom = new THREE.BoxGeometry(26, 8.5, 20);
    const upper = new THREE.Mesh(upperGeom, brickMat);
    upper.position.set(0, 12.0, 1.5);
    group.add(upper);

    // 仿古百葉窗排
    const windowMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    for (let wx = -9; wx <= 9; wx += 4.5) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 0.3), windowMat);
      win.position.set(wx, 12.5, 11.6);
      group.add(win);
    }

    // D. 屋頂後現代折板幾何天幕玻璃帷幕 (Modern Faceted Glass Crown)
    const roofGlassMat = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.15,
      metalness: 0.85,
      transparent: true,
      opacity: 0.78
    });
    const crownGeom = new THREE.ConeGeometry(15, 6.5, 4);
    crownGeom.rotateY(Math.PI / 4);
    const crown = new THREE.Mesh(crownGeom, roofGlassMat);
    crown.position.set(0, 19.5, 1.5);
    group.add(crown);

    // 黑色鋼構菱形桁架稜線
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const frameBeam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.0, 0.3), frameMat);
    frameBeam.position.set(0, 19.5, 1.5);
    group.add(frameBeam);

    // E. 招牌金字木匾「宮原眼科」
    const signboardGeom = new THREE.BoxGeometry(6.4, 1.2, 0.3);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x3d1c06 });
    const sign = new THREE.Mesh(signboardGeom, signMat);
    sign.position.set(0, 7.8, 12.4);

    // 金色字體銘板
    const letterGeom = new THREE.BoxGeometry(5.2, 0.6, 0.08);
    const letterMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8 });
    const letter = new THREE.Mesh(letterGeom, letterMat);
    letter.position.set(0, 0, 0.2);
    sign.add(letter);
    group.add(sign);

    return group;
  }

  /**
   * 5. 臺中第二市場 六角樓 (Taichung Second Market Hexagonal Pavilion)
   * 1917 百年歷史市場、中央兩層六角木造主樓、三翼放射狀長廊街廓
   */
  static buildSecondMarketHexagonalTower() {
    const group = new THREE.Group();
    group.name = 'second_market_hexagonal_tower';

    // A. 市場中央六角形紅磚基座
    const baseGeom = new THREE.CylinderGeometry(11, 11, 1.0, 6);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.5;
    group.add(base);

    // B. 一樓六角核心主體 (磚木混合)
    const brickTex = LandmarkTextureHelper.createRedBrickTexture();
    const l1Geom = new THREE.CylinderGeometry(9.5, 9.5, 5.8, 6);
    const l1Mat = new THREE.MeshLambertMaterial({ map: brickTex });
    const level1 = new THREE.Mesh(l1Geom, l1Mat);
    level1.position.y = 3.9;
    group.add(level1);

    // 一樓與二樓交界之六角腰簷
    const eaveGeom = new THREE.CylinderGeometry(11.2, 9.5, 0.8, 6);
    const eaveMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    const eave = new THREE.Mesh(eaveGeom, eaveMat);
    eave.position.y = 7.2;
    group.add(eave);

    // C. 二樓木造六角展望鐘樓
    const l2Geom = new THREE.CylinderGeometry(7.5, 7.5, 4.8, 6);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x5d4037 });
    const level2 = new THREE.Mesh(l2Geom, woodMat);
    level2.position.y = 10.0;
    group.add(level2);

    // 二樓木質百葉觀察窗
    const windowMat = new THREE.MeshLambertMaterial({ color: 0xf1f2f6 });
    for (let r = 0; r < 6; r++) {
      const angle = (r * Math.PI) / 3;
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 0.3), windowMat);
      win.position.set(Math.sin(angle) * 7.6, 10.4, Math.cos(angle) * 7.6);
      win.rotation.y = angle;
      group.add(win);
    }

    // D. 頂層六角攢尖頂 (Hexagonal Hip Roof)
    const roofGeom = new THREE.ConeGeometry(9.6, 4.2, 6);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xb71540 });
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 14.5;
    group.add(roof);

    // 樓頂避雷避尖與小鐘塔寶頂
    const spireGeom = new THREE.CylinderGeometry(0.1, 0.35, 2.8, 8);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, metalness: 0.8 });
    const spire = new THREE.Mesh(spireGeom, spireMat);
    spire.position.y = 17.6;
    group.add(spire);

    // E. 三翼放射狀傳統市場長廊 (Three Radiating Wings)
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x718093 });
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach(ang => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.2, 22), wingMat);
      wing.position.set(Math.sin(ang) * 16, 2.6, Math.cos(ang) * 16);
      wing.rotation.y = ang;
      group.add(wing);

      // 屋脊三角雙坡斜頂
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.2, 4), roofMat);
      ridge.position.set(Math.sin(ang) * 16, 5.6, Math.cos(ang) * 16);
      ridge.rotation.y = ang + Math.PI / 4;
      group.add(ridge);
    });

    // F. 市場復古書法牌樓「臺中第二市場」
    const signPlate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
    signPlate.position.set(0, 4.8, 9.8);
    const goldText = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: 0xf1c40f }));
    goldText.position.set(0, 0, 0.2);
    signPlate.add(goldText);
    group.add(signPlate);

    return group;
  }
}

// 以依真實尺寸與建築形制重建的版本取代與擴充：
LandmarkBuilder.buildNationalTaichungTheater = RealisticLandmarks.buildNationalTaichungTheater;
LandmarkBuilder.buildLuceMemorialChapel = RealisticLandmarks.buildLuceMemorialChapel;
LandmarkBuilder.buildMiyahara = RealisticLandmarks.buildMiyahara;

// 取代所有 GLB 的高品質真實程序化地標建模：
LandmarkBuilder.buildTaichungStation = ProceduralLandmarks.buildTaichungStation;
LandmarkBuilder.buildLiFangAimei = ProceduralLandmarks.buildLiFangAimei;
LandmarkBuilder.buildAsiaGrandHotel = ProceduralLandmarks.buildAsiaGrandHotel;
LandmarkBuilder.buildScienceMuseum = ProceduralLandmarks.buildScienceMuseum;
LandmarkBuilder.buildFineArtsMuseum = ProceduralLandmarks.buildFineArtsMuseum;
LandmarkBuilder.buildDaqingStation = ProceduralLandmarks.buildDaqingStation;
LandmarkBuilder.buildTaichungIndustrialHighSchool = ProceduralLandmarks.buildTaichungIndustrialHighSchool;
