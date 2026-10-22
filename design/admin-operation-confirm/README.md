# 管理员操作确认候选图

使用内置 Image Gen，三次独立生成；参考公告管理定稿，以撤下已发布公告为例。应用代码未修改。

| 实际显示顺序 | 图片 | 提示词 |
| --- | --- | --- |
| 1 | [图标并列式](icon-inline-confirmation.png) | [提示词](icon-inline-confirmation.prompt.txt) |
| 2 | [居中提示式](centered-confirmation.png) | [提示词](centered-confirmation.prompt.txt) |
| 3 | [分区说明式](structured-confirmation.png) | [提示词](structured-confirmation.prompt.txt) |

每张图片已逐一保存并核对文字、操作含义、尺寸与 SHA256。原始来源与实际显示顺序见 [results.json](results.json)，视觉核对见 [qa.json](qa.json)。等待用户选择第1、2或3张后原样定稿，下一阶段是加载、空结果、请求失败各一张统一样式。

## 2026-10-21 选定

用户回复“2”，已原样保存[居中提示式定稿](final.png)，SHA256与第2张一致。下一步为三种通用状态及首页指标文字修正。
