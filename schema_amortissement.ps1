# Ajoute la duree d'amortissement au modele Actif. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_amortissement.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

$deb = $s.IndexOf("model Actif {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Actif introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("dureeAmortAnnees")) {
  Write-Host "DEJA   dureeAmortAnnees existe - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*valeurAcquisition[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne valeurAcquisition introuvable"; exit 1 }
$remplacement = '$1' + "`r`n" + '  dureeAmortAnnees Int? @map("duree_amort_annees")'
$bloc = $re.Replace($bloc, $remplacement, 1)

$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     colonne ajoutee"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "dureeAmortAnnees"
