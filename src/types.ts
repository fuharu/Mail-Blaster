// メールメッセージの基本情報とUI表示に必要な状態
export interface EmailMessage {
  id: string;        // メッセージID
  threadId: string;  // スレッドID
  snippet: string;   // 本文スニペット（冒頭抜粋）
  subject: string;   // 件名
  sender: string;    // 送信者
  date: string;      // 受信（内部）日時
  isDirt: boolean;   // 洗浄対象（汚れ）かどうか
  opacity: number;   // 汚れ具合 (1.0 = 汚れている, 0.0 = 綺麗)
}

// 汚れの種類
export type DirtType = 'SLIME' | 'STICKER' | 'DUST';

// 洗浄モード（ノズルの種類）
// ARCHIVE=アーカイブ演出、DELETE=粉砕演出（同期はアーカイブ前提）
export type CleaningMode = 'ARCHIVE' | 'DELETE';

// Pixi の汚れオブジェクトに付与する物理ステート（当たり判定/演出制御用）
export interface DirtPhysicsState {
  hp: number;            // 現在の耐久値（汚れの残量）
  maxHp: number;         // 最大耐久値
  isDead: boolean;       // 完全に消滅したか
  isDying: boolean;      // 消滅アニメーション中か
  mode?: CleaningMode;   // どのモードで倒されたか
}

// 効果音のキー定義 (SE担当追加分)
export type SoundKey = 'CLEAN' | 'DESTROY' | 'STAGE_CLEAR' | 'WATER_JET';

// 洗浄完了したメッセージの情報
export interface CleanedMessage {
  id: string;
  action: CleaningMode;
}
