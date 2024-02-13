CREATE TABLE `email_verification_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text(21) NOT NULL,
	`email` text(255) NOT NULL,
	`code` text(8) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`user_id` text(21) NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text(255) NOT NULL,
	PRIMARY KEY(`provider`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text(40) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer DEFAULT false NOT NULL,
	`email` text(255) NOT NULL,
	`hashed_password` text(255),
	`avatar` text(255),
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_codes_user_id_unique` ON `email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `email_verification_codes` (`email`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `provider_idx` ON `oauth_accounts` (`provider`);--> statement-breakpoint
CREATE INDEX `provider_user_id_idx` ON `oauth_accounts` (`provider_user_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `user` (`email`);