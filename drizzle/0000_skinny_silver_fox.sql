CREATE TABLE `market_price_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`amount_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`provider_key` text DEFAULT 'local-manual' NOT NULL,
	`source_kind` text DEFAULT 'manual' NOT NULL,
	`source_name` text NOT NULL,
	`source_url` text,
	`price_type` text DEFAULT 'market-estimate' NOT NULL,
	`methodology` text,
	`sample_size` integer,
	`observed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_market_prices_amount_positive" CHECK("market_price_snapshots"."amount_cents" IS NULL OR "market_price_snapshots"."amount_cents" > 0),
	CONSTRAINT "ck_market_prices_sample_positive" CHECK("market_price_snapshots"."sample_size" IS NULL OR "market_price_snapshots"."sample_size" > 0),
	CONSTRAINT "ck_market_prices_source_kind" CHECK("market_price_snapshots"."source_kind" IN ('manual', 'api', 'marketplace', 'aggregate'))
);
--> statement-breakpoint
CREATE INDEX `idx_market_prices_product_observed` ON `market_price_snapshots` (`product_id`,`observed_at`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_market_prices_provider_observed` ON `market_price_snapshots` (`provider_key`,`observed_at`);--> statement-breakpoint
CREATE TABLE `product_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`alias` text NOT NULL,
	`normalized_alias` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_product_aliases_product_normalized` ON `product_aliases` (`product_id`,`normalized_alias`);--> statement-breakpoint
CREATE INDEX `idx_product_aliases_normalized` ON `product_aliases` (`normalized_alias`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`set_name` text,
	`series` text,
	`category` text NOT NULL,
	`release_date` text,
	`image_url` text,
	`msrp_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`search_text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "ck_products_msrp_positive" CHECK("products"."msrp_cents" IS NULL OR "products"."msrp_cents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_products_slug` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_products_active_category` ON `products` (`active`,`category`);--> statement-breakpoint
CREATE INDEX `idx_products_active_set` ON `products` (`active`,`set_name`);--> statement-breakpoint
CREATE INDEX `idx_products_active_updated` ON `products` (`active`,`updated_at`);--> statement-breakpoint
PRAGMA optimize;
