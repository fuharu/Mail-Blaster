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

// 背景テンプレートのタイプ
export type BackgroundTemplate =
  | 'washroom'      // 洗浄場風（タイルパターン）
  | 'concrete'      // コンクリート風
  | 'simple'        // シンプル（グラデーション）
  | 'dark'          // ダークモード
  | 'blue'          // ブルー系（水色）

// 背景テンプレートの描画関数
const drawBackground = (
  graphics: PIXI.Graphics,
  template: BackgroundTemplate,
  width: number,
  height: number
): void => {
  graphics.clear();

  switch (template) {
    case 'washroom':
      // 洗浄場風タイルパターン
      drawWashroomBackground(graphics, width, height);
      break;
    case 'concrete':
      // コンクリート風
      drawConcreteBackground(graphics, width, height);
      break;
    case 'simple':
      // シンプルグラデーション
      drawSimpleBackground(graphics, width, height);
      break;
    case 'dark':
      // ダークモード
      drawDarkBackground(graphics, width, height);
      break;
    case 'blue':
      // ブルー系
      drawBlueBackground(graphics, width, height);
      break;
  }
};

// 洗浄場風タイルパターン（改善版）
const drawWashroomBackground = (graphics: PIXI.Graphics, width: number, height: number): void => {
  const TILE_SIZE = 60;
  const TILE_GAP = 2;
  const MAIN_TILE_COLOR = 0xF8F8F8;
  const ACCENT_TILE_COLOR = 0xEEEEEE;
  const GRID_COLOR = 0xD0D0D0;

  // ベースグラデーション（上部が明るく、下部が少し暗く）
  const layers = 20;
  for (let i = 0; i < layers; i++) {
    const y = (height / layers) * i;
    const layerHeight = height / layers + 1;
    const brightness = 1.0 - (i / layers) * 0.1;
    const color = Math.floor(0xF8 * brightness) * 0x10000 + Math.floor(0xF8 * brightness) * 0x100 + Math.floor(0xF8 * brightness);
    graphics.rect(0, y, width, layerHeight);
    graphics.fill({ color: color, alpha: 1 });
  }

  const cols = Math.ceil(width / (TILE_SIZE + TILE_GAP));
  const rows = Math.ceil(height / (TILE_SIZE + TILE_GAP));

  // タイルの描画（立体的に見えるように）
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * (TILE_SIZE + TILE_GAP);
      const y = row * (TILE_SIZE + TILE_GAP);

      const isAccent = (row + col) % 3 === 0 || (row % 2 === 0 && col % 2 === 0);
      const tileColor = isAccent ? ACCENT_TILE_COLOR : MAIN_TILE_COLOR;

      // タイルの本体
      graphics.roundRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2, 2);
      graphics.fill({ color: tileColor, alpha: 1 });

      // タイルのハイライト（左上）
      graphics.rect(x + 2, y + 2, TILE_SIZE - 8, 10);
      graphics.fill({ color: 0xFFFFFF, alpha: 0.3 });

      // タイルのシャドウ（右下）
      graphics.rect(x + TILE_SIZE - 12, y + TILE_SIZE - 12, 10, 10);
      graphics.fill({ color: 0x000000, alpha: 0.1 });

      // グリッドライン（境目）
      if (col < cols - 1) {
        graphics.moveTo(x + TILE_SIZE, y);
        graphics.lineTo(x + TILE_SIZE, y + TILE_SIZE);
        graphics.stroke({ width: 1, color: GRID_COLOR, alpha: 0.4 });
      }
      if (row < rows - 1) {
        graphics.moveTo(x, y + TILE_SIZE);
        graphics.lineTo(x + TILE_SIZE, y + TILE_SIZE);
        graphics.stroke({ width: 1, color: GRID_COLOR, alpha: 0.4 });
      }
    }
  }

  // 装飾要素：水滴パターン（より自然に）
  for (let i = 0; i < 20; i++) {
    const dropX = Math.random() * width;
    const dropY = Math.random() * height;
    const dropSize = 2 + Math.random() * 5;
    const alpha = 0.08 + Math.random() * 0.12;

    // 水滴の外側（薄い）
    graphics.circle(dropX, dropY, dropSize * 1.5);
    graphics.fill({ color: 0xC0C0C0, alpha: alpha * 0.5 });

    // 水滴の本体
    graphics.circle(dropX, dropY, dropSize);
    graphics.fill({ color: 0xD0D0D0, alpha: alpha });

    // 水滴のハイライト
    graphics.circle(dropX - dropSize * 0.3, dropY - dropSize * 0.3, dropSize * 0.3);
    graphics.fill({ color: 0xFFFFFF, alpha: alpha * 1.5 });
  }
};

