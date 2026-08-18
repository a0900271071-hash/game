import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Zap } from 'lucide-react';
import {
  Faction,
  MapType,
  HealthState,
  PlayerState,
  GeneratorState,
  ExitGateState,
  CageState,
  GameStats,
  CharacterInfo,
  KILLERS,
  SURVIVORS,
  LoudNoisePing,
  ScratchMark,
  BloodTrail,
} from './types';
import { TitleScreen } from './components/TitleScreen';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { GameOverModal } from './components/GameOverModal';
import { buildXimendingMap, MapData } from './maps/ximending';
import { buildCathedralMap } from './maps/cathedral';
import { createCharacter3DMesh } from './game/createCharacterMesh';
import { sound } from './audio';
import { spawnIceAttackProjectile, updateIceProjectilesAndCheckHits, ActiveIceProjectile } from './game/iceProjectile';
import { castGourmetRageSkill, processGourmetHitOnSurvivor } from './game/gourmetCharacter';
import { castTariqBetrayalSkill, checkTariqSkillCondition } from './game/tariqCharacter';
import { castKentoSurgeSkill, checkKentoSkillCondition } from './game/kentoCharacter';
import { castJackSkill, checkJackSkillCondition } from './game/jackCharacter';
import { castErikSkill, checkErikSkillCondition } from './game/erikCharacter';
import unfixImg from './assets/images/unfix.png';
import hasfixImg from './assets/images/hasfix.png';

// Generator 2D Sprite Textures
const textureLoader = new THREE.TextureLoader();
const unfixTexture = textureLoader.load(unfixImg, tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
});
unfixTexture.colorSpace = THREE.SRGBColorSpace;

const hasfixTexture = textureLoader.load(hasfixImg, tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
});
hasfixTexture.colorSpace = THREE.SRGBColorSpace;

