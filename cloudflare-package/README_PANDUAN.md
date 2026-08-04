# Kontak Resmi MAGNUM188 — Cloudflare Pages

Paket ini mempertahankan template kontak MAGNUM188 dan menggunakan Cloudflare
Pages Functions + KV. Nilai kontak asli tidak berada di `index.html` atau kode
GitHub. Browser hanya menerima alamat perantara `/go/...`.

## Isi paket

- `index.html`: template utama.
- `functions/api/contacts.js`: membaca status keenam kontak dari KV.
- `functions/api/duration.js`: interval pembaruan 30 detik.
- `functions/go/[channel].js`: redirect aman menuju kontak yang dipilih.
- `_headers`: header keamanan dan larangan cache untuk endpoint dinamis.

## 1. Upload ke GitHub

Ekstrak ZIP. Upload seluruh isi folder ini ke root repository GitHub. Struktur
folder `functions` dan nama file `[channel].js` jangan diubah.

## 2. Hubungkan Cloudflare Pages

Di Cloudflare buka Workers & Pages, buat Pages project, lalu hubungkan repository
GitHub. Gunakan production branch `main`, framework preset `None`, build command
`exit 0`, dan output directory `.`.

## 3. Buat KV

Di Cloudflare buka Storage & Databases > KV lalu buat namespace, misalnya
`magnum188-contacts`.

Pada Pages project buka Settings > Bindings > Add > KV namespace:

- Variable name: `CONTACTS`
- KV namespace: pilih `magnum188-contacts`

Simpan lalu lakukan deployment baru agar binding aktif.

## 4. Tambahkan data KV

Masukkan enam key berikut. Salin value masing-masing dari daftar kontak pribadi
Anda; jangan tulis value tersebut ke repository publik.

| Key | Jenis data |
| --- | --- |
| `whatsapp` | Link WhatsApp admin |
| `telegram` | Link Telegram admin |
| `livechat` | Link LiveChat |
| `whatsapp_group` | Link undangan grup WhatsApp |
| `telegram_group` | Link grup Telegram |
| `facebook_group` | Link grup Facebook |

Jika satu key dihapus atau value dikosongkan, tombol terkait otomatis menjadi
nonaktif.

## 5. Uji

- Buka `/api/duration`; hasilnya harus berisi `{"durasi":30000}`.
- Buka `/api/contacts`; hasilnya hanya boleh berisi alamat `/go/...`, bukan
  nomor/link asli.
- Klik keenam tombol dan pastikan redirect menuju kanal yang benar.

## Catatan keamanan

Kontak tidak tertulis di HTML atau GitHub. Pengunjung yang benar-benar menekan
tombol tetap akan diarahkan ke URL tujuan, sehingga tujuan akhirnya dapat
diketahui setelah redirect. Ini memang diperlukan agar layanan dapat dibuka.
