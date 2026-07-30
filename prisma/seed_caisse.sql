-- =============================================================================
-- Kliniko - Utilisateur de test "caisse" pour verifier les droits par role
-- Email : caisse@kliniko.cm / Mot de passe : Caisse#2026
-- Idempotent. Application : npx prisma db execute --file prisma/seed_caisse.sql
-- =============================================================================

INSERT INTO utilisateurs (id, hopital_id, email, mot_de_passe, nom, prenom, actif, updated_at)
VALUES (
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'caisse@kliniko.cm',
  '$2b$10$LofEg4e6nSFGGvDW8T4e1eocO.MXh/NbO8DWfOtQWEU1YOBJa1GFm',
  'Essomba',
  'Julienne',
  true,
  now()
)
ON CONFLICT (hopital_id, email) DO NOTHING;

INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN roles r ON r.hopital_id = u.hopital_id AND r.code = 'CAISSE'
WHERE u.hopital_id = 'a0000000-0000-0000-0000-000000000001'
  AND u.email = 'caisse@kliniko.cm'
ON CONFLICT DO NOTHING;
