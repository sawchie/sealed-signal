CREATE TABLE `exchange_rates` (
	`base` text PRIMARY KEY NOT NULL,
	`rate_date` text NOT NULL,
	`checked_at` text NOT NULL,
	`rates_json` text NOT NULL
);
