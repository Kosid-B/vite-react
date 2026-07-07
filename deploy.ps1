# =============================================================================
# deploy.ps1 - CEO AI Thailand : deploy production (Windows PowerShell)
# Production: waigsnxhrlwtiotspaim (Supabase Pro) + Cloudflare Workers
#
# วิธีใช้ (ใน PowerShell ที่โฟลเดอร์โปรเจกต์):
#   1) copy .deploy.env.example .deploy.env  แล้วใส่คีย์ลับ
#   2) .\deploy.ps1
#   ถ้ารันไม่ได้เพราะ policy:  powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#   ข้าม step:  .\deploy.ps1 -SkipFunctions -SkipGh   ·  ไม่ถามยืนยัน:  .\deploy.ps1 -Yes
# =============================================================================
[CmdletBinding()]
param(
  [switch]$Yes,
  [switch]$SkipFunctions,
  [switch]$SkipSecrets,
  [switch]$SkipGh,
  [switch]$SkipBuild,
  [switch]$SkipDeploy
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# ---- ค่าคงที่ production (anon key = public, ใส่ได้ปลอดภัย) ----
$ProjectRef  = 'waigsnxhrlwtiotspaim'
$SupabaseUrl = 'https://waigsnxhrlwtiotspaim.supabase.co'
$AnonKey     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaWdzbnhocmx3dGlvdHNwYWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDc2ODEsImV4cCI6MjA5MDI4MzY4MX0.zkfV_L63DB_yGsMQqdyxkayVIYKKkUogMllKIjToOE4'
$EdgeFns     = @('ai-assist','ai-plan','agent-run')

function Info($m){ Write-Host "`n> $m" -ForegroundColor Cyan }
function Ok($m){   Write-Host "OK  $m" -ForegroundColor Green }
function Warn($m){ Write-Host "!   $m" -ForegroundColor Yellow }
function Die($m){  Write-Host "X   $m" -ForegroundColor Red; exit 1 }
function Have($c){ [bool](Get-Command $c -ErrorAction SilentlyContinue) }

# ---- โหลดคีย์ลับจาก .deploy.env (รองรับรูปแบบ export KEY=VALUE) ----
if (Test-Path '.deploy.env') {
  Get-Content '.deploy.env' | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $line = $line -replace '^export\s+',''
    $i = $line.IndexOf('=')
    if ($i -gt 0) {
      $n = $line.Substring(0,$i).Trim()
      $v = $line.Substring($i+1).Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$n" -Value $v
    }
  }
}

# ---- 0) preflight ----
Info '0) ตรวจเครื่องมือ'
if (-not (Have node)) { Die "ไม่พบ node - ติดตั้ง Node.js ก่อน" }
if (-not (Have npm))  { Die "ไม่พบ npm" }
Ok  ("node " + (node -v) + " / npm " + (npm -v))
if (-not (Have supabase)) { Warn 'ไม่พบ supabase CLI (npm i -g supabase) - จะข้าม deploy functions/secrets' }
if (-not (Have gh))       { Warn 'ไม่พบ gh CLI (https://cli.github.com) - จะข้ามตั้ง GitHub Secrets' }

if (-not $Yes) {
  $ans = Read-Host "กำลังจะ deploy ขึ้น PRODUCTION ($ProjectRef) - ดำเนินการต่อ? (y/N)"
  if ($ans -notmatch '^(y|yes)$') { Die 'ยกเลิกโดยผู้ใช้' }
}

# ---- 1) deploy Edge Functions ----
if (-not $SkipFunctions -and (Have supabase)) {
  Info "1) deploy Edge Functions ขึ้น $ProjectRef"
  supabase link --project-ref $ProjectRef 2>$null | Out-Null
  foreach ($fn in $EdgeFns) {
    Info "   -> deploy $fn"
    supabase functions deploy $fn --project-ref $ProjectRef
    if ($LASTEXITCODE -ne 0) { Die "deploy $fn ล้มเหลว (login แล้วหรือยัง? supabase login)" }
  }
  Ok 'deploy functions ครบ'
} else { Warn 'ข้าม deploy Edge Functions' }

# ---- 2) Supabase Fn secrets (เฉพาะคีย์ที่มีค่า) ----
if (-not $SkipSecrets -and (Have supabase)) {
  Info '2) ตั้ง Supabase Fn secrets'
  function SetSbSecret($name){
    $val = [Environment]::GetEnvironmentVariable($name)
    if ($val) { supabase secrets set "$name=$val" --project-ref $ProjectRef | Out-Null; Ok "ตั้ง $name" }
    else { Warn "$name ไม่มีใน .deploy.env - ข้าม" }
  }
  SetSbSecret 'ANTHROPIC_API_KEY'
  SetSbSecret 'SERPER_API_KEY'
  SetSbSecret 'RESEND_API_KEY'
  SetSbSecret 'CRON_SECRET'
} else { Warn 'ข้ามตั้ง Supabase secrets' }

# ---- 3) GitHub Secrets ----
if (-not $SkipGh -and (Have gh)) {
  Info '3) ตั้ง GitHub Secrets'
  gh secret set VITE_SUPABASE_URL      --body $SupabaseUrl; if ($LASTEXITCODE -eq 0){ Ok 'VITE_SUPABASE_URL' }
  gh secret set VITE_SUPABASE_ANON_KEY --body $AnonKey;     if ($LASTEXITCODE -eq 0){ Ok 'VITE_SUPABASE_ANON_KEY' }
} else { Warn 'ข้ามตั้ง GitHub Secrets' }

# ---- 4) build ----
if (-not $SkipBuild) {
  Info '4) build (tsc -b && vite build)'
  $env:VITE_SUPABASE_URL      = $SupabaseUrl
  $env:VITE_SUPABASE_ANON_KEY = $AnonKey
  npm run build
  if ($LASTEXITCODE -ne 0) { Die "build ล้มเหลว - ถ้าเป็น error rollup/esbuild ให้รัน: rmdir /s /q node_modules; del package-lock.json; npm install" }
  Ok 'build เสร็จ -> dist/'
} else { Warn 'ข้าม build' }

# ---- 5) deploy Cloudflare Worker ----
if (-not $SkipDeploy) {
  Info '5) deploy Cloudflare Worker (wrangler)'
  npx wrangler deploy
  if ($LASTEXITCODE -ne 0) { Die 'wrangler deploy ล้มเหลว (wrangler login แล้วหรือยัง?)' }
  Ok 'deploy worker เสร็จ'
} else { Warn 'ข้าม wrangler deploy' }

Write-Host ''
Ok 'เสร็จสิ้น'
Write-Host 'ยังต้องทำมือใน Supabase Dashboard (ครั้งเดียว):' -ForegroundColor Yellow
Write-Host "  project $ProjectRef -> Authentication -> URL Configuration"
Write-Host '  -> เพิ่ม Redirect URL: https://ceoaithailand.org'
Write-Host 'ทดสอบ: เปิดเว็บ -> AI Agent -> DevTools(F12) Network ดู functions/v1/ai-assist ต้องได้ 200'
