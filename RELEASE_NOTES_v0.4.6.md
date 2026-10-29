# 注音之塔 v0.4.6

## 給一起玩的大人（繁體中文摘要）

v0.4.6 接著 v0.4.5 的試玩。第一次教學戰鬥施法時，教學橫幅改到戰鬥資訊的下方，不再被蓋住。640×360 和 844×390 都看得到整條橫幅。拼音格和提示的答案仍留在施法區裡。568×320 的數學題，「語音暫時無法播放…」和題目、三個答案、家長協助一起留在畫面裡。

這台裝置上的試玩紀錄多記幾件事：進王時的生命和金幣、戰鬥結束時失去的生命（王戰補血之前）、過一幕、進商店、營火選擇、用藥、遺物抽完、坐下開始和結束。題目和答案仍不記下。已經在這台裝置上的舊紀錄還是可以匯出。存檔仍是第 4 版，v0.4.5 存下來的進度可以繼續讀。答錯仍會失敗，生命歸零仍會結束這一次爬塔。平衡表是給整理試玩紀錄的人用的，不會出現在孩子玩的畫面裡。

## For families

v0.4.6 follows the v0.4.5 playtest. The tutorial banner stays readable during a cast, the math speech note fits on a very short phone, and a run saved in v0.4.5 still loads. Saves stay on version 4.

A wrong answer still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### The tutorial banner sits under the fight

During the first tutorial fight, the lesson banner stays in the battlefield column while a cast is open, and it now sits under the combat HUD. At 640×360 and 844×390 the whole banner is readable. The cast slots and the hinted answer stay clear.

### The math note fits

At 568×320, the math dock's 「語音暫時無法播放…」 note stays on screen together with the question, the three answers, and 家長協助.

### The log on this device

Options → Privacy still downloads a file that never leaves the device. The file's schema name is now `zhuyin-spire-playtest-v3`. Events already on the device still export. The question and the answer are still not stored.

The log now also records `bossEntry` (HP, gold, and deck size as the boss fight starts), `combatEnd` with `hpLost` taken before the post-boss heal and before that fight's gold is added, `actClear`, `shopEnter`, a campfire `rest` choice, `potionUsed`, `relicPoolExhaust`, and `sittingStart` / `sittingEnd`.

### What the child does not see

`docs/BALANCE.md` maps those events to rows B1–B24. `scripts/balance-report.mjs` prints that table from an export on this computer. Game rules, relics, and the save version are unchanged.