// コンクリート風（改善版）
const drawConcreteBackground = (graphics: PIXI.Graphics, width: number, height: number): void => {
  // ベースグラデーション
  const baseLayers = 15;
  for (let i = 0; i < baseLayers; i++) {
    const y = (height / baseLayers) * i;
    const layerHeight = height / baseLayers + 1;
    const brightness = 0.85 + (Math.sin(i / baseLayers * Math.PI) * 0.15);
    const color = Math.floor(0xE0 * brightness) * 0x10000 + Math.floor(0xE0 * brightness) * 0x100 + Math.floor(0xE0 * brightness);
    graphics.rect(0, y, width, layerHeight);
    graphics.fill({ color: color, alpha: 1 });
  }

  // コンクリート風のテクスチャ（より細かく）
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.5 + Math.random() * 2.5;
    const alpha = 0.08 + Math.random() * 0.15;
    const variation = Math.random() * 30;
    const grayValue = Math.floor(0xC0 - variation);
    const color = grayValue * 0x10000 + grayValue * 0x100 + grayValue;
    graphics.circle(x, y, size);
    graphics.fill({ color: color, alpha: alpha });
  }

  // より細かいノイズ
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.3 + Math.random() * 1.2;
    graphics.circle(x, y, size);
    graphics.fill({ color: 0xA0A0A0, alpha: 0.1 });
  }

  // クラック風の線（より自然に）
  for (let i = 0; i < 8; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const segments = 3 + Math.floor(Math.random() * 4);
    let currentX = startX;
    let currentY = startY;

    graphics.moveTo(currentX, currentY);
    for (let j = 0; j < segments; j++) {
      const nextX = currentX + (Math.random() - 0.5) * 80;
      const nextY = currentY + (Math.random() - 0.5) * 80;
      graphics.lineTo(nextX, nextY);
      currentX = nextX;
      currentY = nextY;
    }
    graphics.stroke({ width: 1.5, color: 0xB0B0B0, alpha: 0.25 });
  }
};

// シンプルグラデーション（改善版）
const drawSimpleBackground = (graphics: PIXI.Graphics, width: number, height: number): void => {
  // 上部から下部への滑らかなグラデーション
  const layers = 30;
  for (let i = 0; i < layers; i++) {
    const y = (height / layers) * i;
    const layerHeight = height / layers + 1;
    const progress = i / layers;

    // 上部（明るい）から下部（少し暗い）へのグラデーション
    const topR = 0xF8;
    const topG = 0xF8;
    const topB = 0xF8;
    const bottomR = 0xF0;
    const bottomG = 0xF0;
    const bottomB = 0xF0;

    const r = Math.floor(topR + (bottomR - topR) * progress);
    const g = Math.floor(topG + (bottomG - topG) * progress);
    const b = Math.floor(topB + (bottomB - topB) * progress);
    const color = r * 0x10000 + g * 0x100 + b;

    graphics.rect(0, y, width, layerHeight);
    graphics.fill({ color: color, alpha: 1 });
  }

  // わずかなノイズで質感を追加
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 1 + Math.random() * 2;
    graphics.circle(x, y, size);
    graphics.fill({ color: 0xFFFFFF, alpha: 0.05 });
  }
};

// ダークモード（改善版）
const drawDarkBackground = (graphics: PIXI.Graphics, width: number, height: number): void => {
  // ベースグラデーション（少し明るい部分も）
  const baseLayers = 15;
  for (let i = 0; i < baseLayers; i++) {
    const y = (height / baseLayers) * i;
    const layerHeight = height / baseLayers + 1;
    const brightness = 0.85 + (Math.sin(i / baseLayers * Math.PI * 2) * 0.15);
    const grayValue = Math.floor(0x1A * brightness);
    const color = grayValue * 0x10000 + grayValue * 0x100 + grayValue;
    graphics.rect(0, y, width, layerHeight);
    graphics.fill({ color: color, alpha: 1 });
  }

  // グリッドパターン（より洗練）
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    graphics.moveTo(x, 0);
    graphics.lineTo(x, height);
    graphics.stroke({ width: 1, color: 0x2A2A2A, alpha: 0.6 });
  }
  for (let y = 0; y < height; y += gridSize) {
    graphics.moveTo(0, y);
    graphics.lineTo(width, y);
    graphics.stroke({ width: 1, color: 0x2A2A2A, alpha: 0.6 });
  }

  // 細かいノイズパターン
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 0.5 + Math.random() * 1.5;
    graphics.circle(x, y, size);
    graphics.fill({ color: 0xFFFFFF, alpha: 0.03 });
  }
};

