# คำขอตั้งค่าระบบ — UGT Metal Inspection System (`ugt-metal-inspection`)

> **เอกสารส่งต่อทีม Admin / DevOps** · สร้างเมื่อ 2026-08-13
> ผู้ขอ: pakorn.worakarn@gmail.com · โปรเจค: https://github.com/pakornkub/TSL-AI
> ทำเสร็จแล้วกรุณา**กรอกหัวข้อสุดท้าย "ค่าที่ต้องส่งกลับ" แล้วส่งไฟล์นี้คืน**ทีมพัฒนา
>
> **หมายเหตุสำคัญ**: ระบบนี้เป็น 3 service ใน repo เดียว (frontend Next.js,
> backend Express+Prisma, ai-service Python FastAPI) — deploy 1 ครั้งขึ้น 3
> container (frontend/backend/ai-service) **SQL Server ใช้ server ที่มีอยู่แล้ว
> ขององค์กร ไม่ได้รันเป็น container ใน compose นี้** — ต้องขอ database เปล่า 2
> ตัว (prod/dev) จาก DBA/admin ก่อน (ข้อ 4) แล้วส่ง connection string กลับมา —
> backend จะ push ตาราง + seed ข้อมูลเข้าไปเองหลังจากนั้น (ไม่ต้องสร้างตารางมือ)
>
> ชื่อทุกตัวในเอกสารนี้ถูก generate ให้ตรงกับค่าที่ตั้งไว้ในโปรเจคแล้ว —
> **กรุณาใช้ชื่อตามนี้เป๊ะ ๆ** (ต่างแม้ตัวเดียว pipeline จะไม่ทำงาน)

## ภาพรวม 1 นาที — ต้องทำอะไรบ้าง

| # | ระบบ | งาน | ใช้เวลาโดยประมาณ |
| --- | --- | --- | --- |
| 1 | Jenkins | สร้าง credentials 2 ตัว + Pipeline job 2 อัน (prod/dev แยกกัน) + webhook + จัดสรร port 6 ช่อง (3 prod + 3 dev) | ~20 นาที |
| 2 | SonarQube | สร้าง 2 projects + ผูก Quality Gate + webhook | ~10 นาที |
| 3 | Server | เตรียม `/home/docker02/appdata` (server นี้ใช้ path นี้แทน `/srv/appdata` มาตรฐาน — ดูเหตุผลในข้อ 3) | ~5 นาที |
| 4 | Database | สร้าง database เปล่า 2 ตัว (prod/dev) บน SQL Server ที่มีอยู่แล้ว + ส่ง connection string กลับ | ~10 นาที |

<!-- ไม่มี Sentry / ไม่มี SSO (Keycloak) ในโปรเจคนี้ — ตัดหัวข้อทิ้งแล้ว -->

---

## 1. Jenkins

### 1.1 สร้าง Credentials (Manage Jenkins → Credentials → Global)

| ชื่อ credential (ID) | ชนิด | ใส่อะไร |
| --- | --- | --- |
| `env-ugt-metal-inspection` | **Secret file** | ไฟล์ `.env` ของ **prod** (ทีมพัฒนาแนบให้ / นัดส่งช่องทางปลอดภัย) |
| `env-ugt-metal-inspection-dev` | **Secret file** | ไฟล์ `.env` ของ **dev** — ห้ามใช้ไฟล์เดียวกับ prod (คนละ DATABASE_URL คนละรหัสผ่าน) |

`nvd` (NVD API key สำหรับ OWASP scan) ถ้า Jenkins server นี้เคยตั้งโปรเจคอื่นแล้ว
ไม่ต้องสร้างซ้ำ — ใช้ตัวเดิม

### 1.2 สร้าง Pipeline job — **2 job แยกกัน ไม่ใช่ Multibranch**

สร้าง **Pipeline job ธรรมดา 2 อัน** อันละ branch (ไม่ใช้ Multibranch Pipeline ที่
auto-discover ทุก branch):

**Job 1 — prod:**

