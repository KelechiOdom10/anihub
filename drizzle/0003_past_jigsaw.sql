PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_anihub_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text(255) NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`hashed_password` text(255),
	`username` text(255),
	`avatar` text(255),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_anihub_users`("id", "email", "email_verified", "hashed_password", "username", "avatar", "created_at", "updated_at") SELECT "id", "email", "email_verified", "hashed_password", "username", "avatar", "created_at", "updated_at" FROM `anihub_users`;--> statement-breakpoint
DROP TABLE `anihub_users`;--> statement-breakpoint
ALTER TABLE `__new_anihub_users` RENAME TO `anihub_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_email_unique` ON `anihub_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_username_unique` ON `anihub_users` (`username`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `anihub_users` (`email`);