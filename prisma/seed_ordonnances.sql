-- =============================================================================
-- Kliniko - Seed ordonnances : permissions, referentiel medicaments,
-- et replication du declencheur row_version sur les nouvelles tables.
-- Idempotent : peut etre rejoue sans creer de doublons.
--   npx prisma db execute --file prisma/seed_ordonnances.sql
-- =============================================================================

-- 1. Les deux nouvelles permissions -------------------------------------------
INSERT INTO permissions (id, code, libelle, module) VALUES
 ('d0000000-0000-0000-0000-000000000017', 'ordonnance.lire',  'Consulter les ordonnances', 'ordonnances'),
 ('d0000000-0000-0000-0000-000000000018', 'ordonnance.creer', 'Rediger une ordonnance',    'ordonnances')
ON CONFLICT (code) DO NOTHING;

-- 2. ADMIN recoit tout (rejoue : les 16 anciennes sont deja liees) -------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

-- 3. MEDECIN peut lire et rediger ---------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p ON p.code IN ('ordonnance.lire','ordonnance.creer')
WHERE r.hopital_id = 'a0000000-0000-0000-0000-000000000001' AND r.code = 'MEDECIN'
ON CONFLICT DO NOTHING;

-- ACCUEIL et CAISSE : volontairement aucun droit sur les ordonnances.

-- 4. Referentiel medicaments de depart ----------------------------------------
INSERT INTO medicaments (id, hopital_id, code, denomination, forme, dosage, actif, updated_at) VALUES
 ('f0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','M001','Paracetamol','Comprime','500 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','M002','Paracetamol','Sirop','120 mg/5 ml',true,now()),
 ('f0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','M003','Ibuprofene','Comprime','400 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','M004','Diclofenac','Comprime','50 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','M005','Amoxicilline','Gelule','500 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','M006','Amoxicilline + acide clavulanique','Comprime','500 mg / 125 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000001','M007','Ceftriaxone','Poudre injectable','1 g',true,now()),
 ('f0000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001','M008','Ciprofloxacine','Comprime','500 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000001','M009','Azithromycine','Comprime','250 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000001','M010','Metronidazole','Comprime','500 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000001','M011','Cotrimoxazole','Comprime','800 mg / 160 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000001','M012','Artemether + Lumefantrine','Comprime','20 mg / 120 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000001','M013','Artesunate','Poudre injectable','60 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000001','M014','Quinine','Comprime','300 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000001','M015','Albendazole','Comprime','400 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000016','a0000000-0000-0000-0000-000000000001','M016','Sels de rehydratation orale','Sachet','1 sachet / litre',true,now()),
 ('f0000000-0000-0000-0000-000000000017','a0000000-0000-0000-0000-000000000001','M017','Fer + acide folique','Comprime','200 mg / 0,4 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000018','a0000000-0000-0000-0000-000000000001','M018','Omeprazole','Gelule','20 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000019','a0000000-0000-0000-0000-000000000001','M019','Loratadine','Comprime','10 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000001','M020','Salbutamol','Aerosol doseur','100 microgrammes / bouffee',true,now()),
 ('f0000000-0000-0000-0000-000000000021','a0000000-0000-0000-0000-000000000001','M021','Dexamethasone','Solution injectable','4 mg/ml',true,now()),
 ('f0000000-0000-0000-0000-000000000022','a0000000-0000-0000-0000-000000000001','M022','Amlodipine','Comprime','5 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000023','a0000000-0000-0000-0000-000000000001','M023','Hydrochlorothiazide','Comprime','25 mg',true,now()),
 ('f0000000-0000-0000-0000-000000000024','a0000000-0000-0000-0000-000000000001','M024','Metformine','Comprime','850 mg',true,now())
ON CONFLICT (hopital_id, code) DO NOTHING;

-- 5. Repliquer le declencheur row_version sur les nouvelles tables -------------
-- On decouvre le nom de la fonction en lisant le declencheur pose sur patients,
-- plutot que de le supposer.
DO $$
DECLARE fn text; t text;
BEGIN
  SELECT p.proname INTO fn
  FROM pg_trigger tg
  JOIN pg_proc  p ON p.oid = tg.tgfoid
  JOIN pg_class c ON c.oid = tg.tgrelid
  WHERE c.relname = 'patients' AND NOT tg.tgisinternal
  LIMIT 1;

  IF fn IS NULL THEN
    RAISE NOTICE 'Aucun declencheur trouve sur patients : rien a repliquer.';
  ELSE
    FOREACH t IN ARRAY ARRAY['medicaments','ordonnances','lignes_ordonnance'] LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_row_version_%s ON %I', t, t);
      EXECUTE format('CREATE TRIGGER trg_row_version_%s BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION %I()', t, t, fn);
    END LOOP;
    RAISE NOTICE 'Declencheur % replique sur les trois nouvelles tables.', fn;
  END IF;
END $$;
