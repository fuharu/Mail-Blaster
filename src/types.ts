// src/types.ts
export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  sender: string;
  date: string;
  isDirt: boolean; // 洗浄対象（汚れ）かどうか
  opacity: number; // 汚れ具合 (1.0 = 汚れている, 0.0 = 綺麗)
}

export type DirtType = 'SLIME' | 'STICKER' | 'DUST';

// 洗浄モード（ノズルの種類）
export type CleaningMode = 'ARCHIVE' | 'DELETE';

// 汚れの物理状態（描画担当のオブジェクトにアタッチする拡張プロパティ）
export interface DirtPhysicsState {
  hp: number;
  maxHp: number;
  isDead: boolean;       // 完全に消滅したか
  isDying: boolean;      // 消滅アニメーション中か
  mode?: CleaningMode;   // どのモードで倒されたか
}