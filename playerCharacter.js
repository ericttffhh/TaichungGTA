import * as THREE from 'three';

/**
 * 臺中狂飆 - 高精細主角人物系統 (PlayerCharacter)
 * 圓潤人體比例建模：膠囊肌肉肢體、關節 (肘/膝可彎曲)、橢球頭型與五官、
 * 層次短髮、防風墨鏡、耳機、美式撞色棒球外套、斜背胸包、工裝褲、高筒球鞋
 * 具備完整徒步探索、奔跑、跳躍與含膝肘彎曲的流暢步態骨骼動畫
 */

const cap = (r, len, mat, sx = 1, sz = 1) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 16), mat);
  m.scale.set(sx, 1, sz);
  return m;
};

const ball = (r, mat, sx = 1, sy = 1, sz = 1, seg = 20) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), mat);
  m.scale.set(sx, sy, sz);
  return m;
};

const place = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };

export class PlayerCharacter {
  constructor(app) {
    this.app = app;
    this.meshGroup = new THREE.Group();
    this.mesh = this.meshGroup; // 相容 mesh 與 meshGroup 存取
    this.meshGroup.name = 'player-character';
    this.parts = {};
    this.position = this.meshGroup.position;
    this.yaw = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.walkPhase = 0;
    this.speed = 0;
    this.isSprint = false;

    this.buildModel();
  }


