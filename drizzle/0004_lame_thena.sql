CREATE TABLE `login_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptType` enum('driver','admin') NOT NULL,
	`identifier` varchar(320) NOT NULL,
	`success` boolean NOT NULL DEFAULT false,
	`failureReason` varchar(255),
	`ipAddress` varchar(45),
	`userAgent` text,
	`driverId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_attempts_id` PRIMARY KEY(`id`)
);
