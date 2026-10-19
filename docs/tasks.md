# 任务看板（A–F）

状态标记：`已完成` = 有可运行产物且经过验证；`进行中` = 已实现但验证不完整；`未开始` = 没有产物。
「验证」列写的是**实际执行过的命令/操作**，没有跑的就不写。

## A. 环境与参考（已完成）

| # | 任务 | 状态 | 产物 / 验证 |
| --- | --- | --- | --- |
| A1 | 能力自检（网络、文件、命令、浏览器预览、图片生成） | 已完成 | 逐个探测：npm registry 可达、Google Fonts 可达、`WebFetch` 可取文档、Node 22 内置 `node:sqlite` 可用、本机 Chrome 可驱动、ffmpeg 可用、图像生成工具可用；**原始 GitHub 直连 cURL 不通**，改用 `WebFetch` |
| A2 | 技术路线定稿与版本锁定 | 已完成 | `package.json` + `package-lock.json`；理由见 `docs/architecture.md` 第 1 节 |
| A3 | 参考源查阅与取舍记录 | 已完成 | `docs/references.md`（含「没读到什么」） |
| A4 | 站点结构与页面清单 | 已完成 | 7 个主页面 + FAQ/隐私/条款 + 9 个后台页 + 13 个 API 路由 |
| A5 | 素材缺口清单 | 已完成 | `docs/asset-gaps.md` |
| A6 | 首屏分镜 | 已完成 | `docs/motion-storyboard.md` |

## B. 设计系统与首屏（已完成）

| # | 任务 | 状态 | 验证 |
| --- | --- | --- | --- |
| B1 | 设计令牌与排版系统 | 已完成 | `app/globals.css` 的 `@theme` + CSS 变量；单一半径 2px、单色系 5 级灰阶 |
| B2 | 首屏三状态 + 入场 + 指针 + 滚动 | 已完成 | 三状态截图（滚动 0 / 1.0 / 1.9 屏）；`scrub` 反向与快速滚动手测 |
| B3 | 标题局部渐变、磁性按钮、焦点可见 | 已完成 | 手测 hover/键盘 Tab；`:focus-visible` 描边 2px |
| B4 | 品牌格 hover → 标识变色 + 询价入口 | 已完成 | 品牌页截图（`../shots/brands-02.png`）；4 个品牌用 `logo_key` 渲染单色标识，hover 变品牌色，其余 11 个为文字字标 |
| B5 | 降低动效路径 | 已完成 | `scripts/check-a11y.mjs` 模拟 `prefers-reduced-motion: reduce`：首屏高度 900 = 视口（无 pin 占位）、标题 `opacity=1`、无横向溢出，3 项全通过 |
| B6 | 三语 + 三断点可读性 | 已完成 | 1440/768/390 × zh/en/ru 共 24 张截图，28 项布局断言（横向溢出 = 0，控制台错误 = 0） |

## C. 前台页面（已完成）

| # | 任务 | 状态 | 说明 |
| --- | --- | --- | --- |
| C1 | 首页六段结构 | 已完成 | hero → 品牌 → 公司团队 → 仓储品质 → 服务与询价流程 → FAQ + 询价 CTA |
| C2 | 品牌目录页（搜索 / 图例 / 带入询价） | 已完成 | 15 个品牌；4 个有标识，11 个文字字标（如实标注来源） |
| C3 | 服务能力 / 仓储品质 / 关于 / 联系 | 已完成 | 联系页对空字段显示 `待补`，不渲染假链接 |
| C4 | 询价页与表单 | 已完成 | 动态行 ≤ 20、附件 ≤ 3 × 8MB、错误汇总 `role="alert"`、成功回执可复制 |
| C5 | FAQ / 隐私 / 条款 / 404 | 已完成 | FAQ 页带 `FAQPage` JSON-LD；隐私与条款为真实条款结构，法域待业主确认 |
| C6 | 导航 + 语言切换 + 移动抽屉 | 已完成 | 程序化断言：打开后 `aria-expanded=true` / 锁滚动 / 可见，Esc 关闭并解除滚动锁、**焦点归还顶部菜单按钮**（修复前落到 body） |
| C7 | SEO 基建 | 已完成 | `sitemap.ts`、`robots.ts`、canonical、hreflang（zh-CN/en/ru/x-default）、OG、JSON-LD |

## D. 业务闭环（已完成）

