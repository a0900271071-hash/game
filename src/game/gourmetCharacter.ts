/**
 * ============================================================================
 * 【老饕】陳家豪 (Chen, Chia-Hao - The Gourmet) - 角色系統核心模組
 * ============================================================================
 * 
 * 模組核心設計職責：
 * 1. 角色基本資料、背景故事與視覺外觀定義 (Profile, Lore & Appearance)
 * 2. 角色立繪圖資陣列註冊與動作索引映射 (Sprite Assets Registry & Pose Mapping)
 * 3. 動作狀態機與 0.5 秒幀動畫計數控制器 (Movement State Machine & Frame Counter)
 * 4. 狂暴化模式 (Berserk Rage Mode) 與 深度受傷 (Deep Wound) 技能核心邏輯
 */

import { CharacterInfo, PlayerState, HealthState } from '../types';

// ============================================================================
// 1. 角色圖片資源導入與索引對照 (Sprite Asset Registry & Pose Mapping)
// ============================================================================
import gourmetFrontImg from '../assets/images/gourmet_front_1786596761494.jpg';
import gourmetLeft1Img from '../assets/images/gourmet_left1_1786596779814.jpg';
import gourmetLeft2Img from '../assets/images/gourmet_left2_1786596789512.jpg';
import gourmetRight1Img from '../assets/images/gourmet_right1_1786596801597.jpg';
import gourmetRight2Img from '../assets/images/gourmet_right2_1786596813953.jpg';
import gourmetPortraitImg from '../assets/images/gourmet_butcher_portrait_1786269324524.jpg';

/**
 * 動作姿勢枚舉與圖片陣列索引對照表
 */
export enum GourmetSpriteIndex {
  FRONT = 0,   // 正面靜止 (front.png)
  LEFT_1 = 1,  // 向左跑動 幀1 (left1.png)
  LEFT_2 = 2,  // 向左跑動 幀2 (left_2.png)
  RIGHT_1 = 3, // 向右跑動 幀1 (right1.png)
  RIGHT_2 = 4, // 向右跑動 幀2 (right2.png)
}

/**
 * 規範圖片資源陣列 (按動作索引嚴格排序)
 */
export const GOURMET_SPRITE_ASSETS: readonly string[] = [
  gourmetFrontImg,  // [0] front.png (正面靜止)
  gourmetLeft1Img,  // [1] left1.png (向左跑動 幀1)
  gourmetLeft2Img,  // [2] left_2.png (向左跑動 幀2)
  gourmetRight1Img, // [3] right1.png (向右跑動 幀1)
  gourmetRight2Img, // [4] right2.png (向右跑動 幀2)
] as const;

/**
 * 圖片鍵名對照表 (提供字串化與型別安全的檢索接口)
 */
export const GOURMET_POSE_MAP = {
  front: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.FRONT],
  left: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.LEFT_1],
  left1: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.LEFT_1],
  left2: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.LEFT_2],
  left_2: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.LEFT_2],
  right: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.RIGHT_1],
  right1: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.RIGHT_1],
  right2: GOURMET_SPRITE_ASSETS[GourmetSpriteIndex.RIGHT_2],
  portrait: gourmetPortraitImg,
} as const;

/**
 * 角色動作立繪展覽項目 (用於主選單立繪預覽與狀態機圖資檢視)
 */
export const GOURMET_SPRITE_ITEMS = [
  { key: 'front', name: 'front.png', src: GOURMET_POSE_MAP.front, description: '正面靜止 (Idle)' },
  { key: 'left1', name: 'left1.png', src: GOURMET_POSE_MAP.left1, description: '向左跑動 幀1 (Run Left 1)' },
  { key: 'left2', name: 'left_2.png', src: GOURMET_POSE_MAP.left2, description: '向左跑動 幀2 (Run Left 2)' },
  { key: 'right1', name: 'right1.png', src: GOURMET_POSE_MAP.right1, description: '向右跑動 幀1 (Run Right 1)' },
  { key: 'right2', name: 'right2.png', src: GOURMET_POSE_MAP.right2, description: '向右跑動 幀2 (Run Right 2)' },
] as const;

