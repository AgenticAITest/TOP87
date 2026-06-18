-- Add tshirt_size column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tshirt_size TEXT
    CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));
