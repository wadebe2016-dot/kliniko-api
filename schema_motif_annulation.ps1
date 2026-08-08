# Ajoute la colonne motifAnnulation au modele Facture. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_motif_annulation.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("motifAnnulation")) {
  Write-Host "DEJA   motifAnnulation existe - rien a faire."
  exit 0
}

$deb = $s.IndexOf("model Facture {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Facture introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

$re = [regex]"(?m)^([ \t]*statut[ \t]+StatutFacture[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne statut introuvable dans Facture"; exit 1 }
$remplacement = '$1' + "`r`n" + '  motifAnnulation String? @map("motif_annulation")'
$bloc = $re.Replace($bloc, $remplacement, 1)

$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     colonne ajoutee"

npx prisma format
npx prisma validate
Select-String -Path $chemin -Pattern "motifAnnulation"
