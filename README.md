# لوحة تحكم المهام — Task Dashboard

لوحة تحكم متكاملة لإدارة المهام والمشاريع والعادات اليومية، مربوطة بـ Google Sheets كقاعدة بيانات.

## المميزات

- إحصائيات فورية: مكتملة، قيد التنفيذ، متأخرة، ساعات العمل
- رسوم بيانية: دائري، شريطي، نسبة إنجاز دائرية
- مصفوفة أيزنهاور لتصنيف الأولويات
- إضافة، تعديل، حذف المهام مع حفظ فوري في Google Sheets
- تتبع العادات الأسبوعية
- ملخص مشاريع العمل الحر
- تصميم داكن RTL بالكامل بالعربية

## المتطلبات

- Node.js 18+
- Google Cloud Service Account مع صلاحيات Google Sheets API
- Google Spreadsheet مشارَك مع service account

---

## النشر على Railway

### 1. إعداد Google Credentials

1. افتح [Google Cloud Console](https://console.cloud.google.com)
2. فعّل **Google Sheets API**
3. أنشئ **Service Account** وحمّل ملف `credentials.json`
4. شارك الـ Spreadsheet مع البريد الإلكتروني للـ Service Account

### 2. تحويل credentials.json إلى متغير بيئة

في Terminal أو PowerShell:

```bash
# Linux/Mac
cat credentials.json | tr -d '\n'

# Windows PowerShell
(Get-Content credentials.json -Raw) -replace "`r`n",'' -replace "`n",''
```

انسخ الناتج — ستحتاجه في الخطوة التالية.

### 3. النشر على Railway

1. ادخل [railway.app](https://railway.app) وسجّل الدخول
2. اضغط **New Project → Deploy from GitHub repo**
3. اختر هذا الـ repository
4. اذهب إلى **Variables** وأضف:

| المتغير | القيمة |
|---------|--------|
| `GOOGLE_CREDENTIALS` | محتوى credentials.json (سطر واحد) |
| `SPREADSHEET_ID` | معرّف الـ Spreadsheet من رابطه |

5. Railway سيكتشف `package.json` ويشغّل `npm start` تلقائياً
6. من **Settings → Networking** اضغط **Generate Domain**

### 4. إعداد الأوراق

بعد النشر، أرسل POST request لإنشاء الأوراق:

```bash
curl -X POST https://your-app.railway.app/api/setup
```

---

## التشغيل المحلي

```bash
# استنسخ المشروع
git clone https://github.com/YOUR_USERNAME/task-dashboard.git
cd task-dashboard

# ثبّت الحزم
npm install

# أنشئ ملف .env
cp .env.example .env
# عدّل .env وأضف GOOGLE_CREDENTIALS و SPREADSHEET_ID

# شغّل السيرفر
npm start
```

افتح [http://localhost:3000](http://localhost:3000)

---

## هيكل المشروع

```
task-dashboard/
├── server.js          # Express API + Google Sheets integration
├── public/
│   └── index.html     # لوحة التحكم (SPA)
├── .env.example       # نموذج متغيرات البيئة
├── .gitignore
└── package.json
```

## API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/tasks` | جلب جميع المهام |
| POST | `/api/tasks` | إضافة مهمة |
| PATCH | `/api/tasks/:row` | تعديل مهمة |
| DELETE | `/api/tasks/:row` | حذف مهمة |
| GET | `/api/projects` | جلب المشاريع |
| GET | `/api/habits` | جلب العادات |
| POST | `/api/setup` | إنشاء الأوراق |
