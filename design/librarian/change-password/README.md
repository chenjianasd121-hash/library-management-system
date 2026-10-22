# 馆员修改密码设计方案

2026-10-20 · `/change-password` · 用户已选定第三张「分区改密工作台」，定稿为 [final.png](final.png)。候选按实际展示顺序编号。

| 编号 | 方向 | 图片 | 状态 |
| --- | --- | --- | --- |
| 1 | 集中改密表单 | [focused-password-form.png](focused-password-form.png) | 已生成并检查 |
| 2 | 账号与改密双栏 | [account-password-split.png](account-password-split.png) | 已生成并检查 |
| 3 | 分区改密工作台 | [sectioned-password-workspace.png](sectioned-password-workspace.png) | 已生成并检查 |

第一张检查点：普通主动改密状态，staff／馆员账号摘要只读，三项均必填且为空，每项有密码显示／隐藏控件；新密码 8–64 位、两次输入一致，唯一按钮确认修改。正常入口修改成功后返回馆员首页，不提示退出重登。馆员导航上下文正确，无额外密码规则或验证流程。

第二张检查点：左侧静态账号与既有规则说明，右侧三项空白表单；必填、显示／隐藏控件、长度与一致性要求均与第一张相同，只有确认修改动作，无新安全功能或实际密码内容。

第三张检查点：当前密码通栏，新密码与确认并列，三项均为空且必填、眼睛控件完整；规则、账号摘要和正常返回流程与前两张一致，只有确认修改按钮。

完成检查点：三张均为 1487 × 1058，PNG 解码及来源复制哈希验证通过，见 [verification.json](verification.json)。用户已选定第三张，已将 sectioned-password-workspace.png 原样复制为 final.png 并校验一致。馆员 14 个主页面均已选定，定稿文件完整性检查通过，见 [主页面检查](../main-pages-verification.json)。现在进入必要状态设计，复用已有主版，不转去重画其他角色或提前生成代码。

功能依据、统一状态与必要反馈队列见 [brief.md](brief.md)。个人资料第三张已定稿，见 [../profile/final.png](../profile/final.png)。本会话只推进馆员；全部三端及必要状态图片完成并经用户选择前不生成应用代码。
