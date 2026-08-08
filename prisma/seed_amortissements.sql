-- Kliniko - Durees d'amortissement de demonstration (uniquement si absentes)
-- + date d'acquisition des actifs seedes (sans elle, pas de calcul).
--   npx prisma db execute --file prisma/seed_amortissements.sql

UPDATE actifs SET duree_amort_annees = 7,  date_acquisition = COALESCE(date_acquisition, DATE '2023-01-15') WHERE code = 'EQ-001' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
UPDATE actifs SET duree_amort_annees = 10, date_acquisition = COALESCE(date_acquisition, DATE '2022-06-01') WHERE code = 'EQ-002' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
UPDATE actifs SET duree_amort_annees = 8,  date_acquisition = COALESCE(date_acquisition, DATE '2024-03-10') WHERE code = 'EQ-003' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
UPDATE actifs SET duree_amort_annees = 10, date_acquisition = COALESCE(date_acquisition, DATE '2023-09-01') WHERE code = 'MO-001' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
UPDATE actifs SET duree_amort_annees = 5,  date_acquisition = COALESCE(date_acquisition, DATE '2024-01-20') WHERE code = 'VE-001' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
UPDATE actifs SET duree_amort_annees = 3,  date_acquisition = COALESCE(date_acquisition, DATE '2025-02-01') WHERE code = 'IN-001' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND duree_amort_annees IS NULL;
