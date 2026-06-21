import type { AppData } from './types';

export const DEFAULT_DATA: AppData = {
  stages: [
    {
      id: 's1',
      label: 'ค้นหา',
      title: 'ค้นหาคำตอบ (Trigger)',
      emotion: 'กดดัน — รู้ว่ามีปัญหา แต่ยังไม่รู้ว่าต้องการอะไร',
      touch: [
        "Google: 'วิธีแก้ปัญหาต้นทุนสูง SME'",
        'LinkedIn Article จากที่ปรึกษา',
        'Facebook Group ธุรกิจ / เพื่อนแนะนำ',
        'YouTube: case study ธุรกิจไทย',
      ],
      action: [
        'ค้นหาข้อมูลช่วงดึก หลังเลิกงาน',
        'Save บทความที่ตอบโจทย์ปัญหาตัวเอง',
        'ส่งลิงก์ให้ CFO หรือทีม Ops ดู',
      ],
      pain: [
        'บทความส่วนใหญ่เป็นทฤษฎี ไม่พูดถึงธุรกิจจริงๆ',
        'ไม่รู้ว่าต้องการ consultant หรือแค่ซอฟต์แวร์',
      ],
      opp: [
        'เขียน blog ที่ระบุ industry และขนาดทีมชัดเจน',
        "ทำ 'เช็คลิสต์วินิจฉัยปัญหา' ให้ผู้อ่านทดสอบตัวเอง",
      ],
    },
    {
      id: 's2',
      label: 'พบเรา',
      title: 'พบบริษัทเราครั้งแรก (Discovery)',
      emotion: 'สนใจแต่ยังสงสัย — เจอหลายเจ้าพร้อมกัน',
      touch: [
        'Google Organic (SEO): หน้า Services',
        'LinkedIn Company Page + โพสต์ที่แชร์',
        'Blog / Insight article ที่ rank ใน Google',
        'Lead magnet: E-book หรือ Template ฟรี',
      ],
      action: [
        'อ่านหน้า About และ Services',
        'ดู Case study หรือผลงาน',
        'ตรวจสอบว่าเคยทำ industry เดียวกันไหม',
        'Download E-book หรือ Template ฟรี',
      ],
      pain: [
        'หน้าเว็บพูดถึงบริษัท ไม่ได้พูดถึงปัญหาลูกค้า',
        'ไม่มี case study ที่ตรงกับ industry หรือขนาด',
      ],
      opp: [
        'เปลี่ยน Hero section ให้พูดถึงปัญหาลูกค้าก่อน',
        'เพิ่ม case study แยก tag ตาม industry',
      ],
    },
    {
      id: 's3',
      label: 'ประเมิน',
      title: 'เปรียบเทียบและประเมิน (Consideration)',
      emotion: 'ลังเล — กลัวจ้างแล้วไม่ได้ผล เสียเงินฟรี',
      touch: [
        'หน้า Services + Pricing (ถ้ามี)',
        'Google Reviews / Testimonials',
        'LinkedIn: ดูโปรไฟล์ที่ปรึกษาแต่ละคน',
        'เปรียบเทียบกับ consultant อื่น 2–3 เจ้า',
      ],
      action: [
        'อ่าน testimonial และ review อย่างละเอียด',
        'ถามเพื่อนที่เคยจ้าง consultant',
        'Shortlist เหลือ 2–3 เจ้า',
        'หารือกับหุ้นส่วนหรือ CFO ก่อนติดต่อ',
      ],
      pain: [
        'ไม่มีราคาบนเว็บ ต้องติดต่อก่อนถึงจะรู้',
        'Testimonial กว้างเกินไป ไม่บอกว่าแก้อะไรได้จริง',
      ],
      opp: [
        "เพิ่ม 'ผลลัพธ์ที่ลูกค้า SME ได้รับ' พร้อมตัวเลข",
        'ทำ pricing tier คร่าวๆ เพื่อลด friction',
      ],
    },
    {
      id: 's4',
      label: 'ติดต่อ',
      title: 'ติดต่อครั้งแรก (First Contact)',
      emotion: 'กล้าแล้ว — แต่ยังต้องการความมั่นใจอีกนิด',
      touch: [
        'Contact form บนเว็บ',
        'ส่ง DM ใน LinkedIn',
        'กรอก Form จาก Lead magnet',
        'โทรตรง (พบน้อยกว่า)',
      ],
      action: [
        'กรอก contact form หรือส่ง email',
        'เขียนอธิบายปัญหาสั้นๆ',
        'รอ response — ถ้าช้าจะเสียความสนใจ',
        'Follow up ใน LinkedIn ถ้าไม่มีใครตอบ',
      ],
      pain: [
        'Response time ช้าทำให้ไปคุยกับเจ้าอื่นก่อน',
        'ไม่รู้ว่าควรเตรียมข้อมูลอะไรไปคุย',
      ],
      opp: [
        'ตั้ง auto-reply ทันทีพร้อมบอก timeline',
        "ส่ง 'เตรียมตัวก่อนนัดคุย' guide ทันทีหลังรับ lead",
      ],
    },
    {
      id: 's5',
      label: 'Discovery',
      title: 'Discovery Call / Meeting',
      emotion: 'ตื่นเต้น — อยากรู้ว่าเราจะช่วยได้จริงไหม',
      touch: [
        'Zoom / Teams Meeting (30–60 นาที)',
        'Diagnostic questionnaire ก่อนประชุม',
        'Presentation / Workshop เล็กๆ',
        'Proposal outline เบื้องต้น',
      ],
      action: [
        'เล่าปัญหาและ context ของธุรกิจ',
        'ถามเรื่อง approach และ timeline',
        'ถามเรื่องค่าใช้จ่ายคร่าวๆ',
        'เอาไปคุยต่อกับทีมหรือหุ้นส่วน',
      ],
      pain: [
        'ที่ปรึกษาพูดถึง framework มากเกินไป ไม่ฟัง pain',
        'ไม่รู้ว่าจะได้ผลลัพธ์อะไรชัดเจน',
      ],
      opp: [
        'ใช้ 80% ของเวลาในการถามและฟัง',
        "สรุป 'สิ่งที่เราได้ยิน' ก่อนเสนอ solution",
      ],
    },
    {
      id: 's6',
      label: 'ตัดสินใจ',
      title: 'ตัดสินใจ (Decision)',
      emotion: 'กังวลสูงสุด — ROI ไม่ชัด กลัวเสียเงินเปล่า',
      touch: [
        'Proposal / Scope of Work',
        'Presentation ต่อหุ้นส่วน',
        'Contract + Payment Terms',
        'อ้างอิง reference ลูกค้าเก่า',
      ],
      action: [
        'อ่าน proposal อย่างละเอียด',
        'ขอปรับ scope หรือราคา',
        'ให้ CFO / ทนายตรวจสัญญา',
        'เซ็น + โอนมัดจำ',
      ],
      pain: [
        'Proposal ดู generic เหมือนส่งให้ทุกคน',
        'ROI ไม่ชัดเจน ทำให้ justify กับหุ้นส่วนยาก',
      ],
      opp: [
        'ทำ proposal ที่ใช้ภาษาและตัวเลขของลูกค้า',
        'เพิ่ม ROI scenario หรือ success metric ที่ measurable',
      ],
    },
    {
      id: 's7',
      label: 'ดำเนินงาน',
      title: 'ดำเนินโครงการ (Delivery)',
      emotion: 'ตั้งความหวังสูง — เริ่มนับถอยหลังถึงผลลัพธ์',
      touch: [
        'Kick-off Workshop',
        'รายงานรายเดือน + Dashboard',
        'Monthly check-in call',
        'Deliverable: แผน / Framework / Playbook',
      ],
      action: [
        'เข้าร่วม workshop และ session',
        'ให้ข้อมูลและ access ที่จำเป็น',
        'ติดตาม milestones กับทีมภายใน',
        'นำแผนไป implement',
      ],
      pain: [
        'ทีมภายในไม่มีเวลา implement ตามแผน',
        'ผลลัพธ์เห็นช้า ทำให้ความมั่นใจลดลง',
      ],
      opp: [
        'กำหนด quick win ภายใน 30 วันแรก',
        'Check-in สั้นๆ ทุกสัปดาห์แทนรายงานหนักๆ',
      ],
    },
    {
      id: 's8',
      label: 'รักษา',
      title: 'รักษาความสัมพันธ์ (Retention)',
      emotion: 'พึงพอใจ — พร้อมแนะนำต่อถ้าเราดูแลดีพอ',
      touch: [
        'Quarterly Review',
        'Upsell / ต่อสัญญา',
        'Case study ร่วมกัน',
        'Referral / แนะนำเพื่อน MD',
      ],
      action: [
        'ทบทวนผลลัพธ์กับที่ปรึกษา',
        'แนะนำบริษัทให้ MD คนอื่นใน network',
        'ให้ testimonial หรือ review',
        'ต่อสัญญาในโปรเจกต์ถัดไป',
      ],
      pain: [
        'ความสัมพันธ์ห่างลงหลังโปรเจกต์จบ',
        'ไม่รู้ว่ามีบริการอื่นที่จะช่วยได้อีก',
      ],
      opp: [
        'ส่ง insight ที่เกี่ยวข้องกับธุรกิจเขาทุกเดือน',
        'ชวนเป็น featured case study แลกกับ referral privilege',
      ],
    },
  ],
  personas: [
    {
      name: 'คุณกมล',
      role: 'MD / เจ้าของธุรกิจ · ทีม 30 คน',
      initials: 'KP',
      bg: '#dbeafe',
      tc: '#1e40af',
      quote: '"รู้ว่ามีปัญหา แต่ไม่มีเวลาหาทางแก้ — ต้องการคนที่มาช่วยวางแผนและทำให้เป็นจริงได้"',
      goal: [
        'อยากเห็น revenue growth หรือลดต้นทุนชัดเจน',
        'ต้องการ consultant ที่ลงมือได้จริง',
        'อยากได้ผลลัพธ์เร็ว ไม่อยากรอเป็นปี',
      ],
      fear: [
        'กังวลว่าเสียเงินแล้วไม่ได้ผล',
        'ไม่มีเวลาติดตามงานตลอด',
        'ไม่แน่ใจว่า consultant เข้าใจธุรกิจจริงๆ',
      ],
      search: [
        "Google: 'ที่ปรึกษาธุรกิจ SME ไทย'",
        'LinkedIn article เรื่อง strategy',
        'Podcast / YouTube ธุรกิจ',
      ],
      action: [
        'ตัดสินใจคนเดียวหรือปรึกษาหุ้นส่วน',
        'อ่านรีวิวและดู case study ก่อนติดต่อ',
        'นัด discovery call ในเวลาว่าง',
      ],
    },
    {
      name: 'คุณนภา',
      role: 'CFO / Finance Director · รายงานต่อ MD',
      initials: 'NP',
      bg: '#fef9c3',
      tc: '#854d0e',
      quote: '"ต้องการตัวเลขชัดเจนก่อนอนุมัติงบ — ROI คืออะไร และจะวัดได้อย่างไร?"',
      goal: [
        'Business case ที่ defend ต่อ board ได้',
        'Cost-benefit analysis ละเอียด',
        'Milestone และ payment term ชัดเจน',
      ],
      fear: [
        'ถูกตำหนิถ้าโปรเจกต์ไม่คุ้มค่า',
        'Scope creep ที่ทำให้ต้นทุนเกิน budget',
        'ไม่มี exit clause ถ้างานไม่ได้คุณภาพ',
      ],
      search: [
        'ไม่ค้นหาเอง — รับข้อมูลจาก MD',
        'อ่าน proposal และ contract อย่างละเอียด',
        "อาจค้นหา: 'consultant fee structure B2B'",
      ],
      action: [
        'ตรวจ proposal และ contract ทุกบรรทัด',
        'ขอ reference จากลูกค้าเก่า',
        'เสนอแก้ payment terms ก่อนเซ็น',
      ],
    },
    {
      name: 'คุณธีร์',
      role: 'Operations Manager · ทีม 15 คน',
      initials: 'TP',
      bg: '#dcfce7',
      tc: '#166534',
      quote: '"เป็นคนที่ต้อง implement จริงๆ — ถ้าแผนทำตามไม่ได้จริงในทีม ก็ไม่มีประโยชน์"',
      goal: [
        'Process ที่ทีมทำตามได้จริง',
        'Tool และ template ที่ใช้ได้ทันที',
        'ให้ที่ปรึกษาลงมาคุยกับทีมจริงๆ',
      ],
      fear: [
        'แผนสวยแต่ทำไม่ได้จริงใน operation',
        'ที่ปรึกษาไม่เข้าใจ day-to-day ของทีม',
        'เปลี่ยนแปลงเร็วเกินไปทำให้ทีม resist',
      ],
      search: [
        'ไม่ได้อยู่ในการค้นหาเริ่มต้น',
        'เข้ามาใน loop หลัง MD ตัดสินใจแล้ว',
        "อาจค้นหา: 'OKR template', 'process improvement'",
      ],
      action: [
        'เข้าร่วม kick-off และ workshop',
        'เป็น point of contact หลักระหว่างโปรเจกต์',
        'ทดสอบ framework กับทีมก่อน roll out',
      ],
    },
  ],
  contentPlan: [
    {
      label: 'เดือน 1 — Awareness',
      goal: 'เป้าหมาย: ดึงลูกค้าใหม่จาก Google และ LinkedIn ให้รู้จักเราในฐานะ thought leader ที่เข้าใจ SME จริงๆ',
      cols: [
        {
          hd: 'Blog / SEO (2 บทความ)',
          color: '#1a4f8a',
          items: [
            "'5 สัญญาณที่บอกว่า SME ต้องการ strategy consultant'",
            "'ทำไมโรงงานขนาดกลางถึงขาดทุนโดยไม่รู้ตัว'",
            'Keyword: ที่ปรึกษาธุรกิจ SME, ลดต้นทุนโรงงาน',
          ],
        },
        {
          hd: 'LinkedIn (8 โพสต์)',
          color: '#1c1814',
          items: [
            'Case study mini: สิ่งที่เรียนรู้จากลูกค้า 30 ราย',
            'Insight: ตัวเลขน่าสนใจเกี่ยวกับ SME ไทย',
            'Behind the scene: วิธีทำงานของทีม',
            'Poll: ปัญหาใดที่ทีมคุณเจอบ่อยที่สุด?',
          ],
        },
        {
          hd: 'Lead Magnet (1 ชิ้น)',
          color: '#2d6a4f',
          items: [
            "Template: 'เช็คลิสต์วินิจฉัยปัญหาองค์กร 20 ข้อ'",
            'เก็บ email เพื่อ nurture ต่อ',
            'แจกฟรีบน Landing page + LinkedIn',
          ],
        },
        {
          hd: 'KPI เดือน 1',
          color: '#a05c1a',
          items: [
            'Organic traffic +20%',
            'LinkedIn follower +50',
            'Lead magnet download 30+ ราย',
            'Discovery call request 3–5 ราย',
          ],
        },
      ],
    },
    {
      label: 'เดือน 2 — Nurture',
      goal: 'เป้าหมาย: เปลี่ยน lead ที่รู้จักเราให้เข้าใจว่าเราแก้ปัญหาได้จริง และลด friction ก่อนติดต่อ',
      cols: [
        {
          hd: 'Blog / SEO (2 บทความ)',
          color: '#1a4f8a',
          items: [
            "'เลือก Strategy Consultant อย่างไรไม่ให้เสียเงินเปล่า'",
            'Case study: บริษัทผลิตชิ้นส่วน ลดต้นทุน 18% ใน 90 วัน',
            'Keyword: เปรียบเทียบที่ปรึกษาธุรกิจ',
          ],
        },
        {
          hd: 'Email Nurture (3 ฉบับ)',
          color: '#1c1814',
          items: [
            "ฉบับ 1: ส่ง case study ที่ตรง industry",
            "ฉบับ 2: FAQ — 'ถามมากที่สุดก่อนจ้างเรา'",
            'ฉบับ 3: เชิญ discovery call พร้อม calendar link',
          ],
        },
        {
          hd: 'LinkedIn (8 โพสต์)',
          color: '#2d6a4f',
          items: [
            'Testimonial พร้อม quote จากลูกค้าจริง',
            "'3 คำถามที่ควรถาม consultant ก่อนจ้าง'",
            'Video: walk-through วิธีทำงาน 3 นาที',
            'Repost บทความ engagement สูงจากเดือน 1',
          ],
        },
        {
          hd: 'KPI เดือน 2',
          color: '#a05c1a',
          items: [
            'Email open rate >40%',
            'Case study page view 200+',
            'Discovery call +30% จากเดือน 1',
            'Proposal sent 3+ ชุด',
          ],
        },
      ],
    },
    {
      label: 'เดือน 3 — Convert',
      goal: 'เป้าหมาย: ปิด deal และสร้างระบบที่ทำให้ลูกค้าเก่า refer ลูกค้าใหม่ให้เราต่อเนื่อง',
      cols: [
        {
          hd: 'Sales Content',
          color: '#1a4f8a',
          items: [
            'Proposal template ที่มี ROI scenario ชัดเจน',
            "One-pager: 'ผลลัพธ์ที่ SME ของคุณจะได้รับ'",
            'FAQ สำหรับ CFO / หุ้นส่วน',
          ],
        },
        {
          hd: 'Blog / SEO (1 บทความ)',
          color: '#1c1814',
          items: [
            "'ROI ของการจ้าง Strategy Consultant คำนวณอย่างไร'",
            'Keyword: ค่าที่ปรึกษาธุรกิจ, ROI consultant',
          ],
        },
        {
          hd: 'Retention Content',
          color: '#2d6a4f',
          items: [
            'Monthly insight email สำหรับลูกค้าปัจจุบัน',
            'QBR deck template ที่ช่วยสรุปผลลัพธ์',
            "Referral card: 'แนะนำเพื่อน MD รับ session ฟรี 1 ครั้ง'",
          ],
        },
        {
          hd: 'KPI เดือน 3',
          color: '#a05c1a',
          items: [
            'Proposal-to-close rate >30%',
            'Referral lead 1–2 ราย',
            'Retention rate >80%',
            'MRR growth จาก upsell',
          ],
        },
      ],
    },
  ],
  actions: [
    {
      done: false,
      title: 'ทำ Case Study แยก Industry พร้อมตัวเลขจริง',
      desc: "ลูกค้า SME ไม่เชื่อ testimonial ทั่วไป — ต้องการธุรกิจที่ใกล้เคียงและผลลัพธ์จับต้องได้ เช่น 'ลดต้นทุน 18% ใน 90 วัน สำหรับโรงงานทีม 40 คน'",
      priority: 1,
      nb: '#fdf3f0',
      nt: '#c44b2b',
      tags: [
        { l: 'Impact สูง', c: 't-impact' },
        { l: 'Effort ต่ำ', c: 't-effort' },
        { l: 'ประเมิน', c: 't-stage' },
        { l: 'ตัดสินใจ', c: 't-stage' },
      ],
    },
    {
      done: false,
      title: 'เพิ่ม ROI Calculator บน Proposal',
      desc: 'ช่วงตัดสินใจคือ pain สูงสุด — proposal ที่มีตัวเลข ROI ชัดเจนช่วยลด friction ได้มาก ลูกค้าต้องเอาไป justify กับหุ้นส่วนและ CFO',
      priority: 2,
      nb: '#fdf6ec',
      nt: '#a05c1a',
      tags: [
        { l: 'Impact สูง', c: 't-impact' },
        { l: 'Effort กลาง', c: 't-effort' },
        { l: 'ตัดสินใจ', c: 't-stage' },
      ],
    },
    {
      done: false,
      title: "ตั้ง Auto-reply + 'คู่มือเตรียมตัวก่อนนัดคุย'",
      desc: 'Inbound lead ที่รอ response นานกว่า 4 ชั่วโมงมักเสียความสนใจ ส่ง guide สั้นๆ ทันทีสร้าง trust และช่วยให้ discovery call มีคุณภาพขึ้น',
      priority: 2,
      nb: '#fdf6ec',
      nt: '#a05c1a',
      tags: [
        { l: 'Impact สูง', c: 't-impact' },
        { l: 'Effort ต่ำ', c: 't-effort' },
        { l: 'ติดต่อ', c: 't-stage' },
      ],
    },
    {
      done: false,
      title: "เพิ่ม 'เช็คลิสต์วินิจฉัยปัญหา' บน Blog",
      desc: 'ลูกค้า SME ช่วง Trigger ยังไม่แน่ใจว่าต้องการ consultant — tool ง่ายๆ ที่ช่วย self-qualify เพิ่มโอกาสที่เขาจะติดต่อมาพร้อมความตั้งใจสูง',
      priority: 3,
      nb: '#f5f0e8',
      nt: '#4a453e',
      tags: [
        { l: 'Impact กลาง', c: 't-impact' },
        { l: 'Effort ต่ำ', c: 't-effort' },
        { l: 'ค้นหา', c: 't-stage' },
        { l: 'พบเรา', c: 't-stage' },
      ],
    },
    {
      done: false,
      title: 'กำหนด Quick Win 30 วันแรกใน Onboarding',
      desc: 'ลูกค้าที่เพิ่งเซ็นสัญญาต้องการเห็นผลลัพธ์เร็ว ระบุ deliverable ชิ้นแรกที่จับต้องได้ภายใน 4 สัปดาห์เพื่อรักษา momentum',
      priority: 3,
      nb: '#f5f0e8',
      nt: '#4a453e',
      tags: [
        { l: 'Impact กลาง', c: 't-impact' },
        { l: 'Effort กลาง', c: 't-effort' },
        { l: 'ดำเนินงาน', c: 't-stage' },
      ],
    },
    {
      done: false,
      title: 'สร้าง Referral Program สำหรับ MD Network',
      desc: 'ลูกค้าที่พึงพอใจมี referral intent สูง แต่มักไม่ทำเพราะไม่มี mechanism ง่ายๆ incentive เล็กน้อยหรือ co-case study เปิด loop นี้ได้',
      priority: 3,
      nb: '#f5f0e8',
      nt: '#4a453e',
      tags: [
        { l: 'Impact สูง', c: 't-impact' },
        { l: 'Effort กลาง', c: 't-effort' },
        { l: 'รักษา', c: 't-stage' },
      ],
    },
  ],
  funnel: [
    { stageId: 's1', leads: 10000, note: 'ผู้เข้าชมเนื้อหา / Google Organic' },
    { stageId: 's2', leads: 2500,  note: 'คลิกเข้าเว็บ / อ่านบทความ' },
    { stageId: 's3', leads: 750,   note: 'อ่าน Services / ดู Case Study' },
    { stageId: 's4', leads: 225,   note: 'กรอก Contact Form / ส่ง DM' },
    { stageId: 's5', leads: 135,   note: 'นัด Discovery Call สำเร็จ' },
    { stageId: 's6', leads: 81,    note: 'ได้รับ Proposal / อยู่ระหว่างพิจารณา' },
    { stageId: 's7', leads: 57,    note: 'เซ็นสัญญา เริ่มโปรเจกต์' },
    { stageId: 's8', leads: 40,    note: 'ต่อสัญญา / ลูกค้าประจำ' },
  ],
};
