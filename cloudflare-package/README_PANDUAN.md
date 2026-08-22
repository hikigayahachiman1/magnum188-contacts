# MAGNUM188 — Kontak Resmi + Panel Admin

Paket ini menggunakan Cloudflare Pages Functions dan KV. Link asli tidak
ditulis di `index.html`. Admin dapat mengganti link serta status kontak melalui
halaman `/admin/` tanpa membuka menu KV secara manual.

## Isi paket

- `index.html`: halaman kontak publik premium dengan efek kilau, tombol
  Telegram Official dan Channel Telegram yang terpisah, Link Alternatif di
  bagian header, ikon SVG, dan badge tombol grup.
- `groupm188/index.html`: halaman khusus Channel Telegram serta grup resmi
  WhatsApp, Telegram, dan Facebook yang dapat dibuka melalui `/groupm188/`.
- `admin/index.html`: panel admin untuk edit link dan status.
- `functions/api/admin.js`: login, logout, baca, dan simpan konfigurasi.
- `functions/api/contacts.js`: memberikan alias kontak aktif kepada halaman publik.
- `functions/api/duration.js`: interval pembaruan kontak 30 detik.
- `functions/go/[channel].js`: redirect aman berdasarkan daftar domain yang diizinkan.
- `_headers`: aturan no-cache, noindex, dan keamanan halaman admin.

## Struktur GitHub

Jika Cloudflare Root directory Anda adalah `cloudflare-package`, upload isi
paket dengan struktur berikut:

```text
repository/
└── cloudflare-package/
    ├── index.html
    ├── _headers
    ├── groupm188/
    │   └── index.html
    ├── admin/
    │   └── index.html
    └── functions/
        ├── api/
        │   ├── admin.js
        │   ├── contacts.js
        │   └── duration.js
        └── go/
            └── [channel].js
```

Nama `[channel].js` termasuk tanda kurung siku dan tidak boleh diubah.

## Konfigurasi Cloudflare Pages

Gunakan pengaturan build berikut:

| Pengaturan | Nilai |
| --- | --- |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | `cloudflare-package` |

Binding KV pada project Pages:

| Variable name | Namespace |
| --- | --- |
| `CONTACTS` | `magnum188-contacts` |

Tambahkan dua variable bertipe **Secret** untuk environment Production:

| Secret | Ketentuan |
| --- | --- |
| `ADMIN_PASSWORD` | Password panel, minimal 10 karakter; dianjurkan 16+ karakter |
| `SESSION_SECRET` | Teks acak minimal 32 karakter; dianjurkan 64+ karakter |

Jangan menulis kedua secret tersebut di GitHub atau `index.html`. Setelah
menambahkan binding/secret, lakukan deployment baru.

## Menggunakan panel

1. Buka `https://livemagnum188.chat/admin/`.
2. Login menggunakan nilai `ADMIN_PASSWORD`.
3. Ganti link atau ubah tombol Aktif/Nonaktif.
4. Gunakan tombol Tes untuk memeriksa link.
5. Klik Simpan Perubahan.

Perubahan untuk `Channel Telegram`, `Grup WhatsApp`, `Grup Telegram`, dan
`Grup Facebook` juga otomatis digunakan oleh halaman
`https://livemagnum188.chat/groupm188/`.
Tidak diperlukan binding KV atau panel admin tambahan. Halaman memeriksa
pembaruan secara berkala; tombol grup yang dinonaktifkan tidak dapat dibuka.

Panel menyimpan link ke key (`whatsapp`, `telegram`, `telegram_channel`,
`alternative`, dan seterusnya) serta status ke key `status:<channel>`. Data lama
tetap kompatibel: link lama yang sudah terisi dianggap aktif, sedangkan Channel
Telegram dan Link Alternatif baru yang masih kosong dimulai dalam keadaan
nonaktif.

## Domain tujuan yang diizinkan

- WhatsApp: `wa.me`, `api.whatsapp.com`, `pasticuan.me`.
- Telegram: `t.me`, `telegram.me`, `pasticuan.me`.
- Channel Telegram: `t.me`, `telegram.me`, `pasticuan.me`.
- LiveChat: `direct.lc.chat`, `pasticuan.me`.
- Grup WhatsApp: `chat.whatsapp.com`, `pasticuan.me`.
- Grup Telegram: `t.me`, `telegram.me`, `pasticuan.me`.
- Grup Facebook: `facebook.com`, `www.facebook.com`, `pasticuan.me`.
- Link Alternatif: `pasticuan.me`, `shrtl.sbs`, `livemagnum188.chat`,
  `heylink.me`, termasuk versi `www`.

Hanya protokol HTTPS yang diterima. Daftar ini mencegah panel digunakan sebagai
open redirect menuju domain sembarangan.

## Pengujian

- `/admin/` harus menampilkan login.
- Password salah lima kali akan diblokir selama 15 menit untuk alamat IP itu.
- `/api/contacts` hanya menampilkan `/go/...`, bukan link asli.
- Kontak nonaktif harus menghilang/nonaktif pada halaman publik.
- `/go/<channel>` untuk kontak nonaktif harus menghasilkan pesan penolakan.
- `/go/alternative` hanya mengarahkan ke domain alternatif yang diizinkan.
- Sesi admin berakhir otomatis setelah 8 jam.

## Catatan keamanan

- Cookie sesi ditandatangani HMAC dan memakai `HttpOnly`, `Secure`, dan
  `SameSite=Strict`.
- Request perubahan hanya diterima dari origin website yang sama.
- Halaman admin diberi `noindex` dan tidak dihubungkan dari halaman publik.
- Tidak ada sistem yang dapat menyembunyikan URL tujuan setelah pengguna benar-
  benar mengikuti redirect; penyembunyian hanya mencegah URL mentah tertulis di
  source halaman publik.
