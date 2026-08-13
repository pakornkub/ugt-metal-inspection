# คำขอตั้งค่าระบบ — Box Inspection System (`box-inspection`)

> **เอกสารส่งต่อทีม Admin / DevOps** · สร้างเมื่อ 2026-08-13
> ผู้ขอ: pakorn.worakarn@gmail.com · โปรเจค: https://github.com/pakornkub/TSL-AI
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา
>
> **หมายเหตุสำคัญ**: ระบบนี้เป็น 3 service ใน repo เดียว (frontend Next.js,
> backend Express+Prisma, ai-service Python FastAPI) บวก SQL Server ที่รันเอง
> ใน container ของ compose นี้ — ไม่ใช่ DB กลางขององค์กร จึงไม่ต้องขอ DB server
> แยก แต่ deploy 1 ครั้งจะขึ้น 4 container พร้อมกัน (frontend/backend/ai-service/mssql)
> ทีมพัฒนายังต้อง**สร้าง database เปล่าเอง**ก่อนใช้งานจริงครั้งแรก (ข้อ 4) —
> backend จะ push ตาราง + seed ข้อมูลเข้าไปเองหลังจากนั้น (ไม่ต้องสร้างตารางมือ)
>
> ชื่อทุกตัวในเอกสารนี้ถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline จะไม่ทำงาน)

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| # | ระบบ | งาน | ใช้เวลาโดยประมาณ |
| --- | --- | --- | --- |
| 1 | Jenkins | สร้าง credentials 2 ตัว + pipeline job + webhook + จัดสรร port 8 ช่อง (4 prod + 4 dev) | ~20 นาที |
| 2 | SonarQube | สร้าง 2 projects + ผูก Quality Gate + webhook | ~10 นาที |
| 3 | Server | เตรียม `/srv/appdata` (ครั้งแรกของ server เท่านั้น) | ~5 นาที |
| 4 | Database | สร้าง database เปล่า 2 ตัว (prod/dev) บน mssql container | ~5 นาที |

<!-- ไม่มี Sentry / ไม่มี SSO (Keycloak) ในโปรเจคนี้ — ตัดหัวข้อทิ้งแล้ว -->

---

## 1. Jenkins

### 1.1 สร้าง Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID) | ชนิด | ใส่อะไร |
| --- | --- | --- |
| `env-box-inspection` | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย) |
| `env-box-inspection-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ DATABASE_URL คนละรหัสผ่าน) |

`nvd` (NVD API key สำหรับ OWASP scan) ถ้า Jenkins server นี้เคยตั้งโปรเจคอื่นแล้ว
ไม่ต้องสร้างซ้ำ — ใช้ตัวเดิม

### 1.2 สร้าง Pipeline job

1. New Item → ชื่อ `box-inspection` → เลือก **Multibranch Pipeline**
2. Branch Sources → GitHub → repo `https://github.com/pakornkub/TSL-AI` → discover branches `main` และ `develop`
3. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

### 1.3 ตั้ง Webhook ที่ GitHub repo

- Settings → Webhooks → Add: URL `http://__JENKINS_HOST__:8080/github-webhook/` · event: **push เท่านั้น**

### 1.4 จัดสรร host port

เฉพาะ **frontend** ถูกเข้าถึงผ่านโดเมน (ข้อ 1.5) — backend/ai-service/mssql
คุยกันภายใน docker network เท่านั้น แต่ยัง publish host port ไว้ด้วยเพื่อ debug/LAN
access ตรง ๆ จาก iPad ในโรงงาน (กล้อง/QR ต้องการเข้าเร็ว ไม่ผ่าน proxy กลาง)

| Service | Env var | ค่า default ที่โค้ดเสนอไว้ | ต้องยืนยัน/เปลี่ยนไหม |
| --- | --- | --- | --- |
| Frontend (prod) | `FRONTEND_PORT` | 3100 | |
| Backend (prod) | `BACKEND_PORT` | 3101 | |
| AI service (prod) | `AI_PORT` | 8000 | |
| SQL Server (prod) | `DB_PORT` | 1433 | |
| Frontend (dev) | `FRONTEND_PORT` | 3110 | |
| Backend (dev) | `BACKEND_PORT` | 3111 | |
| AI service (dev) | `AI_PORT` | 8010 | |
| SQL Server (dev) | `DB_PORT` | 1443 | |

