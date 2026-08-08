-- Kliniko - Pharmacie : permissions et attribution. Idempotent.
--   npx prisma db execute --file prisma/seed_pharmacie.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000019', 'pharmacie.lire',  'Consulter le stock de la pharmacie', 'pharmacie'),
 ('d0000000-0000-0000-0000-000000000020', 'pharmacie.gerer', 'Gerer le stock et les dispensations', 'pharmacie')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- MEDECIN voit le stock (utile en prescrivant)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'pharmacie.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'MEDECIN'
ON CONFLICT DO NOTHING;

-- CAISSE dispense et encaisse (dans une petite clinique, c'est le meme poste)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('pharmacie.lire','pharmacie.gerer')
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'CAISSE'
ON CONFLICT DO NOTHING;

-- Prix de vente de depart pour les medicaments de demonstration
UPDATE medicaments SET prix_vente = 100  WHERE code = 'M001' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND prix_vente IS NULL;
UPDATE medicaments SET prix_vente = 500  WHERE code = 'M003' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND prix_vente IS NULL;
UPDATE medicaments SET prix_vente = 2500 WHERE code = 'M005' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND prix_vente IS NULL;
UPDATE medicaments SET prix_vente = 3500 WHERE code = 'M012' AND hopital_id = 'a0000000-0000-0000-0000-000000000001' AND prix_vente IS NULL;
