# Ajoute la date de mouvement aux mouvements de consommables. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_date_stock.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

# Garde : chercher dateMouvement DANS le bloc MouvementConsommable
# (MouvementTresorerie possede deja le sien).
$deb = $s.IndexOf("model MouvementConsommable {")
if ($deb -lt 0) { Write-Host "ECHEC  modele MouvementConsommable introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("dateMouvement")) {
  Write-Host "DEJA   dateMouvement existe sur MouvementConsommable - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*quantite[ \t]+Int[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne quantite introuvable"; exit 1 }
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + '  dateMouvement DateTime @default(now()) @map("date_mouvement") @db.Date'), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     dateMouvement ajoute a MouvementConsommable"

npx prisma format
npx prisma validate
