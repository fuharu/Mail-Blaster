// src/components/CleaningCanvas.tsx
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import type { EmailMessage, CleaningMode, DirtPhysicsState } from '../types';
import { NozzleController } from './nozzle/NozzleController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SoundManager } from '../systems/SoundManager';

interface Props {
  emails: EmailMessage[];
  onCleanComplete: (cleanedIds: string[]) => void;
}

// 汚れコンテナの型拡張
type DirtContainer = PIXI.Container & {
  physics?: DirtPhysicsState;
  emailId?: string;
};

const CleaningCanvas = ({ emails, onCleanComplete }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const cleanedIdsRef = useRef<Set<string>>(new Set());

  // システムの参照
  const soundManagerRef = useRef<SoundManager | null>(null);
  const nozzleControllerRef = useRef<NozzleController | null>(null);
  const interactionSystemRef = useRef<InteractionSystem | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const dirtListRef = useRef<DirtContainer[]>([]);

  // UI状態
  const [currentMode, setCurrentMode] = useState<CleaningMode>('ARCHIVE');

  // モード変更をコントローラーに反映
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

      // 修正: init待機中にアンマウントされていたら破棄して終了
      if (!isMounted) {
        app.destroy();
        return;
      }

      // マウント時に参照が外れている可能性のガード
      if (!canvasRef.current) {
        app.destroy();
        return;
      }

      // HTML要素にCanvasを追加 (v8対応: view ではなく canvas)
      // 修正: 念のため既存の子要素をクリアしてから追加
      while (canvasRef.current.firstChild) {
        canvasRef.current.removeChild(canvasRef.current.firstChild);
      }
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // ステージのソートを有効化（ノズルやエフェクトの重なり順のため）
      app.stage.sortableChildren = true;

      // 2. 各マネージャー・システムの初期化と依存性注入
      
      // SoundManagerの初期化とロード
      const soundManager = new SoundManager();
      await soundManager.loadAll();
      soundManagerRef.current = soundManager;

      // ParticleSystemの初期化
      const particleSystem = new ParticleSystem(app.stage);
      particleSystemRef.current = particleSystem;

      // InteractionSystemの初期化 (ParticleとSoundを注入)
      interactionSystemRef.current = new InteractionSystem(particleSystem, soundManager);

      // NozzleControllerの初期化 (Soundを注入)
      const nozzleController = new NozzleController(app, soundManager);
      nozzleController.setMode(currentMode); // 初期モードをセット（stateの値を反映）
      nozzleControllerRef.current = nozzleController;

      // 3. メールの汚れオブジェクト生成 (Rendering担当の実装ベース)
      dirtListRef.current = [];

      emails.forEach((email) => {
        // 汚れのコンテナ作成
        const dirtContainer = new PIXI.Container() as DirtContainer;
        
        // ランダムな位置に配置
        dirtContainer.x = 50 + Math.random() * 550; // 画面内に収まるように調整
        dirtContainer.y = 50 + Math.random() * 400;

        // 汚れのグラフィック（仮：茶色の四角形）
        const graphics = new PIXI.Graphics();
        graphics.rect(0, 0, 200, 100); // v8推奨: drawRect -> rect
        graphics.fill(0x8B4513);       // v8推奨: beginFill -> fill
        // 角丸にする場合: graphics.roundRect(0, 0, 200, 100, 15).fill(0x8B4513);
        
        // テキスト（うっすら見える件名）
        const textStyle = new PIXI.TextStyle({
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#ffffff',
          wordWrap: true,
          wordWrapWidth: 180,
        });
        // 長すぎる件名をカット
        const cleanSubject = email.subject || '(No Subject)';
        const text = new PIXI.Text({
            text: cleanSubject.substring(0, 30) + '...', 
            style: textStyle
        });
        text.x = 10;
        text.y = 10;

        dirtContainer.addChild(graphics);
        dirtContainer.addChild(text);
        
        // インタラクション設定 (v8)
        dirtContainer.eventMode = 'static';
        dirtContainer.cursor = 'none'; // ノズルカーソルを使うため非表示

        // 物理ステートとメールIDを紐付け
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
          if (dirt.physics?.isDead && dirt.emailId && !cleanedIdsRef.current.has(dirt.emailId)) {
            cleanedIdsRef.current.add(dirt.emailId);
            onCleanComplete(Array.from(cleanedIdsRef.current));
          }
        });
      });
    };

    initApp();

    // クリーンアップ関数
    return () => {
      // 修正: アンマウントフラグを立てる
      isMounted = false;

      if (nozzleControllerRef.current) {
         nozzleControllerRef.current.destroy();
         nozzleControllerRef.current = null;
      }
      if (particleSystemRef.current) {
         particleSystemRef.current.destroy();
         particleSystemRef.current = null;
      }
      // SoundManagerは特に明示的な破棄メソッドがなければGCに任せるか、必要ならstop呼び出し
      if (soundManagerRef.current) {
         soundManagerRef.current.stopJetLoop(); // 念の為停止
         soundManagerRef.current = null;
      }
      
      if (appRef.current) {
        appRef.current.destroy({ removeView: true }, { children: true });
        appRef.current = null;
      }
      
      // 修正: DOMからも確実に削除
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
      }

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
          💥 削除 (赤)
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
        マウスドラッグで洗浄！ {currentMode === 'ARCHIVE' ? 'アーカイブします' : '削除します'}
      </p>
    </div>
  );
};

export default CleaningCanvas;