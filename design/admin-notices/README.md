# 公告管理 · 管理员端设计方案

2026-10-19 · /staff/notices · 用户于2026-10-19选定第二张，去重修正版已完成并定稿。
账号管理第一张已定稿，见 [账号管理定稿](../admin-users/final.png)。

## 按本轮实际展示顺序编号

| 编号 | 设计方向 | 图片 | 原提示词 |
| --- | --- | --- | --- |
| 1 | 清晰公告表格 | [clear-notice-table.png](clear-notice-table.png) | [clear-notice-table.prompt.txt](clear-notice-table.prompt.txt) |
| 2 | 标题优先公告清单 | [title-led-notice-list.png](title-led-notice-list.png) | [title-led-notice-list.prompt.txt](title-led-notice-list.prompt.txt) |
| 3 | 公告预览工作台 | [notice-preview-workspace.png](notice-preview-workspace.png) | [notice-preview-workspace.prompt.txt](notice-preview-workspace.prompt.txt) |

第一张保留四列公告表；第二张使用状态标签页与强调标题的双行列表；第三张把清单与正文预览并排，编辑／发布针对选中的第一条草稿。三张保持既定深蓝侧栏、蓝白内容区及管理员导航。每张已在主聊天展示一次；用户选定第二张「标题优先公告清单」，去掉重复状态／发布时间两列后保存为 [final.png](final.png)，修正版另存 [title-led-notice-list-refined.png](title-led-notice-list-refined.png)，提示词见 [修正提示词](title-led-notice-list-refined.prompt.txt)。

## 功能与共同样本

功能来源与权限见 [brief.md](brief.md)，样本见 [demo-data.json](demo-data.json)。已直接查看 [旧公告页面](reference-existing-notices.png)，并核对 StaffNoticesView.vue、NoticeService.java、AppShell.vue。旧参考是馆员空状态，本轮是管理员有数据状态，不照搬旧角色。

当前批次时间基准2026-10-19（Asia/Shanghai）。六条均为草稿，发布时间为空，用 — 表示；共六条、第一页、固定每页十条，只有一页。六个标题与顺序在三张中一致，没有混入已发布公告或虚构草稿发布时间。先前首页三条已发布公告的历史日期保留在样本文件，供补充状态使用。

主动作新建公告；筛选为草稿／已发布／已撤下，辅助刷新。草稿支持编辑、预览、发布；已发布仅预览／撤下；已撤下支持编辑／预览／发布。发布后对所有访客可见。第三张正文匹配第一条样本，操作对象与高亮条目一致。当前截图没有执行真实保存或发布。

新建／编辑、确认、独立预览以及已发布／已撤下、加载／空结果／失败仍需补充状态设计。未添加删除、置顶、定时、附件、受众、推送、导出或关键词检索等现有页面未提供的能力。

## 检查与定稿注意项

- 三张均通过 PNG 完整性检查，为1487 × 1058、RGB，保留生成输出，未缩放或重绘。
- 已逐张检查管理员角色、系统设置及公告管理高亮、六个标题、草稿状态、空发布时间和单页分页。
- 列表最末一条、分页与第三张预览正文均完整可见。
- 第二张原图的状态／发布时间有重复；用户选定后已去掉独立重复两列，保留标题下元信息与操作组。修正版通过检查，实际1484 × 1060、RGB、PNG；未缩放。原候选和修正提示词均保留，没有扩展功能。修正源文件为 exec-30513d9d-df79-46c6-b18a-007ee4a67a2d.png。
- 原生成文件依次为 exec-2e2306f5-a9a8-4f04-a7a9-bf47b5015fbd.png、exec-5cc51581-e45e-4d02-816e-85523372914c.png、exec-1f79dfcc-febc-4dba-a78e-885e27c25231.png，原件保留在当前任务 generated_images 目录。

## 检查点

续作时检查既有文件和输出，确认上次只完成准备，未重做已经选定的账号管理图片。三个公告候选、提示词、样本与检查记录现已保存。管理员十二个主页面已选定，公告管理第二张修正版已定稿，当前制作数据统计三个方案，之后继续审计日志。

全部管理员、馆员、读者页面图片及补充状态确定前，不生成或修改应用实现代码。
