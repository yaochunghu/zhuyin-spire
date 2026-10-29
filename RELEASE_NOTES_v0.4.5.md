# 注音之塔 v0.4.5

## 給一起玩的大人（繁體中文摘要）

v0.4.5 修正 v0.4.4 試玩時，注音和數學的施法區被裁切、數學題仍寫成注音的問題。提示答案時，送出、🗑️ 和家長協助都留在施法區裡。小螢幕上的教學橫幅不再蓋住拼音格。注音神龕的家長協助每次事件只能看一次，再按會顯示「家長協助已用完」；練習室仍可以再看。暫停時，數學題寫「算題暫停／先算完」，注音題寫「注音暫停／先念完注音」。

題目也更準。輕聲符號寫在前面：們是 ˙ㄇㄣ，呢是 ˙ㄋㄜ。仔讀 ㄗㄞˇ，子仍是 ㄗˇ。一年級不會出現公分。為什麼和種子改成和圖一致的寫法，餘、於、閒改成臺灣標準字形。存檔仍是第 4 版，v0.4.4 存下來的進度可以繼續讀。答錯仍會失敗，生命歸零仍會結束這一次爬塔。這台裝置上的試玩紀錄會記下每一次答題的對錯和時間區間，不記下題目和答案。存檔測試，以及除錯用的模擬小朋友，不會出現在孩子玩的正式遊戲裡。

## For families

v0.4.5 follows the v0.4.4 playtest. The cast docks fit on a small screen, the words and the grade-1 questions match the Taiwan forms we checked, and a run saved in v0.4.4 still loads. Saves stay on version 4.

A wrong answer still fizzles, and nothing skips the cast. HP at 0 still ends the run.

### The docks stay on screen

When a 注音 answer is hinted, 送出, 🗑️, and 家長協助 stay inside the dock. Practice and 注音神龕 use that same dock. The math question, the three answers, 家長協助, and the 「語音暫時無法播放…」 note stay inside the math dock. On a short landscape phone, focusing 繼續 after a wrong math answer no longer scrolls the question away.

During the first tutorial fight on a short landscape phone, the lesson banner stays beside the fight, so the slots and the hinted answer stay visible. In listen mode on a narrow phone, four slots stay on one line. Practice and the shrine, including the speech note, stay on screen in portrait.

The pause menu and the potion belt follow the question. A math cast says 算題暫停 and 先算完. A 注音 cast says 注音暫停 and 先念完注音.

### The shrine hint is once

At 注音神龕, 家長協助 shows the spelling once for that event. A second tap says 家長協助已用完. Practice can still show the answer again. A run saved before this flag still loads. An unused hint is not written into the save. A hint that was used is saved, so leaving and coming back does not grant a second look.

### Words and numbers

輕聲 is written and accepted with the dot first, the same order as 《重編國語辭典修訂本》: 們 is ˙ㄇㄣ and 呢 is ˙ㄋㄜ.

仔 (the small child) is ㄗㄞˇ. 子 stays ㄗˇ.

Grade 1 never asks 公分, or another length unit. 長尺掃 still asks which side has more. 公分 stays on the grade-2 question.

A few cues now match the picture: 為什麼 (ㄨㄟˋ), 種子, a clock face for the hour being asked, 三角飯糰 for the triangle, and 魔術方塊的一面 for the square. The old 采 row is gone; 彩, 彩虹, and 踩 still cover that spelling. Make-10 at the second step shows the split and the join.

餘, 於, and 閒 replace 余, 于, and 閑. The 注音 for those three rows is unchanged: ㄩˊ, ㄩˊ, and ㄒㄧㄢˊ.

### The log on this device

Options → Privacy still downloads a file that never leaves the device. Each finished cast, for 注音 and for math, adds one line: which gate, whether it was right, whether 再算一次 or 家長協助 was used, and a time bucket such as `5-15s`. The question and the answer are not stored. Events already on the device still export. The file's schema name is now `zhuyin-spire-playtest-v2`.

### What the child does not see

The new save fixtures and the seeded replay are tests. The child-error model runs only with debug tools, and a normal production build does not contain it. Game rules, relics, and the save version are unchanged.
