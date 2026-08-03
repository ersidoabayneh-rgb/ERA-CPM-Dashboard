import { relations } from 'drizzle-orm';
import { mysqlTable, serial, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  uid: varchar('uid', { length: 255 }).notNull().unique(), // User UID
  email: varchar('email', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dbProjects = mysqlTable('db_projects', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: text('name').notNull(),
  client: text('client').notNull(),
  consultant: text('consultant'),
  contractor: text('contractor'),
  signDate: text('sign_date'),
  startDate: text('start_date'),
  origDays: text('orig_days'),
  eotDays: text('eot_days'),
  variation: text('variation'),
  origAmount: text('orig_amount'),
  lengthKm: text('length_km'),
  classification: text('classification'),
  contractType: text('contract_type'),
  programDirectorate: text('program_directorate'),
  pmo: text('pmo'),
  physicalProgress: text('physical_progress'),
  provisionalSum: text('provisional_sum'),
  data: text('data'), // stores the full NoSQL-style stringified JSON
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const capturedLogs = mysqlTable('captured_logs', {
  id: serial('id').primaryKey(),
  recordId: varchar('record_id', { length: 255 }),
  recordType: varchar('record_type', { length: 255 }).notNull(), // 'project', 'user', etc.
  status: varchar('status', { length: 255 }).notNull(), // 'success', 'validation_failed', 'server_error'
  payload: text('payload'),
  errorMessage: text('error_message'),
  ipAddress: varchar('ip_address', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const formDrafts = mysqlTable('form_drafts', {
  id: varchar('id', { length: 255 }).primaryKey(), // Combined user_id + form_id
  userId: varchar('user_id', { length: 255 }).notNull(),
  formId: varchar('form_id', { length: 255 }).notNull(),
  data: text('data').notNull(), // Stringified JSON
  updatedAt: timestamp('updated_at').defaultNow(),
});

