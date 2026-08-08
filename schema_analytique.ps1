# Ajout du modele CentreCout + imputation des mouvements. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_analytique.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("model CentreCout")) {
  Write-Host "DEJA   le modele CentreCout existe - rien a faire."
  exit 0
}

# 1. Colonne d'imputation sur MouvementTresorerie
$deb = $s.IndexOf("model MouvementTresorerie {")
if ($deb -lt 0) { Write-Host "ECHEC  modele MouvementTresorerie introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)
$re = [regex]"(?m)^([ \t]*categorieId[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne categorieId introuvable"; exit 1 }
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + '  centreCoutId String? @map("centre_cout_id") @db.Uuid'), 1)
$re2 = [regex]"(?m)^([ \t]*categorie[ \t]+CategorieTresorerie\?[^\r\n]*)$"
if (-not $re2.IsMatch($bloc)) { Write-Host "ECHEC  relation categorie introuvable"; exit 1 }
$bloc = $re2.Replace($bloc, ('$1' + "`r`n" + '  centreCout CentreCout? @relation(fields: [centreCoutId], references: [id])'), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

# 2. Modele CentreCout
$ajout = @'

// Analytique : les centres de cout de la clinique (services). Chaque
// mouvement peut etre impute a un centre ; le reste est "non impute".
model CentreCout {
  id        String   @id @default(uuid()) @db.Uuid
  hopitalId String   @map("hopital_id") @db.Uuid
  code      String
  nom       String
  actif     Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  hopital    Hopital               @relation(fields: [hopitalId], references: [id])
  mouvements MouvementTresorerie[]

  @@unique([hopitalId, code])
  @@map("centres_cout")
}
'@

$s = $s + $ajout
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     modele et imputation ajoutes"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "CentreCout"