// ブルー系（水色）（改善版）
const drawBlueBackground = (graphics: PIXI.Graphics, width: number, height: number): void => {
  // 水色のグラデーション（上部が明るく、下部が少し濃く）
  const layers = 25;
  for (let i = 0; i < layers; i++) {
    const y = (height / layers) * i;
    const layerHeight = height / layers + 1;
    const progress = i / layers;

    // 上部（明るい水色）から下部（少し濃い水色）へ
    const topR = 0xE3;
    const topG = 0xF2;
    const topB = 0xFD;
    const bottomR = 0xBB;
    const bottomG = 0xDE;
    const bottomB = 0xFB;

    const r = Math.floor(topR + (bottomR - topR) * progress);
    const g = Math.floor(topG + (bottomG - topG) * progress);
    const b = Math.floor(topB + (bottomB - topB) * progress);
    const color = r * 0x10000 + g * 0x100 + b;

    graphics.rect(0, y, width, layerHeight);
    graphics.fill({ color: color, alpha: 1 });
  }

  // 波のようなパターン（より自然に）
  for (let i = 0; i < 12; i++) {
    const y = (height / 12) * i;
    const waveAlpha = 0.03 + (Math.sin(i / 12 * Math.PI * 4) * 0.02);
    graphics.rect(0, y, width, height / 12);
    graphics.fill({ color: 0x90CAF9, alpha: waveAlpha });
  }

  // 気泡のような装飾（よりリアルに）
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = 4 + Math.random() * 12;
    const alpha = 0.15 + Math.random() * 0.2;

    // 気泡の外側（薄い）
    graphics.circle(x, y, size * 1.3);
    graphics.stroke({ width: 1, color: 0x90CAF9, alpha: alpha * 0.5 });

    // 気泡の本体
    graphics.circle(x, y, size);
    graphics.stroke({ width: 1.5, color: 0x64B5F6, alpha: alpha });

    // 気泡のハイライト
    graphics.circle(x - size * 0.3, y - size * 0.3, size * 0.3);
    graphics.fill({ color: 0xFFFFFF, alpha: alpha * 2 });
  }

  // 光の反射（上部）
  for (let i = 0; i < 3; i++) {
    const x = Math.random() * width;
    const y = Math.random() * (height * 0.3);
    const size = 20 + Math.random() * 30;
    graphics.circle(x, y, size);
    graphics.fill({ color: 0xFFFFFF, alpha: 0.1 });
  }
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
  const [backgroundTemplate, setBackgroundTemplate] = useState<BackgroundTemplate>('washroom');
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);

  // 背景グラフィックの参照
  const backgroundGraphicsRef = useRef<PIXI.Graphics | null>(null);

  // 背景テンプレートの定義
  const backgroundTemplates = [
    {
      key: 'washroom' as const,
      icon: '🚿', // シャワー（洗浄場を表す）
      label: '洗浄場',
      color: '#F5F5F5',
      iconBg: 'linear-gradient(135deg, #B3E5FC 0%, #81D4FA 100%)',
      iconColor: '#0277BD',
    },
    {
      key: 'concrete' as const,
      icon: '🏛️', // 建造物（コンクリートを表す）
      label: 'コンクリート',
      color: '#E0E0E0',
      iconBg: 'linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%)',
      iconColor: '#424242',
    },
    {
      key: 'simple' as const,
      icon: '✨', // 星（シンプルでクリーンな印象）
      label: 'シンプル',
      color: '#F8F8F8',
      iconBg: 'linear-gradient(135deg, #F5F5F5 0%, #EEEEEE 100%)',
      iconColor: '#757575',
    },
    {
      key: 'blue' as const,
      icon: '🌊', // 波（ブルーを表す）
      label: 'ブルー',
      color: '#E3F2FD',
      iconBg: 'linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%)',
      iconColor: '#1565C0',
    },
    {
      key: 'dark' as const,
      icon: '🌑', // 新月（ダークを表す）
      label: 'ダーク',
      color: '#1A1A1A',
      iconBg: 'linear-gradient(135deg, #616161 0%, #424242 100%)',
      iconColor: '#FFD700',
    },
  ];

  const currentTemplate = backgroundTemplates.find(t => t.key === backgroundTemplate) || backgroundTemplates[0];

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
        backgroundColor: 0xF5F5F5, // 明るい背景（洗浄場風）
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

      // 1.5. 背景グラフィックの作成
      const backgroundGraphics = new PIXI.Graphics();
      backgroundGraphics.zIndex = 0; // 最下層
      app.stage.addChild(backgroundGraphics);
      backgroundGraphicsRef.current = backgroundGraphics;

      // 背景テンプレートの描画
      drawBackground(backgroundGraphics, backgroundTemplate, 800, 600);

      // 2. 各マネージャー・システムの初期化と依存性注入
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

      // 3. アセットのロードとメールの汚れオブジェクト生成
      // 画像を事前にロード（v8推奨）
      const dirtImages = [
        '/images/pack.png',
        '/images/dirt.png',
        '/images/cardboard.png',
        '/images/tuti.png',
        '/images/can.svg',
      ];
      
      // 背景と汚れ画像を同時にロード
      const [bgTexture, ...textures] = await Promise.all([
        PIXI.Assets.load('/images/floor.png'),
        ...dirtImages.map(path => PIXI.Assets.load(path))
      ]);

      // 背景スプライトを一番奥に追加
      const background = new PIXI.Sprite(bgTexture);
      background.width = app.screen.width;
      background.height = app.screen.height;
      app.stage.addChildAt(background, 0);

      dirtListRef.current = [];
      cleanedResultsRef.current.clear();

      // グリッドレイアウト用の定数
      const BOX_WIDTH = 200;
      const BOX_HEIGHT = 100;
      const COLS = 3;
      const SPACING_X = 240;
      const SPACING_Y = 140;
      const GRID_OFFSET_X = 60;
      const GRID_OFFSET_Y = 60;

      emails.forEach((email, index) => {
        // 汚れのコンテナ作成
        const dirtContainer = new PIXI.Container() as DirtContainer;

        // グリッドレイアウト + ランダムなゆらぎ (Jitter)
        // 完全に重ならないようにグリッドに配置しつつ、少しずらして「汚れ感」を出す
        const col = index % COLS;
        const row = Math.floor(index / COLS);

        // 基本位置
        const baseX = GRID_OFFSET_X + col * SPACING_X;
        const baseY = GRID_OFFSET_Y + row * SPACING_Y;

        // ゆらぎ (-20px ~ +20px 程度)
        const jitterX = (Math.random() - 0.5) * 40;
        const jitterY = (Math.random() - 0.5) * 40;

        // 位置を設定
        dirtContainer.x = baseX + jitterX;
        dirtContainer.y = baseY + jitterY;

        // 画像の表示 (ランダムに選択)
        const texture = textures[Math.floor(Math.random() * textures.length)];
        const dirtSprite = new PIXI.Sprite(texture);
        dirtSprite.width = BOX_WIDTH;
        dirtSprite.height = BOX_HEIGHT;
        dirtSprite.anchor.set(0); // 左上基準
        dirtContainer.addChild(dirtSprite);

        // 汚れのグラフィック（枠）
        const graphics = new PIXI.Graphics();
        // 少し大きめにして文字の余白を作る
        graphics.rect(0, 0, BOX_WIDTH, BOX_HEIGHT);
        graphics.fill({ color: 0x8B4513 });
        // 枠線を少し明るくして視認性を上げる
        graphics.stroke({ width: 2, color: 0xA0522D });

        // テキストのはみ出し防止（マスク処理）
        // マスク用のグラフィック（これより外側は表示されない）
        const mask = new PIXI.Graphics();
        mask.rect(0, 0, BOX_WIDTH, BOX_HEIGHT);
        mask.fill({ color: 0xFFFFFF }); // 色は何でも良い
        dirtContainer.addChild(mask);
        dirtContainer.mask = mask; // コンテナ全体にマスクを適用

        // テキストスタイル調整
        const textStyle = new PIXI.TextStyle({
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#ffffff',
          wordWrap: true,
          wordWrapWidth: 180,
        });
        
        // 長すぎる件名をカット
        const cleanSubject = email.subject || '(No Subject)';
        const displaySubject = cleanSubject.length > 30 
          ? cleanSubject.substring(0, 30) + '...' 
          : cleanSubject;

        const text = new PIXI.Text({
          text: displaySubject,
          style: textStyle
        });
        text.x = 10;
        text.y = 10;

        // dirtContainer.addChild(graphics);
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

        // zIndexを設定（背景の上、エフェクト/ノズルの下）
        dirtContainer.zIndex = 100;

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
      
      if (nozzleControllerRef.current) {
        nozzleControllerRef.current.destroy();
        nozzleControllerRef.current = null;
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
        particleSystemRef.current = null;
      }

      // SoundManagerの停止処理は呼ぶが、インスタンス自体は破棄しない
      if (soundManager) soundManager.stopJetLoop();

      // Pixi Appの完全破棄（Contextも破棄）
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
  }, [emails, soundManager]); // emailsとsoundManagerが変わったときだけ再実行

  // 背景テンプレート変更時の処理
  useEffect(() => {
    if (backgroundGraphicsRef.current && appRef.current) {
      drawBackground(backgroundGraphicsRef.current, backgroundTemplate, 800, 600);

      // 背景色も更新
      const bgColorMap: Record<BackgroundTemplate, number> = {
        washroom: 0xF5F5F5,
        concrete: 0xE0E0E0,
        simple: 0xF8F8F8,
        dark: 0x1A1A1A,
        blue: 0xE3F2FD,
      };
      appRef.current.renderer.background.color = bgColorMap[backgroundTemplate];
    }
  }, [backgroundTemplate]);

  // Escキーでドロップダウンを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBackgroundOpen) {
        setIsBackgroundOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isBackgroundOpen]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* タイトル */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
          🧹 メール洗浄画面
        </h2>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
          ノズルで汚れ（未読メール）を洗い流そう！
        </p>
      </div>

      {/* コントロールパネル */}
      <div style={{
        backgroundColor: '#f8f8f8',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* モード切替UI */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#555',
            marginBottom: '8px'
          }}>
            洗浄モード:
          </label>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => setCurrentMode('ARCHIVE')}
              style={{
                backgroundColor: currentMode === 'ARCHIVE' ? '#2196F3' : '#fff',
                color: currentMode === 'ARCHIVE' ? 'white' : '#555',
                border: `2px solid ${currentMode === 'ARCHIVE' ? '#2196F3' : '#ddd'}`,
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                boxShadow: currentMode === 'ARCHIVE' ? '0 2px 6px rgba(33,150,243,0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentMode !== 'ARCHIVE') {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (currentMode !== 'ARCHIVE') {
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              💧 アーカイブ
            </button>
            <button
              onClick={() => setCurrentMode('DELETE')}
              style={{
                backgroundColor: currentMode === 'DELETE' ? '#f44336' : '#fff',
                color: currentMode === 'DELETE' ? 'white' : '#555',
                border: `2px solid ${currentMode === 'DELETE' ? '#f44336' : '#ddd'}`,
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                boxShadow: currentMode === 'DELETE' ? '0 2px 6px rgba(244,67,54,0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (currentMode !== 'DELETE') {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                }
              }}
              onMouseLeave={(e) => {
                if (currentMode !== 'DELETE') {
                  e.currentTarget.style.backgroundColor = '#fff';
                }
              }}
            >
              💥 削除
            </button>
          </div>
        </div>

        {/* 背景テンプレート選択UI（コンパクトドロップダウン版） */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#555',
            marginBottom: '8px'
          }}>
            背景テンプレート:
          </label>
          <div style={{
            position: 'relative',
            display: 'inline-block',
            width: '100%',
            maxWidth: '280px'
          }}>
            <button
              onClick={() => setIsBackgroundOpen(!isBackgroundOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: '#fff',
                border: `2px solid ${isBackgroundOpen ? '#4CAF50' : '#ddd'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                boxShadow: isBackgroundOpen ? '0 2px 8px rgba(76,175,80,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => {
                if (!isBackgroundOpen) {
                  e.currentTarget.style.borderColor = '#4CAF50';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBackgroundOpen) {
                  e.currentTarget.style.borderColor = '#ddd';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                {/* プレビューサムネイル（改善版） */}
                <div style={{
                  width: '36px',
                  height: '28px',
                  background: currentTemplate.iconBg || currentTemplate.color,
                  borderRadius: '6px',
                  border: `2px solid ${isBackgroundOpen ? '#4CAF50' : '#ddd'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0,
                  boxShadow: isBackgroundOpen
                    ? '0 2px 8px rgba(76,175,80,0.3), inset 0 1px 2px rgba(255,255,255,0.3)'
                    : '0 2px 4px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.3)',
                  transition: 'all 0.2s',
                  transform: isBackgroundOpen ? 'scale(1.05)' : 'scale(1)',
                  filter: isBackgroundOpen ? 'brightness(1.1)' : 'brightness(1)',
                }}>
                  {currentTemplate.icon}
                </div>
                {/* ラベル */}
                <span style={{ fontSize: '0.9rem', color: '#555', fontWeight: '500' }}>
                  {currentTemplate.label}
                </span>
              </div>
              {/* 矢印アイコン */}
              <span style={{
                fontSize: '0.7rem',
                color: '#888',
                transition: 'transform 0.2s',
                transform: isBackgroundOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                flexShrink: 0,
              }}>
                ▼
              </span>
            </button>

            {isBackgroundOpen && (
              <>
                {/* オーバーレイ（外側クリックで閉じる） */}
                <div
                  onClick={() => setIsBackgroundOpen(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    backgroundColor: 'transparent',
                  }}
                />
                {/* ドロップダウンメニュー */}
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#fff',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                  zIndex: 1000,
                  width: '100%',
                  overflow: 'hidden',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {backgroundTemplates.map(({ key, icon, label, color, iconBg, iconColor }) => (
                    <div
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBackgroundTemplate(key);
                        setIsBackgroundOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        backgroundColor: backgroundTemplate === key ? '#f0f8ff' : '#fff',
                        borderBottom: '1px solid #eee',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (backgroundTemplate !== key) {
                          e.currentTarget.style.backgroundColor = '#f5f5f5';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (backgroundTemplate !== key) {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }
                      }}
                    >
                      {/* プレビューサムネイル（改善版） */}
                      <div
                        style={{
                          width: '56px',
                          height: '42px',
                          background: iconBg || color,
                          borderRadius: '6px',
                          border: backgroundTemplate === key
                            ? '3px solid #4CAF50'
                            : '2px solid #ddd',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.8rem',
                          flexShrink: 0,
                          boxShadow: backgroundTemplate === key
                            ? '0 4px 12px rgba(76,175,80,0.4), inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1)'
                            : '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease',
                          transform: backgroundTemplate === key ? 'scale(1.05)' : 'scale(1)',
                          filter: backgroundTemplate === key ? 'brightness(1.15)' : 'brightness(1)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          if (backgroundTemplate !== key) {
                            e.currentTarget.style.transform = 'scale(1.08)';
                            e.currentTarget.style.filter = 'brightness(1.1)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (backgroundTemplate !== key) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.filter = 'brightness(1)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.1)';
                          }
                        }}
                      >
                        {/* グラデーションオーバーレイ */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 100%)',
                          borderRadius: '4px',
                          pointerEvents: 'none',
                        }} />
                        {/* アイコン */}
                        <span style={{
                          position: 'relative',
                          zIndex: 1,
                          filter: iconColor ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
                        }}>
                          {icon}
                        </span>
                      </div>

                      {/* ラベル */}
                      <span style={{
                        flex: 1,
                        fontSize: '0.9rem',
                        fontWeight: backgroundTemplate === key ? 'bold' : 'normal',
                        color: backgroundTemplate === key ? '#4CAF50' : '#555',
                      }}>
                        {label}
                      </span>

                      {/* 選択インジケーター */}
                      {backgroundTemplate === key && (
                        <span style={{
                          color: '#4CAF50',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}>
                          ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* キャンバス */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div
          ref={canvasRef}
          style={{
            border: '4px solid #333',
            borderRadius: '8px',
            display: 'inline-block',
            cursor: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* 操作説明 */}
      <div style={{
        textAlign: 'center',
        padding: '12px',
        backgroundColor: '#fff3cd',
        borderRadius: '6px',
        border: '1px solid #ffc107',
      }}>
        <p style={{ margin: '0', fontSize: '0.9rem', color: '#856404', fontWeight: '500' }}>
          <strong>操作方法:</strong> マウスを動かしてノズルを操作 / クリックして洗浄
          {currentMode === 'ARCHIVE' ? ' (アーカイブ)' : ' (削除)'}
        </p>
      </div>

      {/* CSSアニメーション定義 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CleaningCanvas;