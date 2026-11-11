CREATE TABLE `study_record_versions` (
	`user_id` text NOT NULL,
	`record_key` text NOT NULL,
	`record_value` text NOT NULL,
	`updated_at` integer NOT NULL,
	`saved_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `record_key`, `updated_at`)
);
