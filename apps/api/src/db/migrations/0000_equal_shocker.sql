CREATE TYPE "public"."education_level" AS ENUM('fundamental', 'medio', 'tecnico', 'graduacao', 'pos', 'outro');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"institution" text NOT NULL,
	"course" text,
	"education_level" "education_level",
	"registration_number" text,
	"document_number" text,
	"issuer" text,
	"birth_date" date,
	"valid_until" date,
	"raw_ocr_text" text NOT NULL,
	"ocr_confidence" real,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
