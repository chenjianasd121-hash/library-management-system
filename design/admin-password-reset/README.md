# 管理员重置密码弹窗

2026-10-21，使用内置 Image Gen。三张独立候选图已生成，按本聊天实际显示顺序编号。

1. 紧凑提示式：[图片](compact-password-reset.png)，[完整提示词](compact-password-reset.prompt.txt)。
2. 横向对齐式：[图片](aligned-password-reset.png)，[完整提示词](aligned-password-reset.prompt.txt)。
3. 宽幅警示式：[图片](wide-password-reset.png)，[完整提示词](wide-password-reset.prompt.txt)。

状态：用户选择第 3 张，已原样保存为 [final.png](final.png)，SHA256 与 wide-password-reset.png 一致。下一项为管理员公告编辑、预览及其他必要状态。

功能依据见 brief.md，样本见 demo-data.json。三张均为 1487 × 1058，保持原尺寸，校验与生成原图的 SHA256 一致，详细来源与视觉检查见 qa.json。未生成应用实现代码。

前一页创建员工账号已选第 3 张，保存于 ../admin-staff-create/final.png；续接来源及全部设计确认前不实现代码的流程见 ../admin-staff-create/continuation.md。
