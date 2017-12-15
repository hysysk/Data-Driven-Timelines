# Data Driven Timelines
複数ストリームのタイムライン表示ツール

## 使い方
- ddtimelines.jsを読み込み、下記のようにDDTimelinesのインスタンスを作る。
```
new DDTimelines({
  size: [800, 500], //画面サイズ[幅, 高さ]
  selector: '#timeline', //表示するDOM
  since: '2015-09-05T00:00:00', //初回取り込みの開始時刻
  until: '2015-09-08T00:00:00', //初回取り込みの終了時刻
  utcOffset: '+09:00',
  loadDataFromFile: 'true', //ファイル読み込みで、新たなデータをサーバから取得しない場合
  zoom: [1, 8], //拡大率[最小, 最大],
  splitRatio: [7, 3], //チャートの分割率[時系列, 期間] 10分率で記述
  timelines: [
    {
      type: 'combo', //チャートの種類 line, bar, combo
      combination: ['bar','line'], //comboチャートの場合、lineとbarをどう組み合わせるか指定
      url: 'http://localhost:5000/example/points.json', //時系列データエンドポイント
      labels: ['降水量','気温'] //時系列データのラベル
    },
    {
      type: 'duration',
      url: 'http://localhost:5000/example/durations.json', //期間データエンドポイント
      labels: ['強風','大雨'] //期間データのラベル
    }
  ]
});
```
- スタイルはCSSを使用する。exampleフォルダ以下のCSSを参考にしてください。

## DDTimelinesライブラリの開発手順
Data Driven TimelinesはD3.jsから一部の機能を利用して作成しています。

- NPMモジュールをインストール
  - npm install
- D3.jsをビルド
  - gulp build:d3
- D3.jsとsrcフォルダ以下のファイルを結合し、最小化する。この作業は「gulp watch」で自動化できます。
  - gulp build:ddt
- distフォルダ以下にddtimelines.jsとddtimelines.min.jsが出力される

D3.jsの機能を追加する場合は、index.jsに追加するモジュールを記述し、ビルドしてください。
