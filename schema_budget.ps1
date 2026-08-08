# Ajout du modele LigneBudget (CDG) au schema Prisma. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_budget.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model LigneBudget")) {
  Write-Host "DEJA   le modele LigneBudget existe - rien a faire."
  exit 0
}

$ajout = @'

// Controle de gestion : une ligne de budget par categorie et par annee.
// Le realise n'est jamais stocke - il est calcule depuis les mouvements.
model LigneBudget {
  id           String  @id @default(uuid()) @db.Uuid
  hopitalId    String  @map("hopital_id") @db.Uuid
  annee        Int
  categorieId  String  @map("categorie_id") @db.Uuid
  montantPrevu Decimal @map("montant_prevu") @db.Decimal(14, 2)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital   Hopital             @relation(fields: [hopitalId], references: [id])
  categorie CategorieTresorerie @relation(fields: [categorieId], references: [id])

  @@unique([hopitalId, annee, categorieId])
  @@map("lignes_budget")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modele ajoute"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "LigneBudget\[\]"
