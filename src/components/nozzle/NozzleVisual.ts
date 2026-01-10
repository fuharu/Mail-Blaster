// src/components/nozzle/NozzleVisual.ts
// ノズルカーソルの視覚化（Pixi.js版）
import * as PIXI from 'pixi.js';
import type { CleaningMode } from '../../types';

export class NozzleVisual {
  private container: PIXI.Container;
  private outerRing: PIXI.Graphics;
  private innerCircle: PIXI.Graphics;
  private glowEffect: PIXI.Graphics;
  private crosshair: PIXI.Graphics;
  private pulseRing: PIXI.Graphics;
  
  private animationTime: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;

  // スムーズな追従の設定
  private readonly LERP_FACTOR = 0.15; // 0.1-0.3程度が滑らか（小さいほど滑らか）

  // モードに応じた色
  private readonly ARCHIVE_COLOR = 0x2196F3; // 青
  private readonly DELETE_COLOR = 0xf44336;  // 赤
  
  // グラデーション色（明るい色）
  private readonly ARCHIVE_COLOR_LIGHT = 0x64B5F6; // 明るい青
  private readonly DELETE_COLOR_LIGHT = 0xEF5350;  // 明るい赤

  constructor(stage: PIXI.Container) {
    this.container = new PIXI.Container();
    this.container.zIndex = 1000; // 最前面に表示

    // グローエフェクト（最下層）
    this.glowEffect = new PIXI.Graphics();
    this.container.addChild(this.glowEffect);

    // パルスリング（アニメーション用）
    this.pulseRing = new PIXI.Graphics();
    this.container.addChild(this.pulseRing);

    // 外側のリング
    this.outerRing = new PIXI.Graphics();
    this.container.addChild(this.outerRing);

    // 内側の円
    this.innerCircle = new PIXI.Graphics();
    this.container.addChild(this.innerCircle);

    // クロスヘア（十字線）
    this.crosshair = new PIXI.Graphics();
    this.container.addChild(this.crosshair);

    stage.addChild(this.container);
    
    // 初期描画
    this.draw('ARCHIVE', false, 0);
  }