// ============================================================================
// 2. 角色基本設定與詳細背景故事 (Character Profile & Lore)
// ============================================================================
export const GOURMET_CHARACTER_INFO: CharacterInfo = {
  id: 'gourmet',
  name: '【老饕】陳家豪',
  title: 'The Gourmet',
  faction: 'killer',
  avatarColor: '#ef4444',
  nationality: '台灣人，亞洲男性',
  heightWeight: '180 公分，60 公斤（身形消瘦、筋骨結實，常年勞動導致皮包骨般的緊繃感）',
  career: '暗巷鮮肉攤主 / 狂暴屠夫',
  appearance:
    '【面部 / 頭部】半禿的頭頂帶有零星黑色碎髮，面部常年被一張粗糙、透著油膩灰質的工業防塵面具（或遮面灰布）覆蓋，僅露出陰冷空洞的雙眼。\n' +
    '【服裝配件】沾滿凝固黑紅血漬、洗得發白的白色橡膠圍裙，內搭磨損嚴重的黑色工作服。\n' +
    '【武器】一把長柄、厚重的傳統台灣市場專用剁肉大砍刀（菜刀），刀刃上有經年累月砍擊骨骼造成的細密缺口，散發著一股洗不掉的鐵鏽與腥甜味。\n' +
    '【風格定位】寫實主義結合強烈的美式恐怖（結合了《德州電鋸殺人狂》的狂亂屠夫感與亞洲傳統市場陰暗潮濕的視覺衝擊）。',
  personality:
    '極具暴發力與耐力，將「烹調」與「獵殺」視為同一種藝術。對食材與獵物有著冷酷殘忍的執念，在鮮血與切割的觸感中體驗病態的愉悅。',
  backstory:
    '在台灣某個老舊、人煙稀薄的傳統市場深處，有一間從不拉下鐵門休息、卻也從不見衛生局稽查的無名肉攤。攤主陳家豪總是笑臉迎人，切肉手法乾淨俐落，街坊鄰居總誇他老實、勤奮。\n\n' +
    '然而，沒人知道那些肉的來源。\n\n' +
    '早年因賭博欠下巨額高利貸的陳家豪，在走投無路之際，為了保命而殺了第一個來討債的債主。將屍體帶回肉攤分解的那個夜晚，他不僅發現了償還債務的「捷徑」，更在鮮血與切割的觸感中，徹底扭曲了心理。他開始將目光投向那些落單的遊民、外地移工，甚至是誤入舊市場的深夜遊客。\n\n' +
    '他的手法極其熟練，將「烹調」與「獵殺」視為同一種藝術。他那瘦弱的身軀下藏著令人膽寒的暴發力與耐力。直到某個暴雨夜，警方與倖存者終於破獲了那間肉舖，但當大門被撞開時，屋內空無一人——只有掛在肉勾上的殘肢，以及牆上用血寫下的神祕符號。\n\n' +
    '從那以後，陳家豪的身影便在迷霧籠罩的異空間中甦醒。他帶著他那柄永不生鏽的大砍刀，將所有試圖逃跑的倖存者，當作下一道送上砧板的優質食材。',
  skillName: '狂暴化模式 (Berserk Rage Mode)',
  skillKey: 'Shift 鍵 (進入狂暴化 30 秒)',
  skillDescription:
    '按下 Shift 鍵進入狂暴化模式 30 秒。在此狀態下砍中逃生者會使其進入「深度受傷狀態」（完全治療完恢復至健康狀態所需時間增加 1.5 倍，此狀態會大幅增加被治療時間直至完全恢復才解除）。',
  modelStyle: {
    bodyColor: 0x991b1b,
    accentColor: 0x450a0a,
    height: 1.8,
    width: 0.65,
  },
};

// ============================================================================
// 3. 移動狀態機 (State Machine & Animation Controller)
// ============================================================================
export type GourmetMovementState = 'IDLE' | 'MOVING_LEFT' | 'MOVING_RIGHT';

