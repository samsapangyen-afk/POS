// SmartPOS Service Worker (Offline & Online PWA) - Version 10
const CACHE_NAME = 'smartpos-cache-v10';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './libs/tailwind.js',
  './libs/qrcode.min.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ติดตั้ง Service Worker และแคชไฟล์ที่จำเป็น
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets v10');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ล้างแคชเวอร์ชันเก่าเมื่อมีการอัปเดต และเข้าควบคุมหน้าเว็บทันที
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] ลบแคชเวอร์ชันเก่า:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// จัดการ Fetch Request
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. API Call หรือคำขอที่ไม่ใช่ GET / ไม่ใช่ http -> ส่งตรงไปที่ Network เสมอ ห้ามแคช
  if (event.request.method !== 'GET' || !url.startsWith('http') || url.includes('/api/')) {
    return;
  }

  // 2. หน้าหลัก (Navigation / HTML) -> Network First เพื่อให้ผู้ใช้ได้โค้ดและข้อมูลล่าสุดเสมอ หากออฟไลน์จึงดึงจากแคช
  const isHtmlRequest = event.request.mode === 'navigate' || 
                        url.endsWith('/index.html') || 
                        url.endsWith('/') || 
                        event.request.headers.get('accept')?.includes('text/html');

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // หากไม่มีเน็ต (Offline) ดึงจากแคช
          return caches.match(event.request).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // 3. Static Assets (libs, icons, css) -> Cache First พร้อมดึงอัปเดตเบื้องหลัง (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
