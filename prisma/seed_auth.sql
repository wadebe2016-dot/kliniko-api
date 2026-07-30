-- =============================================================================
-- Kliniko - Seed authentification : permissions, roles, compte administrateur
-- Idempotent : peut etre rejoue sans creer de doublons.
-- Application (sur l'EC2, dans kliniko-api) :
--   npx prisma db execute --file prisma/seed_auth.sql
-- Note : la base ayant ete creee par "prisma db push", les identifiants (id)
-- et les colonnes updated_at n'ont pas de valeur par defaut cote base :
-- ce script les fournit donc explicitement.
-- =============================================================================

INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000001', 'patient.lire',          'Consulter les dossiers patients',      'patients'),
 ('d0000000-0000-0000-0000-000000000002', 'patient.creer',         'Creer un dossier patient',             'patients'),
 ('d0000000-0000-0000-0000-000000000003', 'patient.modifier',      'Modifier un dossier patient',          'patients'),
 ('d0000000-0000-0000-0000-000000000004', 'patient.supprimer',     'Supprimer (archiver) un patient',      'patients'),
 ('d0000000-0000-0000-0000-000000000005', 'rdv.lire',              'Consulter les rendez-vous',            'rendez-vous'),
 ('d0000000-0000-0000-0000-000000000006', 'rdv.creer',             'Creer un rendez-vous',                 'rendez-vous'),
 ('d0000000-0000-0000-0000-000000000007', 'rdv.modifier',          'Modifier un rendez-vous',              'rendez-vous'),
 ('d0000000-0000-0000-0000-000000000008', 'rdv.annuler',           'Annuler un rendez-vous',               'rendez-vous'),
 ('d0000000-0000-0000-0000-000000000009', 'consultation.lire',     'Consulter les consultations',          'consultations'),
 ('d0000000-0000-0000-0000-000000000010', 'consultation.creer',    'Creer une consultation',               'consultations'),
 ('d0000000-0000-0000-0000-000000000011', 'consultation.modifier', 'Modifier une consultation',            'consultations'),
 ('d0000000-0000-0000-0000-000000000012', 'facture.lire',          'Consulter les factures',               'facturation'),
 ('d0000000-0000-0000-0000-000000000013', 'facture.creer',         'Creer une facture',                    'facturation'),
 ('d0000000-0000-0000-0000-000000000014', 'facture.encaisser',     'Encaisser un paiement',                'facturation'),
 ('d0000000-0000-0000-0000-000000000015', 'utilisateur.gerer',     'Gerer les utilisateurs et les roles',  'administration'),
 ('d0000000-0000-0000-0000-000000000016', 'referentiel.gerer',     'Gerer les referentiels (actes, tarifs, services)', 'administration')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, hopital_id, code, libelle, updated_at) VALUES
 ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ADMIN',   'Administrateur', now()),
 ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'MEDECIN', 'Medecin',        now()),
 ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ACCUEIL', 'Accueil',        now()),
 ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CAISSE',  'Caisse',         now())
ON CONFLICT (hopital_id, code) DO NOTHING;

-- ADMIN : toutes les permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- MEDECIN : patients, rendez-vous, consultations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'patient.lire','patient.creer','patient.modifier',
  'rdv.lire','rdv.creer','rdv.modifier','rdv.annuler',
  'consultation.lire','consultation.creer','consultation.modifier'
)
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'MEDECIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL : patients et rendez-vous
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'patient.lire','patient.creer','patient.modifier',
  'rdv.lire','rdv.creer','rdv.modifier','rdv.annuler'
)
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ACCUEIL'
ON CONFLICT DO NOTHING;

-- CAISSE : lecture patients et facturation
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN (
  'patient.lire',
  'facture.lire','facture.creer','facture.encaisser'
)
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'CAISSE'
ON CONFLICT DO NOTHING;

-- Compte administrateur initial
-- Email : admin@kliniko.cm / Mot de passe provisoire : Kliniko#2026
INSERT INTO utilisateurs (id, hopital_id, email, mot_de_passe, nom, prenom, actif, updated_at)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@kliniko.cm',
  '$2b$10$BmZfSr4Xv7gRExaHsRwliOSjyJOCR0p0dv.FzLFaAgIwoSW7yZxs6',
  'Administrateur',
  'Kliniko',
  true,
  now()
)
ON CONFLICT (hopital_id, email) DO NOTHING;

-- Lier le compte administrateur au role ADMIN
INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN roles r ON r.hopital_id = u.hopital_id AND r.code = 'ADMIN'
WHERE u.hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND u.email = 'admin@kliniko.cm'
ON CONFLICT DO NOTHING;

