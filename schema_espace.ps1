# Lien compte utilisateur -> fiche personnel (Mon espace). Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_espace.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

$deb = $s.IndexOf("model Utilisateur {")
if ($deb -lt 0) { Write-Host "ECHEC  modele Utilisateur introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("personnelId")) {
  Write-Host "DEJA   le lien personnel existe - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*email[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne email introuvable"; exit 1 }
$ajout = '  personnelId String? @map("personnel_id") @db.Uuid' + "`r`n" +
         '  personnelFiche Personnel? @relation(fields: [personnelId], references: [id])'
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + $ajout), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     personnelId ajoute a Utilisateur"

npx prisma format
npx prisma validate
