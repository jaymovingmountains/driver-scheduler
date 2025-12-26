CREATE TABLE `availability_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`reminderDate` date NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_reminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_reminder_date_idx` UNIQUE(`driverId`,`reminderDate`,`sentAt`)
);
