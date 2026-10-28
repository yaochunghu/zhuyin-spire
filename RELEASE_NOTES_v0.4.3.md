# 注音之塔 v0.4.3

## 給一起玩的大人

v0.4.3 是準備公開的版本，還沒有加上標籤。已經公開的仍是 v0.4.2（提交 `027961c`，#59）。現在可以選兩個角色：共鳴武者答注音，珠算武者從三個大數字裡選一個。家長提示不再蓋住地圖上的房間，營火的三個選擇都看得到，金幣不夠時不能刪牌。存檔仍是第 4 版，舊的進度可以繼續讀。答錯仍會失敗，生命歸零仍會結束這一次爬塔。

## For families

v0.4.3 is the release being published. The published game is still v0.4.2, at commit `027961c` (#59) on 2026-10-27 15:00 UTC. This build is not tagged yet. Two characters are playable. A run saved before this update still loads. Saves stay on version 4.

A wrong answer still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### Two characters

共鳴武者 still casts 注音. 珠算武者 is on the select screen beside that character. On a landscape phone, both sit side by side without scrolling.

珠算武者 answers three large numbers. The question sits on its own strip, and the three answers sit in a row under it. They stay on screen on a phone and on a tablet. The buttons say 算一算 and 顯示答案. If the answer is still needed, the line says 仍需選出答案. A screen reader announces the math card's name.

Grade 1 is the default. 二年級 is a parent opt-in, and it only lifts 倍數連拳 to the hardest tier. When the child struggles, later questions can get easier. They do not get harder on their own. Counting questions stay inside the grade-1 rules: no borrowing, and no choice of 0.

A wrong answer fizzles that card. Each fight allows one 「再算一次」. A hint on one card does not use up the retry for a later card. After that retry is used, the coach says so. 口袋節拍器 and 月光音樂盒 still say 念錯 / 拼對 for 共鳴武者, and they say 算錯 / 算對 for 珠算武者.

The starter deck is 撥珠拳 ×5, 算珠盾 ×4, and 十全掌 ×1. The starter relic is 木珠串. There are 27 cards. The same score gates apply: 0 / 300 / 1,000 / 2,000.

算珠, 湊十, and 十串 last for the fight only. There is no 勁. When 木珠串 deals damage on a 湊十, that hit skips Block and 易傷.

The 注音 tutorial stays on 共鳴武者. Practice is still 注音. 珠算武者 is not offered 注音神龕, and a miss at that shrine cannot cost this character HP.

### Relics for the character you are playing

A chest pays gold and one relic. An elite or a boss still offers a card, and also drops a relic. A random event relic comes from the character you are playing.

共鳴武者 still finds the five relics from v0.4.2, and still starts with 初心音叉. 珠算武者 can find:

- 算珠袋 — 4 beads at the start of a fight.
- 小尺子 — 3 Block when the third cast of the turn succeeds.
- 十響鈴 — 1 Energy on the first 湊十 of the fight.
- 橡皮擦 — 2 beads on the first final fizzle of the fight.

Each of those can be owned once. When that character already has the whole pool, a chest, elite, or boss pays 20 gold instead. Older relics from earlier saves still work. The six bottles are unchanged.

### On the map, at camp, and in the shop

The 家長提示 coach has its own place beside the map, and above the map in portrait. Open or closed, it no longer covers a room, so a tap on a room enters that room. Opening or closing it brings the next rooms back into view.

On a short landscape phone, the map's top bar fits on one line, and the menu and the tower rail have their own strip, so more of the map is visible.

At a campfire, 休息, 刪牌, and 升級 sit side by side in landscape. All three stay on screen.

In the shop, the remove-card button is turned off when you cannot afford it, the same way a card or a bottle you cannot afford is turned off. Its label says there is not enough gold.

### What did not change

The 注音 answer dock is unchanged. Practice is unchanged.

Saves stay on version 4. A checkpoint from v0.4.2 still loads.
