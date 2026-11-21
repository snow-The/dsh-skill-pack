# SKILL-PROVENANCE — dsh-skill-pack 的 32 個內嵌 skill 逐個來源追述

**本檔回答什麼**：`skills/` 下 32 個 `SKILL.md`，每一個是我們自己寫的、還是從哪個 GitHub repo 拷來的？以及：哪些第三方內容目前**沒有授權記錄**。

- 被查對象：`C:\Users\snow\.dsh-starter\plugins\dsh-skill-pack`（repo `snow-The/dsh-skill-pack`，公開、MIT、0★）
- 查證日期：2026-11-07
- 結論一覽：**OURS 4 / github: 28 / UNKNOWN 0**

## 方法（可複現）

1. **本機 git**：`git -C <plugin> log --oneline --name-status -- skills/`。全部 32 個檔案裡，29 個的歷史只有一筆 `4c319ed` "Initial import"（2026-08-21 08:34 +0800），所以 git 本身**無法**區分「自己寫」與「當時一起拷進來」——必須靠內容比對。
2. **內容比對**：對每個 SKILL.md 做 4-gram 詞 shingle 的 containment / Jaccard（去標點、去大小寫、去空白差異），比對三個語料庫：`mattpocock/skills`（111 個 md）、`addyosmani/agent-skills`（127 個 md）、`google-labs-code/design.md`。containment 100% = 去格式差異後逐字相同。
3. **版本對齊**：把上游 clone 到 `%TEMP%`，用 worktree checkout 到**本地引入日之前**的 commit（mattpocock `5b15a47` = 2026-08-21；addy `1d32b88` = 2026-08-19），再逐 commit 掃 `git show <rev>:<path>` 找「本地文字等於哪一版」。
4. **機器可讀的出處帳本**：本機 `~/.agents/.skill-lock.json`（v3）記錄每個安裝過的 skill 的 `source` / `skillPath` / `installedAt` / `updatedAt`——這是最硬的一份證據，因為它是安裝器自己寫的。
5. `gh api` 驗證每個 repo 與檔案路徑真的存在（`gh search repos` / `gh search code` 輔助定位）。

**縮寫**（表格用）：
- `M-lock` = `~/.agents/.skill-lock.json` 內該 name 的 `source` 為 `mattpocock/skills`，`skillPath` 指向同一路徑。
- `M-vend` = 去掉 frontmatter 後，與 `~/.agents/skills-archive/2026-11-07-vendored/<name>/SKILL.md` **逐字相同**（這是實際被拷的那份本機檔案）。
- `A-id` = **整個檔案**（含 frontmatter）與 `addyosmani/agent-skills` 在 commit `1d32b88` 的對應檔逐字相同（100.0% containment、100.0% Jaccard、零行差異）。

## 逐個判定表

