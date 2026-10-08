# Google Chrome 视觉验收记录

## 环境与范围

- 浏览器：本机 `C:\Users\en\AppData\Local\Google\Chrome\Application\chrome.exe`，通过 Playwright Core 启动实际 Chrome 可执行文件。
- 桌面参考尺寸：1672×940；全页检查尺寸：1366×768、375×812。
- 使用生产构建的前端页面。`chrome-acceptance.mjs` 在浏览器网络层提供隔离的视觉夹具；正式运行代码无 Mock 开关或演示业务数据。
- 后端工程和 MySQL 目前不在仓库内，因此真实数据、Cookie 会话及完整业务闭环尚无法联调。

## 对照参考图

管理员工作台截图：[1672×940](./chrome-acceptance/admin-staff-dashboard-1672.png)。侧栏宽 252px、顶栏高 60px；蓝色图书馆横幅、四张指标卡、借还趋势、热门书目图、快捷操作、公告与最新借阅表格在同一首屏网格中。参考图中的分类分布图改用规范规定的热门书目数据；“导出报表”没有接口，未加入快捷操作。指标和图表值只来自统计接口，截图中的数字仅由测试夹具提供。

首次对照发现图表区高度过大，使借阅表格掉出 940px 首屏；调整后表格从约 682px 开始，与参考图的位置接近。375px 下发现顶栏搜索区及表单造成横向溢出，已修正。最终截图：[管理员移动端](./chrome-acceptance/admin-staff-dashboard-375.png)、[访客移动端](./chrome-acceptance/visitor-home-375.png)、[馆员借出页](./chrome-acceptance/librarian-staff-checkout-375.png)。

## 检查结果

- `results.json`：84 组角色、路由和尺寸检查；最终 0 项页面横向溢出或前端脚本错误。访客恢复会话时预期的 `401` 网络提示从错误统计中排除。
- `states.json`：使用 Chrome 在 1366×768 下检查 18 个异步数据页面的加载、空数据和服务错误，共 54 项，均显示对应状态、无页面横向溢出或脚本异常。静态表单页面没有初始数据请求；详情页的空值仅作为组件视觉状态检查。
- `interactions.json`：8 项移动端交互检查均通过，包括登录与注册校验、目录搜索 URL、预约登录跳转、取消预约弹窗、分类弹窗、读者查找及账号弹窗。
- 错误状态截图：[访客首页](./chrome-acceptance/visitor-home-error-1366.png)、[管理员账号页](./chrome-acceptance/admin-admin-users-error-1366.png)。
- 无后端时的实际连接失败界面：[首页 1672×940](./chrome-acceptance/offline-home-1672.png)，保留了明确错误和重试入口。

## 后续联调

后端及 MySQL 完成后，需要再次使用本机 Chrome 按真实账号检查注册、编目与副本、两名读者预约、借出、续借限制、归还再分配、逾期解除、禁用账号与统计更新。统计字段名与书目关键词形状尚需按根目录 README 的契约缺口统一。
