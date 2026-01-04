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