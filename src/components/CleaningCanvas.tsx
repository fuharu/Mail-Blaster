// src/components/CleaningCanvas.tsx
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { EmailMessage, CleaningMode, DirtPhysicsState, CleanedMessage } from '../types';
import { NozzleController } from './nozzle/NozzleController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SoundManager } from '../systems/SoundManager';

interface Props {
  emails: EmailMessage[];
  onCleanComplete: (results: CleanedMessage[]) => void;
  soundManager: SoundManager; 
}

// 汚れコンテナの型拡張
type DirtContainer = PIXI.Container & {
  physics?: DirtPhysicsState;
  emailId?: string;
};

// soundManagerをpropsから受け取る
const CleaningCanvas = ({ emails, onCleanComplete, soundManager }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const cleanedResultsRef = useRef<Map<string, CleaningMode>>(new Map());

  // システムの参照
  // soundManagerRefは不要になったので削除し、propsのsoundManagerを直接使います
  const nozzleControllerRef = useRef<NozzleController | null>(null);
  const interactionSystemRef = useRef<InteractionSystem | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const dirtListRef = useRef<DirtContainer[]>([]);

  const [currentMode, setCurrentMode] = useState<CleaningMode>('ARCHIVE');

  useEffect(() => {
    if (nozzleControllerRef.current) {
      nozzleControllerRef.current.setMode(currentMode);
    }
  }, [currentMode]);

  useEffect(() => {
    // 既に初期化済み、またはDOMがない、メールがない場合はスキップ
    if (!canvasRef.current || emails.length === 0) return;
    
    // 多重初期化防止（同期チェック）
    if (appRef.current) return;

    // 修正: 非同期処理の競合を防ぐためのフラグ
    let isMounted = true;

    const initApp = async () => {
      // 1. Pixiアプリケーションの作成 (v8対応: initを使用)
      const app = new PIXI.Application();
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x333333, // 暗い背景
        backgroundAlpha: 1,
      });

      if (!isMounted || !canvasRef.current) {
        app.destroy();
        return;
      }

      // HTML要素にCanvasを追加 (v8対応: view ではなく canvas)
      // 念のため既存の子要素をクリアしてから追加
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // ステージのソートを有効化（ノズルやエフェクトの重なり順のため）
      app.stage.sortableChildren = true;

      // ここで new SoundManager() をしていたのを廃止
      // 既にロード済みの props.soundManager を使用する

      const particleSystem = new ParticleSystem(app.stage);
      particleSystemRef.current = particleSystem;

      // InteractionSystemの初期化 (ParticleとSoundを注入)
      interactionSystemRef.current = new InteractionSystem(particleSystem, soundManager);

      // propsのsoundManagerを渡す
      const nozzleController = new NozzleController(app, soundManager);
      nozzleController.setMode(currentMode); // 初期モードをセット（stateの値を反映）
      nozzleControllerRef.current = nozzleController;

      // 3. メールの汚れオブジェクト生成 (Rendering担当の実装ベース)
      dirtListRef.current = [];
      cleanedResultsRef.current.clear();

      // ★ レイアウト設定: グリッド計算用
      const COLS = 3; // 3列
      const BOX_WIDTH = 220; // 汚れの幅
      const BOX_HEIGHT = 120; // 汚れの高さ
      const GRID_OFFSET_X = 50; // 全体の開始位置X
      const GRID_OFFSET_Y = 60; // 全体の開始位置Y
      const SPACING_X = 250; // グリッドの間隔X
      const SPACING_Y = 150; // グリッドの間隔Y

      emails.forEach((email, index) => {
        // 汚れのコンテナ作成
        const dirtContainer = new PIXI.Container() as DirtContainer;
        
        // ★ 修正点1: グリッドレイアウト + ランダムなゆらぎ (Jitter)
        // 完全に重ならないようにグリッドに配置しつつ、少しずらして「汚れ感」を出す
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        
        // 基本位置
        const baseX = GRID_OFFSET_X + col * SPACING_X;
        const baseY = GRID_OFFSET_Y + row * SPACING_Y;
        
        // ゆらぎ (-20px ~ +20px 程度)
        const jitterX = (Math.random() - 0.5) * 40;
        const jitterY = (Math.random() - 0.5) * 40;

        dirtContainer.x = baseX + jitterX;
        dirtContainer.y = baseY + jitterY;

        // 汚れのグラフィック（枠）
        const graphics = new PIXI.Graphics();
        // 少し大きめにして文字の余白を作る
        graphics.rect(0, 0, BOX_WIDTH, BOX_HEIGHT); 
        graphics.fill(0x8B4513);
        // 枠線を少し明るくして視認性を上げる
        graphics.stroke({ width: 2, color: 0xA0522D }); 

        // テキストのはみ出し防止（マスク処理）
        // マスク用のグラフィック（これより外側は表示されない）
        const mask = new PIXI.Graphics();
        mask.rect(0, 0, BOX_WIDTH, BOX_HEIGHT);
        mask.fill(0xFFFFFF); // 色は何でも良い
        dirtContainer.addChild(mask);
        dirtContainer.mask = mask; // コンテナ全体にマスクを適用

        // テキストスタイル調整
        const textStyle = new PIXI.TextStyle({
          fontFamily: 'Arial',
          fontSize: 15, // 少し大きく
          fontWeight: 'bold',
          fill: '#ffffff',
          wordWrap: true,
          wordWrapWidth: BOX_WIDTH - 20, // 枠より20px狭くしてパディング確保
          lineHeight: 20,
        });

        // テキスト生成
        const cleanSubject = email.subject || '(No Subject)';
        // 文字数制限は緩和するが、マスクがあるので安心
        const text = new PIXI.Text({
            text: cleanSubject, 
            style: textStyle
        });
        text.x = 10; // 左パディング
        text.y = 10; // 上パディング

        dirtContainer.addChild(graphics);
        dirtContainer.addChild(text);
        
        // インタラクション設定
        dirtContainer.eventMode = 'static';
        dirtContainer.cursor = 'none';

        // 物理ステート設定
        dirtContainer.physics = {
          hp: 100,
          maxHp: 100,
          isDead: false,
          isDying: false
        };
        dirtContainer.emailId = email.id;
        
        app.stage.addChild(dirtContainer);
        dirtListRef.current.push(dirtContainer);
      });

      // 4. メインループの登録 (システム連携)
      app.ticker.add(() => {
        if (!nozzleControllerRef.current || !interactionSystemRef.current) return;

        // ノズルの状態を取得
        const nozzleState = nozzleControllerRef.current.getState();

        // InteractionSystemを更新 (物理演算、ヒット判定)
        interactionSystemRef.current.update(
          { x: nozzleState.x, y: nozzleState.y },
          nozzleState.isSpraying,
          nozzleState.mode,
          dirtListRef.current
        );

        // 完全に消えた汚れを検出し、親コンポーネントへ通知
        dirtListRef.current.forEach(dirt => {
          if (dirt.physics?.isDead && dirt.emailId && !cleanedResultsRef.current.has(dirt.emailId)) {
            const action = dirt.physics.mode || 'ARCHIVE';
            cleanedResultsRef.current.set(dirt.emailId, action);
            
            const results: CleanedMessage[] = Array.from(cleanedResultsRef.current.entries()).map(([id, act]) => ({
              id,
              action: act
            }));
            onCleanComplete(results);
          }
        });
      });
    };

    initApp();

    // クリーンアップ関数
    return () => {
      isMounted = false;
      if (nozzleControllerRef.current) nozzleControllerRef.current.destroy();
      if (particleSystemRef.current) particleSystemRef.current.destroy();
      
      // SoundManagerの停止処理は呼ぶが、インスタンス自体は破棄しない
      if (soundManager) soundManager.stopJetLoop();

      // Pixi Appの完全破棄（Contextも破棄）
      if (appRef.current) {
        appRef.current.destroy({ removeView: true }, { children: true });
        appRef.current = null;
      }
      if (canvasRef.current) canvasRef.current.innerHTML = '';
      dirtListRef.current = [];
    };
  }, [emails]); // emailsが変わったときだけ再実行

  return (
    <div>
      <h3>Canvas Preview (Drag to Clean)</h3>
      
      {/* モード切替UI */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => setCurrentMode('ARCHIVE')}
          style={{
            backgroundColor: currentMode === 'ARCHIVE' ? '#2196F3' : '#ccc',
            color: currentMode === 'ARCHIVE' ? 'white' : 'black',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          💧 アーカイブ (青)
        </button>
        <button
          onClick={() => setCurrentMode('DELETE')}
          style={{
            backgroundColor: currentMode === 'DELETE' ? '#f44336' : '#ccc',
            color: currentMode === 'DELETE' ? 'white' : 'black',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          💥 ゴミ箱 (赤)
        </button>
      </div>

      <div 
        ref={canvasRef} 
        style={{ 
          border: '4px solid #444', 
          borderRadius: '8px', 
          display: 'inline-block',
          cursor: 'none' // システムカーソルを消してノズルを表示
        }} 
      />
      <p style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem', marginTop: '5px' }}>
        青ノズル: アーカイブ / 赤ノズル: ゴミ箱へ移動
      </p>
    </div>
  );
};

export default CleaningCanvas;