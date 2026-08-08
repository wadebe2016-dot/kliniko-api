# Ajout des modeles Consommable / MouvementConsommable au schema Prisma.
# A executer depuis C:\Users\wadeb\kliniko-api :
#   powershell -ExecutionPolicy Bypass -File .\schema_consommables.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model Consommable")) {
  Write-Host "DEJA   le modele Consommable existe - rien a faire."
  exit 0
}

$ajout = @'

// ----------------------------- Consommables ---------------------------------
// Le stock non medical (gants, seringues, compresses...) sur la meme
// mecanique que la pharmacie : le stock est la somme des mouvements.
// La sortie est une consommation motivee (service, usage).

model Consommable {
  id           String   @id @default(uuid()) @db.Uuid
  hopitalId    String   @map("hopital_id") @db.Uuid
  code         String?
  designation  String
  unite        String?
  seuilAlerte  Int      @default(10) @map("seuil_alerte")
  prixUnitaire Decimal? @map("prix_unitaire") @db.Decimal(12, 2)
  actif        Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital                @relation(fields: [hopitalId], references: [id])
  mouvements MouvementConsommable[]

  @@unique([hopitalId, designation])
  @@map("consommables")
}

model MouvementConsommable {
  id             String             @id @default(uuid()) @db.Uuid
  hopitalId      String             @map("hopital_id") @db.Uuid
  consommableId  String             @map("consommable_id") @db.Uuid
  type           TypeMouvementStock
  quantite       Int
  datePeremption DateTime?          @map("date_peremption") @db.Date
  prixAchat      Decimal?           @map("prix_achat") @db.Decimal(12, 2)
  motif          String?
  createdAt      DateTime           @default(now()) @map("created_at") @db.Timestamptz

  hopital     Hopital     @relation(fields: [hopitalId], references: [id])
  consommable Consommable @relation(fields: [consommableId], references: [id])

  @@index([hopitalId, consommableId, createdAt])
  @@map("mouvements_consommables")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles ajoutes"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "Consommable\[\]|MouvementConsommable\[\]"
