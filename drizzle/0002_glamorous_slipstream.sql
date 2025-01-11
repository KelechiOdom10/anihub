ALTER TABLE `anihub_users` ADD `username` text(255);--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_username_unique` ON `anihub_users` (`username`);