# Konsep dan Data Sistem Informasi Manajemen Sarpras

Dokumen perancangan website pengelolaan sarana dan prasarana (sarpras) untuk sekolah, kampus, atau instansi. Berisi konsep sistem, peran pengguna, alur proses, rancangan database, contoh data, struktur halaman, dan tahapan pengembangan.

## 1. Gambaran Umum

**Nama sistem (usulan):** SIMSARPRAS, Sistem Informasi Manajemen Sarana dan Prasarana.

**Latar belakang.** Pencatatan aset yang masih manual (buku, Excel terpisah) sering menimbulkan masalah: data ganda, barang tidak jelas lokasinya, kerusakan terlambat ditangani, peminjaman bentrok, dan laporan inventaris yang lama disusun.

**Tujuan:**

- Satu sumber data aset yang akurat dan terpusat.
- Peminjaman barang dan ruangan yang tertib dan tidak bentrok.
- Laporan kerusakan yang tercatat dan terpantau sampai selesai.
- Laporan inventaris dan keuangan aset yang bisa dihasilkan dalam hitungan detik.
- Transparansi dan jejak audit atas setiap perubahan data.

**Definisi singkat:**

- **Sarana:** barang bergerak yang menunjang kegiatan (meja, kursi, komputer, proyektor, alat lab, kendaraan).
- **Prasarana:** fasilitas fisik tidak bergerak atau bangunan (gedung, ruang kelas, laboratorium, aula, lapangan, toilet).

## 2. Ruang Lingkup dan Pengguna

| Peran              | Deskripsi                    | Hak akses utama                                                                          |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| Super Admin        | Pengelola sistem             | Semua modul, kelola pengguna dan pengaturan                                              |
| Petugas Sarpras    | Pengelola harian aset        | Input dan ubah aset, verifikasi laporan, kelola peminjaman, stok, mutasi                 |
| Pimpinan           | Kepala/wakil/pejabat         | Persetujuan pengadaan, penghapusan, dan peminjaman tertentu; lihat dashboard dan laporan |
| Teknisi            | Pelaksana perbaikan          | Menerima tiket, memperbarui status dan biaya perbaikan                                   |
| Pengguna Umum      | Guru, staf, siswa, mahasiswa | Ajukan pinjam, booking ruangan, lapor kerusakan, lihat status                            |
| Auditor (opsional) | Pemeriksa internal           | Hanya baca semua data dan log aktivitas                                                  |

## 3. Modul dan Fitur

| No  | Modul                              | Fitur utama                                                                             |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | Autentikasi                        | Login, logout, lupa password, ganti password, kontrol akses per peran                   |
| 2   | Dashboard                          | Ringkasan jumlah aset, kondisi, peminjaman aktif, tiket terbuka, grafik, stok menipis   |
| 3   | Data Master                        | Kategori, lokasi/ruang, unit/jurusan, vendor, sumber dana, satuan, pengguna             |
| 4   | Inventaris Aset                    | CRUD aset, kode otomatis, foto, QR code, status dan kondisi, riwayat aset               |
| 5   | Peminjaman Barang                  | Pengajuan, persetujuan, serah terima, pengembalian, denda atau catatan keterlambatan    |
| 6   | Reservasi Ruangan                  | Kalender, cek bentrok, persetujuan, check-in dan check-out                              |
| 7   | Laporan Kerusakan dan Pemeliharaan | Tiket kerusakan, penugasan teknisi, jadwal perawatan rutin, biaya, riwayat              |
| 8   | Pengadaan                          | Usulan kebutuhan, persetujuan, pembelian, penerimaan barang, otomatis masuk inventaris  |
| 9   | Mutasi Aset                        | Perpindahan antar ruang atau unit, berita acara mutasi                                  |
| 10  | Penghapusan Aset                   | Pengajuan, persetujuan, berita acara, status afkir, hibah, atau lelang                  |
| 11  | Barang Habis Pakai                 | Stok masuk dan keluar, stok minimum, peringatan, permintaan barang                      |
| 12  | Stock Opname                       | Jadwal opname, scan QR, perbandingan fisik dan data, penyesuaian                        |
| 13  | Laporan                            | Rekap inventaris, KIB, kondisi aset, peminjaman, kerusakan, biaya; ekspor PDF dan Excel |
| 14  | Notifikasi                         | Di dalam aplikasi, email, atau WhatsApp                                                 |
| 15  | Log Aktivitas                      | Jejak siapa mengubah apa dan kapan                                                      |

## 4. Alur Proses Utama

### 4.1 Peminjaman barang

