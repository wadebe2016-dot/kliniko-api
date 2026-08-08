# Ajout du modele Personnel au schema Prisma. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_personnel.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model Personnel")) {
  Write-Host "DEJA   le modele Personnel existe - rien a faire."
  exit 0
}

$ajout = @'

// -------------------------- Ressources humaines -----------------------------
// La fiche du personnel separe le NON-SENSIBLE (identite professionnelle,
// visible du module Personnel) du SENSIBLE (contrat, salaire, etat civil),
// reserve a la permission personnel.rh. Principe repris d'Edufo.

enum StatutPersonnel {
  actif
  conge
  suspendu
  parti
}

model Personnel {
  id        String          @id @default(uuid()) @db.Uuid
  hopitalId String          @map("hopital_id") @db.Uuid
  matricule String?
  nom       String
  prenom    String?
  telephone String?
  email     String?
  fonction  String
  service   String?
  statut    StatutPersonnel @default(actif)

  // ---- champs sensibles : permission personnel.rh uniquement ----
  dateNaissance     DateTime? @map("date_naissance") @db.Date
  sexe              Sexe?
  adresse           String?
  cni               String?
  numeroCnps        String?   @map("numero_cnps")
  typeContrat       String?   @map("type_contrat")
  dateEmbauche      DateTime? @map("date_embauche") @db.Date
  dateFinContrat    DateTime? @map("date_fin_contrat") @db.Date
  salaireBase       Decimal?  @map("salaire_base") @db.Decimal(12, 2)
  diplome           String?
  contactUrgenceNom String?   @map("contact_urgence_nom")
  contactUrgenceTel String?   @map("contact_urgence_tel")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])

  @@unique([hopitalId, matricule])
  @@index([hopitalId, statut])
  @@map("personnels")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modele ajoute"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "Personnel\[\]"
