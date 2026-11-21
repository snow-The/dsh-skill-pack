# 這支 skill 為什麼退場，以及每一段搬到哪

退場日期：2026-11-07。
判準來自 `~/.agents/skills/dsh-own/references/decisions.md` D7：**包只能供貨內容，不能提供協議**；
再往前一步是使用者的原話——「這個不應該是 alexlib 的活了麼」。

## 為什麼它不是 skill

它教的四件事裡，有三件是**機械活**：數檔案行數、切分塊、去噪。機械活的住處是程式，不是提示詞。
讓模型照著文字做，等於每次都要它重新實作一次 `alexlib` 已經寫好的東西，而且做不對也沒人知道。

更關鍵的是**它已經有兩個合法的擁有者**：

| 原本的章節 | 現在由誰負責 | 怎麼做 |
|---|---|---|
| §1 識別文件、§2 偵察（大小／行數／章節樹／禁止整檔 read） | **`dsh-alexlib` 的 `alexlib_probe`** | `alexlib_probe({rel})` 回 bytes/lines/blank_ratio/page_number_lines/headings/est_chunks/over_budget，並直接給「該不該整檔讀」的結論；不給 rel 就列出最大的幾份 |
| §3 預處理去噪 | **`dsh-alexlib` 的 `cleanText` + `denoisePages`** | HTML／圖片標籤與 URL 原本就會剝（`<[^>]{0,400}>`）；**新增**：獨立成行的頁碼，且只有候選 ≥5 條時才整批移除（表格裡的孤立數字是資料，不是頁碼），清幾條會被回報 |
| §4 分塊讀取（規避超時） | **`alexlib_doc`** | 按 chunk 分頁讀，`offset/limit`；chunk 常數 `CHUNK_TARGET=1400 / CHUNK_MAX=2200 / CHUNK_MIN=80` 寫在程式裡 |
| §5 結構化提取、§6 統一輸出 schema | **`dsh-lib-analyzer`**（`libscan` / `libtasks` / `libreport`） | 那是「吸收一本書」的流程，已有 `libreport` 的紀律檢查（必要章節、✓◐✗ 對照、file:line 證據） |
| §7 常見 OCR 缺陷清單 | 留在本目錄 | 那是**素材**，不是流程；要看就讀 `SKILL.md` 的這一節 |
| §8 與其他 skill 的銜接 | 刪除 | 它指向的 skill 已全部 vendor 化，留著只會是壞引用 |

## 實測到的效果（不是推論）

`alexlib_probe` 第一次跑就抓到：最大的檔案是 ARMv8 ARM 手冊，
**483,423 行 / 30 MB / 空白 40.6% / 獨立數字行 5,792 條**。那 5,792 條頁碼在舊版是直接進 FTS 的。

## 副作用（要注意）

`cleanText` 改了 → **索引要重建**才會反映新清理；而且重建會改變文字雜湊，也就是去重鍵。
所以這件事要跟 `chunks_fts` 的 `content=''` 修復（省 264 MB）一起做，一次重建兩件事。

回滾：`Move-Item vendor/ours-retired/ocr-book-extract skills/` —— 但不建議，因為它的內容已經在程式裡了。
