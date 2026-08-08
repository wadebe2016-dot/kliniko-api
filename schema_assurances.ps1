# Assurances de la clinique + prise en charge sur le RDV. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_assurances.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model Assurance")) {
  Write-Host "DEJA   le modele Assurance existe - rien a faire."
  exit 0
}

# 1. Prise en charge sur RendezVous (apres modePaiement, pose par le lot precedent)
$deb = $s.IndexOf("model RendezVous {")
if ($deb -lt 0) { Write-Host "ECHEC  modele RendezVous introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)
$re = [regex]"(?m)^([ \t]*modePaiement[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne modePaiement introuvable (lancer schema_rdv_prestation.ps1 d'abord)"; exit 1 }
$ajout = '  assuranceId String? @map("assurance_id") @db.Uuid' + "`r`n" +
         '  assurance Assurance? @relation(fields: [assuranceId], references: [id])'
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + $ajout), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

# 2. Modele Assurance
$modele = @'

// Les assurances acceptees par la clinique : le patient qui reserve peut
// declarer une prise en charge en la choisissant dans cette liste.
model Assurance {
  id        String   @id @default(uuid()) @db.Uuid
  hopitalId String   @map("hopital_id") @db.Uuid
  nom       String
  actif     Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital      @relation(fields: [hopitalId], references: [id])
  rendezVous RendezVous[]

  @@unique([hopitalId, nom])
  @@map("assurances")
}
'@
$s = $s + $modele

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     Assurance + prise en charge ajoutees"

npx prisma format
npx prisma validate
