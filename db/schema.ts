import { pgTable, foreignKey, serial, integer, text, timestamp, unique, real } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Students
export const students = pgTable("students", {
	id: serial().primaryKey().notNull(),
	admissionNumber: text("admission_number").notNull(),
	name: text().notNull(),
	lockerNumber: text("locker_number").default('-').notNull(),
	phoneNumber: text("phone_number"),
	class: text(),
	rollNumber: text("roll_number"),
	phoneName: text("phone_name"),
	className: text("class_name"),
	rollNo: text("roll_no"),
	specialPass: text("special_pass").default('NO'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("students_admission_number_unique").on(table.admissionNumber),
]);

// Users/Staff
export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	role: text().default('mentor').notNull(),
	permissions: text().array().default(["view_only"]).notNull(),
	specialPass: text("special_pass").default('NO'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

// User Activity Logs
export const userActivityLogs = pgTable("user_activity_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	action: text().notNull(),
	details: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
});

// Special Pass Grants
export const specialPassGrants = pgTable("special_pass_grants", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	mentorId: integer("mentor_id").notNull(),
	mentorName: text("mentor_name").notNull(),
	purpose: text().notNull(),
	issueTime: timestamp("issue_time", { mode: 'string' }).defaultNow(),
	returnTime: timestamp("return_time", { mode: 'string' }),
	submissionTime: timestamp("submission_time", { mode: 'string' }),
	status: text().default('ACTIVE'),
	expectedReturnDate: text("expected_return_date"),
	expectedReturnTime: text("expected_return_time"),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "special_pass_grants_student_id_students_id_fk"
		}),
]);

// Phone Status - Current status only
export const phoneStatus = pgTable("phone_status", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	status: text().notNull(), // IN, OUT
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	updatedBy: text("updated_by"),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "phone_status_student_id_students_id_fk"
		}),
]);

// Phone History - Track all phone in/out events
export const phoneHistory = pgTable("phone_history", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	status: text().notNull(), // IN, OUT
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	updatedBy: text("updated_by"),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "phone_history_student_id_students_id_fk"
		}),
]);

// Monthly Leave Schedule
export const monthlyLeaves = pgTable("monthly_leaves", {
	id: serial().primaryKey().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	reason: text().default('Monthly Leave'),
	createdBy: integer("created_by").notNull(),
	createdByName: text("created_by_name").notNull(),
	status: text().default('PENDING'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	passesIssued: text("passes_issued").default('NO'),
});

// Students excluded from monthly leave
export const leaveExclusions = pgTable("leave_exclusions", {
	id: serial().primaryKey().notNull(),
	leaveId: integer("leave_id").notNull(),
	studentId: integer("student_id").notNull(),
	excludedBy: integer("excluded_by").notNull(),
	excludedByName: text("excluded_by_name").notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.leaveId],
			foreignColumns: [monthlyLeaves.id],
			name: "leave_exclusions_leave_id_monthly_leaves_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "leave_exclusions_student_id_students_id_fk"
		}),
]);

// Fines - Types of fines
export const fines = pgTable("fines", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	amount: real().notNull(),
	description: text(),
	isActive: text("is_active").default('YES'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Student Fines - Link students to fines
export const studentFines = pgTable("student_fines", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	fineId: integer("fine_id").notNull(),
	amount: real().notNull(),
	reason: text(),
	isPaid: text("is_paid").default('NO'),
	issuedBy: integer("issued_by").notNull(),
	issuedByName: text("issued_by_name").notNull(),
	paidDate: timestamp("paid_date", { mode: 'string' }),
	issuedAt: timestamp("issued_at", { mode: 'string' }).defaultNow(),
});

// Tally Types - Types of rule violations
export const tallyTypes = pgTable("tally_types", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	type: text().notNull(), // 'NORMAL' or 'FIXED'
	description: text(),
	tallyValue: integer("tally_value").default(1), // How many tallies this violation carries (1-10)
	isActive: text("is_active").default('YES'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

// Student Tallies - Individual tally entries for students
export const studentTallies = pgTable("student_tallies", {
	id: serial().primaryKey().notNull(),
	studentId: integer("student_id").notNull(),
	tallyTypeId: integer("tally_type_id").notNull(),
	tallyTypeName: text("tally_type_name").notNull(),
	tallyType: text("tally_type").notNull(), // 'NORMAL' or 'FIXED'
	count: integer().default(1), // Number of tallies for this violation (based on tallyValue)
	reason: text(),
	issuedBy: integer("issued_by").notNull(),
	issuedByName: text("issued_by_name").notNull(),
	issuedAt: timestamp("issued_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.studentId],
		foreignColumns: [students.id],
		name: "student_tallies_student_id_students_id_fk"
	}),
	foreignKey({
		columns: [table.tallyTypeId],
		foreignColumns: [tallyTypes.id],
		name: "student_tallies_tally_type_id_tally_types_id_fk"
	}),
]);
