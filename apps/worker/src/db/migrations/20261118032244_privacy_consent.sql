-- void:allow-destructive
ALTER TABLE `user` ADD `privacy_policy_version` text;--> statement-breakpoint
ALTER TABLE `user` ADD `privacy_consented_at` integer;--> statement-breakpoint
UPDATE `account` SET `access_token` = NULL, `refresh_token` = NULL, `id_token` = NULL, `access_token_expires_at` = NULL, `refresh_token_expires_at` = NULL;
