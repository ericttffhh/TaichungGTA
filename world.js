/**
 * 台中市區真實 3D 街景建構器 (WorldBuilder)
 * 完美對標 Taipei-Rush / 台北狂飆 與 Google Maps 台中車站周邊視角 (第五張圖)
 * 包含：明亮金黃夕陽日光、真實台灣大道四線道、道地騎樓走廊與方柱、
 * 懸空 3D 外挑招牌 (建成補習班、香腸、雞排、太陽餅)、Foodpanda 外送車、
 * 路人對話泡泡 (「真的假的？」、「東泉辣醬要加滿！」)、綠川水岸拱橋、金沙大樓與台中車站。
 */

class WorldBuilder {
  constructor(scene, container) {
    this.scene = scene;
    this.container = container;
    this.buildings = [];
    this.pedestrians = [];
    this.camera = null;
  }

  buildAll(camera) {
    this.camera = camera;
    this.createLightingAndSky();
    this.createTaiwanBoulevardMainStreet();
    this.createLuchuanWaterfront();
    this.createTaichungStationDome();
    this.createGoldenPlazaTower();
    this.createDenseArcadeShophouses();
    this.createCurbsideParkedScooters();
    this.create3DPedestrians();
  }

  // 1. 光照與天穹：告別陰暗！提供明亮生動的台灣金黃夕陽日光
  createLightingAndSky() {
    // 360 度暮光天頂
    const skyTex = TextureFactory.createTwilightSky();
    const skyGeo = new THREE.SphereGeometry(850, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(skyDome);

    // 明亮充沛的環境光 (Ambient Light)
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambient);

    // 金黃夕陽方向光 (Directional Sun Light)
    const sun = new THREE.DirectionalLight(0xfff6e5, 2.6);
    sun.position.set(70, 95, 60);
    this.scene.add(sun);

    // 半球天光 (Hemisphere Light)
    const hemi = new THREE.HemisphereLight(0xffb8b8, 0x1f2438, 1.2);
    this.scene.add(hemi);

    // 盆地遠景群山
    const mMat = new THREE.MeshStandardMaterial({ color: 0x161a29, roughness: 0.9 });
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2;
      const mH = 160 + Math.sin(i * 1.5) * 50;
      const mR = 120 + Math.random() * 30;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(mR, mH, 7), mMat);
      mountain.position.set(Math.cos(angle) * 620, mH / 2 - 10, Math.sin(angle) * 620);
      this.scene.add(mountain);
    }
  }

  // 2. 核心主幹道：臺灣大道一段 (雙向四線道 + 斑馬線 + 機車停等區)
  createTaiwanBoulevardMainStreet() {
    // 柏油主路面 (寬 36m, 長 500m)
    const roadTex = TextureFactory.createRoadTexture();
    roadTex.repeat.set(1, 14);
    const roadGeo = new THREE.PlaneGeometry(36, 520);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.42,
      metalness: 0.28
    });
    const mainRoad = new THREE.Mesh(roadGeo, roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.02, 30);
    this.scene.add(mainRoad);

    // 斑馬線與機車停等區 (每隔 80m 一座路口)
    const crosswalkZList = [90, 10, -70];
    crosswalkZList.forEach(cz => {
      // 斑馬線白條紋
      for (let bx = -14; bx <= 14; bx += 2.2) {
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 5.5),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(bx, 0.03, cz);
        this.scene.add(stripe);
      }

      // 台灣特色：斑馬線前【機車停等區】
      const waitBox = this.createScooterWaitingBoxMesh();
      waitBox.position.set(0, 0.04, cz + 6.2);
      this.scene.add(waitBox);
    });

    // 兩側路邊機車停車格 (白色框線)
    [-16.5, 16.5].forEach(px => {
      for (let bz = -120; bz <= 180; bz += 30) {
        const bayLine = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 14),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })
        );
        bayLine.rotation.x = -Math.PI / 2;
        bayLine.position.set(px, 0.03, bz);
        this.scene.add(bayLine);
      }
    });

    // 台灣大道真實路名橫幅牌
    this.createStreetBanner('【 臺灣大道一段 】 往七期/逢甲 ←  → 往台中火車站', 0, 9.5, 30);
  }

  createScooterWaitingBoxMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e272e'; ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('機 車 停 等 區', 128, 48);
    ctx.font = 'bold 44px sans-serif'; ctx.fillText('🛵', 128, 98);
    const tex = new THREE.CanvasTexture(canvas);
    const box = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 }));
    box.rotation.x = -Math.PI / 2;
    return box;
  }

  createStreetBanner(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(30, 55, 153, 0.9)'; ctx.fillRect(0, 0, 512, 64);
    ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 504, 56);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px "Noto Sans TC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, 256, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(18, 2.2), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    banner.position.set(x, y, z);
    this.scene.add(banner);
  }

  // 3. 綠川水岸 (Luchuan Waterfront) 水體、櫻橋拱橋與兩側綠川東/西街
  createLuchuanWaterfront() {
    const cz = -30; // 綠川穿越臺灣大道之處

    // 綠川河道 (下沉水面)
    const waterTex = TextureFactory.createWaterTexture();
    waterTex.repeat.set(12, 1);
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(360, 14),
      new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.15, metalness: 0.85 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.4, cz);
    this.scene.add(water);

    // 櫻橋 (跨越綠川之百年石拱橋，橋面與臺灣大道齊平)
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(36.5, 0.45, 15),
      new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.6 })
    );
    bridge.position.set(0, 0.06, cz);
    this.scene.add(bridge);

    // 櫻橋石砌雕花護欄
    const railMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.5 });
    [-7.2, 7.2].forEach(rz => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(36.5, 1.1, 0.6), railMat);
      rail.position.set(0, 0.6, cz + rz);
      this.scene.add(rail);
    });

    // 水岸兩側景觀植栽
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
    for (let bx = -140; bx <= 140; bx += 18) {
      if (Math.abs(bx) < 22) continue; // 避開馬路
      [-8.5, 8.5].forEach(bz => {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), bushMat);
        bush.position.set(bx, 0.6, cz + bz);
        this.scene.add(bush);
      });
    }
  }

  // 4. 台中車站 (Taichung Station) 白色弧形挑高鋼構穹頂 (道路終點正前方焦點)
  createTaichungStationDome() {
    const station = new THREE.Group();
    station.position.set(0, 0, -145);

    // 白色巨型挑高雙曲面大跨距鋼構穹頂
    const archGeo = new THREE.CylinderGeometry(40, 40, 110, 32, 1, true, 0, Math.PI);
    const archMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.rotation.z = Math.PI / 2;
    arch.position.set(0, 28, 0);
    station.add(arch);

    // 車站大廳基座
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(110, 18, 55),
      new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.4 })
    );
    base.position.set(0, 9, 0);
    station.add(base);

    // 車站正門發光看板
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0984e3'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center'; ctx.fillText('★ 臺 中 車 站 ★', 256, 82);
    const signTex = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(45, 11), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 28, 28.5);
    station.add(sign);

    this.scene.add(station);
    this.buildings.push({ minX: -55, maxX: 55, minZ: -175, maxZ: -115 });
  }

  // 5. 李方艾美金沙大樓 (170m 旋轉飛碟圓頂，位於建國路街角，天際線焦點)
  createGoldenPlazaTower() {
    const tower = new THREE.Group();
    tower.position.set(52, 0, -85);

    // 圓柱形主塔樓 (高 150m)
    const towerGeo = new THREE.CylinderGeometry(18, 20, 150, 24);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7, roughness: 0.25 });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 75;
    tower.add(towerMesh);

    // 經典頂層飛碟型旋轉餐廳 (UFO Rotating Restaurant)
    const saucerGeo = new THREE.CylinderGeometry(26, 21, 10, 24);
    const saucerMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, metalness: 0.9, roughness: 0.1 });
    const saucer = new THREE.Mesh(saucerGeo, saucerMat);
    saucer.position.y = 155;
    tower.add(saucer);

    // 旋轉發光光帶
    const ringGeo = new THREE.TorusGeometry(23.5, 0.8, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const lightRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
    lightRing.position.y = 155;
    tower.add(lightRing);

    // 頂部天線與避雷紅燈
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2, 28, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 }));
    spire.position.y = 174;
    tower.add(spire);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    beacon.position.y = 188;
    tower.add(beacon);

    this.scene.add(tower);
    this.buildings.push({ minX: 30, maxX: 74, minZ: -105, maxZ: -65 });
  }

  // 6. ★★★ 道地台灣真・騎樓街區與 3D 立體外挑懸臂招牌 (對標 Taipei-Rush 截圖！) ★★★
  createDenseArcadeCityBlocks() {
    const arcadeFloorTex = TextureFactory.createArcadeFloorTexture();
    arcadeFloorTex.repeat.set(3, 40);
    const arcadeFloorMat = new THREE.MeshStandardMaterial({ map: arcadeFloorTex, roughness: 0.7, metalness: 0.15 });

    const shutterTex = TextureFactory.createShutterDoorTexture();
    shutterTex.repeat.set(2, 1);
    const shutterMat = new THREE.MeshStandardMaterial({ map: shutterTex, roughness: 0.65, metalness: 0.5 });

    // 兩側長條避雨走廊騎樓
    [-1, 1].forEach(dir => {
      const sidewalkX = dir * 23;  // 騎樓走廊中心
      const curbX = dir * 18.2;    // 騎樓柱外緣
      const wallX = dir * 27.8;    // 店面內牆鐵捲門

      // 1. 騎樓磨石子地磚走道 (高出路面 0.25m)
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(9.2, 0.3, 500),
        arcadeFloorMat
      );
      floor.position.set(sidewalkX, 0.15, 30);
      this.scene.add(floor);

      // 2. 騎樓平頂天花板 (高 4.8m)
      const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(9.2, 0.35, 500),
        new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 })
      );
      ceiling.position.set(sidewalkX, 4.8, 30);
      this.scene.add(ceiling);

      // 3. 騎樓結構方柱 (Pillars) 每隔 12m 一根
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.7 });
      for (let pz = -120; pz <= 180; pz += 12) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.65, 0.85), pillarMat);
        pillar.position.set(curbX, 2.45, pz);
        this.scene.add(pillar);
      }

      // 4. 騎樓底層店家鐵捲門與落地門面 (背牆)
      for (let wz = -120; wz <= 180; wz += 24) {
        const shutter = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.5), shutterMat);
        shutter.position.set(wallX, 2.4, wz);
        shutter.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        this.scene.add(shutter);
      }
    });

    // 招牌清單：完全對標 Taipei-Rush 截圖與台中名產特色
    const protrudingSigns = [
      { name: '建成補習班', sub: '升學權威', bg: '#f1c40f', color: '#111111', h: 8.5, w: 2.4, y: 11 },
      { name: '士林碳烤香腸', sub: '碳烤美味', bg: '#e67e22', color: '#ffffff', h: 7.2, w: 2.2, y: 9 },
      { name: '阿國雞排', sub: '現炸多汁', bg: '#d81f2a', color: '#ffffff', h: 8.0, w: 2.0, y: 10 },
      { name: '春水堂手搖', sub: '珍珠奶茶', bg: '#8e44ad', color: '#ffffff', h: 6.8, w: 2.2, y: 8.5 },
      { name: '鋼琴教學', sub: '招生中', bg: '#6c5ce7', color: '#ffffff', h: 5.5, w: 3.2, y: 14 },
      { name: '自由路太陽餅', sub: '百年老店', bg: '#d35400', color: '#ffffff', h: 7.5, w: 2.4, y: 9.5 },
      { name: '東泉老牌炒麵', sub: '豬血湯', bg: '#c0392b', color: '#ffffff', h: 8.2, w: 2.2, y: 10.5 },
      { name: '宮原眼科冰品', sub: '台中名產', bg: '#2c3e50', color: '#00cec9', h: 7.0, w: 2.4, y: 9.0 }
    ];

    // 兩側懸挑立體街屋與 3D 招牌
    let blockCount = 0;
    for (let z = -120; z <= 180; z += 35) {
      if (Math.abs(z - (-30)) < 20) continue; // 保留綠川交會處

      [-1, 1].forEach(dir => {
        blockCount++;
        const height = 28 + (blockCount % 5) * 8;
        const bWidth = 26;
        const bDepth = 32;
        const bx = dir * (18.2 + bWidth / 2);

        // 多樣性豐富建築貼圖 (復古公寓、特產老街屋、便利商店)
        let bMat;
        if (blockCount % 6 === 1) {
          bMat = new THREE.MeshStandardMaterial({
            map: TextureFactory.createShophouseTexture({ title: '自由路太陽餅百年老店', bg: '#d35400' }),
            roughness: 0.55
          });
        } else if (blockCount % 6 === 3) {
          bMat = new THREE.MeshStandardMaterial({
            map: TextureFactory.createConvenienceStoreTexture('711'),
            roughness: 0.45
          });
        } else if (blockCount % 6 === 5) {
          bMat = new THREE.MeshStandardMaterial({
            map: TextureFactory.createCommercialTowerTexture('blue', { title: '台中商業銀行' }),
            roughness: 0.35, metalness: 0.5
          });
        } else {
          bMat = new THREE.MeshStandardMaterial({
            map: TextureFactory.createRetroApartmentTexture(blockCount % 2 === 0 ? 'beige' : 'terracotta', {
              title: blockCount % 2 === 0 ? '東泉老牌炒麵 · 豬血湯' : '阿國現炸香雞排'
            }),
            roughness: 0.6
          });
        }

        // 建築主體 (懸挑在騎樓之上，外緣切齊騎樓柱 x: ±18.2)
        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bWidth, height, bDepth), bMat);
        bMesh.position.set(bx, 4.8 + height / 2, z);
        this.scene.add(bMesh);

        this.buildings.push({
          minX: Math.min(bx - bWidth / 2, bx + bWidth / 2),
          maxX: Math.max(bx - bWidth / 2, bx + bWidth / 2),
          minZ: z - bDepth / 2,
          maxZ: z + bDepth / 2
        });

        // 頂樓白鐵水塔
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(2.4, 2.4, 4.2, 10),
          new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.95, roughness: 0.1 })
        );
        tank.position.set(bx + (Math.random() - 0.5) * 6, 4.8 + height + 2.1, z);
        this.scene.add(tank);

        // 頂樓鐵皮加蓋屋頂 (經典藍/綠鐵皮)
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(bWidth - 4, 3.5, bDepth - 6),
          new THREE.MeshStandardMaterial({ color: blockCount % 2 === 0 ? 0x27ae60 : 0x2980b9, roughness: 0.8 })
        );
        roof.position.set(bx, 4.8 + height + 1.75, z);
        this.scene.add(roof);

        // ★★★ 核心視覺：3D 立體外挑懸空招牌 (Cantilevered Projecting Signs) ★★★
        // 招牌懸掛在馬路邊緣上方 (x: ±19.8)，搭配金屬橫臂固定在建築牆面！
        const signData = protrudingSigns[blockCount % protrudingSigns.length];
        const sTex = TextureFactory.createProtrudingSignTexture(signData.name, signData.sub, signData.bg, signData.color);

        const sGroup = new THREE.Group();
        const signX = dir * 19.8;
        const signY = signData.y;

        // 雙面發光壓克力立體箱體
        const sBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, signData.h, signData.w),
          new THREE.MeshBasicMaterial({ map: sTex })
        );
        sGroup.add(sBox);

        // 金屬托架橫臂
        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x636e72, metalness: 0.9 });
        [-signData.h * 0.35, signData.h * 0.35].forEach(ay => {
          const arm = new THREE.Mesh(armGeo, armMat);
          arm.rotation.z = Math.PI / 2;
          arm.position.set(dir > 0 ? 2.4 : -2.4, ay, 0);
          sGroup.add(arm);
        });

        sGroup.position.set(signX, signY, z);
        this.scene.add(sGroup);
      });
    }

    // 路燈桿與自發光燈泡
    for (let z = -120; z <= 180; z += 40) {
      [-17.8, 17.8].forEach(x => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 9, 8),
          new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.8 })
        );
        post.position.set(x, 4.5, z);
        this.scene.add(post);

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xfffa65 })
        );
        bulb.position.set(x + (x > 0 ? -1.8 : 1.8), 8.8, z);
        this.scene.add(bulb);
      });
    }
  }

  // 7. 路邊停放機車群與 Foodpanda 胖達粉紅外送車 (對標 Taipei-Rush 截圖)
  createCurbsideParkedScooters() {
    const contactShadowTex = TextureFactory.createContactShadowTexture();

    // 1. 路邊停放機車群 (紅白黑藍多種配色)
    const parkedSpots = [
      { x: 16.5, z: 28, rot: 0.35, col: 0xffffff },
      { x: 16.5, z: 34, rot: 0.28, col: 0x0984e3 },
      { x: 16.5, z: 40, rot: 0.40, col: 0x2d3436 },
      { x: -16.5, z: 22, rot: -0.28, col: 0xd63031 },
      { x: -16.5, z: 28, rot: -0.35, col: 0xffffff },
      { x: -16.5, z: -15, rot: -0.38, col: 0x636e72 },
      { x: 16.5, z: -20, rot: 0.30, col: 0xffffff }
    ];

    parkedSpots.forEach(s => {
      const sc = window.audio ? new VehicleSystem(this.scene).buildDetailedScooter() : new THREE.Group();
      sc.scale.set(0.9, 0.9, 0.9);
      sc.position.set(s.x, 0, s.z);
      sc.rotation.y = s.rot;

      sc.traverse(n => {
        if (n.isMesh && n.material && n.material.color && n.material.color.getHex() === 0x0984e3) {
          n.material = new THREE.MeshStandardMaterial({ color: s.col, roughness: 0.3 });
        }
      });

      const pShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.5),
        new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, opacity: 0.8, depthWrite: false })
      );
      pShadow.rotation.x = -Math.PI / 2;
      pShadow.position.set(0, 0.02, 0);
      sc.add(pShadow);

      this.scene.add(sc);
    });

    // 2. ★★★ Foodpanda 胖達粉紅外送機車 (帶粉紅保溫箱，截圖標誌！) ★★★
    const pandaScooter = new VehicleSystem(this.scene).buildDetailedScooter();
    pandaScooter.position.set(16.5, 0, 10);
    pandaScooter.rotation.y = 0.45;

    const pandaPink = 0xd70f64;
    pandaScooter.traverse(n => {
      if (n.isMesh && n.material && n.material.color && n.material.color.getHex() === 0x0984e3) {
        n.material = new THREE.MeshStandardMaterial({ color: pandaPink, roughness: 0.25 });
      }
    });

    // 後座方形保溫箱 (胖達外送)
    const boxGeo = new THREE.BoxGeometry(0.68, 0.62, 0.62);
    const boxMat = new THREE.MeshStandardMaterial({ color: pandaPink, roughness: 0.4 });
    const deliveryBox = new THREE.Mesh(boxGeo, boxMat);
    deliveryBox.position.set(0, 0.92, -0.65);

    const pandaCanvas = document.createElement('canvas');
    pandaCanvas.width = 128; pandaCanvas.height = 128;
    const pctx = pandaCanvas.getContext('2d');
    pctx.fillStyle = '#d70f64'; pctx.fillRect(0, 0, 128, 128);
    pctx.fillStyle = '#ffffff'; pctx.font = 'bold 36px "Noto Sans TC", sans-serif'; pctx.textAlign = 'center';
    pctx.fillText('胖達', 64, 52);
    pctx.fillText('外送', 64, 96);
    const pandaTex = new THREE.CanvasTexture(pandaCanvas);
    const pandaSign = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), new THREE.MeshBasicMaterial({ map: pandaTex }));
    pandaSign.position.set(0.35, 0, 0);
    pandaSign.rotation.y = Math.PI / 2;
    deliveryBox.add(pandaSign);

    pandaScooter.add(deliveryBox);

    const pShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2.6),
      new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, opacity: 0.85, depthWrite: false })
    );
    pShadow.rotation.x = -Math.PI / 2;
    pShadow.position.set(0, 0.02, 0);
    pandaScooter.add(pShadow);

    this.scene.add(pandaScooter);

    // 3. 中華郵政經典紅綠雙筒郵筒 (Chunghwa Post Red & Green Mailboxes)
    const mailGroup = new THREE.Group();
    mailGroup.position.set(19.2, 0, -12);

    const postBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.08, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 })
    );
    postBase.position.y = 0.04;
    mailGroup.add(postBase);

    [-0.42, 0.42].forEach((mx, idx) => {
      const isGreen = (idx === 0);
      const boxCol = isGreen ? 0x00843d : 0xd32f2f;
      const boxMat = new THREE.MeshStandardMaterial({ color: boxCol, roughness: 0.35, metalness: 0.1 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

      // 鑄鐵支柱腳
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8), darkMat);
      leg.position.set(mx, 0.25, 0);
      mailGroup.add(leg);

      // 郵筒箱體主身
      const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.85, 0.38), boxMat);
      mailbox.position.set(mx, 0.88, 0);
      mailGroup.add(mailbox);

      // 郵筒頂蓋 (微圓角斜頂)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.42), boxMat);
      cap.position.set(mx, 1.34, 0);
      mailGroup.add(cap);

      // 投信口 (橫向狹縫)
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.02), darkMat);
      slot.position.set(mx, 1.15, 0.195);
      mailGroup.add(slot);

      // 中華郵政綠/紅圓形標章與時刻表牌
      const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.065, 12), whiteMat);
      emblem.position.set(mx, 0.98, 0.195);
      mailGroup.add(emblem);

      const tablePlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.01), whiteMat);
      tablePlate.position.set(mx, 0.72, 0.195);
      mailGroup.add(tablePlate);
    });
    this.scene.add(mailGroup);

    // 4. 街頭智慧 GoStation 電池交換站 (Gogoro Battery Swap Station)
    const goStation = new THREE.Group();
    goStation.position.set(-19.2, 0, 8);
    goStation.rotation.y = Math.PI / 2;

    const goBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.8 })
    );
    goBase.position.y = 0.04;
    goStation.add(goBase);

    // 機櫃主體 (霧黑耐候金屬機櫃)
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 1.9, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.4, metalness: 0.6 })
    );
    cabinet.position.y = 1.0;
    goStation.add(cabinet);

    // 頂部發光 Gogoro Logo 與指示燈幕
    const logoBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.22, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x00d2d3, emissive: 0x01a3a4, emissiveIntensity: 0.7 })
    );
    logoBar.position.set(0, 1.78, 0.285);
    goStation.add(logoBar);

    // 中央觸控螢幕
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.38, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0abde3 })
    );
    screen.position.set(0, 1.35, 0.285);
    goStation.add(screen);

    // 8 個微發光綠色電池插槽 (2 排 x 4 格)
    const battMat = new THREE.MeshStandardMaterial({
      color: 0x10ac84,
      emissive: 0x1dd1a1,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const bx = -0.45 + c * 0.3;
        const by = 0.45 + r * 0.35;
        const battSlot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.03), battMat);
        battSlot.position.set(bx, by, 0.285);
        goStation.add(battSlot);

        // 電池黑色提把
        const handle = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.03, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x222f3e })
        );
        handle.position.set(bx, by, 0.305);
        goStation.add(handle);
      }
    }
    this.scene.add(goStation);

    // 5. 街角飲料自動販賣機 (Japanese/Taiwanese Beverage Vending Machine)
    const vendGroup = new THREE.Group();
    vendGroup.position.set(-19.2, 0, 48);
    vendGroup.rotation.y = Math.PI / 2;

    const vendBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.95, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.35, metalness: 0.3 })
    );
    vendBody.position.y = 1.0;
    vendGroup.add(vendBody);

    // 上層發光飲料展示窗
    const dispWindow = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.85, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c2, emissiveIntensity: 0.5, roughness: 0.1 })
    );
    dispWindow.position.set(0, 1.35, 0.41);
    vendGroup.add(dispWindow);

    // 下層取物口
    const outlet = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.32, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.8 })
    );
    outlet.position.set(0, 0.35, 0.41);
    vendGroup.add(outlet);

    this.scene.add(vendGroup);
  }

  // 8. ★★★ 3D 街頭路人與即時螢幕對話泡泡 (Taipei-Rush 經典「真的假的？」泡泡) ★★★
  create3DPedestrians() {
    const list = [
      { x: 17.2, z: 14, text: '真的假的？', col: 0x1e372e },
      { x: -17.2, z: 32, text: '東泉辣醬要加滿！', col: 0xd63031 },
      { x: 17.2, z: -25, text: '等下去買太陽餅！', col: 0x0984e3 },
      { x: -17.2, z: -10, text: '台中捷運綠線超穩！', col: 0x8e44ad }
    ];

    list.forEach(p => {
      const g = new THREE.Group();
      g.position.set(p.x, 0, p.z);

      // 頭部
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf5cd79, roughness: 0.6 }));
      head.position.y = 1.55;
      g.add(head);

      // 夾克上衣
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), new THREE.MeshStandardMaterial({ color: p.col, roughness: 0.5 }));
      body.position.y = 1.1;
      g.add(body);

      // 褲子
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.72, 0.24), new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.7 }));
      legs.position.y = 0.36;
      g.add(legs);

      // 雙腳鞋子
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      [-0.12, 0.12].forEach(sx => {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.28), shoeMat);
        shoe.position.set(sx, 0.05, 0.04);
        g.add(shoe);
      });

      // 腳底接觸陰影
      const pShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.8),
        new THREE.MeshBasicMaterial({
          map: TextureFactory.createContactShadowTexture(),
          transparent: true,
          opacity: 0.8,
          depthWrite: false
        })
      );
      pShadow.rotation.x = -Math.PI / 2;
      pShadow.position.y = 0.02;
      g.add(pShadow);

      this.scene.add(g);

      // DOM 對話泡泡 (Taipei-Rush 經典元素)
      const bubble = document.createElement('div');
      bubble.className = 'speech-bubble-3d';
      bubble.innerText = p.text;
      this.container.appendChild(bubble);

      this.pedestrians.push({ mesh: g, bubbleEl: bubble, height: 1.75 });
    });
  }

  // 每一幀將 3D 路人投影至 2D 螢幕對話框
  updatePedestrians() {
    if (!this.camera || !this.pedestrians.length) return;
    const v = new THREE.Vector3();

    this.pedestrians.forEach(ped => {
      v.set(ped.mesh.position.x, ped.mesh.position.y + ped.height + 0.35, ped.mesh.position.z);
      const dist = this.camera.position.distanceTo(v);
      v.project(this.camera);

      if (v.z < 1.0 && dist < 65) {
        const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        ped.bubbleEl.style.left = `${sx}px`;
        ped.bubbleEl.style.top = `${sy}px`;
        ped.bubbleEl.style.display = 'block';
        const sc = Math.max(0.75, Math.min(1.15, 28 / dist));
        ped.bubbleEl.style.transform = `translate(-50%, -100%) scale(${sc})`;
      } else {
        ped.bubbleEl.style.display = 'none';
      }
    });
  }
}

window.WorldBuilder = WorldBuilder;
