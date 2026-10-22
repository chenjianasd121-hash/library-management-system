# 数据库设计

数据库建议名 `library_management`，MySQL 8.x/InnoDB/`utf8mb4_0900_ai_ci`。Flyway `V1__initial_schema.sql` 建立九张业务表：`users`、`categories`、`books`、`book_copies`、`loans`、`reservations`、`notices`、`audit_logs`、`idempotency_records`。全部表有 `created_at` 与 `updated_at`；连接会话 UTC，业务日期按 Asia/Shanghai 计算。

关系：`books.category_id → categories.id`；`book_copies.book_id → books.id`；`loans.book_id/copy_id/reader_id/handled_by` 分别关联书目、副本、用户；`reservations.book_id/reader_id/copy_id` 关联书目、用户、副本；公告发布人和审计操作者关联用户（审计操作者允许空值，以保留历史）。

唯一约束：用户名、分类编码、非空 ISBN、条码；`loans` 的生成列仅在 ACTIVE 时为 1，并与 `copy_id` 组合成唯一索引；预约生成列仅在 WAITING/READY 时为 1，与 `(reader_id,book_id)` 组合成唯一索引，READY 副本另外有唯一索引。历史终态为 NULL，不阻止之后重新预约/借阅。

关键查询索引：`books(category_id,enabled,title)`、`book_copies(book_id,status,id)`、`loans(reader_id,status,due_date)`、`reservations(book_id,status,requested_at,id)`、`notices(status,published_at)`、`audit_logs(actor_id,occurred_at)` 和 `(entity_type,entity_id)`。计数由实时 SQL 聚合，副本 RETIRED 不计总册。时间戳在 SQL 和 JDBC 中按 UTC 存取。

并发锁顺序：读者行 → 书目行 → 按 ID 顺序访问副本/预约；副本更新附带预期状态和 version。幂等记录以 `(actor_id,method,path,idempotency_key)` 唯一，24 小时有效，成功响应与业务事务共同提交。

禁用账号时先按 ID 锁定所有在用管理员行，再检查目标账号和最后管理员数量，避免两个并发禁用请求同时通过保护条件。
