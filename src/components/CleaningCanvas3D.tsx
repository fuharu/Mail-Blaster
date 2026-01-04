// src/components/CleaningCanvas3D.tsx
import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { EmailMessage } from '../types';

interface Props {
  emails: EmailMessage[];
  onCleanComplete: (cleanedIds: string[]) => void;
}

// 個別の「汚れ（メール）」コンポーネント
const DirtMesh = ({ email, onCleaned }: { email: EmailMessage; onCleaned: (id: string) => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(1.0);
  const [isHovered, setIsHovered] = useState(false);
  
  // ランダムな位置 (3D空間上の X, Y)
  // useMemoを使って位置を固定（再レンダリングで動かないように）
  const position = useRef<[number, number, number]>([
    (Math.random() - 0.5) * 10, // X: -5 ~ 5
    (Math.random() - 0.5) * 6,  // Y: -3 ~ 3
    0                           // Z: 壁と同じ位置
  ]);

  // 毎フレーム実行 (洗浄ロジック)
  useFrame(() => {
    if (isHovered && opacity > 0) {
      // ホバー中なら透明度を下げる
      setOpacity((prev) => Math.max(0, prev - 0.02));
    }
    
    // 完全に消えたら通知
    if (opacity <= 0 && meshRef.current?.visible) {
      meshRef.current.visible = false;
      onCleaned(email.id);
    }
  });

  if (opacity <= 0) return null;

  return (
    <group position={position.current}>
      {/* 汚れの本体 (板ポリゴン) */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <planeGeometry args={[2.5, 1.2]} /> {/* 幅2.5, 高さ1.2の板 */}
        <meshStandardMaterial 
          color="#8B4513" // 茶色
          transparent 
          opacity={opacity} 
          roughness={0.8}
        />
      </mesh>

      {/* テキスト (メール件名) */}
      <Text
        position={[0, 0, 0.01]} // 汚れの少し手前に配置
        fontSize={0.2}
        color="white"
        maxWidth={2.3}
        anchorX="center"
        anchorY="middle"
        fillOpacity={opacity} // テキストも一緒に薄くする
      >
        {email.subject.substring(0, 20)}...
      </Text>
    </group>
  );
};

const CleaningCanvas3D = ({ emails, onCleanComplete }: Props) => {
  const cleanedIdsRef = useRef<Set<string>>(new Set());

  const handleCleaned = (id: string) => {
    if (!cleanedIdsRef.current.has(id)) {
      cleanedIdsRef.current.add(id);
      onCleanComplete(Array.from(cleanedIdsRef.current));
    }
  };

  return (
    <div style={{ height: '600px', width: '800px', border: '4px solid #444', borderRadius: '8px' }}>
      {/* 3Dシーンのキャンバス */}
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        {/* 照明 */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        
        {/* 背景の色 */}
        <color attach="background" args={['#333']} />

        {/* 汚れオブジェクトの配置 */}
        {emails.map((email) => (
          <DirtMesh key={email.id} email={email} onCleaned={handleCleaned} />
        ))}

        {/* カメラ操作 (マウスでぐりぐり動かせる) */}
        <OrbitControls enablePan={false} />
      </Canvas>
      
      <p style={{textAlign: 'center', color: '#666', fontSize: '0.8rem'}}>
        (Left Click + Drag to Rotate Camera / Hover to Clean)
      </p>
    </div>
  );
};

export default CleaningCanvas3D;