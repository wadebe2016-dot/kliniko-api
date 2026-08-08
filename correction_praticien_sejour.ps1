# Corrige la relation praticien du modele Hospitalisation :
# elle doit pointer vers Praticien (table des medecins), pas Utilisateur.
#   powershell -ExecutionPolicy Bypass -File .\correction_praticien_sejour.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

# --- 1. Dans le modele Hospitalisation : Utilisateur? -> Praticien? ---
$deb = $s.IndexOf("model Hospitalisation {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Hospitalisation introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("Praticien?")) {
  Write-Host "DEJA   la relation pointe deja vers Praticien."
  exit 0
}
$nb = ([regex]::Matches($bloc, "Utilisateur\?")).Count
if ($nb -ne 1) { Write-Host "ECHEC  attendu 1 Utilisateur? dans Hospitalisation, trouve $nb"; exit 1 }
$bloc = $bloc.Replace("Utilisateur?", "Praticien?")
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)
Write-Host "OK     relation praticien -> Praticien"

# --- 2. Retirer la relation inverse orpheline posee sur Utilisateur ---
$deb = $s.IndexOf("model Utilisateur {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Utilisateur introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)
$avant = $bloc.Length
$bloc = [regex]::Replace($bloc, "(?m)^[ \t]*\w*[Hh]ospitalisation\w*[ \t]+Hospitalisation\[\][ \t]*\r?\n", "")
if ($bloc.Length -lt $avant) {
  Write-Host "OK     relation inverse retiree d'Utilisateur"
} else {
  Write-Host "NOTE   pas de relation inverse trouvee sur Utilisateur (prisma format tranchera)"
}
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)

# prisma format pose la relation inverse sur Praticien, validate confirme
npx prisma format
npx prisma validate
