CREATE TABLE `anihub_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`rating` integer NOT NULL,
	`is_spoiler` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	`anime_id` integer NOT NULL,
	`parent_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `anihub_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_user_idx` ON `anihub_comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `comments_anime_idx` ON `anihub_comments` (`anime_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `anihub_comments` (`parent_id`);