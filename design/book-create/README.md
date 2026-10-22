# 新增书目 · 管理员端设计方案

2026-10-08 · `/staff/books/new` · 用户已选定第一张「双栏录入工作台」，定稿为 [final.png](final.png)。

## 本轮图片与编号

编号对应本轮三个方案的首次展示顺序。查看第一张时的检查预览不算新增方案。

| 编号 | 设计方向 | 图片 | 提示词 |
| --- | --- | --- | --- |
| 1 | 双栏录入工作台 | [split-book-entry.png](split-book-entry.png) | [split-book-entry.prompt.txt](split-book-entry.prompt.txt) |
| 2 | 连贯录入表单 | [continuous-book-form.png](continuous-book-form.png) | [continuous-book-form.prompt.txt](continuous-book-form.prompt.txt) |
| 3 | 书目创建步骤布局 | [book-create-workflow.png](book-create-workflow.png) | [book-create-workflow.prompt.txt](book-create-workflow.prompt.txt) |

三个文件均为 PNG，实际画幅 1487 × 1058，保留生成原图。目标桌面画幅为 1440 × 1024。

## 共同内容与状态

- 沿用已选定的深蓝侧栏、白色顶栏、浅蓝灰画布与蓝色动作。
- 全部是新增书目的初始空表单：文字字段为空，分类未选择，出版日期未填写，封面未上传，上架默认开启。
- 必填字段为书名、作者、分类；可选字段为 ISBN-13、出版社、出版日期、关键词、内容简介和封面。
- 关键词使用逗号分隔；简介不超过 5000 字；封面支持最大 2 MiB 的 JPEG、PNG、WebP。
- 保存书目信息后进入实体副本管理，主动作标为「保存并添加副本」。册数、条码和馆藏位置在副本页维护。
- 已逐图检查字段、必填标记、空表单状态、上架状态及主要动作可见性。

## 依据与流程

依据现有 `frontend/src` 中的 `BookFormView.vue` 和 `BookInput`、旧有页面截图 `frontend/tests/redesign-qa/librarian-staff-books-new-1366.png`。旧截图用于了解现有表单，并非本轮运行前端的截图。

视觉参考为 [图书管理定稿](../book-management/final.png) 与 [办理借出定稿](../checkout/final.png)。详细约束见 [brief.md](brief.md)。时间基准为 2026-10-08（Asia/Shanghai），本页日期字段保持空白。

已将第一张 `split-book-entry.png` 复制为 `final.png`，开始编辑书目页面的三个方案。三个端的全部页面图片完成且选定之前，不生成或修改页面实现代码。