1. Pengguna memilih barang yang berstatus _tersedia_, mengisi tanggal pinjam, tanggal kembali, dan keperluan.
2. Sistem memeriksa bentrok jadwal; bila aman, pengajuan berstatus _menunggu_.
3. Petugas sarpras (atau pimpinan untuk barang tertentu) _menyetujui_ atau _menolak_ dengan alasan.
4. Saat barang diambil, petugas mencatat _serah terima_ dan kondisi barang; status aset menjadi _dipinjam_.
5. Saat kembali, petugas mencatat _pengembalian_ dan kondisi; status aset kembali _tersedia_. Bila terlambat, sistem menandai keterlambatan.

**Status:** menunggu, disetujui, ditolak, dipinjam, dikembalikan, terlambat, dibatalkan.

### 4.2 Reservasi ruangan

1. Pengguna membuka kalender ruangan dan memilih slot waktu kosong.
2. Sistem menolak otomatis bila ada jadwal yang beririsan.
3. Petugas atau pimpinan menyetujui.
4. Pengguna mendapat notifikasi; ruangan tampil di kalender sebagai terisi.

### 4.3 Laporan kerusakan sampai perbaikan

1. Pengguna mengisi laporan: aset atau ruangan, deskripsi, foto, tingkat urgensi.
2. Petugas _memverifikasi_ dan menentukan teknisi atau vendor.
3. Teknisi memperbarui progres: _dikerjakan_, lalu _selesai_, lengkap dengan tindakan dan biaya.
4. Kondisi aset diperbarui; pelapor diberi tahu.

**Status tiket:** dilaporkan, diverifikasi, dikerjakan, menunggu suku cadang, selesai, ditolak.

### 4.4 Pengadaan

1. Unit mengajukan usulan kebutuhan (barang, jumlah, estimasi harga, alasan).
2. Petugas menelaah, pimpinan menyetujui.
3. Dilakukan pembelian ke vendor; dicatat nomor dokumen dan nilai.
4. Saat barang diterima, petugas memeriksa jumlah dan kondisi, lalu sistem membuat data aset (atau menambah stok) secara otomatis dengan kode aset.

### 4.5 Mutasi dan penghapusan

- **Mutasi:** petugas memilih aset, lokasi asal dan tujuan, alasan; sistem memperbarui lokasi dan menyimpan riwayat serta berita acara.
- **Penghapusan:** diajukan karena rusak berat, hilang, usang, atau dijual; disetujui pimpinan; status aset menjadi _dihapus_ dengan jenis (afkir, hibah, lelang, hilang) dan berita acara.

### 4.6 Stock opname

1. Petugas membuat sesi opname untuk lokasi tertentu.
2. Aset dipindai satu per satu lewat QR code (atau dicentang manual).
3. Sistem menampilkan selisih: ditemukan, tidak ditemukan, lokasi tidak sesuai, kondisi berubah.
4. Selisih disetujui lalu data disesuaikan; hasilnya menjadi laporan.

## 5. Aturan Bisnis

- Kode aset unik, formatnya: `KODE-KATEGORI/KODE-LOKASI/TAHUN/NOMOR-URUT`, misalnya `ELK/LAB1/2024/0007`.
- Aset berstatus _dipinjam_, _rusak berat_, atau _dihapus_ tidak dapat dipinjam.
- Satu aset atau ruangan tidak boleh memiliki dua peminjaman yang rentang waktunya beririsan.
- Pengembalian melewati tanggal kembali otomatis ditandai _terlambat_ dan memicu notifikasi.
- Penghapusan dan pengadaan di atas nilai tertentu wajib persetujuan pimpinan.
- Aset tidak dihapus permanen dari database (_soft delete_) agar riwayat tetap utuh.
- Barang habis pakai di bawah stok minimum memunculkan peringatan di dashboard.
- Setiap perubahan data penting dicatat di log aktivitas.
- Penyusutan nilai memakai metode garis lurus: `(nilai perolehan − nilai sisa) ÷ umur ekonomis` per tahun.

## 6. Rancangan Database

DBMS yang disarankan: MySQL/MariaDB atau PostgreSQL. Seluruh tabel memiliki `created_at` dan `updated_at`; tabel utama memiliki `deleted_at` untuk soft delete.

### 6.1 Pengguna dan akses

**roles**

| Kolom     | Tipe         | Keterangan                                        |
| --------- | ------------ | ------------------------------------------------- |
| id        | BIGINT PK    |                                                   |
| nama      | VARCHAR(50)  | super_admin, petugas, pimpinan, teknisi, pengguna |
| deskripsi | VARCHAR(150) |                                                   |