ถ้า port ชนกับระบบอื่นบน server เดียวกัน แจ้งค่าจริงกลับในหัวข้อ "ค่าที่ต้องส่งกลับ"
ท้ายเอกสาร — ทีมพัฒนาจะใส่ค่านั้นแทนใน `.env` / `.env.dev` (credential ด้านบน)

### 1.5 Reverse proxy — nginx บนเซิร์ฟเวอร์อีกตัว (`https://ugtweb.ube.co.th/`)

nginx อยู่คนละเครื่องกับ Docker host ของระบบนี้ จึงต่อกันผ่าน network ปกติ (ไม่ใช่
Docker network ร่วม) — เพิ่ม location block ต่อไปนี้ในเครื่อง nginx โดยชี้ไปที่ IP ของ
เครื่องที่รัน docker compose ของระบบนี้:

```nginx
location /ugt-metal-inspection {
    proxy_pass http://__APP_SERVER_IP__:3100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ugt-metal-inspection-dev {
    proxy_pass http://__APP_SERVER_IP__:3110;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`__APP_SERVER_IP__` ด้านบนต้องแทนด้วย IP จริงของเครื่องที่รัน docker compose —
กรอกกลับในหัวข้อ "ค่าที่ต้องส่งกลับ" ถ้าทีม dev ยังไม่มีค่านี้ตอนตั้ง nginx

หมายเหตุ: Next.js เองเป็นคนแปะ path prefix `/ugt-metal-inspection` ให้ routes
ทั้งหมดของตัวเอง (compile-time build arg) — nginx **ไม่ต้อง strip prefix** ก่อนส่งต่อ

---

## 2. SonarQube

### 2.1 สร้าง Projects (Administration → Projects → Create)

| Project Key | Display name |
| --- | --- |
| `box-inspection` | Box Inspection System |
| `box-inspection-dev` | Box Inspection System (Dev) |

โปรเจคนี้มี 3 ภาษา (TypeScript ×2, Python) วิเคราะห์รวมกันเป็น 1 SonarQube project
ต่อ environment — ไม่ต้องตั้งอะไรพิเศษ SonarQube จัดการ multi-language เองอัตโนมัติ

### 2.2 ผูก Quality Gate

- ใช้ gate มาตรฐานองค์กร (ถ้ายังไม่มี ดูภาคผนวก) → assign ให้**ทั้งสอง** projects ข้างบน

### 2.3 Webhook กลับไป Jenkins (Administration → Configuration → Webhooks)

- URL: `http://__JENKINS_HOST__:8080/sonarqube-webhook/`
- **ถ้าไม่ตั้งข้อนี้ pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

---

## 3. Server — persistent data path

Deploy stage สร้าง path ย่อยเองอัตโนมัติ (idempotent) แต่ `/srv/appdata` เองต้องมีสิทธิ์
ให้ Jenkins เขียนได้ตั้งแต่ต้น (ครั้งแรกของ server เท่านั้น):

```bash
sudo mkdir -p /srv/appdata && sudo chown jenkins:jenkins /srv/appdata
```

ข้อมูลที่ persist ข้าม deploy ใต้ path นี้: `uploads` (รูปถ่ายกล่องที่ inspector อัปโหลด)
ทั้ง prod (`/srv/appdata/box-inspection/uploads`) และ dev
(`/srv/appdata/box-inspection-dev/uploads`)

ข้อมูล SQL Server เอง **ไม่ได้อยู่ใต้ path นี้** — ใช้ Docker named volume แทน
(`box-inspection-mssql-data` / `box-inspection-mssql-dev-data`) เพราะ mssql image
ต้องการเจ้าของไฟล์เป็น uid ภายใน container เอง ผูกกับ bind mount ของ host เสี่ยงสิทธิ์ผิด
→ **สำรองข้อมูล DB ด้วย `docker exec` + `sqlcmd BACKUP DATABASE`ตามปกติ ไม่ใช่ก็อปปี้ path นี้**

---

## 4. Database — สร้าง database เปล่า (ครั้งเดียวต่อ environment)

mssql container เองสร้างแค่ตัว SQL Server engine เปล่า ๆ ให้ (ยังไม่มี database
`BoxInspection` อยู่ข้างใน) — backend จะ push ตาราง + seed ข้อมูลให้เองทุกครั้งที่
container start (`prisma db push && prisma db seed`, ทำซ้ำได้ไม่พัง) **แต่ตัว
database เปล่าต้องมีอยู่ก่อน** ทีมพัฒนา/admin ต้องสร้างเอง ไม่ให้ Prisma สร้างเองอัตโนมัติ
(เพื่อคุมชื่อ/collation/permission ตามมาตรฐานของทีม)

