# 图书管理系统

Git 已建立本地版本管理，保存版本和撤回修改的方法见 [Git 保存与回退指南](./GIT_GUIDE.md)。初始代码恢复点为 `project-baseline`。

Vue 3 前端位于 [`frontend`](./frontend)，Java 17 / Spring Boot 3.5.16 / MyBatis 3.0.5 后端位于 [`backend`](./backend)。所有业务数据保存到 MySQL 8.x；Flyway 管理结构，服务端 Session 与 CSRF 保护写请求。接口统一使用 `/api/v1`，详见 [`API_CONTRACT.md`](./API_CONTRACT.md) 和 [`后端开发规范.md`](./后端开发规范.md)。

## Docker 一键启动

启动 Docker Desktop 后，在项目根目录执行：

```powershell
.\backend\scripts\start-docker.ps1
```

脚本会构建 Java 后端和三个前端入口，启动 MySQL、后端、读者、馆员、管理员共五个容器，并等待健康检查通过。首次执行会创建 Git 忽略的 `backend/.env`；如果当前项目已有 `backend-mysql-1`，会复用其数据库凭据和原有数据卷。已有账号和数据不会重新播种；空库才会使用该文件中的三个演示密码初始化账号。

访问地址：

- 读者：http://127.0.0.1:5173/
- 馆员：http://127.0.0.2:5174/
- 管理员：http://127.0.0.3:5175/

三个入口都通过容器内 Nginx 将 `/api` 转发至后端；后端同时可在本机 `http://127.0.0.1:8080` 访问。MySQL 仅映射至本机 3307。封面继续保存到 `backend/data/covers`，数据库继续使用 `backend_library_mysql_data` 数据卷。

没有代码变化时，可执行 `.\backend\scripts\start-docker.ps1 -NoBuild`。查看日志与停止服务：

```powershell
docker compose --env-file backend/.env -f backend/compose.yaml logs --tail 100
docker compose --env-file backend/.env -f backend/compose.yaml stop
```

## Windows 本机启动

需要 JDK 17、MySQL 8.x（推荐 8.4 LTS）、Node.js `^22.18.0 || >=24.12.0` 和 npm。先确认 `java -version`、`mysql --version`、`node --version`。数据库默认名为 `library_management`，字符集 `utf8mb4`，应用账号需有此库的读写和 Flyway 建表权限。可由管理员在 MySQL 中执行：

```sql
CREATE DATABASE library_management CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'library_app'@'localhost' IDENTIFIED BY '<在本机设置的强密码>';
GRANT ALL PRIVILEGES ON library_management.* TO 'library_app'@'localhost';
```

如仅需 Docker 数据库配合本机前后端，可在完成上述 Docker 配置后执行 `docker compose --env-file backend/.env -f backend/compose.yaml up -d mysql`。Compose 默认将 MySQL 映射到本机 3307 端口，须相应设置 `DB_URL`；已有原生 MySQL 服务时无需 Docker。不要将密码写入 Git；环境变量名称见 [`backend/.env.example`](./backend/.env.example)。

```powershell
$env:DB_URL = 'jdbc:mysql://localhost:3306/library_management?connectionTimeZone=UTC&forceConnectionTimeZoneToSession=true'
$env:DB_USER = 'library_app'
$env:DB_PASSWORD = '<本机数据库密码>'
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

另开三个 PowerShell，分别启动读者、馆员和管理员入口（首次启动先在 `frontend` 执行一次 `npm ci`）：

```powershell
cd frontend
npm ci
npm run dev:reader
```

```powershell
cd frontend
npm run dev:librarian
```

```powershell
cd frontend
npm run dev:admin
```

三个独立入口为：读者 `http://127.0.0.1:5173/login`、馆员 `http://127.0.0.2:5174/login`、管理员 `http://127.0.0.3:5175/login`。读者入口可自助注册；馆员和管理员入口只接受对应身份账号。登录页全屏独立展示，不带业务导航。三个入口使用不同的本机地址和端口，以隔离浏览器的 Session Cookie；**浏览器 Cookie 不按端口隔离**，部署时也要为三个入口配置不同主机名。每个 Vite 服务均将 `/api` 代理到 `http://localhost:8080`。直接请求后端可访问 `http://localhost:8080/api/v1/policy`。若数据库使用 Compose 端口，将 `DB_URL` 中 `3306` 改为 `3307`。

