# 验证记录

本文件只写**实际执行过**的检查与原始结果。测试环境：Windows，Node 22.22.2，Chrome 155.0.8059.80，项目根 `chip-inquiry/`，生产构建（`next build` + `next start --port 4311`）。

## 1. 静态检查与构建

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck`（`tsc --noEmit`） | 0 错误 |
| 生产构建 | `npm run build` | 成功，约 21 s；`/[locale]/*` 三语页面全部预渲染（● SSG），`/[locale]/inquiry` 与后台/API 为动态（ƒ） |
| 测试 | `npm test` | **29 / 29 通过**，约 0.7 s |

## 2. 单元与集成测试覆盖（`tests/*.test.mjs`）

- `core`：MPN 归一化保留前导零（`0012345`）、大小写与零宽字符处理、询价「至少一行或一个附件」规则、联系方式必填规则、邮箱/电话校验、数量含千分位（`1,500`）、CSV 公式注入前置 `'`、`toCsv` 使用 CRLF、导入行 MOQ 单独校验、`planImport` 的 create / skip / conflict / update 四态、文件内重复标记 `duplicateRow`、改名的 EXE 被魔数嗅探拒绝、语言回退链、单号格式。
- `db`：迁移与种子、**公开品牌投影不含 `internal_note` / `supply_note`**、询价落库与行/附件关联、10 分钟重复窗口、状态流转与计数、非法状态被忽略、按 `external_id` 与「品牌+归一化 MPN」双路查重、MPN 前导零保留、列表筛选。
- `auth`：scrypt 哈希、会话往返与篡改拒绝、过期拒绝、IP 哈希稳定且不可逆、首次引导与登录、cookie 选项；**新增回归：生产环境未配 `ADMIN_SESSION_SECRET` 时 IP 哈希仍可用、`readSession` 返回 null 而不是抛错、而 `signSession` 依然抛错**。

## 3. 生产构建上的端到端冒烟（真实 HTTP 调用）

| # | 场景 | 期望 | 实际 |
| --- | --- | --- | --- |
| 1 | 询价缺联系方式 | 400 + `contact_required` | `{"ok":false,"errors":{"contact":"contact_required"}}` |
| 2 | 合法询价（含 `0012345`、`1,500`） | 200 + 单号 | `{"ok":true,"id":3,"code":"RFQ-261019-01BC","notification":"not_configured"}` |
| 3 | 10 分钟内重复提交 | 同一单号 + `duplicate` | `{"ok":true,"code":"RFQ-261019-01BC","duplicate":true}` |
| 4 | 仅附件（无需求行） | 200 + 单号 | `{"ok":true,"id":4,"code":"RFQ-261019-3073"}` |
| 5 | 未登录访问 `/admin` | 307 → `/admin/login` | `307 http://localhost:4311/admin/login` |
| 6 | 未登录下载附件 | 401 | `401` |
| 7 | 未登录访问导入模板 | 401 | `401` |
| 8 | 登录（后台） | 200 + cookie | `{"ok":true,"email":"admin@example.com"}` |
| 9 | 登录后打开询价列表 | 200 | `200` |
| 10 | 登录后下载附件 | 200 + 正确 MIME 与内容 | `200 51B text/csv` |
| 11 | 导出 CSV | 200 | `200 538B` |
| 12 | 导入模板 | 200 xlsx | `200 7881B application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| 13 | 更新询价状态 + 内部备注 | 200 | `{"ok":true}` |
| 14 | 导入预览（含行内重复 + 非法 MOQ） | create 2 / skip 1 / error 1 | `{"create":2,"skip":1,"error":1,"total":4}` |
| 15 | 执行未确认 | 400 `confirmation_required` | `{"ok":false,"message":"confirmation_required"}` |
| 16 | 确认执行 | 200 + 计数 + 错误行链接 | `created:2, skipped:1, failed:1, errors:[{rowNumber:5,errors:["moq_invalid"]}]` |
| 17 | 同一批次重复执行 | 409 `already_applied` | `{"ok":false,"message":"already_applied"}` |
| 18 | 执行后再预览 | 全部 skip，0 create | `{"create":0,"skip":3,"error":1}` |
| 19 | 落库后的 MPN 前导零 | `0012345` 原样保留 | parts 表中 `mpn = '0012345'`，`moq = 2500`（数值） |

## 4. 截图与布局断言（`scripts/shoot.mjs`）

- 产物：`../shots/` 下 **24 张**截图 + `report.json`。
- 覆盖：1440 首屏三状态；EN 全站 10 个页面整页截图；390 / 768 两档 × zh / ru × 首页 / 品牌 / 询价 / 服务能力。
- 结果：**28 条记录，横向溢出 0 条**（所有页面 `scrollWidth === clientWidth`），**控制台错误 0 条**，所有页面 HTTP 200 且 `h1` 文本非空。

## 5. 交互与可访问性断言（`scripts/check-a11y.mjs`）

**12 / 12 通过**（结果在 `../shots/a11y.json`，`../shots/drawer-ru-390.png`）：

| 断言 | 实测 |
| --- | --- |
| reduced-motion 下首屏未被 pin 拉长 | `heroHeight 900 = viewport 900`，`.pin-spacer` 不存在 |
| reduced-motion 下标题首帧可见 | `opacity = 1` |
| reduced-motion 下无横向溢出 | `1440 / 1440` |
| 移动端菜单按钮存在 | 通过 |
| 抽屉打开（data-open / aria-hidden / 可见性） | `open=true, ariaHidden=false, visible=visible` |
| 抽屉打开时 `aria-expanded=true` 且锁滚动 | `expanded=true, bodyLocked=true` |
| Esc 关闭并解除滚动锁 | `open=false, bodyLocked=false` |
| Esc 关闭后焦点回到菜单按钮 | `activeElement.className = "menu-toggle"` |
| 首个 Tab 焦点为跳转主内容链接 | `A.skip-link「跳到主要内容」` |
| 主按钮键盘聚焦有可见描边 | `outline: 2px solid` |
| 指针进入标题后局部渐变位置变化 | `--mx: 130% → 30%` |
| 标题文字仍可选中 | `user-select: auto` |

## 6. 性能实测（`scripts/perf.mjs`，本机生产构建）

| 页面 | TTFB | FCP | LCP | LCP 元素 | CLS |
| --- | --- | --- | --- | --- | --- |
| `/zh` 首页 | 8 ms | 404 ms | 652 ms | `p.lead`（首屏引导文案） | 0 |
| `/zh/brands` | 9 ms | 180 ms | 180 ms | `h1.display` | 0 |
| `/zh/inquiry` | 17 ms | 200 ms | 200 ms | `h1.display` | 0 |
| `/en` 首页 | 7 ms | 192 ms | 192 ms | `p.lead` | 0 |
| `/ru` 首页 | 6 ms | 212 ms | 212 ms | `p.lead` | 0 |
| `/zh/capabilities` | 5 ms | 220 ms | 220 ms | `h1.display` | 0 |

- **LCP ≤ 2.5 s：达成**（最慢 652 ms）；**CLS < 0.1：达成**（全为 0）。首屏大图因为自 `opacity 0` 渐显，按规范不计入 LCP 候选，因此 LCP 元素是文案——这是真实测量结果，不当作"图片很快"的证据。
- **INP：没有真实用户分布，未测。** 用 Event Timing 采样了真实交互的单次耗时：询价页点击/输入 **24 ms**；首页一次 **136 ms** 出现在展开 FAQ 手风琴的那一帧（长文档重排），其余交互未超过 16 ms 阈值。这个数字是"单次最差"，**不能等同于 INP**。
- 环境限制：本机 localhost、无网络延迟、无 CPU 降速；真实环境需在预发布域名上用同一脚本复测。

## 7. 本轮发现并修复的真实缺陷

| 缺陷 | 发现方式 | 根因 | 修复 |
| --- | --- | --- | --- |
| 附件下载 410 `file_missing` | 冒烟测试 | `uploadPath()` 用 `path.basename`，丢掉了 `2026-10/` 月目录 | 改为规范化分隔符 + `path.resolve` 边界校验（越界抛错） |
| **生产环境询价接口 500** | 生产构建冒烟 | `hashIp()` 复用了 `sessionSecret()`；生产未配 `ADMIN_SESSION_SECRET` 时抛错，公网可写的接口被后台配置拖死 | 新增独立 `IP_HASH_SECRET` 与降级路径（固定盐 + 一次性告警），并加回归测试；会话签名仍强制要求密钥 |
| 后台登录在密钥缺失时返回 500 堆栈 | 同上 | 直接抛异常 | 返回 `503 {"message":"server_misconfigured"}` 并记日志；`readSession` 在密钥缺失时按"未登录"处理，后台页面不再 500 |
| 移动抽屉 Esc 关闭后焦点落回 body | `check-a11y` 断言 | 关闭时未归还焦点 | Esc 与关闭按钮都 `focus()` 回顶部菜单按钮，并加断言 |
| 品牌页标题与内容之间约 113 px 空洞 | 截图目视 | `PageHead` 的 padding-bottom 与 `.section--tight` 的 padding-top 叠加 | `.page-head + .section` 收紧上边距 |
| **390px 下菜单按钮被裁到视口外**（right = 405 > 390） | `scripts/measure.mjs` 量盒子 | 页头 flex 子项总宽 > 可用宽度，字标未 nowrap、未让位 | 窄屏页头单独布局：字标 `nowrap + ellipsis`、副标隐藏、语言开关与按钮定宽不收缩；复测 `right = 370` |
| 390px 下首屏文案压在器件上不可读 | 截图目视 | 首屏遮罩是左下径向渐变，窄屏只覆盖左侧 | 窄屏改为自下而上的整宽渐变（0.97 → 0 分五档）；标题、引导文案、按钮区全部落在高不透明区 |
| 12 个品牌没有标识，格子里只有文字 | 截图目视 | 无可用矢量资产 | 建立 `logo_key` 渲染（CSS mask 单色可染色）+ `npm run brands:sync` 生成 4 个可得标识；其余 11 个保留文字字标并列入 `docs/asset-gaps.md` |

## 8. 没有验证的部分（明确列出）

1. **Safari / Firefox / 真机**：全部断言在 Chrome 155 内完成，未跨浏览器实测；`backdrop-filter`、`mask-image` 在 Firefox 上的表现未验证。
2. **真实网络与真实设备性能**：见第 6 节限制。
3. **INP 的真实分布**：需要真实用户采样（或 RUM），当前没有。
4. **屏幕阅读器实测**：只做了 ARIA 属性与焦点顺序的程序化断言，没有用 NVDA / VoiceOver 走查。
5. **WebGL 不可用场景**：本项目**没有使用 WebGL**，因此不存在该降级路径；首屏是图片 + CSS 变换。
6. **备份恢复演练**：备份命令已验证可执行，恢复流程**尚未实操**（见 `docs/tasks.md` F9）。
7. **多实例部署**：限流为进程内实现，未在负载均衡后验证。
