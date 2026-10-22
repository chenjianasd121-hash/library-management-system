# 办理归还页面设计稿

2026-10-08 · 内置 Image Gen 生成 · 管理员端 /staff/return。

已选定：用户选择本批第一张。正式定稿：[final.png](final.png)，内容与 clear-return-check.png 完全一致。

本批编号只对应本次办理归还页面的实际图片展示顺序，与此前各页面的编号分别记录。

| 本批展示顺序 | 图片 | 生成提示词 |
| --- | --- | --- |
| 第 1 张 | [clear-return-check.png](clear-return-check.png) | [clear-return-check.prompt.txt](clear-return-check.prompt.txt) |
| 第 2 张 | [return-processing-desk.png](return-processing-desk.png) | [return-processing-desk.prompt.txt](return-processing-desk.prompt.txt) |
| 第 3 张 | [step-return-confirmation.png](step-return-confirmation.png) | [step-return-confirmation.prompt.txt](step-return-confirmation.prompt.txt) |

## 设计依据与演示状态

沿用用户已选定的办理借出和借阅管理页视觉风格，结合现有 ReturnView.vue、CopyLookup 与 ReturnResult 的功能，以及项目已有的归还页面视觉验收截图。

三个方案均显示：BK0012《人类简史》当前借出，借阅者李四，位置 A 区 3 排；借出时间 2026-09-02 10:18，应还日期 2026-10-02 当日结束前。以 2026-10-08（Asia/Shanghai）为今天，逾期 6 天。条码查找已完成，归还尚未确认。图片中的数据为演示内容。

设计简报见 [brief.md](brief.md)。确认归还后副本是否恢复可借或分配给预约读者，由现有接口结果确定；提交前图片不预先承诺去向。

## 当前状态

三个候选方案已生成、逐张查看并保存，主要信息和确认操作可见。用户已选定第一张并保存正式定稿，其余候选保留供参考。下一页设计预约管理；全部页面图片定稿前不生成页面代码。

全套进度：[PAGE_PLAN.md](../PAGE_PLAN.md)。流程要求：[WORKFLOW.md](../WORKFLOW.md)。
