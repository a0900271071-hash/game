/**
 * ============================================================================
 * 【被加班吞噬的幽魂】佐藤 健人 (Kento Sato) - 角色系統核心模組
 * ============================================================================
 * 
 * 模組職責：
 * 1. 角色基本設定與詳細背景故事 (Lore & Character Profile)
 * 2. 6 張寫實美式恐怖風格圖片資源註冊與動作索引對應 (Sprite Asset Registry & Pose Map)
 * 3. 狀態機與 0.5 秒幀動畫控制器 (KentoStateMachine & Frame Timer)
 * 4. 恐懼應激 / 社畜絕境修機核心技能邏輯 (Panic Overwork Surge Engine)
 */

import { CharacterInfo, PlayerState, HealthState, PoseType } from '../types';

// ============================================================================
// 1. 角色圖片資源導入 (6-Sprite Asset Imports)
// ============================================================================
import kentoFrontImg from '../assets/images/kento_front_1786459477086.jpg';
import kentoLeft1Img from '../assets/images/kento_left1_1786459492760.jpg';
import kentoLeft2Img from '../assets/images/kento_left2_1786459507839.jpg';
import kentoRight1Img from '../assets/images/kento_right1_1786459523470.jpg';
import kentoRight2Img from '../assets/images/kento_right2_1786459539210.jpg';
import kentoKoImg from '../assets/images/kento_ko_1786459552948.jpg';
import kentoPortraitImg from '../assets/images/kento_sato_portrait_1786269244427.jpg';

/**
 * 動作姿勢枚舉與圖片陣列索引對照
 */
export enum KentoSpriteIndex {
  FRONT = 0,   // 正面靜止 (front.png)
  LEFT_1 = 1,  // 向左跑動 幀 1 (left1.png)
  LEFT_2 = 2,  // 向左跑動 幀 2 (left_2.png)
  RIGHT_1 = 3, // 向右跑動 幀 1 (right1.png)
  RIGHT_2 = 4, // 向右跑動 幀 2 (right2.png)
  KO = 5,      // 被殺手擊倒 (ko.png)
}

/**
 * 規範圖片資源陣列 (按動作索引排序)
 */
export const KENTO_SPRITE_ASSETS: readonly string[] = [
  kentoFrontImg,   // [0] front.png (正面靜止)
  kentoLeft1Img,   // [1] left1.png (向左跑動 幀 1)
  kentoLeft2Img,   // [2] left_2.png (向左跑動 幀 2)
  kentoRight1Img,  // [3] right1.png (向右跑動 幀 1)
  kentoRight2Img,  // [4] right2.png (向右跑動 幀 2)
  kentoKoImg,      // [5] ko.png (被殺手擊倒)
] as const;

/**
 * 圖片鍵名對照表 (供 3D Mesh 與渲染系統檢索)
 */
export const KENTO_POSE_MAP = {
  front: KENTO_SPRITE_ASSETS[KentoSpriteIndex.FRONT],
  left: KENTO_SPRITE_ASSETS[KentoSpriteIndex.LEFT_1],
  left1: KENTO_SPRITE_ASSETS[KentoSpriteIndex.LEFT_1],
  left2: KENTO_SPRITE_ASSETS[KentoSpriteIndex.LEFT_2],
  left_2: KENTO_SPRITE_ASSETS[KentoSpriteIndex.LEFT_2],
  right: KENTO_SPRITE_ASSETS[KentoSpriteIndex.RIGHT_1],
  right1: KENTO_SPRITE_ASSETS[KentoSpriteIndex.RIGHT_1],
  right2: KENTO_SPRITE_ASSETS[KentoSpriteIndex.RIGHT_2],
  ko: KENTO_SPRITE_ASSETS[KentoSpriteIndex.KO],
} as const;

