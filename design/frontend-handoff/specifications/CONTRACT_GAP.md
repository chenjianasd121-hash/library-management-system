# 契约差异与统一决定

依据优先级：用户任务说明 → `后端开发规范.md` → `前端开发规范.md` → 前端实际调用。2026-09-27 审计了 `frontend/src/api`、`stores/auth.ts`、`router/index.ts`、全部 `views`、`src/__tests__`、`tests` 和 Vite 配置。

| 项目 | 原差异 | 统一契约与处理 |
|---|---|---|
| 书目 `keywords` | 后端规范未定形状；前端类型为 `string[] \| string \| null`，编辑框按字符串使用 | 固定 `string \| null`，逗号分隔；前端类型、两份规范与后端 DTO 同步。 |
| `stats/overview` | 后端仅列口径，前端字段可选 | 固定 `bookCount,totalCopies,availableCopies,activeLoans,overdueLoans,readyReservations,readerCount,generatedAt` 且全部必返。 |
| `stats/loans-trend` | 后端未写数组元素字段 | 固定 `date,borrowedCount,returnedCount`。 |
| `stats/top-books` | 后端未写数组元素字段 | 固定 `bookId,title,borrowCount`，ID 为字符串。 |
| `audit-logs` | 操作者名称未明确，前端标为可选 | 固定 `actorName:string \| null`；无法关联时返回 `null`。 |
| 自动任务审计操作者 | 过期/自动分配不存在登录操作者 | `actorId:string \| null`，自动任务写 `null`，前端类型同步。 |
| 可空字段 | 一部分前端类型使用 `?` | 已知可空字段由后端显式返回 `null`；错误响应 `data:null`。 |
| 注册及改密后 CSRF | 前端仅在登录/退出后主动刷新 | 注册及改密后也刷新，以匹配 Session 生命周期。 |
| 三种身份共用登录入口 | 原前端只有一个 `/login`，侧边业务导航还包裹登录页；原登录体没有入口角色 | 三个独立 Vite 入口分别服务读者、馆员、管理员，登录体增加 `portalRole`，请求增加 `X-Portal-Role`。登录页脱离业务布局；不同本机地址隔离 Cookie。 |
| 400/409/422 | 请求层保留详情，但部分表单未定位到字段 | 登录、注册、资料、改密及主要管理表单将 `details` 映射到字段；409/422 显示业务原因，相关列表与详情重新获取。 |

前端所有业务路径与后端规范第 6 节逐项匹配。`frontend/tests/chrome-acceptance.mjs` 使用隔离视觉夹具，不属于运行时 API 模拟，不能作为联调通过依据。