| skill | 狀態 | 上游 repo（★ / license / 最後 push） | 證據 |
|---|---|---|---|
| ask-matt | github:mattpocock/skills | mattpocock/skills（317,284★ / MIT / 2026-11-05） | `M-lock`（`skillPath: skills/engineering/ask-matt/SKILL.md`）。上游同路徑 @`7d694b7`(2026-07-13) 4-gram containment 95.8%，差異正好 6 行＝把 `/grill-with-docs`、`/grill-me` 改寫成 host primitive `/grilling`（本地 commit `b136e74`「reroute ask-matt grill refs to host /grilling」）。行 3 自述 "A router over the skills in this repo"、行 77 要求先跑 `/setup-matt-pocock-skills`（該 skill 只存在於此上游） |
| handoff | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/productivity/handoff/SKILL.md` @`386d4ff`(2026-07-02) **body 逐字相同**（只少了 `disable-model-invocation` / `argument-hint` 兩個 frontmatter 鍵） |
| implement | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/engineering/implement/SKILL.md` @`386d4ff` **body 逐字相同** |
| improve-codebase-architecture | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 @`45afd80`(2026-07-13) 99.2%，唯一實質差異 1 行："design tree"→"decision tree"（本地 commit `b136e74` 同批改寫） |
| loop-me | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock`（`skills/in-progress/loop-me/SKILL.md`）＋ `M-vend`；上游 @`e95b181`(2026-06-24) **body 逐字相同** |
| setup-ts-deep-modules | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock`；上游 @`3687fb4`(2026-07-10) 99.1%，唯一實質差異 1 行（`CLAUDE.md`→`AGENTS.md` 的 context pointer 句），本地 commit `0bd46c7` 改過。附帶 `dependency-cruiser.config.cjs` 與上游同名 |
| teach | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/productivity/teach/SKILL.md` @`aa024cb`(2026-06-17) **body 逐字相同**；同目錄 4 個 `*-FORMAT.md` 與上游同名（`GLOSSARY-FORMAT` / `LEARNING-RECORD-FORMAT` / `MISSION-FORMAT` / `RESOURCES-FORMAT`） |
| to-questionnaire | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 @`0f2bdbd`(2026-07-28) **body 逐字相同** |
| to-spec | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/engineering/to-spec/SKILL.md` @`386d4ff`(2026-07-02) **body 逐字相同**（上游在 08-21 前的某一版改過，本地是舊版文字） |
| to-tickets | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 @`ed37663`(2026-07-21) **body 逐字相同** |
| triage | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/engineering/triage/SKILL.md` @`e00eadb`(2026-06-18) **body 逐字相同**；同目錄 `AGENT-BRIEF.md`、`OUT-OF-SCOPE.md` 與上游同名 |
| wayfinder | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 @`2602257`(2026-07-13) **body 逐字相同**（掃了該路徑 61 個 revision，最佳即此） |
| wizard | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock`（`skills/in-progress/wizard/SKILL.md`）＋ `M-vend`；上游 @`b3376f8`(2026-07-28) **body 逐字相同**；`wizard/template.sh` 與上游同名 |
| writing-fragments | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/in-progress/writing-fragments/SKILL.md` @`78636f8`(2026-06-25) **body 逐字相同** |
| writing-shape | github:mattpocock/skills | mattpocock/skills（同上） | `M-lock` ＋ `M-vend`；上游 `skills/in-progress/writing-shape/SKILL.md` @`5c89081`(2026-08-19) 99.7%，**沒有任何上游 revision 完全相等**：差異全部是同義標點（`—` vs `:`）與 frontmatter |
| edit-article | github:mattpocock/skills（已下架） | mattpocock/skills（同上） | `M-lock`（`skillPath: skills/personal/edit-article/SKILL.md`）＋ `M-vend`；上游該檔 @`62f43a1`(2026-04-28) **整個檔案逐字相同**。上游已於 `c66bdee`(2026-08-05)「remove six unused skills and the personal bucket」刪除，故 HEAD 找不到 |
| zoom-out | github:mattpocock/skills（已下架） | mattpocock/skills（同上） | `M-lock`（`skills/engineering/zoom-out/SKILL.md`）＋ `M-vend`；上游 @`7afa86d`(2026-04-28) **body 逐字相同**。上游已於 `e112a6b`(2026-06-17)「Remove zoom-out skill and all references」刪除 |
| api-and-interface-design | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id`：與 `skills/api-and-interface-design/SKILL.md` @`1d32b88`(2026-08-19) **整個檔案逐字相同**。無 `skill-lock` 記錄、本機也無該 repo 的 clone → 是直接從 GitHub 下載後納入（時間吻合：上游 commit 08-19、本地 initial import 08-21） |
| code-review-and-quality | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（`skills/code-review-and-quality/SKILL.md`，逐字相同）。注意此 skill **不是** mattpocock 的 `code-review`：對後者（88 行，@`5b15a47`）4-gram containment **0.0%**，是完全不同的文本 |
| code-simplification | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同）。檔內行 8 的「Inspired by the Claude Code Simplifier plugin」＋連到 `anthropics/claude-plugins-official` 是**上游 addy 檔案自帶**的credit，不是本包加的；該連結已 `gh api` 驗證存在（46,339★ / Apache-2.0 / 檔案 `plugins/code-simplifier/agents/code-simplifier.md` 存在，3,129 bytes） |
| deprecation-and-migration | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同） |
| documentation-and-adrs | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同） |
| doubt-driven-development | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同） |
| incremental-implementation | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同） |
| performance-optimization | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同；311 行）。**注意版本漂移**：上游 HEAD 已把內容拆成 `SKILL.md` + `references/optimization-patterns.md`，本包是 08-19 的單檔版 |
| security-and-hardening | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同；389 行）。同上，HEAD 已拆成 `SKILL.md` + `references/hardening-patterns.md` |
| source-driven-development | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同） |
| test-driven-development | github:addyosmani/agent-skills | addyosmani/agent-skills（113,839★ / MIT / 2026-11-01） | `A-id` @`1d32b88`（逐字相同；296 行）。**不是** mattpocock 的 `tdd`：對後者（39 行，@`5b15a47`）4-gram containment **0.0%**——名字相近但來源不同 |
| coding-discipline | OURS | —（自撰，概念源自六本書） | 本地 commit `75f231c`(2026-08-22)「feat: coding-discipline skill (30 rules from Clean Code/Refactoring/DDIA/SysDesign/game-design/reversing)」，作者 `snow-The`。對兩個上游語料庫 4-gram containment 最高 0.2%；`gh search code "abstract on the third duplicate"` 無上游命中（唯一外部命中 `Mapika/taste` 為無關檔案）。行 8 自述「30 operational rules distilled from…」 |
| ocr-book-extract | OURS | —（自撰） | 三筆本地 commit 皆為作者自述的量測迭代：`4855d08`(0.1.2 首版)、`c141cbe`(0.1.3「all 13 books scanned: 40-111 chars/line」)、`8d52327`(0.1.4「>7000 lines or >256KB… blanks+noise = ~47%」)。對兩個語料庫 containment 0.0%，任何本機 install 都沒有此技能 |
| structured-analytic-reasoning | OURS | —（自撰，概念源自 Pherson & Heuer） | 本地 commit `0189c3b`(2026-09-20)「feat(skills): add structured-analytic-reasoning - it was live but untracked」，作者 `snow-The`；對兩個語料庫 containment 0.0%；`gh search code` 兩句特徵句（"The most defensible hypothesis is the one with the least opposing evidence"、"a hypothesis survives by having fewest"）**只命中本包自己的公開 repo** `snow-The/dsh-skill-pack`。行 8 明示 distilled from *Structured Analytic Techniques for Intelligence Analysis* (Pherson & Heuer 3rd ed) |
| design-md | OURS | —（自撰；格式規格來自 google-labs-code/design.md） | 對兩個上游語料庫 0.0–0.7%；對 `google-labs-code/design.md`（28,770★ / Apache-2.0 / 2026-11-06）的 `README.md` containment 16.3%（Jaccard 2.7%）、`docs/spec.md` 6.5% → **同題材但非抄襲**。行 80 明示「Format specification by Google Labs (github.com/google-labs-code/design.md)」。該 repo 樹內沒有 `design-md` 這個 skill（只有 `.agents/skills/{agent-dx-cli-scale,ink,tdd,typed-service-contracts}`） |

