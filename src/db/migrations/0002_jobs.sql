CREATE TABLE `job` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tool_id` varchar(64) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`provider` varchar(32) NOT NULL,
	`provider_request_id` varchar(191),
	`status` varchar(16) NOT NULL,
	`credits` int NOT NULL,
	`input` json NOT NULL,
	`output` json,
	`error` varchar(500),
	`output_expires_at` timestamp(3),
	`last_checked_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`finished_at` timestamp(3),
	CONSTRAINT `job_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_provider_request_id_unique` UNIQUE(`provider_request_id`)
);
--> statement-breakpoint
ALTER TABLE `job` ADD CONSTRAINT `job_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `job_user_created_idx` ON `job` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `job_status_created_idx` ON `job` (`status`,`created_at`);