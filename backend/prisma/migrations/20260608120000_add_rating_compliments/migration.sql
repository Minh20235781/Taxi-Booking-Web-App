-- Production DB was created before compliments existed on Rating.
ALTER TABLE "Rating" ADD COLUMN IF NOT EXISTS "compliments" TEXT;
