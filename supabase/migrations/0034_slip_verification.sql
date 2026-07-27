-- =====================================================
-- CEO AI Thailand — ตรวจสลิปกับ record ธนาคารจริงผ่าน SlipOK (ปิดช่องโหว่ "อัปรูปมั่วก็เปิดฟรี")
-- เพิ่มคอลัมน์ให้ payment_submissions เก็บผลตรวจ + กันสลิปซ้ำระดับ DB (trans_ref unique)
-- การเปิดแพ็กย้ายไปฝั่ง server (edge function verify-slip, service-role) — client ไม่เปิดเองอีกเมื่อ slipOkLive
-- =====================================================

alter table public.payment_submissions
  add column if not exists trans_ref     text,           -- เลขอ้างอิงธุรกรรมจาก SlipOK (กันสลิปซ้ำ)
  add column if not exists sender         text not null default '',  -- ชื่อผู้โอน (จากสลิป)
  add column if not exists verified_at    timestamptz,    -- เวลาที่ผ่านการตรวจ SlipOK
  add column if not exists verify_method  text not null default ''; -- 'slipok' | 'manual' | ''

-- กันสลิปซ้ำระดับฐานข้อมูล: 1 transRef ใช้เปิดแพ็กได้ครั้งเดียว (ค่า null = ยังไม่ตรวจ ไม่ติด unique)
create unique index if not exists ps_trans_ref_uidx
  on public.payment_submissions (trans_ref)
  where trans_ref is not null;
