# 馆员首页 · 三个设计方案

2026-10-09 开始 · `/staff/dashboard` · 最新定稿为 2026-10-20 用户在另一批候选中选择的第一张「均衡业务概览」，已同步为 [final.png](final.png)。下表是本会话此前候选，保留历史，不与来源批次混用编号。

## 候选图与展示顺序

编号只对应本轮馆员首页生成图片的实际展示顺序，旧有测试截图不计入方案编号。

| 编号 | 方向 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 值班总览工作台 | [shift-overview.png](shift-overview.png) | [shift-overview.prompt.txt](shift-overview.prompt.txt) | 已生成、保存与检查 |
| 2 | 办理优先工作台 | [operations-first.png](operations-first.png) | [operations-first.prompt.txt](operations-first.prompt.txt) | 已生成、保存与检查 |
| 3 | 馆藏流通概览 | [circulation-overview.png](circulation-overview.png) | [circulation-overview.prompt.txt](circulation-overview.prompt.txt) | 已生成、保存与检查 |

目标桌面画幅 1440 × 1024。三个文件实际画幅均为 1487 × 1058，PNG 原图保存，未缩放或重绘，并已验证可读取。第三张中的星期五与 2026-10-09 对应。

## 核对内容

- 顶部身份为馆员，首页导航选中；其余导航按馆员权限显示。
- 主要入口为办理借出，辅助为办理归还和预约管理，均对应现有页面流程。
- 指标为当前在借 268 册、当前逾期 39 册、待取预约 18 条、可借副本 12,520 册，无无依据的今日办理量或百分比。
- 五条近期记录按借阅时间倒序，应还日期与 30 天借期一致；统计区间 2026-09-10 至 2026-10-09，演示数据更新时间 2026-10-09 09:30。
- 日期、身份、主要动作、表格文字与操作可见性已经逐图检查。第三张热门书目排名使用现有支持的书名与借出次数。数字、记录与公告均为演示内容，不表示当前数据库。

详见 [brief.md](brief.md)。源界面参考为 [reference-existing-dashboard.png](reference-existing-dashboard.png)，为既有测试截图，非本轮启动前端的截图；另附用户最初首页参考和已选图书管理定稿作为生成参考。

历史记录：曾选择本批第三张 circulation-overview.png，原候选仍保留，旧定稿另存 final-before-sync-2026-10-20.png。

最新同步：采用 `C:/Users/en/.codex/worktrees/6241/基于SpringBoot+vue的图书管理系统/design/librarian/home/final.png`，SHA-256 为 34c60699d9b4876a3d58e4640c4fa32cb925663c07df4c93450162ebf01e0e52，复制后校验一致。同步依据见 [任务分工记录](../../TASK_ASSIGNMENTS.md)，不重画、不要求用户重新选择。以上核对内容与指标说明属于此前候选；最新首页的数据、图表与日期说明以来源 README 为准。

当前只推进馆员设计，完整进度见 [PAGE_PLAN.md](../PAGE_PLAN.md)。全套三端图片完成且经用户选择后才开始代码生成。