## 分組小結

| 狀態 | 數量 | 是哪些 |
|---|---|---|
| `OURS` | **4** | coding-discipline、design-md、ocr-book-extract、structured-analytic-reasoning |
| `github:mattpocock/skills` | **17** | ask-matt、edit-article、handoff、implement、improve-codebase-architecture、loop-me、setup-ts-deep-modules、teach、to-questionnaire、to-spec、to-tickets、triage、wayfinder、wizard、writing-fragments、writing-shape、zoom-out |
| `github:addyosmani/agent-skills` | **11** | api-and-interface-design、code-review-and-quality、code-simplification、deprecation-and-migration、documentation-and-adrs、doubt-driven-development、incremental-implementation、performance-optimization、security-and-hardening、source-driven-development、test-driven-development |
| `UNKNOWN` | **0** | — |

合計 32，無遺漏。28 個第三方（87.5%），4 個自撰。

### `ask-matt` 的 "this repo" 就是 `mattpocock/skills`

不是 `ai-hero-dev/skills`、不是 `ai-hero/skills`（兩者 `gh api` 皆 404）、不是 `mattpocock/ai-hero`（會 redirect 到 `ai-hero-dev/ai-hero`，1919★、NOASSERTION、2026-08-06，是課程教材 repo，與 ask-matt 內文提到的 skill 名對不上）。決定性證據三條：

