// src/systems/SoundManager.ts
import type { SoundKey } from '../types';

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private buffers: Map<SoundKey, AudioBuffer> = new Map();
  
  // ウォータージェット用（ループ制御のため個別に保持）
  private jetSource: AudioBufferSourceNode | null = null;
  private jetGainNode: GainNode | null = null;
  private isJetPlaying: boolean = false;

  // 音量設定 (0.0 ~ 1.0)
  private readonly MASTER_VOLUME = 0.5;
  
  // ファイルパスのマッピング
  private readonly SOUND_FILES: Record<SoundKey, string> = {
    'CLEAN': '/sounds/clean.mp3',
    'DESTROY': '/sounds/destroy.mp3',
    'STAGE_CLEAR': '/sounds/stage-clear.mp3',
    'WATER_JET': '/sounds/water-jet.mp3', // ※ループ素材前提
  };

  constructor() {
    // ブラウザの互換性対応
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * 全ての音声ファイルを先行読み込みする（ゲーム開始前に呼ぶ）
   */
  public async loadAll(): Promise<void> {
    if (!this.audioContext) return;

    const promises = Object.entries(this.SOUND_FILES).map(async ([key, path]) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.buffers.set(key as SoundKey, audioBuffer);
      } catch (error) {
        console.error(`Failed to load sound: ${path}`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 単発の音を鳴らす（クリーン、破壊、クリアなど）
   */
  public play(key: SoundKey, volume: number = 1.0) {
    if (!this.audioContext || !this.buffers.has(key)) return;

    // ブラウザの自動再生ポリシー対応（ユーザー操作後の再開）
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers.get(key)!;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume * this.MASTER_VOLUME;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * ウォータージェット音のループ再生を開始
   * フェードイン処理を入れて自然に鳴らす
   */
  public startJetLoop() {
    if (!this.audioContext || !this.buffers.has('WATER_JET')) return;
    if (this.isJetPlaying) return; // 既に鳴っていたら無視

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // ソースとゲインノードの作成
    this.jetSource = this.audioContext.createBufferSource();
    this.jetSource.buffer = this.buffers.get('WATER_JET')!;
    this.jetSource.loop = true; // ★ループ設定

    this.jetGainNode = this.audioContext.createGain();
    this.jetGainNode.gain.value = 0; // 最初は音量0から

    this.jetSource.connect(this.jetGainNode);
    this.jetGainNode.connect(this.audioContext.destination);

    this.jetSource.start(0);
    this.isJetPlaying = true;

    // 0.1秒かけてフェードイン
    this.jetGainNode.gain.linearRampToValueAtTime(
      this.MASTER_VOLUME, 
      this.audioContext.currentTime + 0.1
    );
  }

  /**
   * ウォータージェット音を停止
   * フェードアウト処理を入れてプツッと切れないようにする
   */
  public stopJetLoop() {
    if (!this.audioContext || !this.isJetPlaying || !this.jetGainNode || !this.jetSource) return;

    const stopTime = this.audioContext.currentTime + 0.2; // 0.2秒後に完全停止

    // フェードアウト
    this.jetGainNode.gain.linearRampToValueAtTime(0, stopTime);
    
    // 音源の停止予約
    this.jetSource.stop(stopTime);

    // クリーンアップ
    // 完全に停止した後の処理はガベージコレクションに任せるが、
    // フラグは即座に折って再開可能な状態にする
    this.isJetPlaying = false;
    this.jetSource = null;
    this.jetGainNode = null;
  }
}