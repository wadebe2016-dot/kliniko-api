# Paie facon Edufo : parametres, bareme IRPP, bulletins. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_paie.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model BulletinPaie")) {
  Write-Host "DEJA   les modeles de paie existent - rien a faire."
  exit 0
}

$ajout = @'

// --------------------------------- Paie -------------------------------------
// Moteur camerounais repris d'Edufo : CNPS salariale sur brut plafonne,
// abattement frais professionnels, IRPP par tranches ANNUELLES ramene au
// mois, CAC sur IRPP. Outil d'aide au calcul, a valider par un comptable.

model ParametresPaie {
  id                 String   @id @default(uuid()) @db.Uuid
  hopitalId          String   @unique @map("hopital_id") @db.Uuid
  tauxCnpsSalarial   Decimal  @default(4.2) @map("taux_cnps_salarial") @db.Decimal(6, 3)
  plafondCnps        Decimal  @default(750000) @map("plafond_cnps") @db.Decimal(14, 2)
  abattementFraisPct Decimal  @default(30) @map("abattement_frais_pct") @db.Decimal(6, 2)
  cacPct             Decimal  @default(10) @map("cac_pct") @db.Decimal(6, 2)
  updatedAt          DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])

  @@map("parametres_paie")
}

model TrancheIrpp {
  id        String   @id @default(uuid()) @db.Uuid
  hopitalId String   @map("hopital_id") @db.Uuid
  borneMin  Decimal  @default(0) @map("borne_min") @db.Decimal(14, 2)
  borneMax  Decimal? @map("borne_max") @db.Decimal(14, 2)
  taux      Decimal  @default(0) @db.Decimal(6, 2)
  ordre     Int      @default(0)

  hopital Hopital @relation(fields: [hopitalId], references: [id])

  @@index([hopitalId, ordre])
  @@map("tranches_irpp")
}

model BulletinPaie {
  id              String    @id @default(uuid()) @db.Uuid
  hopitalId       String    @map("hopital_id") @db.Uuid
  personnelId     String    @map("personnel_id") @db.Uuid
  mois            Int
  annee           Int
  salaireBase     Decimal   @default(0) @map("salaire_base") @db.Decimal(14, 2)
  totalPrimes     Decimal   @default(0) @map("total_primes") @db.Decimal(14, 2)
  primesDetail    String?   @map("primes_detail")
  brut            Decimal   @default(0) @db.Decimal(14, 2)
  cnps            Decimal   @default(0) @db.Decimal(14, 2)
  irpp            Decimal   @default(0) @db.Decimal(14, 2)
  cac             Decimal   @default(0) @db.Decimal(14, 2)
  autresRetenues  Decimal   @default(0) @map("autres_retenues") @db.Decimal(14, 2)
  net             Decimal   @default(0) @db.Decimal(14, 2)
  statutVersement String    @default("en_attente") @map("statut_versement")
  dateVersement   DateTime? @map("date_versement") @db.Date
  modeVersement   String?   @map("mode_versement")
  genereLe        DateTime  @default(now()) @map("genere_le") @db.Timestamptz

  hopital   Hopital   @relation(fields: [hopitalId], references: [id])
  personnel Personnel @relation(fields: [personnelId], references: [id])

  @@unique([hopitalId, personnelId, mois, annee])
  @@index([hopitalId, annee, mois])
  @@map("bulletins_paie")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles de paie ajoutes"

npx prisma format
npx prisma validate
