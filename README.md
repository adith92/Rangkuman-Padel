# Padel Sport Indonesia

Direktori nasional PBPI, lapangan padel, kontak olahraga, Rekor MURI, serta titik publik TNI AD, AL, dan AU.

## Situs produksi

https://padelsport.vercel.app

## Menjalankan lokal

Karena paket situs dimuat melalui `fetch`, jalankan repository dengan server statis lokal, misalnya:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`. Koneksi internet diperlukan untuk peta jalan Leaflet/OpenStreetMap; mode peta skematik tetap tersedia saat offline.

## Struktur saat ini

- `index.html` — loader produksi
- `bundle/padelsport.gz.b64.*` — paket lengkap situs yang dikompresi dan dibagi menjadi empat bagian
- `vercel.json` — konfigurasi deployment dan security headers

> Data berasal dari sumber publik dan wajib diverifikasi sebelum dipakai untuk surat resmi, kunjungan, atau keputusan operasional.
