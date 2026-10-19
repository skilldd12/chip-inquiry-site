export type FieldType = "text" | "textarea" | "select" | "number" | "checkbox";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  hint?: string;
};

export type Collection = {
  table: string;
  title: string;
  description: string;
  labelField: string;
  secondaryFields?: string[];
  fields: Field[];
  compositeKey?: string[];
};

const LOCALES = ["zh", "en", "ru"] as const;
const locFields = (base: string, label: string, type: FieldType = "textarea"): Field[] =>
  LOCALES.map((l) => ({
    key: `${base}_${l}`,
    label: `${label} · ${l.toUpperCase()}`,
    type,
  }));

export const COLLECTIONS: Record<string, Collection> = {
  brands: {
    table: "brands",
    title: "品牌与内部供货关系",
    description:
      "前台只读取 name / logo_key / brand_color / categories 与是否公开。供货关系（supply_relation）、内部备注不进入公开接口。",
    labelField: "name",
    secondaryFields: ["supply_relation", "is_public"],
    fields: [
      { key: "name", label: "品牌名称（前台展示）", type: "text" },
      { key: "legal_name", label: "法定名称", type: "text" },
      { key: "slug", label: "slug", type: "text", hint: "小写英文，用于锚点" },
      { key: "logo_key", label: "Logo 标识（待补官方 SVG）", type: "text" },
      { key: "brand_color", label: "品牌色", type: "text" },
      { key: "website", label: "官网", type: "text" },
      { key: "categories", label: "主要类目（中文逗号分隔）", type: "text" },
      {
        key: "supply_relation",
        label: "供货关系（内部）",
        type: "select",
        options: [
          { value: "confirmed", label: "已确认供货" },
          { value: "sourcing", label: "可寻源" },
          { value: "to_be_confirmed", label: "待确认" },
        ],
      },
      { key: "supply_note", label: "供货说明（内部）", type: "textarea" },
      { key: "internal_note", label: "内部备注", type: "textarea" },
      { key: "is_public", label: "前台公开展示", type: "checkbox", hint: "关闭后从品牌目录隐藏" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  categories: {
    table: "categories",
    title: "器件类目",
    description: "类目表示可承接的寻源范围，不代表库存。",
    labelField: "name_zh",
    fields: [
      { key: "slug", label: "slug", type: "text" },
      ...locFields("name", "名称", "text"),
      ...locFields("blurb", "说明"),
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  services: {
    table: "services",
    title: "服务内容",
    description: "服务描述必须与实际执行一致，不写未确认的能力。",
    labelField: "title_zh",
    fields: [
      { key: "slug", label: "slug", type: "text" },
      ...locFields("title", "标题", "text"),
      ...locFields("body", "描述"),
      ...locFields("note", "说明 / 边界"),
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  faqs: {
    table: "faqs",
    title: "常见问题",
    description: "公开的 FAQ 会同步输出到 FAQPage 结构化数据。",
    labelField: "question_zh",
    fields: [
      ...locFields("question", "问题", "text"),
      ...locFields("answer", "回答"),
      { key: "is_public", label: "公开", type: "checkbox" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  team_roles: {
    table: "team_roles",
    title: "团队岗位",
    description: "headcount 为空时前台显示“待补”，不要填写估算人数。",
    labelField: "title_zh",
    fields: [
      ...locFields("title", "岗位", "text"),
      ...locFields("body", "职责"),
      { key: "headcount", label: "人数（已核实后填写）", type: "text" },
      { key: "is_verified", label: "已核实", type: "checkbox" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  warehouse_items: {
    table: "warehouse_items",
    title: "仓储与品质条目",
    description: "只描述实际执行的动作；面积、温湿度等参数需实测数据。",
    labelField: "title_zh",
    fields: [
      ...locFields("title", "标题", "text"),
      ...locFields("body", "描述"),
      { key: "is_verified", label: "已核实", type: "checkbox" },
      { key: "sort", label: "排序", type: "number" },
    ],
  },
  page_seo: {
    table: "page_seo",
    title: "页面 SEO 覆盖",
    description: "path 使用站内路径（如 /brands），locale 为 zh / en / ru。留空则回退到页面默认文案。",
    labelField: "path",
    secondaryFields: ["locale"],
    compositeKey: ["path", "locale"],
    fields: [
      { key: "path", label: "路径", type: "text" },
      {
        key: "locale",
        label: "语言",
        type: "select",
        options: [
          { value: "zh", label: "zh" },
          { value: "en", label: "en" },
          { value: "ru", label: "ru" },
        ],
      },
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
};

export const FIELD_TYPES = ["text", "textarea", "select", "number", "checkbox"] as const;
