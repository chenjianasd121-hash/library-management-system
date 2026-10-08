# 后端实施计划

## 阶段 1：契约与数据库设计

- 完整核对两份开发规范、README、前端 API、路由、页面及测试。
- 固定 `keywords`、统计与审计字段；产出 `CONTRACT_GAP.md`、`API_CONTRACT.md`、`DATABASE_DESIGN.md`。
- 数据库使用 MySQL 8/InnoDB、UTC 时间戳、Flyway 版本迁移；主键 BIGINT，在 API 中统一为字符串。

## 阶段 2：基础工程

- Java 17 / Spring Boot 3.5.16 / MyBatis Starter 3.0.5 Maven 工程及 Wrapper。
- 统一响应、异常、traceId、Session/CSRF/Spring Security、配置和 Flyway 初始迁移。
- 先以编译及迁移检查作为阶段门槛。

## 阶段 3：账号与馆藏

- 认证、资料、用户、分类、书目、副本、封面；Controller → Service → Mapper XML。
- Bean Validation、角色和账号状态检查、审计；单元与控制器测试。

## 阶段 4：流通闭环

- 借出、归还、续借、预约、队列、到期重分配、幂等。
- 锁顺序为读者 → 书目 → 副本/预约；数据库生成列唯一索引兜底。
- MySQL 环境下验证事务回滚、竞争同一副本、限额及预约先后。

## 阶段 5：公告、统计与前端联调

- 公告、数据库聚合统计、审计查询、demo 数据初始化。
- 保留页面视觉，仅调整类型、请求错误处理和会话刷新；以实际 HTTP 与 MySQL 数据验证页面业务。

## 阶段 6：验收

- 执行 Maven test/verify、前端 type-check/build/unit/lint（lint 前检查其自动修复配置）。
- 记录各项实际结果、环境限制与未完成项到 `INTEGRATION_REPORT.md`。

## 测试矩阵

认证与 CSRF；三角色权限及资源所有权；需改密、禁用和旧会话；馆藏状态及 version；借阅上限、逾期与续借；预约顺序、取消与超时；幂等；文件类型与路径；数据库约束、并发及聚合统计；分层架构。

## 阶段检查点（2026-09-28）

- 阶段 1–4：契约与设计文档、完整工程、Flyway V1、领域服务和测试代码已保存；MySQL 8.4 Testcontainers 执行迁移及核心业务测试通过。
- 阶段 5：Compose MySQL 8.4 演示库、后端与 Vite 已联通；真实 HTTP 全流程通过；三个角色的浏览器 36 个路由无接口错误。联调中修复员工查询未传 `enabled` 导致 500 的问题。
- 阶段 6：Maven Wrapper `test` 与 `verify`、前端 type-check/build/unit/lint 均通过。最终命令和环境限制见 `INTEGRATION_REPORT.md`。
- 三入口页面修订：读者、馆员、管理员分别使用 5173/5174/5175 端口及独立本机地址；登录页脱离业务导航，后台按入口角色校验，三份前端构建、真实浏览器联调与 1366×768、1920×1080 桌面布局检查通过。
