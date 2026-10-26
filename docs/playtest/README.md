# 這週的陪玩檢查

Gate 1 is the physical-device checklist. Gate 2 is the adult-and-learner Act I session. Yao's decision: the relic-content pull request merges only after both gates pass. Automated browser tests do not check either box.

Parents follow the Traditional Chinese sheets on a phone. File one [session record](sessions/SESSION_RECORD.md) per device and one per family sitting. Leave personal browser data in place, and keep the child's real name out of the record.

## 兩關

| 關卡 | 誰來做 | 要做什麼 | 表 |
|------|--------|----------|----|
| 第一關 | 大人。孩子不用在場 | iPhone Safari、iPad Safari、Android 手機 Chrome，各走一遍 | [裝置檢查表](DEVICE_CHECKLIST.md) |
| 第二關 | 一位大人＋正在學注音的孩子 | 第一幕整趟爬完，或生命歸零 | [家人陪玩](FAMILY_SESSION.md) |

公開網站：<https://yaochunghu.github.io/zhuyin-spire/>

請用 Safari 或 Chrome 的一般分頁打開。Line 或 Messenger 的內建瀏覽器、無痕視窗、加到主畫面的圖示，這週都不要拿來當正式結果。

## 這週可以這樣排

1. 先在孩子平常會玩的那一台做完[裝置檢查表](DEVICE_CHECKLIST.md)。大約 40 分鐘。
2. 那一台沒有「擋住發布」的問題之後，再約 30–45 分鐘做[家人陪玩](FAMILY_SESSION.md)。孩子累了就停，改天接到第一幕結束或生命歸零。
3. 同一週把另外兩台也做完。三台都要過，遺物內容才可以合併。
4. 每一台、每一次陪玩各留一份紀錄給 Yao。不要把填好的紀錄提交進 git。

## 給負責合併的人

Debug cast skip stays off for both gates. The public site has no debug panel; a local check of this gate uses `npm run build` and `npm run preview`, not `npm run dev`.

Record the build as the date the public site was opened, or as `git rev-parse --short HEAD` plus `git status -sb` when the tester is on a local production preview. Parents write「公開網站」and the date.

After both gates pass, the next feature remains the small relic pool in [NEXT_PHASE.md](../NEXT_PHASE.md). Potions, events, and later expansions stay deferred. A failing device or an unfinished Act I observation blocks that merge until the affected flow is fixed and rerun.
