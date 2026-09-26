# dsh-skill-pack — Skill Sources & Evolution Candidates

## 已加入资源

- **cameronfreer/lean4-skills** — GitHub, **MIT** (Copyright (c) 2025 Lean 4 Theorem Proving
  Skill Contributors), v4.11.1。Lean 4 證明工作流包，host-agnostic：12 個工作流
  （draft / formalize / autoformalize / prove / autoprove / disprove / checkpoint / review /
  refactor / golf / learn / diagnose）、agents（axiom-eliminator / proof-golfer / proof-repair /
  sorry-filler-deep）、工具（含 lean4-skills-check-axioms-inline）、30+ references。
  核心 skill：`plugins/lean4/skills/lean4/SKILL.md`。
  **用途**：`lean4-formal-verification` skill 的機械證明迴圈基底（該 skill 只負責
  「該不該形式化／陳述忠實度／公理稽核框架／論文回報」，證明本身委派給此包）。
  **整合方式**：引用，不內嵌——skill 內載明 skill-only 安裝指令（`cp -r
  plugins/lean4/skills/lean4 <skills-dir>/lean4`）與 MIT 標註要求。
  本地 clone：`C:\Users\snow\qi\lean4-skills`（depth 1）。
- **awesome-design-md** (voltagent) — 约 90 个 DESIGN.md 设计语言模板。
  **整合方式：引用，不内嵌**（2026-09-26 起）——与 lean4 的处理保持一致。

  **为什么移出**（当时的记录说它"让 design-md skill 能引用真实设计系统"，实测不成立）：
  - `skills/design-md/SKILL.md` **从未引用**该目录（`resources` / `awesome-design` 均不出现），
    其它 31 个 SKILL.md 也零引用；
  - 它占 **2.79 MB / 182 个文件**，而其余 31 个技能合计仅 **0.29 MB**——
    即它一个吞掉了 skills/ 的 90% 体积；
  - `package.json` 的 `files` 含 `skills`，所以这 3 MB 会**发进包**；
  - 它是**内嵌的完整 clone（含 `.git`，0.67 MB 历史）**，而本仓库对第三方资源一向是"引用"。

  **需要时如何取回**（精确到当时那一版，浅克隆即可复现）：
  ```
  git clone --depth 1 https://github.com/voltagent/awesome-design-md
  git -C awesome-design-md fetch --depth 1 origin 8147538b4226ae41e2487a9179e3bcc1f68e8554
  git -C awesome-design-md checkout 8147538b4226ae41e2487a9179e3bcc1f68e8554
  ```
  原位置：`skills/design-md/resources/awesome-design-md/`（父仓库曾以 gitlink 记录该 SHA，
  即父仓库**不保存**其内容——所以只能靠上面的 remote + SHA 复原，而非 `git checkout`）。

## GitHub 高质量 skill 候选（搜索于本会话，stars>500）
| 仓库 | ★ | 价值 | 与我们的关系 |
|---|---|---|---|
| Graphify-Labs/graphify | 114k | 代码库→知识图谱，本地 AST，无向量库 | 与 acp_graph 理念一致，可借鉴实体抽取 |
| JuliusBrussee/caveman | 102k | 省 65% token 的极简沟通 skill | 省 token 思路，可作 skill |
| thedotmack/claude-mem | 93k | 跨会话上下文持久化 | 与 ACP 高度相关，可借鉴压缩注入 |
| Egonex-AI/Understand-Anything | ~ | 代码交互知识图谱 | 图谱可视化方向 |
| affaan-m/ECC | 246k | agent 性能优化系统（skills/instincts/memory） | 综合方法论参考 |

## 演进候选（skillwiki 流程）
- caveman → skillwiki_propose 加入（省 token 沟通）
- graphify 实体抽取 → 反馈给 acp_graph 的 extractEntities 增强
- claude-mem 压缩注入 → 反馈给 acp_compress 的注入策略

## 注意
- 引用外部 skill 需遵守各自 LICENSE（caveman 等）。
- skillwiki_gate 用验证分决定接受/回滚。
