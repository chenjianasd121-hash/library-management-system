# 实体副本管理 · 管理员端设计方案

2026-10-09 · /staff/books/:id/copies · 用户已选定第一张「纵向录入清单」，定稿为 [final.png](final.png)。使用内置 Image Gen。

## 本轮图片与编号

编号对应本聊天中的实际展示顺序。前两个候选及原提示词从已有设计成果恢复并展示，第三个候选本轮生成；此前的旧截图和编辑页参考图不计入本轮候选编号。

| 编号 | 设计方向 | 图片 | 提示词 |
| --- | --- | --- | --- |
| 1 | 纵向录入清单 | [top-entry-list.png](top-entry-list.png) | [top-entry-list.prompt.txt](top-entry-list.prompt.txt) |
| 2 | 清单与录入侧栏 | [side-entry-list.png](side-entry-list.png) | [side-entry-list.prompt.txt](side-entry-list.prompt.txt) |
| 3 | 副本核对工作台 | [copy-review-workspace.png](copy-review-workspace.png) | [copy-review-workspace.prompt.txt](copy-review-workspace.prompt.txt) |

三个文件均为 1487 × 1058 PNG，保留原图。目标桌面画幅 1440 × 1024。

## 共同功能与状态

- 针对 Java编程思想 一本书目的实体副本。表单为空，条码与馆藏位置为必填；每次录入 1–50 个条码，每行一个，共用同一馆藏位置。
- 八条演示记录，包含可借、待取、借出、维修、退役五种状态。支持全部状态筛选、刷新与分页；本轮共八条，每页十条。
- 可借副本支持修改位置、转维修、退役；维修副本支持修改位置、恢复可用、退役；待取和借出副本只显示位置操作；退役副本无可用操作。
- 第三个方案选中 BK0004，详情中的条码、维修状态及维修区位置与清单一致，维护动作集中在详情区域。
- 不加入扫码、打印、自动条码、导入导出、删除、收费、历史或退役原因等未支持的业务功能。
- 已逐图查看字段、八条记录、状态操作、选中详情和底部可见性，并验证所有 PNG 文件可读取。

## 依据与流程

来源为 frontend/src/views/CopiesView.vue、frontend/src/api/types.ts、frontend/src/utils/format.ts，以及 frontend/tests/redesign-qa/librarian-staff-books-1001-copies-1366.png。旧有测试截图用于了解现有功能，并非本轮前端运行截图。设计数据不表示当前数据库结果。

视觉沿用图书管理与编辑书目的设计体系。前两个原有候选以当时编辑备选图、图书管理定稿和旧副本页为参考；第三个生成时附上本轮已选定的 [编辑书目定稿](../book-edit/final.png)、[图书管理定稿](../book-management/final.png) 及旧副本页截图。详细约束见 [brief.md](brief.md)，时间基准为 2026-10-09（Asia/Shanghai）。

已将第一张 top-entry-list.png 复制为 final.png，并核对文件完全一致。继续分类管理的三个方案。三个端所有页面图片确定前，不生成或修改页面实现代码。
