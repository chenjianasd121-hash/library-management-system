# 馆员借阅记录 · 三个设计方案

2026-10-19 · `/staff/loans` · 内置 Image Gen · 用户已选定第一张「清晰借阅清单」，定稿为 [final.png](final.png)。

## 候选与展示顺序

编号对应本轮馆员借阅记录生成结果的实际展示顺序，旧有测试截图和其他页面参考不计入编号。

| 编号 | 方向 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 清晰借阅清单 | [clear-loan-table.png](clear-loan-table.png) | [clear-loan-table.prompt.txt](clear-loan-table.prompt.txt) | 已生成、保存与检查 |
| 2 | 状态导航清单 | [status-led-records.png](status-led-records.png) | [status-led-records.prompt.txt](status-led-records.prompt.txt) | 已生成、保存与检查 |
| 3 | 借阅记录核对台 | [loan-review-desk.png](loan-review-desk.png) | [loan-review-desk.prompt.txt](loan-review-desk.prompt.txt) | 已生成、保存与检查 |

## 演示状态与检查

本批以 2026-10-19（Asia/Shanghai）为日期基准，使用同一组 10 条演示记录；两个逾期条目分别逾期 15 天、17 天。初始关键词、条码为空，状态模式为全部。页大小固定 10，演示总数 20，当前第 1 页，分页为 1、2。

仅借阅管理／借阅记录选中，顶部身份为馆员。在借条目可「去归还」，已归还条目无此操作；导航进入现有归还流程，不在列表提交归还。没有额外统计卡片、批量操作、导出、续借或消息催还。

第三个方案选中最后一条人类简史／李四／BK0012，右侧显示已有记录的只读摘要和「去归还」导航；没有新增业务接口或即时归还动作。左侧日期简写，右侧完整借出时间为 2026-09-02 10:18，应还为 2026-10-02 当日结束前，逾期 17 天，选中记录与摘要已核对一致。

目标桌面画幅 1440 × 1024，三张实际画幅均为 1487 × 1058，保存 PNG 原图并验证可读取。字段、角色、日期、状态、操作和 10 条记录及分页可见性已经逐图检查；所有记录均为演示数据，非实时数据库结果。详细数据及约束见 [brief.md](brief.md)，旧有测试截图见 [reference-existing-loans.png](reference-existing-loans.png)。

已按用户选择将第一张 `clear-loan-table.png` 复制为 `final.png`，核对文件完全一致，继续馆员预约管理页面。管理员、馆员、读者三个端全部图片完成且经用户选择前不生成代码。
