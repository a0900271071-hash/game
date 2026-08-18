/**
 * ============================================================================
 * 【塔里克·阿爾-哈希姆】(Tariq Al-Hashim) - 角色系統核心模組
 * ============================================================================
 * 
 * 模組核心功能與架構：
 * 1. 角色基本設定與詳細背景故事 (Profile, Lore & Visual Aesthetic)
 * 2. 6 張圖片資源陣列與動作索引對應 (6-Sprite Asset Registry & Pose Map)
 * 3. 動作狀態機與 0.5 秒幀動畫控制器 (Movement State Machine & Frame Counter)
 * 4. 專屬技能「背叛之影 / Betrayal Cover」條件判定與觸發引擎 (Unique Skill Engine)
 * 
 * 技能觸發機制 (Unique Perk):
 * - 只有在「塔里克」與「另一名逃生者」同時處於殺手追逐半徑 (< 20m) 內時，Shift 技能才會解鎖並生效。
 * - 條件未達成時按 Shift 鍵無反應。
 * - 生效時：
 *   1. 塔里克自身氣場與足跡消失 10 秒 (Stealth)。
 *   2. 該被追逐隊友的氣場與足跡更加顯著 10 秒 (成為誘餌替死鬼)。
 *   3. 塔里克自身獲得額外移動速度加成 5 秒 (+35% 移速爆發)。
 *   4. 進入 15 秒冷卻時間。
 */

import { CharacterInfo, PlayerState } from '../types';

// ============================================================================
// 1. 角色圖片資源導入 (6 Sprite Asset Imports)
// ============================================================================
// 正面靜止 (front.png)
import tariqFrontImg from '../assets/images/tariq_front_1786697006459.jpg';
// 向左跑動 幀 1 (left1.png)
import tariqLeft1Img from '../assets/images/tariq_left1_1786697023880.jpg';
// 向左跑動 幀 2 (left_2.png)
import tariqLeft2Img from '../assets/images/tariq_left2_1786697038356.jpg';
// 向右跑動 幀 1 (right1.png)
import tariqRight1Img from '../assets/images/tariq_right1_1786697052573.jpg';
// 向右跑動 幀 2 (right2.png)
import tariqRight2Img from '../assets/images/tariq_right2_1786697068446.jpg';
// 被擊倒 (ko.png)
import tariqKoImg from '../assets/images/tariq_ko_1786697088052.jpg';
// 角色頭像 (Portrait)
import tariqPortraitImg from '../assets/images/tariq_portrait_1786269287059.jpg';

/**
 * 動作姿勢枚舉與圖片陣列索引對照表 (0~5)
 */
export enum TariqSpriteIndex {
  FRONT = 0,   // 正面靜止 (front.png)
  LEFT_1 = 1,  // 向左跑動 幀 1 (left1.png)
  LEFT_2 = 2,  // 向左跑動 幀 2 (left_2.png)
  RIGHT_1 = 3, // 向右跑動 幀 1 (right1.png)
  RIGHT_2 = 4, // 向右跑動 幀 2 (right2.png)
  KO = 5,      // 被殺手擊倒 (ko.png)
}

/**
 * 規範圖片資源陣列 (按動作索引精確排序)
 */
export const TARIQ_SPRITE_ASSETS: readonly string[] = [
  tariqFrontImg,  // [0] front.png (正面靜止)
  tariqLeft1Img,  // [1] left1.png (向左跑動 幀 1)
  tariqLeft2Img,  // [2] left_2.png (向左跑動 幀 2)
  tariqRight1Img, // [3] right1.png (向右跑動 幀 1)
  tariqRight2Img, // [4] right2.png (向右跑動 幀 2)
  tariqKoImg,     // [5] ko.png (被擊倒)
] as const;

/**
 * 圖片鍵名對照表 (供 3D Mesh 與 UI 檢索)
 */
export const TARIQ_POSE_MAP = {
  front: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.FRONT],
  left: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.LEFT_1],
  left1: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.LEFT_1],
  left2: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.LEFT_2],
  left_2: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.LEFT_2],
  right: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.RIGHT_1],
  right1: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.RIGHT_1],
  right2: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.RIGHT_2],
  ko: TARIQ_SPRITE_ASSETS[TariqSpriteIndex.KO],
} as const;

