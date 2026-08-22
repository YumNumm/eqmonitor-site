---
question: 緊急地震速報が発表されている時の、P・S波到達予想円はどのように計算されますか
order: 1
---

[JMA2001走時表](https://www.data.jma.go.jp/eqev/data/bulletin/catalog/appendix/trtime/trt_j.html)に対して線形補間を行い、緊急地震速報に含まれる予想された震源要素(震源の深さ・震源の位置)に基づいて到達予想円を算出しています。

走時表の仕様により、以下の場合到達予想円が表示されない場合があります。

- P, S波の到達範囲が半径2,001km以上
- 震源の深さが701km以上
