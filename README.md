# Data Driven Timelines
複数ストリームのタイムライン表示ツール

## 開発手順
- NPMモジュールをインストール
  - npm install
- D3.jsをビルド
  - npm run prepublish
- D3.jと結合したddtimelines.jsを作る。distフォルダに出力される。
  - mkdir dist
  - npm run concat

## 使い方
```
new DDTimelines({
  size: [600, 400], // 画面サイズ
  selector: '#timeline', // 表示するDOM
  since: '2015-09-05T00:00:00', // 初回取り込みの開始時刻
  until: '2015-09-08T00:00:00', // 初回取り込みの終了時刻
  utcOffset: '+09:00',
  zoom: [1, 12], // 拡大率[最小, 最大]
  timelines: [
    {
      type: 'combo',
      combination: ['bar', 'line'],
      url: 'http://agora.ex.nii.ac.jp/timeline/v1/amedas-data/points',
      queries: {
        id: '34216',
        var: 'prec,temp'
      },
      labels: ["降水量","気温"]
    },
    {
      type: 'duration',
      url: 'http://agora.ex.nii.ac.jp/timeline/v1/jmaxml-alert/durations',
      queries: {
        id: '040000',
        var: 'wind,rain'
      },
      labels: ["強風","大雨"]
    }
  ]
});
```
