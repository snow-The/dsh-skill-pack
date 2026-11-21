# Third-party notices — `dsh-skill-pack`

本檔回答一個問題：**`skills/` 裡哪些不是我們寫的、各自從哪來、什麼授權。**

判定與證據見 [`SKILL-PROVENANCE.md`](SKILL-PROVENANCE.md)（每個 skill 一列，附 commit / 行號 / `gh api` 查詢）。
本檔只做授權歸屬聲明。

## 為什麼需要這個檔

- 這個 repo 是 **public**，而 `package.json` 的 `files` 含 `skills` → 這 28 個檔案會被**實際散布**。
- 實測：32 個 `SKILL.md` 中 **0 個**帶 `license:` 欄位；repo 根目錄 `LICENSE` 只有
  `Copyright (c) 2026 snow`，沒有 THIRD-PARTY / NOTICE。
- 兩個上游都是 **MIT**，MIT 要求**保留著作權聲明**。原本的狀態是「散布了別人的 MIT 內容但不留聲明」。

## 上游清單

### 1. `mattpocock/skills` — MIT

- 來源：<https://github.com/mattpocock/skills>
- 取用時的 upstream commit：以 `SKILL-PROVENANCE.md` 各列為準
- 本 repo 內的 17 個：

  `ask-matt`, `edit-article`, `handoff`, `implement`, `improve-codebase-architecture`, `loop-me`,
  `setup-ts-deep-modules`, `teach`, `to-questionnaire`, `to-spec`, `to-tickets`, `triage`,
  `wayfinder`, `wizard`, `writing-fragments`, `writing-shape`, `zoom-out`

- 其中 15 個與上游逐字相同；`ask-matt` 與 `setup-ts-deep-modules` 各差 1–6 行，
  差異對得上本地 commit `b136e74` / `0bd46c7`（本地改寫）。
- 本機安裝軌跡：`~/.agents/.skill-lock.json`（v3）記錄 `"source": "mattpocock/skills"` 與 `skillPath`。

### 2. `addyosmani/agent-skills` — MIT

- 來源：<https://github.com/addyosmani/agent-skills>
- 取用時的 upstream commit：`1d32b88`（2026-08-19）
- 本 repo 內的 11 個，**全部與該 commit 逐字相同**：

  `api-and-interface-design`, `code-review-and-quality`, `code-simplification`,
  `deprecation-and-migration`, `documentation-and-adrs`, `doubt-driven-development`,
  `incremental-implementation`, `performance-optimization`, `security-and-hardening`,
  `source-driven-development`, `test-driven-development`

- 本機沒有安裝軌跡（無 lock 記錄、無 clone）——「從 GitHub 取得」是由逐字相同＋時間差推得，
  不是檔案證據。這一點在 `SKILL-PROVENANCE.md` 的「不確定」節也有寫。

## 我們自己寫的（不受本檔約束）

`coding-discipline`、`ocr-book-extract`、`structured-analytic-reasoning`、`design-md`

（`design-md` 與 Google Labs 的 DESIGN.md 規格重疊 16.3% / Jaccard 2.7%，屬規格相容而非抄襲，
且檔案內已指名出處。）

## 處置

- **已經做**：本檔補上歸屬聲明（2026-11-07）。
- **未做、待決定**：這 28 個檔案是否繼續留在掛載路徑。依組織原則（包供貨內容、不提供協議；
  第三方內容只當素材），它們應該離開 `skills/`（不再被掛載）並移入 `vendor/` 作為素材，
  由我們自己的 skill 取代。此事需要一次重啟才生效（`skill-pack` 的 provider 是 `watch: false`）。
- 若要再散布，請保留本檔與 `SKILL-PROVENANCE.md`。

## 上游授權原文

MIT 要求的兩件事：保留著作權聲明與授權全文。兩個上游的 `LICENSE` 全文可在上列 repo 取得；
本 repo 根目錄的 `LICENSE` 為本專案自身授權，**不取代**上游聲明。
