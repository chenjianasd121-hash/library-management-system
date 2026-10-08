# 全站视觉验收记录

## 截图与检查范围

- [1366×768 书目管理](tests/redesign-qa/librarian-staff-books-1366.png) · [1920×1080 书目管理](tests/redesign-qa/librarian-staff-books-1920.png)
- [1366×768 馆员概览](tests/redesign-qa/librarian-staff-dashboard-1366.png) · [1920×1080 馆员概览](tests/redesign-qa/librarian-staff-dashboard-1920.png)
- [1366×768 真实接口图书目录](tests/redesign-qa/real-visitor-books-1366.png) · [1920×1080 真实接口图书目录](tests/redesign-qa/real-visitor-books-1920.png)
- [1366×768 真实接口访客首页](tests/redesign-qa/real-visitor-home-1366.png) · [1920×1080 真实接口访客首页](tests/redesign-qa/real-visitor-home-1920.png)
- [1366×768 预约](tests/redesign-qa/reader-me-reservations-1366.png) · [1366×768 书目表单](tests/redesign-qa/librarian-staff-books-new-1366.png) · [1366×768 统计](tests/redesign-qa/librarian-staff-stats-1366.png)
- [加载](tests/redesign-qa/librarian-staff-books-loading-1366.png) · [空数据](tests/redesign-qa/librarian-staff-books-empty-1366.png) · [接口错误](tests/redesign-qa/librarian-staff-books-error-1366.png)

视觉夹具覆盖访客、读者、馆员、管理员的 26 个路由，在两档视口生成 52 张截图；另检查了三种页面状态在目录、书目和账号页的 9 张截图。[完整布局与错误记录](tests/redesign-qa/report.json)、[状态记录](tests/redesign-qa/states.json)。真实后端可访问时，访客首页、图书目录、公告使用未拦截的接口另拍 6 张，[真实接口记录](tests/redesign-qa/real-public.json)。

## 对照三张参考图

| 项目 | 检查与修正 |
| --- | --- |
| 图 2 的风格和比例 | 侧栏 248px、顶栏 60px、冷色画布和低阴影白卡。保留蓝色操作主轴，以青绿、紫、橙、红区分其他状态；仅首页主视觉使用大面积渐变。 |
| 图 1 的臃肿与长页 | 页面标题缩到 24px；表格约 40–44px/行；列表每页 10 条并保留服务端分页。1366 的 10 条书目和分页在同一视口显示。 |
| 图 3 的公告与借阅失衡 | 概览网格各卡按内容高度排布。单条公告卡约 103px，单条借阅卡约 142px，公告不再与借阅表格强制等高。 |
| 真实目录多数据 | 真实接口在 1366 下曾显示半张第 4 行卡片；改为每页 9 张，三行完整显示并露出分页。 |
| 统计页 | 第 7 个指标原本单独换行并推走图表；改为桌面单行七列。图表卡按内容收缩。 |

## 自动检查结果

- 52 个夹具页面：没有 JavaScript 页面错误；`documentElement` 在两档视口均无横向或纵向溢出，主要内容区也没有意外溢出。
- 9 个状态页面：骨架、空状态、错误重试入口均正确出现。
- 6 个真实公开页面：无接口错误和页面错误；在两档视口均无横向或纵向页面溢出。
- `vue-tsc --build`、`vite build`、Vitest 5 项测试均通过。构建仅保留现有大 chunk 提示。

馆员与管理员的视觉截图使用项目已有的隔离夹具；当前会话没有演示账号密码，未执行登录后的真实接口浏览器验收。视觉实现没有替换业务请求、权限路由、服务端状态含义或写操作流程。
