# 办理借出页面设计稿

2026-10-08 · 内置 Image Gen 生成 · 管理员端 /staff/checkout。

已选定：用户选择本批第三张。正式定稿：[final.png](final.png)，内容与 checkout-confirmation.png 完全一致。

本批展示顺序仅对应本次办理借出页面，与此前图书管理、借阅管理的编号分别记录。

| 本批展示顺序 | 图片 | 生成提示词 |
| --- | --- | --- |
| 第 1 张 | [three-step-checkout.png](three-step-checkout.png) | [three-step-checkout.prompt.txt](three-step-checkout.prompt.txt) |
| 第 2 张 | [integrated-checkout-desk.png](integrated-checkout-desk.png) | [integrated-checkout-desk.prompt.txt](integrated-checkout-desk.prompt.txt) |
| 第 3 张 | [checkout-confirmation.png](checkout-confirmation.png) | [checkout-confirmation.prompt.txt](checkout-confirmation.prompt.txt) |

## 设计依据

用户已选定的图书管理与借阅管理图片，以及现有 CheckoutView.vue 页面与其保存的视觉验收截图。详细设计简报见 [brief.md](brief.md)。

所有方案采用同一演示状态：张三（zhangsan）账号正常，当前在借 2 / 5 册，逾期 0；副本 BK0001《Java编程思想》可借、无待取预约，位置为 A 区 2 排。查找与核对已完成，尚未提交借出。

现有借期为 30 天。设计日期为 2026-10-08（Asia/Shanghai），预计应还日期为 2026-11-07 当日结束前。实际数据与规则由现有接口提供。

## 当前状态

三个候选方案已生成、逐张查看并保存，图片中的主要信息与操作可见。用户已选定第三张并保存正式定稿，其余候选保留供参考。下一页设计办理归还；全部页面图片定稿前不生成页面代码。

全套进度：[PAGE_PLAN.md](../PAGE_PLAN.md)。流程要求：[WORKFLOW.md](../WORKFLOW.md)。
