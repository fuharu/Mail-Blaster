// src/components/nozzle/SprayEffect.ts
// 噴射エフェクト（Pixi.js版）
import * as PIXI from 'pixi.js';
import type { CleaningMode } from '../../types';

interface Particle {
  graphics: PIXI.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class SprayEffect {
  private container: PIXI.Container;
  private particles: Particle[] = [];
  private sprayRange: PIXI.Graphics;
  private app: PIXI.Application;

  // 設定
  private readonly MAX_PARTICLES = 80; // 増加
  private readonly PARTICLE_SIZE_MIN = 2;
  private readonly PARTICLE_SIZE_MAX = 6;
  private readonly SPRAY_ANGLE = Math.PI * 0.4; // ±36度の扇形
  private readonly SPRAY_SPEED_MIN = 10;
  private readonly SPRAY_SPEED_MAX = 20; // 増加
  private readonly PARTICLE_LIFE = 0.8; // 秒

  // モードに応じた色
  private readonly ARCHIVE_COLOR = 0x2196F3; // 青
  private readonly DELETE_COLOR = 0xf44336;  // 赤
  private readonly ARCHIVE_COLOR_LIGHT = 0x64B5F6; // 明るい青
  private readonly DELETE_COLOR_LIGHT = 0xEF5350;  // 明るい赤

  constructor(stage: PIXI.Container, app: PIXI.Application) {
    this.container = new PIXI.Container();
    this.container.zIndex = 999; // ノズルの少し下
    this.app = app;

    // 噴射範囲の表示
    this.sprayRange = new PIXI.Graphics();
    this.container.addChild(this.sprayRange);

    stage.addChild(this.container);
  }

  /**
   * 噴射エフェクトの更新（毎フレーム呼び出し）
   * @param x ノズルのX座標
   * @param y ノズルのY座標
   * @param isSpraying 噴射中かどうか
   * @param mode 現在のモード
   * @param delta デルタタイム
   */
  public update(
    x: number,
    y: number,
    isSpraying: boolean,
    mode: CleaningMode,
    delta: number
  ): void {
    // 噴射範囲の描画を非表示（パーティクルのみ表示）
    this.sprayRange.clear();

    // パーティクルの生成（噴射強度に応じて増やす）
    if (isSpraying && this.particles.length < this.MAX_PARTICLES) {
      // 毎フレーム5-7個生成（リッチに）
      const particlesToCreate = Math.min(5 + Math.floor(Math.random() * 3), this.MAX_PARTICLES - this.particles.length);
      for (let i = 0; i < particlesToCreate; i++) {
        this.createParticle(x, y, mode);
      }
    }

    // パーティクルの更新
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const margin = 50; // 画面外のマージン（余裕を持たせる）
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // 位置更新
      p.graphics.x += p.vx * delta;
      p.graphics.y += p.vy * delta;
      
      // 重力（下方向に加速）
      p.vy += 0.3 * delta * 60;
      
      // 寿命減少
      p.life -= delta;
      
      // 透明度更新
      p.graphics.alpha = Math.max(0, p.life / p.maxLife);
      
      // 画面外判定（早期削除）
      const isOffScreen = 
        p.graphics.x < -margin ||
        p.graphics.x > screenWidth + margin ||
        p.graphics.y < -margin ||
        p.graphics.y > screenHeight + margin;
      
      // 寿命が尽きたか、画面外に出たら削除
      if (p.life <= 0 || isOffScreen) {
        this.container.removeChild(p.graphics);
        p.graphics.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * パーティクルを生成（リッチ化）
   */
  private createParticle(x: number, y: number, mode: CleaningMode): void {
    const color = mode === 'ARCHIVE' ? this.ARCHIVE_COLOR : this.DELETE_COLOR;
    const lightColor = mode === 'ARCHIVE' ? this.ARCHIVE_COLOR_LIGHT : this.DELETE_COLOR_LIGHT;
    
    // ランダムな角度（扇形の範囲内、上方向を基準）
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * this.SPRAY_ANGLE;
    const speed = this.SPRAY_SPEED_MIN + Math.random() * (this.SPRAY_SPEED_MAX - this.SPRAY_SPEED_MIN);
    const size = this.PARTICLE_SIZE_MIN + Math.random() * (this.PARTICLE_SIZE_MAX - this.PARTICLE_SIZE_MIN);
    const particleType = Math.random(); // パーティクルの種類をランダムに

    const graphics = new PIXI.Graphics();
    
    // パーティクルの形状を多様化
    if (particleType < 0.6) {
      // 円形（基本）
      graphics.circle(0, 0, size);
      graphics.fill({ color: lightColor, alpha: 0.9 });
      // 中心に小さな明るい点
      graphics.circle(0, 0, size * 0.4);
      graphics.fill({ color: 0xFFFFFF, alpha: 0.8 });
    } else if (particleType < 0.85) {
      // 楕円形（水滴風）
      graphics.ellipse(0, 0, size * 0.8, size * 1.2);
      graphics.fill({ color: lightColor, alpha: 0.85 });
    } else {
      // 細長い線（水しぶき風）
      const lineLength = size * 2;
      graphics.moveTo(0, -lineLength / 2);
      graphics.lineTo(0, lineLength / 2);
      graphics.stroke({ width: size * 0.6, color: lightColor, alpha: 0.9 });
    }
    
    // グローエフェクト（外側に薄い輪）
    graphics.circle(0, 0, size * 1.5);
    graphics.fill({ color: color, alpha: 0.2 });
    
    graphics.x = x;
    graphics.y = y;

    this.container.addChild(graphics);

    this.particles.push({
      graphics,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: this.PARTICLE_LIFE * (0.6 + Math.random() * 0.4),
      maxLife: this.PARTICLE_LIFE,
    });
  }

  /**
   * すべてのパーティクルをクリア
   */
  public clear(): void {
    for (const p of this.particles) {
      this.container.removeChild(p.graphics);
      p.graphics.destroy();
    }
    this.particles = [];
    this.sprayRange.clear();
  }

  /**
   * リソースの解放
   */
  public destroy(): void {
    this.clear();
    this.sprayRange.destroy();
    this.container.destroy();
  }
}

