# 轴点电子 · B2B 元器件询价站（阶段 A–D 可运行版）

电子元器件与芯片寻源、品牌供应、BOM 配单的询价站。**本阶段不含**在线支付、购物车、结算、客户账号、完整库存系统——询价是唯一的转化动作。

公司名、联系方式、仓储地址、资质均为**占位或空缺**，页面上以 `待补 / PENDING` 标记，不用示例数据顶替；品牌标识只使用可合法取得的 4 个，其余保留文字字标。详见 `docs/asset-gaps.md`。

## 1. 运行

```bash
# 需要 Node 22.22+（使用内置 node:sqlite，无需原生编译）
npm install
cp .env.example .env.local      # 首次运行前改掉 ADMIN_PASSWORD / ADMIN_SESSION_SECRET
npm run seed                    # 迁移 + 空库灌入演示内容，并打印计数
npm run dev                     # http://localhost:4310  → 自动跳 /zh
```

后台：`http://localhost:4310/admin`（默认开发账号见 `.env.local`；首次启动按 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 创建）。

生产：

```bash
npm run build && npm start      # 默认 4310 端口
```

## 2. 命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（Turbopack，端口 4310） |
| `npm run build` / `npm start` | 生产构建 / 启动 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `node --test tests/*.test.mjs`（29 项） |
| `npm run seed` | 迁移 + 种子 + 内容计数 |
| `npm run brands:sync` | 从 Simple Icons 生成可得的品牌标识（4 个），其余保留文字字标 |
| `node scripts/shoot.mjs http://localhost:4310 ../shots` | 截图 + 布局断言（需要在跑的服务器） |
| `node scripts/perf.mjs http://localhost:4311 ../shots` | 生产构建上的 LCP/CLS/事件耗时采样 |
| `node scripts/check-a11y.mjs http://localhost:4311 ../shots` | 降低动效、移动抽屉、键盘焦点、标题渐变共 12 条断言 |
| `node scripts/shot-one.mjs <url> <out.png> [w] [h] [wait]` | 单张截图（排查用） |
| `node scripts/measure.mjs <url> [w]` | 打印页头/首屏关键元素的盒子，用于定位溢出与裁切 |

## 3. 目录

```
app/[locale]/…        三语公开页面（SSG）
app/admin/…           后台（动态，需登录）
app/api/…             询价、联系、后台 CRUD、导入、导出、附件下载
components/hero/      首屏三状态与动效
components/site/      导航、页脚、品牌目录、流程线、表单
lib/                  协议(core) / 持久化(db) / 鉴权(auth) / 存储(storage) / 通知(notify) / 导入(import)
content/i18n/*.json   zh / en / ru 字典（俄语为人工撰写，非机翻）
content/seed.json     演示内容（与生产数据隔离：只在空库时写入）
private/uploads/      附件（不在 public 下，必须经后台鉴权下载）
docs/                 参考记录、架构、分镜、素材缺口、任务看板、验证记录、后台手册
```

## 4. 关键约定

- **询价至少要有一行需求或一个附件，且至少一个有效联系方式**；公司、电话、交期可空。前后端用同一份 `lib/core.js` 校验，错误码一致。
- 只有数据库写入成功才返回「需求已接收」+ 单号（如 `RFQ-261019-594D`）；10 分钟内相同内容视为重复提交，返回**同一单号**且删除重复上传的附件。
- 通知未配置时状态为 `not_configured`，**不会**显示「已发送邮件」。
- 附件：≤3 个、单个 ≤8MB、扩展名白名单 + 魔数嗅探，落盘在 `private/uploads/`，下载需登录且有审计。
- 导入：MPN 保留原始字符串与前导零；数量单独校验；拒绝公式单元格与 `.xls`；按 `external_id` 或「品牌 + 归一化 MPN」去重；冲突默认**不覆盖**，需显式选择更新模式。
- 导出 CSV：公式注入前置 `'`，带 UTF-8 BOM（Excel 打开中文不乱码）。

## 5. 环境变量

见 `.env.example`。生产必改：`NEXT_PUBLIC_SITE_URL`、`ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`（≥24 字符）。通知需要 `NOTIFY_WEBHOOK_URL`（可选 `NOTIFY_WEBHOOK_TOKEN`）。

`IP_HASH_SECRET`（可选，≥16 字符）用于询价限流与去重键的 IP 哈希。它与会话密钥解耦：**没配 `ADMIN_SESSION_SECRET` 时公开询价接口仍可写入数据库**（哈希退化为固定盐并打印一次告警），只有后台登录会被拒绝——后台配置缺失不应该打断前台转化。

## 6. 备份与恢复（SQLite）

```bash
# 备份（会正确包含 WAL 中的数据）
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('data/app.db');db.exec(\"VACUUM INTO 'backup/app-' + strftime('%Y%m%d-%H%M','now') + '.db'\");db.close()"

# 恢复：停服务 → 把备份文件覆回 data/app.db → 删除残留的 app.db-wal / app.db-shm → 启动
```

附件与数据库**必须一起备份**：`private/uploads/` 丢了，数据库里的附件记录就成了死链。

> 说明：备份命令已在本地验证可执行；**完整的恢复演练尚未做过**，上线前需补一次并记录（见 `docs/tasks.md` F9）。

## 7. 部署要点

1. Node 22.22+，`DATA_DIR` 指向持久化磁盘（不要放在容器临时层）。
2. 反向代理需要放行 `POST /api/inquiries` 的 multipart（默认 8MB/文件，建议代理层上限 ≥ 30MB 以容纳 3 个附件 + 表单）。
3. `private/` 不要配置成静态目录；`public/` 里只有图片与图标。
4. 单实例部署（限流与 SQLite 均为进程内）；要多实例需先换 Redis 限流与 PostgreSQL。
5. 后台路径固定为 `/admin`，已在 `robots.txt` 与响应头禁止索引。

## 8. 已知限制

- 首屏三帧与仓储图为生成图（占位），上线前替换为真实摄影。
- 11 个品牌无官方标识，暂用文字字标。
- 未做病毒扫描、上传配额、多实例限流。
- `docs/tasks.md` 的 E7/F9 未收尾：INP 需真实用户分布，备份恢复演练未做。
