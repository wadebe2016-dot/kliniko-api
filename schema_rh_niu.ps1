# Ajoute NIU et situation matrimoniale au volet RH (Personnel). Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_rh_niu.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

# Garde : chercher DANS le bloc Personnel
$deb = $s.IndexOf("model Personnel {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Personnel introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("situationFamille")) {
  Write-Host "DEJA   NIU / situation matrimoniale existent - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*numeroCnps[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne numeroCnps introuvable"; exit 1 }
$ajout = '  niu String?' + "`r`n" +
         '  situationFamille String? @map("situation_famille")'
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + $ajout), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     niu et situationFamille ajoutes a Personnel"

npx prisma format
npx prisma validate
