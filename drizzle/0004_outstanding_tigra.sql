DROP INDEX IF EXISTS "anihub_email_verification_codes_user_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "verification_codes_code_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "oauth_accounts_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "oauth_accounts_provider_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "oauth_accounts_provider_user_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "reset_tokens_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "anihub_users_email_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "anihub_users_username_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "users_email_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "collection_items_collection_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "collection_items_anime_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_anime_in_collection";--> statement-breakpoint
DROP INDEX IF EXISTS "collection_likes_collection_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "collection_likes_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "unique_collection_like";--> statement-breakpoint
DROP INDEX IF EXISTS "collections_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "collections_name_idx";--> statement-breakpoint
ALTER TABLE `anihub_users` ALTER COLUMN "username" TO "username" text(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_email_verification_codes_user_id_unique` ON `anihub_email_verification_codes` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_codes_code_idx` ON `anihub_email_verification_codes` (`code`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_user_idx` ON `anihub_oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_provider_idx` ON `anihub_oauth_accounts` (`provider`);--> statement-breakpoint
CREATE INDEX `oauth_accounts_provider_user_id_idx` ON `anihub_oauth_accounts` (`provider_user_id`);--> statement-breakpoint
CREATE INDEX `reset_tokens_user_idx` ON `anihub_password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `anihub_sessions` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_email_unique` ON `anihub_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `anihub_users_username_unique` ON `anihub_users` (`username`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `anihub_users` (`email`);--> statement-breakpoint
CREATE INDEX `collection_items_collection_idx` ON `anihub_collection_items` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_items_anime_idx` ON `anihub_collection_items` (`anime_id`);--> statement-breakpoint
CREATE INDEX `unique_anime_in_collection` ON `anihub_collection_items` (`collection_id`,`anime_id`);--> statement-breakpoint
CREATE INDEX `collection_likes_collection_idx` ON `anihub_collection_likes` (`collection_id`);--> statement-breakpoint
CREATE INDEX `collection_likes_user_idx` ON `anihub_collection_likes` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_collection_like` ON `anihub_collection_likes` (`collection_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `collections_user_idx` ON `anihub_collections` (`user_id`);--> statement-breakpoint
CREATE INDEX `collections_name_idx` ON `anihub_collections` (`name`);