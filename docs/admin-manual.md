# 后台操作手册

后台地址：`/admin`（已禁止搜索引擎索引；未登录访问会 307 跳转到 `/admin/login`）。
账号在首次启动时按环境变量 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 创建；登录态是 HMAC 签名的 HttpOnly cookie，8 小时过期。

> 所有改动都走接口并在 `audit_log` 留痕（谁、什么时候、改了哪条）。
> **生效时机**：后台页面与询价数据立即生效；公开页面是构建期静态生成的（SSG），内容改完需要重新构建 + 部署才会出现在前台。需要「改完马上看到」时可改用 ISR（见 README 第 7 节），当前版本为刻意选择：静态页更快、更抗打。

## 1. 概览（`/admin`）

各状态询价单数量、最近提交、未配置项提示（联系人、通知 webhook 等）。**这里的数字直接来自数据库**，没有演示用的假数据。

## 2. 询价记录（`/admin/inquiries`）

- 列表：状态徽标、通知状态（`已发送 / 失败 / 未配置`）、条数分页；支持按状态筛选与关键词搜索（公司、联系人、单号、MPN）。
- 详情（`/admin/inquiries/{id}`）：
  - 需求行：MPN、品牌、数量、封装、备注（MPN 保留原始写法，含前导零）。
  - 附件：列出文件名、大小；**点击下载会经过服务端权限校验并记审计**，文件不暴露公开 URL。
  - 状态：`new → in_progress → replied → closed`，改完立即生效。
  - 内部备注：只在这里可见，不会出现在任何公开接口。
- 导出：右上「导出 CSV」，带 UTF-8 BOM（Excel 打开中文不乱码）；以 `= + - @` 开头的单元格会被前置 `'` 防止公式注入。

**通知为什么会是「未配置」**：只有设置了 `notification.enabled = true` 且填了 webhook 才会真正发送。发送失败会记 `failed` + 原因，但**询价单本身不会丢**；系统也绝不会在没发出去的情况下显示「已发送」。

## 3. 品牌与供货关系（`/admin/brands`）

每行一个品牌，可改：名称、法定名、标识、品牌色、官网、关联类目、**供货关系**、供货说明、内部备注、是否公开、排序。

- `supply_relation` 三态：`confirmed`（已确认）/ `sourcing`（寻源中）/ `to_be_confirmed`（待确认）。前台品牌页只用这三个词聚合说明，**不逐条披露具体关系**。
- 内部备注 `internal_note` 只在后台显示；公开接口的 SELECT 里根本没有这一列。
- 标识 `logo_key`：填 `/brands/xxx.svg` 使用标识，留空则前台显示品牌文字字标。当前只有 ST / NXP / Intel / AMD 有可用标识（来源 Simple Icons，CC0）；其余品牌请向厂商品牌门户申请官方 SVG 后放进 `public/brands/` 再填路径。
- `is_public = 0` 的品牌不出现在任何公开页面。

## 4. 类目 / 服务 / FAQ / 团队 / 仓储（`/admin/catalog`）

五个集合用同一套表格编辑器：行内编辑，三语字段并列（如 `name_zh / name_en / name_ru`）。

- 缺某一语言的翻译时，前台按 `locale → en → zh → ru` 回退，并在「SEO 与翻译覆盖」里列为缺译，**不会**把中文当成俄语发布。
- 上线开关：服务、FAQ、仓储条目都有 `is_public`。
- 团队卡：`headcount` 为空或 `is_verified = 0` 时不显示人数——避免编造规模。

## 5. 公司资料与通知（`/admin/content`）

公司中英文名、法定名、成立年份、邮箱、电话、WhatsApp、微信、三语地址、工作时间、销售通知 webhook。
页面顶部有「上线前核对」清单，列出仍为空的关键项；**前台对应位置显示 `待补`，不会渲染假链接或假数据**。

填了通知 webhook 后记得把 `notification.enabled` 置为 true，否则仍是 `not_configured`。

## 6. SEO 与翻译覆盖（`/admin/seo`）

按页面列出标题/描述的三语填写情况与缺译数量；表格下方是各集合的翻译覆盖率。这里只做**统计与提示**，不自动机翻。

## 7. Excel / CSV 导入（`/admin/import`）

四步，缺一步都不会写库：

1. **上传**：`.xlsx` / `.csv`；`.xls` 会被拒绝（老二进制格式解析不可靠）。含公式的单元格也会被拒绝——导入只接受静态值，不执行宏或公式。
2. **字段映射**：上传后自动猜测列对应关系（MPN / 品牌 / 封装 / 类目 / 描述 / 数量 / 外部 ID），可手工改。
3. **校验与预演**：逐行给结果，每条标 `create / update / skip / conflict / error`，并列出行内重复。**这一步不写库。**
4. **执行**：先选模式——
   - `create_only`（默认）：只新增，已存在的记为 `conflict`，**不覆盖**；
   - `update`：更新已存在行，列出的变更字段才写。
   然后需要显式勾选确认才能执行。执行后给成功/失败统计，可下载错误行工作簿（带原始行号与错误原因）。

去重规则：有 `external_id` 按它匹配；没有则按「品牌 + 归一化 MPN」匹配。MPN 保留原始字符串与前导零，归一化只用于比对。

## 8. 备份

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/app.db');db.exec(\"VACUUM INTO 'backup/app-' + strftime('%Y%m%d-%H%M','now') + '.db'\");db.close()"
```

同时打包 `private/uploads/`（附件）。只备份数据库不备份附件，后台的下载链接会全部失效。

## 9. 常见问题

| 现象 | 处理 |
| --- | --- |
| 登录后立刻退回登录页 | 检查 `ADMIN_SESSION_SECRET` 是否 ≥24 字符；生产环境未设置会拒绝建会话 |
| 提交询价后通知一直是 `not_configured` | 没配 webhook 或 `enabled` 为 false。这**不是故障**，记录已入库 |
| 导入显示大量 `conflict` | 这些行已存在且选了 `create_only`。确认要覆盖就改用 `update` 模式 |
| 附件下载 410 | 文件在磁盘上被移走或删除了；数据库记录还在。需要时从备份恢复 `private/uploads/` |
| 前台改了内容没变化 | 公开页面是静态渲染，部署后才会重新生成；后台页本身立即生效 |
