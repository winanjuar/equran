-- ============================================================
-- 005_seed_default_book.sql
-- ============================================================

INSERT INTO books (name, description)
VALUES
  ('Quran Madinah Hijau', 'Mushaf Madinah ukuran standar, disimpan di kostan'),
  ('Quran Madinah Biru', 'Mushaf Madinah ukuran saku, dibawa bepergian (kantor, luar kota)')
ON CONFLICT DO NOTHING;
