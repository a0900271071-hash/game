import jackImg from '../assets/images/jack_miller_portrait_1786269217662.jpg';
import kentoImg from '../assets/images/kento_sato_portrait_1786269244427.jpg';
import erikImg from '../assets/images/erik_thorsson_portrait_1786269263983.jpg';
import tariqImg from '../assets/images/tariq_portrait_1786269287059.jpg';
import gourmetImg from '../assets/images/gourmet_butcher_portrait_1786269324524.jpg';

// Kento Sato JPG poses
import kentoFrontImg from '../assets/images/kento_front_1786459477086.jpg';
import kentoLeftImg from '../assets/images/kento_left1_1786459492760.jpg';
import kentoLeft2Img from '../assets/images/kento_left2_1786459507839.jpg';
import kentoRightImg from '../assets/images/kento_right1_1786459523470.jpg';
import kentoRight2Img from '../assets/images/kento_right2_1786459539210.jpg';
import kentoKoImg from '../assets/images/kento_ko_1786459552948.jpg';

// Jack Miller JPG poses
import jackFrontImg from '../assets/images/jack_front_gen_1786536897511.jpg';
import jackLeftImg from '../assets/images/jack_left1_gen_1786536918224.jpg';
import jackLeft2Img from '../assets/images/jack_left2_gen_1786536937369.jpg';
import jackRightImg from '../assets/images/jack_right1_gen_1786536957063.jpg';
import jackRight2Img from '../assets/images/jack_right2_gen_1786536973920.jpg';
import jackKoImg from '../assets/images/jack_ko_gen_1786536990847.jpg';

// Erik Thorsson core assets
import { ERIK_POSE_MAP } from './erikCharacter';

// Gourmet (老饕) core assets
import { GOURMET_POSE_MAP } from './gourmetCharacter';

// Elena Shaman core assets
import { ELENA_POSE_MAP } from './elenaCharacter';
import elenaPortraitImg from '../assets/images/elena_shaman_portrait_1786269305303.jpg';

// Tariq Al-Hashim core assets
import { TARIQ_POSE_MAP } from './tariqCharacter';

// Kento Sato core assets
import { KENTO_POSE_MAP } from './kentoCharacter';

// Jack Miller core assets
import { JACK_POSE_MAP } from './jackCharacter';

export const CHARACTER_PORTRAITS: Record<string, string> = {
  jack: jackImg,
  kento: kentoImg,
  erik: erikImg,
  tariq: tariqImg,
  elena: elenaPortraitImg,
  gourmet: gourmetImg,
};

export const CHARACTER_POSES: Record<string, {
  front: string;
  left: string;
  left1?: string;
  left2?: string;
  right: string;
  right1?: string;
  right2?: string;
  ko?: string;
  back?: string;
  chase?: string;
}> = {
  elena: {
    front: ELENA_POSE_MAP.front,
    left: ELENA_POSE_MAP.left1,
    left1: ELENA_POSE_MAP.left1,
    left2: ELENA_POSE_MAP.left2,
    right: ELENA_POSE_MAP.right1,
    right1: ELENA_POSE_MAP.right1,
    right2: ELENA_POSE_MAP.right2,
  },
  kento: {
    front: KENTO_POSE_MAP.front,
    left: KENTO_POSE_MAP.left1,
    left1: KENTO_POSE_MAP.left1,
    left2: KENTO_POSE_MAP.left2,
    right: KENTO_POSE_MAP.right1,
    right1: KENTO_POSE_MAP.right1,
    right2: KENTO_POSE_MAP.right2,
    ko: KENTO_POSE_MAP.ko,
  },
  jack: {
    front: JACK_POSE_MAP.front,
    left: JACK_POSE_MAP.left1,
    left1: JACK_POSE_MAP.left1,
    left2: JACK_POSE_MAP.left2,
    right: JACK_POSE_MAP.right1,
    right1: JACK_POSE_MAP.right1,
    right2: JACK_POSE_MAP.right2,
    ko: JACK_POSE_MAP.ko,
  },
  erik: {
    front: ERIK_POSE_MAP.front,
    left: ERIK_POSE_MAP.left1,
    left1: ERIK_POSE_MAP.left1,
    left2: ERIK_POSE_MAP.left2,
    right: ERIK_POSE_MAP.right1,
    right1: ERIK_POSE_MAP.right1,
    right2: ERIK_POSE_MAP.right2,
    ko: ERIK_POSE_MAP.ko,
  },
  gourmet: {
    front: GOURMET_POSE_MAP.front,
    left: GOURMET_POSE_MAP.left1,
    left1: GOURMET_POSE_MAP.left1,
    left2: GOURMET_POSE_MAP.left2,
    right: GOURMET_POSE_MAP.right1,
    right1: GOURMET_POSE_MAP.right1,
    right2: GOURMET_POSE_MAP.right2,
    ko: GOURMET_POSE_MAP.front,
  },
  tariq: {
    front: TARIQ_POSE_MAP.front,
    left: TARIQ_POSE_MAP.left1,
    left1: TARIQ_POSE_MAP.left1,
    left2: TARIQ_POSE_MAP.left2,
    right: TARIQ_POSE_MAP.right1,
    right1: TARIQ_POSE_MAP.right1,
    right2: TARIQ_POSE_MAP.right2,
    ko: TARIQ_POSE_MAP.ko,
  },
};
