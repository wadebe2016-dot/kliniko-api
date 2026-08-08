-- Kliniko - Patrimoine : permissions et actifs de demonstration. Idempotent.
--   npx prisma db execute --file prisma/seed_patrimoine.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000027', 'patrimoine.lire',  'Consulter le patrimoine et les actifs', 'patrimoine'),
 ('d0000000-0000-0000-0000-000000000028', 'patrimoine.gerer', 'Gerer les actifs et leurs etats', 'patrimoine')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL consulte l'inventaire
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'patrimoine.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ACCUEIL'
ON CONFLICT DO NOTHING;

-- Actifs de demonstration
INSERT INTO actifs (id, hopital_id, code, designation, categorie, localisation, valeur_acquisition, etat) VALUES
 ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EQ-001', 'Echographe portable', 'Equipement medical', 'Salle de consultation 1', 4500000, 'en_service'),
 ('a1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'EQ-002', 'Microscope binoculaire', 'Equipement medical', 'Laboratoire', 850000, 'en_service'),
 ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'EQ-003', 'Groupe electrogene 10 kVA', 'Energie', 'Cour arriere', 2200000, 'en_service'),
 ('a1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'MO-001', 'Lits medicalises (lot de 5)', 'Mobilier', 'Hospitalisation', 1500000, 'en_service'),
 ('a1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'VE-001', 'Ambulance Toyota Hiace', 'Vehicule', 'Parking', 18000000, 'en_service'),
 ('a1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'IN-001', 'Ordinateurs accueil (lot de 3)', 'Informatique', 'Accueil', 900000, 'en_service')
ON CONFLICT DO NOTHING;