หลัง `docker compose up -d mssql` (หรือทั้งชุด) ขึ้นแล้ว ต่อด้วย `sqlcmd`/SSMS/Azure
Data Studio ไปที่พอร์ตที่ publish ไว้ (ข้อ 1.4) ด้วยบัญชี `sa` แล้วรัน:

```sql
-- prod (พอร์ต DB_PORT ค่า default 1433) — ชื่อต้องตรงกับ DATABASE_URL ใน .env เป๊ะ ๆ
CREATE DATABASE box_inspection;

-- dev (พอร์ต DB_PORT ค่า default 1443)
CREATE DATABASE box_inspection_dev;
```

ไม่ต้องรีบ — ถ้า backend start ก่อน database ถูกสร้าง มันจะ crash แล้ว restart
วนตาม `restart: unless-stopped` ไปเรื่อย ๆ จนกว่าจะสร้าง database เสร็จแล้วรอบถัดไป
จะผ่านเอง ไม่ต้อง restart container เอง

ชื่อตาราง/คอลัมน์ในนี้ปรับเป็น PascalCase ตาม MSSQL convention แล้ว
(`BoxTypes`, `BoxInspections`) — ยังไม่ได้ปรับชื่อคอลัมน์ (ยังเป็น snake_case
เช่น `lot_no`, `case_no`) เพราะเป็น breaking change กับ API/frontend ที่ใช้ชื่อ
เดียวกันอยู่ — แจ้งได้ถ้าต้องการให้ปรับด้วย

---

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า | มาจากไหน | กรอกตรงนี้ |
| --- | --- | --- |
| **→ Port ทั้ง 8 ช่องข้อ 1.4** | ยืนยันค่า default หรือแจ้งค่าใหม่ถ้าชน | **จำเป็น — ทีมพัฒนาใช้ค่า default ไว้ก่อนจนกว่าจะได้คำยืนยัน** |
| **→ `__APP_SERVER_IP__` ข้อ 1.5** | IP ของเครื่องที่รัน docker compose ระบบนี้ | **จำเป็น — สำหรับตั้ง nginx proxy_pass** |
| ยืนยัน Jenkins job สร้างแล้ว | ลิงก์ job | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |
| ยืนยัน `/srv/appdata` เตรียมแล้ว | — | |
| ยืนยัน nginx location block ตั้งแล้วทั้ง prod/dev | — | |
| ยืนยันสร้าง `box_inspection` + `box_inspection_dev` แล้ว | — | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" แล้ว
- [ ] Port ทั้ง 8 ช่องส่งกลับแล้ว ไม่ใช่แค่ค่า default ที่เสนอไป
- [ ] nginx location block ทั้ง `/ugt-metal-inspection` และ `/ugt-metal-inspection-dev` ตั้งแล้ว ทดสอบเข้าได้จริง
- [ ] `box_inspection` (prod) และ `box_inspection_dev` (dev) สร้างแล้วบน mssql container

---

<!-- ภาคผนวก server-level — ทำเฉพาะถ้าเป็นโปรเจคแรกบน Jenkins server นี้ -->

## ภาคผนวก: ถ้าเป็นโปรเจคแรกบน Jenkins server นี้

- Jenkins plugins: Pipeline, NodeJS, SonarQube Scanner, OWASP Dependency-Check,
  Email Extension, Docker Pipeline
- Manage Jenkins → Tools: `NodeJS-22` (NodeJS installer, v22.x) ·
  `SonarQube-Scanner` (SonarQube Scanner installer) ·
  `Dependency-Check` (OWASP Dependency-Check installer)
- Global credential `nvd` (Secret text) — NVD API key, ใช้ร่วมกันทุกโปรเจค
- Global env vars: `NOTIFY_EMAIL`, `SMTP_FROM`
- SonarQube server ชื่อ `SonarQube` ผูกไว้ใน Manage Jenkins → System → SonarQube servers
- สร้าง org Quality Gate (`new_coverage >= 60`, `new_violations = 0`,
  `new_duplicated_lines_density <= 3`, `new_security_hotspots_reviewed = 100`)
- `sudo mkdir -p /srv/appdata && sudo chown jenkins:jenkins /srv/appdata`
