-- Kliniko - Consommables : permissions, attribution, referentiel de demonstration.
-- Idempotent.  npx prisma db execute --file prisma/seed_consommables.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000023', 'consommable.lire',  'Consulter le stock des consommables', 'consommables'),
 ('d0000000-0000-0000-0000-000000000024', 'consommable.gerer', 'Gerer les entrees et consommations', 'consommables')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL tient l'economat (lire et gerer)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('consommable.lire','consommable.gerer')
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ACCUEIL'
ON CONFLICT DO NOTHING;

-- MEDECIN consulte
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'consommable.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'MEDECIN'
ON CONFLICT DO NOTHING;

-- Referentiel de demonstration
INSERT INTO consommables (id, hopital_id, code, designation, unite, seuil_alerte) VALUES
 ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'C001', 'Gants latex taille M', 'boite de 100', 5),
 ('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'C002', 'Seringues 5 ml', 'boite de 100', 5),
 ('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'C003', 'Compresses steriles 10x10', 'paquet de 25', 10),
 ('f1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'C004', 'Coton hydrophile 500 g', 'rouleau', 10),
 ('f1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'C005', 'Alcool 70 degres 1 L', 'flacon', 6),
 ('f1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'C006', 'Sparadrap 2,5 cm', 'rouleau', 10),
 ('f1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'C007', 'Catheters IV 22G', 'boite de 50', 4),
 ('f1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'C008', 'Gel hydroalcoolique 500 ml', 'flacon', 8),
 ('f1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'C009', 'Bandes de gaze 4 m', 'rouleau', 10),
 ('f1000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'C010', 'Abaisse-langue', 'boite de 100', 4)
ON CONFLICT DO NOTHING;