// ============================================================================
// 2. 角色基本設定與詳細背景故事 (Basic Profile & Lore)
// ============================================================================
export const TARIQ_CHARACTER_INFO: CharacterInfo = {
  id: 'tariq',
  name: '塔里克·阿爾-哈希姆 (Tariq Al-Hashim)',
  title: '狡詐潛伏者 (The Cunning Infiltrator)',
  faction: 'survivor',
  avatarColor: '#a855f7',
  nationality: '南非人（具備混合血統與中東生活背景）',
  heightWeight: '165 公分 / 55 公斤（身材精瘦、敏捷，擅長在狹窄空間中鑽動與躲藏）',
  career: '前極端組織 ISIS 敵後滲透情報刺探者 / 南非籍流亡移工',
  appearance:
    '【臉頰與膚色】深棕色，帶有風沙吹拂與長期熬夜的粗糙質感；\n' +
    '【頭髮】全黑色、凌亂且帶有油光的短髮；\n' +
    '【服裝點綴】外罩一件中東傳統的黑白相間傳統長袍（Keffiyeh風格融合日常戰術服飾），長袍邊緣沾滿塵土、乾涸的血跡與撕裂的破口，在黑暗中能形成獨特的視覺剪影；\n' +
    '【細節表現】眼神閃爍多疑、驚恐中帶著算計的冷酷。走路習慣壓低身形、貼牆而行；受傷時發出壓抑的喘息聲，但眼神仍死死盯著周遭的人。',
  personality:
    '冷酷殘酷、自私自利的極致求生哲學。「為達目的不擇手段」，在他眼中，其他的逃生者不是並肩作戰的夥伴，而是隨時可以犧牲的誘餌與擋箭牌。',
  backstory:
    '表面上，塔里克是一名流亡海外、尋求庇護的南非籍移工；實際上，他曾是極端組織 ISIS 內部負責敵後滲透與情報刺探的狡詐潛伏者。他在無數次殘酷的生存與追殺中磨練出極其冷血的求生本能。\n\n' +
    '當他被捲入這個超自然的恐怖異空間時，他那套「為達目的不擇手段」的生存哲學並未改變——在他眼中，其他的逃生者不是並肩作戰的夥伴，而是隨時可以犧牲的誘餌與擋箭牌。',
  skillName: '背叛之影 (Shadow of Betrayal)',
  skillKey: 'Shift 鍵 (雙人被追逐時解鎖)',
  skillDescription:
    '當你與另一名逃生者同時被殺手追逐時解鎖：按下 Shift 鍵消失自己的氣場及足跡 10 秒，並讓被牽連隊友的足跡與氣場更明顯 10 秒（成為誘餌替死鬼），同時塔里克自身獲得額外移動速度加成 5 秒。只有在同時被追逐時才可觸發。冷卻時間 15 秒。',
  modelStyle: {
    bodyColor: 0x6b21a8,
    accentColor: 0xe2e8f0,
    height: 1.65, // 165 公分精瘦敏捷
    width: 0.48,
  },
};

// ============================================================================
// 3. 移動狀態機 (State Machine & Animation Controller)
// ============================================================================
export type TariqMovementState = 'IDLE' | 'MOVING_LEFT' | 'MOVING_RIGHT' | 'DOWNED';

export interface TariqAnimationState {
  state: TariqMovementState;
  frameTimer: number;       // 當前幀累計時間 (秒)
  currentFrame: number;     // 0 或 1 (每 0.5 秒切換)
  currentTextureUrl: string; // 當前渲染的貼圖路徑
  poseName: 'front' | 'left1' | 'left2' | 'right1' | 'right2' | 'ko';
}

/**
 * 塔里克專屬動作狀態機控制器
 * 嚴格遵循：
 * 1. 角色靜止時：顯示正面靜止圖 (front.png)。
 * 2. 角色向左移動時：在 left1.png 與 left_2.png 每 0.5 秒切換播放。
 * 3. 角色向右移動時：在 right1.png 與 right2.png 每 0.5 秒切換播放。
 * 4. 角色被擊倒時：顯示 ko.png。
 */
export class TariqStateMachine {
  private static readonly FRAME_DURATION = 0.5; // 每 0.5 秒切換一幀動畫

  private state: TariqMovementState = 'IDLE';
  private frameTimer: number = 0;
  private currentFrame: number = 0;

