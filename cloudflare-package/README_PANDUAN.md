# MAGNUM188 — Kontak Resmi + Panel Admin

Paket ini menggunakan Cloudflare Pages Functions dan KV. Link asli tidak
ditulis di `index.html`. Admin dapat mengganti link, nama tampilan, status,
urutan tombol, serta membuat folder laci pilihan link melalui halaman
`/admin.php/` tanpa membuka menu KV secara manual.

## Isi paket

- `index.html`: halaman kontak publik premium dengan efek kilau, tombol
  Telegram Official dan Channel Telegram yang terpisah, Link Alternatif di
  bagian header, serta tombol Download APK M188 dengan ikon Android yang
  tepat di bawah Link Alternatif dan memiliki desain identik, ikon SVG, dan badge tombol grup.
- `groupm188/index.html`: halaman khusus Channel Telegram serta grup resmi
  WhatsApp, Telegram, dan Facebook yang dapat dibuka melalui `/groupm188/`.
- `admin/index.html`: sumber panel admin yang ditampilkan melalui `/admin.php/`.
- `functions/api/admin.js`: login, logout, baca, dan simpan konfigurasi.
- `functions/api/contacts.js`: memberikan alias kontak aktif kepada halaman publik.
- `functions/api/duration.js`: interval pembaruan kontak 30 detik.
- `functions/go/[channel].js`: redirect aman berdasarkan daftar domain yang diizinkan.
- `functions/go/[channel]/[item].js`: redirect aman untuk setiap link di dalam laci.
- `_headers`: aturan no-cache, noindex, dan keamanan halaman admin.
- `_redirects`: menyediakan alamat `/admin.php/` tanpa membutuhkan server PHP
  dan mengalihkan alamat `/admin/` lama ke alamat baru.

## Struktur GitHub

Jika Cloudflare Root directory Anda adalah `cloudflare-package`, upload isi
paket dengan struktur berikut:

```text
repository/
└── cloudflare-package/
    ├── index.html
    ├── _headers
    ├── _redirects
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
            ├── [channel].js
            └── [channel]/
                └── [item].js
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

1. Buka `https://livemagnum188.chat/admin.php/`.
2. Login menggunakan nilai `ADMIN_PASSWORD`.
3. Ganti **Nama tampilan tombol** bila diperlukan.
4. Ganti link atau ubah tombol Aktif/Nonaktif.
5. Susun urutan dengan menggeser nomor kartu atau tombol panah ↑ dan ↓.
6. Pada **Saat tombol diklik**, pilih salah satu:
   - **Buka link langsung** untuk satu tujuan.
   - **Buka folder laci pilihan link** untuk beberapa pilihan.
7. Di bagian **Isi Folder Laci**, tambah/hapus link, ubah nama dan URL, atur
   status, serta susun urutan dengan tombol ↑ dan ↓.
8. Gunakan tombol Tes untuk memeriksa setiap link.
9. Klik Simpan Perubahan.

Urutan berlaku untuk tujuh tombol layanan pada halaman utama. Link Alternatif
tetap berada di kanan atas karena memakai posisi header khusus. Tombol
**Download APK M188** berada tepat di bawah Link Alternatif dalam grup yang sama dan
sebelum tombol WhatsApp. Lebar, tinggi, warna, dan efeknya sama dengan Link Alternatif. Keduanya
tidak ikut pengurutan tombol utama. Halaman
`/groupm188/` otomatis mengikuti urutan relatif dari empat tombol komunitas.

`admin.php` pada alamat tersebut adalah nama jalur yang diproksikan secara
internal oleh Cloudflare Pages. Ini bukan file PHP tradisional karena Pages
Functions berjalan pada Workers runtime. Login dan penyimpanan tetap diproses
di server melalui `/api/admin`.

Perubahan untuk `Channel Telegram`, `Grup WhatsApp`, `Grup Telegram`, dan
`Grup Facebook` juga otomatis digunakan oleh halaman
`https://livemagnum188.chat/groupm188/`.
Tidak diperlukan binding KV atau panel admin tambahan. Halaman memeriksa
pembaruan secara berkala; tombol grup yang dinonaktifkan tidak dapat dibuka.

Panel menyimpan link ke key (`whatsapp`, `telegram`, `telegram_channel`,
`alternative`, `apk_download`, dan seterusnya) serta status ke key `status:<channel>`. Data lama
tetap kompatibel: link lama yang sudah terisi dianggap aktif, sedangkan Channel
Telegram dan Link Alternatif baru yang masih kosong dimulai dalam keadaan
nonaktif.

Nama tampilan disimpan ke `label:<channel>` dan urutan disimpan sebagai JSON ke
`display:order`. Nama maksimal 60 karakter dan selalu ditampilkan sebagai teks
biasa; HTML, tag script, karakter kontrol, serta tanda `<` dan `>` ditolak.

Konfigurasi setiap folder laci disimpan ke `drawer:<channel>`. Pada pemasangan
pertama, kartu **Grup Telegram** di panel disiapkan sebagai laci dengan dua item:
`Grup Telegram Official 1` dan `Grup Telegram Official 2`. Link pertama memakai
URL Grup Telegram lama agar data lama tidak hilang; isi URL kedua lalu aktifkan
statusnya sebelum menyimpan. Tombol lain tetap link langsung, tetapi dapat
diubah menjadi folder laci kapan saja melalui panel.

