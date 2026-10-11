/**
 * 臺中狂飆 (TAICHUNG RUSH) - 動態區塊串流生成系統 (WorldChunkManager)
 * 核心功能：
 * 1. 200m x 200m 空間網格劃分 (Spatial Grid System) 與 GeoJSON 快速索引桶快取
 * 2. 玩家為中心半徑 2 格 (九宮格/周遭5x5) 動態生成 (ExtrudeGeometry + 4種台灣材質 + 柳川/綠川下陷水網)
 * 3. 超出半徑 3 格自動卸載 (disposeChunk)，釋放 GPU/CPU 記憶體，杜絕 Memory Leak
 * 4. 單一 Chunk 內所有建築合併為 1 個 Draw Call (BufferGeometryUtils.mergeGeometries)
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { geoToMeters, LANDMARK_CONFIGS, GeometryBuilder } from './game.js';
import { TaiwanTextureFactory, TAIWAN_BUILDING_STYLES } from './textures.js';
import { createLayeredBuildingGeometry, getFacadeMaterialSets } from './facadeTextures.js';
import { TaiwanStreetscapeTextures, TaiwanArcadeBuilder } from './taiwanStreetscape.js';

export const CHUNK_SIZE = 200; // 每格寬高 200 公尺

// ============================================================================
// 1. 台灣本土特色程序化材質生成器 (Procedural Taiwan Architectural Textures)
// ============================================================================
export class ChunkTextureGenerator {
  // A. 洗石子 / 抿石子 (台灣老街屋、透天厝最經典外牆)
  static createTerrazzoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 底色：水泥米灰
    ctx.fillStyle = '#b0b3b4';
    ctx.fillRect(0, 0, 512, 512);

    // 抿石子碎石顆粒斑點
    const colors = ['#ffffff', '#2c3e50', '#7f8c8d', '#dcdde1', '#95a5a6'];
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = colors[i % colors.length];
      const sz = Math.random() < 0.8 ? 2 : 3;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, sz, sz);
    }

    // 分隔銅條/水切溝線
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // 台灣公寓經典鋁窗
    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#1a1d20';
    ctx.lineWidth = 3;
    for (let f = 16; f < 512; f += 128) {
      for (let c = 24; c < 512; c += 128) {
        ctx.strokeRect(c, f, 80, 72);
        ctx.fillStyle = (f + c) % 3 === 0 ? '#ffeaa7' : '#222f3e';
        ctx.fillRect(c + 2, f + 2, 76, 68);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // B. 經典紅色小磁磚 (二丁掛紅磚)
  static createRedBrickTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 灰泥水泥縫
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(0, 0, 512, 512);

    // 二丁掛紅磚色差排列
    const brickW = 60;
    const brickH = 26;
    const mortar = 4;
    const redPalette = ['#9e2a2b', '#c0392b', '#b33939', '#8b1e1e', '#a83232'];

    let row = 0;
    for (let y = 0; y < 512; y += (brickH + mortar)) {
      const offsetX = (row % 2) * (brickW / 2);
      for (let x = -brickW; x < 512 + brickW; x += (brickW + mortar)) {
        ctx.fillStyle = redPalette[Math.floor(Math.random() * redPalette.length)];
        ctx.fillRect(x + offsetX, y, brickW, brickH);
      }
      row++;
    }

    // 復古木框/鐵框窗戶
    for (let y = 40; y < 512; y += 140) {
      for (let x = 30; x < 512; x += 130) {
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(x, y, 70, 70);
        ctx.strokeStyle = '#f5f6fa';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 70, 70);
        ctx.fillStyle = Math.random() > 0.4 ? '#fffa65' : '#2f3542';
        ctx.fillRect(x + 4, y + 4, 62, 62);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // C. 復古生鏽鐵花窗與湖水綠白磁磚 (台灣文青復古經典)
  static createIronGrilleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // 湖水綠與淡米白二丁掛磁磚
    ctx.fillStyle = '#a3cb38';
    ctx.fillRect(0, 0, 512, 512);

    for (let y = 0; y < 512; y += 18) {
      ctx.fillStyle = '#6ab04c';
      ctx.fillRect(0, y, 512, 16);
    }
    for (let x = 0; x < 512; x += 36) {
      ctx.fillStyle = '#303952';
      ctx.fillRect(x, 0, 2, 512);
    }

    // 傳統幾何防盜生鏽鐵花窗 (十字與波浪菱形紋)
    ctx.strokeStyle = '#57606f';
    ctx.lineWidth = 3;
    for (let y = 30; y < 512; y += 130) {
      for (let x = 20; x < 512; x += 120) {
        ctx.fillStyle = '#2f3542';
        ctx.fillRect(x, y, 80, 80);

        // 鐵花窗幾何紋理
        ctx.strokeStyle = '#e15f41'; // 鏽紅
        ctx.strokeRect(x + 4, y + 4, 72, 72);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + 76, y + 76);
        ctx.moveTo(x + 76, y + 4);
        ctx.lineTo(x + 4, y + 76);
        ctx.stroke();

        // 菱形內圈
        ctx.strokeRect(x + 22, y + 22, 36, 36);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // D. 現代商辦灰白板岩磁磚
  static createModernSlateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#718093';
    ctx.lineWidth = 1.5;
    for (let y = 0; y < 512; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = 0; x < 512; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // 大片連續商辦玻璃帷幕
    for (let y = 20; y < 512; y += 96) {
      for (let x = 16; x < 512; x += 96) {
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(x, y, 64, 56);
        ctx.fillStyle = Math.random() > 0.5 ? '#70a1ff' : '#2f3542';
        ctx.fillRect(x + 3, y + 3, 58, 50);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // 屋頂水泥防水隔熱層
  static createRoofTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#353b48';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2f3542' : '#474787';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // 柳川 / 綠川清澈水面波紋材質
  static createWaterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0984e3';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 256; y += 16) {
      ctx.beginPath();
      for (let x = 0; x < 256; x += 12) {
        const dy = Math.sin(x * 0.1) * 3;
        if (x === 0) ctx.moveTo(x, y + dy);
        else ctx.lineTo(x, y + dy);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
}

// ============================================================================
// 2. 動態區塊串流管理系統核心 (WorldChunkManager)
// ============================================================================
export class WorldChunkManager {
  /**
   * @param {THREE.Scene} scene Three.js 場景實例
   * @param {CANNON.World} physicsWorld Cannon-es 物理世界實例
   * @param {Object} options 配置參數
   */
  constructor(scene, physicsWorld, options = {}) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;

    this.chunkSize = options.chunkSize || CHUNK_SIZE; // 200m
    this.loadRadius = options.loadRadius !== undefined ? options.loadRadius : 2; // 九宮格至周圍2格 (約500m半徑)
    this.unloadRadius = options.unloadRadius !== undefined ? options.unloadRadius : 3; // 超過3格外自動卸載釋放記憶體

    // 空間索引桶：chunkKey -> { buildings: [], waterways: [] }
    this.chunkBuckets = new Map();

    // 活躍實體化區塊：chunkKey -> { key, buildingMesh, waterMeshes, colliders, numVertices }
    this.activeChunks = new Map();

    // 共享材質池 (常駐記憶體，避免各 Chunk 重複建構 Texture/Shader 造成 Draw Call 膨脹)
    this.initSharedMaterials();

    // 狀態追蹤
    this.lastPlayerChunkKey = null;
    this.lastCheckTime = 0;
    this.checkInterval = 0.5; // 每 0.5 秒檢查一次跨區
    this.waterAnimationTime = 0;
    this.totalGeoFeatures = 0;
  }

  // 初始化並常駐 16 種台灣本土超擬真特色建築外牆材質 + 屋頂 + 柳川/綠川水面材質
  initSharedMaterials() {
    this.roofMat = new THREE.MeshStandardMaterial({
      map: TaiwanTextureFactory.createRoofTexture(),
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // 16 款台灣在地真實商圈與住宅外牆材質
    this.facadeMats = TaiwanTextureFactory.createAllTaiwanFacadeMaterials();

    // 臺灣街景專屬細部材質：
    // Index 1: 騎樓磨石子/紅磚地坪
    this.arcadeFloorMat = new THREE.MeshStandardMaterial({
      map: TaiwanStreetscapeTextures.createArcadeFloorTexture(),
      roughness: 0.7,
      metalness: 0.1
    });

    // Index 2: 騎樓正面承重立柱
    this.arcadePillarMat = new THREE.MeshStandardMaterial({
      color: 0xa4b0be,
      roughness: 0.85,
      metalness: 0.15
    });

    // Index 3: 頂樓白鐵不鏽鋼水塔
    this.tankMat = new THREE.MeshStandardMaterial({
      color: 0xdcdde1,
      roughness: 0.22,
      metalness: 0.88
    });

    // Index 4 ~ 13: 10 款真實臺灣騎樓店面 (7-11, 全家, 50嵐, 美而美, 排骨飯, 機車行, 藥局, 彩券, 五金, 鐵捲門)
    this.storefrontMats = TaiwanStreetscapeTextures.createStorefrontTextures().map(t => new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.45,
      metalness: 0.1
    }));

    // Index 14 ~ 18: 5 款真實臺灣住宅/商辦上層立面 (二丁掛磁磚、洗石子、馬賽克、玻璃窗帶)
    this.upperMats = TaiwanStreetscapeTextures.createUpperFacadeTextures().map(t => new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.75,
      metalness: 0.1
    }));

    // 整合完整多重材質陣列 (按固定索引對應)
    this.buildingMaterialArray = [
      this.roofMat,          // 0: 屋頂水泥
      this.arcadeFloorMat,   // 1: 騎樓地坪
      this.arcadePillarMat,  // 2: 騎樓立柱
      this.tankMat,          // 3: 白鐵水塔
      ...this.storefrontMats,// 4 ~ 13: 10 款店面
      ...this.upperMats,     // 14 ~ 18: 5 款上層
      ...this.facadeMats     // 19 ~ 34: 經典風格
    ];

    // 水面材質 (深藍微透明、下陷 0.5 米、帶光澤微波)
    this.waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x0984e3,
      map: ChunkTextureGenerator.createWaterTexture(),
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  /**
   * 計算 3D 空間座標對應的 Chunk 識別鍵：`${Math.floor(x / 200)}_${Math.floor(z / 200)}`
   */
  getChunkKey(x, z) {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    return `${cx}_${cz}`;
  }

  /**
   * 1. 空間劃分 (Spatial Grid System) 與 Overture Maps 特徵解析：
   * 預先解析 Overture Maps GeoJSON，以台中火車站 (120.685, 24.138) 為原點轉換為公尺，
   * 依照 200m 切割並分配至各 Chunk 索引桶，避免每一幀重複計算
   */
  initOverture(overtureData, osmData = null) {
    if (!overtureData || !overtureData.features) {
      console.warn('[WorldChunkManager] 傳入的 Overture GeoJSON 格式不正確或為空！');
      return;
    }

    console.log('[WorldChunkManager] ⚡ 開始解析 Overture Maps 全臺中建築圖資並建立 200m 空間索引桶...');
    const startTime = performance.now();
    this.chunkBuckets.clear();

    const features = overtureData.features;
    this.totalGeoFeatures = features.length;
    let buildingCount = 0;
    let waterwayCount = 0;

    for (let i = 0; i < features.length; i++) {
      const feat = features[i];
      const geom = feat.geometry;
      if (!geom) continue;
      const props = feat.properties || {};

      // 支援 Polygon 與 MultiPolygon
      const rings = [];
      if (geom.type === 'Polygon' && geom.coordinates) {
        if (geom.coordinates[0]) rings.push(geom.coordinates[0]);
      } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
        geom.coordinates.forEach((p) => {
          if (p && p[0]) rings.push(p[0]);
        });
      }
      if (rings.length === 0) continue;

      for (let r = 0; r < rings.length; r++) {
        const rawRing = rings[r];
        if (!rawRing || rawRing.length < 3) continue;

        // 快速先看第一個點，超出大台中遊玩範圍 (+/- 6500m) 則跳過，確保性能
        const p0 = rawRing[0];
        const m0 = geoToMeters(p0[0], p0[1]);
        if (Math.abs(m0.x) > 6500 || Math.abs(m0.z) > 6500) {
          const nearLm = LANDMARK_CONFIGS.some((lm) => {
            const ddx = m0.x - lm.x;
            const ddz = m0.z - lm.z;
            return ddx * ddx + ddz * ddz < 1500 * 1500;
          });
          if (!nearLm) continue;
        }

        // 轉換環座標為 3D 公尺 (以台中火車站為原點)
        const ringMeters = [];
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        let sumX = 0, sumZ = 0;

        for (let p = 0; p < rawRing.length; p++) {
          const pt = geoToMeters(rawRing[p][0], rawRing[p][1]);
          ringMeters.push(pt);
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.z < minZ) minZ = pt.z;
          if (pt.z > maxZ) maxZ = pt.z;
          sumX += pt.x;
          sumZ += pt.z;
        }

        const cx = sumX / rawRing.length;
        const cz = sumZ / rawRing.length;

        // 排除地標模型專屬範圍 (台中火車站、李方艾美、亞洲大飯店、科博館、國美館、大慶站)
        const inLm = LANDMARK_CONFIGS.some((lm) => {
          const dx = cx - lm.x;
          const dz = cz - lm.z;
          const radius = lm.id === 'taichung_station' ? 36 : (lm.exclusionRadius || 40);
          return dx * dx + dz * dz < radius * radius;
        });
        if (inLm) continue;

        // 高度解析：
        // 1. 優先 height
        // 2. 其次 num_floors * 3.5m
        // 3. 皆無則隨機給予 10 到 18 公尺 (以空間座標偽隨機確保每次加載高度一致)
        let height = 12.0;
        if (props.height != null) {
          const h = parseFloat(props.height);
          if (!isNaN(h) && h > 0) height = h;
        } else if (props.num_floors != null) {
          const fl = parseFloat(props.num_floors);
          if (!isNaN(fl) && fl > 0) height = fl * 3.5;
        } else if (props['building:levels'] != null) {
          const fl = parseFloat(props['building:levels']);
          if (!isNaN(fl) && fl > 0) height = fl * 3.5;
        } else {
          // 空間偽隨機 10 到 18 公尺
          const hashVal = Math.abs(Math.sin(cx * 12.9898 + cz * 78.233));
          height = 10.0 + hashVal * 8.0;
        }
        height = THREE.MathUtils.clamp(height, 4.0, 160.0);

        const chunkKey = this.getChunkKey(cx, cz);
        if (!this.chunkBuckets.has(chunkKey)) {
          this.chunkBuckets.set(chunkKey, { buildings: [], waterways: [] });
        }

        this.chunkBuckets.get(chunkKey).buildings.push({
          ringMeters,
          cx, cz,
          minX, maxX, minZ, maxZ,
          width: Math.max(1.5, maxX - minX),
          depth: Math.max(1.5, maxZ - minZ),
          height,
          styleIdx: 1 + TaiwanTextureFactory.getBuildingStyleIndex(cx, cz)
        });
        buildingCount++;
      }
    }

    // 若有提供 OSM 資料，額外處理水體/河道 (柳川、綠川等)
    if (osmData && osmData.features) {
      for (const feat of osmData.features) {
        const p = feat.properties || {};
        const g = feat.geometry;
        if (!g) continue;
        const isWater = p.waterway || p.natural === 'water' || p.water;
        if (isWater && g.coordinates && g.coordinates.length >= 2) {
          const name = p.name || '臺中河道水體';
          const coords = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates;
          if (!coords || coords.length < 2) continue;

          const ptsMeters = coords.map((c) => geoToMeters(c[0], c[1]));
          const riverWidth = (name.includes('柳川') || name.includes('綠川')) ? 14.0 : 10.0;

          for (let s = 0; s < ptsMeters.length - 1; s++) {
            const p1 = ptsMeters[s];
            const p2 = ptsMeters[s + 1];
            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            const key = this.getChunkKey(midX, midZ);

            if (!this.chunkBuckets.has(key)) {
              this.chunkBuckets.set(key, { buildings: [], waterways: [] });
            }
            this.chunkBuckets.get(key).waterways.push({
              p1, p2,
              width: riverWidth,
              name
            });
            waterwayCount++;
          }
        }
      }
    }

    const elapsed = Math.round(performance.now() - startTime);
    console.log(
      `[WorldChunkManager] ✅ Overture 建築分桶完成！耗時 ${elapsed}ms | 已建立 ${this.chunkBuckets.size} 個 200m 空間索引桶 | 納入 ${buildingCount} 棟 Overture 建築、${waterwayCount} 條河段`
    );
  }

  /**
   * 相容通用 init 呼叫 (自動判斷 Overture 或 OSM)
   */
  init(geojsonData) {
    if (!geojsonData || !geojsonData.features) return;
    const firstProps = geojsonData.features[0]?.properties || {};
    if (firstProps.sources || firstProps.subtype || firstProps.has_parts !== undefined || !firstProps.building) {
      this.initOverture(geojsonData);
    } else {
      this.initOverture(geojsonData);
    }
  }

  /**
   * 2. 動態生成與銷毀機制 (Streaming Loop)：
   * 追蹤玩家/車輛當前座標，載入以車輛為中心、半徑 2 格 (九宮格/周遭25格，約方圓 300~500 公尺) 內的 Chunk。
   * 車身近距離 (約 50 公尺內) 動態掛載 cannon-es 靜態碰撞盒 (Box)。
   * 遠離視野 (超過半徑 3 格) 的 Chunk 徹底銷毀與釋放 GPU 記憶體。
   */
  update(playerPosition, delta = 0.016, vehicleBody = null) {
    if (!playerPosition) return;
    if (vehicleBody) this.vehicleBody = vehicleBody;

    this.waterAnimationTime += delta;
    if (this.waterMaterial.map) {
      this.waterMaterial.map.offset.x = (this.waterAnimationTime * 0.04) % 1;
      this.waterMaterial.map.offset.y = (this.waterAnimationTime * 0.02) % 1;
    }

    const now = performance.now() / 1000;
    const currentChunkKey = this.getChunkKey(playerPosition.x, playerPosition.z);

    // 跨區或週期檢查
    if (currentChunkKey !== this.lastPlayerChunkKey || now - this.lastCheckTime >= this.checkInterval) {
      this.lastCheckTime = now;
      this.lastPlayerChunkKey = currentChunkKey;

      const [pcx, pcz] = currentChunkKey.split('_').map(Number);
      const neededKeys = new Set();

      // A. 載入以車輛為中心、半徑 2 格 (5x5，共 25 格，約方圓 300~500 公尺) 的 Chunk
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
          const key = `${pcx + dx}_${pcz + dz}`;
          neededKeys.add(key);

          if (!this.activeChunks.has(key) && this.chunkBuckets.has(key)) {
            this.generateChunk(key);
          }
        }
      }

      // B. 遠離視野 (超過半徑 3 格) 的 Chunk 自動卸載
      for (const [activeKey] of this.activeChunks) {
        const [cx, cz] = activeKey.split('_').map(Number);
        const dist = Math.max(Math.abs(cx - pcx), Math.abs(cz - pcz));
        if (dist > this.unloadRadius) {
          this.disposeChunk(activeKey);
        }
      }

      this.logStatus();
    }

    // C. 精準快速建築多邊形邊界碰撞 (取代重型 Cannon-es AABB，徹底消除馬路空氣牆與掉幀)
    this.resolveBuildingCollisions(playerPosition, 1.3, this.vehicleBody);
  }

  /**
   * 精準快速建築多邊形邊界碰撞 (取代重型 Cannon-es AABB，徹底消除馬路空氣牆與掉幀)
   */
  resolveBuildingCollisions(carPos, radius = 1.3, carBody = null) {
    if (!carPos) return false;
    const px = carPos.x;
    const pz = carPos.z;

    const cx = Math.floor(px / this.chunkSize);
    const cz = Math.floor(pz / this.chunkSize);
    let hit = false;

    // 僅需遍歷玩家目前區塊與相鄰周遭區塊，毫秒級運算 (60 FPS 順暢)
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const k = `${cx + ox}_${cz + oz}`;
        const bucket = this.chunkBuckets.get(k);
        if (!bucket || !bucket.buildings) continue;

        for (let i = 0; i < bucket.buildings.length; i++) {
          const b = bucket.buildings[i];
          const dx = px - b.cx;
          const dz = pz - b.cz;
          const maxDim = Math.max(b.width, b.depth) / 2 + radius + 1.0;
          if (Math.abs(dx) > maxDim || Math.abs(dz) > maxDim) continue;

          const ring = b.ringMeters;
          if (!ring || ring.length < 3) continue;

          // 2D 射線法判斷是否侵入建築內部
          let inside = false;
          for (let j = 0, kIdx = ring.length - 1; j < ring.length; kIdx = j++) {
            const xi = ring[j].x, zi = ring[j].z;
            const xj = ring[kIdx].x, zj = ring[kIdx].z;
            const intersect = ((zi > pz) !== (zj > pz)) &&
              (px < (xj - xi) * (pz - zi) / (zj - zi + 0.00001) + xi);
            if (intersect) inside = !inside;
          }

          if (inside) {
            // 推出至最近建築邊界外緣，保證車輛不會卡入建築，也絕不在路面上產生任何空氣牆
            let minDist = Infinity;
            let closestEdgeProj = null;
            for (let j = 0; j < ring.length; j++) {
              const p1 = ring[j];
              const p2 = ring[(j + 1) % ring.length];
              const segDx = p2.x - p1.x;
              const segDz = p2.z - p1.z;
              const segLenSq = segDx * segDx + segDz * segDz || 1;
              const t = Math.max(0, Math.min(1, ((px - p1.x) * segDx + (pz - p1.z) * segDz) / segLenSq));
              const projX = p1.x + t * segDx;
              const projZ = p1.z + t * segDz;
              const d = Math.hypot(px - projX, pz - projZ);
              if (d < minDist) {
                minDist = d;
                closestEdgeProj = { projX, projZ };
              }
            }

            if (closestEdgeProj) {
              const normD = minDist > 0.001 ? minDist : 1;
              // 朝邊界外緣方向推開 (從內部 px, pz 望向邊界點 closestEdgeProj 的向量)
              const outDirX = (closestEdgeProj.projX - px) / normD;
              const outDirZ = (closestEdgeProj.projZ - pz) / normD;
              const resolvedX = closestEdgeProj.projX + outDirX * (radius + 0.4);
              const resolvedZ = closestEdgeProj.projZ + outDirZ * (radius + 0.4);

              carPos.x = resolvedX;
              carPos.z = resolvedZ;

              if (carBody && carBody.position) {
                carBody.position.x = resolvedX;
                carBody.position.z = resolvedZ;
                if (carBody.velocity) {
                  carBody.velocity.x *= 0.25;
                  carBody.velocity.z *= 0.25;
                }
              }
              hit = true;
            }
          }
        }
      }
    }
    return hit;
  }

  /**
   * 檢查點是否過於接近或侵入道路與路口淨空帶 (車道半寬 + 人行道 + 緩衝區)
   * 若侵入，回傳推擠修正向量 (dx, dz) 將頂點推移至道路外緣；若安全則回傳 null
   */
  getRoadClearanceCorrection(px, pz) {
    if (!this.roadGrid) return null;

    // 1. 檢查路口淨空 (路口半徑 + 人行道 2.2m + 安全退縮 1.2m)
    if (this.junctionList) {
      for (let j = 0; j < this.junctionList.length; j++) {
        const jn = this.junctionList[j];
        const dist = Math.hypot(px - jn.x, pz - jn.z);
        const reqClear = jn.radius + 3.4;
        if (dist < reqClear) {
          const pen = reqClear - dist;
          if (dist > 0.01) {
            return { x: ((px - jn.x) / dist) * pen, z: ((pz - jn.z) / dist) * pen };
          }
          return { x: pen, z: 0 };
        }
      }
    }

    // 2. 檢查道路車道與人行道淨空 (查詢周圍九宮格路網索引)
    const pcx = Math.floor(px / this.chunkSize);
    const pcz = Math.floor(pz / this.chunkSize);
    let maxPushDist = 0;
    let bestPush = null;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const ck = `${pcx + ox}_${pcz + oz}`;
        const segs = this.roadGrid.get(ck);
        if (!segs || segs.length === 0) continue;

        for (let s = 0; s < segs.length; s++) {
          const seg = segs[s];
          const pts = seg.points;
          const reqClear = seg.width / 2 + 3.4; // 道路半寬 + 2.2m人行道 + 1.2m建築退縮線

          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i], p2 = pts[i + 1];
            const dx = p2.x - p1.x, dz = p2.z - p1.z;
            const lenSq = dx * dx + dz * dz;
            if (lenSq === 0) continue;

            const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (pz - p1.z) * dz) / lenSq));
            const cx = p1.x + t * dx, cz = p1.z + t * dz;
            const dist = Math.hypot(px - cx, pz - cz);

            if (dist < reqClear) {
              const pen = reqClear - dist;
              if (pen > maxPushDist) {
                maxPushDist = pen;
                if (dist > 0.01) {
                  bestPush = { x: ((px - cx) / dist) * pen, z: ((pz - cz) / dist) * pen };
                } else {
                  const normX = -dz / Math.sqrt(lenSq);
                  const normZ = dx / Math.sqrt(lenSq);
                  bestPush = { x: normX * pen, z: normZ * pen };
                }
              }
            }
          }
        }
      }
    }

    return bestPush;
  }

  /**
   * 生成單一 200m 空間區塊：
   * 1. 讀取 Overture 建築多邊形，使用 ExtrudeGeometry 向上拉伸
   * 2. 自動修正側邊 UV 座標 (依高度縮放)，外牆賦予台灣公寓/辦公大樓風格材質
   * 3. 使用 BufferGeometryUtils.mergeGeometries 合併為單一網格加入場景 (1 個 Chunk 只有 1 個 Draw Call)
   */
  generateChunk(chunkKey) {
    const bucket = this.chunkBuckets.get(chunkKey);
    if (!bucket) return;

    const buildingGeometries = [];
    const waterMeshes = [];

    // ------------------------------------------------------------------------
    // A. 處理建築物 (ExtrudeGeometry + 台灣外牆材質 + 高度 UV 自動縮放)
    // ------------------------------------------------------------------------
    if (bucket.buildings && bucket.buildings.length > 0) {
      for (let i = 0; i < bucket.buildings.length; i++) {
        const b = bucket.buildings[i];
        let ring = b.ringMeters;
        if (ring.length < 3) continue;

        // ★ 核心優化：道路防侵入檢查與建築退縮線
        if (this.roadGrid) {
          // 僅當中心真正侵入車道深處 (> 12m) 才略過，杜絕路旁連棟街屋被誤殺
          const centerPush = this.getRoadClearanceCorrection(b.cx, b.cz);
          if (centerPush && Math.hypot(centerPush.x, centerPush.z) > 12.0) {
            continue;
          }

          // 對侵入車道/人行道的頂點向外推離，精準退縮至人行道邊界外
          let modified = false;
          const adjustedRing = [];
          for (let k = 0; k < ring.length; k++) {
            const pt = ring[k];
            const push = this.getRoadClearanceCorrection(pt.x, pt.z);
            if (push) {
              adjustedRing.push({ x: pt.x + push.x, z: pt.z + push.z });
              modified = true;
            } else {
              adjustedRing.push(pt);
            }
          }
          if (modified) {
            ring = adjustedRing;
            b.ringMeters = adjustedRing;
          }
        }

        // 新版分層立面建築 (依高度選用店面/樓層樣式)
        {
          const layered = createLayeredBuildingGeometry(ring, b.height, b.cx, b.cz, this.shopBase, this.upperBase);
          if (layered) {
            buildingGeometries.push(layered);
            continue;
          }
        }

        // 計算有向面積確保順時針/逆時針
        let signedArea = 0;
        const n = ring.length;
        for (let j = 0; j < n; j++) {
          const p1 = ring[j];
          const p2 = ring[(j + 1) % n];
          signedArea += (p1.x - b.cx) * (-(p2.z - b.cz)) - (p2.x - b.cx) * (-(p1.z - b.cz));
        }
        const pts = signedArea < 0 ? [...ring].reverse() : ring;

        const shape = new THREE.Shape();
        shape.moveTo(pts[0].x - b.cx, -(pts[0].z - b.cz));
        for (let j = 1; j < n; j++) {
          shape.lineTo(pts[j].x - b.cx, -(pts[j].z - b.cz));
        }
        shape.closePath();

        const rawGeom = new THREE.ExtrudeGeometry(shape, {
          depth: b.height,
          bevelEnabled: false,
          steps: 1
        });
        const geom = rawGeom.index ? rawGeom.toNonIndexed() : rawGeom;

        // 垂直立挺向上，平移回世界公尺中心
        geom.rotateX(-Math.PI / 2);
        geom.translate(b.cx, 0, b.cz);
        geom.computeVertexNormals();

        // 材質分組：Material 0 為屋頂；Material 14~18 為 5 款真實臺灣住宅/商辦高解析立面 (二丁掛磁磚、洗石子、馬賽克、玻璃窗帶)
        const styleIdx = Math.abs(Math.floor(b.cx * 0.17 + b.cz * 0.31));
        const sideMatIdx = 14 + (styleIdx % 5);
        const pos = geom.attributes.position;
        const norm = geom.attributes.normal;
        const uv = geom.attributes.uv;
        const totalVerts = pos.count;

        geom.clearGroups();
        let currentGroupMat = null;
        let groupStart = 0;

        for (let v = 0; v < totalVerts; v += 3) {
          const ny = (norm.getY(v) + norm.getY(v + 1) + norm.getY(v + 2)) / 3;
          const isRoofCap = Math.abs(ny) > 0.65;
          const assignedMat = isRoofCap ? 0 : sideMatIdx;

          if (assignedMat !== currentGroupMat) {
            if (currentGroupMat !== null) {
              geom.addGroup(groupStart, v - groupStart, currentGroupMat);
            }
            currentGroupMat = assignedMat;
            groupStart = v;
          }
        }
        if (currentGroupMat !== null) {
          geom.addGroup(groupStart, totalVerts - groupStart, currentGroupMat);
        }

        // 側邊 UV 座標校正：每 10 米橫向重複一次，垂直方向每 13.2 米 (4層樓) 一次
        for (let v = 0; v < totalVerts; v++) {
          const ny = norm.getY(v);
          const x = pos.getX(v);
          const y = pos.getY(v);
          const z = pos.getZ(v);

          if (Math.abs(ny) > 0.65) {
            uv.setXY(v, x / 16.0, z / 16.0);
          } else {
            const nx = norm.getX(v);
            const nz = norm.getZ(v);
            const tangentMeters = -x * nz + z * nx;
            const u = tangentMeters / 10.5;
            const vCoord = y / 13.2;
            uv.setXY(v, u, vCoord);
          }
        }
        uv.needsUpdate = true;
        buildingGeometries.push(geom);
      }
    }

    // ★ 街道連棟臺灣騎樓街屋全面密集補強 (徹底消除街景稀疏與空洞問題)
    // 遍歷此 Chunk 內之路段，沿路網以 8.0m 標準面寬連續排布真實 3D 臺灣騎樓 (含內退騎樓步道與柱列)
    if (this.roadGrid) {
      const segs = this.roadGrid.get(chunkKey);
      if (segs && segs.length > 0) {
        const existingBuildings = bucket.buildings || [];
        const placedInfill = [];

        for (let s = 0; s < segs.length; s++) {
          const seg = segs[s];
          if (!seg.points || seg.points.length < 2) continue;
          const pts = seg.points;
          const hw = seg.width / 2;

          for (let p = 0; p < pts.length - 1; p++) {
            const p1 = pts[p], p2 = pts[p + 1];
            const dx = p2.x - p1.x, dz = p2.z - p1.z;
            const len = Math.hypot(dx, dz);
            if (len < 6.5) continue;

            const nx = -dz / len;
            const nz = dx / len;
            const angle = Math.atan2(dx, dz);

            const bayW = 8.0; // 標準臺灣街屋面寬約 8 米
            const numBays = Math.max(1, Math.floor((len - 2.0) / bayW));

            for (let b = 0; b < numBays; b++) {
              const t = (b + 0.5) / numBays;
              const px = p1.x + t * dx;
              const pz = p1.z + t * dz;

              const sides = [
                { sign: 1, faceAngle: angle - Math.PI / 2 },
                { sign: -1, faceAngle: angle + Math.PI / 2 }
              ];

              for (let sd = 0; sd < sides.length; sd++) {
                const { sign, faceAngle } = sides[sd];
                const shW = 7.8;
                const shD = 12.5;
                const offsetDist = hw + 2.0 + shD / 2; // 深度一半 + 人行道 2.0m + 半路寬
                const bx = px + nx * offsetDist * sign;
                const bz = pz + nz * offsetDist * sign;

                // 檢查是否與現有 Overture 建築過近 (< 7.0m)
                let tooClose = false;
                for (let eb = 0; eb < existingBuildings.length; eb++) {
                  const ob = existingBuildings[eb];
                  if ((ob.cx - bx) ** 2 + (ob.cz - bz) ** 2 < 7.0 * 7.0) {
                    tooClose = true;
                    break;
                  }
                }
                if (tooClose) continue;

                // 檢查是否與其他已放置騎樓過近 (< 6.2m)
                for (let pi = 0; pi < placedInfill.length; pi++) {
                  const pp = placedInfill[pi];
                  if ((pp.x - bx) ** 2 + (pp.z - bz) ** 2 < 6.2 * 6.2) {
                    tooClose = true;
                    break;
                  }
                }
                if (tooClose) continue;

                // 檢查路口範圍 (留出路口視野)
                if (this.junctionList) {
                  for (let j = 0; j < this.junctionList.length; j++) {
                    const jn = this.junctionList[j];
                    if ((jn.x - bx) ** 2 + (jn.z - bz) ** 2 < (jn.radius + 3.0) ** 2) {
                      tooClose = true;
                      break;
                    }
                  }
                }
                if (tooClose) continue;

                // 檢查地標排除範圍
                if (LANDMARK_CONFIGS.some(lm => (lm.x - bx) ** 2 + (lm.z - bz) ** 2 < (lm.exclusionRadius || 45) ** 2)) {
                  continue;
                }

                // 檢查車道淨空
                if (this.getRoadClearanceCorrection(bx, bz)) continue;

                // 依位置確定性隨機風格與樓高 (3~6 層樓)
                const sIdx = Math.abs(Math.floor(bx * 0.19 + bz * 0.27)) % 10;
                const shH = 12.0 + (sIdx % 4) * 3.5;

                const arcadeGeom = TaiwanArcadeBuilder.createArcadeShophouseMesh(
                  { x: bx, y: 0, z: bz },
                  faceAngle,
                  shW, shD, shH,
                  sIdx
                );

                if (arcadeGeom) {
                  buildingGeometries.push(arcadeGeom);
                  placedInfill.push({ x: bx, z: bz });
                  existingBuildings.push({ cx: bx, cz: bz, width: shW, depth: shD, ringMeters: [] });
                }
              }
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // B. 處理水體 (柳川、綠川等)
    // ------------------------------------------------------------------------
    if (bucket.waterways && bucket.waterways.length > 0) {
      const waterPositions = [];
      const waterNormals = [];
      const waterUvs = [];
      const waterIndices = [];
      let vertIdx = 0;

      for (let w = 0; w < bucket.waterways.length; w++) {
        const seg = bucket.waterways[w];
        const p1 = seg.p1;
        const p2 = seg.p2;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.1) continue;

        const halfW = seg.width / 2;
        const nx = -dz / len;
        const nz = dx / len;
        const yLevel = -0.5;

        waterPositions.push(p1.x + nx * halfW, yLevel, p1.z + nz * halfW);
        waterNormals.push(0, 1, 0);
        waterUvs.push(0, 0);

        waterPositions.push(p1.x - nx * halfW, yLevel, p1.z - nz * halfW);
        waterNormals.push(0, 1, 0);
        waterUvs.push(1, 0);

        waterPositions.push(p2.x + nx * halfW, yLevel, p2.z + nz * halfW);
        waterNormals.push(0, 1, 0);
        waterUvs.push(0, len / 8.0);

        waterPositions.push(p2.x - nx * halfW, yLevel, p2.z - nz * halfW);
        waterNormals.push(0, 1, 0);
        waterUvs.push(1, len / 8.0);

        waterIndices.push(vertIdx, vertIdx + 1, vertIdx + 2);
        waterIndices.push(vertIdx + 1, vertIdx + 3, vertIdx + 2);
        vertIdx += 4;
      }

      if (waterPositions.length > 0) {
        const waterGeom = new THREE.BufferGeometry();
        waterGeom.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
        waterGeom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
        waterGeom.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
        waterGeom.setIndex(waterIndices);

        const waterMesh = new THREE.Mesh(waterGeom, this.waterMaterial);
        waterMesh.receiveShadow = true;
        this.scene.add(waterMesh);
        waterMeshes.push(waterMesh);
      }
    }

    // ------------------------------------------------------------------------
    // C. BufferGeometryUtils.mergeGeometries 合併單一 Chunk 內所有建築幾何體 (1 Draw Call)
    // ------------------------------------------------------------------------
    let mergedBuildingMesh = null;
    let chunkVertices = 0;

    if (buildingGeometries.length > 0) {
      // 統一屬性：部分幾何 (連棟街屋等) 沒有頂點色，補上白色以便合併
      for (const g of buildingGeometries) {
        if (!g.attributes.color) {
          const cnt = g.attributes.position.count;
          g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(cnt * 3).fill(1), 3));
        }
      }
      const mergeFunc = BufferGeometryUtils.mergeGeometries || BufferGeometryUtils.mergeBufferGeometries;
      const mergedBuildingGeom = mergeFunc.call(BufferGeometryUtils, buildingGeometries, false);

      if (mergedBuildingGeom) {
        // 自行重新映射所有子幾何體之 groups，確保各部件精準對應 this.buildingMaterialArray 索引 (0~18)
        mergedBuildingGeom.clearGroups();
        let groupOffset = 0;
        for (const bg of buildingGeometries) {
          const bgCount = bg.index ? bg.index.count : bg.attributes.position.count;
          if (bg.groups && bg.groups.length > 0) {
            for (const grp of bg.groups) {
              mergedBuildingGeom.addGroup(groupOffset + grp.start, grp.count, grp.materialIndex);
            }
          } else {
            mergedBuildingGeom.addGroup(groupOffset, bgCount, 0);
          }
          groupOffset += bgCount;
        }

        mergedBuildingGeom.computeBoundingSphere();
        mergedBuildingGeom.computeBoundingBox();

        mergedBuildingMesh = new THREE.Mesh(mergedBuildingGeom, this.buildingMaterialArray);
        mergedBuildingMesh.castShadow = false; // 大幅解放 GPU 陰影渲染負載，維持極致 60 FPS
        mergedBuildingMesh.receiveShadow = true;
        this.scene.add(mergedBuildingMesh);
        chunkVertices += mergedBuildingGeom.attributes.position.count;
      }
    }

    waterMeshes.forEach((wm) => {
      chunkVertices += wm.geometry.attributes.position.count;
    });

    // 儲存於已啟用區塊表，並初始化可動態掛載碰撞盒之建築清單
    this.activeChunks.set(chunkKey, {
      key: chunkKey,
      buildingMesh: mergedBuildingMesh,
      waterMeshes,
      buildings: bucket.buildings.map((b) => ({
        cx: b.cx,
        cz: b.cz,
        width: b.width,
        depth: b.depth,
        height: b.height,
        body: null
      })),
      numVertices: chunkVertices,
      numBuildings: bucket.buildings ? bucket.buildings.length : 0
    });
  }

  /**
   * 銷毀卸載單一 Chunk (徹底釋放 GPU 幾何體與物理世界剛體，杜絕記憶體外洩)
   */
  disposeChunk(chunkKey) {
    const chunk = this.activeChunks.get(chunkKey);
    if (!chunk) return;

    // 1. 移除並釋放建築網格
    if (chunk.buildingMesh) {
      this.scene.remove(chunk.buildingMesh);
      if (chunk.buildingMesh.geometry) {
        chunk.buildingMesh.geometry.dispose();
      }
      chunk.buildingMesh = null;
    }

    // 2. 移除並釋放河道水面網格
    if (chunk.waterMeshes && chunk.waterMeshes.length > 0) {
      chunk.waterMeshes.forEach((wm) => {
        this.scene.remove(wm);
        if (wm.geometry) wm.geometry.dispose();
      });
      chunk.waterMeshes = [];
    }

    // 3. 從物理世界徹底移除動態碰撞盒
    if (chunk.buildings && this.physicsWorld) {
      chunk.buildings.forEach((b) => {
        if (b.body) {
          this.physicsWorld.removeBody(b.body);
          b.body = null;
        }
      });
    }

    this.activeChunks.delete(chunkKey);
  }

  /**
   * 取得當前串流狀態統計資訊
   */
  getStats() {
    let totalVerts = 0;
    let totalBuildings = 0;
    for (const [, chunk] of this.activeChunks) {
      totalVerts += chunk.numVertices;
      totalBuildings += chunk.numBuildings;
    }
    return {
      activeChunksCount: this.activeChunks.size,
      totalVertices: totalVerts,
      totalBuildings
    };
  }

  /**
   * 控制台輸出當前載入的 Chunk 數量與網格頂點數
   */
  logStatus() {
    const stats = this.getStats();
    console.log(
      `[WorldChunkManager] ⚡ 當前啟用區塊: ${stats.activeChunksCount} 個 (半徑 2 格) | 3D建築總頂點數: ${stats.totalVertices.toLocaleString()} | 串流建築數: ${stats.totalBuildings} | 記憶體流暢控管 60 FPS`
    );
  }

  /**
   * 取得指定座標與半徑範圍內所有建築物多邊形輪廓 (供雷達小地圖與 Google Maps 向量渲染)
   */
  getBuildingOutlinesInRadius(cx, cz, radius) {
    const outlines = [];
    const minChunkX = Math.floor((cx - radius) / this.chunkSize);
    const maxChunkX = Math.floor((cx + radius) / this.chunkSize);
    const minChunkZ = Math.floor((cz - radius) / this.chunkSize);
    const maxChunkZ = Math.floor((cz + radius) / this.chunkSize);
    const rSq = radius * radius;

    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let z = minChunkZ; z <= maxChunkZ; z++) {
        const key = `${x}_${z}`;
        const bucket = this.chunkBuckets.get(key);
        if (!bucket || !bucket.buildings) continue;

        for (let i = 0; i < bucket.buildings.length; i++) {
          const b = bucket.buildings[i];
          const dx = b.cx - cx;
          const dz = b.cz - cz;
          if (dx * dx + dz * dz <= rSq) {
            outlines.push(b.ringMeters);
          }
        }
      }
    }
    return outlines;
  }

  /**
   * 銷毀整個 Chunk 系統 (換關或退出時)
   */
  disposeAll() {
    for (const [key] of this.activeChunks) {
      this.disposeChunk(key);
    }
    this.activeChunks.clear();
    this.chunkBuckets.clear();
  }
}
