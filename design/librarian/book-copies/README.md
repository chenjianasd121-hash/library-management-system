# 馆员实体副本管理设计方案

2026-10-20 · `/staff/books/:id/copies` · 用户已选定第一张「上方录入清单」，定稿为 [final.png](final.png)。候选按实际展示顺序编号。

| 编号 | 方向 | 图片 | 状态 |
| --- | --- | --- | --- |
| 1 | 上方录入清单 | [top-entry-copy-list.png](top-entry-copy-list.png) | 已生成并检查 |
| 2 | 侧栏新增工作台 | [side-entry-copy-desk.png](side-entry-copy-desk.png) | 已生成并检查 |
| 3 | 书目录入联合台 | [combined-copy-workspace.png](combined-copy-workspace.png) | 已生成并检查 |

第一张检查点：条码和馆藏位置输入为空、添加入口可见；九条演示副本完整，3 可借、1 待取、2 借出、2 维修、1 退役。书目在册 8、可借 3，清单含退役共 9 条口径明确。可借和维修行具有合法状态动作，待取／借出行只允许位置，退役行位置禁用。全部状态筛选、刷新及单页分页可见。

第二张检查点：左侧录入、右侧清单，九条记录完整，字段、状态动作和库存口径与第一张一致，筛选、刷新及分页可见。未新增关键词搜索或批量状态操作。

第三张检查点：上方书目摘要与录入面板并列，下方通栏九行清单。状态、合法动作、输入空白、页大小和在册／记录总数口径与前两张一致。

完成检查点：三图及提示词已保存，图片解码和来源复制哈希验证通过，见 [verification.json](verification.json)。实际尺寸依次为 1484 × 1060、1484 × 1060、1487 × 1058。用户选择第一张，已将 top-entry-copy-list.png 原样复制为 final.png 并核对字节一致，继续馆员分类管理，不转向管理员或读者。

功能来源、统一数据与三个方向见 [brief.md](brief.md)。编辑书目第一张已经选定，见 [../book-edit/final.png](../book-edit/final.png)。本会话只负责馆员端，分工见 [TASK_ASSIGNMENTS.md](../../TASK_ASSIGNMENTS.md)；全套三端及必要状态图片完成并经选择前不生成实现代码。
