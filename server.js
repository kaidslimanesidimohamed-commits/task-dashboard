const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

console.log('CREDENTIALS TYPE:', typeof process.env.GOOGLE_CREDENTIALS);
console.log('SPREADSHEET_ID:', process.env.SPREADSHEET_ID || '(using hardcoded)');
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ضمان UTF-8 في جميع ردود JSON — يحل مشكلة ???? على Windows
app.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(Buffer.from(JSON.stringify(body), 'utf8'));
  };
  next();
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1opb9YsEQEOf-FaMdmX-v1bXV63i8Qnt17XIp7dUmce8';

let auth;
if (process.env.GOOGLE_CREDENTIALS) {
  const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} else {
  auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheets() {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'المهام'!A2:F",
    });
    res.json({ data: response.data.values || [] });
  } catch (err) {
    console.error('[GET /api/tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  try {
    const sheets = await getSheets();
    const { values } = req.body;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "'المهام'!A:F",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// PATCH /api/tasks/:row
// body: { values: [...] } لتحديث صف كامل، أو { col, value } لتحديث خلية واحدة
app.patch('/api/tasks/:row', async (req, res) => {
  try {
    const sheets = await getSheets();
    const row = parseInt(req.params.row); // رقم الصف في الشيت (2 = أول مهمة)
    const { col, value, values } = req.body;

    const range = values
      ? `'المهام'!A${row}:F${row}`
      : `'المهام'!${col}${row}`;

    const requestBody = values
      ? { values: [values] }
      : { values: [[value]] };

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// GET /api/projects
app.get('/api/projects', async (req, res) => {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'المشاريع'!A2:E",
    });
    res.json({ data: response.data.values || [] });
  } catch (err) {
    console.error('[GET /api/projects]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// GET /api/habits
app.get('/api/habits', async (req, res) => {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'العادات'!A2:I",
    });
    res.json({ data: response.data.values || [] });
  } catch (err) {
    console.error('[GET /api/habits]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// GET & POST /api/setup — ينشئ الأوراق مع headers إذا لم تكن موجودة
async function handleSetup(req, res) {
  try {
    const sheets = await getSheets();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheets = meta.data.sheets.map(s => s.properties.title);

    const sheetsConfig = [
      {
        name: 'المهام',
        headers: ['العنوان', 'الحالة', 'الأولوية', 'الموعد النهائي', 'المشروع', 'الساعات'],
      },
      {
        name: 'المشاريع',
        headers: ['اسم المشروع', 'العميل', 'الحالة', 'الإيرادات', 'تاريخ البدء'],
      },
      {
        name: 'العادات',
        headers: ['العادة', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الهدف اليومي'],
      },
    ];

    const requests = [];
    const headersToAdd = [];

    for (const sc of sheetsConfig) {
      if (!existingSheets.includes(sc.name)) {
        requests.push({
          addSheet: { properties: { title: sc.name } },
        });
        headersToAdd.push(sc);
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests },
      });
    }

    for (const sc of headersToAdd) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sc.name}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [sc.headers] },
      });
    }

    res.json({ success: true, created: headersToAdd.map(s => s.name) });
  } catch (err) {
    console.error('[/api/setup]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
}

app.get('/api/setup', handleSetup);
app.post('/api/setup', handleSetup);

// DELETE /api/tasks/:row — يحذف الصف كاملاً من ورقة المهام
app.delete('/api/tasks/:row', async (req, res) => {
  try {
    const sheets = await getSheets();
    const row = parseInt(req.params.row); // رقم الصف (1-based: 2 = أول مهمة)

    // نجلب sheetId الخاص بورقة المهام
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets.find(s => s.properties.title === 'المهام');
    if (!sheet) return res.status(404).json({ error: 'ورقة المهام غير موجودة' });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: row - 1, // 0-based: صف 2 → index 1
              endIndex: row,
            },
          },
        }],
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/tasks]', err.message, err.stack);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على http://localhost:${PORT}`);
  console.log('📊 لوحة التحكم جاهزة');
});
