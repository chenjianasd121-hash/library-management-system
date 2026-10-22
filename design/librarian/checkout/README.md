# 馆员办理借出 · 三个设计方案

2026-10-09 · `/staff/checkout` · 内置 Image Gen · 用户已选定第一张「并排核验办理」修正版，定稿为 [final.png](final.png)。

## 候选与展示顺序

最初的并排布局把馆藏位置末字显示错，已完成定点修正。`parallel-verification-draft.png` 仅作纠错留档，不参加挑选。候选顺序从本轮显示的并排布局修正版开始，随后为另外两个独立方案；原有测试截图和管理员参考也不计入编号。

| 编号 | 方向 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 并排核验办理 | [parallel-verification.png](parallel-verification.png) | [生成](parallel-verification.prompt.txt)、[文字修正](parallel-verification-fix.prompt.txt) | 已修正、保存与检查 |
| 2 | 连续借出办理台 | [continuous-checkout.png](continuous-checkout.png) | [continuous-checkout.prompt.txt](continuous-checkout.prompt.txt) | 已生成、保存与检查 |
| 3 | 侧栏借出确认 | [side-confirmation.png](side-confirmation.png) | [side-confirmation.prompt.txt](side-confirmation.prompt.txt) | 已生成、保存与检查 |

## 统一演示状态与检查

读者和副本已查找、核对，尚未提交借出。张三（用户名 zhangsan）账号正常，当前在借 2 / 5 册，逾期 0 册；Java编程思想副本 BK0001 可借，位置 A 区 2 排，待取预约无。借期 30 天，以 2026-10-09 为办理日期，预计应还为 2026-11-08 当日结束前。应还日期以实际借出结果为准。

仅显示馆员导航，借阅管理和办理借出选中，读者查找保持未选中。图中绿色标记表示查找和资格核验通过，确认借出阶段仍待提交。主要动作「确认借出」，不展示借出完成、借阅编号或额外办理功能。

目标桌面画幅 1440 × 1024，保存 PNG 原图。并排修正版实际画幅 1486 × 1058，另外两个方案均为 1487 × 1058；均已验证可读取，未手动缩放或重绘。已逐图核对馆员身份、导航选中状态、读者及副本字段、馆藏位置文字、预计应还日期、待提交状态和主要按钮可见性。

详细依据与约束见 [brief.md](brief.md)，旧有界面参考见 [reference-existing-checkout.png](reference-existing-checkout.png)。这些都是演示设计，非真实数据库记录。

本轮最后展示的三张图片对应候选 1、2、3（从并排布局修正版开始），原错误草稿排除。已按用户选择将第一张 `parallel-verification.png` 复制为 `final.png`，核对文件完全一致，继续馆员办理归还页面的三个方案。三端全部图片完成且经用户选定前，不生成或修改实现代码。
