-- =============================================================================
-- Kliniko — Seed authentification : permissions, rôles, compte administrateur
-- Idempotent : peut être rejoué sans créer de doublons.
-- Application (sur l'EC2, dans kliniko-api) :
--   npx prisma db execute --file prisma/seed_auth.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Catalogue des permissions (global, partagé par toutes les cliniques)
-- -----------------------------------------------------------------------------
INSERT INTO permissions (code, libelle, module) VALUES
 ('patient.lire',          'Consulter les dossiers patients',      'patients'),
 ('patient.creer',         'Créer un dossier patient',             'patients'),
 ('patient.modifier',      'Modifier un dossier patient',          'patients'),
 ('patient.supprimer',     'Supprimer (archiver) un patient',      'patients'),
 ('rdv.lire',              'Consulter les rendez-vous',            'rendez-vous'),
 ('rdv.creer',             'Créer un rendez-vous',                 'rendez-vous'),
 ('rdv.modifier',          'Modifier un rendez-vous',              'rendez-vous'),
 ('rdv.annuler',           'Annuler un rendez-vous',               'rendez-vous'),
 ('consultation.lire',     'Consulter les consultations',          'consultations'),
 ('consultation.creer',    'Créer une consultation',               'consultations'),
 ('consultation.modifier', 'Modifier une consultation',            'consultations'),
 ('facture.lire',          'Consulter les factures',               'facturation'),
 ('facture.creer',         'Créer une facture',                    'facturation'),
 ('facture.encaisser',     'Encaisser un paiement',                'facturation'),
 ('utilisateur.gerer',     'Gérer les utilisateurs et les rôles',  'administration'),
 ('referentiel.gerer',     'Gérer les référentiels (actes, tarifs, services)', 'administration')
ON CONFLICT (code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Les quatre rôles de base pour la clinique de démonstration
-- -----------------------------------------------------------------------------
INSERT INTO roles (hopital_id, code, libelle) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'ADMIN',   'Administrateur'),
 ('a0000000-0000-0000-0000-000000000001', 'MEDECIN', 'Médecin'),
 ('a0000000-0000-0000-0000-000000000001', 'ACCUEIL', 'Accueil'),
 ('a0000000-0000-0000-0000-000000000001', 'CAISSE',  'Caisse')
ON CONFLICT (hopital_id, code) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Attribution des permissions aux rôles
-- -----------------------------------------------------------------------------

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

-- ACCUEIL : patients et rendez-vous, pas de médical ni de finance
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

-- -----------------------------------------------------------------------------
-- 4. Compte administrateur initial
--    Email : admin@kliniko.cm
--    Mot de passe provisoire : Kliniko#2026   (à changer dès que possible)
--    Le hash ci-dessous est un bcrypt du mot de passe provisoire.
-- -----------------------------------------------------------------------------
INSERT INTO utilisateurs (id, hopital_id, email, mot_de_passe, nom, prenom, actif)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'admin@kliniko.cm',
  '$2b$10$BmZfSr4Xv7gRExaHsRwliOSjyJOCR0p0dv.FzLFaAgIwoSW7yZxs6',
  'Administrateur',
  'Kliniko',
  true
)
ON CONFLICT (hopital_id, email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Lier le compte administrateur au rôle ADMIN
-- -----------------------------------------------------------------------------
INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN roles r ON r.hopital_id = u.hopital_id AND r.code = 'ADMIN'
WHERE u.hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND u.email = 'admin@kliniko.cm'
ON CONFLICT DO NOTHING;