1. New Item → ชื่อ `ugt-metal-inspection` → เลือก **Pipeline**
2. Build Triggers → เปิด **"GitHub hook trigger for GITScm polling"**
3. Pipeline → Definition: **"Pipeline script from SCM"** → SCM: **Git** →
   Repository URL: `https://github.com/pakornkub/TSL-AI` →
   **Branches to build: `*/main`** → Script Path: `Jenkinsfile`
4. **สำคัญ**: ปิด "Lightweight checkout" (ถ้าเปิดไว้ stage แรกจะพัง)

**Job 2 — dev:** ทำซ้ำข้อ 1-4 เหมือนกันทุกอย่าง ยกเว้น:

- ชื่อ job: `ugt-metal-inspection-dev`
- **Branches to build: `*/develop`**

Jenkinsfile ไม่ต้องแก้อะไร — โค้ดตรวจ branch ด้วย
`env.BRANCH_NAME ?: env.GIT_BRANCH?.tokenize('/')?.last()` ซึ่งรองรับทั้ง
Multibranch (`BRANCH_NAME`) และ Pipeline job ธรรมดาแบบนี้ (`GIT_BRANCH` เช่น
`origin/main`) อยู่แล้ว

### 1.3 ตั้ง Webhook ที่ GitHub repo

- Settings → Webhooks → Add: URL `http://__JENKINS_HOST__:8080/github-webhook/` · event: **push เท่านั้น**
- webhook อันเดียวใช้ร่วมกันได้ทั้ง 2 job — GitHub ยิง event นี้ทีเดียว Jenkins
  จะส่งต่อให้ทุก job ที่เปิด "GitHub hook trigger" ไว้เอง (แต่ละ job เช็คเองว่า
  push เข้า branch ที่ตัวเองดูแลไหมก่อนจะ build จริง)

### 1.4 จัดสรร host port

เฉพาะ **frontend** ถูกเข้าถึงผ่านโดเมน (ข้อ 1.5) — backend/ai-service
คุยกันภายใน docker network เท่านั้น แต่ยัง publish host port ไว้ด้วยเพื่อ debug/LAN
access ตรง ๆ จาก iPad ในโรงงาน (กล้อง/QR ต้องการเข้าเร็ว ไม่ผ่าน proxy กลาง)

| Service | Env var | ค่า default ในโค้ด | ค่าจริงที่ใช้ (ตั้งไว้แล้วใน `.env`/`.env.dev`) |
| --- | --- | --- | --- |
| Frontend (prod) | `FRONTEND_PORT` | 3100 | **3022** |
| Backend (prod) | `BACKEND_PORT` | 3101 | **3023** |
| AI service (prod) | `AI_PORT` | 8000 | **3024** |
| Frontend (dev) | `FRONTEND_PORT` | 3110 | **3025** |
| Backend (dev) | `BACKEND_PORT` | 3111 | **3026** |
| AI service (dev) | `AI_PORT` | 8010 | **3027** |

(SQL Server ไม่มีในตารางนี้แล้ว — ใช้ server ที่มีอยู่แล้ว ไม่ได้ publish port ผ่าน compose นี้)

ถ้า port ทั้ง 6 ช่องข้างต้นชนกับระบบอื่นบน server เดียวกัน แจ้งกลับด่วน — ทีมพัฒนาจะ
เปลี่ยนค่าใน `.env` / `.env.dev` (credential ด้านบน) ให้ตรงกับที่จัดสรรจริง

### 1.5 Reverse proxy — nginx บนเซิร์ฟเวอร์อีกตัว (`https://ugtweb.ube.co.th/`)

nginx อยู่คนละเครื่องกับ Docker host ของระบบนี้ จึงต่อกันผ่าน network ปกติ (ไม่ใช่
Docker network ร่วม) — เพิ่ม location block ต่อไปนี้ในเครื่อง nginx โดยชี้ไปที่ IP ของ
เครื่องที่รัน docker compose ของระบบนี้:

