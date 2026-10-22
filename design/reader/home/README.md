# 读者首页 · 三个设计方案

2026-10-09 · 已登录读者 · `/` · 使用内置 Image Gen。用户已选定本轮第三张「搜索优先首页」，定稿为 [final.png](final.png)。

## 本轮展示顺序

编号以聊天里三个候选图片的实际展示顺序为准。生成请求的启动顺序不作为编号依据；查看的原首页、目录及用户参考图不计入候选。

| 编号 | 方向 | 图片 | 实际使用的提示词 |
| --- | --- | --- | --- |
| 1 | 书架浏览首页 | [bookshelf-home.png](bookshelf-home.png) | [bookshelf-home.prompt.txt](bookshelf-home.prompt.txt) |
| 2 | 阅读服务首页 | [reading-service-home.png](reading-service-home.png) | [reading-service-home.prompt.txt](reading-service-home.prompt.txt) |
| 3 | 搜索优先首页 | [search-led-home.png](search-led-home.png) | [search-led-home.retry.prompt.txt](search-led-home.retry.prompt.txt) |

三个方案均为独立 PNG，实际画幅 1487 × 1058，保持生成原图；目标桌面画幅为 1440 × 1024。已将第三张 `search-led-home.png` 复制为 `final.png` 并核对完全一致。

## 内容与检查

- 延续用户已选定的蓝色视觉，按读者任务安排首页。已登录读者张三，导航包含首页概览、图书目录、系统公告、我的借阅、我的预约与个人中心。
- 主要操作为按书名、作者或 ISBN 搜索图书；书目从「查看详情」进入详情页办理预约。
- 四本演示书目的可借／总册分别为 3／8、2／8、0／8、2／8；可借为零的解忧杂货店显示「预约排队」，其余三本为「可预约待取」。
- 演示公告日期为 2026-10-08、2026-10-06、2026-10-03，均早于 2026-10-09 的当前基准。演示数据不表示当前数据库结果。
- 已逐图查看读者身份、导航、书名作者、册数、预约状态、日期和操作入口，并核对 PNG 可读取、全部内容没有裁切。
- 阅读服务布局增加了短简介演示文案，后续若选中该方案，简介应来自已有 `BookDetail.description`；当前 `HomeView.vue` 的 `BookSummary` 请求没有此字段。此记录供后续实现时保持数据来源一致。

## 参考与生成记录

参考为 [图书管理定稿](../../book-management/final.png)、[用户原首页参考](../../book-management/reference-dashboard.png) 和 [旧公共首页截图](reference-existing-home.png)。旧截图用于了解现有结构和功能，并非本轮运行前端的结果。依据当前 HomeView、BookCard、AppShell、路由和 API 类型，详细简报见 [brief.md](brief.md)。

搜索布局的初次请求长时间没有返回图片，检查已有输出后终止该等待并使用精简的等价提示词重试。原 [提示词](search-led-home.prompt.txt) 保留；本轮有效第三张使用重试提示词。其余两个方案的已生成图片与提示词均被保留，没有重复生成。

三个图片对应生成来源分别为 `exec-bbba7b2e-ee32-4a59-9733-9b2edcd1f678.png`、`exec-36547a37-7c64-486e-9068-47702164e256.png`、`exec-4392b63e-bf80-4ad2-9c78-8d627d62714a.png`。

## 下一步

读者首页已选定第三张，当前继续读者图书目录的三个方案。读者端全套明细见 [页面清单](../PAGE_PLAN.md)。全部三个端的图片完成且经用户选定前，不生成或修改页面实现代码。
