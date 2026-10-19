/**
 * 初始化/校验本地数据库：执行迁移，必要时灌入 content/seed.json，然后打印内容计数。
 * 幂等：已有内容时不会重复写入，只做统计。
 *
 * 用法：
 *   npm run seed                 # 迁移 + 空库灌入演示数据 + 打印计数
 *   SEED_FORCE=1 npm run seed    # 迁移后清空内容表再灌入（仅限本地开发，会删除询价单？不会）
 *
 * 注意：本脚本不会删除 inquiry_* 表内容，避免误删真实询价记录。
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATA_DIR = process.env.DATA_DIR || path.join(root, "data");

const dbModule = await import(pathToFileURL(path.join(root, "lib", "db.js")).href);
const db = dbModule.getDb();

const tables = [
  ["categories", "select count(*) as n from categories"],
  ["brands", "select count(*) as n from brands"],
  ["services", "select count(*) as n from services"],
  ["faqs", "select count(*) as n from faqs"],
  ["team_roles", "select count(*) as n from team_roles"],
  ["warehouse_items", "select count(*) as n from warehouse_items"],
  ["parts", "select count(*) as n from parts"],
  ["inquiries", "select count(*) as n from inquiries"],
  ["attachments", "select count(*) as n from attachments"],
  ["admin_users", "select count(*) as n from admin_users"],
];

console.log(`数据库文件：${dbModule.dbPath()}`);
for (const [label, sql] of tables) {
  const row = db.prepare(sql).get();
  console.log(`  ${label.padEnd(16)} ${String(row.n).padStart(5)}`);
}

const pending = db
  .prepare("select count(*) as n from brands where ifnull(logo_key,'') = ''")
  .get();
console.log(`\n缺品牌标识（保留文字字标）：${pending.n} 个 → npm run brands:sync 可补齐可得标识`);

const unpublished = db.prepare("select count(*) as n from brands where is_public = 0").get();
if (Number(unpublished.n) > 0) {
  console.log(`未公开品牌（仅后台可见）：${unpublished.n} 个`);
}
