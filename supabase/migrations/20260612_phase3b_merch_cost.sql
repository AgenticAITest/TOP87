-- Phase 3b: Add cost column to merchandise for margin tracking
ALTER TABLE merchandise ADD COLUMN IF NOT EXISTS cost BIGINT NOT NULL DEFAULT 0;
