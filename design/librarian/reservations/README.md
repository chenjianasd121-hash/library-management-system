# 馆员预约管理 · 三个设计方案

2026-10-19 · `/staff/reservations` · 内置 Image Gen · 用户已选定第二张「状态导航档案」，定稿为 [final.png](final.png)。

## 候选与展示顺序

编号对应本轮馆员预约管理生成结果的实际展示顺序，旧有测试截图及其他页面参考不计入编号。

| 编号 | 方向 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 清晰预约清单 | [clear-reservation-table.png](clear-reservation-table.png) | [clear-reservation-table.prompt.txt](clear-reservation-table.prompt.txt) | 已生成、保存与检查 |
| 2 | 状态导航档案 | [status-reservation-records.png](status-reservation-records.png) | [status-reservation-records.prompt.txt](status-reservation-records.prompt.txt) | 已生成、保存与检查 |
| 3 | 待取预约核对台 | [pickup-reservation-desk.png](pickup-reservation-desk.png) | [pickup-reservation-desk.prompt.txt](pickup-reservation-desk.prompt.txt) | 已生成、保存与检查 |

## 演示状态与检查

本批日期基准 2026-10-19（Asia/Shanghai），同一组 10 条演示记录按申请时间倒序。状态筛选为全部，关键词和书目编号为空；每页固定 10 条，总数演示为 20，当前第 1 页。

陈晨／人类简史待取截止为今日，状态仍是待取并标注「今日截止」。排队记录只有位次和无待取截止，顾宁与林晓分别第 1、2 位。已履约、已取消、已过期记录没有取消操作；有效预约取消仍需填写业务原因。

仅借阅管理／预约管理选中，顶部身份为馆员。列表不展示副本条码、读者标识或图书封面；不提供新增预约、批量取消、手工分配和提醒发送。

第三个方案选中第 5 条人类简史／陈晨，右侧申请时间 2026-10-16 08:20、待取开始 2026-10-16 09:30、截止 2026-10-19 当日结束前，已分配副本 BK0015、位置 A 区 3 排。选中清单与详情已核对一致；「前往办理借出」只导航到现有借出流程，取消仍要求业务原因。

目标桌面画幅 1440 × 1024，三张实际画幅均为 1487 × 1058，保存 PNG 原图并验证可读取。字段、角色、日期、状态、动作、10 条记录及分页可见性已经逐图检查。详细数据及约束见 [brief.md](brief.md)，旧有测试截图见 [reference-existing-reservations.png](reference-existing-reservations.png)。所有数据仅作设计演示。

已按用户选择将第二张 `status-reservation-records.png` 复制为 `final.png`，核对文件完全一致。馆员借阅业务四页均已定稿，当前进入馆员图书管理页面的三个方案。三端全部图片完成且经用户选择前不生成代码。
