# 馆员设计审阅目录

2026-10-21 · [打开离线图片总览](review.html)。共 59 项，支持分类、搜索、本次新增筛选和大图切换。

14 个主页面与两个已选新建弹窗保留；分类必填校验已获确认。其余固定状态和本次馆员公共适配图待审阅。四张公共正文参考按馆员外壳复用，不能视为馆员整页定稿。

本次新增 20 张，原有 95 张与七张公共页参考均完整保留。未修改前后端应用代码。

- [状态覆盖与复用规则](STATE_COVERAGE.md)
- [公共页复用说明](PUBLIC_REUSE.md)
- [阶段检查点](PHASE_CHECKPOINT.md)
- [图片与来源校验](final-audit.json)
- [本次生成来源与哈希](continuation-2026-10-21.manifest.json)

## 已选主页面

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [馆员首页](dashboard/final.png) | 已选定 | /staff/dashboard |
| [办理借出](checkout/final.png) | 已选定 | /staff/checkout |
| [办理归还](return/final.png) | 已选定 | /staff/return |
| [借阅记录](loans/final.png) | 已选定 | /staff/loans |
| [预约管理](reservations/final.png) | 已选定 | /staff/reservations |
| [图书管理](books/final.png) | 已选定 | /staff/books |
| [新增书目](book-create/final.png) | 已选定 | /staff/books/new |
| [编辑书目](book-edit/final.png) | 已选定 | /staff/books/:id/edit |
| [实体副本管理](book-copies/final.png) | 已选定 | /staff/books/:id/copies |
| [分类管理](categories/final.png) | 已选定 | /staff/categories |
| [公告管理](notices/final.png) | 已选定 | /staff/notices |
| [数据统计](stats/final.png) | 已选定 | /staff/stats |
| [个人资料](profile/final.png) | 已选定 | /me/profile |
| [修改密码](change-password/final.png) | 已选定 | /change-password |

## 已选弹窗

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [新增分类弹窗](categories/states/create/final.png) | 已选第 3 版 |  |
| [新建公告弹窗](notices/states/create/final.png) | 已选第 1 版 | 保留已选布局的页脚修正版 |

## 分类维护

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [编辑分类](categories/states/edit-category.png) | 待审阅 |  |
| [分类停用前确认](categories/states/disable-confirmation.png) | 待审阅 |  |
| [分类必填校验](categories/states/required-validation.png) | 用户已确认 |  |

## 公告维护

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [编辑公告草稿](notices/states/edit-notice.png) | 待审阅 |  |
| [公告只读预览](notices/states/preview-notice.png) | 待审阅 |  |
| [公告发布前确认](notices/states/publish-confirmation.png) | 待审阅 |  |
| [公告已发布筛选](notices/states/published-list.png) | 待审阅 |  |
| [公告撤下前确认](notices/states/withdraw-confirmation.png) | 待审阅 |  |
| [公告已撤下筛选](notices/states/withdrawn-list.png) | 待审阅 |  |
| [公告必填校验](notices/states/required-validation.png) | 待审阅 |  |

## 副本与书目

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [修改馆藏位置](book-copies/states/location-dialog.png) | 待审阅 |  |
| [副本转维修确认](book-copies/states/maintenance-confirmation.png) | 待审阅 |  |
| [重复条码校验](book-copies/states/barcode-validation.png) | 待审阅 |  |
| [书目字段校验](book-create/states/field-validation.png) | 待审阅 |  |
| [ISBN 已存在](book-create/states/isbn-conflict.png) | 待审阅 |  |
| [封面上传状态板](book-create/states/cover-feedback.png) | 待审阅 |  |
| [书目停用前确认](books/states/disable-confirmation.png) | 待审阅 |  |

## 借还与清单

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [借出受限：读者逾期](checkout/states/blocked-checkout.png) | 待审阅 |  |
| [借出办理成功](checkout/states/checkout-success.png) | 待审阅 |  |
| [归还：无在借记录](return/states/no-active-loan.png) | 待审阅 | 本次新增 |
| [归还成功：恢复可借](return/states/return-success.png) | 待审阅 | 本次新增 |
| [逾期借阅筛选](loans/states/overdue-filter.png) | 待审阅 | 本次新增 |
| [待取预约筛选](reservations/states/ready-filter.png) | 待审阅 | 本次新增 |
| [排队预约筛选](reservations/states/waiting-filter.png) | 待审阅 | 本次新增 |
| [取消预约原因校验](reservations/states/cancel-reason-validation.png) | 待审阅 | 本次新增 |

## 账号与密码

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [显示名校验](profile/states/display-name-validation.png) | 待审阅 | 本次新增 |
| [资料保存中](profile/states/save-pending.png) | 待审阅 | 本次新增 |
| [资料保存成功](profile/states/save-success.png) | 待审阅 | 本次新增 |
| [资料保存失败](profile/states/save-failed.png) | 待审阅 | 本次新增 |
| [当前密码错误](change-password/states/current-password-incorrect.png) | 待审阅 | 本次新增 |
| [两次密码不一致](change-password/states/password-mismatch.png) | 待审阅 | 本次新增 |
| [首次登录必须改密](change-password/states/first-login-required.png) | 待审阅 | 本次新增 |

## 通用与统计

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [列表加载中](shared/list-loading.png) | 待审阅 | 本次新增 |
| [列表空结果](shared/list-empty.png) | 待审阅 | 本次新增 |
| [列表请求失败](shared/list-failed.png) | 待审阅 | 本次新增 |
| [统计无数据](stats/states/empty-data.png) | 待审阅 | 本次新增 |

## 公共页适配

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [馆员登录](public/login.png) | 待审阅 | 本次新增 · /login |
| [馆员公开目录](public/catalogue.png) | 待审阅 | 本次新增 · /books |
| [馆员书目详情](public/book-detail.png) | 待审阅 | 本次新增 · /books/:id |

## 正文复用参考

| 图片 | 审阅状态 | 说明 |
| --- | --- | --- |
| [公开公告正文](public/references/reader-notices.png) | 正文复用参考 | /notices · 图中是读者原版；馆员使用该正文与已选馆员外壳组合，详见公共页复用说明。 |
| [公告详情正文](public/references/reader-notice-detail.png) | 正文复用参考 | /notices/:id · 图中是读者原版；馆员使用该正文与已选馆员外壳组合，详见公共页复用说明。 |
| [无权限结果区](public/references/reader-forbidden.png) | 正文复用参考 | /403 · 图中是读者原版；馆员使用该正文与已选馆员外壳组合，详见公共页复用说明。 |
| [页面不存在结果区](public/references/reader-not-found.png) | 正文复用参考 | /:pathMatch(.*)* · 图中是读者原版；馆员使用该正文与已选馆员外壳组合，详见公共页复用说明。 |
