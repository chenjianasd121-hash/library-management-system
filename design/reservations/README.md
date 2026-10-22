# 预约管理页面设计稿

2026-10-08 · 内置 Image Gen 生成与修正 · 管理员端 /staff/reservations。

已选定：用户选择本批最终候选第一张（修正版）。正式定稿：[final.png](final.png)，内容与 clear-reservation-list.png 完全一致。

本批最终候选为对话中最后三张设计图，按它们的实际展示顺序编号。最早的清单初稿自动出现了额外标识字段，已修正并作废初稿；该初稿不参加挑选，也未作为项目候选保存。

| 最终候选展示顺序 | 图片 | 生成提示词 |
| --- | --- | --- |
| 第 1 张（修正版） | [clear-reservation-list.png](clear-reservation-list.png) | [clear-reservation-list.prompt.txt](clear-reservation-list.prompt.txt) |
| 第 2 张 | [cover-reservation-records.png](cover-reservation-records.png) | [cover-reservation-records.prompt.txt](cover-reservation-records.prompt.txt) |
| 第 3 张 | [pickup-review-workspace.png](pickup-review-workspace.png) | [pickup-review-workspace.prompt.txt](pickup-review-workspace.prompt.txt) |

## 设计依据

用户已选定的图书管理、借阅管理页面，现有 StaffReservationsView.vue、ReservationItem、ReservationService 的状态与动作，以及项目保存的预约页视觉验收截图。

详细约束见 [brief.md](brief.md)。读者栏只显示姓名；排队记录显示队列位置且不显示已分配副本；待取记录显示截止日期。历史记录不提供有效取消操作，管理员取消预约沿用填写业务原因的流程。

## 统一演示数据与检查

以 2026-10-08（Asia/Shanghai）为今天。陈晨《人类简史》待取截止为 2026-10-08 当日结束前，标为「今日截止」且状态仍为待取。详情展示已分配副本 BK0015、位置 A 区 3 排，待取开始为 2026-10-05。顾宁和林晓对《解忧杂货店》的排队位置分别为第 1、2 位，无已分配副本。

最终三个候选已逐张查看并保存。读者、排队、待取截止和操作语义已检查。所有数据为演示内容。第三张的「前往办理借出」仅导航至现有借出流程，不是直接履约操作。

## 当前状态

用户已选定第一张修正版并保存正式定稿，其余最终候选保留供参考。下一页设计新增书目，随后继续编辑书目、副本与分类管理。全部页面图片定稿前不生成页面代码。

全套进度：[PAGE_PLAN.md](../PAGE_PLAN.md)。流程要求：[WORKFLOW.md](../WORKFLOW.md)。
