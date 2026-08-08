# Ajout des modeles Chambre / Lit / Hospitalisation au schema Prisma.
# A executer depuis C:\Users\wadeb\kliniko-api :
#   powershell -ExecutionPolicy Bypass -File .\schema_hospitalisation.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model Hospitalisation")) {
  Write-Host "DEJA   le modele Hospitalisation existe - rien a faire."
  exit 0
}

$ajout = @'

// --------------------------- Hospitalisation --------------------------------
// Une chambre a des lits ; un sejour occupe un lit du debut a la sortie.
// A la sortie, la facture (optionnelle) = jours x tarif journalier de la
// chambre. Un lit est occupe s'il porte un sejour en_cours : rien a maintenir.

enum StatutHospitalisation {
  en_cours
  terminee
  annulee
}

model Chambre {
  id              String   @id @default(uuid()) @db.Uuid
  hopitalId       String   @map("hopital_id") @db.Uuid
  numero          String
  categorie       String?
  tarifJournalier Decimal? @map("tarif_journalier") @db.Decimal(12, 2)
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])
  lits    Lit[]

  @@unique([hopitalId, numero])
  @@map("chambres")
}

model Lit {
  id        String @id @default(uuid()) @db.Uuid
  chambreId String @map("chambre_id") @db.Uuid
  numero    String

  chambre Chambre           @relation(fields: [chambreId], references: [id])
  sejours Hospitalisation[]

  @@unique([chambreId, numero])
  @@map("lits")
}

model Hospitalisation {
  id          String                @id @default(uuid()) @db.Uuid
  hopitalId   String                @map("hopital_id") @db.Uuid
  patientId   String                @map("patient_id") @db.Uuid
  litId       String                @map("lit_id") @db.Uuid
  praticienId String?               @map("praticien_id") @db.Uuid
  motif       String
  notes       String?
  statut      StatutHospitalisation @default(en_cours)
  dateEntree  DateTime              @default(now()) @map("date_entree") @db.Timestamptz
  dateSortie  DateTime?             @map("date_sortie") @db.Timestamptz
  factureId   String?               @map("facture_id") @db.Uuid
  createdAt   DateTime              @default(now()) @map("created_at") @db.Timestamptz

  hopital   Hopital      @relation(fields: [hopitalId], references: [id])
  patient   Patient      @relation(fields: [patientId], references: [id])
  lit       Lit          @relation(fields: [litId], references: [id])
  praticien Utilisateur? @relation(fields: [praticienId], references: [id])
  facture   Facture?     @relation(fields: [factureId], references: [id])

  @@index([hopitalId, statut])
  @@map("hospitalisations")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles ajoutes"

# prisma format pose les relations inverses manquantes, validate confirme
npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "Hospitalisation\[\]|Chambre\[\]"
