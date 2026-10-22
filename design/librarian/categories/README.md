# 馆员分类管理设计方案

2026-10-20 · `/staff/categories` · 用户已选择第三张「状态分组清单」，定稿为 [final.png](final.png)。候选按实际展示顺序编号。

| 编号 | 方向 | 图片 | 状态 |
| --- | --- | --- | --- |
| 1 | 清晰分类表 | [clear-category-table.png](clear-category-table.png) | 已生成并检查 |
| 2 | 双列分类卡片 | [category-card-grid.png](category-card-grid.png) | 已生成并检查 |
| 3 | 状态分组清单 | [status-grouped-categories.png](status-grouped-categories.png) | 已生成并检查 |

第一张检查点：六条分类、编码 CS／LIT／HIS／ECON／SCI／ART、排序 1–6 正确，前五启用、艺术类停用，每行仅编辑。馆员身份与分类管理导航正确，新增入口完整可见，无分页、本地搜索／筛选或直接启停按钮。页脚准确说明停用影响按分类检索。

第二张检查点：双列三行六张卡片，读序对应排序 1–6，名称、编码、排序与状态完整且与第一张一致；艺术类仍保留编辑入口，无新增数据字段和额外操作。

第三张检查点：启用五条与停用一条分组展示，名称、编码、排序、状态、编辑入口与前两张一致，分组标题不是额外筛选控件。全部六条与新增按钮完整可见。

完成检查点：三张及提示词已保存，PNG 解码、与生成原图的复制哈希验证通过，见 [verification.json](verification.json)。实际尺寸依次为 1484 × 1060、1484 × 1060、1487 × 1058。已按用户选择将第三张 status-grouped-categories.png 原样复制为 final.png 并校验一致，继续馆员公告管理。新增／编辑分类弹窗、停用确认、必要校验反馈仍列为后续补充状态，未宣称整套状态已经齐全。

共同功能和演示数据见 [brief.md](brief.md)，图片和生成提示词同目录留档。副本管理第一张已定稿，见 [../book-copies/final.png](../book-copies/final.png)。本会话只负责馆员端；全套三端及必要状态图片完成并经用户选择前不生成实现代码。

最新配套状态检查点（2026-10-21）：新增分类弹窗已选择第 3 张，见 [states/create/README.md](states/create/README.md)，背景沿用本页第三张定稿。编辑、停用前确认、必填校验三张已保存并检查，见 [states/README.md](states/README.md)；其中必填校验已由用户确认，其余待审阅。保存中、成功／失败反馈、其他字段校验及列表状态已记录于[状态覆盖与复用规则](../STATE_COVERAGE.md)。前文为主版生成时的历史检查点，主版保持原样。
