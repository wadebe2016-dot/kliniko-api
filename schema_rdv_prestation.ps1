# RDV patient : prestation choisie, mode de paiement, montant prevu. Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\schema_rdv_prestation.ps1

$chemin = "C:\Users\wadeb\kliniko-api\prisma\schema.prisma"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  schema.prisma introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

$deb = $s.IndexOf("model RendezVous {")
if ($deb -lt 0) { Write-Host "ECHEC  modele RendezVous introuvable"; exit 1 }
$fin = $s.IndexOf("`n}", $deb)
$bloc = $s.Substring($deb, $fin - $deb)

if ($bloc.Contains("acteId")) {
  Write-Host "DEJA   la prestation existe sur RendezVous - rien a faire."
  exit 0
}

$re = [regex]"(?m)^([ \t]*motifRefus[^\r\n]*)$"
if (-not $re.IsMatch($bloc)) { Write-Host "ECHEC  ligne motifRefus introuvable"; exit 1 }
$ajout = '  acteId String? @map("acte_id") @db.Uuid' + "`r`n" +
         '  modePaiement String? @map("mode_paiement")' + "`r`n" +
         '  montantPrevu Decimal? @map("montant_prevu") @db.Decimal(12, 2)' + "`r`n" +
         '  acte Acte? @relation(fields: [acteId], references: [id])'
$bloc = $re.Replace($bloc, ('$1' + "`r`n" + $ajout), 1)
$s = $s.Substring(0, $deb) + $bloc + $s.Substring($fin)

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)
Write-Host "OK     acteId / modePaiement / montantPrevu ajoutes a RendezVous"

npx prisma format
npx prisma validate
