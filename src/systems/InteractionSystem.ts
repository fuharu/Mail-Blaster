// インタラクション管理システム
import * as PIXI from 'pixi.js';
import type { DirtPhysicsState } from '../types';
import type { CleaningMode } from '../types';
import { ParticleSystem } from './ParticleSystem';
import { SoundManager } from './SoundManager'; //　追記：効果音管理システムのインポート

export class InteractionSystem {
  private particleSystem: ParticleSystem;
  private soundManager: SoundManager; // ★追加
  
  // 設定値
  private readonly NOZZLE_RADIUS = 30; // ノズルの当たり判定サイズ
  private readonly DAMAGE_RATE = 2.0;  // 1フレームあたりのダメージ
  private readonly WASH_SPEED = 5;     // 青ノズルで流れる速度

  // コンストラクタでSoundManagerを受け取る
  constructor(particleSystem: ParticleSystem, soundManager: SoundManager) {
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;
  }

  public update(
    nozzlePos: { x: number, y: number },
    isSpraying: boolean,
    mode: CleaningMode,
    dirtList: (PIXI.Container & { physics?: DirtPhysicsState })[]
  ) {
     // 1. パーティクルの更新
    this.particleSystem.update();

    // 2. 各汚れに対する処理
    dirtList.forEach(dirt => {
      // 物理ステートの初期化（初回のみ）
      if (!dirt.physics) {
        dirt.physics = {
          hp: 100,
          maxHp: 100,
          isDead: false,
          isDying: false
        };
      }
      
      const state = dirt.physics;

      // 既に死んでいる、または処理中は無視
      if (state.isDead) return;

      // --- A. 瀕死アニメーション処理 ---
      if (state.isDying) {
        this.handleDyingAnimation(dirt, state);
        return;
      }

      // --- B. 当たり判定とダメージ処理 ---
      if (isSpraying) {
        if (this.checkCollision(nozzlePos, dirt)) {
          this.applyDamage(dirt, state, mode);
        }
      }
    });
  }

  // 矩形(汚れ)と円(ノズル)の衝突判定
  private checkCollision(point: { x: number, y: number }, dirt: PIXI.Container): boolean {
    // 簡易的なAABB（矩形）判定 + 距離チェック
    // 厳密な矩形vs円判定よりも、ゲーム的な「当たり心地」を優先して
    // 汚れの境界ボックス内にノズルの中心があればヒット、もしくは近ければヒットとする
    
    const bounds = dirt.getBounds();

    // 1. ポイントが矩形の中にあるか
    if (bounds.containsPoint(point.x, point.y)) {
      return true;
    }

    // 2. 矩形の中心との距離が半径以内か（簡易判定）
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const dist = Math.sqrt((point.x - centerX) ** 2 + (point.y - centerY) ** 2);
    
    // 汚れの大きさも考慮して当たり判定を甘めにする
    const hitThreshold = (Math.min(bounds.width, bounds.height) / 2) + this.NOZZLE_RADIUS;
    
    return dist < hitThreshold;
  }

  // ダメージ適用
  private applyDamage(dirt: PIXI.Container, state: DirtPhysicsState, mode: CleaningMode) {
    state.hp -= this.DAMAGE_RATE;
    
    // HPに応じた透明度更新（汚れが薄くなる表現）
    dirt.alpha = Math.max(0.2, state.hp / state.maxHp);

    // HPゼロで死亡フラグ
    if (state.hp <= 0) {
      state.isDying = true;
      state.mode = mode; // どのモードで倒されたか記録

      // 赤モードなら即座に爆発エフェクト
      if (mode === 'DELETE') {
        const bounds = dirt.getBounds();
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        this.particleSystem.explode(centerX, centerY, 0x8B4513); // 茶色の破片

        this.soundManager.play('DESTROY', 0.8); // 破壊音
      } else {
        this.soundManager.play('CLEAN', 1.0); // 洗浄音
      }
    }
  }

  // 撃破後のアニメーション制御
  private handleDyingAnimation(dirt: PIXI.Container, state: DirtPhysicsState) {
    if (state.mode === 'ARCHIVE') {
      // アーカイブ（青）：水で洗い流されるように下に落ちながら消える
      dirt.y += this.WASH_SPEED;
      dirt.alpha -= 0.05;
      dirt.scale.x *= 0.98; // 少し縮小

      if (dirt.alpha <= 0) {
        state.isDead = true;
        dirt.visible = false;
      }

    } else if (state.mode === 'DELETE') {
      // 削除（赤）：粉砕済みなので、本体は一瞬で消す
      dirt.visible = false;
      state.isDead = true;
    }
  }
}