// ============================================================================
// 2. 角色基本設定與詳細設定資料 (Character Info)
// ============================================================================
export const KENTO_CHARACTER_INFO: CharacterInfo = {
  id: 'kento',
  name: '【被加班吞噬的幽魂】佐藤 健人',
  title: 'Kento Sato, The Overworked Wraith',
  faction: 'survivor',
  avatarColor: '#60a5fa',
  nationality: '日本 / 黃種人',
  heightWeight: '170 公分 / 70 公斤 (奔跑時笨拙駝背，雙手死死抱護著公事包)',
  career: '資深大型企業資深行銷主任（長期深陷無止境加班與職場壓力的典型日本社畜）',
  appearance:
    '【面部特徵】亞洲男性面孔，面部肌肉長期因慢性疲勞而緊繃。雙眼佈滿血絲，黑眼圈極深，眼神空洞且常帶有驚恐與麻木交織的神情。臉頰略顯凹陷，嘴唇乾裂，額頭上有因長期用手揉捏而留下的微紅壓痕。\n' +
    '【髮型】凌亂的黑髮，幾絲油膩的瀏海垂在額前，暗示他已經好幾天沒有好好梳洗或休息。\n' +
    '【服裝配色】身穿一套剪裁原本筆挺、如今卻皺巴巴的深藍色全套西裝。西裝外套沾滿了黑色的墨漬與灰燼，白襯衫的領口被粗魯地扯開，領帶歪斜地掛在胸前，甚至有一端不小心被咖啡漬染黑。\n' +
    '【細節配件】手腕上戴著一隻指針永遠停在「深夜 23:45」的機械手錶；肩膀上斜背著一個皮革已經磨損、塞滿過期文件與發票的公事包。',
  personality:
    '極度焦慮、疲憊不堪、對權威有本能的恐懼，但在絕境中卻意外展現出無比頑強的「社畜韌性」——既然連地獄般的公司都熬得過，這場惡夢或許也能咬牙撐過去。奔跑時姿勢有些笨拙且駝背，雙手死死護著公事包，彷彿那是他在這個殘酷世界裡唯一的護身符。',
  backstory:
    '佐藤健人在一家跨國企業擔任螺絲釘般的基層主管，無止境的加班、上司的苛責和龐大的房貸壓力讓他早已形同枯槁。\n\n' +
    '某天深夜，他在公司大樓準備搭乘深夜電梯返家時，電梯門打開卻沒有迎來熟悉的地下停車場，而是一片濃霧與血腥味的詭異荒蕪世界。起初，他以為這只是另一場過勞引起的噩夢，直到冰冷的追殺聲在耳邊響起，他才意識到——這場加班，永遠不會有打卡下班的一刻。',
  skillName: '恐懼應激 / 社畜絕境爆發 (Panic Work Surge)',
  skillKey: 'Shift 鍵 (僅在恐懼尖叫狀態下可觸發)',
  skillDescription:
    '當佐藤健人發生「因恐懼而尖叫」的狀況時，按下 Shift 鍵可將極度恐慌轉化為高度專注的社畜本能，使修理電箱速度增加 10%（持續 20 秒，冷卻時間 15 秒）。\n' +
    '【限制規範】：若無因恐懼而尖叫的狀況，無法使用 Shift 鍵（按了無任何反應），且嚴格禁止角色主動按 Shift 自行觸發尖叫。',
  modelStyle: {
    bodyColor: 0x3b82f6,
    accentColor: 0x1e3a8a,
    height: 1.7,
    width: 0.55,
  },
};

// ============================================================================
// 3. 移動狀態機 (State Machine & Animation Controller)
// ============================================================================
export type KentoMovementState = 'IDLE' | 'MOVING_LEFT' | 'MOVING_RIGHT' | 'DOWNED';

export interface KentoAnimationState {
  state: KentoMovementState;
  frameIndex: number;
  poseName: PoseType;
  spriteIndex: KentoSpriteIndex;
}

/**
 * 佐藤 健人專屬動作狀態機
 * 負責依據 0.5 秒幀計時器切換 left1/left2 或 right1/right2，並在靜止時返回 front，倒地時返回 ko
 */
export class KentoStateMachine {
  private currentState: KentoMovementState = 'IDLE';
  private frameTimer: number = 0;
  private currentFrameIndex: number = 0; // 0: 幀1, 1: 幀2
  public readonly FRAME_DURATION: number = 0.5; // 每 0.5 秒切換幀

  /**
   * 重設狀態機
   */
  public reset(): void {
    this.currentState = 'IDLE';
    this.frameTimer = 0;
    this.currentFrameIndex = 0;
  }

  /**
   * 根據時間差、移動狀態、橫向移動量/按鍵方向及生命狀態更新姿勢
   * @param deltaTime 幀時間增量 (秒)
   * @param isMoving 是否正在移動
   * @param screenDeltaXOrDir 螢幕相對橫向位移 (負: 向左, 正: 向右) 或方向 ('left' | 'right')
   * @param health 角色生命狀態
   */
  public update(
    deltaTime: number,
    isMoving: boolean,
    screenDeltaXOrDir: number | 'left' | 'right',
    health: HealthState = 'healthy'
  ): KentoAnimationState {
    // 1. 被擊倒 / 瀕死判定 (優先權最高)
    if (health === 'downed' || health === 'caged' || health === 'dead') {
      this.currentState = 'DOWNED';
      this.frameTimer = 0;
      this.currentFrameIndex = 0;
      return {
        state: 'DOWNED',
        frameIndex: 0,
        poseName: 'ko',
        spriteIndex: KentoSpriteIndex.KO,
      };
    }

    // 2. 靜止狀態
    if (!isMoving) {
      this.currentState = 'IDLE';
      this.frameTimer = 0;
      this.currentFrameIndex = 0;
      return {
        state: 'IDLE',
        frameIndex: 0,
        poseName: 'front',
        spriteIndex: KentoSpriteIndex.FRONT,
      };
    }

    // 3. 移動狀態 (W/A 向左，S/D 向右)
    let movingLeft = false;
    if (screenDeltaXOrDir === 'left') {
      movingLeft = true;
    } else if (screenDeltaXOrDir === 'right') {
      movingLeft = false;
    } else if (typeof screenDeltaXOrDir === 'number') {
      movingLeft = screenDeltaXOrDir < -0.005;
    }

    const targetState: KentoMovementState = movingLeft ? 'MOVING_LEFT' : 'MOVING_RIGHT';

    if (this.currentState !== targetState) {
      this.currentState = targetState;
      this.frameTimer = 0;
      this.currentFrameIndex = 0;
    } else {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.FRAME_DURATION) {
        this.frameTimer -= this.FRAME_DURATION;
        this.currentFrameIndex = (this.currentFrameIndex + 1) % 2;
      }
    }

