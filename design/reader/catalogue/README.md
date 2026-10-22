# 读者图书目录 · 三个设计方案

2026-10-09 · 已登录读者张三 · `/books` · 使用内置 Image Gen。用户已选定第一张「封面网格目录」，定稿为 [final.png](final.png)。

## 本轮编号

编号按三个不同候选图片在聊天中的实际展示顺序确定。分类侧栏图的本地核对预览和随后返回的生成结果是同一文件，计为同一个候选。先前的旧目录截图为参考，不计入候选。

| 编号 | 设计方向 | 图片 | 使用提示词 |
| --- | --- | --- | --- |
| 1 | 封面网格目录 | [cover-grid-catalogue.png](cover-grid-catalogue.png) | [cover-grid-catalogue.prompt.txt](cover-grid-catalogue.prompt.txt) |
| 2 | 分类侧栏目录 | [category-sidebar-catalogue.png](category-sidebar-catalogue.png) | [category-sidebar-catalogue.prompt.txt](category-sidebar-catalogue.prompt.txt) |
| 3 | 紧凑检索目录 | [compact-search-list.png](compact-search-list.png) | [compact-search-list.edit-retry.prompt.txt](compact-search-list.edit-retry.prompt.txt) |

三个文件均为独立 PNG，实际画幅 1487 × 1058，保留生成原图；目标画幅 1440 × 1024。已将第一张 `cover-grid-catalogue.png` 复制为 `final.png` 并核对完全一致。

## 统一功能与检查

- 沿用已选定的 [读者首页第三张](../home/final.png)，保持深蓝侧栏、浅蓝灰画布与蓝色主按钮。
- 已登录读者张三，图书目录高亮，导航只有读者的六个入口。
- 所有方案关键词为空、全部分类、「仅看可借」未勾选。分类侧栏与分类下拉是同一筛选功能的不同布局。
- 六本演示书目为 Java编程思想、人类简史、解忧杂货店、数据结构与算法、经济学原理、活着；可借／总册依次为 3／8、2／8、0／8、2／8、0／8、2／8。
- 可借数量大于零显示「可预约待取」，两本可借为零的书显示「预约排队」；图书入口为「查看详情」。
- 共 6 本图书在当前每页 9 条的请求规则下只有 1 页，前后翻页禁用。数字为设计演示数据，不表示当前数据库结果。
- 不展示没有逐本可靠来源的 ISBN 数值，保留 ISBN 检索；不增加排序、收藏、评分、管理动作或直接借出等功能。
- 已逐图核对身份、导航、筛选初始状态、六本书名与作者、分类、册数、预约提示、操作入口和分页，所有内容完整可见；已验证 PNG 可读取。

完整数据与约束见 [brief.md](brief.md)。依据当前 BooksView、BookCard、AppShell 和 BookSummary，旧目录截图 [reference-existing-catalogue.png](reference-existing-catalogue.png) 仅用于功能与数据参考，非本轮运行截图。

## 生成与恢复记录

三个图片的来源为 `exec-8cdd656c-dd9b-48e9-9b9a-55edc4812b71.png`、`exec-c73af061-425d-44a9-8381-677f84568d82.png`、`exec-758e3395-7ef1-4323-aec1-da65c52c614a.png`。

生成过程遇到连接问题，已检查并保留现有输出。分类侧栏图从本地恢复后同一生成结果也成功返回。列表方案首次及两次重试未交付图片，最终通过内置 Image Gen 以已生成的封面网格图为参考，保留导航、筛选与数据，制作新的六行列表布局。

失败尝试的 [原提示词](compact-search-list.prompt.txt)、[第一次重试](compact-search-list.retry.prompt.txt)、[第二次重试](compact-search-list.retry-v2.prompt.txt) 均保留，实际第三张使用上表的编辑提示词。有效方案分别附上可访问的视觉参考，没有采用 CLI 或代码绘图。

## 下一步

图书目录已定稿，当前继续读者图书详情的三个方案。全部三个端页面图片完成且经用户选定前，不生成或修改页面实现代码。
