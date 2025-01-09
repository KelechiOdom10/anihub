CREATE TABLE `anihub_collection_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`anime_id` integer NOT NULL,
	`anime_image` text(255),
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `anihub_collections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_items_collection_idx` ON `anihub_collection_items` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_items_anime_idx` ON `anihub_collection_items` (`anime_id`);--> statement-breakpoint
CREATE INDEX `unique_anime_in_collection` ON `anihub_collection_items` (`collection_id`,`anime_id`);--> statement-breakpoint
CREATE TABLE `anihub_collection_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`collection_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`collection_id`) REFERENCES `anihub_collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collection_likes_collection_idx` ON `anihub_collection_likes` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_likes_user_idx` ON `anihub_collection_likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_collection_like` ON `anihub_collection_likes` (`collection_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `anihub_collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`user_id` integer NOT NULL,
	`is_public` integer DEFAULT true NOT NULL,
	`likes_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collections_user_idx` ON `anihub_collections` (`user_id`);--> statement-breakpoint
CREATE INDEX `collections_name_idx` ON `anihub_collections` (`name`);