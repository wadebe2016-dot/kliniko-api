# Ajout des modeles de tresorerie au schema Prisma. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_tresorerie.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model MouvementTresorerie")) {
  Write-Host "DEJA   les modeles de tresorerie existent - rien a faire."
  exit 0
}

$ajout = @'

// ------------------------------- Tresorerie ---------------------------------
// Recettes, depenses et transferts entre comptes. Le solde d'un compte est
// la somme de ses mouvements, jamais un champ stocke. Les encaissements de
// factures alimentent automatiquement la caisse.

enum TypeCompteTresorerie {
  caisse
  banque
  mobile_money
}

enum SensCategorie {
  recette
  depense
}

enum TypeMouvementTresorerie {
  recette
  depense
  transfert
}

model CompteTresorerie {
  id        String               @id @default(uuid()) @db.Uuid
  hopitalId String               @map("hopital_id") @db.Uuid
  nom       String
  type      TypeCompteTresorerie @default(caisse)
  actif     Boolean              @default(true)
  createdAt DateTime             @default(now()) @map("created_at") @db.Timestamptz

  hopital         Hopital               @relation(fields: [hopitalId], references: [id])
  mouvements      MouvementTresorerie[] @relation("compte")
  transfertsRecus MouvementTresorerie[] @relation("compteDest")

  @@unique([hopitalId, nom])
  @@map("comptes_tresorerie")
}

model CategorieTresorerie {
  id        String        @id @default(uuid()) @db.Uuid
  hopitalId String        @map("hopital_id") @db.Uuid
  nom       String
  sens      SensCategorie
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital               @relation(fields: [hopitalId], references: [id])
  mouvements MouvementTresorerie[]

  @@unique([hopitalId, nom])
  @@map("categories_tresorerie")
}

model MouvementTresorerie {
  id            String                  @id @default(uuid()) @db.Uuid
  hopitalId     String                  @map("hopital_id") @db.Uuid
  type          TypeMouvementTresorerie
  compteId      String                  @map("compte_id") @db.Uuid
  compteDestId  String?                 @map("compte_dest_id") @db.Uuid
  categorieId   String?                 @map("categorie_id") @db.Uuid
  libelle       String
  beneficiaire  String?
  montant       Decimal                 @db.Decimal(14, 2)
  dateMouvement DateTime                @default(now()) @map("date_mouvement") @db.Date
  factureId     String?                 @map("facture_id") @db.Uuid
  createdAt     DateTime                @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital              @relation(fields: [hopitalId], references: [id])
  compte     CompteTresorerie     @relation("compte", fields: [compteId], references: [id])
  compteDest CompteTresorerie?    @relation("compteDest", fields: [compteDestId], references: [id])
  categorie  CategorieTresorerie? @relation(fields: [categorieId], references: [id])
  facture    Facture?             @relation(fields: [factureId], references: [id])

  @@index([hopitalId, dateMouvement])
  @@map("mouvements_tresorerie")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modeles ajoutes"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "MouvementTresorerie\[\]"
