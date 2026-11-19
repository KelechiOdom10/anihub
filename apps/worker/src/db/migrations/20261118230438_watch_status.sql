CREATE TABLE `watch_statuses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mal_id` integer NOT NULL,
	`status` text NOT NULL,
	`anime_image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_statuses_user_anime` ON `watch_statuses` (`user_id`,`mal_id`);--> statement-breakpoint
CREATE INDEX `watch_statuses_user_status_idx` ON `watch_statuses` (`user_id`,`status`,`updated_at`);