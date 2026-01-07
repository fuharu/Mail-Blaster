import { Howl } from 'howler';

// 音の登録
export const sounds = {
  jet: new Howl({
    src: ['/sounds/water-jet.mp3'],
    loop: true, // 噴射音はループさせる
    volume: 0.5
  }),
  clean: new Howl({
    src: ['/sounds/clean.mp3'], // アーカイブ音
    volume: 0.8
  }),
  destroy: new Howl({
    src: ['/sounds/destroy.mp3'], // 削除音
    volume: 0.8
  }),
  clear: new Howl({
    src: ['/sounds/stage-clear.mp3'],
    volume: 1.0
  })
};

// 音を鳴らすための便利な関数
export const playSound = (name: keyof typeof sounds) => {
  sounds[name].play();
};

export const stopSound = (name: keyof typeof sounds) => {
  sounds[name].stop();
};