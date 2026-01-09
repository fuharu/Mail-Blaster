// src/components/nozzle/NozzleController.ts
// ノズル状態管理（Pixi.js版）
import * as PIXI from 'pixi.js';
import type { CleaningMode } from '../../types';
import { NozzleVisual } from './NozzleVisual';
import { SprayEffect } from './SprayEffect';
import { SoundManager } from '../../systems/SoundManager'; // 追記：効果音管理システムのインポート

export interface NozzleState {
  x: number;
  y: number;
  isSpraying: boolean;
  mode: CleaningMode;
}

export class NozzleController {
  private app: PIXI.Application;
  private nozzleVisual: NozzleVisual;
  private sprayEffect: SprayEffect;
  private soundManager: SoundManager; //　追記：効果音管理システムのメンバ変数

  private state: NozzleState = {
    x: 0,
    y: 0,
    isSpraying: false,
    mode: 'ARCHIVE',
  };
  
  private isMouseOver: boolean = false;

  // コンストラクタでSoundManagerを受け取る
  constructor(app: PIXI.Application, soundManager: SoundManager) {
    this.app = app;
    this.soundManager = soundManager; // 追記：効果音管理システムの初期化
    
    // ノズルの視覚化とエフェクトを作成
    this.nozzleVisual = new NozzleVisual(app.stage);
    this.sprayEffect = new SprayEffect(app.stage, app);
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // 毎フレーム更新
    app.ticker.add(this.update.bind(this));
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    const canvas = this.app.canvas;

    // マウス移動
    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.state.x = e.clientX - rect.left;
      this.state.y = e.clientY - rect.top;
    });

    // 効果音制御の追加
    canvas.addEventListener('mousedown', () => {
      this.state.isSpraying = true;
      if (this.isMouseOver) {
        this.soundManager.startJetLoop();
      }
    });
    
    // マウスダウン（噴射開始）
    canvas.addEventListener('mousedown', () => {
      this.state.isSpraying = true;
    });

    // マウスアップ（噴射終了）
    canvas.addEventListener('mouseup', () => {
      this.state.isSpraying = false;
    });

    // マウスがキャンバスから出た
    canvas.addEventListener('mouseleave', () => {
      this.state.isSpraying = false;
      this.isMouseOver = false;
    });

    // マウスがキャンバスに入った
    canvas.addEventListener('mouseenter', () => {
      this.isMouseOver = true;
    });
  }

  /**
   * 毎フレームの更新
   */
  private update(): void {
    const delta = this.app.ticker.deltaMS / 1000; // 秒単位に変換
    
    // ノズルの表示/非表示
    this.nozzleVisual.setVisible(this.isMouseOver);
    
    if (this.isMouseOver) {
      // ノズルの目標位置を設定
      this.nozzleVisual.setTargetPosition(this.state.x, this.state.y);
      // ノズルの位置をスムーズに更新
      this.nozzleVisual.updatePosition(delta);
      // ノズルの外観を更新
      this.nozzleVisual.draw(this.state.mode, this.state.isSpraying, delta);
    }

    // 噴射エフェクトの更新
    this.sprayEffect.update(
      this.state.x,
      this.state.y,
      this.state.isSpraying && this.isMouseOver,
      this.state.mode,
      delta
    );
  }

  /**
   * 現在のノズル状態を取得
   */
  public getState(): NozzleState {
    return { ...this.state };
  }

  /**
   * モードを設定
   */
  public setMode(mode: CleaningMode): void {
    this.state.mode = mode;
  }

  /**
   * 噴射中かどうか
   */
  public isSpraying(): boolean {
    return this.state.isSpraying && this.isMouseOver;
  }

  /**
   * ノズルの位置を取得
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.state.x, y: this.state.y };
  }

  /**
   * リソースの解放
   */
  public destroy(): void {
    this.nozzleVisual.destroy();
    this.sprayEffect.destroy();
  }
}

