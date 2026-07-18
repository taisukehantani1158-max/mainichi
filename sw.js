/* 毎日アプリ Service Worker
   目的: オフラインでもアプリ本体が開けるよう、必要ファイルをキャッシュする。
   YouTube 動画など外部リソースはキャッシュせず、都度ネットワークから取得する。 */

const CACHE = "mainichi-cache-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

// インストール時: アプリ本体をキャッシュ
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 有効化時: 古いキャッシュを削除
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 取得時:
//  - 同一オリジンのアプリ資産 → キャッシュ優先（オフライン対応）
//  - それ以外（YouTube等） → ネットワークにそのまま通す
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        // 取得できたアプリ資産は次回のためにキャッシュ更新
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html")))
    );
  }
  // 外部リソースは介入しない（YouTube 埋め込みを妨げない）
});