```nginx
location /ugt-metal-inspection {
    proxy_pass http://__APP_SERVER_IP__:3022;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ugt-metal-inspection-dev {
    proxy_pass http://__APP_SERVER_IP__:3025;
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
| `ugt-metal-inspection` | UGT Metal Inspection System |
| `ugt-metal-inspection-dev` | UGT Metal Inspection System (Dev) |

โปรเจคนี้มี 3 ภาษา (TypeScript ×2, Python) วิเคราะห์รวมกันเป็น 1 SonarQube project
ต่อ environment — ไม่ต้องตั้งอะไรพิเศษ SonarQube จัดการ multi-language เองอัตโนมัติ

### 2.2 ผูก Quality Gate

- ใช้ gate มาตรฐานองค์กร (ถ้ายังไม่มี ดูภาคผนวก) → assign ให้**ทั้งสอง** projects ข้างบน

### 2.3 Webhook กลับไป Jenkins (Administration → Configuration → Webhooks)

- URL: `http://__JENKINS_HOST__:8080/sonarqube-webhook/`
- **ถ้าไม่ตั้งข้อนี้ pipeline จะค้างตลอดไป** ที่ขั้นรอผล Quality Gate

---

## 3. Server — persistent data path

> **สำคัญมาก**: คำสั่งข้างล่างต้องรันบน **Docker host จริง** เท่านั้น —
> **ไม่ใช่** เข้าไปรันข้างใน Jenkins container เอง (เช่นผ่าน `docker exec -it
> jenkins bash`) เพราะ Jenkins รันอยู่ใน container ของตัวเองแยกจาก host แต่คุย
> กับ Docker daemon ของ host ผ่าน `docker.sock` (Docker-outside-of-Docker)

