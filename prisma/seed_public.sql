-- Kliniko - Exposition publique : rendre visibles la clinique de demonstration
-- et ses praticiens. Idempotent.
--   npx prisma db execute --file prisma/seed_public.sql

UPDATE hopitaux
SET visible_public = true,
    adresse = 'Avenue de la Liberte, Akwa',
    presentation = 'Clinique generaliste de demonstration du reseau Kliniko.'
WHERE id = 'a0000000-0000-0000-0000-000000000001';

UPDATE praticiens
SET visible_public = true
WHERE hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND deleted_at IS NULL;
