-- ============================================================================
-- SIMAS (Sistem Informasi Manajemen Aset) - Yayasan Pendidikan (12 Unit)
-- Database Schema DDL (MySQL 8.0+ / MariaDB 10.6+)
-- Diturunkan dari arsitektur SLiMS & Blueprint v2 + v3
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- DOMAIN A: ORGANISASI & AKSES (11 Tabel)
-- ============================================================================

CREATE TABLE `legal_entity` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `legal_type` VARCHAR(20) NOT NULL DEFAULT 'foundation' COMMENT 'foundation, association, company',
    `tax_id` VARCHAR(30) DEFAULT NULL,
    `deed_no` VARCHAR(100) DEFAULT NULL,
    `deed_date` DATE DEFAULT NULL,
    `accounting_standard` VARCHAR(20) NOT NULL DEFAULT 'ISAK35' COMMENT 'ISAK35, SAK_EP, SAK_ETAP',
    `fiscal_year_start_month` TINYINT NOT NULL DEFAULT 1,
    `capitalization_threshold` DECIMAL(18,2) DEFAULT NULL,
    `fiscal_depreciation_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `head_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_legal_entity_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `branch` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `legal_entity_id` BIGINT UNSIGNED NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `unit_type` VARCHAR(20) NOT NULL DEFAULT 'SMA' COMMENT 'TK, SD, SMP, SMA, SMK, PT, PESANTREN, OFFICE, OTHER',
    `npsn` VARCHAR(20) DEFAULT NULL,
    `head_title` VARCHAR(50) NOT NULL DEFAULT 'Kepala Sekolah',
    `head_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `sarpras_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `wa_sender_config_id` BIGINT UNSIGNED DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(30) DEFAULT NULL,
    `latitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'Titik GPS Peta GIS Yayasan (#4)',
    `longitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'Titik GPS Peta GIS Yayasan (#4)',
    `geofence_radius_m` INT NOT NULL DEFAULT 300 COMMENT 'Radius validasi GPS Stock Opname dalam meter (#6)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_branch_code` (`code`),
    KEY `ix_branch_legal_entity` (`legal_entity_id`),
    CONSTRAINT `fk_branch_legal_entity` FOREIGN KEY (`legal_entity_id`) REFERENCES `legal_entity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `department` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `parent_id` BIGINT UNSIGNED DEFAULT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `cost_center_code` VARCHAR(30) DEFAULT NULL,
    `head_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_dept_branch_code` (`branch_id`, `code`),
    KEY `ix_dept_parent` (`parent_id`),
    CONSTRAINT `fk_dept_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_dept_parent` FOREIGN KEY (`parent_id`) REFERENCES `department` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `position` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `level` TINYINT NOT NULL DEFAULT 1 COMMENT '1=Staf/Guru, 2=Kaur/Wali, 3=Wakasek/Kabag, 4=Kepsek/Manajer, 5=Direktur, 6=Pengurus Yayasan',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_position_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employee` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_no` VARCHAR(30) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `position_id` BIGINT UNSIGNED NOT NULL,
    `supervisor_id` BIGINT UNSIGNED DEFAULT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `phone_wa` VARCHAR(20) DEFAULT NULL,
    `join_date` DATE NOT NULL,
    `employment_status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, probation, resigned, terminated, retired',
    `exit_date` DATE DEFAULT NULL,
    `photo_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
    `blocked_reason` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_employee_no` (`employee_no`),
    UNIQUE KEY `uq_employee_email` (`email`),
    KEY `ix_employee_branch` (`branch_id`),
    KEY `ix_employee_dept` (`department_id`),
    CONSTRAINT `fk_employee_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_employee_dept` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
    CONSTRAINT `fk_employee_position` FOREIGN KEY (`position_id`) REFERENCES `position` (`id`),
    CONSTRAINT `fk_employee_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `last_login_at` DATETIME DEFAULT NULL,
    `failed_login_count` TINYINT NOT NULL DEFAULT 0,
    `locked_until` DATETIME DEFAULT NULL,
    `two_factor_secret` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_username` (`username`),
    UNIQUE KEY `uq_user_email` (`email`),
    UNIQUE KEY `uq_user_employee` (`employee_id`),
    CONSTRAINT `fk_user_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_role_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permission` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(80) NOT NULL,
    `module` VARCHAR(40) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_permission_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permission` (
    `role_id` BIGINT UNSIGNED NOT NULL,
    `permission_id` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `permission` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_role` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'NULL = berlaku untuk semua unit di yayasan',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_role_branch` (`user_id`, `role_id`, `branch_id`),
    CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ur_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `funding_source` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_restricted` TINYINT(1) NOT NULL DEFAULT 0,
    `restriction_note` TEXT DEFAULT NULL,
    `can_be_rented` TINYINT(1) NOT NULL DEFAULT 1,
    `can_be_disposed_by_foundation` TINYINT(1) NOT NULL DEFAULT 1,
    `requires_external_report` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_funding_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN B: MASTER ASET (10 Tabel)
-- ============================================================================

