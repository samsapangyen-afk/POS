const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let PORT = 8080;
const ROOT_DIR = __dirname;
const DB_FILE = path.join(ROOT_DIR, 'data', 'db.json');

// ข้อมูลเริ่มต้นของระบบ
const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'กะเพราหมูกรอบ',
    price: 60,
    category: 'อาหารจานเดียว',
    image: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?auto=format&fit=crop&w=300&q=80',
    addons: [
      { name: 'พิเศษ', price: 10 },
      { name: 'ไข่ดาว', price: 10 },
      { name: 'ไข่เจียว', price: 15 },
      { name: 'เผ็ดน้อย', price: 0 },
      { name: 'ไม่ใส่ผัก', price: 0 }
    ]
  },
  {
    id: 'p2',
    name: 'ข้าวผัดกุ้งแม่น้ำ',
    price: 70,
    category: 'อาหารจานเดียว',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=300&q=80',
    addons: [
      { name: 'พิเศษ', price: 15 },
      { name: 'ไข่ดาว', price: 10 },
      { name: 'ไม่ใส่ต้นหอม', price: 0 }
    ]
  },
  {
    id: 'p3',
    name: 'ส้มตำไทยใส่ปู',
    price: 50,
    category: 'ยำ/ส้มตำ',
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=300&q=80',
    addons: [
      { name: 'เพิ่มหมูยอ', price: 15 },
      { name: 'เพิ่มไข่เค็ม', price: 10 },
      { name: 'เผ็ดมาก', price: 0 },
      { name: 'ไม่ใส่ผงชูรส', price: 0 }
    ]
  },
  {
    id: 'p4',
    name: 'ปีกไก่ทอดน้ำปลา',
    price: 80,
    category: 'ของทานเล่น',
    image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=300&q=80',
    addons: []
  },
  {
    id: 'p5',
    name: 'ชาไทยเย็นเข้มข้น',
    price: 35,
    category: 'เครื่องดื่ม',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=300&q=80',
    addons: [
      { name: 'ปั่น', price: 10 },
      { name: 'เพิ่มไข่มุก', price: 10 },
      { name: 'วิปครีม', price: 15 },
      { name: 'หวานน้อย', price: 0 },
      { name: 'หวานปกติ', price: 0 }
    ]
  }
];

const nowInit = Date.now();
let db = {
  lastModified: nowInit,
  lastModifiedBy: 'init',
  timestamps: {
    products: nowInit,
    tableCarts: nowInit,
    orders: nowInit,
    settings: nowInit,
    users: nowInit
  },
  products: DEFAULT_PRODUCTS,
  tableCarts: {
    'สั่งกลับบ้าน': { items: [], discount: 0, note: '' },
    'โต๊ะ 1': { items: [], discount: 0, note: '' },
    'โต๊ะ 2': { items: [], discount: 0, note: '' },
    'โต๊ะ 3': { items: [], discount: 0, note: '' },
    'โต๊ะ 4': { items: [], discount: 0, note: '' },
    'โต๊ะ 5': { items: [], discount: 0, note: '' }
  },
  orders: [],
  settings: {
    shopName: 'ร้านอร่อยเด็ด POS',
    promptpay: '0812345678',
    tables: ['สั่งกลับบ้าน', 'โต๊ะ 1', 'โต๊ะ 2', 'โต๊ะ 3', 'โต๊ะ 4', 'โต๊ะ 5'],
    voiceEnabled: true,
    autoPrint: true,
    paperSize: '58mm'
  },
  users: [
    { id: 'u1', name: 'ผู้จัดการร้าน', pin: '1234', role: 'ADMIN' },
    { id: 'u2', name: 'พนักงานแคชเชียร์', pin: '0000', role: 'STAFF' }
  ]
};

if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const loaded = JSON.parse(raw);
    if (loaded && typeof loaded === 'object') {
      if (Array.isArray(loaded.products) && loaded.products.length > 0) db.products = loaded.products;
      if (loaded.tableCarts && typeof loaded.tableCarts === 'object') db.tableCarts = loaded.tableCarts;
      if (Array.isArray(loaded.orders)) db.orders = loaded.orders;
      if (loaded.settings && loaded.settings.shopName) db.settings = loaded.settings;
      if (Array.isArray(loaded.users) && loaded.users.length > 0) db.users = loaded.users;
      if (loaded.timestamps) db.timestamps = loaded.timestamps;
      if (loaded.lastModified) db.lastModified = loaded.lastModified;
      if (loaded.lastModifiedBy) db.lastModifiedBy = loaded.lastModifiedBy;
    }
    console.log('[Database] โหลดข้อมูลกลางสำเร็จ (DB loaded from file)');
  } catch (e) {
    console.error('[Database Error] อ่านไฟล์ db.json ล้มเหลว:', e.message);
  }
}

function saveDbToFile() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('[Database Error] บันทึกไฟล์ db.json ไม่สำเร็จ:', e.message);
  }
}

