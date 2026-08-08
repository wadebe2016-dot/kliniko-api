# Patrimoine facon Edufo : nouveaux etats, fournisseur/affectation,
# interventions de maintenance, contrats. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_patrimoine_edufo.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model InterventionActif")) {
  Write-Host "DEJA   le patrimoine Edufo existe - rien a faire."
  exit 0
}

# 1. Enum EtatActif : ajouter les etats Edufo (les anciens restent, inutilises)
$debE = $s.IndexOf("enum EtatActif {")
if ($debE -lt 0) { Write-Host "ECHEC  enum EtatActif introuvable"; exit 1 }
$finE = $s.IndexOf("}", $debE)
$blocE = $s.Substring($debE, $finE - $debE)
foreach ($v in @("bon", "moyen", "en_reparation", "hors_service", "cede")) {
  if ($blocE -notmatch "(?m)^\s*$v\s*$") { $blocE = $blocE.TrimEnd() + "`r`n  $v`r`n" }
}
$s = $s.Substring(0, $debE) + $blocE + $s.Substring($finE)

# 2. Bloc Actif : defaut bon + nouveaux champs
$debA = $s.IndexOf("model Actif {")
if ($debA -lt 0) { Write-Host "ECHEC  modele Actif introuvable"; exit 1 }
$finA = $s.IndexOf("`n}", $debA)
$blocA = $s.Substring($debA, $finA - $debA)

$blocA = $blocA.Replace("@default(en_service)", "@default(bon)")

$re = [regex]"(?m)^([ \t]*notes[ \t]+String\?[^\r\n]*)$"
if (-not $re.IsMatch($blocA)) { Write-Host "ECHEC  ligne notes introuvable"; exit 1 }
$ajoutChamps = '  fournisseur String?' + "`r`n" +
               '  affecteA String? @map("affecte_a") @db.Uuid' + "`r`n" +
               '  actif Boolean @default(true)'
$blocA = $re.Replace($blocA, ('$1' + "`r`n" + $ajoutChamps), 1)

$re2 = [regex]"(?m)^([ \t]*hopital[ \t]+Hopital[^\r\n]*)$"
if (-not $re2.IsMatch($blocA)) { Write-Host "ECHEC  relation hopital introuvable"; exit 1 }
$ajoutRel = '  affecte Personnel? @relation(fields: [affecteA], references: [id])' + "`r`n" +
            '  interventions InterventionActif[]'
$blocA = $re2.Replace($blocA, ('$1' + "`r`n" + $ajoutRel), 1)
$s = $s.Substring(0, $debA) + $blocA + $s.Substring($finA)

# 3. Nouveaux modeles
$ajout = @'

// Interventions de maintenance : panne/reparation ouverte -> actif
// "en_reparation" ; derniere intervention cloturee -> retour a "bon".
model InterventionActif {
  id               String   @id @default(uuid()) @db.Uuid
  hopitalId        String   @map("hopital_id") @db.Uuid
  actifId          String   @map("actif_id") @db.Uuid
  type             String   @default("panne")
  description      String
  cout             Decimal  @default(0) @db.Decimal(14, 2)
  statut           String   @default("ouverte")
  dateIntervention DateTime @default(now()) @map("date_intervention") @db.Date
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital Hopital @relation(fields: [hopitalId], references: [id])
  actif   Actif   @relation(fields: [actifId], references: [id])

  @@index([hopitalId, actifId, statut])
  @@map("interventions_actifs")
}

// Contrats (bail, assurance, maintenance, travail...) : le statut
// temporel est TOUJOURS calcule a la lecture, jamais stocke.
model Contrat {
  id            String    @id @default(uuid()) @db.Uuid
  hopitalId     String    @map("hopital_id") @db.Uuid
  type          String    @default("prestataire")
  objet         String
  cocontractant String?
  personnelId   String?   @map("personnel_id") @db.Uuid
  reference     String?
  dateDebut     DateTime? @map("date_debut") @db.Date
  dateFin       DateTime? @map("date_fin") @db.Date
  montant       Decimal   @default(0) @db.Decimal(14, 2)
  resilie       Boolean   @default(false)
  note          String?
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz

  hopital   Hopital    @relation(fields: [hopitalId], references: [id])
  personnel Personnel? @relation(fields: [personnelId], references: [id])

  @@index([hopitalId, dateFin])
  @@map("contrats")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     patrimoine Edufo ajoute au schema"

npx prisma format
npx prisma validate
