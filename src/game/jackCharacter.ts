/**
 * ============================================================================
 * 角色核心模組：二戰美軍步兵連下士 —— 傑克・米勒 (Jack Miller)
 * ============================================================================
 *
 * 【模組職責說明】
 * 1. 管理傑克・米勒 (Jack Miller) 完整角色檔案 (Profile)、視覺特徵、戰場心理背景與立繪資源對應陣列。
 * 2. 實作以 0.5 秒為精準週期交替的跑動幀狀態機 (JackStateMachine)。
 * 3. 實作專屬角色技能【戰術強韌 / 戰地救援與修復】(Battlefield Grit & Tactical Repair)：
 *    - 觸發條件：必須處於「受傷狀況 (injured)」或「從監牢獲救後 (rescued from cage)」。
 *    - 限制防護：若未滿足上述條件，Shift 鍵無法觸發（按了無反應，不消耗冷卻）。
 *    - 技能效果：按下 Shift 鍵可增加治療隊友及修理電箱速度 10%，持續 30 秒（冷卻 15 秒）。
 */

import { PlayerState, CharacterInfo, PoseType } from '../types';

// ============================================================================
// 1. 角色立繪圖資靜態導入與資源陣列定義
// ============================================================================
import jackFrontImg from '../assets/images/jack_front_gen_1786536897511.jpg';
import jackLeft1Img from '../assets/images/jack_left1_gen_1786536918224.jpg';
import jackLeft2Img from '../assets/images/jack_left2_gen_1786536937369.jpg';
import jackRight1Img from '../assets/images/jack_right1_gen_1786536957063.jpg';
import jackRight2Img from '../assets/images/jack_right2_gen_1786536973920.jpg';
import jackKoImg from '../assets/images/jack_ko_gen_1786536990847.jpg';
import jackPortraitImg from '../assets/images/jack_miller_portrait_1786269217662.jpg';

/**
 * 動作資源索引列舉 (明確對應 6 張立繪圖片檔案)
 */
export enum JackSpriteIndex {
  FRONT = 0,    // front.png (正面靜止)
  LEFT_1 = 1,   // left1.png (向左跑動 幀 1)
  LEFT_2 = 2,   // left_2.png (向左跑動 幀 2)
  RIGHT_1 = 3,  // right1.png (向右跑動 幀 1)
  RIGHT_2 = 4,  // right2.png (向右跑動 幀 2)
  KO = 5,       // ko.png (被殺手擊倒)
}

/**
 * 圖片資源陣列 (明確映射對應的動作索引)
 */
export const JACK_SPRITE_ASSETS: readonly {
  index: JackSpriteIndex;
  key: string;
  name: string;
  src: string;
  description: string;
}[] = [
  {
    index: JackSpriteIndex.FRONT,
    key: 'front',
    name: 'front.png',
    src: jackFrontImg,
    description: '正面靜止：直立持槍警戒，眼神冷靜觀察周圍動靜',
  },
  {
    index: JackSpriteIndex.LEFT_1,
    key: 'left1',
    name: 'left1.png',
    src: jackLeft1Img,
    description: '向左跑動 幀 1：持槍壓低重心向左衝刺 (起步步伐)',
  },
  {
    index: JackSpriteIndex.LEFT_2,
    key: 'left2',
    name: 'left_2.png',
    src: jackLeft2Img,
    description: '向左跑動 幀 2：向左大步邁進、身體前傾的戰鬥奔跑',
  },
  {
    index: JackSpriteIndex.RIGHT_1,
    key: 'right1',
    name: 'right1.png',
    src: jackRight1Img,
    description: '向右跑動 幀 1：持槍壓低重心向右衝刺 (起步步伐)',
  },
  {
    index: JackSpriteIndex.RIGHT_2,
    key: 'right2',
    name: 'right2.png',
    src: jackRight2Img,
    description: '向右跑動 幀 2：向右大步邁進、身體前傾的戰鬥奔跑',
  },
  {
    index: JackSpriteIndex.KO,
    key: 'ko',
    name: 'ko.png',
    src: jackKoImg,
    description: '被殺手擊倒：癱倒於地面、步槍掉落一旁的瀕死倒地態',
  },
] as const;

/**
 * 動作姿態快速查詢映射表 (供 Three.js 看板網格即時更新貼圖)
 */
export const JACK_POSE_MAP: Record<string, string> = {
  front: jackFrontImg,
  left: jackLeft1Img,
  left1: jackLeft1Img,
  left2: jackLeft2Img,
  right: jackRight1Img,
  right1: jackRight1Img,
  right2: jackRight2Img,
  ko: jackKoImg,
  portrait: jackPortraitImg,
};

