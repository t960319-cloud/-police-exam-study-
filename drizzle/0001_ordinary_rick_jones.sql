CREATE TABLE `legal_content_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_kind` text NOT NULL,
	`event_payload` text NOT NULL,
	`created_at` integer NOT NULL
);
