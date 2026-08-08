# Conges facon Edufo : parametres + demandes. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_conges.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model DemandeConge")) {
  Write-Host "DEJA   les modeles de conges existent - rien a faire."
  exit 0
}

$ajout = @'

// -------------------------------- Conges ------------------------------------
// Demandes de conges : jours OUVRABLES (lun-ven) calcules a la creation,
// workflow en_attente -> approuve / refuse. Le solde annuel = jours acquis
// (parametre clinique) - jours approuves de l'annee ; toujours calcule.

model ParametresConges {
  id                String   @id @default(uuid()) @db.Uuid
  hopitalId         String   @unique @map("hopital_id") @db.Uuid
  joursAcquisAnnuel Int      @default(18) @map("jours_acquis_annuel")
  updatedAt         DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])

  @@map("parametres_conges")
}

model DemandeConge {
  id                    String    @id @default(uuid()) @db.Uuid
  hopitalId             String    @map("hopital_id") @db.Uuid
  personnelId           String    @map("personnel_id") @db.Uuid
  type                  String    @default("annuel")
  dateDebut             DateTime  @map("date_debut") @db.Date
  dateFin               DateTime  @map("date_fin") @db.Date
  nbJoursOuvrables      Int       @map("nb_jours_ouvrables")
  motif                 String?
  statut                String    @default("en_attente")
  commentaireValidation String?   @map("commentaire_validation")
  valideLe              DateTime? @map("valide_le") @db.Timestamptz
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz

  hopital   Hopital   @relation(fields: [hopitalId], references: [id])
  personnel Personnel @relation(fields: [personnelId], references: [id])

  @@index([hopitalId, statut])
  @@index([hopitalId, personnelId, dateDebut])
  @@map("demandes_conges")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles de conges ajoutes"

npx prisma format
npx prisma validate