1. `~/.agents/.skill-lock.json` 對 `ask-matt` 記的是 `"source": "mattpocock/skills"`，`skillPath: skills/engineering/ask-matt/SKILL.md`。
2. 該 repo 的 `skills/engineering/ask-matt/SKILL.md` 與本地 95.8% 相同（差異是本地改的 `/grilling` 改寫）。
3. ask-matt 內文點名的 `/setup-matt-pocock-skills`、`/domain-modeling`、`/codebase-design`、`/writing-great-skills`、`/wayfinder`、`/to-spec`、`/to-tickets` 全部存在於該 repo 的目錄樹中；`aihero.dev` 只是作者網站（行 31 的 smart-zone 連結），不是 repo。

### 已 archive 那批的來源（順帶確認）

`~/.agents/.skill-lock.json` 共 63 筆，來源分佈：**mattpocock/skills 48**、browserbase/skills 13、vercel-labs/skills 1（`find-skills`）、microsoft/skills 1（`microsoft-docs`）。任務點名的 5 個全部在 mattpocock 名下：

| name | lock `source` | lock `skillPath` | updatedAt |
|---|---|---|---|
| to-prd | mattpocock/skills | `skills/engineering/to-prd/SKILL.md` | 2026-07-04 |
| to-issues | mattpocock/skills | `skills/engineering/to-issues/SKILL.md` | 2026-07-04 |
| grill-me | mattpocock/skills | `skills/productivity/grill-me/SKILL.md` | 2026-08-01 |
| ubiquitous-language | mattpocock/skills | `skills/deprecated/ubiquitous-language/SKILL.md` | 2026-08-01 |
| caveman | mattpocock/skills | `skills/productivity/caveman/SKILL.md` | 2026-06-06 |

即：`dsh-skill-pack` 的第三方主體＝**同一個本機 Matt Pocock 安裝（`~/.agents`，2026-08-01 更新）**，不是逐一從網路找的。`to-prd`/`to-issues` 是 `to-spec`/`to-tickets` 的舊名前身，`ubiquitous-language` 是 `domain-modeling` 的前身——與本地 commit `b136e74`「dedup skill-pack vs host & aegis skills (-10, 39->29)」刪掉的那 10 個完全對得上。

## 不確定與查詢失敗（下一個人不用重試）

**查詢失敗／無效（已排除的候選）**

1. `gh api repos/ai-hero-dev/skills` → **404**；`repos/ai-hero/skills` → **404**；`repos/aihero/skills` → **404**；`repos/mattpocock/skills-repo` → **404**。（GitHub 對無權限的私有 repo 也回 404，無法區分「不存在」與「沒權限」；但 `gh search repos 'pocock skills'` 已把真正的 repo 找出來，故這些 404 不影響結論。）
2. `repos/mattpocock/ai-hero` → 存在但 redirect 成 `ai-hero-dev/ai-hero`；不是 skill repo，未再深入（屬性：1919★、NOASSERTION、push 2026-08-06）。
3. `gh search code "resolved IP is private forbid redirects"` → **0 命中**。這是查詢語法問題（該行含 `+`、`/` 與程式碼片段），不是「不存在」；`security-and-hardening` 的來源已經由 addy 逐字比對定案。
4. `gh search code` 對四個自撰 skill 的特徵句多數只回本包自己的 repo；但 code search **不保證窮盡**（不索引所有 repo、不做精確片語時會模糊比對），所以「查無」只當輔助證據，主證據是語料庫 containment 與 lock 帳本。
5. 第一次用 `gh api` 抓 `repos/.../contents/...` 時對大型 repo 沒有限制深度；`google-labs-code/design.md` 只抓了 `README.md` 與 `docs/spec.md` 兩檔做比對，**沒有**逐檔全掃（該 repo 無 design-md skill，已用 `git/trees?recursive=1` 確認）。

