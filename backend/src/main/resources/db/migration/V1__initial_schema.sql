CREATE TABLE users (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(32) NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 display_name VARCHAR(40) NOT NULL,
 phone VARCHAR(32) NULL,
 role VARCHAR(16) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
 must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
 session_version BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_users_username (username),
 KEY idx_users_role_status (role,status),
 CONSTRAINT ck_users_role CHECK (role IN ('ADMIN','LIBRARIAN','READER')),
 CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE','DISABLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categories (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(80) NOT NULL,
 code VARCHAR(32) NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 sort_order INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_categories_code (code),
 KEY idx_categories_enabled_sort (enabled,sort_order,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE books (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 isbn VARCHAR(13) NULL,
 title VARCHAR(200) NOT NULL,
 author VARCHAR(120) NOT NULL,
 publisher VARCHAR(120) NULL,
 published_on DATE NULL,
 description TEXT NULL,
 category_id BIGINT NOT NULL,
 cover_path VARCHAR(255) NULL,
 keywords VARCHAR(500) NULL,
 enabled BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_books_isbn (isbn),
 KEY idx_books_category_enabled_title (category_id,enabled,title,id),
 KEY idx_books_enabled_title (enabled,title,id),
 CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE book_copies (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 book_id BIGINT NOT NULL,
 barcode VARCHAR(32) NOT NULL,
 shelf_location VARCHAR(120) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE',
 version INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_copies_barcode (barcode),
 KEY idx_copies_book_status_id (book_id,status,id),
 CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books(id),
 CONSTRAINT ck_copies_status CHECK (status IN ('AVAILABLE','READY','BORROWED','MAINTENANCE','RETIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE loans (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 book_id BIGINT NOT NULL,
 copy_id BIGINT NOT NULL,
 reader_id BIGINT NOT NULL,
 borrowed_at TIMESTAMP(3) NOT NULL,
 due_date DATE NOT NULL,
 returned_at TIMESTAMP(3) NULL,
 renewal_count TINYINT NOT NULL DEFAULT 0,
 status VARCHAR(16) NOT NULL,
 handled_by BIGINT NOT NULL,
 active_marker TINYINT GENERATED ALWAYS AS (CASE WHEN status='ACTIVE' THEN 1 ELSE NULL END) STORED,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_loans_active_copy (copy_id,active_marker),
 UNIQUE KEY uq_loans_active_reader_book (reader_id,book_id,active_marker),
 KEY idx_loans_reader_status_due (reader_id,status,due_date,id),
 KEY idx_loans_copy_status (copy_id,status),
 KEY idx_loans_borrowed_at (borrowed_at),
 CONSTRAINT fk_loans_book FOREIGN KEY (book_id) REFERENCES books(id),
 CONSTRAINT fk_loans_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id),
 CONSTRAINT fk_loans_reader FOREIGN KEY (reader_id) REFERENCES users(id),
 CONSTRAINT fk_loans_handler FOREIGN KEY (handled_by) REFERENCES users(id),
 CONSTRAINT ck_loans_status CHECK (status IN ('ACTIVE','RETURNED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reservations (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 book_id BIGINT NOT NULL,
 reader_id BIGINT NOT NULL,
 copy_id BIGINT NULL,
 status VARCHAR(16) NOT NULL,
 requested_at TIMESTAMP(3) NOT NULL,
 ready_at TIMESTAMP(3) NULL,
 pickup_deadline DATE NULL,
 fulfilled_at TIMESTAMP(3) NULL,
 closed_at TIMESTAMP(3) NULL,
 active_marker TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('WAITING','READY') THEN 1 ELSE NULL END) STORED,
 ready_marker TINYINT GENERATED ALWAYS AS (CASE WHEN status='READY' THEN 1 ELSE NULL END) STORED,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_reservations_active_reader_book (reader_id,book_id,active_marker),
 UNIQUE KEY uq_reservations_ready_copy (copy_id,ready_marker),
 KEY idx_reservations_queue (book_id,status,requested_at,id),
 KEY idx_reservations_reader_status (reader_id,status,id),
 KEY idx_reservations_expiry (status,pickup_deadline,id),
 CONSTRAINT fk_reservations_book FOREIGN KEY (book_id) REFERENCES books(id),
 CONSTRAINT fk_reservations_reader FOREIGN KEY (reader_id) REFERENCES users(id),
 CONSTRAINT fk_reservations_copy FOREIGN KEY (copy_id) REFERENCES book_copies(id),
 CONSTRAINT ck_reservations_status CHECK (status IN ('WAITING','READY','FULFILLED','CANCELLED','EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notices (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(120) NOT NULL,
 content TEXT NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
 published_at TIMESTAMP(3) NULL,
 publisher_id BIGINT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 KEY idx_notices_status_published (status,published_at,id),
 CONSTRAINT fk_notices_publisher FOREIGN KEY (publisher_id) REFERENCES users(id),
 CONSTRAINT ck_notices_status CHECK (status IN ('DRAFT','PUBLISHED','WITHDRAWN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 actor_id BIGINT NULL,
 action VARCHAR(80) NOT NULL,
 entity_type VARCHAR(64) NOT NULL,
 entity_id BIGINT NOT NULL,
 before_json JSON NULL,
 after_json JSON NULL,
 trace_id VARCHAR(64) NULL,
 occurred_at TIMESTAMP(3) NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 KEY idx_audit_actor_time (actor_id,occurred_at,id),
 KEY idx_audit_entity (entity_type,entity_id,id),
 CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE idempotency_records (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 actor_id BIGINT NOT NULL,
 method VARCHAR(8) NOT NULL,
 path VARCHAR(255) NOT NULL,
 idempotency_key CHAR(36) NOT NULL,
 request_hash CHAR(64) NOT NULL,
 response_code SMALLINT NULL,
 response_json JSON NULL,
 expires_at TIMESTAMP(3) NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_idempotency_scope (actor_id,method,path,idempotency_key),
 KEY idx_idempotency_expiry (expires_at),
 CONSTRAINT fk_idempotency_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
