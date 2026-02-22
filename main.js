import * as THREE from 'three';

// --- CONFIGURATION ---
const CONFIG = {
    PLAYER_SPEED: 0.15,
    ENEMY_SPEED: 0.06,
    ROTATION_SPEED: 0.05,
    ATTACK_RANGE: 3.5, // Aumentato raggio attacco
    PLAYER_ATTACK_DAMAGE: 20,
    MAX_PLAYER_HEALTH: 100,
    MAX_ENEMY_HEALTH: 100,
    LOCK_ON_DISTANCE: 25, // Aumentato raggio lock-on per mappa più grande
    DETECTION_RANGE: 20, // Aumentato raggio detection
    ENEMY_ATTACK_COOLDOWN: 2000,
    KNOCKBACK_FORCE: 1.5,
    MAP_SIZE: 250, // Ingrandita 5 volte
    MAX_ENEMIES: 10, // Più nemici per la mappa grande
    BOSS_HEALTH: 300,
    KILLS_FOR_BOSS: 5,
    ARROW_SPEED: 0.8,
    SWORD_DAMAGE: 25,
    ARROW_DAMAGE: 35
};

const WEAPONS = {
    SWORD: 'Sword',
    BOW: 'Bow'
};

// --- UTILS ---
function lerp(a, b, t) {
    return a + (b - a) * t;
}

const ENEMY_TYPES = {
    STALKER: {
        name: "Blocky Stalker",
        hp: 60,
        speed: 0.1,
        damage: 10,
        color: 0xff5252,
        scale: 0.8,
        eyes: 1
    },
    BRUISER: {
        name: "Stone Crusher",
        hp: 150,
        speed: 0.04,
        damage: 25,
        color: 0x4a4a4a,
        scale: 1.4,
        eyes: 2
    },
    MAGE: {
        name: "Void Spinner",
        hp: 80,
        speed: 0.07,
        damage: 15,
        color: 0x8e2de2,
        scale: 1.0,
        eyes: 3
    }
};

