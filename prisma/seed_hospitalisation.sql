-- Kliniko - Hospitalisation : permissions, attribution, chambres de demonstration.
-- Idempotent.  npx prisma db execute --file prisma/seed_hospitalisation.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000021', 'hospitalisation.lire',  'Consulter chambres et sejours', 'hospitalisation'),
 ('d0000000-0000-0000-0000-000000000022', 'hospitalisation.gerer', 'Gerer admissions, sorties et chambres', 'hospitalisation')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- MEDECIN voit et gere les sejours (admissions et sorties sont des actes medicaux)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('hospitalisation.lire','hospitalisation.gerer')
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'MEDECIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL voit l'occupation des lits
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'hospitalisation.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ACCUEIL'
ON CONFLICT DO NOTHING;

-- Chambres de demonstration pour la clinique demo
INSERT INTO chambres (id, hopital_id, numero, categorie, tarif_journalier) VALUES
 ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '101', 'Standard', 5000),
 ('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '102', 'Standard', 5000),
 ('e1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '201', 'Privee', 15000)
ON CONFLICT DO NOTHING;

INSERT INTO lits (id, chambre_id, numero) VALUES
 ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', '1'),
 ('e2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', '2'),
 ('e2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000002', '1'),
 ('e2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', '2'),
 ('e2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000003', '1')
ON CONFLICT DO NOTHING;
