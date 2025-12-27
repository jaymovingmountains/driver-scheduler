CREATE TABLE `agreement_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agreement_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `driver_agreements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`agreementVersion` varchar(20) NOT NULL,
	`signatureData` text NOT NULL,
	`signedAt` timestamp NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`pdfUrl` text,
	`emailSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_agreements_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_agreements_driverId_unique` UNIQUE(`driverId`)
);