export interface GourmetAnimationState {
  state: GourmetMovementState;
  frameTimer: number;       // 累積時間 (秒)
  currentFrame: number;     // 0 或 1 (每 0.5 秒切換)
  currentTextureUrl: string; // 當前應顯示的圖片路徑
  poseName: 'front' | 'left1' | 'left2' | 'right1' | 'right2';
}

/**
 * 陳家豪（老饕）專屬動作狀態機控制器
 * 
 * 核心規則：
 * 1. 角色靜止時：顯示正面靜止圖 (front.png)
 * 2. 角色向左移動時：在 left1.png 與 left_2.png 每 0.5 秒切換播放
 * 3. 角色向右移動時：在 right1.png 與 right2.png 每 0.5 秒切換播放
 */
export class GourmetStateMachine {
  private static readonly FRAME_DURATION = 0.5; // 每 0.5 秒切換一幀

  private state: GourmetMovementState = 'IDLE';
  private frameTimer: number = 0;
  private currentFrame: number = 0;

  /**
   * 根據時間步長與移動向量/按鍵方向更新狀態機
   * @param deltaTime 幀間時間 (秒)
   * @param isMoving 是否正在移動
   * @param screenDeltaXOrDir 螢幕相對位移量或直接方向 ('left' | 'right')
   */
  public update(
    deltaTime: number,
    isMoving: boolean,
    screenDeltaXOrDir: number | 'left' | 'right'
  ): GourmetAnimationState {
    // 1. 角色靜止時：重置計時器，顯示正面靜止圖 (front.png)
    if (!isMoving) {
      this.state = 'IDLE';
      this.frameTimer = 0;
      this.currentFrame = 0;

      return {
        state: 'IDLE',
        frameTimer: 0,
        currentFrame: 0,
        currentTextureUrl: GOURMET_POSE_MAP.front,
        poseName: 'front',
      };
    }

    // 2. 判斷左或右移動
    // W/A 鍵或向左移動 -> MOVING_LEFT (嚴格只能 left1 與 left2 每 0.5 秒交替切換)
    // S/D 鍵或向右移動 -> MOVING_RIGHT (嚴格只能 right1 與 right2 每 0.5 秒交替切換)
    let newState: GourmetMovementState = 'MOVING_LEFT';
    if (screenDeltaXOrDir === 'left') {
      newState = 'MOVING_LEFT';
    } else if (screenDeltaXOrDir === 'right') {
      newState = 'MOVING_RIGHT';
    } else if (typeof screenDeltaXOrDir === 'number') {
      newState = screenDeltaXOrDir < -0.0001 ? 'MOVING_LEFT' : 'MOVING_RIGHT';
    }

    if (this.state !== newState) {
      this.state = newState;
      this.frameTimer = 0;
      this.currentFrame = 0;
    } else {
      // 累加計時器 (每 0.5 秒切換幀)
      this.frameTimer += Math.max(0, deltaTime);
      while (this.frameTimer >= GourmetStateMachine.FRAME_DURATION) {
        this.frameTimer -= GourmetStateMachine.FRAME_DURATION;
        this.currentFrame = (this.currentFrame + 1) % 2; // 0 與 1 交替切換
      }
    }

    // 3. 返回對應幀圖片與姿勢名稱
    if (this.state === 'MOVING_LEFT') {
      // 向左移動：left1.png 與 left_2.png 每 0.5 秒切換
      const isFrame2 = this.currentFrame === 1;
      return {
        state: 'MOVING_LEFT',
        frameTimer: this.frameTimer,
        currentFrame: this.currentFrame,
        currentTextureUrl: isFrame2 ? GOURMET_POSE_MAP.left2 : GOURMET_POSE_MAP.left1,
        poseName: isFrame2 ? 'left2' : 'left1',
      };
    } else {
      // 向右移動：right1.png 與 right2.png 每 0.5 秒切換
      const isFrame2 = this.currentFrame === 1;
      return {
        state: 'MOVING_RIGHT',
        frameTimer: this.frameTimer,
        currentFrame: this.currentFrame,
        currentTextureUrl: isFrame2 ? GOURMET_POSE_MAP.right2 : GOURMET_POSE_MAP.right1,
        poseName: isFrame2 ? 'right2' : 'right1',
      };
    }
  }

