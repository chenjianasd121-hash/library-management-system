# 馆员办理归还 · 三个设计方案

设计始于 2026-10-09，2026-10-19 恢复并完成检查 · `/staff/return` · 内置 Image Gen · 用户已选定第三张「归还确认侧栏」修正版，定稿为 [final.png](final.png)。

## 候选与展示顺序

编号对应本轮馆员归还候选的展示顺序。第一、第二张沿用中断前已展示的图片，第三张以 2026-10-19 最新展示的修正版为准。恢复的第三张原稿包含无依据的其他借阅提示，仅作纠错留档，不参与选择；旧有测试截图和其他页面参考也不计入编号。

| 编号 | 方向 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 并排归还核对 | [parallel-return-check.png](parallel-return-check.png) | [parallel-return-check.prompt.txt](parallel-return-check.prompt.txt) | 已生成、保存与检查 |
| 2 | 连续归还办理台 | [continuous-return-desk.png](continuous-return-desk.png) | [continuous-return-desk.prompt.txt](continuous-return-desk.prompt.txt) | 已生成、保存与检查 |
| 3 | 归还确认侧栏（修正版） | [side-return-confirmation.png](side-return-confirmation.png) | [生成](side-return-confirmation.prompt.txt)、[文字修正](side-return-confirmation-fix.prompt.txt) | 已修正、保存与检查 |

## 统一演示状态与检查

查找已完成，副本有当前在借记录，归还尚未提交。李四借阅人类简史，副本 BK0012，位置 A 区 3 排，副本当前状态借出。借出时间 2026-09-02 10:18，应还日期 2026-10-02 当日结束前；本批固定演示日期为 2026-10-09，对应逾期 7 天。2026-10-19 恢复时保留同一历史演示快照，方便比较，图中不是实时业务日期。

仅借阅管理／办理归还选中，顶部身份为馆员。逾期作为日期提示，确认归还按钮可用。提交前不显示归还成功或副本下一去向；不加入用户账号信息、缴费、批量归还和额外处理流程。

目标桌面画幅 1440 × 1024，三张实际画幅均为 1487 × 1058，保存 PNG 原图并验证可读取，未手动重绘。字段、角色、日期、当前借出状态和确认动作已经查看。第三张提示已修正为「已查到本副本的在借记录。」，不推断读者的其他借阅；原稿 `side-return-confirmation-draft.png` 不参加挑选。

所有人物和记录为演示数据，非当前数据库结果。详细约束见 [brief.md](brief.md)，旧有测试截图见 [reference-existing-return.png](reference-existing-return.png)。

已按用户选择将第三张修正版 `side-return-confirmation.png` 复制为 `final.png`，核对文件完全一致，当前继续馆员借阅记录页面的三个方案。管理员、馆员、读者三个端的全部图片完成并经用户选择后，才进入代码生成阶段。