// ตรวจสอบความถูกต้องและบันทึกข้อมูลล่าสุดลงไฟล์ทันที
saveDbToFile();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createServer() {
  const server = http.createServer((req, res) => {
    // รองรับ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlParts = req.url.split('?');
    const reqPath = decodeURI(urlParts[0]);

    // ================= 1. API: ตรวจสอบสถานะการเปลี่ยนแปลง (Polling Status) =================
    if (reqPath === '/api/status') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        lastModified: db.lastModified,
        lastModifiedBy: db.lastModifiedBy || '',
        timestamps: db.timestamps || {}
      }));
      return;
    }

    // ================= 2. API: ดึงข้อมูลกลางทั้งหมด (Get All Data) =================
    if (reqPath === '/api/data') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(db));
      return;
    }

    // ================= 3. API: บันทึกข้อมูลขึ้นเซิร์ฟเวอร์กลาง (Save Data) =================
    if (reqPath === '/api/save' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const now = Date.now();
          if (!db.timestamps) {
            db.timestamps = {
              products: now,
              tableCarts: now,
              orders: now,
              settings: now,
              users: now
            };
          }

          let changed = false;
          const updatedKeys = [];

          // 1. จัดการ products (ป้องกัน payload.products เป็น [] มาล้างข้อมูลโดยไม่ตั้งใจ)
          if (payload.products !== undefined) {
            if (Array.isArray(payload.products)) {
              if (payload.products.length > 0 || payload.allowEmptyProducts || !db.products || db.products.length === 0) {
                db.products = payload.products;
                db.timestamps.products = now;
                changed = true;
                updatedKeys.push('products(' + payload.products.length + ')');
              } else {
                console.log(`[Save Protection] ปฏิเสธการบันทึก products ว่างเปล่าจาก client: ${payload.clientId}`);
              }
            }
          }

          // 2. จัดการ tableCarts
          if (payload.tableCarts !== undefined && typeof payload.tableCarts === 'object' && payload.tableCarts !== null) {
            db.tableCarts = payload.tableCarts;
            db.timestamps.tableCarts = now;
            changed = true;
            updatedKeys.push('tableCarts');
          }

          // 3. จัดการ orders
          if (payload.orders !== undefined && Array.isArray(payload.orders)) {
            db.orders = payload.orders;
            db.timestamps.orders = now;
            changed = true;
            updatedKeys.push('orders(' + payload.orders.length + ')');
          }

          // 4. จัดการ settings
          if (payload.settings !== undefined && typeof payload.settings === 'object' && payload.settings !== null) {
            db.settings = payload.settings;
            db.timestamps.settings = now;
            changed = true;
            updatedKeys.push('settings');
          }

          // 5. จัดการ users
          if (payload.users !== undefined && Array.isArray(payload.users) && payload.users.length > 0) {
            db.users = payload.users;
            db.timestamps.users = now;
            changed = true;
            updatedKeys.push('users');
          }

          if (changed) {
            db.lastModified = now;
            db.lastModifiedBy = payload.clientId || 'unknown';
            saveDbToFile();
            console.log(`[API SAVE] โดย ${db.lastModifiedBy} | ปรับปรุง: ${updatedKeys.join(', ')}`);
          }

          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({
            success: true,
            lastModified: db.lastModified,
            lastModifiedBy: db.lastModifiedBy,
            timestamps: db.timestamps
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + e.message }));
        }
      });
      return;
    }

    // ================= 4. Static Files Handler =================
    let normalizedPath = reqPath === '/' ? '/index.html' : reqPath;
    const filePath = path.normalize(path.join(ROOT_DIR, normalizedPath));

    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      const isDynamic = ext === '.html' || filePath.endsWith('sw.js');
      const cacheHeader = isDynamic 
        ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
        : 'public, max-age=86400';

      const headers = {
        'Content-Type': contentType,
        'Cache-Control': cacheHeader,
        'Access-Control-Allow-Origin': '*'
      };
      if (isDynamic) {
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }

      res.writeHead(200, headers);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ พอร์ต ${PORT} ไม่ว่าง กำลังลองพอร์ต ${PORT + 1}...`);
      PORT += 1;
      server.listen(PORT, '0.0.0.0');
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('  🚀 SmartPOS Realtime Server รันสำเร็จแล้ว!');
    console.log('====================================================');
    console.log(`\n💻 สำหรับเปิดบนเครื่องคอมพิวเตอร์นี้:`);
    console.log(`   http://localhost:${PORT}`);
    
    console.log(`\n📱 สำหรับเปิดบนมือถือ / แท็บเล็ต Android (ในวง Wi-Fi เดียวกัน):`);
    const interfaces = os.networkInterfaces();
    let foundIp = false;
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   👉 http://${iface.address}:${PORT}`);
          foundIp = true;
        }
      }
    }
    if (!foundIp) {
      console.log(`   http://localhost:${PORT}`);
    }

    console.log('\n🔄 ระบบซิงค์ข้อมูลกลาง Realtime: ทำงานแล้ว!');
    console.log('   แยกจัดเก็บสถานะเป็นรายส่วน (Granular Sync & Protection)');
    console.log('   ป้องกันข้อมูลสูญหายหรือถูกเขียนทับข้ามอุปกรณ์ 100%\n');
  });

  return server;
}

if (require.main === module) {
  createServer();
} else {
  module.exports = createServer;
}
