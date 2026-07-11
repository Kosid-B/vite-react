# PR Merge Checklist — กัน "merged ≠ landed"

> เหตุ: ก.ค. 2569 PR #163/#164 ขึ้นสถานะ **merged** บน GitHub แต่ไฟล์ **ไม่ลงจริงบน main**
> เพราะใช้ชื่อ branch เดิมซ้ำสำหรับ PR ต่อเนื่อง + squash เอา commit ของ PR ก่อนหน้ามาซ้ำ →
> merge commit ไม่มี diff จริง · `npm run build` ยังผ่านเพราะไม่มีใคร import โค้ดที่หาย = **"เขียวหลอก"**
> (จับได้ตอนประเมินระบบด้วย `git show --stat`, re-land + verify เป็น #165)

## กติกาถาวร

1. **1 PR = 1 branch ใหม่เสมอ** — อย่าใช้ชื่อ branch เดิมซ้ำสำหรับงานถัดไป
   ถ้าจำเป็นต้องใช้ชื่อเดิม (เช่น branch ที่ระบบกำหนด) → **reset ให้ตรง main ก่อนเริ่มทุกครั้ง**:
   ```bash
   git fetch origin main && git checkout -B <branch> origin/main
   ```

2. **ก่อน merge** — ตรวจว่า PR มีไฟล์ที่คาดไว้จริง (ผ่าน GitHub API `get_files` หรือ UI Files tab)

3. **หลัง merge** — ยืนยันว่า squash-merge commit มี diff จริง ไม่ใช่ body ซ้ำของ PR เก่า:
   ```bash
   git fetch origin main
   npm run verify:landed <merge-sha> <path> [<path> ...]
   # หรือ
   git show --stat <merge-sha>
   ```

## `verify:landed` — สคริปต์ตรวจอัตโนมัติ

`scripts/verify-landed.sh <commit-ish> <path>...` — ตรวจว่า commit ที่ระบุแตะไฟล์ที่คาดไว้จริง
คืน exit 1 (fail loud) ถ้ามีไฟล์หาย · ครอบคลุม add/modify/delete/rename (เทียบ first-parent)

```bash
# ตัวอย่าง
git fetch origin main
npm run verify:landed origin/main src/pages/CaseStudies.tsx src/data/skillCatalog.ts
```

พิสูจน์แล้วว่าจับ defect เดิมได้: รันกับ merge commit ของ #163 (`ad4755e`) + path `src/lib/systemOverview.ts`
→ FAIL (ไฟล์ไม่อยู่จริง) · รันกับ #165 (`c00c0d9`) → PASS

## สรุป

**สถานะ *merged* บน GitHub ≠ โค้ดลงจริง** เมื่อ squash + branch ซ้ำ — ยืนยัน diff ทุกครั้ง ไม่เชื่อสถานะเขียวอย่างเดียว
