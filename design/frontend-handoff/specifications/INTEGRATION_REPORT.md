# 前后端真实联调与验收记录

日期：2026-09-28。项目路径：`C:\Users\en\OneDrive\桌面\基于SpringBoot+vue的图书管理系统`。

## 环境与数据

- JDK 17.0.12、Spring Boot 3.5.16、MyBatis Spring Boot Starter 3.0.5、MySQL 8.4（Docker Desktop）。演示数据库 `library_management`，Flyway 成功应用 `V1__initial_schema.sql`；Testcontainers 每次使用独立的 `library_management_test`。
- 本机 Compose MySQL 持久卷、后端 8080 与三个 Vite 入口同时运行：读者 `127.0.0.1:5173`、馆员 `127.0.0.2:5174`、管理员 `127.0.0.3:5175`。真实密码保存在本机进程环境和仓库外的临时 env 文件，仓库只含空值示例。
- 演示配置首次空库插入四个账号（覆盖三种角色）、5 个分类、20 本书、五种副本状态、在借/逾期/已还借阅、WAITING/READY/历史预约及已发布公告。之后的 HTTP 冒烟新增数据写入同一 MySQL；后端重启后书目总数继续增长，验证了持久化。

## 执行结果

| 验收项 | 实际结果 |
|---|---|
| `backend\mvnw.cmd test` | 通过；MySQL 8.4 Testcontainers 启动，Flyway V1 应用，0 失败。 |
| `backend\mvnw.cmd verify` | 通过；15 项后端测试，0 失败、0 跳过，生成可运行 JAR。 |
| `frontend\npm run type-check` | 通过。 |
| `frontend\npm run build` | 通过；Vite 对两个大分块有体积提示。 |
| `frontend\npm run test:unit -- --run` | 5 项通过。 |
| `frontend\npm run lint` | 通过；事先运行只读 oxlint 与 eslint，无报错。 |
| `frontend\npm run build:reader`、`build:librarian`、`build:admin` | 三种入口分别构建成功。 |
| `backend\scripts\http-smoke.ps1` | 通过：注册、登录、建书/副本、封面上传与读取、超大文件 400、预约 READY、借出、续借、归还、幂等重试、读者隔离、CSRF、统计均为真实 HTTP + MySQL。三入口改造后再次通过，书目数增至 28。 |
| `frontend\tests\real-integration.mjs` | 通过：Edge/Playwright 无拦截、无响应夹具，三个独立端口的角色登录后刷新恢复 Session，走 Vite 代理检查 36 个实际页面路由；同一浏览器上下文中三个入口的会话互不覆盖，无 API 4xx/5xx 或 JavaScript 异常。 |
| `frontend\tests\portal-layout.mjs` | 通过：1366×768 和 1920×1080 桌面分辨率下，三种登录页均无业务导航、无水平溢出、身份标题正确；人工查看截图，表单可见且布局完整。 |

后端测试覆盖 Mapper/Flyway 持久化、两个请求争用同一副本、借阅/预约上限、预约取消/过期重新分配、逾期限制、续借、幂等键冲突、version 冲突、账号禁用与最后管理员保护、强制改密、封面类型/大小/路径、统计 SQL 与事实一致、错误响应结构、数据库行到独立 API 投影的复制及 ArchUnit 分层。

## 联调中修复

员工在书目/分类列表不传 `enabled` 时，原控制器条件表达式将 `null` 自动拆箱导致 500。已改为明确 `Boolean.TRUE`，并新增已登录接口回归断言。表单中的服务端 400 字段错误也已映射到对应字段。管理员停用检查新增在用管理员行锁，上传超过限制时统一返回 400。

后续根据页面反馈，将登录/注册从 AppShell 中移出，重做角色专属登录页；新增三份 Vite 环境和三个启动/构建命令。登录请求明确 `portalRole`，后端拒绝角色与入口不符的登录；会话恢复和受保护请求也检查入口角色。独立本机地址让浏览器 Cookie 按主机隔离，避免仅切换端口时共享 Session。MySQL 集成测试新增错入口登录断言。

## 环境限制与后续生产验收

- 本机沙箱下原始中文 OneDrive 路径会令 Maven 测试类路径解析异常，测试和打包时通过 `subst L:` 映射到同一项目目录，再运行原样 `mvnw.cmd` 命令；源码和产物仍保存在上述项目路径。Docker Desktop 管道访问需本机授权，已在获授权环境真实执行。
- 当前随 Spring Boot 管理的 Flyway 版本对 MySQL 8.4 提示“高于其已测试的 8.1”，但 V1 迁移和所有 MySQL 测试成功。生产部署前仍应在目标数据库版本做迁移演练。
- 生产 HTTPS、反向代理、共享 Session、横向多实例限流和外部封面存储没有本机部署环境，需在目标环境验收。浏览器脚本验证所有角色的主要路由和读接口；写操作由真实 HTTP 全流程及 MySQL 集成测试验证，未逐个自动点击所有管理页面按钮。