  buildModel() {
    // 1. 高質感材質庫
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0bf8a, roughness: 0.6, metalness: 0.0 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xb5655a, roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.35, metalness: 0.15 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0e12, roughness: 0.05, metalness: 0.9, clearcoat: 1 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.95 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.9 });
    const jacketBodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2128, roughness: 0.62, metalness: 0.12 });
    const jacketSleeveMat = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.5, metalness: 0.05 });
    const ribTrimMat = new THREE.MeshStandardMaterial({ color: 0xd81f2a, roughness: 0.8 });
    const innerShirtMat = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.8 });
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.7, metalness: 0.2 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.55 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.85 });
    const pantsDarkMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.9 });
    const sneakerWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
    const sneakerRed = new THREE.MeshStandardMaterial({ color: 0xd81f2a, roughness: 0.4 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 });
    const soleDark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.1 });

    // 2. 骨架樞紐節點群組
    const root = new THREE.Group();
    this.parts.root = root;

    // --- 軀幹與潮流夾克 (Torso & Varsity Bomber) ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.96, 0);
    this.parts.torso = torsoGroup;

    // 內層T恤 (領口露出)
    torsoGroup.add(place(cap(0.15, 0.27, innerShirtMat, 1.18, 0.78), 0, 0.25, 0.005));

    // 外層夾克主體 (胸寬腰窄：上胸球體 + 腰部膠囊)
    torsoGroup.add(place(cap(0.155, 0.22, jacketBodyMat, 1.22, 0.82), 0, 0.2, -0.005));
    torsoGroup.add(place(ball(0.2, jacketBodyMat, 1.0, 0.72, 0.68), 0, 0.38, -0.005));

    // 夾克下擺與領口羅紋
    const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.158, 0.17, 0.07, 28), ribTrimMat);
    hem.scale.set(1.18, 1, 0.82);
    hem.position.set(0, -0.04, 0);
    torsoGroup.add(hem);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.024, 10, 24), ribTrimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.54, -0.005);
    torsoGroup.add(collar);

    // 拉鍊與胸前標誌條
    torsoGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.5, 0.01), goldMat), 0, 0.26, 0.135));
    torsoGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.01), ribTrimMat), -0.1, 0.4, 0.135));

    // 斜背戰術胸包
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.66, 0.012), bagMat);
    strap.position.set(0, 0.26, 0.13);
    strap.rotation.z = 0.7;
    torsoGroup.add(strap);
    const strapBack = strap.clone();
    strapBack.position.z = -0.14;
    strapBack.rotation.z = -0.7;
    torsoGroup.add(strapBack);
    const pouch = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 6, 10), bagMat);
    pouch.rotation.z = Math.PI / 2 + 0.2;
    pouch.scale.set(1, 1, 0.9);
    pouch.position.set(0.1, 0.18, 0.15);
    torsoGroup.add(pouch);
    torsoGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.02), goldMat), 0.1, 0.2, 0.185));

    // 頸部
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.14, 16), skinMat);
    neck.position.set(0, 0.56, 0);
    torsoGroup.add(neck);

    // 金屬項鍊
    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.006, 8, 24), goldMat);
    necklace.position.set(0, 0.5, 0.005);
    necklace.rotation.x = Math.PI / 2.4;
    torsoGroup.add(necklace);
    torsoGroup.add(place(ball(0.014, goldMat), 0, 0.46, 0.065));

    root.add(torsoGroup);

    // --- 頭部、髮型、墨鏡與耳機 (Head Group) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.64, 0);
    this.parts.head = headGroup;

    // 顱骨 + 下顎
    headGroup.add(ball(0.1, skinMat, 0.94, 1.15, 1.06, 28));
    headGroup.add(place(ball(0.075, skinMat, 0.95, 0.95, 0.98, 24), 0, -0.065, 0.018));
    // 鼻、耳、唇
    headGroup.add(place(ball(0.017, skinMat, 0.9, 1.3, 1.2), 0, -0.03, 0.108));
    headGroup.add(place(ball(0.024, skinMat, 0.45, 1.2, 0.9), -0.092, -0.01, 0));
    headGroup.add(place(ball(0.024, skinMat, 0.45, 1.2, 0.9), 0.092, -0.01, 0));
    headGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.008, 0.01), lipMat), 0, -0.088, 0.088));
    // 眼睛 (隱約透過墨鏡)
    [-0.036, 0.036].forEach(ex => {
      headGroup.add(place(ball(0.014, eyeWhite, 1.2, 0.8, 0.5), ex, 0.012, 0.094));
      headGroup.add(place(ball(0.007, pupilMat, 1, 1, 0.5), ex, 0.012, 0.099));
    });

    // 層次髮型：頭頂罩殼、後腦、鬢角與瀏海
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.108, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    hairCap.scale.set(0.97, 1.17, 1.1);
    hairCap.rotation.x = -0.28;
    headGroup.add(hairCap);
    headGroup.add(place(ball(0.1, hairMat, 0.93, 0.88, 0.9), 0, -0.012, -0.03));
    [-0.085, 0.085].forEach(sx => {
      headGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.03), hairMat), sx, 0.0, 0.065));
    });
    const quiff = cap(0.04, 0.09, hairMat, 1.9, 1.0);
    quiff.rotation.z = Math.PI / 2;
    quiff.rotation.y = 0.0;
    quiff.rotation.x = 0.0;
    quiff.position.set(0, 0.125, 0.065);
    headGroup.add(quiff);

    // 眉毛
    [-0.038, 0.038].forEach(bx => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.007, 0.012), hairMat);
      brow.position.set(bx, 0.048, 0.1);
      brow.rotation.z = bx > 0 ? -0.1 : 0.1;
      headGroup.add(brow);
    });

    // 墨鏡 (飛行員式鏡框 + 橢圓鏡片)
    [-0.042, 0.042].forEach(lx => {
      const lens = ball(0.034, lensMat, 1.2, 0.95, 0.35, 20);
      lens.position.set(lx, 0.012, 0.107);
      headGroup.add(lens);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.003, 6, 20), frameMat);
      rim.scale.set(1.2, 0.95, 1);
      rim.position.set(lx, 0.012, 0.113);
      headGroup.add(rim);
    });
    headGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.006), frameMat), 0, 0.02, 0.116));
    [-1, 1].forEach(s => {
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frameMat);
      temple.position.set(s * 0.09, 0.016, 0.055);
      temple.rotation.y = s * 0.08;
      headGroup.add(temple);
    });

    // 耳機：頭帶與金屬環耳罩
    const hpBand = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.009, 10, 32, Math.PI), jacketBodyMat);
    hpBand.position.set(0, 0.0, -0.005);
    hpBand.scale.set(1, 1.08, 1.08);
    headGroup.add(hpBand);
    [-1, 1].forEach(s => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 20), jacketBodyMat);
      pad.rotation.z = Math.PI / 2;
      pad.position.set(s * 0.115, -0.012, 0);
      headGroup.add(pad);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.006, 8, 20), goldMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(s * 0.132, -0.012, 0);
      headGroup.add(ring);
    });

    root.add(headGroup);

    // --- 雙臂與雙手 (Dual-Tone Leather Arms & Gloves) ---
    const buildArm = (isLeft) => {
      const armGroup = new THREE.Group();
      const side = isLeft ? -1 : 1;
      armGroup.position.set(side * 0.235, 1.45, 0);

      // 肩頭
      armGroup.add(ball(0.066, jacketSleeveMat, 1, 1, 1));
      // 上臂 (象牙白皮革袖)
      armGroup.add(place(cap(0.052, 0.17, jacketSleeveMat), 0, -0.15, 0));
      // 袖章條紋
      const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.007, 8, 18), ribTrimMat);
      stripe.rotation.x = Math.PI / 2;
      stripe.position.set(0, -0.1, 0);
      armGroup.add(stripe);

      // 肘關節群組 (前臂可彎曲)
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(0, -0.3, 0);
      forearmGroup.add(ball(0.047, jacketSleeveMat));
      forearmGroup.add(place(cap(0.044, 0.15, jacketSleeveMat), 0, -0.13, 0));

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.044, 0.045, 16), ribTrimMat);
      cuff.position.set(0, -0.235, 0);
      forearmGroup.add(cuff);

      // 手部：半指賽車手套 (手掌 + 指節 + 拇指)
      const handGroup = new THREE.Group();
      handGroup.position.set(0, -0.3, 0);
      handGroup.add(place(ball(0.04, gloveMat, 0.95, 1.2, 0.7), 0, 0, 0));
      handGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.05), gloveMat), 0, -0.04, 0.003));
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.026, 4, 6), skinMat);
        finger.position.set(-0.026 + i * 0.0175, -0.075, 0.006);
        handGroup.add(finger);
      }
      const thumb = cap(0.012, 0.03, gloveMat);
      thumb.position.set(side * -0.038, -0.02, 0.015);
      thumb.rotation.z = side * 0.6;
      handGroup.add(thumb);
      forearmGroup.add(handGroup);

      armGroup.add(forearmGroup);
      armGroup.userData.forearm = forearmGroup;
      return armGroup;
    };

    this.parts.leftArm = buildArm(true);
    this.parts.rightArm = buildArm(false);
    this.parts.leftForearm = this.parts.leftArm.userData.forearm;
    this.parts.rightForearm = this.parts.rightArm.userData.forearm;
    this.parts.leftForearm.rotation.x = -0.18;
    this.parts.rightForearm.rotation.x = -0.18;
    root.add(this.parts.leftArm);
    root.add(this.parts.rightArm);

    // --- 骨盆皮帶 (Pelvis & Belt) ---
    const pelvis = cap(0.1, 0.1, pantsMat, 1.0, 0.82);
    pelvis.rotation.z = Math.PI / 2;
    pelvis.scale.set(0.85, 1.35, 0.9);
    pelvis.position.set(0, 0.9, 0);
    root.add(pelvis);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 28), soleDark);
    belt.scale.set(1.15, 1, 0.82);
    belt.position.set(0, 0.97, 0);
    root.add(belt);
    root.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.036, 0.012), goldMat), 0, 0.97, 0.146));

    // --- 雙腿與復古高筒球鞋 (Cargo Pants & AJ-Style Kicks) ---
    const buildLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      const side = isLeft ? -1 : 1;
      legGroup.position.set(side * 0.1, 0.88, 0);

      // 大腿 (工裝褲，上粗下細)
      legGroup.add(place(cap(0.08, 0.26, pantsMat, 1, 1.02), 0, -0.2, 0));

      // 立體工裝口袋
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.1), pantsDarkMat);
      pocket.position.set(side * 0.08, -0.2, 0.0);
      legGroup.add(pocket);
      legGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.02, 0.105), pantsMat), side * 0.08, -0.14, 0));

      // 膝關節群組 (小腿可彎曲)
      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.4, 0);
      kneeGroup.add(ball(0.066, pantsMat));
      kneeGroup.add(place(cap(0.058, 0.23, pantsMat, 1, 1), 0, -0.2, 0));

      // 束口褲腳
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.06, 0.05, 18), pantsDarkMat);
      cuff.position.set(0, -0.34, 0);
      kneeGroup.add(cuff);

      // 復古經典高筒球鞋 (Air Jordan 配色厚底籃球鞋)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.4, 0);

      // 大底 (Sole)
      const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.19, 6, 12), soleMat);
      sole.rotation.x = Math.PI / 2;
      sole.scale.set(1.0, 1.0, 0.42);
      sole.position.set(0, -0.058, 0.05);
      shoeGroup.add(sole);
      const midsole = new THREE.Mesh(new THREE.CapsuleGeometry(0.049, 0.17, 6, 12), soleDark);
      midsole.rotation.x = Math.PI / 2;
      midsole.scale.set(1.0, 1.0, 0.18);
      midsole.position.set(0, -0.08, 0.05);
      shoeGroup.add(midsole);

      // 主鞋身
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 12), sneakerWhite);
      upper.rotation.x = Math.PI / 2;
      upper.scale.set(1.0, 1.0, 0.82);
      upper.position.set(0, -0.015, 0.05);
      shoeGroup.add(upper);

      // 高筒鞋領
      const collarMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.085, 16), sneakerRed);
      collarMesh.position.set(0, 0.01, -0.025);
      shoeGroup.add(collarMesh);
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.015), sneakerWhite);
      tongue.position.set(0, 0.045, 0.025);
      tongue.rotation.x = 0.35;
      shoeGroup.add(tongue);

      // 紅色楦頭與鞋帶
      shoeGroup.add(place(ball(0.05, sneakerRed, 1.0, 0.72, 1.15), 0, -0.035, 0.135));
      for (let i = 0; i < 3; i++) {
        const lace = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.006, 0.01), sneakerWhite);
        lace.position.set(0, 0.012 + i * 0.012, 0.075 - i * 0.012);
        lace.rotation.x = -0.45;
        shoeGroup.add(lace);
      }
      // 側面勾勾標誌
      shoeGroup.add(place(new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.07), sneakerRed), side * 0.05, -0.02, 0.03));

      kneeGroup.add(shoeGroup);
      legGroup.add(kneeGroup);
      legGroup.userData.knee = kneeGroup;
      return legGroup;
    };

    this.parts.leftLeg = buildLeg(true);
    this.parts.rightLeg = buildLeg(false);
    this.parts.leftKnee = this.parts.leftLeg.userData.knee;
    this.parts.rightKnee = this.parts.rightLeg.userData.knee;
    root.add(this.parts.leftLeg);
    root.add(this.parts.rightLeg);

    // 開啟全體陰影
    root.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.meshGroup.add(root);
  }

  // 取得騎乘坐姿專用的精細騎士模型 (替換機車原本粗糙的紅球頭人偶)
  static createDetailedRiderMesh() {
    const rider = new PlayerCharacter({ camera: null });
    const p = rider.parts;
    // 臀部降至座墊高度
    p.root.position.y = -0.4;
    // 騎乘坐姿：大腿向前、小腿垂下
    p.leftLeg.position.x = -0.12;
    p.rightLeg.position.x = 0.12;
    p.leftLeg.rotation.x = -1.3;
    p.rightLeg.rotation.x = -1.3;
    p.leftLeg.rotation.z = -0.1;
    p.rightLeg.rotation.z = 0.1;
    p.leftKnee.rotation.x = 1.15;
    p.rightKnee.rotation.x = 1.15;
    // 雙手握把
    p.leftArm.rotation.x = -1.05;
    p.rightArm.rotation.x = -1.05;
    p.leftArm.rotation.z = 0.12;
    p.rightArm.rotation.z = -0.12;
    p.leftForearm.rotation.x = -0.3;
    p.rightForearm.rotation.x = -0.3;
    p.torso.rotation.x = 0.22;
    p.head.rotation.x = -0.15;
    return rider.meshGroup;
  }

  setPosition(x, y, z, yaw = 0) {
    this.meshGroup.position.set(x, Math.max(0, y), z);
    this.yaw = yaw;
    this.meshGroup.rotation.y = yaw;
    this.vy = 0;
    this.isGrounded = true;
  }

  // 每一幀人物徒步動態與物理更新
  update(inputs, dt) {

    if (!this.meshGroup.visible) return;

    // 1. 根據相機角度精準計算世界移動向量 (Camera-Relative Movement)
    let inputFwd = 0;
    let inputRight = 0;

    if (inputs.forward) inputFwd += 1;
    if (inputs.backward) inputFwd -= 1;
    if (inputs.right) inputRight += 1;
    if (inputs.left) inputRight -= 1;

    const isMoving = Math.hypot(inputFwd, inputRight) > 0.05;
    this.isSprint = !!inputs.boost && isMoving;

    const camera = this.app?.camera;
    if (isMoving && camera) {
      // 取得相機水平投影前進向量
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      // 相機視野向右向量 (forward × Up)
      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();


      // 合成相機相對的世界移動向量
      const moveDir = new THREE.Vector3();
      moveDir.addScaledVector(forward, inputFwd);
      moveDir.addScaledVector(right, inputRight);
      moveDir.normalize();

      // 計算目標面朝角度
      const targetHeading = Math.atan2(moveDir.x, moveDir.z);

      // 平滑旋轉朝向
      let angleDiff = targetHeading - this.yaw;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.yaw += angleDiff * Math.min(1, dt * 16);
      this.meshGroup.rotation.y = this.yaw;

      // 移動位置 (徒步 4.2 m/s ~ 15km/h，衝刺 8.5 m/s ~ 30km/h)
      const moveSpeed = this.isSprint ? 8.5 : 4.2;
      this.meshGroup.position.x += moveDir.x * moveSpeed * dt;
      this.meshGroup.position.z += moveDir.z * moveSpeed * dt;

      this.speed = Math.round(moveSpeed * 3.6); // 轉為 KM/H
    } else {
      this.speed = 0;
    }


    this.meshGroup.rotation.y = this.yaw;

    // 2. 垂直跳躍與重力判定
    if (this.isGrounded) {
      if (inputs.brake) { // 空白鍵或煞車鍵觸發跳躍
        this.vy = 6.6; // 起跳初速
        this.isGrounded = false;
        if (this.app?.audio?.playUIClick) this.app.audio.playUIClick();
      }
    } else {
      this.vy -= 19.0 * dt; // 重力加速度
      this.meshGroup.position.y += this.vy * dt;

      // 地面著陸判定 (台灣大道基準水平高度 Y = 0)
      if (this.meshGroup.position.y <= 0) {
        this.meshGroup.position.y = 0;
        this.vy = 0;
        this.isGrounded = true;
      }
    }

    // 3. 自然流暢人體骨骼步態動畫 (Natural Procedural Gait Animation)
    const { leftLeg, rightLeg, leftArm, rightArm, torso, head, leftKnee, rightKnee, leftForearm, rightForearm } = this.parts;
    const L = THREE.MathUtils.lerp;

    if (!this.isGrounded) {
      // 滯空跳躍姿態 (雙膝微曲，雙臂張開平衡)
      if (leftLeg) leftLeg.rotation.x = L(leftLeg.rotation.x, -0.7, 0.2);
      if (rightLeg) rightLeg.rotation.x = L(rightLeg.rotation.x, 0.1, 0.2);
      if (leftKnee) leftKnee.rotation.x = L(leftKnee.rotation.x, 1.1, 0.2);
      if (rightKnee) rightKnee.rotation.x = L(rightKnee.rotation.x, 0.5, 0.2);
      if (leftArm) leftArm.rotation.x = L(leftArm.rotation.x, -0.45, 0.2);
      if (rightArm) rightArm.rotation.x = L(rightArm.rotation.x, -0.45, 0.2);
      if (leftForearm) leftForearm.rotation.x = L(leftForearm.rotation.x, -0.5, 0.2);
      if (rightForearm) rightForearm.rotation.x = L(rightForearm.rotation.x, -0.5, 0.2);
      if (torso) torso.position.y = 0.98;
    } else if (isMoving) {
      // 步態循環速度
      const cadence = this.isSprint ? 15.0 : 9.5;
      this.walkPhase += dt * cadence;

      // 腿部擺動幅度 (衝刺時步幅加大)
      const legAmplitude = this.isSprint ? 0.78 : 0.52;
      const armAmplitude = this.isSprint ? 0.68 : 0.45;
      const kneeMax = this.isSprint ? 1.25 : 0.7;

      const legSwing = Math.sin(this.walkPhase) * legAmplitude;
      const armSwing = -Math.sin(this.walkPhase) * armAmplitude;

      if (leftLeg) leftLeg.rotation.x = legSwing;
      if (rightLeg) rightLeg.rotation.x = -legSwing;
      if (leftArm) leftArm.rotation.x = armSwing;
      if (rightArm) rightArm.rotation.x = -armSwing;

      // 膝蓋：腿向前擺動時屈膝收腿
      const c = Math.cos(this.walkPhase);
      if (leftKnee) leftKnee.rotation.x = Math.max(0, -c) * kneeMax + 0.06;
      if (rightKnee) rightKnee.rotation.x = Math.max(0, c) * kneeMax + 0.06;

      // 手肘：跑步時手肘屈曲加大
      const elbow = this.isSprint ? -1.15 : -0.4;
      if (leftForearm) leftForearm.rotation.x = L(leftForearm.rotation.x, elbow, 0.2);
      if (rightForearm) rightForearm.rotation.x = L(rightForearm.rotation.x, elbow, 0.2);

      // 跑步時身體自然前傾與彈跳
      if (torso) {
        torso.rotation.x = this.isSprint ? 0.16 : 0.06;
        torso.rotation.y = Math.sin(this.walkPhase) * (this.isSprint ? 0.14 : 0.07);
        torso.position.y = 0.96 + Math.abs(Math.sin(this.walkPhase * 2)) * (this.isSprint ? 0.05 : 0.025);
      }
      if (head) {
        head.rotation.x = this.isSprint ? -0.1 : 0;
        head.rotation.y = -(torso ? torso.rotation.y : 0) * 0.6;
      }
    } else {
      // 待機狀態：平滑歸位與深呼吸待機動畫 (Idle Breathing)
      this.walkPhase = 0;
      const breath = Math.sin(performance.now() * 0.003) * 0.015;

      if (leftLeg) leftLeg.rotation.x = L(leftLeg.rotation.x, 0, 0.15);
      if (rightLeg) rightLeg.rotation.x = L(rightLeg.rotation.x, 0, 0.15);
      if (leftKnee) leftKnee.rotation.x = L(leftKnee.rotation.x, 0, 0.15);
      if (rightKnee) rightKnee.rotation.x = L(rightKnee.rotation.x, 0, 0.15);
      if (leftArm) leftArm.rotation.x = L(leftArm.rotation.x, 0, 0.15);
      if (rightArm) rightArm.rotation.x = L(rightArm.rotation.x, 0, 0.15);
      if (leftForearm) leftForearm.rotation.x = L(leftForearm.rotation.x, -0.18, 0.15);
      if (rightForearm) rightForearm.rotation.x = L(rightForearm.rotation.x, -0.18, 0.15);

      if (torso) {
        torso.rotation.x = L(torso.rotation.x, 0, 0.15);
        torso.rotation.y = L(torso.rotation.y, 0, 0.15);
        torso.position.y = 0.96 + breath;
      }
      if (head) {
        head.rotation.x = L(head.rotation.x, 0, 0.15);
        head.rotation.y = L(head.rotation.y, 0, 0.15);
      }
    }
  }
}
