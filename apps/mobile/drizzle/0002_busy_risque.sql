CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text DEFAULT 'card' NOT NULL,
	`op` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
