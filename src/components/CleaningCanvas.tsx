// src/components/CleaningCanvas.tsx
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { EmailMessage } from '../types';

interface Props {
  emails: EmailMessage[];
  onCleanComplete: (cleanedIds: string[]) => void;
}

const CleaningCanvas = ({ emails, onCleanComplete }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const cleanedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 既に初期化済み、またはDOMがない、メールがない場合はスキップ
    if (!canvasRef.current || emails.length === 0) return;
    
    // 多重初期化防止
    if (appRef.current) return;

    const initApp = async () => {
      // 1. Pixiアプリケーションの作成 (v8対応: initを使用)
      const app = new PIXI.Application();
      
      await app.init({
        width: 800,
        height: 600,
        backgroundColor: 0x333333, // 暗い背景
        backgroundAlpha: 1,
      });

      // マウント時に参照が外れている可能性のガード
      if (!canvasRef.current) {
        app.destroy();
        return;
      }

      // HTML要素にCanvasを追加 (v8対応: view ではなく canvas)
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // 2. メールの汚れオブジェクト生成
      emails.forEach((email) => {
        // 汚れのコンテナ
        const dirtContainer = new PIXI.Container();
        
        // ランダムな位置に配置
        dirtContainer.x = 50 + Math.random() * 550; // 画面内に収まるように調整
        dirtContainer.y = 50 + Math.random() * 400;

        // 汚れのグラフィック（仮：茶色の四角形）
        const graphics = new PIXI.Graphics();
        graphics.rect(0, 0, 200, 100); // v8推奨: drawRect -> rect
        graphics.fill(0x8B4513);       // v8推奨: beginFill -> fill
        // 角丸にする場合はこちら: graphics.roundRect(0, 0, 200, 100, 15).fill(0x8B4513);
        
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
        dirtContainer.cursor = 'crosshair';

        // ★洗浄ロジック: マウスオーバー/クリックで透明度を下げる
        let isCleaning = false;
        
        dirtContainer.on('pointerdown', () => { isCleaning = true; });
        dirtContainer.on('pointerup', () => { isCleaning = false; });
        dirtContainer.on('pointerupoutside', () => { isCleaning = false; });
        
        // 毎フレーム実行されるループ
        app.ticker.add(() => {
          if (isCleaning) {
            // 徐々に透明にする
            dirtContainer.alpha -= 0.05;

            // 完全に消えたら
            if (dirtContainer.alpha <= 0) {
              dirtContainer.visible = false;
              isCleaning = false;
              
              // 既に記録済みでなければリストに追加
              if (!cleanedIdsRef.current.has(email.id)) {
                  cleanedIdsRef.current.add(email.id);
                  onCleanComplete(Array.from(cleanedIdsRef.current));
              }
            }
          }
        });

        app.stage.addChild(dirtContainer);
      });
    };

    initApp();

    // クリーンアップ関数
    return () => {
      if (appRef.current) {
        appRef.current.destroy({ removeView: true }, { children: true });
        appRef.current = null;
      }
    };
  }, [emails]); // emailsが変わったときだけ再実行

  return (
    <div>
      <h3>Canvas Preview (Drag/Click to Clean)</h3>
      <div ref={canvasRef} style={{ border: '4px solid #444', borderRadius: '8px', display: 'inline-block' }} />
    </div>
  );
};

export default CleaningCanvas;