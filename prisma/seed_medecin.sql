-- =============================================================================
-- Kliniko - Utilisateur medecin de test, relie au praticien Dr Jean Fotso
-- Email : medecin@kliniko.cm / Mot de passe : Medecin#2026
-- Idempotent. Application : npx prisma db execute --file prisma/seed_medecin.sql
-- =============================================================================

INSERT INTO utilisateurs (id, hopital_id, email, mot_de_passe, nom, prenom, actif, updated_at)
VALUES (
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'medecin@kliniko.cm',
  '$2b$10$SUUWyWlAlxkFXfSAc7Qk8u/1xU23isRHiKrMhLlGgPS7.REFYrqjG',
  'Fotso',
  'Jean',
  true,
  now()
)
ON CONFLICT (hopital_id, email) DO NOTHING;

INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN roles r ON r.hopital_id = u.hopital_id AND r.code = 'MEDECIN'
WHERE u.hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND u.email = 'medecin@kliniko.cm'
ON CONFLICT DO NOTHING;

-- Relier le compte au praticien existant (Dr Jean Fotso)
UPDATE praticiens
SET utilisateur_id = 'c0000000-0000-0000-0000-000000000003',
    updated_at = now()
WHERE id = 'd0000000-0000-0000-0000-000000000001'
  AND hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND (utilisateur_id IS NULL OR utilisateur_id <> 'c0000000-0000-0000-0000-000000000003');
