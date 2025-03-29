import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the raid types
export const RaidTypeEnum = {
  WORKPLACE: "Workplace",
  RESIDENTIAL: "Residential",
  CHECKPOINT: "Checkpoint",
  OTHER: "Other",
} as const;

// Define the raid source types
export const SourceTypeEnum = {
  NEWS: "News",
  SOCIAL_MEDIA: "Social Media",
  COMMUNITY_ALERT: "Community Alert",
  LEGAL_AID: "Legal Aid Organization",
  OTHER: "Other",
} as const;

// User table (keeping as is for authentication if needed later)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ICE Raids table
export const iceRaids = pgTable("ice_raids", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  state: text("state").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  raidType: text("raid_type").notNull(),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  raidDate: timestamp("raid_date").notNull(),
  detaineeCount: integer("detainee_count"),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertIceRaidSchema = createInsertSchema(iceRaids).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type IceRaid = typeof iceRaids.$inferSelect;
export type InsertIceRaid = z.infer<typeof insertIceRaidSchema>;

// Validation schemas for the API
export const raidFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  state: z.string().optional(),
  raidTypes: z.array(z.string()).optional(),
});

export type RaidFilters = z.infer<typeof raidFiltersSchema>;
