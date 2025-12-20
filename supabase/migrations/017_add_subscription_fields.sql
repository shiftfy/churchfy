-- Migration: Add subscription fields to organizations table

-- Add columns for Stripe Subscription tracking
ALTER TABLE "public"."organizations"
  ADD COLUMN IF NOT EXISTS "subscription_status" text DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS "stripe_customer_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text,
  ADD COLUMN IF NOT EXISTS "plan_id" text DEFAULT 'one', -- 'one', 'campus', 'custom'
  ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone DEFAULT (now() + interval '7 days');

-- Add check constraint for valid statuses (matches Stripe statuses)
DO $$ BEGIN
  ALTER TABLE "public"."organizations"
    ADD CONSTRAINT "organizations_subscription_status_check"
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index for faster lookups by Stripe Customer ID
CREATE INDEX IF NOT EXISTS "idx_organizations_stripe_customer_id" ON "public"."organizations" ("stripe_customer_id");

-- Comment on columns
COMMENT ON COLUMN "public"."organizations"."subscription_status" IS 'Status da assinatura no Stripe (trialing, active, etc)';
COMMENT ON COLUMN "public"."organizations"."plan_id" IS 'Identificador do plano escolhido (one, campus)';
