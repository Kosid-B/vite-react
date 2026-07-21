#!/usr/bin/env bash
# verify-landed.sh — กัน "merged ≠ landed"
#
# บทเรียนจาก PR #163/#164 (ก.ค. 2569): PR ขึ้นสถานะ merged บน GitHub แต่ไฟล์ไม่ลงจริง
# เพราะใช้ชื่อ branch เดิมซ้ำ + squash เอา commit ของ PR ก่อนหน้ามาซ้ำ → merge commit ไม่มี diff จริง
# build ยังผ่านเพราะไม่มีใคร import โค้ดที่หายไป = "เขียวหลอก"
#
# สคริปต์นี้ตรวจว่า commit ที่ระบุ (เช่น squash-merge commit บน main) "มีไฟล์ที่คาดว่าจะลง" จริง
#
# ใช้:
#   scripts/verify-landed.sh <commit-ish> <path> [<path> ...]
# ตัวอย่าง:
#   scripts/verify-landed.sh 417d511 src/pages/CaseStudies.tsx src/data/skillCatalog.ts
#   git fetch origin main && scripts/verify-landed.sh origin/main src/lib/systemOverview.ts
#
# exit 0 = ไฟล์ที่คาดไว้ลงครบ · exit 1 = มีไฟล์หาย (fail loud)

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <commit-ish> <path> [<path> ...]" >&2
  exit 2
fi

commit="$1"; shift

if ! git rev-parse --verify --quiet "$commit^{commit}" >/dev/null; then
  echo "✗ ไม่พบ commit: $commit (ลอง git fetch ก่อน)" >&2
  exit 2
fi

# ไฟล์ที่ commit นี้แตะจริง (เทียบกับ parent แรก) — ครอบคลุมทั้ง add/modify/delete/rename
changed="$(git show --first-parent --name-only --format= "$commit" | sed '/^[[:space:]]*$/d')"

missing=0
for f in "$@"; do
  if printf '%s\n' "$changed" | grep -qxF -- "$f"; then
    echo "✓ $f"
  else
    echo "✗ $f — ไม่อยู่ใน $commit"
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo "" >&2
  echo "FAIL: บาง path ที่คาดว่าจะลง ไม่อยู่ใน $commit — 'merged ≠ landed'" >&2
  echo "ตรวจ: git show --stat $commit" >&2
  exit 1
fi

echo ""
echo "OK: ไฟล์ที่คาดไว้ทั้งหมดลงจริงใน $commit"
