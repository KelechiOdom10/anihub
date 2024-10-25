PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_anihub_oauth_accounts` (
	`user_id` text(21) NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text(255) NOT NULL,
	PRIMARY KEY(`provider`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_anihub_oauth_accounts`("user_id", "provider", "provider_user_id") SELECT "user_id", "provider", "provider_user_id" FROM `anihub_oauth_accounts`;--> statement-breakpoint
DROP TABLE `anihub_oauth_accounts`;--> statement-breakpoint
ALTER TABLE `__new_anihub_oauth_accounts` RENAME TO `anihub_oauth_accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `user_idx` ON `anihub_oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `provider_idx` ON `anihub_oauth_accounts` (`provider`);--> statement-breakpoint
CREATE INDEX `provider_user_id_idx` ON `anihub_oauth_accounts` (`provider_user_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `anihub_email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `anihub_email_verification_codes` (`email`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `anihub_password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `anihub_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `anihub_users` (`email`);