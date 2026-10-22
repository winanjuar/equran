# Git Flow Branching Strategy

## Aturan Utama

**DILARANG push langsung ke branch `main` atau `master`.** Semua perubahan kode harus melalui feature branch dan Pull Request di GitHub.

## Struktur Branch

| Branch | Deskripsi | Push Langsung |
|--------|-----------|---------------|
| `main` | Production-ready code | ❌ Tidak boleh |
| `develop` | Integration branch untuk fitur | ❌ Tidak boleh |
| `feature/*` | Pengembangan fitur baru | ✅ Boleh |
| `fix/*` | Perbaikan bug | ✅ Boleh |
| `hotfix/*` | Perbaikan kritis di production | ✅ Boleh |
| `release/*` | Persiapan rilis versi baru | ✅ Boleh |
| `chore/*` | Perubahan non-fungsional (deps, config) | ✅ Boleh |

## Konvensi Penamaan Branch

```
feature/<singkat-deskriptif>       → feature/add-bookmark-feature
fix/<singkat-deskriptif>           → fix/surah-pagination-bug
hotfix/<singkat-deskriptif>        → hotfix/audio-playback-crash
release/<versi>                    → release/1.2.0
chore/<singkat-deskriptif>         → chore/update-dependencies
```

## Alur Kerja Git Flow

### Fitur Baru
```
main → develop → feature/<nama> → (PR) → develop → (PR) → main
```

1. Buat branch dari `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/<nama-fitur>
   ```

2. Kerjakan perubahan, commit secara atomik:
   ```bash
   git add <file-spesifik>
   git commit -m "feat: deskripsi singkat perubahan"
   ```

3. Push ke remote dan buka PR ke `develop`:
   ```bash
   git push -u origin feature/<nama-fitur>
   gh pr create --base develop --title "feat: <judul>" --body "<deskripsi>"
   ```

### Hotfix (Perbaikan Mendesak di Production)
```
main → hotfix/<nama> → (PR) → main + develop
```

1. Buat branch dari `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/<deskripsi>
   ```

2. Push dan buka PR ke `main`:
   ```bash
   git push -u origin hotfix/<deskripsi>
   gh pr create --base main --title "hotfix: <judul>" --body "<deskripsi>"
   ```

3. Setelah merge ke `main`, buka PR terpisah ke `develop` juga.

## Konvensi Commit Message (Conventional Commits)

```
feat:     Fitur baru
fix:      Perbaikan bug
chore:    Perubahan non-fungsional (deps, config, tooling)
docs:     Perubahan dokumentasi
style:    Perubahan formatting, bukan logika
refactor: Refactoring tanpa perubahan fungsional
test:     Menambah atau memperbaiki test
perf:     Peningkatan performa
```

Contoh:
```
feat: tambah fitur bookmark ayat
fix: perbaiki audio tidak berhenti saat ganti surah
chore: update nuxt ke versi 3.13
```

## Aturan Pull Request

1. **Target branch PR:**
   - `feature/*`, `fix/*`, `chore/*` → PR ke `develop`
   - `hotfix/*` → PR ke `main` (dan `develop`)
   - `release/*` → PR ke `main` (dan `develop`)

2. **Sebelum buka PR:**
   - Pastikan build tidak error (`npm run build`)
   - Resolve semua merge conflict
   - Rebase dari base branch terbaru jika ada ketinggalan commit

3. **PR harus berisi:**
   - Judul singkat dan deskriptif
   - Deskripsi: apa yang berubah, kenapa, dan cara test/verifikasi
   - Label yang sesuai (feature, bug, hotfix, dll)

## Instruksi untuk Kiro

- **Selalu** buat branch baru sebelum melakukan perubahan kode, kecuali sedang di feature branch yang sudah ada.
- **Jangan pernah** jalankan `git push origin main` atau `git push origin master`.
- Gunakan `gh pr create` untuk membuka PR setelah push ke feature branch.
- Jika branch `develop` tidak ada, tanyakan ke user apakah perlu dibuat atau langsung PR ke `main`.
- Gunakan flag `-u` saat push branch baru: `git push -u origin <branch>`.
- Jangan gunakan `--force` atau `--no-verify` kecuali diminta user secara eksplisit.