**units** (unit/jurusan/bagian)

| Kolom | Tipe         | Keterangan |
| ----- | ------------ | ---------- |
| id    | BIGINT PK    |            |
| kode  | VARCHAR(20)  | unik       |
| nama  | VARCHAR(100) |            |

**users**

| Kolom    | Tipe         | Keterangan     |
| -------- | ------------ | -------------- |
| id       | BIGINT PK    |                |
| role_id  | FK roles     |                |
| unit_id  | FK units     | boleh kosong   |
| nama     | VARCHAR(100) |                |
| email    | VARCHAR(100) | unik           |
| no_hp    | VARCHAR(20)  | untuk WhatsApp |
| password | VARCHAR(255) | hash bcrypt    |
| nip_nis  | VARCHAR(30)  | nomor induk    |
| aktif    | BOOLEAN      |                |

### 6.2 Data master

**categories**

| Kolom          | Tipe         | Keterangan                     |
| -------------- | ------------ | ------------------------------ |
| id             | BIGINT PK    |                                |
| kode           | VARCHAR(10)  | unik, dipakai di kode aset     |
| nama           | VARCHAR(100) |                                |
| jenis          | ENUM         | sarana, prasarana, habis_pakai |
| umur_ekonomis  | INT          | tahun, untuk penyusutan        |
| dapat_dipinjam | BOOLEAN      |                                |

**locations** (gedung, lantai, ruang)

| Kolom         | Tipe         | Keterangan                       |
| ------------- | ------------ | -------------------------------- |
| id            | BIGINT PK    |                                  |
| parent_id     | FK locations | gedung, lantai, ruang (hierarki) |
| kode          | VARCHAR(20)  | unik                             |
| nama          | VARCHAR(100) |                                  |
| tipe          | ENUM         | gedung, lantai, ruang, area_luar |
| kapasitas     | INT          | untuk ruangan                    |
| luas_m2       | DECIMAL(8,2) |                                  |
| dapat_dipesan | BOOLEAN      | bisa direservasi                 |

**vendors**

| Kolom  | Tipe         | Keterangan                   |
| ------ | ------------ | ---------------------------- |
| id     | BIGINT PK    |                              |
| nama   | VARCHAR(100) |                              |
| alamat | TEXT         |                              |
| kontak | VARCHAR(50)  |                              |
| jenis  | VARCHAR(50)  | penyedia barang, jasa servis |

**funding_sources**

| Kolom | Tipe         | Keterangan                                |
| ----- | ------------ | ----------------------------------------- |
| id    | BIGINT PK    |                                           |
| nama  | VARCHAR(100) | BOS, APBD, hibah, mandiri, dan seterusnya |

### 6.3 Aset

**assets**

| Kolom             | Tipe          | Keterangan                                   |
| ----------------- | ------------- | -------------------------------------------- |
| id                | BIGINT PK     |                                              |
| kode_aset         | VARCHAR(40)   | unik                                         |
| nama              | VARCHAR(150)  |                                              |
| category_id       | FK            |                                              |
| location_id       | FK            | lokasi saat ini                              |
| unit_id           | FK            | penanggung jawab unit                        |
| merek             | VARCHAR(80)   |                                              |
| tipe_model        | VARCHAR(80)   |                                              |
| no_seri           | VARCHAR(80)   |                                              |
| tahun_perolehan   | YEAR          |                                              |
| tanggal_perolehan | DATE          |                                              |
| funding_source_id | FK            |                                              |
| vendor_id         | FK            |                                              |
| nilai_perolehan   | DECIMAL(15,2) |                                              |
| nilai_sisa        | DECIMAL(15,2) |                                              |
| kondisi           | ENUM          | baik, rusak_ringan, rusak_berat              |
| status            | ENUM          | tersedia, dipinjam, dalam_perbaikan, dihapus |
| jumlah            | INT           | 1 untuk aset tunggal                         |
| foto              | VARCHAR(255)  |                                              |
| qr_code           | VARCHAR(255)  | path atau token QR                           |
| keterangan        | TEXT          |                                              |

**asset_histories** (riwayat aset)

| Kolom       | Tipe      | Keterangan                                                          |
| ----------- | --------- | ------------------------------------------------------------------- |
| id          | BIGINT PK |                                                                     |
| asset_id    | FK        |                                                                     |
| jenis_event | ENUM      | perolehan, mutasi, perbaikan, peminjaman, ubah_kondisi, penghapusan |
| deskripsi   | TEXT      |                                                                     |
| user_id     | FK        | pelaku                                                              |
| tanggal     | DATETIME  |                                                                     |

### 6.4 Peminjaman dan reservasi