class Game {
    constructor() {
        console.log("Inizializzazione gioco...");
        try {
            this.initScene();
            this.initLights();
            this.initWorld();
            this.initPlayer();
            this.initEnemies();
            this.initControls();
            this.initUI();

            this.resetGameState();

            console.log("Inizializzazione completata. Avvio loop...");
            this.animate();
        } catch (e) {
            console.log("ERRORE FATALE: " + e.message);
            console.error(e);
        }
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xaedefc); // Pastel blue
        this.scene.fog = new THREE.Fog(0xaedefc, 20, 100);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }

    initWorld() {
        // Floor - Toon Greenery
        const floorGeometry = new THREE.PlaneGeometry(CONFIG.MAP_SIZE + 50, CONFIG.MAP_SIZE + 50);
        const floorMaterial = new THREE.MeshToonMaterial({
            color: 0x7cfc00, // Grass green
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid helper removed for a cleaner toon look
        // const grid = new THREE.GridHelper(100, 50, 0x000000, 0x000000);

        // Random Obstacles
        this.obstacles = [];
        for (let i = 0; i < 150; i++) { // Più ostacoli
            this.createObstacle();
        }

        // Add Clouds
        for (let i = 0; i < 40; i++) { // Più nuvole
            this.createCloud();
        }

        // Add Instanced Grass
        this.initGrass();

        // Add Chests
        this.chests = [];
        for (let i = 0; i < 20; i++) {
            this.createChest();
        }
    }

    initGrass() {
        const grassCount = 15000; // Più erba per mappa gigante
        const grassGeom = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const grassMat = new THREE.MeshToonMaterial({ color: 0x44aa44 });

        this.grassMesh = new THREE.InstancedMesh(grassGeom, grassMat, grassCount);
        const dummy = new THREE.Object3D();
        const limit = CONFIG.MAP_SIZE / 2 - 1;

        for (let i = 0; i < grassCount; i++) {
            dummy.position.set(
                (Math.random() - 0.5) * CONFIG.MAP_SIZE,
                0.2, // Half height of grass
                (Math.random() - 0.5) * CONFIG.MAP_SIZE
            );
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.setScalar(0.5 + Math.random() * 1.5);
            dummy.updateMatrix();
            this.grassMesh.setMatrixAt(i, dummy.matrix);
        }

        this.grassMesh.receiveShadow = true;
        this.scene.add(this.grassMesh);
    }

    createCloud() {
        const group = new THREE.Group();
        const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff });

        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const size = 1 + Math.random() * 2;
            const geom = new THREE.BoxGeometry(size * 1.5, size, size);
            const mesh = new THREE.Mesh(geom, cloudMat);
            mesh.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 2
            );
            group.add(mesh);
        }

        group.position.set(
            (Math.random() - 0.5) * 150,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 150
        );
        this.scene.add(group);

        // Store for subtle movement if needed
        if (!this.clouds) this.clouds = [];
        this.clouds.push(group);
    }

    createObstacle() {
        const px = (Math.random() - 0.5) * (CONFIG.MAP_SIZE * 0.9);
        const pz = (Math.random() - 0.5) * (CONFIG.MAP_SIZE * 0.9);

        // Skip area near center
        if (Math.abs(px) < 5 && Math.abs(pz) < 5) return;

        const type = Math.random() > 0.4 ? 'tree' : 'rock';
        let obstacleMesh;

        if (type === 'tree') {
            const group = new THREE.Group();
            group.userData = { radius: 0.8, type: 'tree' };

            // Trunk
            const trunkGeom = new THREE.BoxGeometry(0.5, 2, 0.5);
            const trunkMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = 1;
            trunk.castShadow = true;
            group.add(trunk);

            // Leaves
            const leafGeom = new THREE.BoxGeometry(2, 2, 2);
            const leafMat = new THREE.MeshToonMaterial({ color: 0x228b22 });
            const leaves = new THREE.Mesh(leafGeom, leafMat);
            leaves.position.y = 2.5;
            leaves.castShadow = true;
            group.add(leaves);

            group.position.set(px, 0, pz);
            this.scene.add(group);
            obstacleMesh = group;
        } else {
            const radius = Math.random() * 1 + 0.5;
            const rockGeom = new THREE.DodecahedronGeometry(radius, 0);
            const rockMat = new THREE.MeshToonMaterial({ color: 0xa9a9a9 });
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.set(px, 0.5, pz);
            rock.castShadow = true;
            rock.receiveShadow = true;
            rock.userData = { radius: radius * 0.9, type: 'rock' };
            this.scene.add(rock);
            obstacleMesh = rock;
        }
        this.obstacles.push(obstacleMesh);
    }

    initPlayer() {
        this.player = {
            mesh: new THREE.Group(),
            health: CONFIG.MAX_PLAYER_HEALTH,
            isAttacking: false,
            attackTimer: 0,
            direction: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lockedTarget: null,
            walkTimer: 0,
            arrowShot: false // Track release
        };

        const toonMat = new THREE.MeshToonMaterial({ color: 0x4fc3f7 }); // Shirt/Tunic
        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac }); // Skin
        const pantsMat = new THREE.MeshToonMaterial({ color: 0x5d4037 }); // Brown pants

        // TORSO
        const torsoGeom = new THREE.BoxGeometry(0.6, 0.7, 0.4);
        const torso = new THREE.Mesh(torsoGeom, toonMat);
        torso.position.y = 0.95;
        torso.castShadow = true;
        this.player.mesh.add(torso);

        // HEAD
        const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const head = new THREE.Mesh(headGeom, skinMat);
        head.position.y = 1.5;
        head.castShadow = true;
        this.player.mesh.add(head);

        // LEGS
        const legGeom = new THREE.BoxGeometry(0.25, 0.6, 0.25);
        this.leftLeg = new THREE.Mesh(legGeom, pantsMat);
        this.leftLeg.position.set(-0.15, 0.3, 0);
        this.leftLeg.castShadow = true;
        this.player.mesh.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeom, pantsMat);
        this.rightLeg.position.set(0.15, 0.3, 0);
        this.rightLeg.castShadow = true;
        this.player.mesh.add(this.rightLeg);

        // ARMS
        const armGeom = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        this.leftArm = new THREE.Mesh(armGeom, skinMat);
        this.leftArm.position.set(-0.4, 1.0, 0);
        this.leftArm.castShadow = true;
        this.player.mesh.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeom, skinMat);
        this.rightArm.position.set(0.4, 1.0, 0);
        this.rightArm.castShadow = true;
        this.player.mesh.add(this.rightArm);

        // Weapon Pivots - HERO SWORD
        this.swordPivot = new THREE.Group();
        this.rightArm.add(this.swordPivot);
        this.swordPivot.position.set(0, -0.4, 0.1);
        this.swordPivot.rotation.x = 0; // Point UP initially (aligned with arm)

        // 1. Handle (Elsa)
        const handleGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6);
        const handleMat = new THREE.MeshToonMaterial({ color: 0x5d4037 });
        const handle = new THREE.Mesh(handleGeom, handleMat);
        this.swordPivot.add(handle);

        // 2. Guard
        const guardGeom = new THREE.BoxGeometry(0.35, 0.06, 0.12);
        const guardMat = new THREE.MeshToonMaterial({ color: 0xffd700 });
        const guard = new THREE.Mesh(guardGeom, guardMat);
        guard.position.y = 0.15;
        this.swordPivot.add(guard);

        // 3. Blade (Lama)
        const bladeGeom = new THREE.BoxGeometry(0.18, 0.8, 0.04);
        const bladeMat = new THREE.MeshToonMaterial({
            color: 0xffffff,
            emissive: 0x4fc3f7,
            emissiveIntensity: 0.1
        });
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.y = 0.6;
        this.swordPivot.add(blade);

        // 4. Tip (Punta)
        const tipGeom = new THREE.ConeGeometry(0.128, 0.2, 4);
        const tip = new THREE.Mesh(tipGeom, bladeMat);
        tip.position.y = 1.1;
        tip.rotation.y = Math.PI / 4;
        this.swordPivot.add(tip);

        // --- BOW MODEL WITH STRING ---
        this.bowModel = new THREE.Group();
        const bowGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 12, Math.PI);
        const bowMat = new THREE.MeshToonMaterial({ color: 0x8b4513 });
        const bowMesh = new THREE.Mesh(bowGeom, bowMat);
        bowMesh.rotation.z = Math.PI / 2;
        this.bowModel.add(bowMesh);

        // Bow String
        const stringGeom = new THREE.BoxGeometry(0.01, 1.0, 0.01);
        const stringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.bowString = new THREE.Mesh(stringGeom, stringMat);
        this.bowString.position.z = -0.05;
        this.bowModel.add(this.bowString);

        this.bowModel.visible = false;
        this.leftArm.add(this.bowModel);
        this.bowModel.position.set(0, -0.3, 0.2);

        this.scene.add(this.player.mesh);
        this.player.mesh.position.set(0, 0, 5);

        // Camera Offset Setup
        this.cameraPivot = new THREE.Object3D();
        this.scene.add(this.cameraPivot);
    }

    createChest() {
        const px = (Math.random() - 0.5) * (CONFIG.MAP_SIZE * 0.8);
        const pz = (Math.random() - 0.5) * (CONFIG.MAP_SIZE * 0.8);

        const isBow = Math.random() > 0.4; // 60% chance for Bow to help user find it
        const content = isBow ? WEAPONS.BOW : WEAPONS.SWORD;

        const geom = new THREE.BoxGeometry(1.2, 1, 0.8);
        // Blu Elettrico per Arco, Arancione per Spada
        const mat = new THREE.MeshToonMaterial({ color: isBow ? 0x00ffff : 0xffa502 });
        const chest = new THREE.Mesh(geom, mat);
        chest.position.set(px, 0.5, pz);
        chest.castShadow = true;

        // Lock Icon/Symbol
        const lockGeom = new THREE.BoxGeometry(0.2, 0.2, 0.1);
        const lockMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const lock = new THREE.Mesh(lockGeom, lockMat);
        lock.position.set(0, 0, 0.41);
        chest.add(lock);

        chest.userData = {
            radius: 1.2,
            type: 'chest',
            content: content,
            ammo: isBow ? 15 + Math.floor(Math.random() * 10) : 0
        };

        this.scene.add(chest);
        this.chests.push(chest);
    }

    initEnemies() {
        this.enemies = [];
        for (let i = 0; i < CONFIG.MAX_ENEMIES; i++) {
            this.spawnRandomEnemy();
        }
    }

    createEnemy(x, y, z, isBoss = false, typeData = null) {
        const type = isBoss ? { name: "Ancient Ruler", hp: CONFIG.BOSS_HEALTH, speed: 0.05, damage: 35, color: 0x000000, scale: 2.5, eyes: 4 } : typeData;
        const enemy = {
            mesh: new THREE.Group(),
            health: type.hp,
            maxHealth: type.hp,
            name: type.name,
            speed: type.speed,
            damage: type.damage,
            isDead: false,
            isBoss: isBoss,
            state: 'IDLE',
            attackTimer: 0,
            knockbackVel: new THREE.Vector3(),
            showHealthBarTimer: 0
        };

        const sizeScale = type.scale;
        const geom = new THREE.CylinderGeometry(0.5 * sizeScale, 0.5 * sizeScale, 1.8 * sizeScale, 8);
        const mat = new THREE.MeshToonMaterial({ color: type.color });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.y = 0.9 * sizeScale;
        mesh.castShadow = true;
        enemy.mesh.add(mesh);

        // Eyes
        for (let i = 0; i < type.eyes; i++) {
            const eyeGeom = new THREE.BoxGeometry(0.6 * sizeScale, 0.15, 0.15);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(0, (1.2 + i * 0.25) * sizeScale, 0.4 * sizeScale);
            enemy.mesh.add(eye);
        }

        // 3D Floating Health Bar
        const barGroup = new THREE.Group();
        const barBgGeom = new THREE.PlaneGeometry(1.2, 0.15);
        const barBgMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
        const barBg = new THREE.Mesh(barBgGeom, barBgMat);

        const barFillGeom = new THREE.PlaneGeometry(1.2, 0.15);
        const barFillMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const barFill = new THREE.Mesh(barFillGeom, barFillMat);
        barFill.position.z = 0.01;

        barGroup.add(barBg);
        barGroup.add(barFill);
        barGroup.position.set(0, 2.2 * sizeScale, 0);
        barGroup.visible = false;
        enemy.mesh.add(barGroup);
        enemy.healthBar = barFill;
        enemy.healthBarContainer = barGroup;

        enemy.mesh.position.set(x, 0, z);
        this.scene.add(enemy.mesh);
        this.enemies.push(enemy);
    }

    checkCollisions() {
        const playerRadius = 0.6;
        const enemyRadius = 0.6;

        this.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            // Player vs Enemy collision
            const dist = this.player.mesh.position.distanceTo(enemy.mesh.position);
            const minDist = playerRadius + enemyRadius;

            if (dist < minDist) {
                // Resolution: Push apart (Only on XZ plane)
                const pushDir = new THREE.Vector3().subVectors(this.player.mesh.position, enemy.mesh.position);
                pushDir.y = 0; // Prevent sinking/flying
                pushDir.normalize();

                const overlap = minDist - dist;

                // Move player back a bit, enemy back a bit
                this.player.mesh.position.addScaledVector(pushDir, overlap * 0.5);
                enemy.mesh.position.addScaledVector(pushDir, -overlap * 0.5);
            }

            // Enemy vs Enemy collision
            this.enemies.forEach(other => {
                if (enemy === other || other.isDead) return;
                const eDist = enemy.mesh.position.distanceTo(other.mesh.position);
                const eMinDist = enemyRadius * 2;
                if (eDist < eMinDist) {
                    const ePushDir = new THREE.Vector3().subVectors(enemy.mesh.position, other.mesh.position).normalize();
                    const eOverlap = eMinDist - eDist;
                    enemy.mesh.position.addScaledVector(ePushDir, eOverlap * 0.5);
                    other.mesh.position.addScaledVector(ePushDir, -eOverlap * 0.5);
                }
            });
        });

        this.obstacles.forEach(obs => {
            // Player vs Obstacle
            const playerPosXZ = new THREE.Vector3(this.player.mesh.position.x, 0, this.player.mesh.position.z);
            const obsPosXZ = new THREE.Vector3(obs.position.x, 0, obs.position.z);
            const pDist = playerPosXZ.distanceTo(obsPosXZ);
            const pMinDist = playerRadius + obs.userData.radius;

            if (pDist < pMinDist) {
                const pushDir = new THREE.Vector3().subVectors(playerPosXZ, obsPosXZ).normalize();
                const overlap = pMinDist - pDist;
                this.player.mesh.position.x += pushDir.x * overlap;
                this.player.mesh.position.z += pushDir.z * overlap;
            }

            // Enemy vs Obstacle
            this.enemies.forEach(enemy => {
                if (enemy.isDead) return;
                const enemyPosXZ = new THREE.Vector3(enemy.mesh.position.x, 0, enemy.mesh.position.z);
                const eDist = enemyPosXZ.distanceTo(obsPosXZ);
                const eMinDist = enemyRadius + obs.userData.radius;

                if (eDist < eMinDist) {
                    const pushDir = new THREE.Vector3().subVectors(enemyPosXZ, obsPosXZ).normalize();
                    const overlap = eMinDist - eDist;
                    enemy.mesh.position.x += pushDir.x * overlap;
                    enemy.mesh.position.z += pushDir.z * overlap;
                }
            });
        });

        // Final Ground Clamp
        this.player.mesh.position.y = 0;
    }

    updateEnemies(delta) {
        this.enemies.forEach(enemy => {
            if (enemy.isDead) return;

            // Health Bar logic: show when hit or locked
            const isLocked = this.player.lockedTarget === enemy;
            if (enemy.showHealthBarTimer > 0 || isLocked) {
                enemy.healthBarContainer.visible = true;
                enemy.healthBarContainer.lookAt(this.camera.position);
                if (!isLocked) enemy.showHealthBarTimer -= 0.02;
            } else {
                enemy.healthBarContainer.visible = false;
            }

            // Handle Knockback friction
            enemy.mesh.position.add(enemy.knockbackVel);
            enemy.knockbackVel.multiplyScalar(0.9);

            const distToPlayer = enemy.mesh.position.distanceTo(this.player.mesh.position);

            // AI State Machine
            if (enemy.state === 'IDLE') {
                if (distToPlayer < CONFIG.DETECTION_RANGE) {
                    enemy.state = 'CHASE';
                }
            } else if (enemy.state === 'CHASE') {
                // Rotate to player
                const dx = this.player.mesh.position.x - enemy.mesh.position.x;
                const dz = this.player.mesh.position.z - enemy.mesh.position.z;
                const targetYaw = Math.atan2(dx, dz);
                enemy.mesh.rotation.y = lerp(enemy.mesh.rotation.y, targetYaw, 0.1);

                if (distToPlayer < 2.5) {
                    enemy.state = 'ATTACK_CHARGE';
                    enemy.attackTimer = 0;
                } else if (distToPlayer > CONFIG.DETECTION_RANGE + 5) {
                    enemy.state = 'IDLE';
                } else {
                    // Move to player
                    const moveDir = new THREE.Vector3(dx, 0, dz).normalize();
                    enemy.mesh.position.addScaledVector(moveDir, enemy.speed);
                }
            } else if (enemy.state === 'ATTACK_CHARGE') {
                enemy.attackTimer += 0.05;
                // Visual feedback for charge
                enemy.mesh.children[0].material.color.lerp(new THREE.Color(0xffffff), 0.1);

                if (enemy.attackTimer >= 1.5) {
                    this.enemyAttack(enemy);
                }
            } else if (enemy.state === 'ATTACK_RECOVER') {
                enemy.attackTimer += 0.05;
                if (enemy.attackTimer >= 1.0) {
                    enemy.state = 'CHASE';
                    enemy.mesh.children[0].material.color.set(0xff5252);
                }
            }

            // Map Boundaries for enemies
            const limit = CONFIG.MAP_SIZE / 2;
            if (enemy.mesh.position.x > limit) enemy.mesh.position.x = limit;
            if (enemy.mesh.position.x < -limit) enemy.mesh.position.x = -limit;
            if (enemy.mesh.position.z > limit) enemy.mesh.position.z = limit;
            if (enemy.mesh.position.z < -limit) enemy.mesh.position.z = -limit;
        });
    }

    enemyAttack(enemy) {
        const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
        if (dist < 3) {
            this.damagePlayer(enemy.damage);
            // Flash effect for player?
            this.ui.playerHealth.style.background = '#ffffff';
            setTimeout(() => {
                this.ui.playerHealth.style.background = '';
            }, 100);
        }
        enemy.state = 'ATTACK_RECOVER';
        enemy.attackTimer = 0;
    }

    damagePlayer(amount) {
        this.player.health -= amount;
        if (this.player.health < 0) this.player.health = 0;

        const percent = (this.player.health / CONFIG.MAX_PLAYER_HEALTH) * 100;
        this.ui.playerHealth.style.width = `${percent}%`;

        if (this.player.health <= 0) {
            console.log("GAME OVER");
            // Simple restart or message
        }
    }

    initControls() {
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.cameraRotation = { yaw: 0, pitch: 0.4 }; // Modificato da -0.4 a 0.4

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft') this.toggleLockOn();
            if (e.code === 'Tab') {
                e.preventDefault();
                this.switchWeapon();
            }
        });

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Tab') e.preventDefault(); // Prevent focus loss
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.attack();
        });

        window.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.cameraRotation.yaw -= e.movementX * 0.002;
                this.cameraRotation.pitch -= e.movementY * 0.002;
                this.cameraRotation.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, this.cameraRotation.pitch));
            }
        });

        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
    }

    initUI() {
        this.ui = {
            playerHealth: document.getElementById('player-health'),
            enemyUI: document.getElementById('enemy-ui'),
            enemyHealth: document.getElementById('enemy-health'),
            enemyName: document.getElementById('enemy-name'),
            crosshair: document.getElementById('crosshair'),
            killCount: document.getElementById('kill-count'),
            weaponText: document.getElementById('weapon-ui'),
            ammoText: document.getElementById('ammo-ui'),
            gameOver: document.getElementById('game-over-screen'),
            finalScore: document.getElementById('final-score'),
            restartBtn: document.getElementById('restart-btn')
        };

        this.ui.restartBtn.onclick = () => this.restartGame();
    }

    toggleLockOn() {
        if (this.player.lockedTarget) {
            this.player.lockedTarget = null;
            this.ui.crosshair.classList.remove('locked');
            this.ui.enemyUI.classList.remove('visible');
        } else {
            // Find closest enemy
            let closest = null;
            let minDist = CONFIG.LOCK_ON_DISTANCE;

            this.enemies.forEach(enemy => {
                if (enemy.isDead) return;
                const dist = this.player.mesh.position.distanceTo(enemy.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    closest = enemy;
                }
            });

            if (closest) {
                this.player.lockedTarget = closest;
                this.ui.crosshair.classList.add('locked');
                this.ui.enemyUI.classList.add('visible');
                this.updateEnemyUI();
            }
        }
    }

    attack() {
        if (this.player.isAttacking || this.gameState === 'GAMEOVER') return;

        if (this.player.weapon === WEAPONS.BOW) {
            if (this.player.arrows <= 0) return;
            // Start Drawing Animation
            this.player.isAttacking = true;
            this.player.attackTimer = 0;
            // The arrow will be shot at the end of animation in update loop
        } else {
            this.player.isAttacking = true;
            this.player.attackTimer = 0;

            // ... hit detection ...
            const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            cameraDirection.y = 0; // Solo piano orizzontale
            cameraDirection.normalize();

            this.enemies.forEach(enemy => {
                if (enemy.isDead) return;

                // Vettore dal giocatore al nemico (solo XZ)
                const vecToEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.mesh.position);
                vecToEnemy.y = 0;
                const dist = vecToEnemy.length();

                // Check se il nemico è nel raggio e davanti alla visuale (mirino)
                const dot = cameraDirection.dot(vecToEnemy.normalize());

                if (dist < CONFIG.ATTACK_RANGE && dot > 0.5) {
                    this.damageEnemy(enemy, CONFIG.SWORD_DAMAGE);
                }
            });
        }
    }

    shootArrow() {
        // Arrow spawning logic (already used arrow count)
        const arrowGeom = new THREE.BoxGeometry(0.1, 0.1, 1.2);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const arrowMesh = new THREE.Mesh(arrowGeom, arrowMat);

        // Posizione di partenza: altezza spalla
        arrowMesh.position.copy(this.player.mesh.position).add(new THREE.Vector3(0, 1.4, 0));

        // Direzione: puntiamo esattamente dove guarda la camera
        const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

        // Correzione proiettile: deve viaggiare verso il punto mirato dal mirino
        arrowMesh.lookAt(arrowMesh.position.clone().add(cameraDirection));

        const velocity = cameraDirection.clone().multiplyScalar(CONFIG.ARROW_SPEED);

        this.scene.add(arrowMesh);
        this.projectiles.push({
            mesh: arrowMesh,
            velocity: velocity,
            life: 150
        });
    }

    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.mesh.position.add(p.velocity);
            p.life--;

            // Collision with enemies
            let hit = false;
            this.enemies.forEach(enemy => {
                if (enemy.isDead || hit) return;
                if (p.mesh.position.distanceTo(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.0) {
                    this.damageEnemy(enemy, CONFIG.ARROW_DAMAGE);
                    hit = true;
                }
            });

            if (hit || p.life <= 0) {
                this.scene.remove(p.mesh);
                this.projectiles.splice(i, 1);
            }
        }
    }

    damageEnemy(enemy, amount) {
        enemy.health -= amount;
        enemy.showHealthBarTimer = 2.0; // Show health for 2 seconds

        // Update 3D Health Bar
        const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
        enemy.healthBar.scale.x = healthPercent;
        enemy.healthBar.position.x = - (1 - healthPercent) * 0.6; // Keep left-aligned

        // Knockback
        const kbDir = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.mesh.position).normalize();
        kbDir.y = 0;
        enemy.knockbackVel.addScaledVector(kbDir, CONFIG.KNOCKBACK_FORCE);

        this.updateEnemyUI();

        // Hit Flash - Red for 0.2s
        const originalColor = 0xff5252;
        enemy.mesh.children[0].material.color.set(0xff0000);

        // Trigger Hit Marker UI
        this.triggerHitMarker();

        setTimeout(() => {
            if (!enemy.isDead) enemy.mesh.children[0].material.color.set(originalColor);
        }, 200);

        // Spawn Sparks
        this.createSparks(enemy.mesh.position);

        if (enemy.health <= 0) {
            enemy.health = 0;
            this.killEnemy(enemy);
        }
    }

    createSparks(position) {
        const sparkCount = 8;
        const sparkGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        for (let i = 0; i < sparkCount; i++) {
            const spark = new THREE.Mesh(sparkGeom, sparkMat);
            spark.position.copy(position);
            spark.position.y += 1; // Center of body

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            );

            this.scene.add(spark);
            this.particles.push({
                mesh: spark,
                velocity: velocity,
                life: 1.0
            });
        }
    }

    killEnemy(enemy) {
        enemy.isDead = true;

        // Visual death effect (fall over) 
        enemy.mesh.rotation.x = Math.PI / 2;
        enemy.mesh.position.y = 0.2;

        setTimeout(() => {
            // Smoke effect
            this.createSmoke(enemy.mesh.position, enemy.isBoss);

            const wasBoss = enemy.isBoss;
            this.scene.remove(enemy.mesh);
            const index = this.enemies.indexOf(enemy);
            if (index > -1) this.enemies.splice(index, 1);

            if (wasBoss) this.bossActive = false;

            // Increment Kills
            this.kills++;
            this.ui.killCount.innerText = `KILLS: ${this.kills}`;

            // Infinite Spawn Check
            if (this.enemies.length < CONFIG.MAX_ENEMIES) {
                this.spawnRandomEnemy();
            }
        }, 500);

        if (this.player.lockedTarget === enemy) {
            this.toggleLockOn();
        }
    }

    spawnRandomEnemy() {
        // Boss Logic
        let isBoss = false;
        if (this.kills > 0 && this.kills % CONFIG.KILLS_FOR_BOSS === 0 && !this.bossActive) {
            isBoss = true;
            this.bossActive = true;
        }

        const typeKeys = Object.keys(ENEMY_TYPES);
        const randomType = ENEMY_TYPES[typeKeys[Math.floor(Math.random() * typeKeys.length)]];

        // Spawn far from player
        let rx, rz;
        do {
            rx = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.8;
            rz = (Math.random() - 0.5) * CONFIG.MAP_SIZE * 0.8;
        } while (new THREE.Vector2(rx, rz).distanceTo(new THREE.Vector2(this.player.mesh.position.x, this.player.mesh.position.z)) < 15);

        this.createEnemy(rx, 0, rz, isBoss, randomType);
    }

    createSmoke(position, isBoss = false) {
        const smokeCount = isBoss ? 30 : 12;
        const sizeScale = isBoss ? 2 : 1;
        const smokeGeom = new THREE.BoxGeometry(0.4 * sizeScale, 0.4 * sizeScale, 0.4 * sizeScale);
        const smokeMat = new THREE.MeshToonMaterial({
            color: isBoss ? 0x550055 : 0xdddddd,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < smokeCount; i++) {
            const smoke = new THREE.Mesh(smokeGeom, smokeMat);
            smoke.position.copy(position);
            smoke.position.y += 0.5 * sizeScale;

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * (isBoss ? 0.3 : 0.1),
                Math.random() * (isBoss ? 0.4 : 0.15),
                (Math.random() - 0.5) * (isBoss ? 0.3 : 0.1)
            );

            this.scene.add(smoke);
            this.particles.push({
                mesh: smoke,
                velocity: velocity,
                life: 1.0,
                isSmoke: true
            });
        }
    }

    updateEnemyUI() {
        if (!this.player.lockedTarget) return;
        const target = this.player.lockedTarget;
        this.ui.enemyName.innerText = target.name;
        const percent = (target.health / target.maxHealth) * 100;
        this.ui.enemyHealth.style.width = `${percent}%`;
    }

    updatePlayer(delta) {
        const moveX = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
        const moveZ = (this.keys['KeyS'] ? 1 : 0) - (this.keys['KeyW'] ? 1 : 0);

        const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();

        if (inputDir.length() > 0) {
            // Move relative to camera
            const cameraYaw = this.cameraRotation.yaw;
            inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

            this.player.mesh.position.addScaledVector(inputDir, CONFIG.PLAYER_SPEED);

            // Rotate player to face movement or camera forward
            const targetRotation = Math.atan2(inputDir.x, inputDir.z);
            this.player.mesh.rotation.y = lerp(this.player.mesh.rotation.y, targetRotation, 0.15);

            // ANIMATION: Walk limb swing
            this.player.walkTimer += 0.15;
            const swing = Math.sin(this.player.walkTimer) * 0.5;
            this.leftLeg.rotation.x = swing;
            this.rightLeg.rotation.x = -swing;

            if (!this.player.isAttacking) {
                this.leftArm.rotation.x = -swing * 0.5;
                this.rightArm.rotation.x = swing * 0.5;
            }
        } else {
            // Reset limbs when standing still
            this.leftLeg.rotation.x = lerp(this.leftLeg.rotation.x, 0, 0.1);
            this.rightLeg.rotation.x = lerp(this.rightLeg.rotation.x, 0, 0.1);
            if (!this.player.isAttacking) {
                this.leftArm.rotation.x = lerp(this.leftArm.rotation.x, 0, 0.1);
                this.rightArm.rotation.x = lerp(this.rightArm.rotation.x, 0, 0.1);
            }

            if (this.player.weapon === WEAPONS.BOW || this.player.lockedTarget) {
                // Se fermo con arco o lock, guarda nella direzione della camera (posteriore)
                const targetYaw = this.cameraRotation.yaw + Math.PI;
                this.player.mesh.rotation.y = lerp(this.player.mesh.rotation.y, targetYaw, 0.1);
            }
        }

        // Invisible Walls (Map size 50x50 -> limit +/- 25)
        const limit = CONFIG.MAP_SIZE / 2;
        if (this.player.mesh.position.x > limit) this.player.mesh.position.x = limit;
        if (this.player.mesh.position.x < -limit) this.player.mesh.position.x = -limit;
        if (this.player.mesh.position.z > limit) this.player.mesh.position.z = limit;
        if (this.player.mesh.position.z < -limit) this.player.mesh.position.z = -limit;

        // Chest Interaction
        this.chests.forEach(chest => {
            if (this.player.mesh.position.distanceTo(chest.position) < 1.5) {
                this.pickupWeapon(chest);
            }
        });

        if (this.player.lockedTarget) {
            const dx = this.player.lockedTarget.mesh.position.x - this.player.mesh.position.x;
            const dz = this.player.lockedTarget.mesh.position.z - this.player.mesh.position.z;
            const targetYaw = Math.atan2(dx, dz);
            this.player.mesh.rotation.y = lerp(this.player.mesh.rotation.y, targetYaw, 0.1);

            // If target gets too far, unlock
            if (this.player.mesh.position.distanceTo(this.player.lockedTarget.mesh.position) > CONFIG.LOCK_ON_DISTANCE + 5) {
                this.toggleLockOn();
            }
        }

        // Weapon Animation
        if (this.player.isAttacking) {
            this.player.attackTimer += 0.08; // Slower, more detailed animation
            const t = this.player.attackTimer;

            if (this.player.weapon === WEAPONS.SWORD) {
                // Slash: Swing arm and rotate sword for a "forward" strike
                this.rightArm.rotation.x = lerp(0, -2.2, Math.sin(t * Math.PI));
                this.rightArm.rotation.z = lerp(0, 0.6, Math.sin(t * Math.PI));
                // Twist the blade forward during the strike
                this.swordPivot.rotation.x = lerp(0, 1.2, Math.sin(t * Math.PI));
            } else if (this.player.weapon === WEAPONS.BOW) {
                // Drawing Animation
                if (t < 0.8) {
                    // Nyck aims and pulls back
                    this.leftArm.rotation.x = -1.4; // Aim
                    this.rightArm.rotation.x = -1.2; // Pull hand
                    this.rightArm.rotation.y = 0.5;
                    this.rightArm.position.z = -0.3 * (t / 0.8); // Hand moves back

                    // String stretches dynamically
                    this.bowString.scale.set(1, 1, 1 + (t / 0.8) * 8);
                    this.bowString.position.z = -0.05 - (t / 0.8) * 0.45;
                } else if (t >= 0.8 && t < 0.95) {
                    // Release Frame
                    if (!this.player.arrowShot) {
                        this.player.arrows--;
                        this.updateWeaponUI();
                        this.shootArrow();
                        this.player.arrowShot = true;
                    }
                    // Snap string back
                    this.bowString.scale.set(1, 1, 1);
                    this.bowString.position.z = -0.05;
                    this.rightArm.position.z = 0;
                }
            }

            if (t >= 1) {
                this.player.isAttacking = false;
                this.player.attackTimer = 0;
                this.player.arrowShot = false;
                this.rightArm.rotation.set(0, 0, 0);
                this.leftArm.rotation.set(0, 0, 0);
                this.rightArm.position.z = 0;
                this.swordPivot.rotation.x = 0; // Reset sword point
            }
        }
    }

    updateCamera() {
        const yaw = this.cameraRotation.yaw;
        const pitch = this.cameraRotation.pitch;

        // Aumentato offset per non coprire il mirino
        const distance = 8;
        const offset = new THREE.Vector3(0, 0, 1);
        offset.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        offset.multiplyScalar(distance);

        // Shoulder offset più marcato (a destra)
        const sideOffset = new THREE.Vector3(2.2, 0, 0);
        sideOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        this.camera.position.copy(this.player.mesh.position).add(offset).add(sideOffset);
        this.camera.position.y += 2.8;

        // Anti-Underground Check
        if (this.camera.position.y < 0.5) {
            this.camera.position.y = 0.5;
        }

        // Il punto di mira deve essere decentrato rispetto al personaggio per colpire il mirino
        const lookTarget = this.player.mesh.position.clone()
            .add(new THREE.Vector3(0, 2.0, 0)) // Altezza occhi
            .add(new THREE.Vector3(-1.0, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)); // Offset per centrare mirino

        this.camera.lookAt(lookTarget);
    }

    animate() {
        if (this.gameState === 'GAMEOVER') return;

        requestAnimationFrame(() => this.animate());

        this.updatePlayer();
        this.updateEnemies();
        this.checkCollisions();
        this.updateProjectiles();
        this.updateCamera();

        // Move clouds
        if (this.clouds) {
            this.clouds.forEach(cloud => {
                cloud.position.x += 0.01;
                if (cloud.position.x > 75) cloud.position.x = -75;
            });
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.add(p.velocity);

            if (p.isSmoke) {
                p.velocity.y *= 0.98; // Slow down upwards
                p.mesh.rotation.x += 0.05;
                p.mesh.rotation.y += 0.05;
            } else {
                p.velocity.y -= 0.005; // Gravity for sparks
            }

            p.life -= 0.02;
            p.mesh.scale.setScalar(p.life);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    pickupWeapon(chest) {
        const weaponType = chest.userData.content;

        console.log(`Rilevato oggetto: ${weaponType}`);

        // Se la cassa contiene un arco, aggiungiamo SEMPRE le frecce
        if (weaponType === WEAPONS.BOW) {
            const addedAmmo = chest.userData.ammo;
            this.player.arrows += addedAmmo;
            console.log(`Aggiunte ${addedAmmo} frecce. Totale: ${this.player.arrows}`);
        }

        // Cambiamo l'arma impugnata
        this.player.weapon = weaponType;

        // Visual Switch
        this.swordPivot.visible = (this.player.weapon === WEAPONS.SWORD);
        this.bowModel.visible = (this.player.weapon === WEAPONS.BOW);

        this.updateWeaponUI();

        // Rimuovi cassa
        this.scene.remove(chest);
        this.chests.splice(this.chests.indexOf(chest), 1);

        // Spawn a new one elsewhere
        this.createChest();
    }

    updateWeaponUI() {
        const range = this.player.weapon === WEAPONS.SWORD ? "Short" : "Long";
        this.ui.weaponText.innerText = `WEAPON: ${this.player.weapon} (${range} Range) - [TAB] to switch`;
        if (this.player.weapon === WEAPONS.BOW) {
            this.ui.ammoText.style.display = 'block';
            this.ui.ammoText.innerText = `Arrows: ${this.player.arrows}`;
        } else {
            this.ui.ammoText.style.display = 'none';
        }
    }

    switchWeapon() {
        if (this.gameState !== 'PLAYING') return;

        // Switch between Sword and Bow
        const newWeapon = (this.player.weapon === WEAPONS.SWORD) ? WEAPONS.BOW : WEAPONS.SWORD;

        // Check if we can switch (optional: e.g. need arrows for bow)
        this.player.weapon = newWeapon;

        // Visual Switch
        this.swordPivot.visible = (this.player.weapon === WEAPONS.SWORD);
        this.bowModel.visible = (this.player.weapon === WEAPONS.BOW);

        this.updateWeaponUI();
        this.triggerHitMarker(); // Subtle flash to indicate switch
    }

    damagePlayer(amount) {
        if (this.gameState === 'GAMEOVER') return;

        this.player.health -= amount;
        if (this.player.health < 0) this.player.health = 0;

        const percent = (this.player.health / CONFIG.MAX_PLAYER_HEALTH) * 100;
        this.ui.playerHealth.style.width = `${percent}%`;

        if (this.player.health <= 0) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        this.gameState = 'GAMEOVER';
        this.ui.gameOver.style.display = 'flex';
        this.ui.finalScore.innerText = `Kills: ${this.kills}`;
        document.exitPointerLock();
    }

    restartGame() {
        this.ui.gameOver.style.display = 'none';

        // Reset Position & State
        this.resetGameState();
        this.player.mesh.position.set(0, 0, 5);
        this.cameraRotation = { yaw: 0, pitch: 0.4 };

        // Clear Enemies & Spawn New ones
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.enemies = [];
        this.initEnemies();

        // Restart animation
        this.animate();
    }

    resetGameState() {
        this.gameState = 'PLAYING';
        this.kills = 0;
        this.bossActive = false;
        this.particles = [];
        this.projectiles = [];

        if (this.player) {
            this.player.health = CONFIG.MAX_PLAYER_HEALTH;
            this.player.weapon = WEAPONS.SWORD;
            this.player.arrows = 10; // Nyck inizia con 10 frecce per testare l'arco
            this.player.isAttacking = false;

            this.swordPivot.visible = true;
            this.bowModel.visible = false;

            // Update UI
            this.ui.playerHealth.style.width = '100%';
            this.ui.killCount.innerText = 'KILLS: 0';
            this.updateWeaponUI();
        }
    }

    triggerHitMarker() {
        this.ui.crosshair.classList.add('hit');
        if (this.hitMarkerTimer) clearTimeout(this.hitMarkerTimer);
        this.hitMarkerTimer = setTimeout(() => {
            this.ui.crosshair.classList.remove('hit');
        }, 150);
    }
}

// Start Game
new Game();
