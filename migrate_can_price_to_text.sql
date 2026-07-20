-- Migrate can_price from boolean to text to support 'view' and 'edit' levels
-- Existing true → 'view', false/null → null
ALTER TABLE users
  ALTER COLUMN can_price TYPE text
  USING CASE WHEN can_price THEN 'view' ELSE NULL END;
