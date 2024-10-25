CREATE TABLE `anihub_email_verification_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`email` text(255) NOT NULL,
	`code` text(8) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_email_verification_codes_user_id_unique` ON `anihub_email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_codes_code_idx` ON `anihub_email_verification_codes` (`code`);--> statement-breakpoint
CREATE TABLE `anihub_oauth_accounts` (
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text(255) NOT NULL,
	PRIMARY KEY(`provider`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `anihub_oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_provider_idx` ON `anihub_oauth_accounts` (`provider`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_provider_user_id_idx` ON `anihub_oauth_accounts` (`provider_user_id`);--> statement-breakpoint
CREATE TABLE `anihub_password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reset_tokens_user_idx` ON `anihub_password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `anihub_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `anihub_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `anihub_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `anihub_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text(255) NOT NULL,
	`hashed_password` text(255),
	`avatar` text(255),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_email_unique` ON `anihub_users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `anihub_users` (`email`);