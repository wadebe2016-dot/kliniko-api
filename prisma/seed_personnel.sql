-- Kliniko - Personnel : permissions et effectif de demonstration. Idempotent.
--   npx prisma db execute --file prisma/seed_personnel.sql

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000029', 'personnel.lire',  'Consulter la liste du personnel', 'personnel'),
 ('d0000000-0000-0000-0000-000000000030', 'personnel.gerer', 'Gerer les fiches du personnel', 'personnel'),
 ('d0000000-0000-0000-0000-000000000031', 'personnel.rh',    'Acceder aux donnees RH sensibles (contrats, salaires)', 'personnel')
ON CONFLICT (code) DO NOTHING;

-- ADMIN recoit tout
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL consulte l'annuaire (fiche de base uniquement)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'personnel.lire'
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ACCUEIL'
ON CONFLICT DO NOTHING;

-- Effectif de demonstration
INSERT INTO personnels (id, hopital_id, matricule, nom, prenom, telephone, fonction, service, statut, type_contrat, date_embauche, salaire_base) VALUES
 ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'P-001', 'Fotso', 'Jean', '690000001', 'Medecin generaliste', 'Consultation', 'actif', 'CDI', DATE '2024-01-08', 650000),
 ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'P-002', 'Ngo Bassa', 'Clarisse', '690000002', 'Infirmiere', 'Soins', 'actif', 'CDI', DATE '2024-03-01', 220000),
 ('b1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'P-003', 'Kamdem', 'Serge', '690000003', 'Caissier', 'Accueil', 'actif', 'CDD', DATE '2025-06-15', 150000),
 ('b1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'P-004', 'Mbarga', 'Odile', '690000004', 'Technicienne de laboratoire', 'Laboratoire', 'actif', 'CDI', DATE '2023-11-02', 280000)
ON CONFLICT DO NOTHING;