CREATE TABLE `fiscal_group` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `useful_life_years` TINYINT NOT NULL,
    `straight_line_rate` DECIMAL(5,2) NOT NULL,
    `declining_rate` DECIMAL(5,2) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_fiscal_group_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_category` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT UNSIGNED DEFAULT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `level` TINYINT NOT NULL DEFAULT 1,
    `kib_code` CHAR(1) DEFAULT 'B' COMMENT 'A=Tanah, B=Mesin/Alat, C=Gedung, D=Jalan/Jaringan, E=Lainnya, F=KDP',
    `asset_type` VARCHAR(20) NOT NULL DEFAULT 'fixed_asset' COMMENT 'fixed_asset, extracomptable, land, cip',
    `capitalization_threshold` DECIMAL(18,2) DEFAULT NULL,
    `fiscal_group_id` BIGINT UNSIGNED DEFAULT NULL,
    `useful_life_months` SMALLINT DEFAULT NULL,
    `depreciation_method` VARCHAR(20) DEFAULT 'straight_line' COMMENT 'straight_line, declining_balance, none',
    `salvage_value_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `maintenance_interval_days` SMALLINT DEFAULT NULL,
    `requires_serial_number` TINYINT(1) NOT NULL DEFAULT 0,
    `is_rentable` TINYINT(1) NOT NULL DEFAULT 0,
    `label_color` CHAR(7) DEFAULT '#1E88E5',
    `gl_asset_account` VARCHAR(30) DEFAULT NULL,
    `gl_accum_depr_account` VARCHAR(30) DEFAULT NULL,
    `gl_depr_expense_account` VARCHAR(30) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_category_code` (`code`),
    KEY `ix_category_parent` (`parent_id`),
    CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_category_fiscal` FOREIGN KEY (`fiscal_group_id`) REFERENCES `fiscal_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_status` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `color` CHAR(7) NOT NULL DEFAULT '#6B7280',
    `can_assign` TINYINT(1) NOT NULL DEFAULT 0,
    `can_loan` TINYINT(1) NOT NULL DEFAULT 0,
    `include_in_opname` TINYINT(1) NOT NULL DEFAULT 1,
    `include_in_depreciation` TINYINT(1) NOT NULL DEFAULT 1,
    `is_final` TINYINT(1) NOT NULL DEFAULT 0,
    `is_system` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_asset_status_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `location` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `parent_id` BIGINT UNSIGNED DEFAULT NULL,
    `location_type` VARCHAR(20) NOT NULL DEFAULT 'room' COMMENT 'building, floor, room, rack, outdoor',
    `room_function` VARCHAR(20) DEFAULT 'other' COMMENT 'classroom, laboratory, library, office, hall, sports, worship, dormitory, warehouse, workshop, other',
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `full_path` VARCHAR(500) NOT NULL,
    `capacity` SMALLINT DEFAULT NULL,
    `pic_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `is_storage` TINYINT(1) NOT NULL DEFAULT 0,
    `is_rentable` TINYINT(1) NOT NULL DEFAULT 0,
    `qr_code` VARCHAR(100) DEFAULT NULL,
    `nfc_uid` VARCHAR(64) DEFAULT NULL COMMENT 'Tag NFC pintu ruang (#3)',
    `floor_plan_attachment_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Gambar denah lantai 2D (#4)',
    `map_coordinates` JSON DEFAULT NULL COMMENT 'Poligon ruang di atas denah lantai atau GeoJSON tanah (#4)',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_location_branch_code` (`branch_id`, `code`),
    UNIQUE KEY `uq_location_qr` (`qr_code`),
    UNIQUE KEY `uq_location_nfc` (`nfc_uid`),
    KEY `ix_location_parent` (`parent_id`),
    CONSTRAINT `fk_location_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_location_parent` FOREIGN KEY (`parent_id`) REFERENCES `location` (`id`),
    CONSTRAINT `fk_location_pic` FOREIGN KEY (`pic_employee_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vendor` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Diisi = dikelola mandiri oleh unit; NULL = vendor bersama yayasan',
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `vendor_type` VARCHAR(20) NOT NULL DEFAULT 'both' COMMENT 'supplier, service, both, leasing, insurance',
    `tax_id` VARCHAR(30) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `city` VARCHAR(100) DEFAULT NULL,
    `contact_name` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(30) DEFAULT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `bank_name` VARCHAR(100) DEFAULT NULL,
    `bank_account_no` VARCHAR(50) DEFAULT NULL,
    `bank_account_name` VARCHAR(150) DEFAULT NULL,
    `payment_term_days` SMALLINT DEFAULT 30,
    `rating` DECIMAL(3,2) DEFAULT NULL,
    `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_vendor_branch_code` (`branch_id`, `code`),
    CONSTRAINT `fk_vendor_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `brand` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_brand_branch_code` (`branch_id`, `code`),
    CONSTRAINT `fk_brand_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `uom` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_uom_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `category_attribute` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `data_type` VARCHAR(20) NOT NULL DEFAULT 'text' COMMENT 'text, number, date, select, boolean',
    `options` JSON DEFAULT NULL,
    `is_required` TINYINT(1) NOT NULL DEFAULT 0,
    `sort_order` SMALLINT NOT NULL DEFAULT 10,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_cat_attr` (`category_id`, `code`),
    CONSTRAINT `fk_cat_attr_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loan_rule` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Aturan pinjam mandiri per unit; NULL = default yayasan',
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `min_position_level` TINYINT DEFAULT NULL,
    `max_loan_days` SMALLINT NOT NULL DEFAULT 7,
    `max_extensions` TINYINT NOT NULL DEFAULT 2,
    `extension_days` SMALLINT NOT NULL DEFAULT 7,
    `max_concurrent` TINYINT NOT NULL DEFAULT 2,
    `requires_approval` TINYINT(1) NOT NULL DEFAULT 0,
    `late_fee_per_day` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `priority` SMALLINT NOT NULL DEFAULT 100,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_loan_rule_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_loan_rule_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `holiday` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `holiday_date` DATE NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `description` VARCHAR(150) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_holiday_date_branch` (`holiday_date`, `branch_id`),
    CONSTRAINT `fk_holiday_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN C: ASET INTI (5 Tabel)
-- ============================================================================

CREATE TABLE `asset_model` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Diisi = katalog model milik unit sendiri; NULL = katalog bersama yayasan',
    `category_id` BIGINT UNSIGNED NOT NULL,
    `brand_id` BIGINT UNSIGNED DEFAULT NULL,
    `name` VARCHAR(200) NOT NULL,
    `model_number` VARCHAR(100) DEFAULT NULL,
    `specification` TEXT DEFAULT NULL,
    `uom_id` BIGINT UNSIGNED NOT NULL,
    `replacement_cost` DECIMAL(18,2) DEFAULT NULL,
    `default_attributes` JSON DEFAULT NULL,
    `image_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `manual_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `reorder_point` SMALLINT DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_model_branch_cat` (`branch_id`, `category_id`),
    CONSTRAINT `fk_model_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_model_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_model_brand` FOREIGN KEY (`brand_id`) REFERENCES `brand` (`id`),
    CONSTRAINT `fk_model_uom` FOREIGN KEY (`uom_id`) REFERENCES `uom` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_tag` VARCHAR(40) NOT NULL,
    `model_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `parent_asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `name` VARCHAR(200) NOT NULL,
    `serial_number` VARCHAR(100) DEFAULT NULL,
    `inventory_code` VARCHAR(50) DEFAULT NULL,
    `asset_type` VARCHAR(20) NOT NULL DEFAULT 'fixed_asset' COMMENT 'fixed_asset, extracomptable, cip, land, leased_in',
    -- Posisi & Kepemilikan
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `location_id` BIGINT UNSIGNED NOT NULL,
    `current_holder_id` BIGINT UNSIGNED DEFAULT NULL,
    `status_id` BIGINT UNSIGNED NOT NULL,
    `condition` VARCHAR(20) NOT NULL DEFAULT 'good' COMMENT 'good, minor_damage, major_damage',
    -- Perolehan & Sumber Dana
    `funding_source_id` BIGINT UNSIGNED DEFAULT NULL,
    `acquisition_method` VARCHAR(20) NOT NULL DEFAULT 'purchase' COMMENT 'purchase, grant, lease, transfer_in, self_built, opening_balance',
    `vendor_id` BIGINT UNSIGNED DEFAULT NULL,
    `goods_receipt_item_id` BIGINT UNSIGNED DEFAULT NULL,
    `acquisition_date` DATE NOT NULL,
    `invoice_no` VARCHAR(50) DEFAULT NULL,
    `invoice_date` DATE DEFAULT NULL,
    `acquisition_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `original_currency` CHAR(3) NOT NULL DEFAULT 'IDR',
    `original_cost` DECIMAL(18,2) DEFAULT NULL,
    `exchange_rate` DECIMAL(18,6) DEFAULT 1.000000,
    `is_capitalized` TINYINT(1) NOT NULL DEFAULT 1,
    `is_estimated_value` TINYINT(1) NOT NULL DEFAULT 0,
    `cip_accumulated_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    -- Penyusutan Komersial
    `depreciation_method` VARCHAR(20) NOT NULL DEFAULT 'straight_line',
    `useful_life_months` SMALLINT DEFAULT NULL,
    `salvage_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `depreciation_start_date` DATE DEFAULT NULL,
    `accumulated_depreciation` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `book_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `last_depreciation_period` CHAR(7) DEFAULT NULL,
    -- Penyusutan Fiskal
    `fiscal_acquisition_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `fiscal_group_id` BIGINT UNSIGNED DEFAULT NULL,
    `fiscal_method` VARCHAR(20) NOT NULL DEFAULT 'straight_line',
    `fiscal_start_date` DATE DEFAULT NULL,
    `fiscal_accumulated_depreciation` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `fiscal_book_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `fiscal_last_period` CHAR(7) DEFAULT NULL,
    -- Garansi, Perawatan & Sewa
    `warranty_start_date` DATE DEFAULT NULL,
    `warranty_end_date` DATE DEFAULT NULL,
    `warranty_vendor_id` BIGINT UNSIGNED DEFAULT NULL,
    `maintenance_interval_days` SMALLINT DEFAULT NULL,
    `last_maintenance_date` DATE DEFAULT NULL,
    `next_maintenance_date` DATE DEFAULT NULL,
    `usage_meter` DECIMAL(12,2) DEFAULT NULL,
    `usage_meter_unit` VARCHAR(10) DEFAULT NULL,
    `is_rentable` TINYINT(1) NOT NULL DEFAULT 0,
    `rental_note` VARCHAR(255) DEFAULT NULL,
    `last_opname_date` DATE DEFAULT NULL,
    `qr_payload` VARCHAR(255) NOT NULL,
    `rfid_epc` VARCHAR(64) DEFAULT NULL COMMENT 'Kode UHF RFID untuk scan massal (#3)',
    `nfc_uid` VARCHAR(64) DEFAULT NULL COMMENT 'UID Tag NFC Tap (#3)',
    `map_pin_xy` JSON DEFAULT NULL COMMENT 'Titik koordinat (x,y) posisi aset di atas denah ruang 2D (#4)',
    `photo_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `disposed_at` DATE DEFAULT NULL,
    `deleted_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_asset_tag` (`asset_tag`),
    UNIQUE KEY `uq_asset_inv_code` (`inventory_code`),
    UNIQUE KEY `uq_asset_rfid` (`rfid_epc`),
    UNIQUE KEY `uq_asset_nfc` (`nfc_uid`),
    KEY `ix_asset_model` (`model_id`),
    KEY `ix_asset_category` (`category_id`),
    KEY `ix_asset_branch_status` (`branch_id`, `status_id`),
    KEY `ix_asset_location` (`location_id`),
    KEY `ix_asset_holder` (`current_holder_id`),
    KEY `ix_asset_sn` (`serial_number`),
    CONSTRAINT `fk_asset_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`),
    CONSTRAINT `fk_asset_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_asset_parent` FOREIGN KEY (`parent_asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_asset_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_asset_dept` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
    CONSTRAINT `fk_asset_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`),
    CONSTRAINT `fk_asset_holder` FOREIGN KEY (`current_holder_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_asset_status` FOREIGN KEY (`status_id`) REFERENCES `asset_status` (`id`),
    CONSTRAINT `fk_asset_funding` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_source` (`id`),
    CONSTRAINT `fk_asset_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`),
    CONSTRAINT `fk_asset_fiscal_group` FOREIGN KEY (`fiscal_group_id`) REFERENCES `fiscal_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_attribute_value` (
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `attribute_id` BIGINT UNSIGNED NOT NULL,
    `value_text` TEXT DEFAULT NULL,
    `value_number` DECIMAL(18,4) DEFAULT NULL,
    `value_date` DATE DEFAULT NULL,
    PRIMARY KEY (`asset_id`, `attribute_id`),
    CONSTRAINT `fk_aav_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_aav_attr` FOREIGN KEY (`attribute_id`) REFERENCES `category_attribute` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_document` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `document_type` VARCHAR(30) NOT NULL COMMENT 'insurance, vehicle_tax, kir, calibration, license, certificate, contract_lease, bpkb, imb_pbg, other',
    `document_no` VARCHAR(100) DEFAULT NULL,
    `issuer` VARCHAR(150) DEFAULT NULL,
    `issue_date` DATE DEFAULT NULL,
    `expiry_date` DATE DEFAULT NULL,
    `amount` DECIMAL(18,2) DEFAULT NULL,
    `attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `reminder_days` SMALLINT NOT NULL DEFAULT 30,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_asset_doc_expiry` (`expiry_date`),
    CONSTRAINT `fk_asset_doc_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `event_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `event_type` VARCHAR(30) NOT NULL,
    `from_status_id` BIGINT UNSIGNED DEFAULT NULL,
    `to_status_id` BIGINT UNSIGNED DEFAULT NULL,
    `from_location_id` BIGINT UNSIGNED DEFAULT NULL,
    `to_location_id` BIGINT UNSIGNED DEFAULT NULL,
    `from_holder_id` BIGINT UNSIGNED DEFAULT NULL,
    `to_holder_id` BIGINT UNSIGNED DEFAULT NULL,
    `ref_type` VARCHAR(30) NOT NULL,
    `ref_id` BIGINT UNSIGNED NOT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_asset_hist_asset_date` (`asset_id`, `event_at`),
    CONSTRAINT `fk_asset_hist_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN D: PENGAJUAN & WORKFLOW APPROVAL KUSTOM (6 Tabel)
-- ============================================================================

CREATE TABLE `approval_workflow` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `request_type` VARCHAR(20) NOT NULL,
    `legal_entity_id` BIGINT UNSIGNED DEFAULT NULL,
    `branch_ids` JSON DEFAULT NULL,
    `category_ids` JSON DEFAULT NULL,
    `funding_source_ids` JSON DEFAULT NULL,
    `min_amount` DECIMAL(18,2) DEFAULT NULL,
    `max_amount` DECIMAL(18,2) DEFAULT NULL,
    `priority` SMALLINT NOT NULL DEFAULT 100,
    `version` SMALLINT NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_workflow_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_workflow_step` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `workflow_id` BIGINT UNSIGNED NOT NULL,
    `step_order` TINYINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `approver_mode` VARCHAR(20) NOT NULL COMMENT 'supervisor, dept_head, branch_head, branch_sarpras, entity_head, role, position, user',
    `approver_ref` VARCHAR(50) DEFAULT NULL,
    `scope` VARCHAR(10) NOT NULL DEFAULT 'branch' COMMENT 'branch, entity',
    `decision_rule` VARCHAR(10) NOT NULL DEFAULT 'any' COMMENT 'any, all',
    `sla_hours` SMALLINT NOT NULL DEFAULT 48,
    `escalate_to_mode` VARCHAR(20) DEFAULT NULL,
    `escalate_to_ref` VARCHAR(50) DEFAULT NULL,
    `can_edit_amount` TINYINT(1) NOT NULL DEFAULT 0,
    `skip_if_amount_below` DECIMAL(18,2) DEFAULT NULL,
    `require_attachment` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `ix_wf_step_order` (`workflow_id`, `step_order`),
    CONSTRAINT `fk_wf_step_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflow` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_delegation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `from_employee_id` BIGINT UNSIGNED NOT NULL,
    `to_employee_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `request_types` JSON DEFAULT NULL,
    `reason` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_deleg_from` FOREIGN KEY (`from_employee_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_deleg_to` FOREIGN KEY (`to_employee_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `request` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `request_no` VARCHAR(30) NOT NULL,
    `request_type` VARCHAR(20) NOT NULL COMMENT 'procurement, loan, assignment, extension, return, transfer, maintenance, replacement, upgrade, disposal, rental, charge_waiver',
    `requester_id` BIGINT UNSIGNED NOT NULL,
    `on_behalf_department_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `funding_source_id` BIGINT UNSIGNED DEFAULT NULL,
    `budget_id` BIGINT UNSIGNED DEFAULT NULL,
    `parent_request_id` BIGINT UNSIGNED DEFAULT NULL,
    `title` VARCHAR(200) NOT NULL,
    `reason` TEXT NOT NULL,
    `priority` VARCHAR(10) NOT NULL DEFAULT 'normal',
    `needed_by_date` DATE DEFAULT NULL,
    `total_estimated_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, pending, approved, rejected, cancelled, in_progress, completed',
    `current_step` TINYINT NOT NULL DEFAULT 1,
    `workflow_id` BIGINT UNSIGNED DEFAULT NULL,
    `workflow_version` SMALLINT DEFAULT NULL,
    `submitted_at` DATETIME DEFAULT NULL,
    `decided_at` DATETIME DEFAULT NULL,
    `completed_at` DATETIME DEFAULT NULL,
    `cancel_reason` VARCHAR(255) DEFAULT NULL,
    `deleted_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_request_no` (`request_no`),
    KEY `ix_request_type_status` (`request_type`, `status`),
    KEY `ix_request_branch` (`branch_id`),
    CONSTRAINT `fk_req_requester` FOREIGN KEY (`requester_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_req_dept` FOREIGN KEY (`on_behalf_department_id`) REFERENCES `department` (`id`),
    CONSTRAINT `fk_req_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_req_funding` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_source` (`id`),
    CONSTRAINT `fk_req_parent` FOREIGN KEY (`parent_request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_req_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `approval_workflow` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `request_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT UNSIGNED NOT NULL,
    `line_no` SMALLINT NOT NULL DEFAULT 1,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `model_id` BIGINT UNSIGNED DEFAULT NULL,
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `description` VARCHAR(500) NOT NULL,
    `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    `uom_id` BIGINT UNSIGNED NOT NULL,
    `estimated_unit_price` DECIMAL(18,2) DEFAULT NULL,
    `estimated_total` DECIMAL(18,2) DEFAULT NULL,
    `payload` JSON DEFAULT NULL,
    `fulfilled_qty` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_req_item_req` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_req_item_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_req_item_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`),
    CONSTRAINT `fk_req_item_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_req_item_uom` FOREIGN KEY (`uom_id`) REFERENCES `uom` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `approval_step` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `request_id` BIGINT UNSIGNED NOT NULL,
    `workflow_step_id` BIGINT UNSIGNED DEFAULT NULL,
    `step_order` TINYINT NOT NULL,
    `assigned_to_id` BIGINT UNSIGNED NOT NULL,
    `delegated_to_id` BIGINT UNSIGNED DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued' COMMENT 'queued, waiting, approved, rejected, returned, skipped',
    `decision_note` TEXT DEFAULT NULL,
    `acted_by_user_id` BIGINT UNSIGNED DEFAULT NULL,
    `acted_at` DATETIME DEFAULT NULL,
    `due_at` DATETIME DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_app_step_req` (`request_id`, `step_order`),
    KEY `ix_app_step_assigned` (`assigned_to_id`, `status`),
    CONSTRAINT `fk_app_step_req` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_app_step_wf_step` FOREIGN KEY (`workflow_step_id`) REFERENCES `approval_workflow_step` (`id`),
    CONSTRAINT `fk_app_step_assigned` FOREIGN KEY (`assigned_to_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_app_step_delegated` FOREIGN KEY (`delegated_to_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_app_step_user` FOREIGN KEY (`acted_by_user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN E: ANGGARAN & PENGADAAN PENUH (9 Tabel)
-- ============================================================================

CREATE TABLE `budget` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `fiscal_year` SMALLINT NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `department_id` BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `funding_source_id` BIGINT UNSIGNED DEFAULT NULL,
    `planned_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `committed_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `realized_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `remaining_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, approved, closed',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_budget_scope` (`fiscal_year`, `department_id`, `category_id`, `funding_source_id`),
    CONSTRAINT `fk_budget_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_budget_dept` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`),
    CONSTRAINT `fk_budget_cat` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_budget_funding` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_source` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rfq` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rfq_no` VARCHAR(30) NOT NULL,
    `request_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `issue_date` DATE NOT NULL,
    `deadline_date` DATE NOT NULL,
    `min_quotations` TINYINT NOT NULL DEFAULT 3,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, sent, closed, awarded, cancelled',
    `notes` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_rfq_no` (`rfq_no`),
    CONSTRAINT `fk_rfq_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_rfq_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rfq_vendor` (
    `rfq_id` BIGINT UNSIGNED NOT NULL,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `sent_at` DATETIME DEFAULT NULL,
    `responded` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`rfq_id`, `vendor_id`),
    CONSTRAINT `fk_rfqv_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfq` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rfqv_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quotation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rfq_id` BIGINT UNSIGNED NOT NULL,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `quotation_no` VARCHAR(50) DEFAULT NULL,
    `quotation_date` DATE NOT NULL,
    `valid_until` DATE DEFAULT NULL,
    `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `delivery_days` SMALLINT DEFAULT NULL,
    `warranty_months` SMALLINT DEFAULT NULL,
    `payment_term_days` SMALLINT DEFAULT NULL,
    `attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `score` DECIMAL(5,2) DEFAULT NULL,
    `is_selected` TINYINT(1) NOT NULL DEFAULT 0,
    `selection_reason` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_quot_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfq` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_quot_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quotation_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `quotation_id` BIGINT UNSIGNED NOT NULL,
    `request_item_id` BIGINT UNSIGNED DEFAULT NULL,
    `model_id` BIGINT UNSIGNED DEFAULT NULL,
    `description` VARCHAR(500) NOT NULL,
    `brand_offered` VARCHAR(100) DEFAULT NULL,
    `quantity` DECIMAL(12,2) NOT NULL,
    `unit_price` DECIMAL(18,2) NOT NULL,
    `tax_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(18,2) NOT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_qitem_quot` FOREIGN KEY (`quotation_id`) REFERENCES `quotation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_qitem_req_item` FOREIGN KEY (`request_item_id`) REFERENCES `request_item` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchase_order` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `po_no` VARCHAR(30) NOT NULL,
    `request_id` BIGINT UNSIGNED DEFAULT NULL,
    `rfq_id` BIGINT UNSIGNED DEFAULT NULL,
    `quotation_id` BIGINT UNSIGNED DEFAULT NULL,
    `vendor_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `funding_source_id` BIGINT UNSIGNED DEFAULT NULL,
    `po_date` DATE NOT NULL,
    `expected_delivery_date` DATE DEFAULT NULL,
    `delivery_location_id` BIGINT UNSIGNED NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'IDR',
    `exchange_rate` DECIMAL(18,6) NOT NULL DEFAULT 1.000000,
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `shipping_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `payment_term_days` SMALLINT DEFAULT 30,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, issued, partially_received, received, closed, cancelled',
    `terms` TEXT DEFAULT NULL,
    `deleted_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    `updated_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_po_no` (`po_no`),
    CONSTRAINT `fk_po_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_po_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfq` (`id`),
    CONSTRAINT `fk_po_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotation` (`id`),
    CONSTRAINT `fk_po_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`),
    CONSTRAINT `fk_po_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_po_funding` FOREIGN KEY (`funding_source_id`) REFERENCES `funding_source` (`id`),
    CONSTRAINT `fk_po_location` FOREIGN KEY (`delivery_location_id`) REFERENCES `location` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchase_order_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `purchase_order_id` BIGINT UNSIGNED NOT NULL,
    `request_item_id` BIGINT UNSIGNED DEFAULT NULL,
    `model_id` BIGINT UNSIGNED NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `quantity` DECIMAL(12,2) NOT NULL,
    `received_qty` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `unit_price` DECIMAL(18,2) NOT NULL,
    `discount_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tax_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(18,2) NOT NULL,
    `warranty_months` SMALLINT DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_po_item_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_po_item_req_item` FOREIGN KEY (`request_item_id`) REFERENCES `request_item` (`id`),
    CONSTRAINT `fk_po_item_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `goods_receipt` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `gr_no` VARCHAR(30) NOT NULL,
    `purchase_order_id` BIGINT UNSIGNED DEFAULT NULL,
    `vendor_id` BIGINT UNSIGNED DEFAULT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `receipt_date` DATE NOT NULL,
    `delivery_note_no` VARCHAR(50) DEFAULT NULL,
    `invoice_no` VARCHAR(50) DEFAULT NULL,
    `invoice_date` DATE DEFAULT NULL,
    `received_by_id` BIGINT UNSIGNED NOT NULL,
    `location_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, posted',
    `vendor_score` TINYINT DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_gr_no` (`gr_no`),
    CONSTRAINT `fk_gr_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order` (`id`),
    CONSTRAINT `fk_gr_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`),
    CONSTRAINT `fk_gr_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_gr_receiver` FOREIGN KEY (`received_by_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_gr_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `goods_receipt_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `goods_receipt_id` BIGINT UNSIGNED NOT NULL,
    `purchase_order_item_id` BIGINT UNSIGNED DEFAULT NULL,
    `model_id` BIGINT UNSIGNED NOT NULL,
    `quantity_received` DECIMAL(12,2) NOT NULL,
    `quantity_accepted` DECIMAL(12,2) NOT NULL,
    `quantity_rejected` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `reject_reason` VARCHAR(255) DEFAULT NULL,
    `unit_cost` DECIMAL(18,2) NOT NULL,
    `serial_numbers` JSON DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_gr_item_gr` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipt` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gr_item_po_item` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_item` (`id`),
    CONSTRAINT `fk_gr_item_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN L: PENYEWAAN EKSTERNAL & KEUANGAN TAGIHAN (9 Tabel)
-- ============================================================================

CREATE TABLE `tax_code` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `tax_kind` VARCHAR(20) NOT NULL DEFAULT 'none' COMMENT 'none, vat, withholding, final',
    `is_inclusive` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_tax_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Unit sekolah yang mendaftarkan penyewa; NULL = bersama',
    `code` VARCHAR(20) NOT NULL,
    `customer_type` VARCHAR(20) NOT NULL DEFAULT 'public' COMMENT 'individual, organization, school, government, alumni, parent',
    `name` VARCHAR(200) NOT NULL,
    `id_type` VARCHAR(20) NOT NULL DEFAULT 'KTP',
    `id_number` VARCHAR(50) NOT NULL,
    `id_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `contact_name` VARCHAR(100) DEFAULT NULL,
    `phone_wa` VARCHAR(20) NOT NULL,
    `email` VARCHAR(150) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `tax_id` VARCHAR(30) DEFAULT NULL,
    `price_group` VARCHAR(20) NOT NULL DEFAULT 'public' COMMENT 'public, alumni, parent, partner, internal',
    `credit_limit` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `is_blacklisted` TINYINT(1) NOT NULL DEFAULT 0,
    `blacklist_reason` VARCHAR(255) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_customer_branch_code` (`branch_id`, `code`),
    CONSTRAINT `fk_customer_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rental_rate` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `model_id` BIGINT UNSIGNED DEFAULT NULL,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `price_group` VARCHAR(20) NOT NULL DEFAULT 'public',
    `rate_unit` VARCHAR(20) NOT NULL DEFAULT 'day' COMMENT 'hour, half_day, day, week, month, event, km',
    `price` DECIMAL(18,2) NOT NULL,
    `min_duration` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    `weekend_surcharge_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `deposit_type` VARCHAR(10) NOT NULL DEFAULT 'pct' COMMENT 'fixed, pct',
    `deposit_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `includes` TEXT DEFAULT NULL,
    `extra_charges` JSON DEFAULT NULL,
    `tax_code_id` BIGINT UNSIGNED DEFAULT NULL,
    `valid_from` DATE NOT NULL,
    `valid_to` DATE DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rate_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_rate_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_rate_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`),
    CONSTRAINT `fk_rate_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_rate_tax` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_code` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rental_order` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(30) NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `request_id` BIGINT UNSIGNED DEFAULT NULL,
    `event_name` VARCHAR(255) NOT NULL,
    `purpose` TEXT DEFAULT NULL,
    `start_at` DATETIME NOT NULL,
    `end_at` DATETIME NOT NULL,
    `setup_start_at` DATETIME DEFAULT NULL,
    `teardown_end_at` DATETIME DEFAULT NULL,
    `delivery_method` VARCHAR(20) NOT NULL DEFAULT 'onsite' COMMENT 'pickup, delivered, onsite',
    `delivery_address` TEXT DEFAULT NULL,
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `extra_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `grand_total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `deposit_required` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `deposit_paid` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `deposit_refunded` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `contract_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'quotation' COMMENT 'quotation, pending_approval, confirmed, ongoing, returned, settled, closed, cancelled, rejected',
    `cancellation_fee` DECIMAL(18,2) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_rental_order_no` (`order_no`),
    KEY `ix_rental_dates` (`start_at`, `end_at`),
    CONSTRAINT `fk_ro_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_ro_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`),
    CONSTRAINT `fk_ro_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rental_order_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rental_order_id` BIGINT UNSIGNED NOT NULL,
    `model_id` BIGINT UNSIGNED DEFAULT NULL,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `driver_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    `rental_rate_id` BIGINT UNSIGNED NOT NULL,
    `duration` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(18,2) NOT NULL,
    `surcharge_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `line_total` DECIMAL(18,2) NOT NULL,
    `allocated_qty` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `returned_qty` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_roi_order` FOREIGN KEY (`rental_order_id`) REFERENCES `rental_order` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_roi_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`),
    CONSTRAINT `fk_roi_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_roi_driver` FOREIGN KEY (`driver_employee_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_roi_rate` FOREIGN KEY (`rental_rate_id`) REFERENCES `rental_rate` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `invoice_no` VARCHAR(30) NOT NULL,
    `direction` VARCHAR(10) NOT NULL DEFAULT 'receivable' COMMENT 'receivable, payable',
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `party_type` VARCHAR(20) NOT NULL COMMENT 'customer, employee, branch, vendor',
    `party_id` BIGINT UNSIGNED NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NOT NULL,
    `ref_type` VARCHAR(30) NOT NULL,
    `ref_id` BIGINT UNSIGNED NOT NULL,
    `subtotal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `withholding_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `balance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `payment_link_url` VARCHAR(255) DEFAULT NULL COMMENT 'URL halaman pembayaran otomatis (#9)',
    `va_number` VARCHAR(50) DEFAULT NULL COMMENT 'Nomor Virtual Account (#9)',
    `qris_payload` TEXT DEFAULT NULL COMMENT 'String QRIS Dinamis (#9)',
    `gateway_reference` VARCHAR(100) DEFAULT NULL COMMENT 'ID referensi Payment Gateway (#9)',
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, issued, partially_paid, paid, void',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_invoice_no` (`invoice_no`),
    KEY `ix_invoice_party` (`party_type`, `party_id`),
    CONSTRAINT `fk_invoice_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_line` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `invoice_id` BIGINT UNSIGNED NOT NULL,
    `line_type` VARCHAR(20) NOT NULL COMMENT 'rental, extra, late_fee, damage, loss, cleaning, cancellation, goods, service, discount',
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(18,2) NOT NULL,
    `tax_code_id` BIGINT UNSIGNED DEFAULT NULL,
    `amount` DECIMAL(18,2) NOT NULL,
    `ref_type` VARCHAR(30) DEFAULT NULL,
    `ref_id` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_inv_line_inv` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inv_line_tax` FOREIGN KEY (`tax_code_id`) REFERENCES `tax_code` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `payment_no` VARCHAR(30) NOT NULL,
    `direction` VARCHAR(10) NOT NULL DEFAULT 'in' COMMENT 'in, out',
    `invoice_id` BIGINT UNSIGNED NOT NULL,
    `payment_date` DATE NOT NULL,
    `method` VARCHAR(25) NOT NULL COMMENT 'cash, bank_transfer, qris, virtual_account, payroll_deduction, deposit_offset',
    `amount` DECIMAL(18,2) NOT NULL,
    `bank_account` VARCHAR(50) DEFAULT NULL,
    `reference_no` VARCHAR(100) DEFAULT NULL,
    `gateway_provider` VARCHAR(30) DEFAULT NULL COMMENT 'midtrans, xendit, flip, bank_va (#9)',
    `gateway_trx_id` VARCHAR(100) DEFAULT NULL COMMENT 'ID transaksi dari webhook gateway (#9)',
    `webhook_payload` JSON DEFAULT NULL COMMENT 'Raw payload pelunasan otomatis (#9)',
    `webhook_at` DATETIME DEFAULT NULL COMMENT 'Waktu pelunasan otomatis webhook (#9)',
    `proof_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `verified_by` BIGINT UNSIGNED DEFAULT NULL,
    `verified_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payment_no` (`payment_no`),
    CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`),
    CONSTRAINT `fk_payment_verifier` FOREIGN KEY (`verified_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deposit_transaction` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `rental_order_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(20) NOT NULL COMMENT 'received, offset, refund, forfeit',
    `amount` DECIMAL(18,2) NOT NULL,
    `payment_id` BIGINT UNSIGNED DEFAULT NULL,
    `note` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_dep_trx_order` FOREIGN KEY (`rental_order_id`) REFERENCES `rental_order` (`id`),
    CONSTRAINT `fk_dep_trx_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN F: PENGGUNAAN, PEMINJAMAN & MUTASI (4 Tabel)
-- ============================================================================

CREATE TABLE `assignment` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `assignment_no` VARCHAR(30) NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `assignment_type` VARCHAR(20) NOT NULL COMMENT 'permanent, loan, location, rental',
    `borrower_type` VARCHAR(20) NOT NULL DEFAULT 'employee' COMMENT 'employee, branch, student, customer',
    `employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `borrower_branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `customer_id` BIGINT UNSIGNED DEFAULT NULL,
    `rental_order_item_id` BIGINT UNSIGNED DEFAULT NULL,
    `location_id` BIGINT UNSIGNED NOT NULL,
    `request_id` BIGINT UNSIGNED DEFAULT NULL,
    `loan_rule_id` BIGINT UNSIGNED DEFAULT NULL,
    `start_at` DATETIME NOT NULL,
    `due_at` DATETIME DEFAULT NULL,
    `extension_count` TINYINT NOT NULL DEFAULT 0,
    `condition_out` VARCHAR(20) NOT NULL DEFAULT 'good',
    `condition_out_note` VARCHAR(500) DEFAULT NULL,
    `meter_out` DECIMAL(12,2) DEFAULT NULL,
    `checkout_checklist` JSON DEFAULT NULL,
    `checkout_photos` JSON DEFAULT NULL,
    `handed_over_by_id` BIGINT UNSIGNED NOT NULL,
    `employee_signature_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT 'active, overdue, returned, lost',
    `returned_at` DATETIME DEFAULT NULL,
    `received_back_by_id` BIGINT UNSIGNED DEFAULT NULL,
    `condition_in` VARCHAR(20) DEFAULT NULL,
    `condition_in_note` VARCHAR(500) DEFAULT NULL,
    `meter_in` DECIMAL(12,2) DEFAULT NULL,
    `checkin_checklist` JSON DEFAULT NULL,
    `checkin_photos` JSON DEFAULT NULL,
    `return_location_id` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_assignment_no` (`assignment_no`),
    KEY `ix_asg_asset_status` (`asset_id`, `status`),
    KEY `ix_asg_due` (`due_at`, `status`),
    CONSTRAINT `fk_asg_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_asg_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_asg_borrower_branch` FOREIGN KEY (`borrower_branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_asg_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`),
    CONSTRAINT `fk_asg_roi` FOREIGN KEY (`rental_order_item_id`) REFERENCES `rental_order_item` (`id`),
    CONSTRAINT `fk_asg_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`),
    CONSTRAINT `fk_asg_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_asg_loan_rule` FOREIGN KEY (`loan_rule_id`) REFERENCES `loan_rule` (`id`),
    CONSTRAINT `fk_asg_handover` FOREIGN KEY (`handed_over_by_id`) REFERENCES `employee` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reservation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `reservation_no` VARCHAR(30) NOT NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `model_id` BIGINT UNSIGNED DEFAULT NULL,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `start_at` DATETIME NOT NULL,
    `end_at` DATETIME NOT NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'booked' COMMENT 'booked, checked_out, cancelled, no_show',
    `assignment_id` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_reservation_no` (`reservation_no`),
    KEY `ix_rsv_asset_dates` (`asset_id`, `start_at`, `end_at`),
    CONSTRAINT `fk_rsv_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_rsv_model` FOREIGN KEY (`model_id`) REFERENCES `asset_model` (`id`),
    CONSTRAINT `fk_rsv_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_rsv_assignment` FOREIGN KEY (`assignment_id`) REFERENCES `assignment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mutation` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mutation_no` VARCHAR(30) NOT NULL,
    `mutation_type` VARCHAR(20) NOT NULL COMMENT 'location, department, branch',
    `request_id` BIGINT UNSIGNED DEFAULT NULL,
    `from_branch_id` BIGINT UNSIGNED NOT NULL,
    `to_branch_id` BIGINT UNSIGNED NOT NULL,
    `to_department_id` BIGINT UNSIGNED DEFAULT NULL,
    `to_location_id` BIGINT UNSIGNED NOT NULL,
    `mutation_date` DATE NOT NULL,
    `shipped_at` DATETIME DEFAULT NULL,
    `received_at` DATETIME DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, in_transit, completed, cancelled',
    `notes` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_mutation_no` (`mutation_no`),
    CONSTRAINT `fk_mut_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_mut_from_branch` FOREIGN KEY (`from_branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_mut_to_branch` FOREIGN KEY (`to_branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_mut_to_dept` FOREIGN KEY (`to_department_id`) REFERENCES `department` (`id`),
    CONSTRAINT `fk_mut_to_loc` FOREIGN KEY (`to_location_id`) REFERENCES `location` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mutation_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `mutation_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `from_location_id` BIGINT UNSIGNED NOT NULL,
    `from_department_id` BIGINT UNSIGNED NOT NULL,
    `condition_sent` VARCHAR(20) NOT NULL DEFAULT 'good',
    `condition_received` VARCHAR(20) DEFAULT NULL,
    `notes` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_mut_item_mut` FOREIGN KEY (`mutation_id`) REFERENCES `mutation` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_mut_item_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN G: PERAWATAN (3 Tabel)
-- ============================================================================

CREATE TABLE `maintenance_plan` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL COMMENT 'Jadwal perawatan mandiri per unit; NULL = standar yayasan',
    `name` VARCHAR(150) NOT NULL,
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `trigger_type` VARCHAR(20) NOT NULL DEFAULT 'time' COMMENT 'time, meter, time_or_meter',
    `interval_days` SMALLINT DEFAULT NULL,
    `interval_meter` DECIMAL(12,2) DEFAULT NULL,
    `lead_days` SMALLINT NOT NULL DEFAULT 7,
    `default_vendor_id` BIGINT UNSIGNED DEFAULT NULL,
    `checklist` JSON DEFAULT NULL,
    `estimated_cost` DECIMAL(18,2) DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_mplan_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_mplan_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`),
    CONSTRAINT `fk_mplan_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_mplan_vendor` FOREIGN KEY (`default_vendor_id`) REFERENCES `vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `work_order` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `wo_no` VARCHAR(30) NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `wo_type` VARCHAR(20) NOT NULL COMMENT 'preventive, corrective, inspection, upgrade, calibration',
    `maintenance_plan_id` BIGINT UNSIGNED DEFAULT NULL,
    `request_id` BIGINT UNSIGNED DEFAULT NULL,
    `reported_by_id` BIGINT UNSIGNED DEFAULT NULL,
    `problem_description` TEXT DEFAULT NULL,
    `priority` VARCHAR(10) NOT NULL DEFAULT 'normal',
    `executor_type` VARCHAR(20) NOT NULL DEFAULT 'internal' COMMENT 'internal, vendor, warranty',
    `technician_id` BIGINT UNSIGNED DEFAULT NULL,
    `vendor_id` BIGINT UNSIGNED DEFAULT NULL,
    `scheduled_date` DATE NOT NULL,
    `started_at` DATETIME DEFAULT NULL,
    `completed_at` DATETIME DEFAULT NULL,
    `downtime_hours` DECIMAL(8,2) DEFAULT NULL,
    `action_taken` TEXT DEFAULT NULL,
    `checklist_result` JSON DEFAULT NULL,
    `meter_reading` DECIMAL(12,2) DEFAULT NULL,
    `result` VARCHAR(20) DEFAULT NULL COMMENT 'fixed, partially_fixed, not_repairable',
    `condition_after` VARCHAR(20) DEFAULT NULL,
    `total_cost` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `is_capitalized` TINYINT(1) NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'open, scheduled, in_progress, on_hold, completed, cancelled',
    `previous_status_id` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_wo_no` (`wo_no`),
    KEY `ix_wo_asset_status` (`asset_id`, `status`),
    CONSTRAINT `fk_wo_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_wo_plan` FOREIGN KEY (`maintenance_plan_id`) REFERENCES `maintenance_plan` (`id`),
    CONSTRAINT `fk_wo_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_wo_reporter` FOREIGN KEY (`reported_by_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_wo_tech` FOREIGN KEY (`technician_id`) REFERENCES `employee` (`id`),
    CONSTRAINT `fk_wo_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `work_order_cost` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `work_order_id` BIGINT UNSIGNED NOT NULL,
    `cost_type` VARCHAR(20) NOT NULL COMMENT 'labor, part, service_fee, transport, other',
    `description` VARCHAR(255) NOT NULL,
    `quantity` DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    `unit_cost` DECIMAL(18,2) NOT NULL,
    `total` DECIMAL(18,2) NOT NULL,
    `invoice_no` VARCHAR(50) DEFAULT NULL,
    `attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_woc_wo` FOREIGN KEY (`work_order_id`) REFERENCES `work_order` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN H: STOCK OPNAME TERJADWAL (3 Tabel)
-- ============================================================================

CREATE TABLE `opname_schedule` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `legal_entity_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `mode` VARCHAR(20) NOT NULL DEFAULT 'full' COMMENT 'full, cycle',
    `frequency_per_year` TINYINT NOT NULL DEFAULT 3,
    `run_months` JSON NOT NULL,
    `run_day` TINYINT NOT NULL DEFAULT 1,
    `duration_days` TINYINT NOT NULL DEFAULT 14,
    `scope_template` JSON DEFAULT NULL,
    `lock_mutations` TINYINT(1) NOT NULL DEFAULT 1,
    `team_employee_ids` JSON DEFAULT NULL,
    `create_days_before` TINYINT NOT NULL DEFAULT 7,
    `require_photo` TINYINT(1) NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_opsch_entity` FOREIGN KEY (`legal_entity_id`) REFERENCES `legal_entity` (`id`),
    CONSTRAINT `fk_opsch_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stock_opname` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `opname_no` VARCHAR(30) NOT NULL,
    `opname_schedule_id` BIGINT UNSIGNED DEFAULT NULL,
    `cycle_index` TINYINT DEFAULT NULL,
    `name` VARCHAR(150) NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `scope` JSON NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, in_progress, reconciling, closed',
    `total_expected` INT NOT NULL DEFAULT 0,
    `total_found` INT NOT NULL DEFAULT 0,
    `total_missing` INT NOT NULL DEFAULT 0,
    `total_misplaced` INT NOT NULL DEFAULT 0,
    `total_unregistered` INT NOT NULL DEFAULT 0,
    `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
    `closed_by_id` BIGINT UNSIGNED DEFAULT NULL,
    `closed_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_opname_no` (`opname_no`),
    CONSTRAINT `fk_so_schedule` FOREIGN KEY (`opname_schedule_id`) REFERENCES `opname_schedule` (`id`),
    CONSTRAINT `fk_so_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stock_opname_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `stock_opname_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED DEFAULT NULL,
    `expected_location_id` BIGINT UNSIGNED DEFAULT NULL,
    `expected_holder_id` BIGINT UNSIGNED DEFAULT NULL,
    `found_location_id` BIGINT UNSIGNED DEFAULT NULL,
    `scan_result` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending, found, on_loan, misplaced, missing, unregistered',
    `condition_found` VARCHAR(20) DEFAULT NULL,
    `scan_method` VARCHAR(15) NOT NULL DEFAULT 'qr' COMMENT 'qr, nfc, rfid, manual (#3)',
    `scan_latitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'Koordinat GPS saat scan (#6)',
    `scan_longitude` DECIMAL(10,7) DEFAULT NULL COMMENT 'Koordinat GPS saat scan (#6)',
    `is_geofence_valid` TINYINT(1) DEFAULT NULL COMMENT '1 = dalam radius sekolah, 0 = di luar radius (#6)',
    `offline_queued_at` DATETIME DEFAULT NULL COMMENT 'Waktu scan di IndexedDB PWA saat tanpa sinyal (#1)',
    `scanned_by_id` BIGINT UNSIGNED DEFAULT NULL,
    `scanned_at` DATETIME DEFAULT NULL,
    `photo_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `unregistered_description` VARCHAR(255) DEFAULT NULL,
    `follow_up` VARCHAR(20) DEFAULT 'none' COMMENT 'none, mutation, work_order, investigation, disposal, register',
    `follow_up_ref_id` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_so_item_asset` (`stock_opname_id`, `asset_id`),
    CONSTRAINT `fk_soi_so` FOREIGN KEY (`stock_opname_id`) REFERENCES `stock_opname` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_soi_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN I: PENYUSUTAN DUA BUKU & DENDA KUSTOM (5 Tabel)
-- ============================================================================

CREATE TABLE `depreciation_run` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `period` CHAR(7) NOT NULL COMMENT 'YYYY-MM',
    `book` VARCHAR(20) NOT NULL DEFAULT 'commercial' COMMENT 'commercial, fiscal',
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, posted',
    `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `asset_count` INT NOT NULL DEFAULT 0,
    `posted_at` DATETIME DEFAULT NULL,
    `posted_by` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_dep_run` (`period`, `book`, `branch_id`),
    CONSTRAINT `fk_dep_run_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `depreciation_entry` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `depreciation_run_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `opening_book_value` DECIMAL(18,2) NOT NULL,
    `depreciation_amount` DECIMAL(18,2) NOT NULL,
    `accumulated_after` DECIMAL(18,2) NOT NULL,
    `closing_book_value` DECIMAL(18,2) NOT NULL,
    `department_id` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_dep_entry` (`depreciation_run_id`, `asset_id`),
    CONSTRAINT `fk_dep_entry_run` FOREIGN KEY (`depreciation_run_id`) REFERENCES `depreciation_run` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dep_entry_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_value_adjustment` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `adjustment_type` VARCHAR(20) NOT NULL COMMENT 'capitalization, cip_cost, revaluation, impairment, correction',
    `adjustment_date` DATE NOT NULL,
    `amount` DECIMAL(18,2) NOT NULL,
    `new_useful_life_months` SMALLINT DEFAULT NULL,
    `ref_type` VARCHAR(30) DEFAULT NULL,
    `ref_id` BIGINT UNSIGNED DEFAULT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft, approved',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_ava_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `charge_policy` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `charge_type` VARCHAR(20) NOT NULL COMMENT 'late, damage_minor, damage_major, loss, cleaning, cancellation, admin',
    `borrower_types` JSON NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `category_id` BIGINT UNSIGNED DEFAULT NULL,
    `calc_method` VARCHAR(30) NOT NULL COMMENT 'fixed, fixed_per_day, pct_of_rate_per_unit, pct_of_book_value, pct_of_replacement_cost, actual_repair_cost, pct_of_order',
    `value` DECIMAL(18,4) NOT NULL DEFAULT 0.0000,
    `grace_minutes` INT NOT NULL DEFAULT 0,
    `min_amount` DECIMAL(18,2) DEFAULT NULL,
    `max_amount` DECIMAL(18,2) DEFAULT NULL,
    `cancel_days_before` SMALLINT DEFAULT NULL,
    `auto_offset_deposit` TINYINT(1) NOT NULL DEFAULT 1,
    `priority` SMALLINT NOT NULL DEFAULT 100,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_cpol_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_cpol_category` FOREIGN KEY (`category_id`) REFERENCES `asset_category` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `charge` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `charge_no` VARCHAR(30) NOT NULL,
    `party_type` VARCHAR(20) NOT NULL COMMENT 'employee, customer, branch, student',
    `party_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `charge_policy_id` BIGINT UNSIGNED NOT NULL,
    `ref_type` VARCHAR(30) NOT NULL,
    `ref_id` BIGINT UNSIGNED NOT NULL,
    `calculation` JSON NOT NULL,
    `amount` DECIMAL(18,2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'open' COMMENT 'open, invoiced, paid, offset, payroll_deducted, waived',
    `invoice_id` BIGINT UNSIGNED DEFAULT NULL,
    `settled_at` DATE DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_charge_no` (`charge_no`),
    KEY `ix_charge_party_status` (`party_type`, `party_id`, `status`),
    CONSTRAINT `fk_charge_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`),
    CONSTRAINT `fk_charge_policy` FOREIGN KEY (`charge_policy_id`) REFERENCES `charge_policy` (`id`),
    CONSTRAINT `fk_charge_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN J: PENGHAPUSAN (2 Tabel)
-- ============================================================================

CREATE TABLE `disposal` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `disposal_no` VARCHAR(30) NOT NULL,
    `request_id` BIGINT UNSIGNED NOT NULL,
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `proposed_date` DATE NOT NULL,
    `assessment_team` JSON NOT NULL,
    `assessment_date` DATE DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'proposed' COMMENT 'proposed, assessed, approved, executed, closed, rejected',
    `executed_date` DATE DEFAULT NULL,
    `ba_no` VARCHAR(50) DEFAULT NULL,
    `ba_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    `total_book_value` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `total_proceeds` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `total_gain_loss` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_disposal_no` (`disposal_no`),
    CONSTRAINT `fk_disposal_request` FOREIGN KEY (`request_id`) REFERENCES `request` (`id`),
    CONSTRAINT `fk_disposal_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `disposal_item` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `disposal_id` BIGINT UNSIGNED NOT NULL,
    `asset_id` BIGINT UNSIGNED NOT NULL,
    `reason_code` VARCHAR(20) NOT NULL COMMENT 'obsolete, beyond_repair, lost, stolen, end_of_life, replaced, surplus, force_majeure',
    `reason_detail` TEXT NOT NULL,
    `condition` VARCHAR(20) NOT NULL,
    `method` VARCHAR(20) NOT NULL COMMENT 'auction, sale_to_employee, grant, scrap, trade_in, return_to_lessor, write_off',
    `book_value_at_disposal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `fiscal_book_value_at_disposal` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `appraised_value` DECIMAL(18,2) DEFAULT NULL,
    `proceeds` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `gain_loss` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `fiscal_gain_loss` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `recipient` VARCHAR(200) DEFAULT NULL,
    `data_wiped` TINYINT(1) NOT NULL DEFAULT 0,
    `evidence_attachment_id` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_disp_item_disp` FOREIGN KEY (`disposal_id`) REFERENCES `disposal` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_disp_item_asset` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DOMAIN K: SISTEM, NOTIFIKASI & MIGRASI (12 Tabel)
-- ============================================================================

CREATE TABLE `number_sequence` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `doc_type` VARCHAR(20) NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `period` VARCHAR(10) NOT NULL,
    `prefix_pattern` VARCHAR(100) NOT NULL,
    `last_number` INT NOT NULL DEFAULT 0,
    `padding` TINYINT NOT NULL DEFAULT 4,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_num_seq` (`doc_type`, `branch_id`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `attachment` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `stored_path` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `ref_type` VARCHAR(30) DEFAULT NULL,
    `ref_id` BIGINT UNSIGNED DEFAULT NULL,
    `category` VARCHAR(20) NOT NULL DEFAULT 'other',
    `geo_lat` DECIMAL(10,7) DEFAULT NULL COMMENT 'GPS latitude pada watermark foto (#6)',
    `geo_lng` DECIMAL(10,7) DEFAULT NULL COMMENT 'GPS longitude pada watermark foto (#6)',
    `captured_at` DATETIME DEFAULT NULL COMMENT 'Waktu jepret kamera langsung (#6)',
    `ocr_extracted_json` JSON DEFAULT NULL COMMENT 'Hasil ekstraksi teks AI OCR faktur/nota/SN (#2)',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `ix_attachment_ref` (`ref_type`, `ref_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_signature` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `verification_token` CHAR(36) NOT NULL COMMENT 'UUID v4 untuk QR Code verifikasi publik (#10)',
    `branch_id` BIGINT UNSIGNED NOT NULL,
    `doc_template_code` VARCHAR(30) NOT NULL,
    `ref_type` VARCHAR(30) NOT NULL,
    `ref_id` BIGINT UNSIGNED NOT NULL,
    `document_no` VARCHAR(50) NOT NULL,
    `pdf_attachment_id` BIGINT UNSIGNED NOT NULL,
    `sha256_hash` CHAR(64) NOT NULL,
    `signers_json` JSON NOT NULL,
    `is_revoked` TINYINT(1) NOT NULL DEFAULT 0,
    `revoked_reason` VARCHAR(255) DEFAULT NULL,
    `signed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_doc_sig_token` (`verification_token`),
    KEY `ix_doc_sig_ref` (`ref_type`, `ref_id`),
    KEY `ix_doc_sig_no` (`document_no`),
    CONSTRAINT `fk_doc_sig_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`),
    CONSTRAINT `fk_doc_sig_pdf` FOREIGN KEY (`pdf_attachment_id`) REFERENCES `attachment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_template` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `html_body` LONGTEXT NOT NULL,
    `paper_size` VARCHAR(10) NOT NULL DEFAULT 'A4',
    `orientation` VARCHAR(10) NOT NULL DEFAULT 'portrait',
    `version` SMALLINT NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_doc_template_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_channel_config` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `channel` VARCHAR(10) NOT NULL COMMENT 'wa, email',
    `provider` VARCHAR(20) NOT NULL COMMENT 'fonnte, wablas, wa_cloud_api, smtp, mailgun',
    `sender` VARCHAR(150) NOT NULL,
    `credentials` TEXT NOT NULL,
    `daily_limit` INT NOT NULL DEFAULT 1000,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_ncc_branch` FOREIGN KEY (`branch_id`) REFERENCES `branch` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_template` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(10) NOT NULL COMMENT 'wa, email, inapp',
    `subject` VARCHAR(200) DEFAULT NULL,
    `body` TEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_notif_tpl` (`code`, `channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_rule` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `event_code` VARCHAR(50) NOT NULL,
    `channels` JSON NOT NULL,
    `recipients` JSON NOT NULL,
    `offset_minutes` INT NOT NULL DEFAULT 0,
    `repeat_every_minutes` INT DEFAULT NULL,
    `max_repeats` TINYINT NOT NULL DEFAULT 1,
    `fallback_to_email` TINYINT(1) NOT NULL DEFAULT 1,
    `template_code` VARCHAR(50) NOT NULL,
    `quiet_hours` VARCHAR(20) DEFAULT '21:00-06:00',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_notification_preference` (
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `event_code` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(10) NOT NULL,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`employee_id`, `event_code`, `channel`),
    CONSTRAINT `fk_unp_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_code` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(10) NOT NULL,
    `recipient_employee_id` BIGINT UNSIGNED DEFAULT NULL,
    `recipient_address` VARCHAR(150) NOT NULL,
    `payload` JSON DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'queued' COMMENT 'queued, sent, failed',
    `attempts` TINYINT NOT NULL DEFAULT 0,
    `sent_at` DATETIME DEFAULT NULL,
    `error_message` VARCHAR(500) DEFAULT NULL,
    `ref_type` VARCHAR(30) DEFAULT NULL,
    `ref_id` BIGINT UNSIGNED DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_notif_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `import_batch` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `batch_no` VARCHAR(30) NOT NULL,
    `import_type` VARCHAR(30) NOT NULL,
    `branch_id` BIGINT UNSIGNED DEFAULT NULL,
    `file_attachment_id` BIGINT UNSIGNED NOT NULL,
    `total_rows` INT NOT NULL DEFAULT 0,
    `valid_rows` INT NOT NULL DEFAULT 0,
    `error_rows` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'uploaded' COMMENT 'uploaded, validated, committed, rolled_back',
    `committed_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_import_batch_no` (`batch_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `import_row` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `batch_id` BIGINT UNSIGNED NOT NULL,
    `row_no` INT NOT NULL,
    `raw_data` JSON NOT NULL,
    `mapped_data` JSON DEFAULT NULL,
    `errors` JSON DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'valid' COMMENT 'valid, error, imported',
    `created_entity_id` BIGINT UNSIGNED DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_import_row_batch` FOREIGN KEY (`batch_id`) REFERENCES `import_batch` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED DEFAULT NULL,
    `action` VARCHAR(30) NOT NULL,
    `entity` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT UNSIGNED DEFAULT NULL,
    `old_values` JSON DEFAULT NULL,
    `new_values` JSON DEFAULT NULL,
    `ip_address` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ix_audit_entity` (`entity`, `entity_id`),
    KEY `ix_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `setting` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT DEFAULT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'string',
    `group` VARCHAR(50) NOT NULL DEFAULT 'general',
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_setting_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATA AWAL (SEED DATA)
-- ============================================================================

INSERT INTO `asset_status` (`code`, `name`, `color`, `can_assign`, `can_loan`, `include_in_opname`, `include_in_depreciation`, `is_final`, `is_system`) VALUES
('DRF', 'Draf',              '#9CA3AF', 0, 0, 0, 0, 0, 1),
('CIP', 'Dalam Pengerjaan',  '#6366F1', 0, 0, 0, 0, 0, 1),
('AVL', 'Tersedia',          '#16A34A', 1, 1, 1, 1, 0, 1),
('ASG', 'Digunakan',         '#2563EB', 0, 0, 1, 1, 0, 1),
('LON', 'Dipinjam',          '#0D9488', 0, 0, 1, 1, 0, 1),
('RNT', 'Disewakan',         '#7C3AED', 0, 0, 1, 1, 0, 1),
('TRN', 'Dalam Pengiriman',  '#D97706', 0, 0, 0, 1, 0, 1),
('MNT', 'Dalam Perawatan',   '#EA580C', 0, 0, 1, 1, 0, 1),
('BRK', 'Rusak',             '#DC2626', 0, 0, 1, 1, 0, 1),
('LST', 'Hilang',            '#991B1B', 0, 0, 0, 1, 0, 1),
('DSP', 'Diusulkan Hapus',   '#4B5563', 0, 0, 1, 0, 0, 1),
('WRO', 'Dihapus',           '#1F2937', 0, 0, 0, 0, 1, 1);

INSERT INTO `fiscal_group` (`code`, `name`, `useful_life_years`, `straight_line_rate`, `declining_rate`) VALUES
('KEL1', 'Bukan Bangunan - Kelompok 1', 4,  25.00, 50.00),
('KEL2', 'Bukan Bangunan - Kelompok 2', 8,  12.50, 25.00),
('KEL3', 'Bukan Bangunan - Kelompok 3', 16,  6.25, 12.50),
('KEL4', 'Bukan Bangunan - Kelompok 4', 20,  5.00, 10.00),
('BP',   'Bangunan Permanen',           20,  5.00, NULL),
('BTP',  'Bangunan Tidak Permanen',     10, 10.00, NULL);

INSERT INTO `funding_source` (`code`, `name`, `is_restricted`, `can_be_rented`, `can_be_disposed_by_foundation`, `requires_external_report`) VALUES
('YYS',       'Dana Yayasan',                0, 1, 1, 0),
('SPP',       'Dana Operasional / SPP',      0, 1, 1, 0),
('BOS',       'Dana BOS Reguler',            1, 0, 0, 1),
('BOSDA',     'Dana BOS Daerah',             1, 0, 0, 1),
('BOP',       'Dana BOP PAUD',               1, 0, 0, 1),
('KOMITE',    'Dana Komite / Orang Tua',     0, 1, 1, 1),
('HIBAH_PEM', 'Hibah Pemerintah',            1, 0, 0, 1),
('HIBAH_SWT', 'Hibah Swasta / CSR / Alumni', 0, 1, 1, 0),
('SEWA',      'Hasil Sewa Aset',             0, 1, 1, 0);

INSERT INTO `tax_code` (`code`, `name`, `rate`, `tax_kind`, `is_inclusive`) VALUES
('NONE',                'Tanpa Pajak',                       0.00, 'none',        0),
('PPN',                 'PPN',                              11.00, 'vat',         0),
('PPH42_SEWA_BANGUNAN', 'PPh Final Pasal 4(2) Sewa Gedung', 10.00, 'final',       0),
('PPH23_SEWA',          'PPh Pasal 23 Sewa Harta',           2.00, 'withholding', 0);

INSERT INTO `uom` (`code`, `name`) VALUES
('UNIT', 'Unit'), ('SET', 'Set'), ('PCS', 'Buah'), ('PAKET', 'Paket'), ('M2', 'Meter Persegi'), ('LISENSI', 'Lisensi');

INSERT INTO `role` (`code`, `name`, `description`) VALUES
('SUPER_ADMIN',    'Super Admin Yayasan',      'Akses penuh ke seluruh unit dan pengaturan sistem'),
('FOUNDATION_FIN', 'Bendahara Yayasan',        'Keuangan yayasan, penyusutan, anggaran, approval lintas unit'),
('FOUNDATION_HDR', 'Pengurus / Ketua Yayasan', 'Approval strategis dan dashboard eksekutif 12 unit'),
('BRANCH_HEAD',    'Kepala Sekolah / Unit',    'Pimpinan unit pendidikan & approver tingkat unit'),
('ASSET_MANAGER',  'Wakasek / Koord. Sarpras', 'Pengelola aset, opname, sewa, dan perawatan tingkat unit'),
('ASSET_STAFF',    'Petugas Sarpras / Gudang', 'Operasional serah terima, label, dan scan opname'),
('PROCUREMENT',    'Tim Pengadaan',            'RFQ, perbandingan vendor, dan PO'),
('TECHNICIAN',     'Teknisi Pemeliharaan',     'Pelaksana Work Order perawatan dan perbaikan'),
('FINANCE_UNIT',   'Bendahara Unit / BOS',     'Verifikasi pembayaran sewa, denda, dan pelaporan dana unit'),
('EMPLOYEE',       'Guru / Staf',              'Portal mandiri: aset saya, pengajuan, peminjaman, lapor rusak'),
('AUDITOR',        'Auditor Internal',         'Akses baca seluruh data dan audit trail');

INSERT INTO `setting` (`key`, `value`, `type`, `group`) VALUES
('capitalization_threshold',      '1000000',                    'number', 'finance'),
('depreciation_cutoff_day',       '15',                         'number', 'finance'),
('work_days',                     '1,2,3,4,5,6',                'string', 'general'),
('overdue_block_days',            '7',                          'number', 'circulation'),
('charge_block_days',             '14',                         'number', 'circulation'),
('rental_internal_priority_days', '14',                         'number', 'rental'),
('rfq_required_above',            '5000000',                    'number', 'procurement'),
('opname_min_per_year',           '3',                          'number', 'opname'),
('asset_tag_pattern',             '{BR}-{SUB}-{YYYY}-{SEQ5}',   'string', 'numbering'),
('wa_gateway_provider',           'fonnte',                     'string', 'notification');

SET FOREIGN_KEY_CHECKS = 1;