  /**
   * ノズルの外観を描画
   * @param mode 現在のモード
   * @param isSpraying 噴射中かどうか
   * @param delta デルタタイム（秒）
   */
  public draw(mode: CleaningMode, isSpraying: boolean, delta: number): void {
    const color = mode === 'ARCHIVE' ? this.ARCHIVE_COLOR : this.DELETE_COLOR;
    const lightColor = mode === 'ARCHIVE' ? this.ARCHIVE_COLOR_LIGHT : this.DELETE_COLOR_LIGHT;
    
    // アニメーション時間の更新
    this.animationTime += delta;
    
    // 基本パラメータ
    const baseScale = isSpraying ? 1.3 : 1.0;
    const pulseScale = 1.0 + Math.sin(this.animationTime * 8) * 0.1; // パルスアニメーション
    const scale = baseScale * pulseScale;
    const alpha = isSpraying ? 1.0 : 0.7;
    const glowAlpha = isSpraying ? 0.6 : 0.3;

    // グローエフェクト（発光）
    this.glowEffect.clear();
    const glowRadius = 35 * scale;
    // 外側のグロー（大きな円、薄い）
    for (let i = 3; i >= 1; i--) {
      this.glowEffect.circle(0, 0, glowRadius * (1 + i * 0.3));
      this.glowEffect.fill({ color: lightColor, alpha: glowAlpha * 0.15 / i });
    }

    // パルスリング（アニメーション）
    this.pulseRing.clear();
    if (isSpraying) {
      const pulseAlpha = (Math.sin(this.animationTime * 10) + 1) * 0.5;
      this.pulseRing.circle(0, 0, 30 * scale);
      this.pulseRing.stroke({ width: 2, color: lightColor, alpha: pulseAlpha * 0.5 });
      this.pulseRing.circle(0, 0, 32 * scale);
      this.pulseRing.stroke({ width: 1, color: color, alpha: pulseAlpha * 0.3 });
    }

    // 外側のリング（2重構造で立体感）
    this.outerRing.clear();
    // 外側のリング（太い）
    this.outerRing.circle(0, 0, 28 * scale);
    this.outerRing.stroke({ width: 4, color: color, alpha: alpha });
    // 内側のリング（細い、明るい色）
    this.outerRing.circle(0, 0, 26 * scale);
    this.outerRing.stroke({ width: 2, color: lightColor, alpha: alpha * 0.8 });

    // 内側の円（グラデーション風に2層）
    this.innerCircle.clear();
    // 外側の円
    this.innerCircle.circle(0, 0, 10 * scale);
    this.innerCircle.fill({ color: lightColor, alpha: alpha * 0.9 });
    // 内側の円（中心、より明るく）
    this.innerCircle.circle(0, 0, 6 * scale);
    this.innerCircle.fill({ color: lightColor, alpha: alpha * 1.0 });
    
    // 中心点
    this.innerCircle.circle(0, 0, 2 * scale);
    this.innerCircle.fill({ color: 0xFFFFFF, alpha: alpha });

    // クロスヘア（強化版）
    this.crosshair.clear();
    const lineLength = 40 * scale;
    const gap = 14 * scale;
    const lineWidth = isSpraying ? 3 : 2;
    
    // 外側の線（太く、薄い）
    // 上
    this.crosshair.moveTo(-lineWidth / 2, -lineLength);
    this.crosshair.lineTo(lineWidth / 2, -lineLength);
    this.crosshair.lineTo(lineWidth / 2, -gap);
    this.crosshair.lineTo(-lineWidth / 2, -gap);
    this.crosshair.fill({ color: color, alpha: alpha * 0.6 });
    
    // 下
    this.crosshair.moveTo(-lineWidth / 2, gap);
    this.crosshair.lineTo(lineWidth / 2, gap);
    this.crosshair.lineTo(lineWidth / 2, lineLength);
    this.crosshair.lineTo(-lineWidth / 2, lineLength);
    this.crosshair.fill({ color: color, alpha: alpha * 0.6 });
    
    // 左
    this.crosshair.moveTo(-lineLength, -lineWidth / 2);
    this.crosshair.lineTo(-gap, -lineWidth / 2);
    this.crosshair.lineTo(-gap, lineWidth / 2);
    this.crosshair.lineTo(-lineLength, lineWidth / 2);
    this.crosshair.fill({ color: color, alpha: alpha * 0.6 });
    
    // 右
    this.crosshair.moveTo(gap, -lineWidth / 2);
    this.crosshair.lineTo(lineLength, -lineWidth / 2);
    this.crosshair.lineTo(lineLength, lineWidth / 2);
    this.crosshair.lineTo(gap, lineWidth / 2);
    this.crosshair.fill({ color: color, alpha: alpha * 0.6 });
    
    // 内側の線（細く、明るい）
    this.crosshair.moveTo(0, -lineLength);
    this.crosshair.lineTo(0, -gap);
    this.crosshair.moveTo(0, gap);
    this.crosshair.lineTo(0, lineLength);
    this.crosshair.moveTo(-lineLength, 0);
    this.crosshair.lineTo(-gap, 0);
    this.crosshair.moveTo(gap, 0);
    this.crosshair.lineTo(lineLength, 0);
    this.crosshair.stroke({ width: 1.5, color: lightColor, alpha: alpha * 0.9 });
  }

  /**
   * ノズルの目標位置を設定（スムーズな追従用）
   * @param x 目標X座標
   * @param y 目標Y座標
   */
  public setTargetPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * ノズルの位置を更新（スムーズな補間）
   * @param delta デルタタイム
   */
  public updatePosition(delta: number): void {
    // 線形補間（Lerp）で滑らかに移動
    // deltaに応じて調整（60FPSを基準に）
    const adjustedLerpFactor = 1.0 - Math.pow(1.0 - this.LERP_FACTOR, delta * 60);
    this.currentX += (this.targetX - this.currentX) * adjustedLerpFactor;
    this.currentY += (this.targetY - this.currentY) * adjustedLerpFactor;
    
    this.container.x = this.currentX;
    this.container.y = this.currentY;
  }

  /**
   * 表示/非表示を切り替え
   * @param visible 表示するかどうか
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * リソースの解放
   */
  public destroy(): void {
    this.glowEffect.destroy();
    this.pulseRing.destroy();
    this.outerRing.destroy();
    this.innerCircle.destroy();
    this.crosshair.destroy();
    this.container.destroy();
  }
}

