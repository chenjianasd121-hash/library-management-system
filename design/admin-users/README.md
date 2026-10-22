# 账号管理 · 管理员端设计方案

2026-10-09 · /admin/users · 三个独立图片已完成，用户于2026-10-09选定第一张。
上一页首页概览第一张已定稿，见 [首页定稿](../admin-dashboard/final.png)。

## 按本轮实际展示顺序编号

| 编号 | 设计方向 | 图片 | 原提示词 |
| --- | --- | --- | --- |
| 1 | 清晰账号表格 | [clear-account-table.png](clear-account-table.png) | [clear-account-table.prompt.txt](clear-account-table.prompt.txt) |
| 2 | 身份清单与侧边筛选 | [identity-account-list.png](identity-account-list.png) | [identity-account-list.prompt.txt](identity-account-list.prompt.txt) |
| 3 | 选中账号维护台 | [selected-account-workspace.png](selected-account-workspace.png) | [selected-account-workspace.prompt.txt](selected-account-workspace.prompt.txt) |

三个方案均沿用已定稿的深蓝侧栏和蓝白视觉。第一张为五列账号表；第二张左侧筛选、右侧两行身份清单；第三张将同样的账号维护操作放到选中账号区域。每张都是一个完整独立界面，已展示一次。用户选定第一张「清晰账号表格」，已保存为 [final.png](final.png)，与 clear-account-table.png 内容相同。

## 功能与演示数据

功能和权限见 [brief.md](brief.md)，同一批样本见 [demo-data.json](demo-data.json)。依据 UsersView.vue、AdminUser、AppShell.vue 与 [旧账号页面截图](reference-existing-users.png)。出图同时附原用户首页参考、图书管理定稿、首页定稿与旧账号截图。

筛选条件为用户名或显示名、角色、状态；主动作创建员工；维护操作仅账号启停和重置密码。账号列表共23条，第一页十条，固定每页十条，页码1／2／3。样本有两名有效管理员；admin 为当前登录账号，不允许禁用。librarian_02 与 zhaoliu 为禁用，其余样本正常；第三张选中 librarian_01／陈晓／馆员／正常。

未增加密码值、电话、邮箱、登录时间、账号删除、批量操作、导出或角色权限编辑。创建员工、重置密码与账号启停确认是待补充状态。所有演示数据为设计样本，时间基准2026-10-09（Asia/Shanghai），不表示真实数据库账号。

## 图片检查

- 三张 PNG 均通过完整性检查，为1487 × 1058、RGB，保留生成原件，未缩放或重绘。
- 已逐张核对十个用户名、显示名、角色与状态，以及侧栏仅读者管理高亮。
- 第一、二张当前 admin 的禁用为灰色锁定，重置密码仍可用；禁用账号呈启用操作，其余账号呈禁用操作。
- 第三张高亮陈晓并显示正确维护对象，启停／密码操作移至维护区，不增加新的业务字段或操作。
- 三张最末账号和分页均完整可见。第二张每页十条旁的下箭头属于生成细节，现有功能仍固定十条，不据此扩展页大小切换。
- 原生成文件依次为 exec-d1b77dd9-2405-4556-8bb1-f87ca8235ea2.png、exec-dad7957c-856f-42a8-915f-e702a27978f2.png、exec-e6bcf8f7-1417-429f-a0f3-24603c43e302.png；原件保留在当前任务 generated_images 目录。

## 当前检查点

管理员十一个主页面已选定；账号管理第一张已定稿，当前制作公告管理三个方案。公告管理、数据统计、审计日志的功能简报已保存。全部管理员、馆员、读者页面图片及补充状态确定前，不生成或修改页面实现代码。