  /**
   * 根據時間步長、移動狀態、按鍵方向與血量狀態更新狀態機
   * @param deltaTime 幀間時間 (秒)
   * @param isMoving 是否正在移動
   * @param screenDeltaXOrDir 螢幕相對位移量或直接方向 ('left' | 'right')
   * @param health 當前角色健康狀態 ('healthy' | 'injured' | 'downed' | 'caged' 等)
   */
  public update(
    deltaTime: number,
    isMoving: boolean,
    screenDeltaXOrDir: number | 'left' | 'right',
    health: string = 'healthy'
  ): TariqAnimationState {
    // 1. 擊倒狀態處理 (KO / Downed)
    if (health === 'downed' || health === 'caged' || health === 'dead') {
      this.state = 'DOWNED';
      this.frameTimer = 0;
      this.currentFrame = 0;

      return {
        state: 'DOWNED',
        frameTimer: 0,
        currentFrame: 0,
        currentTextureUrl: TARIQ_POSE_MAP.ko,
        poseName: 'ko',
      };
    }

    // 2. 靜止狀態處理 (IDLE)
    if (!isMoving) {
      this.state = 'IDLE';
      this.frameTimer = 0;
      this.currentFrame = 0;

      return {
        state: 'IDLE',
        frameTimer: 0,
        currentFrame: 0,
        currentTextureUrl: TARIQ_POSE_MAP.front,
        poseName: 'front',
      };
    }

    // 3. 移動方向判斷 (向左或向右)
    // W/A 鍵或向左移動 -> MOVING_LEFT (嚴格只能 left1 與 left2 每 0.5 秒交替切換)
    // S/D 鍵或向右移動 -> MOVING_RIGHT (嚴格只能 right1 與 right2 每 0.5 秒交替切換)
    let newState: TariqMovementState = 'MOVING_LEFT';
    if (screenDeltaXOrDir === 'left') {
      newState = 'MOVING_LEFT';
    } else if (screenDeltaXOrDir === 'right') {
      newState = 'MOVING_RIGHT';
    } else if (typeof screenDeltaXOrDir === 'number') {
      newState = screenDeltaXOrDir < -0.0001 ? 'MOVING_LEFT' : 'MOVING_RIGHT';
    }

    // 狀態切換時重置幀計時器
    if (this.state !== newState) {
      this.state = newState;
      this.frameTimer = 0;
      this.currentFrame = 0;
    } else {
      // 累加計時器 (每 0.5 秒切換幀)
      this.frameTimer += Math.max(0, deltaTime);
      while (this.frameTimer >= TariqStateMachine.FRAME_DURATION) {
        this.frameTimer -= TariqStateMachine.FRAME_DURATION;
        this.currentFrame = (this.currentFrame + 1) % 2; // 0 與 1 交替循環
      }
    }

    // 4. 根據狀態與當前幀組裝貼圖與姿勢
    if (this.state === 'MOVING_LEFT') {
      const isFrame0 = this.currentFrame === 0;
      return {
        state: 'MOVING_LEFT',
        frameTimer: this.frameTimer,
        currentFrame: this.currentFrame,
        currentTextureUrl: isFrame0 ? TARIQ_POSE_MAP.left1 : TARIQ_POSE_MAP.left2,
        poseName: isFrame0 ? 'left1' : 'left2',
      };
    }

    // MOVING_RIGHT
    const isFrame0 = this.currentFrame === 0;
    return {
      state: 'MOVING_RIGHT',
      frameTimer: this.frameTimer,
      currentFrame: this.currentFrame,
      currentTextureUrl: isFrame0 ? TARIQ_POSE_MAP.right1 : TARIQ_POSE_MAP.right2,
      poseName: isFrame0 ? 'right1' : 'right2',
    };
  }

  /**
   * 重置狀態機
   */
  public reset(): void {
    this.state = 'IDLE';
    this.frameTimer = 0;
    this.currentFrame = 0;
  }
}

// ============================================================================
// 4. 專屬技能引擎 (Unique Perk Engine - Betrayal Cover)
// ============================================================================

export interface TariqSkillCheckResult {
  canActivate: boolean;
  targetTeammate: PlayerState | null;
  tariqDistToKiller: number;
  teammateDistToKiller: number;
  reason?: string;
}

/**
 * 檢查塔里克是否滿足施放技能的條件：
 * 【條件】：塔里克自身與另一名存活逃生者「同時被殺手追逐」
 * (雙方與殺手的直線距離均小於 chaseRadius，預設 20 公尺)
 */