**方法上的坑**

6. `git log --follow -- <path>` 會把改名前的 revision 也列進來，導致 `git show <rev>:<path>` 噴 "path exists on disk, but not in <rev>"。我改用「逐一 `git show` 失敗就跳過」＋「以 body 逐字比對為準」，不採信單一 commit 的 per-file log。
7. `improve-codebase-architecture`、`setup-ts-deep-modules`、`ask-matt` 同時有「本地編輯」與「上游改版」兩種差異來源，單看相似度會誤判；判讀方式是逐行 diff 後對照本地 commit 訊息（`b136e74`、`0bd46c7`）。

**殘餘不確定（不影響狀態判定，但別當成已證實）**

8. `writing-shape` 找不到任何**完全相等**的上游 revision（最高 99.7%，差異是同義標點）。它與本機 vendored 副本逐字相同，所以「從 mattpocock 安裝拷來」成立，但「對應哪一個上游 commit」未知。
9. addy 那 11 個**沒有** `skill-lock` 記錄、本機也找不到該 repo 的 clone／vendored 副本。所以「從 GitHub 下載」是**由逐字相同＋時間差（上游 08-19、本地 08-21）推得**，不是有檔案軌跡的直接證據。
10. 未查（超出範圍）：addyosmani/agent-skills 上游自身是否又改寫自 Anthropic 或其他來源。若要做授權清理，這條要再往上追一層。

## 授權風險

**現況量測**：32 個 SKILL.md 中，帶 `license:` frontmatter 的有 **0 個**（`Select-String -Path skills\*\SKILL.md -Pattern "^license:"` → 0）。與題目給的「58/60 無 license 欄位」一致。

| 風險 | 內容 | 嚴重度 |
|---|---|---|
| **MIT 授權文字未隨附** | 28 個第三方檔案（17 MIT mattpocock ＋ 11 MIT addy）。MIT 要求「copies or substantial portions」需保留 copyright notice 與許可聲明。本包 `LICENSE` 只有 `Copyright (c) 2026 snow`，repo 內沒有 `THIRD-PARTY` / `NOTICE` / 任何上游 copyright 行；`SKILL-SOURCES.md` 只記了 lean4-skills 與 awesome-design-md，**與這 28 個無關** | 高：義務明確未履行，但授權相容（MIT→MIT），補一行 copyright 清單即可合規 |
| **已經公開發佈** | repo `snow-The/dsh-skill-pack` 為 public（`gh api` : `private=false`, `license=MIT`, 0★），且 `package.json` `files` 含 `skills` → 這 28 份會隨套件散布 | 中：這不是「個人本機使用」情境，不能主張私用 |
| **2 個技能上游已刪除** | `edit-article`（刪於 `c66bdee`, 2026-08-05）、`zoom-out`（刪於 `e112a6b`, 2026-06-17）。刪除前仍為 MIT 涵蓋，但**今天的讀者無法在上游驗證**這兩個檔案的存在與授權 | 中：可追溯性缺口（我方已有 commit hash 可佐證） |
| **credit 是上游帶進來的** | `code-simplification` 行 8 的 anthropics/claude-plugins-official credit 來自 addy 的原文。若 addy 本身改寫自 Anthropic（Apache-2.0）的內容，下游義務會隨之傳遞；本包目前只是原樣搬運，沒有額外標註 | 低–中 |
| **design-md（Apache-2.0 題材）** | 只借用格式規格（16.3% 重疊、Jaccard 2.7%），行 80 有指名出處。Apache-2.0 的 NOTICE 義務若成立需附 NOTICE；目前沒有 | 低 |
| **書籍蒸餾（2 個自撰）** | `coding-discipline`（Clean Code / Refactoring / DDIA / System Design Interview / 遊戲設計三部曲 / 反編譯）、`structured-analytic-reasoning`（Pherson & Heuer）。內容是 30 條自寫的 checklist，非原文摘錄；思想不受著作權保護，書名引用屬合理使用範圍 | 低（但別把「30 rules distilled from」升級成「摘要/節錄」措辭） |
| **無 license 欄位的結構性原因** | DSH 的 skill 格式只認 `name` / `description`；上游 28 個檔案本來就沒有 `license:` 欄位（mattpocock 用 `disable-model-invocation`、`argument-hint` 等 Claude Code 專屬鍵，搬運時被剝掉）。所以「沒有 license 欄位」不等於「沒有授權」，但**也不等於可以省略 attribution** | — |