  /**
   * 取得當前狀態
   */
  public getState(): GourmetMovementState {
    return this.state;
  }
}

// ============================================================================
// 4. 技能系統：狂暴化模式 (Berserk Rage Mode) & 深度受傷 (Deep Wound)
// ============================================================================
export const GOURMET_SKILL_CONFIG = {
  SKILL_ID: 'berserk_rage_mode',
  SKILL_NAME: '狂暴化模式 (Berserk Rage Mode)',
  DURATION_SECONDS: 30,         // 狂暴化持續 30 秒
  COOLDOWN_SECONDS: 15,         // 技能冷卻 15 秒
  HEAL_TIME_MULTIPLIER: 1.5,    // 深度受傷狀態下，完全治療恢復至健康所需時間增加 1.5 倍
  ATTACK_RANGE: 2.6,            // 普通攻擊與狂暴斬擊判定距離
} as const;

export interface GourmetSkillCastResult {
  success: boolean;
  message: string;
}

/**
 * 觸發陳家豪「狂暴化模式」
 * 
 * 核心規則：
 * 1. 按下 Shift 鍵進入狂暴化模式 30 秒 (berserkTime: 30)
 * 2. 技能冷卻 15 秒 (skillCooldown: 15)
 * 3. 狂暴化模式期間揮刀命中逃生者，會附加 deepInjury: true (深度受傷)
 */
export function castGourmetRageSkill(
  gourmet: PlayerState,
  allPlayers: PlayerState[]
): { updatedPlayers: PlayerState[]; result: GourmetSkillCastResult } {
  // 冷卻檢查
  if (gourmet.skillCooldown > 0) {
    return {
      updatedPlayers: allPlayers,
      result: {
        success: false,
        message: `【狂暴化】冷卻中 (${Math.ceil(gourmet.skillCooldown)}s)`,
      },
    };
  }

  const updatedPlayers = allPlayers.map(p => {
    if (p.id === gourmet.id) {
      return {
        ...p,
        berserkTime: GOURMET_SKILL_CONFIG.DURATION_SECONDS,   // 30 秒狂暴化
        skillCooldown: GOURMET_SKILL_CONFIG.COOLDOWN_SECONDS, // 15 秒冷卻
      };
    }
    return p;
  });

  return {
    updatedPlayers,
    result: {
      success: true,
      message: '🔪【老饕】陳家豪進入狂暴化模式 (30s)！此狀態下砍中逃生者將施加深度受傷！',
    },
  };
}

/**
 * 計算老饕攻擊命中結算 (普通攻擊 vs 狂暴化斬擊)
 * 
 * @param killer 殺手狀態 (陳家豪)
 * @param target 逃生者目標
 * @returns 結算後的逃生者狀態更新
 */
export function processGourmetHitOnSurvivor(
  killer: PlayerState,
  target: PlayerState
): { nextHealth: HealthState; deepInjury: boolean; message: string } {
  const isBerserk = (killer.berserkTime || 0) > 0;
  let nextHealth: HealthState = target.health;
  let deepInjury = target.deepInjury || false;
  let message = '';

  if (target.health === 'healthy') {
    nextHealth = 'injured';
    if (isBerserk) {
      deepInjury = true; // 狂暴狀態命中：進入深度受傷狀態 (治療耗時 +1.5x)
      message = `🔪【老饕】狂暴斬擊重創 ${target.name}！造成受傷並附加「深度受傷」（治療時間增加 1.5 倍）！`;
    } else {
      message = `🔪【老饕】剁肉刀砍中 ${target.name}！造成受傷！`;
    }
  } else if (target.health === 'injured') {
    nextHealth = 'downed';
    if (isBerserk) {
      deepInjury = true;
      message = `🔪【老饕】狂暴斬擊直接將受傷的 ${target.name} 擊倒瀕死！`;
    } else {
      message = `🔪【老饕】剁肉刀將受傷的 ${target.name} 擊倒瀕死！`;
    }
  }

  return {
    nextHealth,
    deepInjury,
    message,
  };
}
