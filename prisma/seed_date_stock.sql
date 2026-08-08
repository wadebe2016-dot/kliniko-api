-- Kliniko - Stocks : reprise de la date des mouvements existants.
-- Les lignes anterieures a la migration ont recu la date du jour par
-- defaut ; on les ramene a leur date de creation. Idempotent.
--   npx prisma db execute --file prisma/seed_date_stock.sql

UPDATE mouvements_consommables
SET date_mouvement = created_at::date
WHERE date_mouvement::date > created_at::date;
