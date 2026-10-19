/**
 * Spreadsheet ingestion for the admin import pipeline.
 * Reads xlsx / csv only, never evaluates formulas, and keeps cell text verbatim
 * so leading zeros survive.
 */
import ExcelJS from "exceljs";

export const TEMPLATE_HEADERS = [
  "external_id",
  "mpn",
  "brand",
  "package",
  "category",
  "description",
  "moq",
];

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      /* skip */
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => String(value).trim() !== ""));
}

export async function readTable(buffer, filename) {
  const lower = String(filename || "").toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = buffer.toString("utf8");
    const rows = parseCsv(text);
    if (rows.length === 0) return { headers: [], rows: [], formulas: 0 };
    const headers = rows[0].map((h) => String(h).trim());
    const body = rows.slice(1).map((cells) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = String(cells[index] ?? "");
      });
      return record;
    });
    return { headers, rows: body, formulas: 0 };
  }

  if (lower.endsWith(".xls")) {
    throw Object.assign(new Error("Legacy .xls is not supported"), { code: "legacy_xls" });
  }

  if (!lower.endsWith(".xlsx")) {
    throw Object.assign(new Error("Unsupported file type"), { code: "file_type" });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [], formulas: 0 };

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.text ?? "").trim();
  });

  const rows = [];
  let formulas = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    let hasContent = false;
    let hasFormula = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      if (cell.formula || cell.sharedFormula || cell.type === ExcelJS.ValueType.Formula) {
        hasFormula = true;
      }
      // cell.text renders the cached value as text, preserving "00123" when the
      // cell is formatted as text. Formulas are rejected rather than evaluated.
      const value = cell.type === ExcelJS.ValueType.Formula ? "" : cell.text ?? "";
      record[header] = String(value);
      if (String(value).trim() !== "") hasContent = true;
    });
    if (!hasContent) return;
    if (hasFormula) formulas += 1;
    record.__row = rowNumber;
    record.__formula = hasFormula;
    rows.push(record);
  });

  return { headers: headers.filter(Boolean), rows, formulas };
}

export async function buildTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AXIOM COMPONENTS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("parts");
  sheet.columns = TEMPLATE_HEADERS.map((header) => ({
    header,
    key: header,
    width: header === "description" ? 46 : 20,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    external_id: "EXT-0001",
    mpn: "STM32F103C8T6",
    brand: "STMicroelectronics",
    package: "LQFP-48",
    category: "MCU & Processors",
    description: "ARM Cortex-M3 72MHz 64KB Flash",
    moq: 1,
  });
  sheet.addRow({
    external_id: "",
    mpn: "0012345",
    brand: "Example",
    package: "0603",
    category: "Passives",
    description: "Leading zero example — keep the string as text",
    moq: 100,
  });

  const notes = workbook.addWorksheet("readme");
  notes.columns = [{ width: 100 }];
  notes.addRow(["导入说明 / Import notes"]);
  notes.addRow([""]);
  notes.addRow(["1. 支持 .xlsx 与 .csv；旧版 .xls 请另存为 .xlsx 后再上传。"]);
  notes.addRow(["2. mpn 为必填；external_id 优先用于去重，留空时按 brand + 规范化 mpn 匹配。"]);
  notes.addRow(["3. 型号请设为文本格式，避免 00123 变成 123。"]);
  notes.addRow(["4. 含公式的单元格不会被计算，该行会标记为错误并在预览中列出。"]);
  notes.addRow(["5. 更新模式下只覆盖预览中列出的变更字段，不会静默清空其他内容。"]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildErrorWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("errors");
  sheet.columns = [
    { header: "row", key: "rowNumber", width: 8 },
    { header: "external_id", key: "external_id", width: 18 },
    { header: "mpn", key: "mpn", width: 24 },
    { header: "brand", key: "brand", width: 22 },
    { header: "errors", key: "errors", width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow({
      rowNumber: row.rowNumber,
      external_id: row.values?.external_id || "",
      mpn: row.values?.mpn || "",
      brand: row.values?.brand || "",
      errors: (row.errors || []).join(", "),
    });
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
