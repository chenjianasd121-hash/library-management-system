# 公告预览候选图

使用内置 Image Gen，参考已选公告管理页面。应用代码未修改。

| 显示顺序 | 图片 | 提示词 |
| --- | --- | --- |
| 1 | [紧凑阅读式](compact-reading-preview.png) | [提示词](compact-reading-preview.prompt.txt) |
| 2 | [宽幅阅读式](wide-reading-preview.png) | [提示词](wide-reading-preview.prompt.txt) |
| 3 | [居中标题式](centered-title-preview.png) | [提示词](centered-title-preview.prompt.txt) |

生成与保存状态见 results.json，校验见 qa.json。三张生成后等待用户选择；下一项为操作确认弹窗。

用户选择第2张宽幅阅读式，已原样保存 [final.png](final.png)，SHA256 与候选图一致。下一项操作确认三方案。
