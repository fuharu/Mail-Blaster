// パーティクルシステム 
//「削除（赤）」時の粉砕エフェクトを管理するクラス
import * as PIXI from 'pixi.js';

interface Particle {
  sprite: PIXI.Graphics;
  vx: number;
  vy: number;
  life: number;
}

export class ParticleSystem {
  private container: PIXI.Container;
  private particles: Particle[] = [];

  constructor(appStage: PIXI.Container) {
    this.container = new PIXI.Container();
    appStage.addChild(this.container);
  }

  // 粉砕エフェクトの発生
  public explode(x: number, y: number, color: number) {
    const count = 20; // 破片の数
    
    for (let i = 0; i < count; i++) {
      const graphics = new PIXI.Graphics();
      graphics.rect(0, 0, 8, 8); // 小さな四角形
      graphics.fill(color);
      graphics.x = x;
      graphics.y = y;
      
      this.container.addChild(graphics);

      // 爆発のようなランダムな速度
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 2;

      this.particles.push({
        sprite: graphics,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0 // 寿命 (1.0 = 100%)
      });
    }
  }

  // 毎フレーム更新（重力とフェードアウト）
  public update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.sprite.x += p.vx;
      p.sprite.y += p.vy;
      p.vy += 0.5; // 重力
      p.life -= 0.05; // 寿命減少
      p.sprite.alpha = p.life;

      if (p.life <= 0) {
        this.container.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  public destroy() {
    this.container.destroy({ children: true });
  }
}