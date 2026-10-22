# 读者图书详情 · 三个设计方案

2026-10-09 · 已登录读者张三 · `/books/:id` · 使用内置 Image Gen。用户已选定第三张，保存为 [final.png](final.png)。

## 本轮展示编号

编号按本轮三个独立生成候选图片的实际展示顺序记录，旧公共详情截图仅为参考，不计入候选。

| 编号 | 方向 | 图片 | 提示词 |
| --- | --- | --- | --- |
| 1 | 封面信息详情 | [cover-information-detail.png](cover-information-detail.png) | [cover-information-detail.prompt.txt](cover-information-detail.prompt.txt) |
| 2 | 预约侧栏详情 | [reservation-sidebar-detail.png](reservation-sidebar-detail.png) | [reservation-sidebar-detail.prompt.txt](reservation-sidebar-detail.prompt.txt) |
| 3 | 横向分区详情 | [horizontal-sections-detail.png](horizontal-sections-detail.png) | [horizontal-sections-detail.prompt.txt](horizontal-sections-detail.prompt.txt) |

三个文件均为 PNG，实际画幅 1487 × 1058，保留生成原图；目标桌面画幅为 1440 × 1024。`final.png` 为第三张 `horizontal-sections-detail.png` 的原样副本，已核对 SHA-256 一致。

## 内容与状态

- 延续已定稿的读者首页和图书目录视觉，已登录读者张三，图书目录导航高亮。
- 三个方案为同一演示书目：Java编程思想／Bruce Eckel／计算机类；ISBN 9787115546081、机械工业出版社、2020-01-01、关键词 Java,编程、简介「系统介绍 Java 编程语言及面向对象思想。」。
- 数量一致：总册 8、可借 3、待取 1、借出 4。数据来自现有 Chrome 测试样例，仅为设计演示，不表示当前数据库或该书的真实出版资料。
- 当前为可预约的初始详情状态：书目上架，读者没有逾期、本书的在借记录或有效预约，预约资格加载成功；按钮「预约待取」启用。
- 支持「查看我的预约」和「返回目录」；预约后取书信息由我的预约显示。初始详情没有分配条码、截止时间、排队序号或成功提示。
- 已逐图查看书目数据、读者导航、馆藏数量、出版日期、简介、预约及返回入口，所有信息与底部动作完整可见，并验证 PNG 可读取。

## 依据与参考

详细约束见 [brief.md](brief.md)。依据当前 `frontend/src/views/BookDetailView.vue`、BookDetail 类型、预约 API 和 `frontend/tests/chrome-acceptance.mjs` 中的测试书目。

第一张生成附上 [读者目录定稿](../catalogue/final.png) 和 [旧公共详情截图](reference-existing-detail.png)。旧截图仅用于了解已有字段与布局，非本轮运行前端结果。第二、第三张分别以本轮第一张作为视觉和数据参考，通过独立 Image Gen 请求生成新的内容布局。

三张生成来源依次为 `exec-af924b9b-0176-411c-a7ea-e8965e744d1f.png`、`exec-3a48b0b9-ae42-4694-b4cc-b86b23514784.png`、`exec-31d805cd-36e0-4d27-bd12-56587f4338a7.png`。使用内置图片工具，没有生成或修改页面实现代码。

## 下一步

第三张已定稿，继续「我的借阅」页面的三个方案。全部三个端的页面图片完成并经用户选定后，才能进入代码阶段。
