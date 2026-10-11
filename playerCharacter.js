import * as THREE from 'three';

/**
 * 臺中狂飆 - 高精細主角人物系統 (PlayerCharacter)
 * 潮流街頭風格建模：精細頭部五官、層次短髮、防風墨鏡、金屬耳機、
 * 美式撞色棒球外套 (Varsity Bomber Jacket)、斜背戰術胸包、工裝束口褲、復古高筒球鞋
 * 具備完整徒步探索、奔跑、跳躍與流暢步態骨骼動畫
 */
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
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.55,
      metalness: 0.05
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.4,
      metalness: 0.1
    });
    const glassesMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.95
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85
    });
    const jacketBodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e272e,
      roughness: 0.7,
      metalness: 0.1
    });
    const jacketSleeveMat = new THREE.MeshStandardMaterial({
      color: 0xf5f6fa,
      roughness: 0.45,
      metalness: 0.1
    });
    const ribTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd81f2a,
      roughness: 0.75
    });
    const innerShirtMat = new THREE.MeshStandardMaterial({
      color: 0xd81f2a,
      roughness: 0.6
    });
    const slingBagMat = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      roughness: 0.75,
      metalness: 0.2
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.6
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x2f3640,
      roughness: 0.8
    });
    const sneakerWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3
    });
    const sneakerRed = new THREE.MeshStandardMaterial({
      color: 0xd81f2a,
      roughness: 0.35
    });
    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85
    });

    // 2. 骨架樞紐節點群組
    const root = new THREE.Group();
    this.parts.root = root;

    // --- 軀幹與潮流夾克 (Torso & Varsity Bomber) ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.96, 0);
    this.parts.torso = torsoGroup;

    // 內層短T恤
    const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.21), innerShirtMat);
    innerShirt.position.set(0, 0.22, 0);
    torsoGroup.add(innerShirt);

    // 外層棒球夾克主體 (深夜黑曜色)
    const jacketBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.26), jacketBodyMat);
    jacketBody.position.set(0, 0.24, 0);
    torsoGroup.add(jacketBody);

    // 夾克領口與下擺條紋羅紋
    const waistRib = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.06, 0.25), ribTrimMat);
    waistRib.position.set(0, -0.01, 0);
    torsoGroup.add(waistRib);

    const collarRib = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.2), ribTrimMat);
    collarRib.position.set(0, 0.49, 0);
    torsoGroup.add(collarRib);

    // 潮流斜背胸包 (Tactical Crossbody Pouch)
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.08), slingBagMat);
    pouch.position.set(0.08, 0.22, 0.16);
    pouch.rotation.z = -0.2;
    torsoGroup.add(pouch);

    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.04), slingBagMat);
    strap.position.set(0, 0.24, 0);
    strap.rotation.z = 0.58;
    torsoGroup.add(strap);

    // 頸部
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 12), skinMat);
    neck.position.set(0, 0.54, 0);
    torsoGroup.add(neck);

    // 金屬項鍊裝飾
    const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 16), goldMat);
    necklace.position.set(0, 0.51, 0);
    necklace.rotation.x = Math.PI / 2;
    torsoGroup.add(necklace);

    root.add(torsoGroup);

    // --- 頭部、髮型、墨鏡與耳機 (Head Group) ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.62, 0);
    this.parts.head = headGroup;

    // 頭部肌膚本體
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), skinMat);
    headGroup.add(head);

    // 立體層次髮型 (前額瀏海、兩側側鬢與頭頂髮量)
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), hairMat);
    hairTop.position.set(0, 0.12, -0.01);
    headGroup.add(hairTop);

    const hairBangs = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), hairMat);
    hairBangs.position.set(0, 0.09, 0.1);
    hairBangs.rotation.x = -0.2;
    headGroup.add(hairBangs);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.18, 0.08), hairMat);
    hairBack.position.set(0, -0.02, -0.1);
    headGroup.add(hairBack);

    // 潮流深邃護目墨鏡 (Cyber Aviator Sunglasses)
    const shadesFrame = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.07, 0.08), glassesMat);
    shadesFrame.position.set(0, 0.02, 0.1);
    headGroup.add(shadesFrame);

    // 潮流金屬環耳機 (Headphones around ears)
    const hpBand = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.015, 8, 16, Math.PI), jacketBodyMat);
    hpBand.position.set(0, 0.12, 0);
    hpBand.rotation.z = Math.PI;
    headGroup.add(hpBand);

    [-0.12, 0.12].forEach(hx => {
      const earpad = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), goldMat);
      earpad.position.set(hx, 0, 0);
      earpad.rotation.z = Math.PI / 2;
      headGroup.add(earpad);
    });

    root.add(headGroup);

    // --- 雙臂與雙手 (Dual-Tone Leather Arms & Gloves) ---
    const buildArm = (isLeft) => {
      const armGroup = new THREE.Group();
      const side = isLeft ? -1 : 1;
      armGroup.position.set(side * 0.27, 1.45, 0);

      // 上臂 (象牙白皮革袖)
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), jacketSleeveMat);
      upperArm.position.set(0, -0.14, 0);
      armGroup.add(upperArm);

      // 前臂與袖口
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.11), jacketSleeveMat);
      forearm.position.set(0, -0.38, 0);
      armGroup.add(forearm);

      const armCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.04, 0.115), ribTrimMat);
      armCuff.position.set(0, -0.48, 0);
      armGroup.add(armCuff);

      // 手部配戴半指賽車手套
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.09), gloveMat);
      hand.position.set(0, -0.55, 0);
      armGroup.add(hand);

      return armGroup;
    };

    this.parts.leftArm = buildArm(true);
    this.parts.rightArm = buildArm(false);
    root.add(this.parts.leftArm);
    root.add(this.parts.rightArm);

    // --- 骨盆皮帶 (Pelvis & Belt) ---
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.24), pantsMat);
    pelvis.position.set(0, 0.9, 0);
    root.add(pelvis);

    const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), goldMat);
    beltBuckle.position.set(0, 0.94, 0.12);
    root.add(beltBuckle);

    // --- 雙腿與復古高筒球鞋 (Cargo Pants & AJ-Style Kicks) ---
    const buildLeg = (isLeft) => {
      const legGroup = new THREE.Group();
      const side = isLeft ? -1 : 1;
      legGroup.position.set(side * 0.12, 0.88, 0);

      // 大腿 (工裝束口褲)
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.42, 0.16), pantsMat);
      thigh.position.set(0, -0.18, 0);
      legGroup.add(thigh);

      // 外側立體工裝口袋 (3D Cargo Pocket)
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.11), pantsMat);
      pocket.position.set(side * 0.09, -0.16, 0);
      legGroup.add(pocket);

      // 小腿 (束口褲管)
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.4, 0.14), pantsMat);
      shin.position.set(0, -0.52, 0);
      legGroup.add(shin);

      // 復古經典高筒球鞋 (Air Jordan 配色厚底籃球鞋)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.76, 0);

      // 厚實大底 (Sole)
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.3), soleMat);
      sole.position.set(0, 0.02, 0.04);
      shoeGroup.add(sole);

      // 白色主鞋身
      const shoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.26), sneakerWhite);
      shoeBody.position.set(0, 0.11, 0.03);
      shoeGroup.add(shoeBody);

      // 紅色楦頭與鞋舌 (Red Toe Cap & Collar)
      const shoeToe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.11), sneakerRed);
      shoeToe.position.set(0, 0.07, 0.12);
      shoeGroup.add(shoeToe);

      const shoeCollar = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.07, 0.12), sneakerRed);
      shoeCollar.position.set(0, 0.16, -0.04);
      shoeGroup.add(shoeCollar);

      legGroup.add(shoeGroup);
      return legGroup;
    };

    this.parts.leftLeg = buildLeg(true);
    this.parts.rightLeg = buildLeg(false);
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
    // 設定騎乘坐姿關節角度
    if (rider.parts.leftLeg && rider.parts.rightLeg) {
      rider.parts.leftLeg.position.set(-0.14, 0.76, 0);
      rider.parts.rightLeg.position.set(0.14, 0.76, 0);
      rider.parts.leftLeg.rotation.x = 0.85;
      rider.parts.rightLeg.rotation.x = 0.85;
    }
    if (rider.parts.leftArm && rider.parts.rightArm) {
      rider.parts.leftArm.rotation.x = -0.75;
      rider.parts.leftArm.rotation.z = 0.15;
      rider.parts.rightArm.rotation.x = -0.75;
      rider.parts.rightArm.rotation.z = -0.15;
    }
    if (rider.parts.torso) {
      rider.parts.torso.rotation.x = 0.14;
    }
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

      // 相機視野向右向量 (Up × forward)
      const right = new THREE.Vector3();
      right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();


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
    const { leftLeg, rightLeg, leftArm, rightArm, torso, head } = this.parts;

    if (!this.isGrounded) {
      // 滯空跳躍姿態 (雙膝微曲，雙臂張開平衡)
      if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0.42, 0.2);
      if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0.25, 0.2);
      if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.45, 0.2);
      if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.45, 0.2);
      if (torso) torso.position.y = 0.98;
    } else if (isMoving) {
      // 步態循環速度
      const cadence = this.isSprint ? 15.0 : 9.5;
      this.walkPhase += dt * cadence;

      // 腿部擺動幅度 (衝刺時步幅加大)
      const legAmplitude = this.isSprint ? 0.78 : 0.52;
      const armAmplitude = this.isSprint ? 0.68 : 0.45;

      const legSwing = Math.sin(this.walkPhase) * legAmplitude;
      const armSwing = -Math.sin(this.walkPhase) * armAmplitude;

      if (leftLeg) leftLeg.rotation.x = legSwing;
      if (rightLeg) rightLeg.rotation.x = -legSwing;
      if (leftArm) leftArm.rotation.x = armSwing;
      if (rightArm) rightArm.rotation.x = -armSwing;

      // 跑步時身體自然前傾與彈跳
      if (torso) {
        torso.rotation.x = this.isSprint ? 0.16 : 0.06;
        torso.position.y = 0.96 + Math.abs(Math.sin(this.walkPhase * 2)) * (this.isSprint ? 0.05 : 0.025);
      }
      if (head) {
        head.rotation.x = this.isSprint ? -0.1 : 0;
      }
    } else {
      // 待機狀態：平滑歸位與深呼吸待機動畫 (Idle Breathing)
      this.walkPhase = 0;
      const breath = Math.sin(performance.now() * 0.003) * 0.015;

      if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.15);
      if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.15);
      if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.15);
      if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.15);

      if (torso) {
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.15);
        torso.position.y = 0.96 + breath;
      }
    }
  }
}
