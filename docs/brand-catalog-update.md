# 品牌目录更新 · 2026-10-19

首页从 8 个品牌扩充为 24 个，品牌目录从 15 个扩充为 24 个。
新增 Samsung、Micron、Toshiba、ROHM、Broadcom、Qualcomm、Panasonic、Nexperia、NVIDIA。

24 个品牌均使用本地 SVG / PNG 标识，保持原始比例。默认灰阶，悬停或键盘聚焦恢复原色。
桌面 6 列、平板 4 列、手机 2 列；品牌目录的「未列出的品牌」入口改为整行。
首页和目录复用同一组件，点击品牌带入询价表。

素材来源及 SVG 画布边界记录在 `content/brand-assets.json`。标识图形未重新绘制；部分素材仅收紧画布、移除原文件的整幅白色背景。

`npm run brands:sync` 使用本地缓存，`npm run brands:sync -- --refresh` 重新下载。
同步仅新增缺失品牌并更新默认本地 LOGO 路径，保留现有品牌业务字段和后台自定义上传路径。
新增品牌关系为 `sourcing`，不表示现货库存或原厂授权。

验证：TypeScript、生产构建通过；浏览器检查 24 个标识加载正常，390px 手机无横向溢出，品牌搜索及询价预填正常。
