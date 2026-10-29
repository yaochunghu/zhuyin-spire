# 注音之塔 v0.4.7

## 給一起玩的大人（繁體中文摘要）

v0.4.7 接著 v0.4.6。答錯之後的「繼續」，在高度 640 以下的畫面（包含 1024×600）和題目、答案一起留在畫面裡。1280×720 和 1024×768 仍用原本較大的卡片。

戰鬥、事件戰鬥、注音神龕和練習室，在一般、提示答案、語音暫時無法播放、再試一次、以及答錯卡片這幾種狀態，都在八種螢幕尺寸上確認：確認鈕、每一個答案鍵、家長協助都在畫面裡，點得到。640×360 提示注音答案時，答案仍留在魔力列上，不會蓋住注音鍵和送出。

存檔仍是第 4 版，v0.4.6 存下來的進度可以繼續讀。答錯仍會失敗，生命歸零仍會結束這一次爬塔。遊戲規則沒有改。

## For families

v0.4.7 follows the v0.4.6 playtest. After a wrong answer, 繼續 stays on screen with the question and the answer when the window is 640px tall or shorter, including 1024×600. A run saved in v0.4.6 still loads. Saves stay on version 4.

A wrong answer still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### 繼續 stays with the answer

The docked correction card uses the compact layout up to 640px height. At 1024×600, 繼續 used to sit past the fold. It now stays on screen with the question and the answer. 1280×720 and 1024×768 keep the larger card.

### What we checked

Combat, an event fight, the shrine, and practice are checked in the default, hinted, speech-fallback, retry, and correction-card states at eight sizes: 1280×720, 1024×768, 1024×600, 360×740, 640×360, 844×390, 390×844, and 568×320. The confirm button (✓, or 繼續 on the correction card), every answer key, and every hint control stay fully on screen and receive the tap.

At 640×360, a hinted 注音 answer stays on the mana line. It does not cover the keys or 送出. That check fails if the header stops holding the answer in place.

Game rules are unchanged.