// ============================================================================
// 2. 傑克・米勒 完整角色設定 (Profile, Appearance, Personality, Lore, Skill)
// ============================================================================
export const JACK_CHARACTER_CONFIG: CharacterInfo = {
  id: 'jack',
  name: '傑克・米勒 (Jack Miller)',
  title: '二戰美軍步兵連下士 (Corporal, US Army Infantry)',
  faction: 'survivor',
  avatarColor: '#10b981',
  nationality: '人類（美國人）/ 白人',
  heightWeight: '身高 180 公分，體重 80 公斤（精實、結實的戰鬥體格，長期承受高壓軍事訓練與戰場勞動，肌肉線條明顯但不顯笨重）',
  career: '第二次世界大戰美國陸軍步兵連下士（Corporal），在一次密林夜間遭遇戰中與部隊失散，隨後被捲入未知的詭異迷霧與恐怖禁區。',
  appearance:
    '【面部特徵】白人膚色，長期日曬與風吹雨淋帶有粗糙感。右側臉頰上有一條由刺刀或彈片劃開的明顯舊傷疤，眼神銳利且充滿戒備。\n' +
    '【髮型與髮色】經典的美軍短寸頭，金色的頭髮在塵土與血污中顯得有些黯淡。\n' +
    '【服裝與配色】主色調為橄欖褐色（Olive Drab）與卡其色（Khaki）。身穿破損且沾滿泥巴的 M41 野戰夾克，內搭卡其色羊毛衫。袖口和褲管紮在軍靴內，腰間繫著帶有彈藥袋與刺刀鞘的帆布腰帶。衣服多處有因爆炸或掙扎造成的焦黑與撕裂痕跡，散發濃厚的美式寫實軍事恐怖氛圍。',
  personality:
    '【核心特質】剛毅、勇猛、極度務實、臨危不亂。\n' +
    '【背景心理】經歷過血腥的諾曼第或太平洋島嶼戰役，見證過同袍的死亡。這讓他對「生存」有著超乎常人的執著，但也背負著戰場創傷後遺症（PTSD）。在面對超自然或非理性的恐怖時，他起初會試圖用軍事戰術去理解與對抗，隨後才會意識到傳統武器的無力。',
  backstory:
    '1944 年秋天，傑克所屬的步兵連在法國某處陰森的密林中執行夜間偵察任務。隨著濃重的血色霧氣漫山遍野地湧來，通訊設備徹底失效，四周響起了非人的低語與沉重而詭異的腳步聲。在隨後的混戰中，德軍的防線早已不重要，因為黑暗中爬出的是遠比戰爭更為恐怖、無法用子彈殺死的扭曲怪物。傑克的同袍一個接一個在迷霧中被拖走，而他在拼死反擊、用刺刀劃破某個怪物的軀體後，逃進了一處深不見底的迷霧裂隙中。當他再次醒來時，戰場的槍砲聲已然消失，取而代之的是永無止境的詭異廢墟與那令人窒息的追逐夢魘。',
  skillName: '戰術強韌 / 戰地救援與修復 (Battlefield Grit & Repair)',
  skillKey: 'Shift 鍵 (受傷或從監獄獲救後觸發)',
  skillDescription:
    '當這角色在受傷狀況或從監獄獲救後，按下 Shift 鍵增加治療隊友及修機速度 10%，持續時間為 30 秒（技能冷卻 15 秒）。若無達成受傷狀況或從監獄獲救的條件則 Shift 鍵無法使用（按了無反應）。',
  modelStyle: {
    bodyColor: 0x15803d,
    accentColor: 0xca8a04,
    height: 1.8,
    width: 0.6,
  },
};

// ============================================================================
// 3. 移動與動作狀態機 (State Machine)
// ============================================================================
export type JackMotionState = 'IDLE' | 'MOVE_LEFT' | 'MOVE_RIGHT' | 'DOWNED';

export interface JackAnimationOutput {
  state: JackMotionState;
  poseName: PoseType;
  spriteIndex: JackSpriteIndex;
  frameTimer: number;
}

/**
 * 傑克・米勒專屬動作切換狀態機
 * - 靜止時：顯示正面靜止圖 (front.png)
 * - 向左移動時：在 left1.png 與 left_2.png 每 0.5 秒交替切換
 * - 向右移動時：在 right1.png 與 right2.png 每 0.5 秒交替切換
 * - 被擊倒 / 瀕死 / 監禁時：顯示 ko.png
 */
export class JackStateMachine {
  private currentState: JackMotionState = 'IDLE';
  private frameTimer: number = 0;
  private currentFrameIndex: number = 0; // 0 或 1，控制 0.5s 交替
  public readonly FRAME_DURATION: number = 0.5; // 每 0.5 秒切換幀

  /**
   * 重置狀態機內部計數
   */
  public reset(): void {
    this.currentState = 'IDLE';
    this.frameTimer = 0;
    this.currentFrameIndex = 0;
  }

