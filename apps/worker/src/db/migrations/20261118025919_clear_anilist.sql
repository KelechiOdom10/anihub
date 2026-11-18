-- void:allow-destructive
DELETE FROM `anime_cache`;--> statement-breakpoint
DELETE FROM `cache_entries`;--> statement-breakpoint
UPDATE `collection_items` SET `anime_id` = NULL;--> statement-breakpoint
UPDATE `comments` SET `anime_id` = NULL;
