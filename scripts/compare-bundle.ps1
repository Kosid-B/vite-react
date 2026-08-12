# compare-bundle.ps1 — เทียบบันเดิลบนเครื่องคุณกับที่มีในระบบแล้ว
# วิธีใช้ (PowerShell): .\scripts\compare-bundle.ps1 -BundlePath "D:\Claude Skills Ultimate Bundle"
param([Parameter(Mandatory=$true)][string]$BundlePath)

$repoList = Join-Path $PSScriptRoot 'skills-in-repo.txt'
if (-not (Test-Path $repoList)) { Write-Error "ไม่พบ $repoList"; exit 1 }
if (-not (Test-Path $BundlePath)) { Write-Error "ไม่พบโฟลเดอร์ $BundlePath"; exit 1 }

$inRepo = Get-Content $repoList | Where-Object { $_ -ne '' }

# หา SKILL.md ทุกไฟล์ในบันเดิล แล้วใช้ชื่อโฟลเดอร์เป็น id
$inBundle = Get-ChildItem -Path $BundlePath -Recurse -Filter 'SKILL.md' |
            ForEach-Object { $_.Directory.Name } | Sort-Object -Unique

$new     = $inBundle | Where-Object { $inRepo -notcontains $_ }
$already = $inBundle | Where-Object { $inRepo -contains $_ }

Write-Host ""
Write-Host "ในบันเดิลของคุณ : $($inBundle.Count) ทักษะ"
Write-Host "มีในระบบแล้ว    : $($already.Count)" -ForegroundColor DarkGray
Write-Host "ยังไม่มี (ใหม่)  : $($new.Count)" -ForegroundColor Green
Write-Host ""
if ($new.Count -gt 0) {
  Write-Host "--- รายชื่อที่ยังไม่มีในระบบ ---" -ForegroundColor Green
  $new | ForEach-Object { Write-Host "  $_" }
  $out = Join-Path $PSScriptRoot 'new-skills.txt'
  $new | Set-Content $out -Encoding UTF8
  Write-Host ""
  Write-Host "บันทึกรายชื่อไว้ที่: $out"
} else {
  Write-Host "บันเดิลนี้มีครบอยู่ในระบบแล้ว ไม่มีอะไรใหม่ต้องนำเข้า" -ForegroundColor Yellow
}
