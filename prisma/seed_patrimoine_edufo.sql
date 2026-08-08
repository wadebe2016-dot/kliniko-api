-- Kliniko - Patrimoine facon Edufo : migration des etats et codes.
-- Idempotent.
--   npx prisma db execute --file prisma/seed_patrimoine_edufo.sql

-- 1. Anciens etats -> vocabulaire Edufo
UPDATE actifs SET etat = 'bon'            WHERE etat = 'en_service';
UPDATE actifs SET etat = 'en_reparation'  WHERE etat IN ('en_maintenance', 'en_panne');
UPDATE actifs SET etat = 'hors_service'   WHERE etat = 'reforme';

-- 2. Code auto ACT-AAAA-NNNNNN pour les actifs qui n'en ont pas
WITH sans_code AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM actifs
  WHERE code IS NULL OR code = ''
)
UPDATE actifs a
SET code = 'ACT-' || EXTRACT(YEAR FROM CURRENT_DATE)::int || '-' || LPAD(s.rn::text, 6, '0')
FROM sans_code s
WHERE a.id = s.id;
