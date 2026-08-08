-- seed_preconsultation.sql
-- Permissions du module pre-consultations + role INFIRMIER.
-- Idempotent : ON CONFLICT partout. ASCII, ids et dates explicites.

INSERT INTO permissions (id, code, libelle, module) VALUES
  ('da000000-0000-0000-0000-000000000001', 'preconsultation.lire', 'Consulter les pre-consultations', 'preconsultation'),
  ('da000000-0000-0000-0000-000000000002', 'preconsultation.creer', 'Prendre les parametres (pre-consultation)', 'preconsultation')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (id, hopital_id, code, libelle, created_at, updated_at)
VALUES (
  'ba000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'INFIRMIER',
  'Infirmier / Infirmiere',
  now(),
  now()
)
ON CONFLICT (hopital_id, code) DO NOTHING;

-- Les pre-consultations : INFIRMIER, MEDECIN et ADMIN prennent et lisent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('ADMIN', 'MEDECIN', 'INFIRMIER')
  AND p.code IN ('preconsultation.lire', 'preconsultation.creer')
ON CONFLICT DO NOTHING;

-- L'INFIRMIER voit aussi les patients et l'agenda (lecture seulement)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'INFIRMIER'
  AND p.code IN ('patient.lire', 'rdv.lire')
ON CONFLICT DO NOTHING;