  /**
   * 根據每幀時間差與移動輸入/按鍵方向更新姿態
   * @param deltaTime 幀間時間 (秒)
   * @param isMoving 是否處於移動中
   * @param screenDeltaXOrDir 螢幕投影水平位移量或方向 ('left' | 'right')
   * @param health 玩家當前生命狀態
   */
  public update(
    deltaTime: number,
    isMoving: boolean,
    screenDeltaXOrDir: number | 'left' | 'right',
    health: 'healthy' | 'injured' | 'downed' | 'caged' | 'dead' | 'escaped' = 'healthy'
  ): JackAnimationOutput {
    // 1. 被擊倒 / 瀕死 / 監牢狀態優先檢查
    if (health === 'downed' || health === 'caged' || health === 'dead') {
      this.currentState = 'DOWNED';
      this.frameTimer = 0;
      return {
        state: 'DOWNED',
        poseName: 'ko',
        spriteIndex: JackSpriteIndex.KO,
        frameTimer: 0,
      };
    }

    // 2. 靜止無位移狀態
    if (!isMoving) {
      this.currentState = 'IDLE';
      this.frameTimer = 0;
      this.currentFrameIndex = 0;
      return {
        state: 'IDLE',
        poseName: 'front',
        spriteIndex: JackSpriteIndex.FRONT,
        frameTimer: 0,
      };
    }

    // 3. 移動狀態判斷 (W/A 鍵向左 left1/left2，S/D 鍵向右 right1/right2)
    let targetState: JackMotionState = 'MOVE_LEFT';
    if (screenDeltaXOrDir === 'left') {
      targetState = 'MOVE_LEFT';
    } else if (screenDeltaXOrDir === 'right') {
      targetState = 'MOVE_RIGHT';
    } else if (typeof screenDeltaXOrDir === 'number') {
      targetState = screenDeltaXOrDir < -0.0001 ? 'MOVE_LEFT' : 'MOVE_RIGHT';
    }

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

    if (this.currentState === 'MOVE_LEFT') {
      const isFrame2 = this.currentFrameIndex === 1;
      return {
        state: 'MOVE_LEFT',
        poseName: isFrame2 ? 'left2' : 'left1',
        spriteIndex: isFrame2 ? JackSpriteIndex.LEFT_2 : JackSpriteIndex.LEFT_1,
        frameTimer: this.frameTimer,
      };
    } else {
      const isFrame2 = this.currentFrameIndex === 1;
      return {
        state: 'MOVE_RIGHT',
        poseName: isFrame2 ? 'right2' : 'right1',
        spriteIndex: isFrame2 ? JackSpriteIndex.RIGHT_2 : JackSpriteIndex.RIGHT_1,
        frameTimer: this.frameTimer,
      };
    }
  }
}

// ============================================================================
// 4. 角色技能檢驗與觸發邏輯 (戰術強韌 / 戰地救援與修復)
// ============================================================================

export interface JackSkillCheckResult {
  canActivate: boolean;
  reason?: string;
}

export interface JackSkillExecutionResult {
  updatedPlayers: PlayerState[];
  success: boolean;
  message: string;
}

/**
 * 檢查傑克・米勒是否滿足釋放技能條件
 * 條件：
 * 1. 角色必須為傑克 (characterId === 'jack')
 * 2. 技能冷卻完成 (skillCooldown <= 0)
 * 3. 處於受傷狀態 (health === 'injured') OR 從監獄獲救後 (jackRescuedWindow > 0 或 wasRescuedFromCage === true)
 * 4. 非倒地/監禁/死亡狀態
 */
export function checkJackSkillCondition(
  caster: PlayerState
): JackSkillCheckResult {
  if (caster.characterId !== 'jack') {
    return { canActivate: false, reason: '非傑克・米勒角色' };
  }

  if (caster.health === 'caged' || caster.health === 'dead' || caster.health === 'downed') {
    return { canActivate: false, reason: '處於無法行動或瀕死狀態' };
  }

  if (caster.skillCooldown > 0) {
    return { canActivate: false, reason: `技能冷卻中 (${Math.ceil(caster.skillCooldown)}s)` };
  }

  const isInjured = caster.health === 'injured';
  const isRescued = (caster.jackRescuedWindow || 0) > 0 || caster.wasRescuedFromCage === true;

  if (!isInjured && !isRescued) {
    return {
      canActivate: false,
      reason: '未達成觸發條件：必須處於「受傷狀況」或「從監牢獲救後」方可使用 Shift 鍵',
    };
  }

  return { canActivate: true };
}

/**
 * 執行傑克・米勒技能釋放
 * - 增加治療隊友及修機速度 10%
 * - 持續時間：30 秒
 * - 技能冷卻：15 秒
 */
export function castJackSkill(
  caster: PlayerState,
  allPlayers: PlayerState[]
): JackSkillExecutionResult {
  const check = checkJackSkillCondition(caster);
  if (!check.canActivate) {
    return {
      updatedPlayers: allPlayers,
      success: false,
      message: check.reason || '無法發動技能',
    };
  }

  const updatedPlayers = allPlayers.map(p => {
    if (p.id === caster.id) {
      return {
        ...p,
        jackBuffTime: 30, // 30 秒戰術增益
        skillCooldown: 15, // 15 秒標準冷卻
        wasRescuedFromCage: false, // 消耗獲救增益窗口標記
      };
    }
    return p;
  });

  const triggerReason = caster.health === 'injured' ? '受傷逆境激發' : '獲救重返戰場';

  return {
    updatedPlayers,
    success: true,
    message: `🎖️【傑克・米勒・戰術強韌】(${triggerReason}) 激發求生意志！治療隊友與修機速度提升 +10%（持續 30 秒）`,
  };
}
