# Ajout des modeles Actif / EvenementActif au schema Prisma. Idempotent.
# A executer depuis C:\Users\wadeb\kliniko-api :
#   powershell -ExecutionPolicy Bypass -File .\schema_patrimoine.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model Actif")) {
  Write-Host "DEJA   le modele Actif existe - rien a faire."
  exit 0
}

$ajout = @'

// ------------------------------ Patrimoine ----------------------------------
// Les actifs de la clinique : equipements, vehicules, batiments...
// Chaque changement d'etat est trace dans un journal d'evenements.

enum EtatActif {
  en_service
  en_maintenance
  en_panne
  reforme
}

model Actif {
  id                String    @id @default(uuid()) @db.Uuid
  hopitalId         String    @map("hopital_id") @db.Uuid
  code              String?
  designation       String
  categorie         String?
  localisation      String?
  dateAcquisition   DateTime? @map("date_acquisition") @db.Date
  valeurAcquisition Decimal?  @map("valeur_acquisition") @db.Decimal(14, 2)
  etat              EtatActif @default(en_service)
  notes             String?
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital          @relation(fields: [hopitalId], references: [id])
  evenements EvenementActif[]

  @@index([hopitalId, etat])
  @@map("actifs")
}

model EvenementActif {
  id        String   @id @default(uuid()) @db.Uuid
  hopitalId String   @map("hopital_id") @db.Uuid
  actifId   String   @map("actif_id") @db.Uuid
  type      String
  detail    String?
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])
  actif   Actif   @relation(fields: [actifId], references: [id])

  @@index([hopitalId, actifId, createdAt])
  @@map("evenements_actifs")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles ajoutes"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "Actif\[\]|EvenementActif\[\]"