> **⚠ เบี่ยงจากมาตรฐานองค์กร (เฉพาะ server นี้)**: ปกติ path มาตรฐานคือ
> `/srv/appdata/...` แต่ server นี้ (`docker02`) ติดตั้ง Docker ผ่าน **Snap**
> ซึ่ง AppArmor confinement ของ snap docker บล็อกไม่ให้เข้าถึง `/srv` ได้เลย
> (อนุญาตแค่ `$HOME`/`/mnt`/`/media`) — เจอ error `read-only file system` ทั้งที่
> filesystem จริงเขียนได้ปกติ (พิสูจน์แล้วด้วย `docker run -v /srv/...` fail
> แต่ `sudo touch` ตรง ๆ ผ่าน — เจอมาแล้วจริงตอนทดสอบ) จึงใช้
> **`/home/docker02/appdata/...`** แทนบน server นี้โดยเฉพาะ — รายละเอียดเต็ม →
> `docs/project-context/troubleshooting.md` + `decisions.md`
>
> **แก้ที่ต้นเหตุจริง ๆ (แนะนำถ้ามีเวลา)**: ถอด snap docker ออกแล้วติดตั้ง
> `docker-ce` ตามคู่มือทางการแทน (https://docs.docker.com/engine/install/ubuntu/)
> จะได้ใช้ `/srv/appdata` ตามมาตรฐานองค์กรได้ปกติเหมือนโปรเจคอื่น ไม่ผูกกับ
> user account `docker02` เฉพาะเจาะจงแบบนี้

Deploy stage สร้าง path ย่อยเองอัตโนมัติ (idempotent) — path ฐาน
(`/home/docker02/appdata`) มีอยู่แล้ว (owner `docker02` เอง จึงไม่ต้อง `chown`
เพิ่ม เพราะ Jenkins agent รันคำสั่งในฐานะ user เดียวกันนี้อยู่แล้ว)

ข้อมูลที่ persist ข้าม deploy ใต้ path นี้ (ทุก path ต้องเป็น **absolute path บน
host จริง** — ห้ามใช้ relative path ในทุก compose ไฟล์ ด้วยเหตุผลเดียวกับข้อบนสุด):

| อะไร | prod | dev | ใครเติมข้อมูล |
| --- | --- | --- | --- |
| `uploads` (รูปที่ inspector อัปโหลด) | `/home/docker02/appdata/ugt-metal-inspection/uploads` | `/home/docker02/appdata/ugt-metal-inspection-dev/uploads` | แอปเขียนเอง อัตโนมัติ |
| `models` (โมเดล YOLO ที่เทรนแล้ว) | `/home/docker02/appdata/ugt-metal-inspection/models` | `/home/docker02/appdata/ugt-metal-inspection-dev/models` | **ทีมพัฒนา/ML ต้องเอาไฟล์ `.pt`/`.onnx` ไปวางเอง** (ไฟล์นี้ไม่อยู่ใน git — `.gitignore` กันไว้เพราะไฟล์ใหญ่) |

Deploy stage สร้างแค่โฟลเดอร์เปล่าให้ทั้งสอง path (`mkdir -p`) — **`models` จะว่าง
เปล่าจนกว่าจะมีคนเอาไฟล์โมเดลจริงไปวาง และนั่นเป็นปัญหาจริง ไม่ใช่แค่เตือนเฉย ๆ**:
compose ตั้ง `AI_MOCK: "false"` ตายตัว ai-service จะพยายามโหลดโมเดลจริงจาก
`MODEL_PATH` (`models/box_lock_model.pt`) **ทันทีตอน container start** ถ้าไม่เจอ
ไฟล์ → `FileNotFoundError` → container **crash ทันทีตั้งแต่ก่อนเริ่ม serve**
(ไม่ fallback ไป mock ให้เองอัตโนมัติ) แล้ว restart วนตาม `restart:
unless-stopped` ไปเรื่อย ๆ ไม่มีวันขึ้น healthy — **ต้องเอาไฟล์โมเดล (`.pt`/
`.onnx`) ไปวางใน path ข้างบนก่อน deploy ครั้งแรกเสมอ** ไม่งั้น ai-service (และ
backend ที่ depends_on รอมันอยู่) จะไม่มีวัน healthy — SQL Server ไม่เกี่ยวกับ
path เหล่านี้เลยเพราะไม่ได้รันเป็น container ในระบบนี้ (ดูข้อ 4)

**Docker network**: ทุก container (prod และ dev) ต่อ external network ชื่อ
`proxy-network` — ต้องมีอยู่แล้วบน Docker host **ก่อน** deploy ครั้งแรก ไม่งั้น
`docker compose up` fail ทันที (compose ไม่สร้าง network นี้เอง) ถ้ายังไม่มี:
`docker network create proxy-network`

---

## 4. Database — สร้าง database เปล่าบน SQL Server ที่มีอยู่แล้ว (ครั้งเดียวต่อ environment)

ระบบนี้**ไม่รัน SQL Server เป็น container เอง** — เชื่อมต่อ SQL Server instance
ที่องค์กรมีอยู่แล้ว ขอให้ DBA/admin สร้าง database เปล่า 2 ตัว (**คนละตัวกัน**
prod/dev ห้ามใช้ตัวเดียวกัน) แล้วส่ง connection string กลับมา:

```sql
CREATE DATABASE UGT_MetalInspection;      -- prod
CREATE DATABASE UGT_MetalInspection_DEV;  -- dev
```

จากนั้น backend จะ push ตาราง + seed ข้อมูลเข้าไปเองทุกครั้งที่ container start
(`prisma db push && prisma db seed`, ทำซ้ำได้ไม่พัง) — **ไม่ต้องสร้างตาราง/คอลัมน์
มือ** ชื่อตาราง/คอลัมน์ทั้งหมดปรับเป็น PascalCase ตาม MSSQL convention แล้ว
(`BoxTypes`, `BoxInspections` และคอลัมน์อย่าง `LotNo`, `CaseNo`, `CreatedAt`) —
API response ยังส่งกลับเป็น snake_case เหมือนเดิม (`lot_no`) ไม่กระทบ frontend

Login ที่ backend ใช้ต้องมีสิทธิ์ระดับ `db_owner` (หรือเทียบเท่า: CREATE/ALTER
TABLE, INSERT/UPDATE/DELETE/SELECT) บน database ทั้งสองตัวนี้ — เพราะ
`prisma db push` แก้โครงสร้างตารางเองตอน deploy

---

## ✅ ค่าที่ต้องส่งกลับให้ทีมพัฒนา (กรอกแล้วส่งไฟล์นี้คืน)

| ค่า | มาจากไหน | กรอกตรงนี้ |
| --- | --- | --- |
| **→ Port ทั้ง 6 ช่องข้อ 1.4** | ยืนยันว่า 3022–3027 ไม่ชนกับระบบอื่นบน server | ตั้งไว้แล้วใน `.env`/`.env.dev` — รอยืนยันไม่ชน |
| **→ `__APP_SERVER_IP__` ข้อ 1.5** | IP ของเครื่องที่รัน docker compose ระบบนี้ | **จำเป็น — สำหรับตั้ง nginx proxy_pass** |
| **→ `DATABASE_URL` prod (ข้อ 4)** | host/port/database/user/password ของ SQL Server จริง | ค่าใส่ไว้แล้วใน `.env` ที่ root (`10.1.0.22`, database `UGT_MetalInspection`) — **รอยืนยันจาก DBA ว่า database นี้สร้างแล้วจริง** |
| **→ `DATABASE_URL` dev (ข้อ 4)** | เหมือนกันแต่ database=UGT_MetalInspection_DEV | ค่าใส่ไว้แล้วใน `.env.dev` ที่ root — รอยืนยันเช่นกัน |
| ยืนยัน Jenkins job ทั้ง 2 อันสร้างแล้ว | ลิงก์ job prod + dev | |
| ยืนยัน SonarQube projects + webhook แล้ว | ลิงก์ project | |
| ยืนยัน `/home/docker02/appdata` เตรียมแล้ว **บน host จริง** (ไม่ใช่ใน Jenkins container) | — | |
| ยืนยันวางไฟล์โมเดล (`.pt`/`.onnx`) แล้วทั้ง prod/dev | — | **จำเป็น — ai-service ไม่ขึ้น healthy ถ้าไม่มี** |
| ยืนยัน nginx location block ตั้งแล้วทั้ง prod/dev | — | |

## เช็คก่อนปิดงาน (ฝั่ง Admin)

- [ ] ชื่อทุกตัวตรงกับตารางเป๊ะ (โดยเฉพาะ credential ID)
- [ ] webhook ทั้งสองฝั่ง (GitHub→Jenkins, SonarQube→Jenkins) ตั้งแล้ว
- [ ] กรอก "ค่าที่ต้องส่งกลับ" แล้ว
- [ ] ยืนยัน port 3022–3027 ไม่ชนกับระบบอื่นบน server
- [ ] nginx location block ทั้ง `/ugt-metal-inspection` และ `/ugt-metal-inspection-dev` ตั้งแล้ว ทดสอบเข้าได้จริง
- [ ] `UGT_MetalInspection` (prod) และ `UGT_MetalInspection_DEV` (dev) สร้างแล้วบน SQL Server `10.1.0.22`
- [ ] `proxy-network` มีอยู่แล้วบน Docker host (`docker network ls | grep proxy-network`)
- [ ] `/home/docker02/appdata` เตรียมบน **host จริง** (ไม่ใช่ข้างใน Jenkins container) — เช็คว่า `ls -la /home/docker02/appdata` รันบน host เจอจริง
- [ ] ไฟล์โมเดล (`.pt`/`.onnx`) วางไว้แล้วที่ `/home/docker02/appdata/ugt-metal-inspection(-dev)/models` ทั้ง prod/dev — ไม่งั้น ai-service ไม่มีวัน healthy

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
- โปรเจคอื่นบน server ที่ใช้ Docker แบบทางการ (`docker-ce`, ไม่ใช่ snap):
  `sudo mkdir -p /srv/appdata && sudo chown jenkins:jenkins /srv/appdata`
  (server `docker02` นี้ใช้ snap docker — ใช้ `/home/docker02/appdata` แทน
  ตามข้อ 3 ด้านบน ไม่ต้อง chown เพราะ user เดียวกับที่ Jenkins agent รันอยู่แล้ว)