本机的中文 OneDrive 路径若使 Maven/JDK 测试类路径报错，可先执行 `subst L: 'C:\Users\en\OneDrive\桌面\基于SpringBoot+vue的图书管理系统'`，再从 `L:\backend` 运行相同的 Wrapper 命令；映射指向原目录，不会复制项目。

## 演示账号和数据

2026-10-22 已追加一批可直接登录的本机测试账号与书目/借还数据，入口及场景见 [本机测试数据说明](./design/LOCAL_TEST_DATA.md)。账号密码保存在本机被 Git 忽略的 `output/runtime/local-test-seed/accounts.private.json`，不写入版本库。

仅本地演示时，启动前设置三个环境变量，再以 `local,demo` 配置启动：

```powershell
$env:DEMO_ADMIN_PASSWORD = '<至少 8 位的本机密码>'
$env:DEMO_LIBRARIAN_PASSWORD = '<至少 8 位的本机密码>'
$env:DEMO_READER_PASSWORD = '<至少 8 位的本机密码>'
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local,demo
```

首次空库会初始化 `demo_admin`、`demo_librarian`、`demo_reader`、`demo_reader2`，以及 5 个分类、20 条书目、各类副本状态、借阅、预约和公告。演示密码只从环境变量读取并经自适应哈希保存；已有用户时不会重复播种。正式环境不要启用 `demo` 配置。

## 测试与验收

2026-10-22 三端新设计的检查点见 [实施记录](./design/implementation-checkpoints.md)，视觉待验收项见 [design-qa.md](./design-qa.md)。全面流程测试已使用独立后台 Chrome 完成，修复 8 类缺陷；后端 20 项测试、7 组各 20 轮并发、三档各 60 秒压力通过。实际覆盖、指标和限制见 [TEST_REPORT.md](./TEST_REPORT.md)，复跑见 [流程测试说明](./frontend/tests/flow-qa/README.md)。参考图 1:1 色差校准仍待单独完成。

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd verify
```

集成测试优先通过 Testcontainers 启动真正的 MySQL 8.4，需要 Docker Desktop 可用。HTTP 全流程和浏览器路由检查需要运行中的演示服务，并在当前 PowerShell 中设置演示密码：

```powershell
.\backend\scripts\http-smoke.ps1
cd frontend
node tests/real-integration.mjs
npm run type-check
npm run build
npm run test:unit -- --run
npm run lint
```

`real-integration.mjs` 通过 Vite 代理和实际数据库验收三个角色的页面；可用 `CHROME_PATH` 指定 Chrome 或 Edge 可执行文件。前端视觉夹具脚本只用于页面样式检查，不参与真实接口验证。`npm run lint` 包含自动修复，运行前宜先检查改动。

三个入口可分别构建：`npm run build:reader`、`npm run build:librarian`、`npm run build:admin`。生产部署需将三个构建目录分别放在不同主机名下，并将各自的 `/api` 路由反向代理至后端。

## 生产部署

使用独立 MySQL 账号、强密码和备份；将数据库凭据、封面存储目录及演示密码从环境或密钥管理服务提供，不提交到仓库。通过 HTTPS 和同源反向代理发布前端与 `/api/v1`，设置 `SESSION_COOKIE_SECURE=true`，保留 `JSESSIONID` 的 HttpOnly/SameSite=Lax 与 `XSRF-TOKEN` Cookie，写请求须携带 `X-XSRF-TOKEN`。为封面目录配置持久化存储及文件备份；上线前运行 Flyway 迁移和测试。多实例部署时还需共享或粘滞 Session，并使用可跨实例共享的登录/注册限流设施。

设计与验收记录：[`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md)、[`BACKEND_IMPLEMENTATION_PLAN.md`](./BACKEND_IMPLEMENTATION_PLAN.md)、[`CONTRACT_GAP.md`](./CONTRACT_GAP.md)、[`INTEGRATION_REPORT.md`](./INTEGRATION_REPORT.md)。
