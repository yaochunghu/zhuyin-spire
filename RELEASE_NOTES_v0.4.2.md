# 注音之塔 v0.4.2

## 給一起玩的大人

v0.4.2 已於 2026-10-27 15:00 UTC 公開，對應提交 `027961c`。這一版加上遺物、藥水、每一幕的問號事件，以及各幕自己的怪物。存檔還是第 4 版，先前存下來的進度可以繼續讀。

共鳴武者仍是唯一可選的角色。答錯注音仍會失敗。生命歸零仍會結束這一次爬塔。

## For families

v0.4.2 is the published release, tagged at commit `027961c` on 2026-10-27 15:00 UTC. This build adds relics, potions, events in every act, and fights that belong to that act. A run saved before this update still loads. Saves stay on version 4.

共鳴武者 is still the only character on the select screen. A wrong 注音 still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### Relics

Chests pay gold and one relic. An elite or a boss still offers a card, and also drops a relic. A normal fight does not drop one. The starter is still 初心音叉. Five new relics can be found:

- 尋隙指套 — the first Attack hit each turn against an enemy that already has 易傷 hits a little harder, before the multiplier.
- 練功護腕 — the first 基礎攻擊 hit each turn hits a little harder, before 易傷.
- 換拍木魚 — the first successful 轉拍 each turn gives 2 Block.
- 聽勁護心 — the first time you gain 勁 in a fight, you get 3 Block. A shield from fully blocking an enemy arrives on your next turn. Block from a card arrives with that card.
- 練功起勢 — on turn 1 only, 練功 is one higher. That point is gone when turn 2 starts.

Each of those five can be owned once. When you already have all five, a chest, elite, or boss pays 20 gold instead. Older relics from earlier saves still work. They are not offered on new runs. Tap a relic badge to read its name and effect.

### Potions

The belt has three slots. Six one-use bottles can show up:

- 護盾泡泡 — 8 Block this turn.
- 音波小石 — 6 damage to one enemy. Block absorbs it.
- 蜂蜜暖茶 — heal 5. You can drink it in a fight, on the map, at rest, in a shop, or on the reward screen. Not at full HP.
- 火花汽水 — 2 Energy this turn. Leftover energy is gone at the end of the turn.
- 翻頁果汁 — draw 3. It will not be drunk if that draw would be nothing.
- 合唱爆泡 — 4 damage to each living enemy. Block absorbs each hit.

A combat, elite, or boss reward can include one bottle. Treasure does not. The shop sells two different bottles for 18 gold each. A full belt has to leave or replace a reward bottle before you take the card, and you discard a bottle before you can buy another. Drinking spends no Energy and does not open a 注音 check. No bottle ignores Block, and none stops HP 0 from ending the run.

A save from before the belt loads with three empty slots.

### Events

Every act has ? rooms. Each one resolves once: an event, a normal fight, a shop, or a treasure. There are 30 events, with pools for each act and some shared events. If you leave in the middle of an event, the save keeps your place.

An event that offers a random relic draws from the five relics above and does not replace 初心音叉. An event that names a relic gives that one. An event that offers a bottle fills an empty belt slot. If the belt is full, the choice stays on screen and says the slots are full.

### Fights

Each act has its own listeners, defenders, and enemies that call friends. Act II and Act III elites are no longer Act I fights with a new name. Bosses raise a shield first, then throw one heavier hit. After that hit, a small friend shows up and does not act on the turn it appears. During the shield, the Act III boss's own later attacks gain one point.

A correct 注音 cast softens a listening enemy's later attack. The number on the current intent stays as promised. A fizzle is not punished.

The first fights on a path stay on the easier side, and the next two normal fights do not repeat the same group. A ? room that becomes a fight uses those same pools. The event moth is 鐘粉蛾, with its own picture.

On the board, a brace, extra strength, and a newly called friend have their own marks, including on a phone. The places you tap to hit an enemy are the same size as before.

### The same questions after you reload

Each run keeps the order of later 注音 prompts. Mode rolls, new words in a shuffle bag, and the wrong-answer choices follow that order, so a reloaded checkpoint asks the same later questions. 注音神龕 uses that order too. The question already on screen is not stored, so a reload shows the next prompt. Shuffle bags still belong to the learner, not to one run.

A save from before this field still loads. It receives a new seed, and the counter starts at 0.

### On a phone

In the shop, each offer keeps its card, its price, and the remove-card button on screen. A short landscape no longer hides the price. Event text sits on a plain panel, and the choices sit beside it, so a short phone can show every option. The potion belt reads as one strap, with full and empty slots you can see.

### A small combat fix

The next-turn intent shows a weakened hit only when Weak is still up after this enemy acts. If Weak wears off on this action, the next hit is previewed at full damage.

### What did not change

珠算武者 is not on the character select screen. The game still casts 注音 only. Practice is unchanged.

Saves stay on version 4. A checkpoint from before events, or from before the cast seed, still loads.
