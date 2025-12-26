ALTER TABLE `admin_credentials` DROP INDEX `admin_credentials_username_unique`;--> statement-breakpoint
ALTER TABLE `admin_credentials` ADD `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_credentials` ADD `loginCode` varchar(6);--> statement-breakpoint
ALTER TABLE `admin_credentials` ADD `loginCodeExpiry` timestamp;--> statement-breakpoint
ALTER TABLE `admin_credentials` ADD CONSTRAINT `admin_credentials_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `admin_credentials` DROP COLUMN `username`;--> statement-breakpoint
ALTER TABLE `admin_credentials` DROP COLUMN `passwordHash`;