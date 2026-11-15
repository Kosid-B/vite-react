<#
  eval-local.ps1 — เทียบคุณภาพ AI ในเครื่อง (Ollama) กับ Claude ด้วยคำสั่งเดียว

  ทำไมต้องมีไฟล์นี้:
    ตัวแปร $env: ตายทุกครั้งที่ปิดหน้าต่าง PowerShell ⇒ ต้องพิมพ์ใหม่ทุกรอบ
    และพลาดไปแล้ว 3 รอบติด (รันผิดโฟลเดอร์ · ลืม LLM_BASE_URL · ลืม LLM_API_KEY)
    ไฟล์นี้ตั้งทุกตัวให้เอง + ตรวจว่า Ollama เปิดอยู่และมีโมเดลจริงก่อนเริ่มรัน

  วิธีใช้:
    .\scripts\eval-local.ps1                      # ใช้ qwen2.5:7b
    .\scripts\eval-local.ps1 -Model "qwen2.5:14b" # ลองโมเดลอื่น

  ต้องมีก่อน: ANTHROPIC_API_KEY (ใช้เป็นตัวเทียบ + กรรมการ)
    ชั่วคราว  : $env:ANTHROPIC_API_KEY="sk-ant-..."
    จำถาวร    : setx ANTHROPIC_API_KEY "sk-ant-..."   (แล้วเปิดหน้าต่างใหม่)
  หมายเหตุ: ไฟล์นี้ไม่เก็บคีย์ใด ๆ ไว้ในตัวเอง และห้ามเพิ่มคีย์ลงไฟล์นี้เด็ดขาด (มันอยู่ใน git)
#>
param(
  [string]$Model = "qwen2.5:7b",
  [string]$OllamaUrl = "http://localhost:11434"
)

$ErrorActionPreference = "Stop"

# ไปรากโปรเจกต์เสมอ (ไฟล์นี้อยู่ใน scripts/) — กัน "Cannot find module" เวลารันจากโฟลเดอร์อื่น
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root
Write-Host "โฟลเดอร์โปรเจกต์: $root"

# --- 1) คีย์ Claude (ตัวเทียบ + กรรมการ) ---
if (-not $env:ANTHROPIC_API_KEY) {
  Write-Host ""
  Write-Host "[X] ยังไม่มี ANTHROPIC_API_KEY ในหน้าต่างนี้" -ForegroundColor Red
  Write-Host '    ชั่วคราว : $env:ANTHROPIC_API_KEY="sk-ant-..."'
  Write-Host '    จำถาวร   : setx ANTHROPIC_API_KEY "sk-ant-..."  (แล้วเปิดหน้าต่างใหม่)'
  exit 1
}

# --- 2) Ollama เปิดอยู่ไหม ---
try {
  $tags = Invoke-RestMethod -Uri "$OllamaUrl/api/tags" -TimeoutSec 5
} catch {
  Write-Host ""
  Write-Host "[X] ต่อ Ollama ที่ $OllamaUrl ไม่ได้" -ForegroundColor Red
  Write-Host "    เปิดโปรแกรม Ollama ก่อน หรือสั่ง: ollama serve"
  exit 1
}

# --- 3) มีโมเดลตัวนี้จริงไหม (กันรันไปแล้วค่อยพังกลางทาง) ---
$have = @($tags.models | ForEach-Object { $_.name })
if ($have -notcontains $Model) {
  Write-Host ""
  Write-Host "[X] ยังไม่มีโมเดล '$Model' ในเครื่อง" -ForegroundColor Red
  Write-Host "    ที่มีอยู่: $($have -join ', ')"
  Write-Host "    โหลดด้วย: ollama pull $Model"
  exit 1
}

# --- 4) ตั้งค่าท่อให้ตรงกับที่ supabase/functions/_shared/llm.ts ใช้ (OpenAI-compatible) ---
$env:LLM_API_KEY   = "ollama"              # Ollama ไม่ตรวจคีย์ แต่สคริปต์บังคับว่าต้องมีค่า
$env:LLM_BASE_URL  = "$OllamaUrl/v1"
$env:MODEL_VARIANT = $Model

Write-Host "โมเดลที่จะวัด : $Model"
Write-Host "ปลายทาง       : $env:LLM_BASE_URL"
Write-Host ""

node scripts/typhoon-eval.mjs
exit $LASTEXITCODE