export default function App() {
  const [gamePhase, setGamePhase] = useState<'title' | 'menu' | 'playing' | 'gameover'>('title');
  const [userFaction, setUserFaction] = useState<Faction>('survivor');
  const [userCharId, setUserCharId] = useState<string>('kento');
  const [selectedMap, setSelectedMap] = useState<'random' | MapType>('random');
  const [activeMap, setActiveMap] = useState<MapType>('ximending');

  // Match states
  const [humanPlayerId, setHumanPlayerId] = useState<string>('survivor_1');
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [generators, setGenerators] = useState<GeneratorState[]>([]);
  const [exitGates, setExitGates] = useState<ExitGateState[]>([]);
  const [cages, setCages] = useState<CageState[]>([]);
  const [matchTime, setMatchTime] = useState<number>(0);
  const [killerBreakCharges, setKillerBreakCharges] = useState<number>(0);
  const [noisePings, setNoisePings] = useState<LoudNoisePing[]>([]);
  const [actionPrompt, setActionPrompt] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [floatingGens, setFloatingGens] = useState<{
    id: number;
    screenX: number;
    screenY: number;
    progress: number;
    isCompleted: boolean;
    isTargetGen: boolean;
    repairingCount: number;
    distance: number;
  }[]>([]);

  // References
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mapDataRef = useRef<MapData | null>(null);
  const playerMeshesRef = useRef<Record<string, THREE.Group>>({});
  const generatorMeshesRef = useRef<Record<number, THREE.Group>>({});
  const gateMeshesRef = useRef<Record<number, THREE.Group>>({});
  const cageMeshesRef = useRef<Record<number, THREE.Group>>({});
  const scratchMarksRef = useRef<ScratchMark[]>([]);
  const bloodTrailsRef = useRef<BloodTrail[]>([]);
  const trailMeshesGroupRef = useRef<THREE.Group | null>(null);
  const pingBeaconsGroupRef = useRef<THREE.Group | null>(null);
  const iceProjectilesRef = useRef<ActiveIceProjectile[]>([]);
  const prevPlayerPosRef = useRef<Record<string, { x: number; z: number }>>({});

  // Inputs & Camera
  const keysPressed = useRef<Record<string, boolean>>({});
  const cameraYaw = useRef<number>(0);
  const cameraPitch = useRef<number>(0.28);
  const cameraDistance = useRef<number>(7.5);
  const isMouseDown = useRef<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getRandomSafeSpawns = (mapType: MapType) => {
    const ximendingPool = [
      { x: 0, z: -35 }, { x: 0, z: 35 }, { x: 0, z: 0 }, { x: -28, z: 38 },
      { x: 28, z: 38 }, { x: -28, z: -38 }, { x: 28, z: -38 }, { x: -28, z: 0 },
      { x: 28, z: 0 }, { x: -19, z: -27 }, { x: 19, z: -27 }, { x: -19, z: 30 },
      { x: 19, z: 30 }, { x: 0, z: -48 }, { x: 0, z: 48 }, { x: -6, z: 20 },
      { x: 6, z: -20 }, { x: -6, z: -10 }, { x: 6, z: 10 },
    ];
    const cathedralPool = [
      { x: 0, z: -35 }, { x: 0, z: 35 }, { x: -25, z: 0 }, { x: 25, z: 0 },
      { x: -22, z: -30 }, { x: 22, z: -30 }, { x: -22, z: 30 }, { x: 22, z: 30 },
      { x: 0, z: -15 }, { x: 0, z: 45 }, { x: -25, z: -18 }, { x: 25, z: -18 },
      { x: -20, z: 15 }, { x: 20, z: 15 }, { x: 0, z: 20 }, { x: 0, z: -45 },
    ];

    const pool = [...(mapType === 'cathedral' ? cathedralPool : ximendingPool)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const killerBase = pool.pop() || { x: 0, z: -20 };
    const killerSpawn = {
      x: killerBase.x + (Math.random() - 0.5) * 1.5,
      z: killerBase.z + (Math.random() - 0.5) * 1.5,
    };

    const farCandidates = pool.filter(pt => Math.hypot(pt.x - killerSpawn.x, pt.z - killerSpawn.z) >= 18);
    const survivorSpawns: { x: number; z: number }[] = [];

    for (let i = 0; i < 4; i++) {
      const candidate = farCandidates.pop() || pool.pop() || { x: (i % 2 === 0 ? -1 : 1) * 20, z: 25 };
      survivorSpawns.push({
        x: candidate.x + (Math.random() - 0.5) * 1.2,
        z: candidate.z + (Math.random() - 0.5) * 1.2,
      });
    }

    return { killerSpawn, survivorSpawns };
  };

  const characterMap: Record<string, CharacterInfo> = {};
  [...KILLERS, ...SURVIVORS].forEach(c => { characterMap[c.id] = c; });

  const handleStartGame = (config: {
    userFaction: Faction;
    userCharacterId: string;
    mapType: MapType;
    mapSelection?: 'random' | MapType;
  }) => {
    const effectiveSelection = config.mapSelection || selectedMap || 'random';
    const rolledMap: MapType =
      effectiveSelection === 'random'
        ? (Math.random() < 0.5 ? 'ximending' : 'cathedral')
        : config.mapType;

    setUserFaction(config.userFaction);
    setUserCharId(config.userCharacterId);
    setSelectedMap(effectiveSelection);
    setActiveMap(rolledMap);

    sound.init();

    let killerCharId = 'elena';
    let survivorCharIds = ['kento', 'jack', 'erik', 'tariq'];

    if (config.userFaction === 'survivor') {
      survivorCharIds = [
        config.userCharacterId,
        ...survivorCharIds.filter(id => id !== config.userCharacterId),
      ];
      killerCharId = Math.random() < 0.5 ? 'elena' : 'gourmet';
    } else {
      killerCharId = config.userCharacterId;
      if (killerCharId !== 'elena' && killerCharId !== 'gourmet') {
        killerCharId = 'elena';
      }
    }

    const { killerSpawn, survivorSpawns } = getRandomSafeSpawns(rolledMap);
    const initPlayers: PlayerState[] = [];
    const isHumanKiller = config.userFaction === 'killer';

    initPlayers.push({
      id: 'killer_1',
      characterId: killerCharId,
      name: characterMap[killerCharId]?.name || 'Killer',
      faction: 'killer',
      isHuman: isHumanKiller,
      x: killerSpawn.x,
      y: 0,
      z: killerSpawn.z,
      rotationY: 0,
      health: 'healthy',
      speed: 6.2,
      isSprinting: false,
      skillCooldown: 0,
      skillActiveTime: 0,
      cageTimer: 0,
      cageRemainingBefore: 90,
      cageCount: 0,
      hitBoostTime: 0,
      frostbiteTime: 0,
      elenaBuffTime: 0,
      deepInjury: false,
      berserkTime: 0,
      tariqStealthTime: 0,
      tariqSpeedBoostTime: 0,
      betrayedTeammateId: null,
      betrayedTeammateTime: 0,
      jackBuffTime: 0,
      jackRescuedWindow: 0,
      wasRescuedFromCage: false,
      vikingBuffTime: 0,
      erikSkillAvailable: true,
      satoBuffTime: 0,
      kentoFearScreamTime: 0,
    });

    if (isHumanKiller) setHumanPlayerId('killer_1');

    survivorCharIds.slice(0, 4).forEach((cId, idx) => {
      const isHumanSurv = config.userFaction === 'survivor' && idx === 0;
      const sId = `survivor_${idx + 1}`;
      const spawn = survivorSpawns[idx] || { x: 0, z: 20 };

      initPlayers.push({
        id: sId,
        characterId: cId,
        name: characterMap[cId]?.name || `Survivor ${idx + 1}`,
        faction: 'survivor',
        isHuman: isHumanSurv,
        x: spawn.x,
        y: 0,
        z: spawn.z,
        rotationY: Math.PI,
        health: 'healthy',
        speed: 5.0,
        isSprinting: false,
        skillCooldown: 0,
        skillActiveTime: 0,
        cageTimer: 90,
        cageRemainingBefore: 90,
        cageCount: 0,
        hitBoostTime: 0,
        frostbiteTime: 0,
        elenaBuffTime: 0,
        deepInjury: false,
        berserkTime: 0,
        tariqStealthTime: 0,
        tariqSpeedBoostTime: 0,
        betrayedTeammateId: null,
        betrayedTeammateTime: 0,
        jackBuffTime: 0,
        jackRescuedWindow: 0,
        wasRescuedFromCage: false,
        vikingBuffTime: 0,
        erikSkillAvailable: true,
        satoBuffTime: 0,
        kentoFearScreamTime: 0,
      });

      if (isHumanSurv) setHumanPlayerId(sId);
    });

    setPlayers(initPlayers);
    setMatchTime(0);
    setKillerBreakCharges(0);
    setNoisePings([]);
    setActionPrompt(null);
    setGameStats(null);
    scratchMarksRef.current = [];
    bloodTrailsRef.current = [];
    prevPlayerPosRef.current = {};

    setGamePhase('playing');
  };

  // Three.js Scene Setup
  useEffect(() => {
    if (gamePhase !== 'playing' || !canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    const trailsGroup = new THREE.Group();
    scene.add(trailsGroup);
    trailMeshesGroupRef.current = trailsGroup;

    const pingsGroup = new THREE.Group();
    scene.add(pingsGroup);
    pingBeaconsGroupRef.current = pingsGroup;

    const mapData = activeMap === 'cathedral' ? buildCathedralMap(scene) : buildXimendingMap(scene);
    mapDataRef.current = mapData;

    // Generators Setup
    const initGens: GeneratorState[] = mapData.genPositions.slice(0, 10).map((pos, idx) => {
      const isTarget = idx < 7;
      const genGroup = new THREE.Group();
      genGroup.position.set(pos.x, 0, pos.z);

      const planeGeo = new THREE.PlaneGeometry(3.6, 3.6);
      const planeMat = new THREE.MeshBasicMaterial({
        map: unfixTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const spriteVisual = new THREE.Mesh(planeGeo, planeMat);
      spriteVisual.name = 'SpriteVisual';
      spriteVisual.position.set(0, 1.8, 0);
      genGroup.add(spriteVisual);

      genGroup.userData = { sprite: spriteVisual, spriteVisual, isTarget, id: idx };

      scene.add(genGroup);
      generatorMeshesRef.current[idx] = genGroup;

      return {
        id: idx,
        x: pos.x,
        z: pos.z,
        isTargetGen: isTarget,
        progress: 0,
        isCompleted: false,
        repairingCount: 0,
      };
    });
    setGenerators(initGens);

    // Gates Setup
    const initGates: ExitGateState[] = mapData.gatePositions.slice(0, 2).map((pos, idx) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.set(pos.x, 0, pos.z);
      gateGroup.rotation.y = (pos as any).rotationY || 0;

      const frameGeo = new THREE.BoxGeometry(10, 6, 1.5);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = 3;
      gateGroup.add(frame);

      scene.add(gateGroup);
      gateMeshesRef.current[idx] = gateGroup;

      return { id: idx, x: pos.x, z: pos.z, progress: 0, isOpen: false };
    });
    setExitGates(initGates);

    // Cages Setup
    const initCages: CageState[] = mapData.cagePositions.map((pos, idx) => {
      const cageGroup = new THREE.Group();
      cageGroup.position.set(pos.x, 0, pos.z);

      const cageGeo = new THREE.BoxGeometry(3.2, 4.2, 3.2);
      const cageMat = new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        emissive: 0x450a0a,
        emissiveIntensity: 0.5,
        wireframe: true,
      });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      cageMesh.position.y = 2.1;
      cageGroup.add(cageMesh);

      scene.add(cageGroup);
      cageMeshesRef.current[idx] = cageGroup;

      return { id: idx, x: pos.x, z: pos.z, occupiedPlayerId: null };
    });
    setCages(initCages);

    // Player Meshes
    players.forEach(p => {
      const pMesh = createCharacter3DMesh(p.characterId);
      pMesh.position.set(p.x, 0, p.z);
      scene.add(pMesh);
      playerMeshesRef.current[p.id] = pMesh;
    });

    // Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.key) keysPressed.current[e.key.toLowerCase()] = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') triggerSkill(humanPlayerId);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.key) keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => { isMouseDown.current = false; };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      cameraYaw.current -= dx * 0.0055;
      cameraPitch.current = Math.max(0.08, Math.min(1.15, cameraPitch.current + dy * 0.0045));
    };

    const handleWheel = (e: WheelEvent) => {
      cameraDistance.current = Math.max(4.5, Math.min(18, cameraDistance.current + e.deltaY * 0.01));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    domEl.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      domEl.removeEventListener('wheel', handleWheel);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [gamePhase, activeMap]);

  // Skill Trigger
  const triggerSkill = useCallback((pId: string) => {
    setPlayers(prev => {
      const caster = prev.find(p => p.id === pId);
      if (!caster || caster.skillCooldown > 0 || caster.health === 'caged' || caster.health === 'dead' || caster.health === 'downed') return prev;

      if (caster.characterId === 'elena') {
        if (sceneRef.current) {
          const proj = spawnIceAttackProjectile(
            sceneRef.current,
            caster.id,
            caster.x,
            caster.y || 0,
            caster.z,
            caster.rotationY,
            26,
            35
          );
          iceProjectilesRef.current.push(proj);
        }
        sound.playSkillSound();
        setActionPrompt('❄️【凍原祭司】艾琳娜 施放技能！擲出【冰封詛咒】特殊攻擊判定物件！');
        return prev.map(p => p.id === pId ? { ...p, skillCooldown: 12, skillActiveTime: 10 } : p);
      } else if (caster.characterId === 'gourmet') {
        const res = castGourmetRageSkill(caster, prev);
        setActionPrompt(res.result.message);
        return res.updatedPlayers;
      } else if (caster.characterId === 'tariq') {
        const res = castTariqBetrayalSkill(caster, prev);
        setActionPrompt(res.message);
        return res.updatedPlayers;
      } else if (caster.characterId === 'kento') {
        const res = castKentoSurgeSkill(caster, prev, caster.kentoFearScreamTime || 0);
        setActionPrompt(res.message);
        return res.updatedPlayers;
      } else if (caster.characterId === 'jack') {
        const res = castJackSkill(caster, prev);
        setActionPrompt(res.message);
        return res.updatedPlayers;
      } else if (caster.characterId === 'erik') {
        const res = castErikSkill(caster, prev);
        setActionPrompt(res.message);
        return res.updatedPlayers;
      }

      sound.playSkillSound();
      return prev.map(p => p.id === pId ? { ...p, skillCooldown: 15, skillActiveTime: 10 } : p);
    });
  }, []);

  // Precise Collision with Wall Sliding & Solid Generator Obstacles (Radius = 0.75m, Generator obstacle = 1.35m)
  const checkCollision = (testX: number, testZ: number, radius = 0.75): boolean => {
    if (!mapDataRef.current) return false;
    // 1. Check wall colliders
    for (const c of (mapDataRef.current.colliders || [])) {
      if (
        testX + radius > c.minX &&
        testX - radius < c.maxX &&
        testZ + radius > c.minZ &&
        testZ - radius < c.maxZ
      ) {
        return true;
      }
    }
    // 2. Check 10 Generator Solid Collision (半徑 1.35m 實體障礙物，防止穿模)
    const genPositions = mapDataRef.current.genPositions || [];
    for (let i = 0; i < Math.min(10, genPositions.length); i++) {
      const g = genPositions[i];
      const distSq = (testX - g.x) * (testX - g.x) + (testZ - g.z) * (testZ - g.z);
      const minDistance = radius + 1.35;
      if (distSq < minDistance * minDistance) {
        return true;
      }
    }

    const maxBound = 60;
    if (Math.abs(testX) > maxBound || Math.abs(testZ) > maxBound) {
      return true;
    }
    return false;
  };

  const moveWithCollision = (currX: number, currZ: number, targetX: number, targetZ: number, radius = 0.75) => {
    let finalX = currX;
    let finalZ = currZ;

    // Safety unstick from colliders
    if (mapDataRef.current && mapDataRef.current.colliders) {
      for (const c of mapDataRef.current.colliders) {
        if (
          currX + radius > c.minX &&
          currX - radius < c.maxX &&
          currZ + radius > c.minZ &&
          currZ - radius < c.maxZ
        ) {
          const distLeft = Math.abs(currX - (c.minX - radius - 0.2));
          const distRight = Math.abs(currX - (c.maxX + radius + 0.2));
          const distTop = Math.abs(currZ - (c.minZ - radius - 0.2));
          const distBottom = Math.abs(currZ - (c.maxZ + radius + 0.2));
          const minDist = Math.min(distLeft, distRight, distTop, distBottom);
          if (minDist === distLeft) finalX = c.minX - radius - 0.2;
          else if (minDist === distRight) finalX = c.maxX + radius + 0.2;
          else if (minDist === distTop) finalZ = c.minZ - radius - 0.2;
          else finalZ = c.maxZ + radius + 0.2;
          return { x: finalX, z: finalZ };
        }
      }
    }

    // Generator safety unstick
    if (mapDataRef.current && mapDataRef.current.genPositions) {
      for (let i = 0; i < Math.min(10, mapDataRef.current.genPositions.length); i++) {
        const pos = mapDataRef.current.genPositions[i];
        const dist = Math.hypot(currX - pos.x, currZ - pos.z);
        const minSafeDist = radius + 1.35;
        if (dist < minSafeDist && dist > 0.001) {
          finalX = pos.x + ((currX - pos.x) / dist) * (minSafeDist + 0.15);
          finalZ = pos.z + ((currZ - pos.z) / dist) * (minSafeDist + 0.15);
          return { x: finalX, z: finalZ };
        }
      }
    }

    // Independent X movement test
    if (!checkCollision(targetX, currZ, radius)) {
      finalX = targetX;
    }
    // Independent Z movement test
    if (!checkCollision(finalX, targetZ, radius)) {
      finalZ = targetZ;
    }

    // Post-movement Generator solid push-out
    if (mapDataRef.current && mapDataRef.current.genPositions) {
      for (let i = 0; i < Math.min(10, mapDataRef.current.genPositions.length); i++) {
        const pos = mapDataRef.current.genPositions[i];
        const dist = Math.hypot(finalX - pos.x, finalZ - pos.z);
        const minSafeDist = radius + 1.35;
        if (dist < minSafeDist) {
          if (dist > 0.0001) {
            finalX = pos.x + ((finalX - pos.x) / dist) * minSafeDist;
            finalZ = pos.z + ((finalZ - pos.z) / dist) * minSafeDist;
          } else {
            finalX = pos.x + minSafeDist;
          }
        }
      }
    }

    return { x: finalX, z: finalZ };
  };

  // Frame Rendering Loop (讓 2D 電箱與角色立繪面向攝影機 Billboard Effect)
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      if (cameraRef.current && sceneRef.current && rendererRef.current) {
        // 更新所有電箱 2D 立繪朝向攝影機 (Billboard)
        Object.values(generatorMeshesRef.current).forEach((group: any) => {
          const sprite = group?.userData?.spriteVisual as THREE.Mesh;
          if (sprite && cameraRef.current) {
            sprite.quaternion.copy(cameraRef.current.quaternion);
          }
        });

        // 更新 3D 玩家網格位置、旋轉與 Billboard 動作
        players.forEach(p => {
          const pMesh = playerMeshesRef.current[p.id];
          if (pMesh) {
            pMesh.position.set(p.x, p.y || 0, p.z);
            pMesh.rotation.y = p.rotationY;

            if (pMesh.userData && typeof pMesh.userData.billboard === 'function') {
              pMesh.userData.billboard(cameraRef.current!);
            }
          }
        });

        // 相機跟隨主角 (Over-the-shoulder / Third Person)
        const human = players.find(p => p.id === humanPlayerId);
        if (human) {
          const cam = cameraRef.current;
          const dist = cameraDistance.current;
          const pitch = cameraPitch.current;
          const yaw = cameraYaw.current;

          const cx = human.x - Math.sin(yaw) * dist * Math.cos(pitch);
          const cy = human.y + 1.8 + Math.sin(pitch) * dist;
          const cz = human.z - Math.cos(yaw) * dist * Math.cos(pitch);

          cam.position.set(cx, cy, cz);
          cam.lookAt(human.x, human.y + 1.2, human.z);
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [gamePhase, players, humanPlayerId]);

  // Main Logic Game Interval (50ms Tick / 20 FPS Physics & AI)
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const delta = 0.05;
    const interval = setInterval(() => {
      setMatchTime(t => t + delta);

      setPlayers(prevPlayers => {
        const human = prevPlayers.find(p => p.id === humanPlayerId);
        if (!human) return prevPlayers;

        let promptMessage: string | null = null;
        const isSpacePressed = !!(keysPressed.current['Space'] || keysPressed.current['space']);

        // 0. 更新【凍原祭司】艾琳娜【冰封詛咒】特殊攻擊判定物件 (specialattack.png)
        if (iceProjectilesRef.current.length > 0 && sceneRef.current) {
          const { aliveProjectiles, updatedPlayers: projdPlayers, impacts } = updateIceProjectilesAndCheckHits(
            iceProjectilesRef.current,
            delta,
            cameraRef.current,
            sceneRef.current,
            prevPlayers
          );
          iceProjectilesRef.current = aliveProjectiles;
          prevPlayers = projdPlayers;
          if (impacts.length > 0) {
            promptMessage = impacts[0].message;
          }
        }

        // 1. 發電機修復狀態與多人加成統計
        const genRepairers: Record<number, number> = {};
        const genRepairMultiplier: Record<number, number> = {};
        generators.forEach(g => {
          genRepairers[g.id] = 0;
          genRepairMultiplier[g.id] = 1.0;
        });

        // 2. 統計修機/救人/攻擊/互動
        prevPlayers.forEach(p => {
          if (p.faction === 'survivor' && (p.health === 'healthy' || p.health === 'injured')) {
            generators.forEach(gen => {
              if (!gen.isCompleted && gen.isTargetGen) {
                const dist = Math.hypot(gen.x - p.x, gen.z - p.z);
                if (dist < 2.8) {
                  const isRepairing = (p.id === humanPlayerId && isSpacePressed) || (p.id !== humanPlayerId);
                  if (isRepairing) {
                    genRepairers[gen.id] = (genRepairers[gen.id] || 0) + 1;
                    if (p.satoBuffTime && p.satoBuffTime > 0) {
                      genRepairMultiplier[gen.id] = (genRepairMultiplier[gen.id] || 1.0) * 1.10;
                    }
                    if (p.jackBuffTime && p.jackBuffTime > 0) {
                      genRepairMultiplier[gen.id] = (genRepairMultiplier[gen.id] || 1.0) * 1.10;
                    }
                  }
                }
              }
            });
          }
        });

        // 更新發電機進度
        setGenerators(prevGens =>
          prevGens.map(gen => {
            if (gen.isCompleted || !gen.isTargetGen) return gen;
            const count = genRepairers[gen.id] || 0;
            if (count > 0) {
              const multiFactor = Math.pow(1.25, count - 1);
              const skillBonus = genRepairMultiplier[gen.id] || 1.0;
              const ratePerSec = (100 / 90) * multiFactor * skillBonus;
              const newProg = Math.min(100, gen.progress + ratePerSec * delta);
              const isNowDone = newProg >= 100;
              if (isNowDone && !gen.isCompleted) {
                sound.playGenCompleteSound();
              }

              // 更新 2D 貼圖
              const gMesh = generatorMeshesRef.current?.[gen.id];
              if (gMesh && gMesh.userData?.spriteVisual?.material) {
                const targetMap = isNowDone ? hasfixTexture : unfixTexture;
                if (gMesh.userData.spriteVisual.material.map !== targetMap) {
                  gMesh.userData.spriteVisual.material.map = targetMap;
                  gMesh.userData.spriteVisual.material.needsUpdate = true;
                }
              }

              return { ...gen, progress: newProg, isCompleted: isNowDone, repairingCount: count };
            }
            return gen;
          })
        );

        // 3. 逃生大門進度
        const completedGensCount = generators.filter(g => g.isCompleted).length;
        const gatesArePowered = completedGensCount >= 5;

        // 4. 計算每個玩家的移動、AI 行為與狀態變更
        const updatedPlayers = prevPlayers.map(p => {
          let nx = p.x;
          let nz = p.z;
          let rot = p.rotationY;
          let health = p.health;
          let cageTimer = p.cageTimer;
          let skillCD = Math.max(0, p.skillCooldown - delta);
          let attackCD = Math.max(0, (p.attackCooldown || 0) - delta);
          let skillActive = Math.max(0, p.skillActiveTime - delta);
          let hitBoostTime = Math.max(0, (p.hitBoostTime || 0) - delta);
          let frostbiteTime = Math.max(0, (p.frostbiteTime || 0) - delta);
          let elenaBuffTime = Math.max(0, (p.elenaBuffTime || 0) - delta);
          let berserkTime = Math.max(0, (p.berserkTime || 0) - delta);
          let tariqStealthTime = Math.max(0, (p.tariqStealthTime || 0) - delta);
          let tariqSpeedBoostTime = Math.max(0, (p.tariqSpeedBoostTime || 0) - delta);
          let jackBuffTime = Math.max(0, (p.jackBuffTime || 0) - delta);
          let vikingBuffTime = Math.max(0, (p.vikingBuffTime || 0) - delta);
          let satoBuffTime = Math.max(0, (p.satoBuffTime || 0) - delta);

          // 計算移動速度
          let speed = p.speed;
          if (p.faction === 'killer') {
            const baseKiller = 6.2;
            if (p.characterId === 'elena' && elenaBuffTime > 0) speed = baseKiller * 1.25;
            else if (p.characterId === 'gourmet' && berserkTime > 0) speed = baseKiller * 1.15;
            else speed = baseKiller;
          } else {
            if (health === 'downed' || health === 'caged' || health === 'dead' || health === 'escaped') {
              speed = 0;
            } else if (hitBoostTime > 0) {
              speed = 8.0;
            } else {
              let survBase = 5.0;
              if (frostbiteTime > 0) survBase *= 0.85;
              if (vikingBuffTime > 0) survBase *= 1.5;
              if (tariqSpeedBoostTime > 0) survBase *= 1.35;
              speed = survBase;
            }
          }

          // 關押倒數計時
          if (health === 'caged') {
            cageTimer -= delta;
            if (cageTimer <= 0) {
              health = 'dead';
              sound.playScreamSound();
            }
          }

          // --- 人類玩家輸入與移動 ---
          if (p.id === humanPlayerId) {
            // 互動提示
            if (health === 'caged') {
              promptMessage = `你已被關進監牢！等待隊友前來解救 (剩餘 ${Math.max(0, Math.ceil(cageTimer))}s)...`;
            } else if (health === 'downed') {
              promptMessage = '你已瀕死倒地，原地無法移動，請等待隊友前來急救...';
            } else if (p.faction === 'killer') {
              // 殺手【普通互動/攻擊 (Space 鍵)】判定規格：
              // 1. 若範圍內有正常/受傷逃生者：觸發普通攻擊
              // 2. 若範圍內有被擊倒逃生者：執行送進監獄動作
              // 3. 若範圍內有有修理進度的電箱：執行破壞電箱動作
              const targetSurv = prevPlayers.find(
                s => s.faction === 'survivor' &&
                     (s.health === 'healthy' || s.health === 'injured') &&
                     (!s.hitBoostTime || s.hitBoostTime <= 0) &&
                     Math.hypot(s.x - nx, s.z - nz) <= 2.8
              );

              const downedSurv = prevPlayers.find(
                s => s.faction === 'survivor' &&
                     s.health === 'downed' &&
                     Math.hypot(s.x - nx, s.z - nz) <= 2.8
              );

              const targetGen = generators.find(
                g => !g.isCompleted && g.progress > 0 && Math.hypot(g.x - nx, g.z - nz) <= 2.8
              );

              if (targetSurv) {
                promptMessage = `按下 [空白鍵 Space] 揮擊近戰攻擊 ${targetSurv.name}！`;
              } else if (downedSurv) {
                promptMessage = `按下 [空白鍵 Space] 將倒地的 ${downedSurv.name} 押送進監牢！`;
              } else if (targetGen) {
                promptMessage = `按下 [空白鍵 Space] 破壞修復中的電箱 (${Math.floor(targetGen.progress)}%)！`;
              }

              if (isSpacePressed && attackCD <= 0) {
                if (targetSurv) {
                  // 1. 觸發普通攻擊
                  attackCD = 1.5;
                  sound.playHitSound();
                  sound.playScreamSound();
                  const prevH = targetSurv.health;
                  const newH: HealthState = prevH === 'healthy' ? 'injured' : 'downed';
                  
                  prevPlayers = prevPlayers.map(other => {
                    if (other.id === targetSurv.id) {
                      return {
                        ...other,
                        health: newH,
                        hitBoostTime: newH === 'injured' ? 2.0 : 0,
                        healProgress: 0,
                        cagingProgress: 0,
                      };
                    }
                    return other;
                  });

                  promptMessage = newH === 'downed'
                    ? `⚔️ 重擊命中！${targetSurv.name} 瀕死倒地！`
                    : `⚔️ 揮擊命中！${targetSurv.name} 受到傷害！`;
                } else if (downedSurv) {
                  // 2. 執行送進監獄動作
                  attackCD = 1.5;
                  sound.playScreamSound();
                  
                  // 尋找最近的監牢
                  const cageList = cages.length > 0 ? cages : (mapDataRef.current?.cagePositions || []).map((pos, idx) => ({ id: idx, x: pos.x, z: pos.z, occupiedPlayerId: null }));
                  let bestCage = cageList[0] || { x: 0, z: 0 };
                  let minCageDist = 9999;
                  cageList.forEach(c => {
                    const d = Math.hypot(c.x - nx, c.z - nz);
                    if (d < minCageDist) {
                      minCageDist = d;
                      bestCage = c;
                    }
                  });

                  prevPlayers = prevPlayers.map(other => {
                    if (other.id === downedSurv.id) {
                      return {
                        ...other,
                        health: 'caged' as HealthState,
                        cageTimer: 90,
                        cageCount: (other.cageCount || 0) + 1,
                        x: bestCage.x,
                        z: bestCage.z,
                        healProgress: 0,
                        cagingProgress: 0,
                      };
                    }
                    return other;
                  });
                  promptMessage = `⛓️ 成功將倒地的 ${downedSurv.name} 押送關進監牢！`;
                } else if (targetGen) {
                  // 3. 執行破壞電箱動作
                  attackCD = 1.5;
                  sound.playSkillSound();
                  setGenerators(prevGens =>
                    prevGens.map(g => {
                      if (g.id === targetGen.id) {
                        const newProg = Math.max(0, g.progress - 15);
                        return { ...g, progress: newProg };
                      }
                      return g;
                    })
                  );
                  promptMessage = `💥 破壞電箱！減少 15% 修理進度！`;
                }
              }
            } else if (p.faction === 'survivor') {
              // 逃生者互動
              let foundAction = false;
              prevPlayers.forEach(other => {
                if (other.id !== p.id && other.faction === 'survivor') {
                  const dist = Math.hypot(other.x - nx, other.z - nz);
                  if (other.health === 'caged' && dist < 3.2) {
                    promptMessage = '長按 [空白鍵] 解救隊友！';
                    foundAction = true;
                    if (isSpacePressed) {
                      other.cageTimer = Math.max(0, other.cageTimer - 0.2);
                    }
                  } else if ((other.health === 'downed' || other.health === 'injured') && dist < 3.0) {
                    const actionName = other.health === 'downed' ? '急救復甦' : '包紮治療';
                    promptMessage = `長按 [空白鍵] ${actionName} ${other.name}`;
                    foundAction = true;
                  }
                }
              });

              if (!foundAction) {
                generators.forEach(gen => {
                  if (!gen.isCompleted) {
                    const dist = Math.hypot(gen.x - nx, gen.z - nz);
                    if (dist < 2.8) {
                      promptMessage = `長按 [空白鍵] 修理電箱 (${Math.floor(gen.progress)}%)`;
                      foundAction = true;
                    }
                  }
                });
              }

              if (!foundAction && gatesArePowered) {
                exitGates.forEach(gate => {
                  if (!gate.isOpen) {
                    const dist = Math.hypot(gate.x - nx, gate.z - nz);
                    if (dist < 3.2) {
                      promptMessage = `長按 [空白鍵] 拉下逃生大門電閘 (${Math.floor(gate.progress)}%)`;
                      foundAction = true;
                    }
                  }
                });
              }
            }

            // WASD 移動控制與動畫更新
            if (health !== 'caged' && health !== 'dead' && health !== 'escaped' && health !== 'downed') {
              const isW = !!(keysPressed.current['KeyW'] || keysPressed.current['w'] || keysPressed.current['ArrowUp']);
              const isS = !!(keysPressed.current['KeyS'] || keysPressed.current['s'] || keysPressed.current['ArrowDown']);
              const isA = !!(keysPressed.current['KeyA'] || keysPressed.current['a'] || keysPressed.current['ArrowLeft']);
              const isD = !!(keysPressed.current['KeyD'] || keysPressed.current['d'] || keysPressed.current['ArrowRight']);

              let moveForward = 0;
              let moveRight = 0;
              if (isW) moveForward += 1;
              if (isS) moveForward -= 1;
              if (isA) moveRight -= 1;
              if (isD) moveRight += 1;

              const isMoving = isW || isS || isA || isD;
              const pMesh = playerMeshesRef.current[p.id];

              if (isMoving) {
                const moveAngle = Math.atan2(-moveRight, moveForward);
                const finalAngle = cameraYaw.current + moveAngle;

                rot = finalAngle;
                const targetX = nx + Math.sin(finalAngle) * speed * delta;
                const targetZ = nz + Math.cos(finalAngle) * speed * delta;

                const moved = moveWithCollision(nx, nz, targetX, targetZ, 0.75);
                nx = moved.x;
                nz = moved.z;

                // 依據規格更新角色動畫狀態：
                // 【凍原祭司】艾琳娜：
                // - 按住 W 或 A 鍵時，每 0.5 秒在 left1.png 與 left2.png 循環切換
                // - 按住 S 或 D 鍵時，每 0.5 秒在 right1.png 與 right2.png 循環切換
                if (pMesh?.userData?.updateMovementPose) {
                  if (p.characterId === 'elena') {
                    const elenaDir = (isW || isA) ? 'left_or_forward' : 'right_or_backward';
                    pMesh.userData.updateMovementPose(delta, true, elenaDir, p.health);
                  } else {
                    pMesh.userData.updateMovementPose(delta, true, moveRight, p.health);
                  }
                }
              } else {
                // 放開按鍵時重置計時器，並立刻切回靜止狀態 front.png
                if (pMesh?.userData?.updateMovementPose) {
                  pMesh.userData.updateMovementPose(delta, false, 'idle', p.health);
                } else if (pMesh?.userData?.setPose) {
                  pMesh.userData.setPose('front');
                }
              }
            }
          } else {
            // --- AI 角色移動與行為邏輯 ---
            if (health !== 'caged' && health !== 'dead' && health !== 'escaped' && health !== 'downed') {
              if (p.faction === 'killer') {
                // 追逐最近的逃生者
                let closestSurv: PlayerState | null = null;
                let minDist = 999;
                prevPlayers.forEach(s => {
                  if (s.faction === 'survivor' && (s.health === 'healthy' || s.health === 'injured')) {
                    const d = Math.hypot(s.x - nx, s.z - nz);
                    if (d < minDist) {
                      minDist = d;
                      closestSurv = s;
                    }
                  }
                });

                const pMesh = playerMeshesRef.current[p.id];

                if (closestSurv) {
                  const surv: PlayerState = closestSurv;
                  const dx = surv.x - nx;
                  const dz = surv.z - nz;
                  const angle = Math.atan2(dx, dz);
                  rot = angle;

                  // AI Elena 投擲技能判斷
                  if (p.characterId === 'elena' && skillCD <= 0 && minDist >= 6 && minDist <= 25 && sceneRef.current) {
                    const proj = spawnIceAttackProjectile(
                      sceneRef.current,
                      p.id,
                      nx,
                      p.y || 0,
                      nz,
                      angle,
                      26,
                      35
                    );
                    iceProjectilesRef.current.push(proj);
                    skillCD = 12;
                    sound.playSkillSound();
                  }

                  if (minDist > 1.8) {
                    const targetX = nx + Math.sin(angle) * speed * delta;
                    const targetZ = nz + Math.cos(angle) * speed * delta;
                    const moved = moveWithCollision(nx, nz, targetX, targetZ, 0.75);
                    nx = moved.x;
                    nz = moved.z;

                    if (pMesh?.userData?.updateMovementPose) {
                      if (p.characterId === 'elena') {
                        const elenaDir = dx <= 0 ? 'left_or_forward' : 'right_or_backward';
                        pMesh.userData.updateMovementPose(delta, true, elenaDir, p.health);
                      } else {
                        pMesh.userData.updateMovementPose(delta, true, dx > 0 ? 1 : -1, p.health);
                      }
                    }
                  } else if (attackCD <= 0) {
                    // 近戰攻擊
                    attackCD = 2.0;
                    sound.playHitSound();
                    sound.playScreamSound();
                    if (surv.id === humanPlayerId) {
                      promptMessage = '⚠️ 受到殺手近戰重擊！';
                    }
                  }
                } else {
                  // 巡邏或待機
                  if (pMesh?.userData?.updateMovementPose) {
                    pMesh.userData.updateMovementPose(delta, false, 'idle', p.health);
                  } else if (pMesh?.userData?.setPose) {
                    pMesh.userData.setPose('front');
                  }
                }
              } else {
                // 逃生者 AI：前往最近未修完的發電機
                let targetGen: GeneratorState | null = null;
                let minGenDist = 999;
                generators.forEach(gen => {
                  if (!gen.isCompleted && gen.isTargetGen) {
                    const d = Math.hypot(gen.x - nx, gen.z - nz);
                    if (d < minGenDist) {
                      minGenDist = d;
                      targetGen = gen;
                    }
                  }
                });

                const pMesh = playerMeshesRef.current[p.id];

                if (targetGen) {
                  const g: GeneratorState = targetGen;
                  const dx = g.x - nx;
                  const dz = g.z - nz;
                  const dist = Math.hypot(dx, dz);
                  if (dist > 2.2) {
                    const angle = Math.atan2(dx, dz);
                    rot = angle;
                    const targetX = nx + Math.sin(angle) * speed * delta;
                    const targetZ = nz + Math.cos(angle) * speed * delta;
                    const moved = moveWithCollision(nx, nz, targetX, targetZ, 0.75);
                    nx = moved.x;
                    nz = moved.z;

                    if (pMesh?.userData?.updateMovementPose) {
                      pMesh.userData.updateMovementPose(delta, true, dx > 0 ? 1 : -1, p.health);
                    }
                  } else {
                    if (pMesh?.userData?.updateMovementPose) {
                      pMesh.userData.updateMovementPose(delta, false, 'idle', p.health);
                    } else if (pMesh?.userData?.setPose) {
                      pMesh.userData.setPose('front');
                    }
                  }
                }
              }
            }
          }

          return {
            ...p,
            x: nx,
            z: nz,
            rotationY: rot,
            health,
            cageTimer,
            skillCooldown: skillCD,
            attackCooldown: attackCD,
            skillActiveTime: skillActive,
            hitBoostTime,
            frostbiteTime,
            elenaBuffTime,
            berserkTime,
            tariqStealthTime,
            tariqSpeedBoostTime,
            jackBuffTime,
            vikingBuffTime,
            satoBuffTime,
          };
        });

        if (promptMessage) setActionPrompt(promptMessage);
        return updatedPlayers;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gamePhase, humanPlayerId, generators, exitGates]);

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white overflow-hidden select-none">
      {gamePhase === 'title' && (
        <TitleScreen
          onEnterGame={() => setGamePhase('menu')}
          onStartGame={() => setGamePhase('menu')}
        />
      )}
      {gamePhase === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          selectedFaction={userFaction}
          selectedCharId={userCharId}
          selectedMap={selectedMap}
        />
      )}
      {gamePhase === 'playing' && (
        <>
          <div ref={canvasContainerRef} className="w-full h-full" />
          {(() => {
            const humanPlayer = players.find(p => p.id === humanPlayerId) || players[0];
            if (!humanPlayer) return null;
            return (
              <HUD
                humanPlayer={humanPlayer}
                allPlayers={players}
                characterMap={characterMap}
                generators={generators}
                exitGates={exitGates}
                killerBreakCharges={killerBreakCharges}
                matchTime={matchTime}
                noisePings={noisePings}
                actionPrompt={actionPrompt}
                mapType={activeMap}
                onSkillPress={() => triggerSkill(humanPlayerId)}
                onExitMatch={() => setGamePhase('menu')}
              />
            );
          })()}
        </>
      )}
      {gamePhase === 'gameover' && gameStats && (
        <GameOverModal stats={gameStats} onReturnMenu={() => setGamePhase('menu')} />
      )}
    </div>
  );
}