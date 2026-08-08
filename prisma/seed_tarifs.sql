-- Kliniko - Mercuriale : permissions tarif.lire / tarif.gerer. Idempotent.
--   npx prisma db execute --file prisma/seed_tarifs.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000025', 'tarif.lire',  'Consulter la mercuriale des prix', 'tarifs'),
 ('d0000000-0000-0000-0000-000000000026', 'tarif.gerer', 'Gerer les actes et les tarifs', 'tarifs')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- CAISSE consulte la mercuriale
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'tarif.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'CAISSE'
ON CONFLICT DO NOTHING;