export function checkTariqSkillCondition(
  tariq: PlayerState,
  allPlayers: PlayerState[],
  chaseRadius: number = 20
): TariqSkillCheckResult {
  // 基本冷卻與狀態檢查
  if (tariq.skillCooldown > 0) {
    return {
      canActivate: false,
      targetTeammate: null,
      tariqDistToKiller: Infinity,
      teammateDistToKiller: Infinity,
      reason: `技能冷卻中 (${Math.ceil(tariq.skillCooldown)}s)`,
    };
  }

  if (tariq.health === 'caged' || tariq.health === 'dead' || tariq.health === 'escaped') {
    return {
      canActivate: false,
      targetTeammate: null,
      tariqDistToKiller: Infinity,
      teammateDistToKiller: Infinity,
      reason: '當前狀態無法施放技能',
    };
  }

  // 尋找殺手玩家
  const killer = allPlayers.find(p => p.faction === 'killer');
  if (!killer) {
    return {
      canActivate: false,
      targetTeammate: null,
      tariqDistToKiller: Infinity,
      teammateDistToKiller: Infinity,
      reason: '未找到殺手',
    };
  }

  // 計算塔里克與殺手的距離
  const tariqDist = Math.hypot(tariq.x - killer.x, tariq.z - killer.z);
  if (tariqDist > chaseRadius) {
    return {
      canActivate: false,
      targetTeammate: null,
      tariqDistToKiller: tariqDist,
      teammateDistToKiller: Infinity,
      reason: '未被殺手追逐 (需與隊友同時被殺手追逐)',
    };
  }

  // 尋找同樣在殺手追逐半徑內的另一名逃生者隊友
  let nearestChaseTeammate: PlayerState | null = null;
  let minTeammateDist = Infinity;

  allPlayers.forEach(p => {
    if (
      p.id !== tariq.id &&
      p.faction === 'survivor' &&
      (p.health === 'healthy' || p.health === 'injured')
    ) {
      const d = Math.hypot(p.x - killer.x, p.z - killer.z);
      if (d <= chaseRadius && d < minTeammateDist) {
        minTeammateDist = d;
        nearestChaseTeammate = p;
      }
    }
  });

  if (!nearestChaseTeammate) {
    return {
      canActivate: false,
      targetTeammate: null,
      tariqDistToKiller: tariqDist,
      teammateDistToKiller: Infinity,
      reason: '身旁無其他隊友被殺手追逐 (無法使用隊友作為誘餌)',
    };
  }

  return {
    canActivate: true,
    targetTeammate: nearestChaseTeammate,
    tariqDistToKiller: tariqDist,
    teammateDistToKiller: minTeammateDist,
  };
}

/**
 * 施放塔里克專屬技能「背叛之影」
 * @param tariq 施法者
 * @param allPlayers 全體玩家
 * @returns 包含更新後玩家陣列與提示訊息的結果
 */
export function castTariqBetrayalSkill(
  tariq: PlayerState,
  allPlayers: PlayerState[]
): {
  updatedPlayers: PlayerState[];
  success: boolean;
  message: string;
  targetTeammateId: string | null;
} {
  const check = checkTariqSkillCondition(tariq, allPlayers);

  if (!check.canActivate || !check.targetTeammate) {
    return {
      updatedPlayers: allPlayers,
      success: false,
      message: check.reason || '未滿足施放條件 (需與另一名隊友同時被殺手追逐)',
      targetTeammateId: null,
    };
  }

  const teammate = check.targetTeammate;

  // 執行技能數值更新：
  // 1. 塔里克：獲得 10 秒隱形氣場與足跡消除 (tariqStealthTime = 10)、5 秒移動速度爆發 (tariqSpeedBoostTime = 5)、冷卻 15 秒
  // 2. 被背叛的隊友：獲得 10 秒高亮誘餌氣場 (betrayedTeammateTime = 10)
  const updatedPlayers = allPlayers.map(p => {
    if (p.id === tariq.id) {
      return {
        ...p,
        skillCooldown: 15,          // 15 秒冷卻
        skillActiveTime: 10,        // 技能持續時間
        tariqStealthTime: 10,       // 自身消失氣場與足跡 10 秒
        tariqSpeedBoostTime: 5,     // 額外跑速加成 5 秒
        betrayedTeammateId: teammate.id,
        betrayedTeammateTime: 10,
      };
    }

    if (p.id === teammate.id) {
      return {
        ...p,
        betrayedTeammateTime: 10,   // 被作為誘餌，氣場與足跡更加顯著 10 秒
      };
    }

    return p;
  });

  return {
    updatedPlayers,
    success: true,
    message: `💀 塔里克發動【背叛之影】！已隱藏自身氣場與足跡並加速，將殺手注意力轉移至 ${teammate.name}！`,
    targetTeammateId: teammate.id,
  };
}
