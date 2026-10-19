# 连续芯片首屏实现说明

2026-10-19。范围为首页首屏，以及页头在首屏内/外的配色衔接。

## 结构

- `components/hero/hero-stage.tsx`：保留原HeroStage接口，组织标题、行动、GSAP滚动、指针与降级事件。
- `components/hero/chip-canvas.tsx`：客户端异步载入场景，处理减少动态和WebGL不可用。
- `components/hero/chip-scene.ts`：一套Three.js几何、相机路径、环境灯光、物理材质、景深和资源释放。
- `components/hero/hero.css`：仅作用于chip-hero的构图、文字、按钮、手机和减少动态样式。
- `components/site/site-header.tsx`：首屏实际离开后再转为浅色吸顶导航，避免滚动中途切换。
- `app/globals.css`：补充深色段落的语言切换控件对比度。
- `public/images/cinematic-chip-poster.png`、`cinematic-chip-mobile-poster.png`：从本场景截取的桌面/手机降级图。

旧HeroFilm与原视频文件保留，不再由新首屏引用。新首屏不读取旧的bright/dark查询参数。

## 动作

整体器件与晶圆 → 金属引脚近景 → 相机进入器件下方。全程同一场景；正反滚动沿同一路径。亮暗配色对应进入微观空间，文字和导航同步调整。指针小幅改变视角与灯光；标题使用局部字形渐变；主按钮内部有轻微磁吸反馈。

模型为行业视觉表达，不代表公司有晶圆制造能力或某个型号的精确工程结构。没有在界面添加渲染参数、索引面板或内部制作说明。

## 验证

- TypeScript检查通过。
- Next.js生产构建通过。
- 原有29项测试通过。
- Chrome实际浏览器中检查了桌面1440×900、手机模拟390×844。
- 中英俄路由、实际语言切换、标题换行、无横向溢出、询价链接检查通过。
- 检查了鼠标渐变坐标和按钮磁吸样式实际变化。
- 检查了滚动推进、回滚、退出首屏的导航状态。
- 减少动态时无固定滚动段落；WebGL禁用时保留静态图与询价、并取消固定段落。
- 后台登录页返回200。未变更后台数据、账户或询价记录，未提交测试询价。

浏览器验收使用软件WebGL与模拟手机视口；未声称已经完成真实手机GPU性能测量。

## 本地运行

开发：`npm run dev`，默认4310。

构建：`npm run build`。

当前用户预览：`node node_modules/next/dist/bin/next start --port 4311`。更新源码后需要重新构建并重启生产预览。

改动前的hero-stage、页头、全局CSS和依赖文件备份在Codex聊天工作区的`work/hero-original/`。没有Git仓库，因此没有创建提交。
