CREATE TABLE `training_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`category` enum('mml-yard','warehouse','on-road-delivery','on-road-apartments','on-road-businesses','on-road-first-attempts','on-road-pickups') NOT NULL,
	`itemKey` varchar(100) NOT NULL,
	`itemLabel` varchar(255) NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `training_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`traineeId` int NOT NULL,
	`date` date NOT NULL,
	`status` enum('scheduled','in-progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`confidenceRating` int,
	`improvementAreas` text,
	`trainerNotes` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `training_sessions_id` PRIMARY KEY(`id`)
);
