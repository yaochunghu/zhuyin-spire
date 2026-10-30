# 注音之塔 v0.4.12

## 給一起玩的大人（繁體中文摘要）

v0.4.12 接著 v0.4.11。第一到第三幕的房間背景、兩張換幕畫面、三張地圖標記和四個角落小道具，換成通過檢查的手繪圖。房間背景是 1920×1080，換幕畫面是 1536×1152。有 15 個遺物換成手繪圖示；小盾符、零錢袋、晨光火花和幸運抽仍是表情符號。

另有 48 張背景和第四幕的標記（token-heart）已放進程式庫並登記，但遊戲裡還看不到。沒用到的星星小道具已移除。

無障礙修正有兩項。角落的燈籠小道具，替代文字從「紙燈籠玩具擺件」改為「點燈人的銅提燈」。休息房的牌標題（補血、升級、刪牌）原本用淺銅色，在紙色底上對比只有 1.00:1，現在改用深色字，對比是 10.85:1。

存檔仍是第 4 版，v0.4.11 存下來的進度可以繼續讀。題目、難度和規則都沒有改。答錯仍會失敗，生命歸零仍會結束這一次爬塔。

## For families

v0.4.12 follows v0.4.11. It swaps in painted art and makes two accessibility fixes. Saves stay on version 4, and a run saved in v0.4.11 still loads.

Questions, difficulty, and rules are unchanged. A wrong answer still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### Painted art (#89)

- The Act I–III room plates (1920×1080), the two act transitions (1536×1152), the act map tokens for Acts I–III, and the four corner props are the QA-passed paintings. On a phone the corner prop still draws at 72 px.
- Fifteen relic icons are painted. 小盾符, 零錢袋, 晨光火花, and 幸運抽 stay emoji.
- 48 backdrops and the Act IV token-heart are in the repo and registered, but the game does not show them yet.
- The unused star corner prop was removed.

### Accessibility

- The lantern corner prop's alt text is 點燈人的銅提燈 (was 紙燈籠玩具擺件).
- Rest-room card titles (+N heal, 升級, 刪牌) use the dark ink `#3b2644` with no text-shadow, where they used the light brass `#ffe494`. Contrast on the paper color `#f6e4c0` goes from 1.00:1 to 10.85:1, and 12.09:1 on the lightest point of the gradient `#faf1de`.