**borrowings**

| Kolom               | Tipe        | Keterangan                                                                  |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| id                  | BIGINT PK   |                                                                             |
| no_transaksi        | VARCHAR(30) | unik                                                                        |
| user_id             | FK          | peminjam                                                                    |
| keperluan           | TEXT        |                                                                             |
| tgl_pinjam          | DATETIME    |                                                                             |
| tgl_kembali_rencana | DATETIME    |                                                                             |
| tgl_kembali_aktual  | DATETIME    | boleh kosong                                                                |
| status              | ENUM        | menunggu, disetujui, ditolak, dipinjam, dikembalikan, terlambat, dibatalkan |
| approved_by         | FK users    |                                                                             |
| catatan             | TEXT        |                                                                             |

**borrowing_items**

| Kolom           | Tipe      | Keterangan                      |
| --------------- | --------- | ------------------------------- |
| id              | BIGINT PK |                                 |
| borrowing_id    | FK        |                                 |
| asset_id        | FK        |                                 |
| kondisi_pinjam  | ENUM      | baik, rusak_ringan, rusak_berat |
| kondisi_kembali | ENUM      | boleh kosong                    |

**room_bookings**

| Kolom          | Tipe         | Keterangan                                        |
| -------------- | ------------ | ------------------------------------------------- |
| id             | BIGINT PK    |                                                   |
| no_booking     | VARCHAR(30)  | unik                                              |
| location_id    | FK           | ruangan                                           |
| user_id        | FK           | pemohon                                           |
| kegiatan       | VARCHAR(200) |                                                   |
| jumlah_peserta | INT          |                                                   |
| waktu_mulai    | DATETIME     |                                                   |
| waktu_selesai  | DATETIME     |                                                   |
| status         | ENUM         | menunggu, disetujui, ditolak, selesai, dibatalkan |
| approved_by    | FK users     |                                                   |

### 6.5 Kerusakan dan pemeliharaan

**damage_reports**

| Kolom       | Tipe         | Keterangan                                                                   |
| ----------- | ------------ | ---------------------------------------------------------------------------- |
| id          | BIGINT PK    |                                                                              |
| no_tiket    | VARCHAR(30)  | unik                                                                         |
| asset_id    | FK           | boleh kosong bila kerusakan ruangan                                          |
| location_id | FK           |                                                                              |
| pelapor_id  | FK users     |                                                                              |
| deskripsi   | TEXT         |                                                                              |
| foto        | VARCHAR(255) |                                                                              |
| urgensi     | ENUM         | rendah, sedang, tinggi                                                       |
| status      | ENUM         | dilaporkan, diverifikasi, dikerjakan, menunggu_suku_cadang, selesai, ditolak |
| teknisi_id  | FK users     |                                                                              |
| tgl_lapor   | DATETIME     |                                                                              |
| tgl_selesai | DATETIME     |                                                                              |

**maintenances** (perbaikan dan perawatan rutin)

| Kolom             | Tipe          | Keterangan                            |
| ----------------- | ------------- | ------------------------------------- |
| id                | BIGINT PK     |                                       |
| asset_id          | FK            |                                       |
| damage_report_id  | FK            | boleh kosong bila perawatan terjadwal |
| jenis             | ENUM          | korektif, preventif                   |
| tanggal           | DATE          |                                       |
| tindakan          | TEXT          |                                       |
| vendor_id         | FK            |                                       |
| biaya             | DECIMAL(15,2) |                                       |
| jadwal_berikutnya | DATE          | untuk pengingat servis                |

### 6.6 Pengadaan

**procurement_requests**

| Kolom       | Tipe        | Keterangan                                     |
| ----------- | ----------- | ---------------------------------------------- |
| id          | BIGINT PK   |                                                |
| no_usulan   | VARCHAR(30) | unik                                           |
| unit_id     | FK          |                                                |
| pengusul_id | FK users    |                                                |
| tanggal     | DATE        |                                                |
| alasan      | TEXT        |                                                |
| status      | ENUM        | diajukan, disetujui, ditolak, dibeli, diterima |
| approved_by | FK users    |                                                |

**procurement_items**

| Kolom           | Tipe          | Keterangan |
| --------------- | ------------- | ---------- |
| id              | BIGINT PK     |            |
| request_id      | FK            |            |
| nama_barang     | VARCHAR(150)  |            |
| category_id     | FK            |            |
| jumlah          | INT           |            |
| estimasi_harga  | DECIMAL(15,2) |            |
| vendor_id       | FK            |            |
| harga_realisasi | DECIMAL(15,2) |            |