    // 4. 產出對應姿勢與圖片索引
    if (this.currentState === 'MOVING_LEFT') {
      const poseName: PoseType = this.currentFrameIndex === 0 ? 'left1' : 'left2';
      const spriteIndex =
        this.currentFrameIndex === 0 ? KentoSpriteIndex.LEFT_1 : KentoSpriteIndex.LEFT_2;
      return {
        state: 'MOVING_LEFT',
        frameIndex: this.currentFrameIndex,
        poseName,
        spriteIndex,
      };
    } else {
      const poseName: PoseType = this.currentFrameIndex === 0 ? 'right1' : 'right2';
      const spriteIndex =
        this.currentFrameIndex === 0 ? KentoSpriteIndex.RIGHT_1 : KentoSpriteIndex.RIGHT_2;
      return {
        state: 'MOVING_RIGHT',
        frameIndex: this.currentFrameIndex,
        poseName,
        spriteIndex,
      };
    }
  }

  public getCurrentState(): KentoMovementState {
    return this.currentState;
  }
}

// ============================================================================
// 4. 恐懼應激 / 社畜修機核心技能邏輯 (Panic Overwork Surge Engine)
// ============================================================================

export interface KentoSkillCheckResult {
  canActivate: boolean;
  reason?: string;
}

export interface KentoSkillExecutionResult {
  updatedPlayers: PlayerState[];
  success: boolean;
  message: string;
}

/**
 * 檢查佐藤健人是否符合技能發動條件
 * 核心條件：
 * 1. 技能不在冷卻中 (skillCooldown <= 0)
 * 2. 角色未死亡/未被送入監牢 (health !== 'caged' && health !== 'dead')
 * 3. 角色當前正處於「因恐懼而尖叫 (kentoFearScreamTime > 0)」的狀態
 * 【禁止自行主動按 Shift 觸發尖叫】
 */
export function checkKentoSkillCondition(
  caster: PlayerState,
  kentoFearScreamTime: number
): KentoSkillCheckResult {
  if (caster.characterId !== 'kento') {
    return { canActivate: false, reason: '非佐藤健人角色' };
  }

  if (caster.skillCooldown > 0) {
    return { canActivate: false, reason: `技能冷卻中 (剩餘 ${Math.ceil(caster.skillCooldown)} 秒)` };
  }

  if (caster.health === 'caged' || caster.health === 'dead') {
    return { canActivate: false, reason: '處於無法行動狀態' };
  }

  // 關鍵核心判定：必須正在發生因恐懼而尖叫的狀態
  if (kentoFearScreamTime <= 0) {
    return {
      canActivate: false,
      reason: '未處於恐懼尖叫狀態 (不可主動自爆尖叫，需被恐懼觸發尖叫後方可按下 Shift 激活)',
    };
  }

  return { canActivate: true };
}

/**
 * 執行佐藤健人專屬技能【恐懼應激 / 社畜絕境爆發】
 * 效果：
 * 1. 將驚恐轉化為專注，獲得 20 秒修機速度 +10% 加成 (satoBuffTime = 20)
 * 2. 消耗恐懼尖叫視窗 (kentoFearScreamTime 重置為 0)
 * 3. 進入 15 秒技能冷卻 (skillCooldown = 15)
 */
export function castKentoSurgeSkill(
  caster: PlayerState,
  allPlayers: PlayerState[],
  kentoFearScreamTime: number
): KentoSkillExecutionResult {
  const check = checkKentoSkillCondition(caster, kentoFearScreamTime);
  if (!check.canActivate) {
    return {
      updatedPlayers: allPlayers,
      success: false,
      message: check.reason || '無法發動技能',
    };
  }

  const updatedPlayers = allPlayers.map(p => {
    if (p.id !== caster.id) return p;
    return {
      ...p,
      skillCooldown: 15, // 15 秒冷卻
      skillActiveTime: 20, // 20 秒技能時效
      satoBuffTime: 20, // 修理電箱速度增加 10%
      kentoFearScreamTime: 0, // 消耗尖叫狀態
    };
  });

  return {
    updatedPlayers,
    success: true,
    message: '【佐藤健人・恐懼應激】將恐慌化為社畜本能！修理電箱速度 +10% (持續 20 秒)',
  };
}

export { kentoPortraitImg };