Panel dapat menambah dan menghapus item secara bebas. Untuk mencegah request
berlebihan atau penyalahgunaan, backend menerapkan batas teknis 50 item per
laci. Hanya item aktif yang ditampilkan kepada member. Tombol induk yang aktif
dan memakai mode laci wajib memiliki minimal satu item aktif.

## Download APK M188

Tombol unduh ditambahkan ke halaman utama (`index.html`) menggunakan nama key
`apk_download`. Link awalnya adalah `https://shrtl.sbs/apkmagnum188`. Link tersebut hanya
dipakai otomatis pada pemasangan awal ketika key `apk_download` **dan**
`status:apk_download` belum ada di KV. Jadi tombol dapat langsung diklik setelah
deploy tanpa melakukan migrasi KV atau menambah Pages Function.

Untuk mengganti link: masuk ke `/admin.php/`, temukan kartu **Download APK M188**,
ubah URL dan bila perlu nama tampilan, lalu klik **Simpan Perubahan**.
Setelah penyimpanan pertama, nilai KV dan status aktif/nonaktif akan selalu
menjadi acuan, termasuk apabila tombol dinonaktifkan. Tombol mengarahkan
pengguna ke link eksternal melalui `/go/apk_download`; file APK **tidak**
disimpan di repo atau disediakan oleh Cloudflare Pages. Keberhasilan unduhan
bergantung pada tujuan akhir link eksternal.

Domain URL baru harus ada di allowlist `apk_download` yang dijaga pada
`functions/api/admin.js` serta dua file `functions/go/` (untuk link langsung
dan laci). Saat ini: `shrtl.sbs`, `pasticuan.me`, `livemagnum188.chat`
(termasuk `www`). Mengubah allowlist memerlukan commit kode, bukan hanya
perubahan di panel.

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
- Download APK M188: `shrtl.sbs`, `pasticuan.me`, `livemagnum188.chat`,
  termasuk versi `www`.

Hanya protokol HTTPS yang diterima. Daftar ini mencegah panel digunakan sebagai
open redirect menuju domain sembarangan.

## Pengujian

- `/admin.php/` harus menampilkan login dan `/admin/` harus dialihkan ke sana.
- Password salah lima kali akan diblokir selama 15 menit untuk alamat IP itu.
- `/api/contacts` hanya menampilkan `/go/...`, bukan link asli.
- Kontak nonaktif harus menghilang/nonaktif pada halaman publik.
- `/go/<channel>` untuk kontak nonaktif harus menghasilkan pesan penolakan.
- `/go/<channel>/<item>` hanya boleh membuka item laci aktif dengan domain yang
  sesuai dengan jenis tombol induknya.
- `/go/alternative` hanya mengarahkan ke domain alternatif yang diizinkan.
- Sesi admin berakhir otomatis setelah 2 jam.

## Catatan keamanan

- Cookie sesi ditandatangani HMAC dan memakai `HttpOnly`, `Secure`, dan
- Nama cookie memakai prefix `__Host-`, sesi maksimum 2 jam, dan setiap sesi
  memiliki ID acak yang berbeda.
- Request perubahan hanya diterima dari origin website yang sama.
- Request login/simpan harus menggunakan JSON, ukuran request dibatasi, dan URL
  tujuan dibatasi maksimal 2.048 karakter.
- Nama dan ID item laci divalidasi; URL asli anak laci tidak dikirim ke halaman
  publik dan hanya diakses melalui redirect server.
- Halaman admin diberi `noindex` dan tidak dihubungkan dari halaman publik.
- Tidak ada sistem yang dapat menyembunyikan URL tujuan setelah pengguna benar-
  benar mengikuti redirect; penyembunyian hanya mencegah URL mentah tertulis di
  source halaman publik.

## Proteksi Cloudflare Access — sangat dianjurkan

Password panel adalah lapisan kedua. Untuk perlindungan utama, buat aplikasi
Self-hosted pada Cloudflare Zero Trust dan izinkan hanya email admin Anda:

1. Lindungi `livemagnum188.chat/admin.php/*`.
2. Lindungi `livemagnum188.chat/api/admin*` dengan kebijakan yang sama.
3. Gunakan login email OTP atau akun Google yang sudah memakai MFA.
4. Gunakan durasi sesi Access 1 jam.
5. Jangan membuat kebijakan `Bypass` untuk kedua jalur tersebut.

Dengan konfigurasi tersebut, orang lain harus melewati Cloudflare Access lebih
dahulu sebelum halaman password panel atau API admin dapat dijangkau.


### Tampilan tombol APK M188 (revisi)
Tombol **DOWNLOAD APK M188** muncul tepat di bawah tombol **LINK ALTERNATIF** dalam satu grup di header. Keduanya memakai class `.alternative-link` yang sama, sehingga warna emas, ukuran/lebar, border, hover, dan efek shine identik. Ikon Android tampil pada tombol APK. Pengaturan URL, label, dan status tetap melalui panel admin; jalur redirect tetap `/go/apk_download`.
