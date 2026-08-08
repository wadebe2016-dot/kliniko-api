# Ajoute le champ note aux articles de stock (Consommable). Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_note_article.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

# Garde : chercher note DANS le bloc Consommable uniquement
$deb = $s.IndexOf("model Consommable {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Consommable introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc -match "(?m)^[ \t]*note[ \t]") {
  Write-Host "DEJA   note existe sur Consommable - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*prixUnitaire[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne prixUnitaire introuvable"; exit 1 }
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + '  note String?'), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     note ajoute a Consommable"

npx prisma format
npx prisma validate
