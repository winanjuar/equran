#!/usr/bin/env node
/**
 * generate-migrations.js
 *
 * One-time script to generate Supabase SQL seed migration files from CSV data.
 * Run: node scripts/generate-migrations.js
 *
 * Output:
 *   supabase/migrations/002_seed_quran_verses.sql
 *   supabase/migrations/003_seed_hijri_targets.sql
 *   supabase/migrations/004_seed_surah_weights.sql
 *   supabase/migrations/005_seed_default_book.sql
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// ---------------------------------------------------------------------------
// CSV parser (no external deps)
// ---------------------------------------------------------------------------
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? '').trim();
    });
    return obj;
  });
}

function sqlStr(s) {
  return `'${s.replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Normalise surah name for lookup (lowercase, collapse spaces)
// ---------------------------------------------------------------------------
function normaliseName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// 002 — quran_verses
// ---------------------------------------------------------------------------
function generateQuranVersesSeed() {
  const rows = parseCSV(path.join(DATA_DIR, 'quran-verses.csv'));

  // Maps used in later steps
  const surahNumberToName = {};  // surah_number → canonical name from quran-verses
  const nameToSurahNumber = {};  // normalised name → surah_number

  let prevSurah = null;
  let prevRuku = null;
  let rukuInSurah = 0;

  const processed = rows.map(row => {
    const id        = parseInt(row['ID']);
    const page      = parseInt(row['Halaman']);
    const hizb      = parseInt(row['Hizb']);
    const juz       = parseInt(row['Juz']);
    const ruku      = parseInt(row['Ruku']);
    const surah     = parseInt(row['Surat']);
    const surahName = row['Nama Surat'];
    const verse     = parseInt(row['Ayat']);

    // Build name lookup
    if (!surahNumberToName[surah]) {
      surahNumberToName[surah] = surahName;
      nameToSurahNumber[normaliseName(surahName)] = surah;
    }

    // hizb_in_juz: hizbs are globally numbered 1-60, two per juz
    const hibzInJuz = ((hizb - 1) % 2) + 1;

    // ruku_in_surah: reset counter on new surah, increment on new ruku
    if (surah !== prevSurah) {
      prevSurah = surah;
      prevRuku  = ruku;
      rukuInSurah = 1;
    } else if (ruku !== prevRuku) {
      prevRuku = ruku;
      rukuInSurah++;
    }

    return { id, page, juz, hizb, hizb_in_juz: hibzInJuz, ruku, ruku_in_surah: rukuInSurah, surah, surah_name: surahName, verse };
  });

  // Generate SQL in batches of 500
  const BATCH = 500;
  const out = [
    '-- ============================================================',
    `-- 002_seed_quran_verses.sql`,
    `-- ${processed.length} verses seeded from scripts/data/quran-verses.csv`,
    '-- ============================================================',
    '',
  ];

  for (let i = 0; i < processed.length; i += BATCH) {
    const batch = processed.slice(i, i + BATCH);
    out.push('INSERT INTO quran_verses');
    out.push('  (id, page, juz, hizb, hizb_in_juz, ruku, ruku_in_surah, surah, surah_name, verse)');
    out.push('VALUES');
    out.push(
      batch
        .map(r => `  (${r.id}, ${r.page}, ${r.juz}, ${r.hizb}, ${r.hizb_in_juz}, ${r.ruku}, ${r.ruku_in_surah}, ${r.surah}, ${sqlStr(r.surah_name)}, ${r.verse})`)
        .join(',\n')
    );
    out.push('ON CONFLICT (id) DO NOTHING;');
    out.push('');
  }

  return { sql: out.join('\n'), nameToSurahNumber, surahNumberToName };
}

// ---------------------------------------------------------------------------
// 003 — hijri_daily_targets
// ---------------------------------------------------------------------------
function generateHijriTargetsSeed(nameToSurahNumber) {
  const rows = parseCSV(path.join(DATA_DIR, 'hijri-targets.csv'));

  // Explicit overrides for known spelling differences between the two CSVs.
  // Both CSVs now use consistent names, but this map remains as a safety net.
  const OVERRIDES = {};

  const unmatched = new Set();
  const dayCounters = {};
  const valueRows = [];

  rows.forEach(row => {
    const day  = parseInt(row['Day']);
    const rawName = row['Surat'];
    const key  = normaliseName(rawName);
    const resolvedKey = OVERRIDES[key] ?? key;

    const surahNum = nameToSurahNumber[resolvedKey];

    if (!surahNum) {
      unmatched.add(rawName);
      return;
    }

    dayCounters[day] = (dayCounters[day] ?? 0) + 1;
    valueRows.push(`  (${day}, ${surahNum}, ${dayCounters[day]})`);
  });

  const out = [
    '-- ============================================================',
    '-- 003_seed_hijri_targets.sql',
    '-- Daily Tilawah targets by Hijri day (1-30)',
    '-- Day 30 repeats Day 29 targets (as per design)',
    '-- ============================================================',
    '',
  ];

  if (unmatched.size > 0) {
    out.push('-- ⚠️  WARNING: Could not resolve the following surah names:');
    [...unmatched].forEach(n => out.push(`--   "${n}"`));
    out.push('-- Add them to the OVERRIDES map in generate-migrations.js if needed.');
    out.push('');
  }

  out.push('INSERT INTO hijri_daily_targets (hijri_day, surah, sort_order)');
  out.push('VALUES');
  out.push(valueRows.join(',\n'));
  out.push('ON CONFLICT (hijri_day, surah) DO NOTHING;');
  out.push('');

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 004 — surah_weights
// ---------------------------------------------------------------------------
function generateSurahWeightsSeed(surahNumberToName) {
  const entries = Object.entries(surahNumberToName)
    .map(([num, name]) => [parseInt(num), name])
    .sort((a, b) => a[0] - b[0]);

  const out = [
    '-- ============================================================',
    '-- 004_seed_surah_weights.sql',
    '-- 114 surahs seeded with default weight 1.000',
    '-- ============================================================',
    '',
    'INSERT INTO surah_weights (surah, surah_name, weight)',
    'VALUES',
    entries.map(([num, name]) => `  (${num}, ${sqlStr(name)}, 1.000)`).join(',\n'),
    'ON CONFLICT (surah) DO NOTHING;',
    '',
  ];

  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 005 — default book
// ---------------------------------------------------------------------------
function generateDefaultBookSeed() {
  return [
    '-- ============================================================',
    '-- 005_seed_default_book.sql',
    '-- ============================================================',
    '',
    "INSERT INTO books (name, description)",
    "VALUES ('Mushaf Madinah', 'Standar Mushaf Al-Quran cetakan Madinah')",
    'ON CONFLICT DO NOTHING;',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  console.log('Generating SQL migration files...\n');

  const { sql: versesSql, nameToSurahNumber, surahNumberToName } = generateQuranVersesSeed();
  fs.writeFileSync(path.join(MIGRATIONS_DIR, '002_seed_quran_verses.sql'), versesSql);
  console.log('✓  002_seed_quran_verses.sql');

  const hijriSql = generateHijriTargetsSeed(nameToSurahNumber);
  fs.writeFileSync(path.join(MIGRATIONS_DIR, '003_seed_hijri_targets.sql'), hijriSql);
  console.log('✓  003_seed_hijri_targets.sql');

  const weightsSql = generateSurahWeightsSeed(surahNumberToName);
  fs.writeFileSync(path.join(MIGRATIONS_DIR, '004_seed_surah_weights.sql'), weightsSql);
  console.log('✓  004_seed_surah_weights.sql');

  const bookSql = generateDefaultBookSeed();
  fs.writeFileSync(path.join(MIGRATIONS_DIR, '005_seed_default_book.sql'), bookSql);
  console.log('✓  005_seed_default_book.sql');

  console.log(`\nAll files written to: ${MIGRATIONS_DIR}`);

  // Summarise unmatched (already printed per step above if any)
}

main();
