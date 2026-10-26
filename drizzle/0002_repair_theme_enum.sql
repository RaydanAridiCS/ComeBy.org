-- 0001 originally added 'velvet'; it was later edited in place to add 'bloom'.
-- Databases that applied the old 0001 never got 'bloom', so add it here.
-- Safe on fresh databases too (0001 already added it, IF NOT EXISTS is a no-op).
ALTER TYPE "public"."theme" ADD VALUE IF NOT EXISTS 'bloom';
