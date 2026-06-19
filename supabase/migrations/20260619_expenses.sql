-- ── Expense categories ────────────────────────────────────────────────────────
CREATE TABLE expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read categories
CREATE POLICY "categories_read" ON expense_categories
  FOR SELECT TO authenticated USING (true);

-- Only super admin can write
CREATE POLICY "categories_admin_write" ON expense_categories
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Seed default categories
INSERT INTO expense_categories (name, sort_order) VALUES
  ('Hotels',           1),
  ('Meals',            2),
  ('Transportation',   3),
  ('Events',           4),
  ('Event Organizers', 5),
  ('Miscellaneous',    6);

-- ── Expenses ──────────────────────────────────────────────────────────────────
CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  description  TEXT NOT NULL,
  amount       NUMERIC(14,0) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  receipt_url  TEXT,
  notes        TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  recorded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Approved members see published expenses only
CREATE POLICY "expenses_member_read" ON expenses
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

-- Super admin can see all and write
CREATE POLICY "expenses_admin_all" ON expenses
  FOR ALL TO authenticated
  USING   (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
