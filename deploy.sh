#!/usr/bin/env bash
# =============================================================================
# deploy.sh — CEO AI Thailand · deploy ขึ้น production ครบขั้นตอนในคำสั่งเดียว
# Production: waigsnxhrlwtiotspaim (Supabase Pro plan) + Cloudflare Workers
#
# วิธีใช้:
#   1) คัดลอก .deploy.env.example เป็น .deploy.env แล้วใส่คีย์ลับ (ไฟล์นี้ถูก gitignore)
#   2) รัน:  bash deploy.sh
#   ข้าม step ได้:  bash deploy.sh --skip-functions --skip-gh
#   ไม่ต้องถามยืนยัน:  bash deploy.sh --yes
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")"

# ---- ค่าคงที่ของ production (anon key = public key ใส่ได้ปลอดภัย) ----------
PROJECT_REF="waigsnxhrlwtiotspaim"
SUPABASE_URL="https://waigsnxhrlwtiotspaim.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhaWdzbnhocmx3dGlvdHNwYWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDc2ODEsImV4cCI6MjA5MDI4MzY4MX0.zkfV_L63DB_yGsMQqdyxkayVIYKKkUogMllKIjToOE4"
EDGE_FUNCTIONS=(ai-assist ai-plan agent-run)

# ---- โหลดคีย์ลับจาก .deploy.env (ไม่ commit) --------------------------------
[ -f ".deploy.env" ] && source .deploy.env

# ---- flags -----------------------------------------------------------------
YES=0; SKIP_FUNCTIONS=0; SKIP_SECRETS=0; SKIP_GH=0; SKIP_BUILD=0; SKIP_DEPLOY=0
for a in "$@"; do case "$a" in
  --yes|-y) YES=1 ;;
  --skip-functions) SKIP_FUNCTIONS=1 ;;
  --skip-secrets)   SKIP_SECRETS=1 ;;
  --skip-gh)        SKIP_GH=1 ;;
  --skip-build)     SKIP_BUILD=1 ;;
  --skip-deploy)    SKIP_DEPLOY=1 ;;
  -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "ไม่รู้จัก flag: $a" >&2; exit 2 ;;
esac; done

# ---- helpers ---------------------------------------------------------------
c_info(){ printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
c_ok(){   printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
c_warn(){ printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
c_die(){  printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }
need(){ have "$1" || c_die "ไม่พบคำสั่ง '$1' — ติดตั้งก่อนแล้วรันใหม่"; }

# ---- 0) preflight ----------------------------------------------------------
c_info "0) ตรวจเครื่องมือ"
need node; need npm; need npx
c_ok "node $(node -v) · npm $(npm -v)"
have supabase || c_warn "ไม่พบ supabase CLI (npm i -g supabase) — จะข้าม deploy functions/secrets"
have gh       || c_warn "ไม่พบ gh CLI (https://cli.github.com) — จะข้ามตั้ง GitHub Secrets"
have wrangler || npx --no-install wrangler --version >/dev/null 2>&1 || c_warn "wrangler จะถูกเรียกผ่าน npx"

if [ "$YES" -ne 1 ]; then
  printf '\n\033[1;33mกำลังจะ deploy ขึ้น PRODUCTION (%s). ดำเนินการต่อ? [y/N] \033[0m' "$PROJECT_REF"
  read -r ans; case "$ans" in y|Y|yes) ;; *) c_die "ยกเลิกโดยผู้ใช้";; esac
fi

# ---- 1) deploy Edge Functions ---------------------------------------------
if [ "$SKIP_FUNCTIONS" -eq 0 ] && have supabase; then
  c_info "1) deploy Edge Functions ขึ้น $PROJECT_REF"
  supabase link --project-ref "$PROJECT_REF" >/dev/null 2>&1 || c_warn "link ไม่สำเร็จ (อาจ link ไว้แล้ว) — ไปต่อ"
  for fn in "${EDGE_FUNCTIONS[@]}"; do
    c_info "   → deploy $fn"
    supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
  done
  c_ok "deploy functions ครบ"
else
  c_warn "ข้าม deploy Edge Functions"
fi

# ---- 2) ตั้ง Supabase secrets (เฉพาะคีย์ที่มีค่าใน .deploy.env) --------------
if [ "$SKIP_SECRETS" -eq 0 ] && have supabase; then
  c_info "2) ตั้ง Supabase Fn secrets"
  set_secret(){ local n="$1"; local v="${!1:-}"; if [ -n "$v" ]; then supabase secrets set "$n=$v" --project-ref "$PROJECT_REF" >/dev/null && c_ok "ตั้ง $n"; else c_warn "$n ไม่มีใน .deploy.env — ข้าม"; fi; }
  set_secret ANTHROPIC_API_KEY
  set_secret SERPER_API_KEY
  set_secret RESEND_API_KEY
  set_secret CRON_SECRET
else
  c_warn "ข้ามตั้ง Supabase secrets"
fi

# ---- 3) GitHub Secrets (ใช้ตอน build ใน Actions/local) ---------------------
if [ "$SKIP_GH" -eq 0 ] && have gh; then
  c_info "3) ตั้ง GitHub Secrets"
  gh secret set VITE_SUPABASE_URL      --body "$SUPABASE_URL" && c_ok "VITE_SUPABASE_URL"
  gh secret set VITE_SUPABASE_ANON_KEY --body "$ANON_KEY"     && c_ok "VITE_SUPABASE_ANON_KEY"
else
  c_warn "ข้ามตั้ง GitHub Secrets"
fi

# ---- 4) build --------------------------------------------------------------
if [ "$SKIP_BUILD" -eq 0 ]; then
  c_info "4) build (tsc -b && vite build)"
  # ถ้าเจอ error rollup/esbuild (optional-deps bug) ให้รัน: rm -rf node_modules package-lock.json && npm install
  VITE_SUPABASE_URL="$SUPABASE_URL" VITE_SUPABASE_ANON_KEY="$ANON_KEY" npm run build
  c_ok "build เสร็จ → dist/"
else
  c_warn "ข้าม build"
fi

# ---- 5) deploy Cloudflare Worker ------------------------------------------
if [ "$SKIP_DEPLOY" -eq 0 ]; then
  c_info "5) deploy Cloudflare Worker (wrangler)"
  npx wrangler deploy
  c_ok "deploy worker เสร็จ"
else
  c_warn "ข้าม wrangler deploy"
fi

# ---- 6) เตือนขั้นที่ต้องทำมือ ----------------------------------------------
cat <<EOF

$(c_ok "เสร็จสิ้น")
ยังต้องทำมือใน Supabase Dashboard (ทำครั้งเดียว):
  • project $PROJECT_REF → Authentication → URL Configuration
    → เพิ่ม Redirect URL:  https://ceoaithailand.org

ทดสอบ:  เปิดเว็บ → กด AI Agent → DevTools(F12) → Network ดู functions/v1/ai-assist ต้องได้ 200
  • 401 = ยังไม่ login   • 404 = ฟังก์ชันยังไม่ deploy บน $PROJECT_REF   • timeout = ยังไม่ตั้ง ANTHROPIC_API_KEY
EOF