| # | 任务 | 状态 | 验证（真实执行） |
| --- | --- | --- | --- |
| D1 | 数据模型与迁移 | 已完成 | `PRAGMA user_version = 4`；15 张表；`npm run seed` 打印真实计数 |
| D2 | 真实询价（服务端校验 → 落库 → 附件 → 回执码） | 已完成 | `POST /api/inquiries` 返回 `{"ok":true,"code":"RFQ-261019-594D"}`；重复提交返回**同一** code 且删除重复上传 |
| D3 | 私有附件与权限 | 已完成 | 未登录下载 → 401；登录后 200 `text/csv`；审计日志有记录 |
| D4 | 后台登录与权限 | 已完成 | 未登录 `/admin` → 307 跳登录；scrypt + 签名 cookie（含篡改/过期负例测试） |
| D5 | 询价后台（列表 / 详情 / 状态 / 内部备注 / 导出） | 已完成 | 状态流转 new→in_progress→replied→closed；CSV 带 BOM 与公式注入防护 |
| D6 | 内容后台（公司资料、品牌、类目、服务、FAQ、团队、仓储、SEO） | 已完成 | `CollectionEditor` 通用集合编辑 + `ConfigForm`；缺译在「SEO 与翻译覆盖」显示 |
| D7 | Excel/CSV 导入（模板 → 映射 → 校验 → 预演 → 执行 → 错误行） | 已完成 | 模板 7.8KB；预演 `create` → 执行 → 再预演变 `skip`；行内重复 `skip` + `duplicateRow`；`0012345` 前导零保留 |
| D8 | 通知适配器 | 已完成 | 未配置时返回 `not_configured`，页面不声称已发送 |
| D9 | 限流 | 已完成 | 询价 6 次 / 10 分钟；后台登录同源限流 |

## E. 质量验证（基本完成，性能数字待补）

| # | 任务 | 状态 | 结果 |
| --- | --- | --- | --- |
| E1 | `tsc --noEmit` | 已完成 | 0 错误 |
| E2 | `npm run build` | 已完成 | 成功；`/[locale]/*` 三语全部预渲染，admin/API 动态 |
| E3 | 单元/集成测试 | 已完成 | `node --test` **29/29** 通过；含新增回归「生产环境缺 `ADMIN_SESSION_SECRET` 时询价仍可写入而鉴权仍拒绝」 |
| E4 | 浏览器断点与溢出检查 | 已完成 | 生产构建上 24 截图 / 28 条测量记录 / 横向溢出 0 / console error 0，详见 `docs/verification.md` 第 4 节 |
| E5 | 键盘与焦点 | 已完成 | 12/12 断言通过：首个 Tab 为 skip-link、主按钮 `outline: 2px solid`、抽屉 Esc 后焦点归还 |
| E6 | 俄语字形与长词换行 | 已完成 | 390px 下标题与按钮无截断（截图核对） |
| E7 | 性能实测（LCP / CLS / INP） | 部分完成 | 生产构建实测：LCP 最慢 680 ms（目标 ≤2.5 s ✓）、CLS 全为 0（目标 <0.1 ✓）；单次交互耗时 24–128 ms；**INP 无真实用户分布，未测**。见 `docs/verification.md` 第 6 节 |
| E8 | 附件权限越权用例 | 已完成 | 未登录 401、非管理员会话 401、正常 200 三态均有记录 |

## F. 交付准备（进行中）

| # | 任务 | 状态 | 产物 |
| --- | --- | --- | --- |
| F1 | 源码 + 锁文件 | 已完成 | 仓库内 `package-lock.json` |
| F2 | 环境变量样例 | 已完成 | `.env.example` |
| F3 | 迁移与种子 | 已完成 | `lib/db.js` 启动自动迁移；`npm run seed` |
| F4 | 运行/部署文档 | 已完成 | `README.md` |
| F5 | 素材来源与许可 | 已完成 | `docs/references.md` + `docs/asset-gaps.md`（Simple Icons = CC0；图片为生成图无第三方版权） |
| F6 | 后台操作手册 | 已完成 | `docs/admin-manual.md`（含导入四步、去重规则、备份、常见问题） |
| F7 | 验证记录汇总 | 已完成 | `docs/verification.md` |
| F8 | 已知问题与待补清单 | 已完成 | `docs/asset-gaps.md` 第 4 节 + `docs/motion-storyboard.md` 第 7 节 |
| F9 | 备份与恢复方案 | 部分完成 | 备份命令（`VACUUM INTO`）已验证可执行；**恢复演练仍未做** |

## 下一步（按优先级）

1. 真实摄影替换首屏三帧与仓储图，重调 `scale` 区间（当前数值是按生成图的留白定的）。
2. 补齐 11 个品牌的官方 SVG，后台逐个填 `logo_key`。
3. 业务确认 FAQ 答案、服务 SLA 数字、法域与联系渠道。
4. 部署到预发布环境，用 `scripts/perf.mjs` 在真实网络复测 LCP，并接入 RUM 采 INP。
5. 执行一次备份 → 恢复演练并记录（F9）；补 Safari / Firefox 与屏幕阅读器走查。