### 6.7 Mutasi, penghapusan, dan opname

**asset_mutations**

| Kolom            | Tipe         | Keterangan |
| ---------------- | ------------ | ---------- |
| id               | BIGINT PK    |            |
| asset_id         | FK           |            |
| lokasi_asal_id   | FK locations |            |
| lokasi_tujuan_id | FK locations |            |
| tanggal          | DATE         |            |
| alasan           | TEXT         |            |
| petugas_id       | FK users     |            |

**asset_disposals**

| Kolom       | Tipe          | Keterangan                   |
| ----------- | ------------- | ---------------------------- |
| id          | BIGINT PK     |                              |
| asset_id    | FK            |                              |
| jenis       | ENUM          | afkir, hibah, lelang, hilang |
| alasan      | TEXT          |                              |
| nilai_jual  | DECIMAL(15,2) |                              |
| status      | ENUM          | diajukan, disetujui, ditolak |
| tanggal     | DATE          |                              |
| approved_by | FK users      |                              |

**stock_opname_sessions**

| Kolom       | Tipe         | Keterangan        |
| ----------- | ------------ | ----------------- |
| id          | BIGINT PK    |                   |
| nama        | VARCHAR(100) |                   |
| location_id | FK           |                   |
| tgl_mulai   | DATE         |                   |
| tgl_selesai | DATE         |                   |
| status      | ENUM         | berjalan, selesai |

**stock_opname_items**

| Kolom          | Tipe      | Keterangan                                            |
| -------------- | --------- | ----------------------------------------------------- |
| id             | BIGINT PK |                                                       |
| session_id     | FK        |                                                       |
| asset_id       | FK        |                                                       |
| hasil          | ENUM      | ditemukan, tidak_ditemukan, lokasi_beda, kondisi_beda |
| kondisi_aktual | ENUM      |                                                       |
| catatan        | TEXT      |                                                       |

### 6.8 Barang habis pakai

**consumables**

| Kolom        | Tipe         | Keterangan                               |
| ------------ | ------------ | ---------------------------------------- |
| id           | BIGINT PK    |                                          |
| kode         | VARCHAR(30)  | unik                                     |
| nama         | VARCHAR(150) | spidol, kertas A4, tinta, dan seterusnya |
| satuan       | VARCHAR(20)  | pcs, rim, box                            |
| stok         | INT          |                                          |
| stok_minimum | INT          |                                          |
| location_id  | FK           | gudang                                   |

**consumable_transactions**

| Kolom         | Tipe      | Keterangan           |
| ------------- | --------- | -------------------- |
| id            | BIGINT PK |                      |
| consumable_id | FK        |                      |
| jenis         | ENUM      | masuk, keluar        |
| jumlah        | INT       |                      |
| user_id       | FK        | peminta atau petugas |
| tanggal       | DATE      |                      |
| keterangan    | TEXT      |                      |

### 6.9 Sistem

**notifications**: id, user_id, judul, pesan, tipe, dibaca (boolean), created_at.

**activity_logs**: id, user_id, aksi (create/update/delete/login), tabel, record_id, data_lama (JSON), data_baru (JSON), ip_address, created_at.

**settings**: id, kunci, nilai (misalnya nama instansi, logo, batas hari pinjam, nilai batas persetujuan pimpinan).

## 7. Relasi Antar Tabel (Ringkas)

- `roles` 1 — N `users`; `units` 1 — N `users`.
- `categories` 1 — N `assets`; `locations` 1 — N `assets`; `units` 1 — N `assets`.
- `locations` bersifat hierarki sendiri (gedung → lantai → ruang) lewat `parent_id`.
- `assets` 1 — N `asset_histories`, `asset_mutations`, `maintenances`, `damage_reports`.
- `borrowings` 1 — N `borrowing_items`; `assets` 1 — N `borrowing_items`.
- `locations` 1 — N `room_bookings`.
- `procurement_requests` 1 — N `procurement_items`.
- `stock_opname_sessions` 1 — N `stock_opname_items`.
- `consumables` 1 — N `consumable_transactions`.
- `users` terhubung ke hampir semua transaksi sebagai pelaku, pemohon, atau penyetuju.

Contoh SQL untuk tabel inti:

```sql
CREATE TABLE categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(10) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  jenis ENUM('sarana','prasarana','habis_pakai') NOT NULL,
  umur_ekonomis INT DEFAULT 5,
  dapat_dipinjam BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL
);

CREATE TABLE assets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kode_aset VARCHAR(40) NOT NULL UNIQUE,
  nama VARCHAR(150) NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NULL,
  merek VARCHAR(80), tipe_model VARCHAR(80), no_seri VARCHAR(80),
  tahun_perolehan YEAR, tanggal_perolehan DATE,
  funding_source_id BIGINT UNSIGNED NULL,
  vendor_id BIGINT UNSIGNED NULL,
  nilai_perolehan DECIMAL(15,2) DEFAULT 0,
  nilai_sisa DECIMAL(15,2) DEFAULT 0,
  kondisi ENUM('baik','rusak_ringan','rusak_berat') DEFAULT 'baik',
  status ENUM('tersedia','dipinjam','dalam_perbaikan','dihapus') DEFAULT 'tersedia',
  jumlah INT DEFAULT 1,
  foto VARCHAR(255), qr_code VARCHAR(255), keterangan TEXT,
  created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, deleted_at TIMESTAMP NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

## 8. Contoh Data (Dummy untuk Pengujian)

**roles**

| id  | nama        |
| --- | ----------- |
| 1   | super_admin |
| 2   | petugas     |
| 3   | pimpinan    |
| 4   | teknisi     |
| 5   | pengguna    |

**units**

| id  | kode    | nama                         |
| --- | ------- | ---------------------------- |
| 1   | TU      | Tata Usaha                   |
| 2   | SARPRAS | Sarana dan Prasarana         |
| 3   | TKJ     | Teknik Komputer dan Jaringan |
| 4   | KUR     | Kurikulum                    |

**users**

| id  | nama             | email                | role        | unit    |
| --- | ---------------- | -------------------- | ----------- | ------- |
| 1   | Admin Sistem     | admin@contoh.sch.id  | super_admin | SARPRAS |
| 2   | Budi Santoso     | budi@contoh.sch.id   | petugas     | SARPRAS |
| 3   | Dra. Siti Aminah | kepala@contoh.sch.id | pimpinan    | TU      |
| 4   | Agus Wijaya      | agus@contoh.sch.id   | teknisi     | SARPRAS |
| 5   | Rina Kartika     | rina@contoh.sch.id   | pengguna    | TKJ     |

**categories**

| kode | nama                 | jenis       | umur ekonomis | dapat dipinjam |
| ---- | -------------------- | ----------- | ------------- | -------------- |
| ELK  | Peralatan Elektronik | sarana      | 5             | ya             |
| MEB  | Meubelair            | sarana      | 8             | tidak          |
| KND  | Kendaraan            | sarana      | 10            | ya             |
| OLR  | Peralatan Olahraga   | sarana      | 4             | ya             |
| GDG  | Gedung dan Bangunan  | prasarana   | 20            | tidak          |
| ATK  | Alat Tulis Kantor    | habis_pakai | 0             | tidak          |

**locations**

| kode   | nama                    | tipe   | induk             | kapasitas | dapat dipesan |
| ------ | ----------------------- | ------ | ----------------- | --------- | ------------- |
| GA     | Gedung A                | gedung | -                 | -         | tidak         |
| GA-L1  | Lantai 1 Gedung A       | lantai | Gedung A          | -         | tidak         |
| LAB1   | Laboratorium Komputer 1 | ruang  | Lantai 1 Gedung A | 36        | ya            |
| R101   | Ruang Kelas X-1         | ruang  | Lantai 1 Gedung A | 32        | tidak         |
| AULA   | Aula Serbaguna          | ruang  | -                 | 200       | ya            |
| GUDANG | Gudang Sarpras          | ruang  | -                 | -         | tidak         |

**assets**

| kode_aset            | nama                          | lokasi | tahun | nilai perolehan | kondisi      | status          |
| -------------------- | ----------------------------- | ------ | ----- | --------------- | ------------ | --------------- |
| ELK/LAB1/2023/0001   | PC Desktop Lenovo ThinkCentre | LAB1   | 2023  | 9.500.000       | baik         | tersedia        |
| ELK/LAB1/2023/0002   | PC Desktop Lenovo ThinkCentre | LAB1   | 2023  | 9.500.000       | rusak_ringan | dalam_perbaikan |
| ELK/GUDANG/2022/0010 | Proyektor Epson EB-X500       | GUDANG | 2022  | 6.800.000       | baik         | tersedia        |
| ELK/GUDANG/2022/0011 | Laptop ASUS Vivobook          | GUDANG | 2022  | 8.200.000       | baik         | dipinjam        |
| MEB/R101/2021/0005   | Meja Siswa                    | R101   | 2021  | 350.000         | baik         | tersedia        |
| MEB/R101/2021/0006   | Kursi Siswa                   | R101   | 2021  | 250.000         | rusak_berat  | tersedia        |
| OLR/GUDANG/2024/0003 | Bola Basket Molten            | GUDANG | 2024  | 450.000         | baik         | tersedia        |
| KND/GUDANG/2019/0001 | Minibus Sekolah               | GUDANG | 2019  | 285.000.000     | baik         | tersedia        |

**borrowings**

| no_transaksi    | peminjam     | barang                  | tgl pinjam | kembali (rencana) | status       |
| --------------- | ------------ | ----------------------- | ---------- | ----------------- | ------------ |
| PJM/2026/10/001 | Rina Kartika | Laptop ASUS Vivobook    | 26-10-2026 | 28-10-2026        | dipinjam     |
| PJM/2026/10/002 | Rina Kartika | Proyektor Epson EB-X500 | 20-10-2026 | 21-10-2026        | dikembalikan |

**room_bookings**

| no_booking      | ruang          | kegiatan          | mulai            | selesai          | status    |
| --------------- | -------------- | ----------------- | ---------------- | ---------------- | --------- |
| BKG/2026/10/004 | Aula Serbaguna | Rapat Orang Tua   | 30-10-2026 08:00 | 30-10-2026 12:00 | disetujui |
| BKG/2026/10/005 | LAB1           | Ujian Praktik TKJ | 02-11-2026 07:30 | 02-11-2026 14:00 | menunggu  |

**damage_reports**

| no_tiket        | aset                | deskripsi                           | urgensi | status       |
| --------------- | ------------------- | ----------------------------------- | ------- | ------------ |
| TKT/2026/10/012 | PC ThinkCentre 0002 | Tidak mau menyala, diduga PSU rusak | sedang  | dikerjakan   |
| TKT/2026/10/013 | Kursi Siswa 0006    | Kaki kursi patah                    | rendah  | diverifikasi |

**consumables**

| kode    | nama                    | satuan | stok | stok minimum |
| ------- | ----------------------- | ------ | ---- | ------------ |
| ATK-001 | Kertas HVS A4 80 gsm    | rim    | 40   | 20           |
| ATK-002 | Spidol Whiteboard Hitam | pcs    | 12   | 24           |
| ATK-003 | Tinta Printer Epson 003 | botol  | 6    | 8            |

Dari data contoh di atas, dashboard akan menampilkan peringatan stok menipis untuk spidol dan tinta, satu tiket perbaikan berjalan, dan satu barang sedang dipinjam.

## 9. Struktur Menu dan Halaman

**Menu Admin dan Petugas**

- Dashboard
- Data Master: Kategori, Lokasi, Unit, Vendor, Sumber Dana
- Aset: Daftar Aset, Tambah Aset, Cetak Label QR, Mutasi, Penghapusan
- Peminjaman: Daftar Pengajuan, Sedang Dipinjam, Riwayat
- Reservasi Ruangan: Kalender, Daftar Pengajuan
- Pemeliharaan: Tiket Kerusakan, Jadwal Perawatan, Riwayat Perbaikan
- Pengadaan: Usulan, Pembelian, Penerimaan
- Stok Habis Pakai: Daftar Stok, Barang Masuk, Barang Keluar
- Stock Opname
- Laporan
- Pengguna dan Peran
- Log Aktivitas dan Pengaturan

**Menu Pengguna Umum**

- Beranda dan cari aset
- Pinjam Barang
- Booking Ruangan
- Lapor Kerusakan
- Riwayat dan status pengajuan saya
- Profil

**Menu Pimpinan**

- Dashboard ringkasan
- Persetujuan (pengadaan, penghapusan, peminjaman)
- Laporan

**Halaman kunci yang perlu dirancang matang:** dashboard, daftar aset dengan filter, detail aset (foto, QR, riwayat), kalender reservasi, form laporan kerusakan versi HP, dan halaman scan QR untuk opname.

## 10. Laporan yang Dihasilkan

1. Daftar inventaris per kategori, lokasi, atau unit.
2. Kartu Inventaris Barang (KIB) dan Kartu Inventaris Ruangan (KIR).
3. Rekap kondisi aset (baik, rusak ringan, rusak berat).
4. Laporan penyusutan nilai aset.
5. Rekap peminjaman dan keterlambatan.
6. Rekap kerusakan, waktu penyelesaian, dan biaya perbaikan per aset.
7. Laporan pengadaan dan realisasi anggaran.
8. Laporan mutasi dan penghapusan.
9. Rekap stok dan mutasi barang habis pakai.
10. Hasil stock opname dan selisihnya.

Format keluaran: tampilan layar, PDF (untuk cetak dan tanda tangan), dan Excel (untuk olah data).

## 11. Arsitektur dan Teknologi

| Lapisan               | Pilihan utama                                       | Alternatif                               |
| --------------------- | --------------------------------------------------- | ---------------------------------------- |
| Backend               | Laravel (PHP)                                       | CodeIgniter 4, Node.js (Express), Django |
| Frontend              | Blade + Bootstrap 5 atau Tailwind                   | React atau Vue                           |
| Database              | MySQL/MariaDB                                       | PostgreSQL                               |
| Autentikasi dan peran | Laravel Breeze dan Spatie Permission                | JWT, Passport                            |
| QR code               | simple-qrcode (PHP), html5-qrcode (scan di browser) |                                          |
| Laporan               | DomPDF atau Snappy (PDF), Laravel Excel             |                                          |
| Grafik                | Chart.js                                            | ApexCharts                               |
| Kalender              | FullCalendar                                        |                                          |
| Notifikasi            | Email SMTP, WhatsApp gateway                        | Telegram bot                             |
| Hosting               | VPS atau hosting PHP, SSL, backup harian            |                                          |

Pola arsitektur yang disarankan: MVC, dengan REST API terpisah bila nanti ada aplikasi mobile.

## 12. Keamanan dan Kualitas

- Password di-hash (bcrypt/argon2); sesi dengan batas waktu.
- Kontrol akses berbasis peran di setiap rute dan aksi.
- Proteksi CSRF, XSS, dan SQL injection (gunakan ORM dan validasi input).
- Validasi dan pembatasan unggah file (jenis, ukuran), nama file diacak.
- Log aktivitas untuk semua perubahan penting.
- Backup database otomatis harian dan uji pemulihan berkala.
- HTTPS wajib; pembatasan percobaan login.
- Perlindungan data pribadi pengguna sesuai kebijakan instansi.

## 13. Tahapan Pengembangan

| Tahap                       | Cakupan                                                        | Perkiraan waktu |
| --------------------------- | -------------------------------------------------------------- | --------------- |
| 1. Analisis dan desain      | Wawancara kebutuhan, finalisasi fitur, ERD, mockup             | 1–2 minggu      |
| 2. Fondasi                  | Autentikasi, peran, data master, dashboard dasar               | 1–2 minggu      |
| 3. Inti                     | Inventaris aset, QR code, impor Excel, riwayat                 | 2–3 minggu      |
| 4. Layanan                  | Peminjaman, reservasi ruangan, laporan kerusakan, pemeliharaan | 3–4 minggu      |
| 5. Lanjutan                 | Pengadaan, mutasi, penghapusan, stok habis pakai, opname       | 3–4 minggu      |
| 6. Laporan dan notifikasi   | Seluruh laporan, ekspor PDF/Excel, notifikasi                  | 2 minggu        |
| 7. Pengujian dan peluncuran | Uji pengguna, perbaikan, migrasi data lama, pelatihan          | 2 minggu        |

Estimasi total sekitar 3–4 bulan untuk satu pengembang. Pendekatan bertahap disarankan: rilis tahap 2–4 lebih dulu karena sudah memberi manfaat nyata.

## 14. Rencana Migrasi Data dan Pelatihan

1. Kumpulkan data inventaris lama (Excel, buku inventaris) dan seragamkan format kolom.
2. Bersihkan duplikasi dan lengkapi kolom wajib (kategori, lokasi, kondisi, tahun).
3. Impor lewat template Excel dari sistem, lalu validasi sampel.
4. Cetak dan tempel label QR pada aset fisik sambil melakukan opname awal.
5. Latih petugas sarpras, pimpinan, dan perwakilan pengguna; siapkan panduan singkat dan video.
6. Jalankan masa uji coba paralel (sistem baru dan cara lama) selama 2–4 minggu.

## 15. Indikator Keberhasilan

- Persentase aset yang sudah berlabel QR dan tercatat lengkap.
- Waktu rata-rata penyelesaian tiket kerusakan.
- Jumlah bentrok peminjaman atau reservasi (target nol).
- Waktu penyusunan laporan inventaris (dari hari menjadi menit).
- Selisih hasil stock opname terhadap data sistem.
- Tingkat penggunaan sistem oleh pengguna umum.

## 16. Langkah Selanjutnya

Untuk melanjutkan, bisa dikerjakan salah satu dari berikut: ERD (diagram relasi), mockup tampilan dashboard dan form, prototipe website yang bisa dicoba, atau file SQL dan seeder lengkap berisi data contoh di atas. Sesuaikan juga istilah, kode aset, dan alur persetujuan dengan jenis instansi Anda (sekolah, kampus, atau kantor).
