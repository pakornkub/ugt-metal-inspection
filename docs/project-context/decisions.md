# Decisions — append-only

<!-- มติทุกเรื่อง ยกเว้น design (→ docs/DESIGN.md §10) · append ผ่าน /ugt-handoff
     ห้ามแก้/ลบย้อนหลัง — จะกลับมติ = เพิ่มรายการใหม่อ้างถึงของเก่า -->

- 2026-08-13 ติดตั้ง org-standard CI/CD (Jenkins 10-stage + SonarQube + OWASP +
  Docker) แบบปรับสำหรับ repo 3 service แทนการบังคับให้เป็น Next.js app เดียว
  ตาม template เดิม — **because** โครงสร้างจริงคือ frontend/backend/ai-service
  แยกกัน คนละภาษา คนละ Dockerfile · rejected: รวมเป็น Next.js app เดียวด้วย API
  routes (ต้องเขียนใหม่ทั้ง backend/ai-service ทิ้งของเดิมที่ทำงานอยู่แล้ว)
- 2026-08-13 ไม่ติดตั้งระบบ login/auth — **because** ผู้ใช้ระบุว่าหน้างาน iPad
  ใช้ในไลน์การผลิต ไม่มีการกล่าวถึงระบบสมาชิกใน README เดิม · rejected: SSO/LDAP/Local
  (เพิ่ม friction ให้ inspector หน้างานโดยไม่มีความจำเป็นที่ระบุไว้)
- 2026-08-13 [ยกเลิกโดยรายการถัดไป] ไม่มี basePath — สมมติฐานผิด แก้แล้วในรายการ
  2026-08-13 ถัดมา
- 2026-08-13 มี basePath `/ugt-metal-inspection` (prod) / `/ugt-metal-inspection-dev`
  (dev) เข้าผ่านโดเมนที่เตรียมไว้แล้ว `https://ugtweb.ube.co.th/` — **because**
  ผู้ใช้แจ้งแก้ไขว่ามี nginx เตรียมพร้อมบนเซิร์ฟเวอร์อีกตัว ตั้ง basePath ตามชื่อ
  folder/repo (`ugt-metal-inspection`) · rejected: `proxy-network: external`
  แบบ org template เต็มรูปแบบ (nginx อยู่คนละเครื่องกับ Docker host ของระบบนี้
  ไม่ใช่ container ร่วม docker network เดียวกัน จึงต่อกันด้วย IP:port ผ่าน network
  ปกติแทน — frontend ยัง publish host port ตรงไว้ด้วยสำหรับ iPad บน LAN โรงงาน)
- 2026-08-13 mssql ใช้ Docker named volume ต่อ ไม่ย้ายเป็น bind mount ใต้
  `/srv/appdata` ตามข้อกำหนด org ทั่วไป — **because** official mssql image
  ต้องการเจ้าของไฟล์เป็น uid ภายใน container เอง (10001), bind mount บน host
  เสี่ยง permission ผิดโดยไม่มีเครื่องมือแก้ในสคริปต์นี้ · rejected: bind mount +
  chown อัตโนมัติ (ใช้ได้กับ image ของเราเองที่รู้ uid แน่นอน แต่ไม่ปลอดภัยพอสำหรับ
  image ทางการที่ควบคุม uid เองภายใน) — `uploads` (ข้อมูลของแอปเราเอง) ยังใช้
  bind mount ตามมาตรฐานปกติ
- 2026-08-13 ไม่เพิ่มขั้นตอน `prisma migrate deploy` แยกใน Jenkins Deploy stage —
  **because** โปรเจคนี้ไม่มี `prisma/migrations/` เลย ใช้ `prisma db push` มาตั้งแต่ต้น
  (ทั้ง push และ seed เป็น idempotent, รันอยู่แล้วใน backend container CMD ทุกครั้งที่
  start) · rejected: บังคับสร้างระบบ migration ใหม่ทั้งหมด (นอกขอบเขตงาน "ทำให้ deploy ได้")
- 2026-08-13 เปลี่ยนชื่อตาราง `box_types`→`BoxTypes`, `box_inspection`→`BoxInspections`
  (PascalCasePlural) ใน `backend/prisma/schema.prisma` (`@@map`) — **because**
  ผู้ใช้ขอให้ปรับให้สอดคล้อง MSSQL best practices ก่อนสร้าง database จริงครั้งแรก
  (ยังไม่มีข้อมูลจริง เปลี่ยนตอนนี้ปลอดภัยที่สุด) · rejected: ปรับชื่อคอลัมน์ด้วย
  (เช่น `lot_no`→`LotNo`) — คอลัมน์เหล่านี้เป็น wire format เดียวกับ JSON response
  ที่ frontend ใช้ตรง ๆ (`frontend/lib/api.ts` types) เปลี่ยนจะกระทบ API contract
  ทั้งระบบ นอกขอบเขตที่ขอ (ผู้ใช้พูดถึง "ชื่อตาราง" ไม่ใช่ "ชื่อคอลัมน์") — ทำได้ถ้า
  ต้องการ แต่ต้องคุยแยกเพราะกระทบ frontend ด้วย
- 2026-08-13 database (`box_inspection`/`box_inspection_dev`) ให้ทีมพัฒนา/admin
  สร้างเองล่วงหน้า (มือ, ผ่าน `CREATE DATABASE`) ไม่ปล่อยให้ `prisma db push`
  auto-create — **because** ผู้ใช้ยืนยันต้องการคุมการสร้าง database เป็นขั้นตอน
  ของ admin โดยเฉพาะ (governance/naming) · rejected: ปล่อย auto-create ทั้งหมด
  (เร็วกว่าแต่ผู้ใช้ปฏิเสธไปแล้ว) — ยังคงเชื่อมต่อ mssql container ที่ bundle
  มากับ compose เหมือนเดิม ไม่ได้เปลี่ยนไปใช้ SQL Server ภายนอก
