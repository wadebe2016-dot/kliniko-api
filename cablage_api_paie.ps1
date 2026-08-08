# Cablage du module Paie dans app.module.ts (kliniko-api). Idempotent.
#   powershell -ExecutionPolicy Bypass -File .\cablage_api_paie.ps1

$chemin = "C:\Users\wadeb\kliniko-api\src\app.module.ts"
if (-not (Test-Path $chemin)) { Write-Host "ECHEC  app.module.ts introuvable"; exit 1 }

$octets = [System.IO.File]::ReadAllBytes($chemin)
$s = [System.Text.Encoding]::UTF8.GetString($octets)

if ($s.Contains("PaieModule")) {
  Write-Host "DEJA   PaieModule est deja cable - rien a faire."
  exit 0
}

$nl = "`n"
if ($s.Contains("`r`n")) { $nl = "`r`n" }

$a1 = "import { PersonnelModule } from './personnel/personnel.module';"
if (-not $s.Contains($a1)) { Write-Host "ECHEC  ancre import absente"; exit 1 }
$s = $s.Replace($a1, $a1 + $nl + "import { PaieModule } from './paie/paie.module';")

$a2 = "    PersonnelModule,"
if (-not $s.Contains($a2)) { Write-Host "ECHEC  ancre liste absente"; exit 1 }
$s = $s.Replace($a2, $a2 + $nl + "    PaieModule,")

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($chemin, $s, $enc)

Write-Host "OK     module cable"
Write-Host ("Controle : PaieModule = " + ([regex]::Matches($s, "PaieModule")).Count + " occurrences (attendu 2)")
