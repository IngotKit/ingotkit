CREATE TABLE `billing_customer` (
	`user_id` varchar(36) NOT NULL,
	`provider` varchar(16) NOT NULL,
	`customer_id` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `billing_customer_user_id_provider_pk` PRIMARY KEY(`user_id`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `webhook_event` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(16) NOT NULL,
	`event_id` varchar(191) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`outcome` varchar(255) NOT NULL,
	`received_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_event_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_event_provider_event_uq` UNIQUE(`provider`,`event_id`)
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`amount` int NOT NULL,
	`kind` varchar(24) NOT NULL,
	`idempotency_key` varchar(191) NOT NULL,
	`job_id` varchar(64),
	`reference` varchar(255),
	`note` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_ledger_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
ALTER TABLE `billing_customer` ADD CONSTRAINT `billing_customer_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `billing_customer_customer_idx` ON `billing_customer` (`provider`,`customer_id`);--> statement-breakpoint
CREATE INDEX `credit_ledger_user_idx` ON `credit_ledger` (`user_id`);--> statement-breakpoint
CREATE INDEX `credit_ledger_job_idx` ON `credit_ledger` (`job_id`);