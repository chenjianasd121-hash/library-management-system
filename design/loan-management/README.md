# 借阅管理页面设计稿

2026-10-08 · 内置 Image Gen 生成。管理员端 /staff/loans 页面，沿用用户已选定的图书管理页视觉体系。

已选定：用户选择本批第三张。正式定稿：[final.png](final.png)，内容与 loan-review-workspace.png 完全一致。

本次三张图片按对话中实际展示的顺序编号，与上一批图书管理图片编号分开。

| 本批展示顺序 | 图片 | 生成提示词 |
| --- | --- | --- |
| 第 1 张 | [clear-loan-list.png](clear-loan-list.png) | [clear-loan-list.prompt.txt](clear-loan-list.prompt.txt) |
| 第 2 张 | [cover-loan-records.png](cover-loan-records.png) | [cover-loan-records.prompt.txt](cover-loan-records.prompt.txt) |
| 第 3 张 | [loan-review-workspace.png](loan-review-workspace.png) | [loan-review-workspace.prompt.txt](loan-review-workspace.prompt.txt) |

## 设计依据

- 用户已选定的 [图书管理定稿](../book-management/final.png)。
- StaffLoansView.vue 现有读者关键词、条码、在借／已还／逾期筛选和归还入口。
- 项目保存的借阅页面视觉验收截图，非本次实时页面截图。
- 演示数据的今天为 2026-10-08（Asia/Shanghai）：2026-10-02 到期记录逾期 6 天，2026-10-04 到期记录逾期 4 天。

## 当前状态

三张候选图均已生成、逐张查看并保存。图像主要文字、日期、借阅状态与操作入口可见；内容为演示数据。用户已选定第三张并保存正式定稿。其余候选图保留。尚未生成页面代码。

全套页面范围与进度见 [PAGE_PLAN.md](../PAGE_PLAN.md)，设计顺序约束见 [WORKFLOW.md](../WORKFLOW.md)。
