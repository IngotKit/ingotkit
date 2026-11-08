import { index, mysqlTable, primaryKey, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";

/** Every verified webhook we processed. The unique (provider, event_id) makes replays no-ops. */
export const webhookEvent = mysqlTable(
  "webhook_event",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: varchar("provider", { length: 16 }).notNull(),
    eventId: varchar("event_id", { length: 191 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    /** What we did with it, for debugging: "granted 100 credits", "ignored: ...". */
    outcome: varchar("outcome", { length: 255 }).notNull(),
    receivedAt: timestamp("received_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("webhook_event_provider_event_uq").on(table.provider, table.eventId)],
);

/** Payment-provider customer for a user (needed for Stripe's portal; Polar uses our user id). */
export const billingCustomer = mysqlTable(
  "billing_customer",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 16 }).notNull(),
    customerId: varchar("customer_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.provider] }),
    index("billing_customer_customer_idx").on(table.provider, table.customerId),
  ],
);