**建議的最小補救**（未執行，僅記錄）：在 repo 根加 `THIRD-PARTY-NOTICES.md`，列出 `mattpocock/skills`（MIT，Copyright Matt Pocock）、`addyosmani/agent-skills`（MIT，Copyright Addy Osmani）與 17+11 個 `skillPath`；並在 `SKILL-SOURCES.md` 補這兩個來源。

## Aegis（即將撤下）

`GanyuanRan/Aegis` — **MIT**、**1,422★**、最後 push **2026-11-04**（`gh api repos/GanyuanRan/Aegis`）。以 `github:GanyuanRan/Aegis#v2.14.2` 安裝，lock 解析到 commit `dd1ee50ad7383d4ab2110765056c8aee31f0b352`；`~/.dsh/profiles/web/node_modules/aegis` 實裝 `version: 2.14.2`，帶 **23 個 skill**。

**注意（實測到的半完成狀態）**：`~/.dsh/profiles/web/pnpm-lock.yaml:117` 仍有 `specifier: github:GanyuanRan/Aegis#v2.14.2`，但 `~/.dsh/profiles/web/package.json` 的 `dependencies`（38 筆）與 `devDependencies`（0 筆）**已經沒有 aegis**。也就是 package.json 已移除、lock 與 node_modules 尚未收斂 → 下一次 `pnpm install` 會把它 prune 掉；在那之前這 23 個技能仍掛載中。

| # | skill | 狀態 |
|---|---|---|
| 1 | anti-entropy-governance | 即將撤下 |
| 2 | brainstorming | 即將撤下 |
| 3 | communicating-concisely | 即將撤下 |
| 4 | dispatching-parallel-agents | 即將撤下 |
| 5 | establishing-project-context | 即將撤下 |
| 6 | executing-plans | 即將撤下 |
| 7 | finishing-a-development-branch | 即將撤下 |
| 8 | first-principles-review | 即將撤下 |
| 9 | goal-framing | 即將撤下 |
| 10 | long-task-continuation | 即將撤下 |
| 11 | receiving-code-review | 即將撤下 |
| 12 | recording-architecture-decisions | 即將撤下 |
| 13 | requesting-code-review | 即將撤下 |
| 14 | subagent-driven-development | 即將撤下 |
| 15 | systematic-debugging | 即將撤下 |
| 16 | test-driven-development | 即將撤下 ⚠️ 與本包 `test-driven-development` **同名**；Aegis 撤下後此名由本包獨佔，撤下時要確認不會連本包那份一起消失 |
| 17 | ui-ux-governance | 即將撤下 |
| 18 | update-aegis | 即將撤下 |
| 19 | using-aegis | 即將撤下 |
| 20 | using-git-worktrees | 即將撤下 |
| 21 | verification-before-completion | 即將撤下 |
| 22 | writing-plans | 即將撤下 |
| 23 | writing-skills | 即將撤下 |

（依 `gh api repos/GanyuanRan/Aegis/git/trees/HEAD?recursive=1` 與 `node_modules/aegis/skills/` 兩邊核對，皆為 23 個，名稱一致。）

## 附：一句話結論

32 個技能裡只有 4 個是我們的（coding-discipline、design-md、ocr-book-extract、structured-analytic-reasoning）；17 個逐字來自 `mattpocock/skills`（含 2 個上游已刪除的 edit-article、zoom-out），11 個逐字來自 `addyosmani/agent-skills`——兩者都是 MIT，但本包**沒有保留任何上游 copyright 與授權文字**，而這個 repo 是公開的。
