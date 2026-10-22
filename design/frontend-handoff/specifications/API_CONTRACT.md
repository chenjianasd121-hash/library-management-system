# API 契约

所有 JSON API 为 `/api/v1` 前缀，成功 `{code:"OK",message:"成功",data,traceId}`，失败 `{code,message,data:null,details,traceId}`。列表 `data` 为 `{items,page,size,total}`，page 从 1 开始，size 为 1–100，默认 20。创建返回 201。所有 BIGINT 主键在 JSON 中是十进制字符串。可空字段明确为 `null`；时间带时区，业务日期为 `yyyy-MM-dd`。

## 路径和权限

| 领域 | 公开 | 读者 | 馆员及管理员 | 仅管理员 |
|---|---|---|---|---|
| 认证 | `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `GET /policy` | `GET /auth/me`, `POST /auth/logout`, `PATCH /me/profile`, `POST /me/change-password` | 同本人接口 | 同本人接口 |
| 馆藏 | `GET /categories`, `GET /books`, `GET /books/{id}`, `GET /media/covers/{opaqueName}` | 同公开接口 | `POST/PATCH /categories`, `POST/PATCH /books`, `GET/POST /books/{id}/copies`, `GET /copies/lookup`, `PATCH /copies/{id}`, `POST /media/covers` | 同馆员 |
| 流通 | — | `GET /me/loans`, `POST /loans/{id}/renew`, `POST /reservations`, `GET /me/reservations`, `POST /reservations/{id}/cancel` | `POST/GET /loans`, `POST /loans/{id}/return`, `GET /reservations`, `POST /reservations/{id}/cancel` | 同馆员 |
| 公告 | `GET /notices`, `GET /notices/{id}` | 同公开接口 | `POST/PATCH /notices`, `POST /notices/{id}/publish`, `POST /notices/{id}/withdraw` | 同馆员 |
| 人员和报表 | — | — | `GET /readers/lookup`, `GET /stats/overview`, `GET /stats/loans-trend`, `GET /stats/top-books` | `GET/POST /users`, `GET/PATCH /users/{id}`, `POST /users/{id}/reset-password`, `GET /audit-logs` |

完整请求参数与响应重点见 `后端开发规范.md` 第 6 节。`keywords:string|null` 用逗号分隔。概况字段：`bookCount,totalCopies,availableCopies,activeLoans,overdueLoans,readyReservations,readerCount,generatedAt`。趋势元素：`date,borrowedCount,returnedCount`。热门书目元素：`bookId,title,borrowCount`。审计记录包含 `actorName:string|null`。

所有写请求带 `X-XSRF-TOKEN`；登录态使用 `JSESSIONID`。借出、归还、续借、预约创建和取消可带 UUID `Idempotency-Key`，24 小时内同体重放返回原结果，异体返回 409。

登录请求为 `{username,password,portalRole}`，其中 `portalRole` 必须是 `READER`、`LIBRARIAN` 或 `ADMIN`。账号角色与入口角色不匹配时统一返回 `401 INVALID_CREDENTIALS`，避免泄漏账号身份。登录后的前端请求携带 `X-Portal-Role`；若会话身份与入口身份不匹配，返回 `403 PORTAL_ROLE_MISMATCH`。后端仍逐接口检查实际角色和资源权限。三个开发入口分别是 `127.0.0.1:5173`（读者）、`127.0.0.2:5174`（馆员）、`127.0.0.3:5175`（管理员）。

Mapper XML 的查询结果使用内部 `DbRecord`，服务层通过 `Rows.row/rows` 复制并将蛇形字段转换为独立的 `ApiRecord` DTO 投影；控制器不直接访问 Mapper。读写入参使用独立请求结构，数据库行对象不作为接口响应。
