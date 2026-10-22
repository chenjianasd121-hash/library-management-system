# 编辑书目页面设计稿

设计始于 2026-10-08，2026-10-09 用户已选定第二张「封面领衔编辑」 · 管理员端 `/staff/books/:id/edit` · 使用内置 Image Gen。定稿为 [final.png](final.png)。

## 候选方案与展示顺序

已从「设计图书管理系统功能页面」聊天恢复第一、第二张候选图及提示词，并补齐第三张。本聊天先展示前两张编辑页，再展示第三张，编号按这三个编辑候选图的实际展示顺序对应；此前查看的新增页、旧编辑页及目录定稿是参考图，不计入候选编号。

| 本轮展示顺序 | 图片 | 提示词 | 状态 |
| --- | --- | --- | --- |
| 第 1 张 | [split-book-editor.png](split-book-editor.png) | [split-book-editor.prompt.txt](split-book-editor.prompt.txt) | 已保存 |
| 第 2 张 | [cover-led-editor.png](cover-led-editor.png) | [cover-led-editor.prompt.txt](cover-led-editor.prompt.txt) | 已恢复并保存 |
| 第 3 张 | [full-width-grouped-editor.png](full-width-grouped-editor.png) | [full-width-grouped-editor.prompt.txt](full-width-grouped-editor.prompt.txt) | 已生成并保存 |

三个文件均为 PNG，实际画幅 1487 × 1058，保留生成原图；目标桌面画幅为 1440 × 1024。图片中书目内容为演示数据，不表示当前数据库结果。

## 共同内容与检查

- 延续深蓝侧栏、白色顶栏、浅蓝灰画布与蓝色动作；图书管理／书目列表高亮。
- 已有书名、作者、ISBN-13、分类、出版社、出版日期、关键词与简介已回填；仅书名、作者、分类标为必填。
- 上架开启，封面尚未上传；上传提示支持 JPEG、PNG、WebP，最大 2 MiB。
- 主动作是「保存修改」，保存后进入实体副本管理；本页不录入副本册数、条码和位置。
- 已逐图查看文字、回填状态、必填标记、封面与上架区、底部动作可见性，并验证 PNG 文件可读取。

详细字段与统一演示状态见 [brief.md](brief.md)。参考图为新增书目定稿、旧有编辑页测试截图、图书管理定稿；第三张由内置 Image Gen 生成时附上这三张本地图像。

## 当前检查点

三个候选图片、提示词与说明已保存。已按用户本轮选择，将第二张 `cover-led-editor.png` 复制为 `final.png`，并核对文件完全一致。当前进入实体副本管理页面的三个方案。全部设计图片完成并经用户挑选确认前，不生成或修改页面实现代码。
