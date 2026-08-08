-- Kliniko - Tresorerie : permissions, comptes et categories par defaut. Idempotent.
--   npx prisma db execute --file prisma/seed_tresorerie.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000032', 'tresorerie.lire',  'Consulter la tresorerie', 'tresorerie'),
 ('d0000000-0000-0000-0000-000000000033', 'tresorerie.gerer', 'Enregistrer recettes, depenses et transferts', 'tresorerie')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- CAISSE tient la tresorerie
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('tresorerie.lire','tresorerie.gerer')
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'CAISSE'
ON CONFLICT DO NOTHING;

-- Comptes par defaut
INSERT INTO comptes_tresorerie (id, hopital_id, nom, type) VALUES
 ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Caisse principale', 'caisse'),
 ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Compte bancaire', 'banque'),
 ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mobile Money', 'mobile_money')
ON CONFLICT DO NOTHING;

-- Categories par defaut
INSERT INTO categories_tresorerie (id, hopital_id, nom, sens) VALUES
 ('c2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Recettes de soins', 'recette'),
 ('c2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Recettes diverses', 'recette'),
 ('c2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Salaires', 'depense'),
 ('c2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Fournitures medicales', 'depense'),
 ('c2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Maintenance', 'depense'),
 ('c2000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Loyer et charges', 'depense'),
 ('c2000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Internet et telephone', 'depense'),
 ('c2000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Carburant et transport', 'depense'),
 ('c2000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Depenses diverses', 'depense')
ON CONFLICT DO NOTHING;
