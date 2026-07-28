-- =============================================================================
-- KLINIKO — Consolidation de la base (28/07/2026)
-- 1) Déclencheur d'auto-incrément de row_version (support synchro hors-ligne)
-- 2) Données de démonstration (1 clinique, 1 service, 1 praticien, 3 patients)
-- Idempotent : peut être relancé sans danger.
-- =============================================================================

-- --- 1. Déclencheur row_version ---------------------------------------------
CREATE OR REPLACE FUNCTION kliniko_bump_version()
RETURNS trigger AS $$
BEGIN
    NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'hopitaux','utilisateurs','roles','services','unites_soins','praticiens',
        'actes','tarifs','patients','rendez_vous','consultations','factures',
        'lignes_facture','paiements','rappels'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_bump_%1$s ON %1$s;', t);
        EXECUTE format(
            'CREATE TRIGGER trg_bump_%1$s BEFORE UPDATE ON %1$s
             FOR EACH ROW EXECUTE FUNCTION kliniko_bump_version();', t);
    END LOOP;
END $$;

-- --- 2. Données de démonstration --------------------------------------------
-- NB : updated_at est fourni explicitement (colonne NOT NULL sans défaut base,
--     normalement renseignée par Prisma côté application).

-- Clinique de démo
INSERT INTO hopitaux (id, nom, code, ville, telephone, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001',
        'Clinique Démo Douala', 'demo', 'Douala', '+237690000000', now())
ON CONFLICT (code) DO NOTHING;

-- Un service
INSERT INTO services (id, hopital_id, libelle, updated_at)
VALUES ('c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', 'Médecine générale', now())
ON CONFLICT (id) DO NOTHING;

-- Un praticien
INSERT INTO praticiens (id, hopital_id, service_id, nom, prenom, specialite, updated_at)
VALUES ('d0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'Fotso', 'Jean', 'Médecine générale', now())
ON CONFLICT (id) DO NOTHING;

-- Trois patients
INSERT INTO patients (id, hopital_id, numero_dossier, nom, prenom, sexe, telephone, updated_at)
VALUES
 ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','P-0001','Ngono','Marie','F','+237690000001', now()),
 ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','P-0002','Mballa','Paul','M','+237690000002', now()),
 ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','P-0003','Tchoua','Aline','F','+237690000003', now())
ON CONFLICT (hopital_id, numero_dossier) DO NOTHING;

-- Vérification rapide
SELECT 'hopitaux' AS table, count(*) FROM hopitaux
UNION ALL SELECT 'services', count(*) FROM services
UNION ALL SELECT 'praticiens', count(*) FROM praticiens
UNION ALL SELECT 'patients', count(*) FROM patients;
