# 页面与现有前端对应

从当前 `frontend/src/router/index.ts` 提取27条路由。点击角色列直接打开该端采用的原图；“仅正文”必须换成馆员外壳。完整状态和弹窗通过预览或manifest按路由查询，不新增路由。

| 路由 | 现有Vue视图 | 管理员 | 馆员 | 读者 |
|---|---|---|---|---|
| `/` | [HomeView.vue](../../frontend/src/views/HomeView.vue) | — | — | [读者首页](读者端/pages/home.png) |
| `/login` | [LoginView.vue](../../frontend/src/views/LoginView.vue) | [管理员登录](管理员端/pages/login.png) | [馆员登录](馆员端/pages/public-login.png) | [读者登录](读者端/pages/login.png) |
| `/register` | [RegisterView.vue](../../frontend/src/views/RegisterView.vue) | — | — | [读者注册](读者端/pages/register.png) |
| `/books` | [BooksView.vue](../../frontend/src/views/BooksView.vue) | [公开图书目录](管理员端/pages/public-catalogue.png) | [馆员公开目录](馆员端/pages/public-catalogue.png) | [图书目录](读者端/pages/catalogue.png) |
| `/books/:id` | [BookDetailView.vue](../../frontend/src/views/BookDetailView.vue) | [公开书目详情](管理员端/pages/book-detail.png) | [馆员书目详情](馆员端/pages/public-book-detail.png) | [图书详情](读者端/pages/book-detail.png) |
| `/notices` | [NoticesView.vue](../../frontend/src/views/NoticesView.vue) | [公开公告](管理员端/pages/public-notices.png) | [公开公告正文（仅正文）](读者端/pages/notices.png) | [系统公告](读者端/pages/notices.png) |
| `/notices/:id` | [NoticeDetailView.vue](../../frontend/src/views/NoticeDetailView.vue) | [公告详情](管理员端/pages/notice-detail.png) | [公告详情正文（仅正文）](读者端/pages/notice-detail.png) | [公告详情](读者端/pages/notice-detail.png) |
| `/me/loans` | [MyLoansView.vue](../../frontend/src/views/MyLoansView.vue) | — | — | [我的借阅](读者端/pages/my-loans.png) |
| `/me/reservations` | [MyReservationsView.vue](../../frontend/src/views/MyReservationsView.vue) | — | — | [我的预约：待取](读者端/pages/my-reservations.png) |
| `/me/profile` | [ProfileView.vue](../../frontend/src/views/ProfileView.vue) | [个人资料](管理员端/pages/profile.png) | [个人资料](馆员端/pages/profile.png) | [个人资料](读者端/pages/profile.png) |
| `/change-password` | [ChangePasswordView.vue](../../frontend/src/views/ChangePasswordView.vue) | [修改密码](管理员端/pages/change-password.png) | [修改密码](馆员端/pages/change-password.png) | [修改密码](读者端/pages/change-password.png) |
| `/staff/dashboard` | [DashboardView.vue](../../frontend/src/views/DashboardView.vue) | [首页工作台](管理员端/pages/dashboard.png) | [馆员首页](馆员端/pages/dashboard.png) | — |
| `/staff/books` | [StaffBooksView.vue](../../frontend/src/views/StaffBooksView.vue) | [图书管理](管理员端/pages/book-management.png) | [图书管理](馆员端/pages/books.png) | — |
| `/staff/books/new` | [BookFormView.vue](../../frontend/src/views/BookFormView.vue) | [新增书目](管理员端/pages/book-create.png) | [新增书目](馆员端/pages/book-create.png) | — |
| `/staff/books/:id/edit` | [BookFormView.vue](../../frontend/src/views/BookFormView.vue) | [编辑书目](管理员端/pages/book-edit.png) | [编辑书目](馆员端/pages/book-edit.png) | — |
| `/staff/books/:id/copies` | [CopiesView.vue](../../frontend/src/views/CopiesView.vue) | [实体副本管理](管理员端/pages/book-copies.png) | [实体副本管理](馆员端/pages/book-copies.png) | — |
| `/staff/categories` | [CategoriesView.vue](../../frontend/src/views/CategoriesView.vue) | [分类管理](管理员端/pages/categories.png) | [分类管理](馆员端/pages/categories.png) | — |
| `/staff/checkout` | [CheckoutView.vue](../../frontend/src/views/CheckoutView.vue) | [办理借出](管理员端/pages/checkout.png) | [办理借出](馆员端/pages/checkout.png) | — |
| `/staff/return` | [ReturnView.vue](../../frontend/src/views/ReturnView.vue) | [办理归还](管理员端/pages/return.png) | [办理归还](馆员端/pages/return.png) | — |
| `/staff/loans` | [StaffLoansView.vue](../../frontend/src/views/StaffLoansView.vue) | [借阅管理](管理员端/pages/loan-management.png) | [借阅记录](馆员端/pages/loans.png) | — |
| `/staff/reservations` | [StaffReservationsView.vue](../../frontend/src/views/StaffReservationsView.vue) | [预约管理](管理员端/pages/reservations.png) | [预约管理](馆员端/pages/reservations.png) | — |
| `/staff/notices` | [StaffNoticesView.vue](../../frontend/src/views/StaffNoticesView.vue) | [公告管理](管理员端/pages/notices.png) | [公告管理](馆员端/pages/notices.png) | — |
| `/staff/stats` | [StatsView.vue](../../frontend/src/views/StatsView.vue) | [数据统计](管理员端/pages/statistics.png) | [数据统计](馆员端/pages/stats.png) | — |
| `/admin/users` | [UsersView.vue](../../frontend/src/views/UsersView.vue) | [账号管理](管理员端/pages/users.png) | — | — |
| `/admin/audit` | [AuditView.vue](../../frontend/src/views/AuditView.vue) | [审计日志](管理员端/pages/audit.png) | — | — |
| `/403` | [ForbiddenView.vue](../../frontend/src/views/ForbiddenView.vue) | [无权限](管理员端/pages/forbidden.png) | [无权限结果区（仅正文）](读者端/pages/forbidden.png) | [无权限](读者端/pages/forbidden.png) |
| `/:pathMatch(.*)*` | [NotFoundView.vue](../../frontend/src/views/NotFoundView.vue) | [页面不存在](管理员端/pages/not-found.png) | [页面不存在结果区（仅正文）](读者端/pages/not-found.png) | [页面不存在](读者端/pages/not-found.png) |

## 入口与权限

- `/` 是读者首页；管理员和馆员根路径沿用现有守卫跳转 `/staff/dashboard`。读者登录后角色首页仍按当前 `roleHome` 跳转 `/me/loans`。
- `/register` 仅读者端；管理员、馆员沿用跳转登录的逻辑。`/me/loans`、`/me/reservations` 只供读者。
- `/admin/users`、`/admin/audit` 仅管理员。馆员菜单不展示这两项。
- 未登录、角色错配、强制首次改密、403及404沿用现有守卫。设计图中的身份与导航不能覆盖真实权限。
- `shared` 表示通用状态示例，不是浏览器地址。相同路径在不同门户使用对应角色图；不能用管理员图替代馆员图。
