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

  // D. 1917 六角鐘樓復古羅馬數字時鐘貼圖
  static createClockTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#fefae0';
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2b1d0c';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#1b1b1b';
    ctx.font = 'bold 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) {
      const ang = (i * Math.PI) / 6;
      const x = 128 + Math.sin(ang) * 88;
      const y = 128 - Math.cos(ang) * 88;
      ctx.fillText(numerals[i], x, y);
    }

    // 指針 (10點10分優雅時鐘角度)
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(82, 78); // 時針
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 128);
    ctx.lineTo(182, 72); // 分針
    ctx.stroke();

    ctx.fillStyle = '#b33939';
    ctx.beginPath();
    ctx.arc(128, 128, 6, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // E. 傳統市場百年老字號招牌貼圖
  static createMarketStallTexture(name, sub) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8b261e';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#fff8e7';
    ctx.fillRect(6, 6, 244, 116);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 236, 108);

    ctx.fillStyle = '#4a1511';
    ctx.font = 'bold 30px "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 48);

    ctx.font = 'bold 15px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#8b261e';
    ctx.fillText(sub, 128, 88);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

export class LandmarkBuilder {
  /**
   * 1. 台中公園 湖心亭 (Huxin Pavilion)
   * 雙尖頂雙重簷歇山木造涼亭、日月湖景致、紅木拱橋、湖畔遊船與日式石燈籠
   */
  static buildTaichungParkPavilion() {
    const group = new THREE.Group();
    group.name = 'taichung_park_huxin_pavilion';

    const roofTileTex = LandmarkTextureHelper.createTealRoofTileTexture();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2311, roughness: 0.75 });
    const lightWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
    const redWoodMat = new THREE.MeshStandardMaterial({ color: 0xad281e, roughness: 0.65 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.85, roughness: 0.2 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x838c91, roughness: 0.85 });
    const stoneLanternMat = new THREE.MeshStandardMaterial({ color: 0xa4b0be, roughness: 0.9 });
    const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf5f6fa });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTex, roughness: 0.45, side: THREE.DoubleSide });
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x1a2e26, roughness: 0.6 });

    // A. 日月湖水面基底 (半徑 38 米圓形碧綠湖水)
    const lakeGeom = new THREE.CylinderGeometry(38, 38, 1.2, 48);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x16a085,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.84
    });
    const lake = new THREE.Mesh(lakeGeom, lakeMat);
    lake.position.y = 0.6;
    lake.receiveShadow = true;
    group.add(lake);

    // 湖岸圓形石駁坎
    const rimGeom = new THREE.RingGeometry(37.5, 41.0, 48);
    rimGeom.rotateX(-Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, stoneMat);
    rim.position.y = 1.22;
    group.add(rim);

    // B. 湖中島台 (涼亭基座石台，圓角八角形基座)
    const baseGeom = new THREE.CylinderGeometry(14.5, 15.2, 1.8, 8);
    const baseMesh = new THREE.Mesh(baseGeom, stoneMat);
    baseMesh.position.set(0, 1.6, 0);
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // C. 湖心亭架高木地板與紅色雕花欄杆
    const deckGeom = new THREE.BoxGeometry(20.4, 0.45, 14.4);
    const deck = new THREE.Mesh(deckGeom, woodMat);
    deck.position.set(0, 2.7, 0);
    deck.receiveShadow = true;
    group.add(deck);

    // 歇山涼亭周圍欄杆 (紅色立柱與白底橫欄)
    [-6.9, 6.9].forEach(rz => {
      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.85, 0.18), redWoodMat);
      railMesh.position.set(0, 3.25, rz);
      group.add(railMesh);
    });
    [-9.9, 9.9].forEach(rx => {
      const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 14.0), redWoodMat);
      railMesh.position.set(rx, 3.25, 0);
      group.add(railMesh);
    });

    // D. 涼亭 16 根深木色主支柱與斗拱承重樑 (Columns & Brackets)
    const colGeom = new THREE.CylinderGeometry(0.26, 0.28, 4.4, 12);
    const xPositions = [-8.5, -3.0, 3.0, 8.5];
    const zPositions = [-5.5, 0, 5.5];

    xPositions.forEach(x => {
      zPositions.forEach(z => {
        const col = new THREE.Mesh(colGeom, woodMat);
        col.position.set(x, 4.9, z);
        col.castShadow = true;
        group.add(col);

        // 柱頂斗栱構件 (Dou-gong Bracket System)
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.9), woodMat);
        bracket.position.set(x, 7.2, z);
        group.add(bracket);
      });
    });

    // E. 經典歇山重簷雙尖頂天棚 (Twin Peaks Oriental Roof With Flared Eaves)
    [-5.0, 5.0].forEach(peakX => {
      // 1. 下層廣簷 (Lower Roof)
      const lowerGeom = new THREE.ConeGeometry(7.6, 2.6, 4);
      lowerGeom.rotateY(Math.PI / 4);
      const lowerRoof = new THREE.Mesh(lowerGeom, roofMat);
      lowerRoof.position.set(peakX, 7.8, 0);
      lowerRoof.castShadow = true;
      group.add(lowerRoof);

      // 下層簷口飾邊
      const lowerEaveRim = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 10.8), darkTileMat);
      lowerEaveRim.rotation.y = Math.PI / 4;
      lowerEaveRim.position.set(peakX, 6.6, 0);
      group.add(lowerEaveRim);

      // 四角飛簷起翹尖角 (Flared Eave Tips)
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 4), darkTileMat);
        tip.position.set(peakX + sx * 5.4, 6.9, sz * 5.4);
        tip.rotation.x = -sz * 0.4;
        tip.rotation.z = sx * 0.4;
        group.add(tip);
      });

      // 2. 上層尖頂 (Upper Roof)
      const upperGeom = new THREE.ConeGeometry(5.2, 2.8, 4);
      upperGeom.rotateY(Math.PI / 4);
      const upperRoof = new THREE.Mesh(upperGeom, roofMat);
      upperRoof.position.set(peakX, 9.6, 0);
      upperRoof.castShadow = true;
      group.add(upperRoof);

      // 頂端金色寶頂 (Finial)
      const finialRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 8, 16), goldMat);
      finialRing.rotation.x = Math.PI / 2;
      finialRing.position.set(peakX, 11.0, 0);
      group.add(finialRing);

      const finialGeom = new THREE.SphereGeometry(0.52, 12, 12);
      const finial = new THREE.Mesh(finialGeom, goldMat);
      finial.position.set(peakX, 11.5, 0);
      group.add(finial);
    });

    // 中央銜接屋脊 (Ridge Connecting the Twin Peaks)
    const ridgeGeom = new THREE.BoxGeometry(6.6, 0.75, 2.6);
    const ridge = new THREE.Mesh(ridgeGeom, darkTileMat);
    ridge.position.set(0, 8.4, 0);
    group.add(ridge);

    // F. 紅木拱形曲橋 (Arched Curved Bridge Leading to Shore)
    // 實體弧形拱橋 Deck，自 Z: 7.2 跨越至 Z: 26.0 (長 18.8m, 寬 3.4m)
    const bridgeShape = new THREE.Shape();
    bridgeShape.moveTo(0, 2.2);
    bridgeShape.quadraticCurveTo(9.4, 3.4, 18.8, 1.3);
    bridgeShape.lineTo(18.8, 0.9);
    bridgeShape.quadraticCurveTo(9.4, 2.9, 0, 1.8);
    bridgeShape.closePath();

    const bridgeGeom = new THREE.ExtrudeGeometry(bridgeShape, {
      depth: 3.4,
      bevelEnabled: false
    });
    bridgeGeom.translate(0, 0, -1.7);
    bridgeGeom.rotateY(Math.PI / 2);

    const bridgeMesh = new THREE.Mesh(bridgeGeom, redWoodMat);
    bridgeMesh.position.set(0, 0, 7.2);
    bridgeMesh.castShadow = true;
    bridgeMesh.receiveShadow = true;
    group.add(bridgeMesh);

    // 拱橋兩側紅色護欄柱列
    for (let bz = 8.5; bz <= 25.0; bz += 2.2) {
      const normZ = (bz - 7.2) / 18.8;
      const by = 2.2 + Math.sin(normZ * Math.PI) * 1.2 + 0.45;

      [-1.6, 1.6].forEach(bx => {
        const baluster = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.95, 8),
          redWoodMat
        );
        baluster.position.set(bx, by, bz);
        group.add(baluster);

        // 橋柱頂端朱紅小圓球
        const postCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 8),
          redWoodMat
        );
        postCap.position.set(bx, by + 0.5, bz);
        group.add(postCap);
      });
    }

    // 橋墩 (深水木柱)
    for (let bz = 11; bz <= 22; bz += 4.5) {
      [-1.4, 1.4].forEach(px => {
        const pier = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 2.4, 8),
          woodMat
        );
        pier.position.set(px, 1.2, bz);
        group.add(pier);
      });
    }

    // G. 日月湖水面細節：湖中遊憩小木舟 (Sun Moon Lake Rowboats)
    const createRowboat = (bx, bz, rotY) => {
      const boat = new THREE.Group();
      // 船身 (兩頭尖微翹小木舟)
      const hullGeom = new THREE.BoxGeometry(1.4, 0.65, 4.2);
      const hull = new THREE.Mesh(hullGeom, woodMat);
      hull.position.y = 0.35;
      boat.add(hull);

      // 船內坐墊板
      [-0.8, 0.8].forEach(sz => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.45), lightWoodMat);
        seat.position.set(0, 0.5, sz);
        boat.add(seat);
      });

      // 雙木槳 (Oars)
      [-0.75, 0.75].forEach((ox, oIdx) => {
        const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.2, 6), lightWoodMat);
        oar.position.set(ox, 0.65, 0);
        oar.rotation.z = (oIdx === 0 ? 0.4 : -0.4);
        oar.rotation.x = 0.2;
        boat.add(oar);
      });

      boat.position.set(bx, 0.6, bz);
      boat.rotation.y = rotY;
      return boat;
    };

    const boat1 = createRowboat(-18, -12, 0.4);
    const boat2 = createRowboat(20, 10, -0.6);
    group.add(boat1, boat2);

    // H. 湖岸石駁坎日式石燈籠 (Stone Lanterns)
    [[-10, 16], [10, 16], [-12, -8], [12, -8]].forEach(([lx, lz]) => {
      const lanternGroup = new THREE.Group();
      // 基座
      const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), stoneLanternMat);
      lBase.position.y = 0.15;
      lanternGroup.add(lBase);
      // 柱身
      const lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.9, 8), stoneLanternMat);
      lStem.position.y = 0.75;
      lanternGroup.add(lStem);
      // 火袋 (發光燈心)
      const lBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.45, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffeaa7, emissive: 0xffc048, emissiveIntensity: 0.6 })
      );
      lBox.position.y = 1.35;
      lanternGroup.add(lBox);
      // 笠頂 (四角石頂簷)
      const lCap = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.35, 4), stoneLanternMat);
      lCap.rotation.y = Math.PI / 4;
      lCap.position.y = 1.75;
      lanternGroup.add(lCap);

      lanternGroup.position.set(lx, 2.5, lz);
      group.add(lanternGroup);
    });

    // I. 日月湖睡蓮群 (Water Lily Pads & Lotuses)
    const lilyMat = new THREE.MeshStandardMaterial({ color: 0x1b4d3e, roughness: 0.4 });
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf368e0, emissive: 0xd980fa, emissiveIntensity: 0.3 });

    [
      [-14, 18], [-18, 14], [-22, 16],
      [16, -18], [20, -14], [24, -16]
    ].forEach(([px, pz]) => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(0.85 + Math.random() * 0.4, 12), lilyMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(px, 1.21, pz);
      group.add(pad);

      // 粉紅荷花花朵
      const flower = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 6), lotusMat);
      flower.position.set(px, 1.35, pz);
      group.add(flower);
    });

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
   * 1917 百年歷史市場、中央兩層六角木造鐘樓、三翼放射狀長廊街廓與傳統小吃攤商
   */
  static buildSecondMarketHexagonalTower() {
    const group = new THREE.Group();
    group.name = 'second_market_hexagonal_tower';

    const brickTex = LandmarkTextureHelper.createRedBrickTexture();
    const clockTex = LandmarkTextureHelper.createClockTexture();
    const roofTileTex = LandmarkTextureHelper.createTealRoofTileTexture();

    const baseMat = new THREE.MeshLambertMaterial({ color: 0x8a9299 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x9e8f81 });
    const brickMat = new THREE.MeshLambertMaterial({ map: brickTex });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.75, metalness: 0.1 });
    const lightWoodMat = new THREE.MeshStandardMaterial({ color: 0x7c5232, roughness: 0.7 });
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x852422, roughness: 0.65 });
    const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x2c3539, roughness: 0.7 });
    const copperMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x111e28, roughness: 0.15, metalness: 0.8, transparent: true, opacity: 0.7 });
    const redLanternMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0x880000, emissiveIntensity: 0.5, roughness: 0.3 });

    // A. 市場中央六角形洗石子厚重基座 (直徑 22m，高 0.5m)
    const baseGeom = new THREE.CylinderGeometry(11.5, 12.0, 0.5, 6);
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = 0.25;
    base.receiveShadow = true;
    group.add(base);

    // B. 一樓六角核心主體 (1917 經典厚牆紅磚造)
    const l1Geom = new THREE.CylinderGeometry(9.6, 9.6, 5.8, 6);
    const level1 = new THREE.Mesh(l1Geom, brickMat);
    level1.position.y = 3.4;
    level1.castShadow = true;
    level1.receiveShadow = true;
    group.add(level1);

    // 一樓核心出入門廊拱圈飾邊 (6 個角柱拱圈)
    for (let r = 0; r < 6; r++) {
      const angle = (r * Math.PI) / 3;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 5.8, 8), baseMat);
      col.position.set(Math.sin(angle) * 9.6, 3.4, Math.cos(angle) * 9.6);
      group.add(col);

      // 磚拱門楣線
      const archKeystone = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.4), baseMat);
      const midAngle = angle + Math.PI / 6;
      archKeystone.position.set(Math.sin(midAngle) * 9.7, 5.6, Math.cos(midAngle) * 9.7);
      archKeystone.rotation.y = midAngle;
      group.add(archKeystone);
    }

    // 一樓與二樓交界之六角挑出腰簷 (遮雨腰瓦簷)
    const eaveGeom = new THREE.CylinderGeometry(11.6, 9.6, 0.75, 6);
    const eave = new THREE.Mesh(eaveGeom, darkTileMat);
    eave.position.y = 6.6;
    group.add(eave);

    // C. 二樓木造六角展望鐘樓 (核心文資焦點)
    const l2Geom = new THREE.CylinderGeometry(7.6, 7.6, 4.6, 6);
    const level2 = new THREE.Mesh(l2Geom, woodMat);
    level2.position.y = 9.25;
    group.add(level2);

    // 二樓木質百葉觀察窗與 1917 羅馬數字時鐘面 (6 面立面各置大鐘與百葉)
    const clockMat = new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.3 });
    const louverMat = new THREE.MeshLambertMaterial({ color: 0x2d1a0e });

    for (let r = 0; r < 6; r++) {
      const angle = (r * Math.PI) / 3 + Math.PI / 6;
      const rad = 7.7;
      const wx = Math.sin(angle) * rad;
      const wz = Math.cos(angle) * rad;

      // 1917 復古六角鐘面 (直徑 1.6m 圓盤)
      const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), clockMat);
      clockFace.position.set(wx, 10.4, wz);
      clockFace.rotation.y = angle;
      group.add(clockFace);

      // 鐘面外鑲黃銅邊框
      const clockBezel = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.06, 8, 24), copperMat);
      clockBezel.position.set(wx, 10.4, wz);
      clockBezel.rotation.y = angle;
      group.add(clockBezel);

      // 鐘面下方木質百葉透氣窗
      const louverBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.15), louverMat);
      louverBox.position.set(wx * 0.98, 8.4, wz * 0.98);
      louverBox.rotation.y = angle;
      group.add(louverBox);
    }

    // D. 頂層六角攢尖雙重頂 (Hexagonal Double-Hip Roof)
    const lowerRoofGeom = new THREE.ConeGeometry(9.8, 3.2, 6);
    const lowerRoof = new THREE.Mesh(lowerRoofGeom, roofTileMat);
    lowerRoof.position.y = 13.1;
    group.add(lowerRoof);

    // 六角歇山採光小閣樓 (Lantern Tower)
    const lanternGeom = new THREE.CylinderGeometry(3.6, 4.0, 1.6, 6);
    const lantern = new THREE.Mesh(lanternGeom, woodMat);
    lantern.position.y = 14.8;
    group.add(lantern);

    // 最頂層六角小尖頂
    const topRoofGeom = new THREE.ConeGeometry(4.4, 2.8, 6);
    const topRoof = new THREE.Mesh(topRoofGeom, roofTileMat);
    topRoof.position.y = 17.0;
    group.add(topRoof);

    // 樓頂純銅避雷針與金屬寶頂 (Spire & Finial)
    const spireGeom = new THREE.CylinderGeometry(0.08, 0.35, 3.2, 8);
    const spire = new THREE.Mesh(spireGeom, copperMat);
    spire.position.y = 19.8;
    group.add(spire);

    const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), copperMat);
    finialBall.position.y = 18.6;
    group.add(finialBall);

    // E. 三翼放射狀傳統市場長廊 (Three Radiating Wings, 完整雙坡長瓦屋頂與攤位街廓)
    // 翼長度 23m，自中心 r=9.5 延伸至 r=32.5，寬 7.2m
    const wingLength = 23;
    const wingWidth = 7.4;
    const wingHeight = 4.4;
    const wingAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

    // 知名老字號攤位清單
    const stallsData = [
      [
        { name: '老賴紅茶', sub: '創立於1980 · 招牌豆香紅茶' },
        { name: '山河魯肉飯', sub: '三代傳承 · 炭火爌肉飯 · 麻薏湯' },
        { name: '阿嬤相思麵店', sub: '正宗傳統白麵 · 自製辣菜' }
      ],
      [
        { name: '顏記肉包', sub: '六十年老店 · 鮮肉包 · 餛飩湯' },
        { name: '丁山肉丸', sub: '百年老店 · 酥皮肉圓 · 紅糟肉' },
        { name: '六角樓咖啡', sub: '精品手沖 · 古蹟烘焙豆' }
      ],
      [
        { name: '嵐肉燥專賣店', sub: '米其林推薦 · 梅花豬肉燥' },
        { name: '茂川肉丸', sub: '米其林必比登 · 古法炊蒸' },
        { name: '天天饅頭', sub: '日式油炸紅豆饅頭 · 銅板點心' }
      ]
    ];

    wingAngles.forEach((ang, wingIdx) => {
      const wingCenterDist = 9.5 + wingLength / 2;
      const wx = Math.sin(ang) * wingCenterDist;
      const wz = Math.cos(ang) * wingCenterDist;

      // 1. 長廊地坪 (磨石子與紅地磚)
      const wFloorGeom = new THREE.BoxGeometry(wingWidth, 0.35, wingLength);
      const wFloor = new THREE.Mesh(wFloorGeom, floorMat);
      wFloor.position.set(wx, 0.18, wz);
      wFloor.rotation.y = ang;
      wFloor.receiveShadow = true;
      group.add(wFloor);

      // 2. 雙側木造支撐承重列柱 (每邊 6 根立柱)
      const postGeom = new THREE.BoxGeometry(0.32, wingHeight, 0.32);
      for (let s = -1; s <= 1; s += 2) {
        for (let step = 0; step < 6; step++) {
          const lz = -wingLength / 2 + 1.8 + step * 3.8;
          const lx = s * (wingWidth / 2 - 0.3);

          const post = new THREE.Mesh(postGeom, woodMat);
          // 局部轉換至長廊旋轉角度
          const px = wx + Math.cos(ang) * lx + Math.sin(ang) * lz;
          const pz = wz - Math.sin(ang) * lx + Math.cos(ang) * lz;
          post.position.set(px, wingHeight / 2 + 0.3, pz);
          post.rotation.y = ang;
          group.add(post);
        }
      }

      // 3. 完整雙坡連續歇山長廊瓦頂 (Continuous Pitched Gable Roof)
      // 三角斷面形狀：底寬 wingWidth + 1.2，高 2.4m
      const roofShape = new THREE.Shape();
      const rw = (wingWidth + 1.4) / 2;
      roofShape.moveTo(-rw, 0);
      roofShape.lineTo(0, 2.4);
      roofShape.lineTo(rw, 0);
      roofShape.closePath();

      const roofGeom = new THREE.ExtrudeGeometry(roofShape, {
        depth: wingLength + 0.8,
        bevelEnabled: false
      });
      roofGeom.translate(0, 0, -(wingLength + 0.8) / 2);

      const pitchedRoof = new THREE.Mesh(roofGeom, roofTileMat);
      pitchedRoof.position.set(wx, wingHeight + 0.3, wz);
      pitchedRoof.rotation.y = ang;
      pitchedRoof.castShadow = true;
      group.add(pitchedRoof);

      // 屋脊正脊金屬裝飾條 (Ridge Board)
      const ridgeBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, wingLength + 1.0),
        darkTileMat
      );
      ridgeBar.position.set(wx, wingHeight + 2.85, wz);
      ridgeBar.rotation.y = ang;
      group.add(ridgeBar);

      // 4. 長廊內部傳統小吃攤位 (Stalls & Stanchions)
      const wingStalls = stallsData[wingIdx] || [];
      wingStalls.forEach((stall, sIdx) => {
        const sideSign = sIdx % 2 === 0 ? 1 : -1;
        const lz = -wingLength / 2 + 4.5 + sIdx * 5.8;
        const lx = sideSign * (wingWidth / 2 - 1.4);

        // 攤位櫃台 (木製小吃料理台)
        const counter = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.9, 1.2),
          lightWoodMat
        );
        const cx = wx + Math.cos(ang) * lx + Math.sin(ang) * lz;
        const cz = wz - Math.sin(ang) * lx + Math.cos(ang) * lz;
        counter.position.set(cx, 0.45 + 0.3, cz);
        counter.rotation.y = ang;
        group.add(counter);

        // 攤位招牌 (百年老字號招牌)
        const signTex = LandmarkTextureHelper.createMarketStallTexture(stall.name, stall.sub);
        const stallSign = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.85, 0.12),
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
        );
        stallSign.position.set(cx, 2.5, cz);
        stallSign.rotation.y = ang + (sideSign === 1 ? -Math.PI / 2 : Math.PI / 2);
        group.add(stallSign);

        // 紅色宮燈 (暖色傳統吊燈)
        const lantern = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 10, 10),
          redLanternMat
        );
        lantern.scale.set(1, 1.25, 1);
        lantern.position.set(cx, 3.2, cz);
        group.add(lantern);
      });

      // 5. 各長廊外側端頭復古山牆入口牌樓 (Gable Entry Portal)
      const endDist = 9.5 + wingLength;
      const ex = Math.sin(ang) * endDist;
      const ez = Math.cos(ang) * endDist;

      const portalFrame = new THREE.Mesh(
        new THREE.BoxGeometry(wingWidth, 1.2, 0.6),
        brickMat
      );
      portalFrame.position.set(ex, wingHeight - 0.4, ez);
      portalFrame.rotation.y = ang;
      group.add(portalFrame);

      const wingTitles = [
        '臺中第二市場 · 三民路正門',
        '臺中第二市場 · 中山路入口',
        '臺中第二市場 · 臺灣大道側門'
      ];
      const portalSignTex = LandmarkTextureHelper.createMarketStallTexture(
        wingTitles[wingIdx],
        '百年風華 · 1917 歷史建築'
      );
      const portalSign = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 1.1),
        new THREE.MeshStandardMaterial({ map: portalSignTex, roughness: 0.4 })
      );
      portalSign.position.set(
        ex + Math.sin(ang) * 0.35,
        wingHeight - 0.4,
        ez + Math.cos(ang) * 0.35
      );
      portalSign.rotation.y = ang;
      group.add(portalSign);
    });

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
