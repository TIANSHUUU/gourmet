// gourmet 现场笔记的纯逻辑:Worker 与 scripts/notes-pull.mjs 共用这一份。
// 写成 .mjs 是因为 Node 的 .mjs 不能 import .ts;单一实现,vitest 直接测。
import { z } from 'zod';

const nonEmpty = z.string().min(1);
const coords = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const level = z.enum(['low', 'medium', 'high']).nullable().default(null); // 风味曲线一档

export const placeSchema = z.object({
  name: z.string().default(''),
  gmaps_url: z.string().default(''),
  coords: coords.nullable().default(null),
});

export const wineSchema = z.object({
  winery: z.string().default(''),
  wine_type: z.enum(['red', 'white', 'rose', 'sparkling']).nullable().default(null),
  vintage: z.string().default(''),
  abv: z.string().default(''),
  varieties: z.string().default(''),
  region: z.string().default(''),
  price_aud: z.string().default(''),
  pairing: z.string().default(''),
  flavours: z.array(nonEmpty).default([]),
});

export const venueSchema = z.object({
  category: z.enum(['food', 'cafe', 'bar']).nullable().default(null),
  cuisine: z.string().default(''),
  dishes: z.array(nonEmpty).default([]),
});

export const coffeeSchema = z.object({
  roaster: z.string().default(''),
  producer: z.string().default(''),
  farm: z.string().default(''),
  region: z.string().default(''),
  altitude: z.string().default(''),
  varietal: z.string().default(''),
  process: z.string().default(''),
  roast_level: z.string().default(''),   // 烘焙度,业主惯例字段,纯文本
  brew: z.string().default(''),          // 冲煮方式(磨豆机/粉水比/水温)
  roast_date: z.string().default(''),    // 烘焙日;首次冲煮日用顶层 at
  product_url: z.string().default(''),
  flavours: z.array(nonEmpty).default([]),
  // 风味曲线:酸度/甜度/醇厚/香气/余韵,各 low|medium|high|null
  profile: z
    .object({ acidity: level, sweetness: level, body: level, aroma: level, finish: level })
    .default({}),
  summary: z.string().default(''),       // 一句话总评
});

export const photoSchema = z.object({
  file: nonEmpty,
  note: z.string().default(''),
});

export const noteSchema = z
  .object({
    id: nonEmpty,
    kind: z.enum(['wine', 'place', 'coffee']),
    at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'at 必须是带日期与时刻的 ISO 字符串')
      .refine((v) => !Number.isNaN(Date.parse(v)), '不是有效日期时间'),
    title: nonEmpty,
    place: placeSchema.optional(),
    body: z.string().default(''),
    wine: wineSchema.optional(),
    venue: venueSchema.optional(),
    coffee: coffeeSchema.optional(),
    photos: z.array(photoSchema).default([]),
    created_at: nonEmpty,
    updated_at: nonEmpty,
  })
  .refine((n) => n.kind === 'wine' || n.wine === undefined, {
    message: '只有 kind=wine 才能带 wine 块',
    path: ['wine'],
  })
  .refine((n) => n.kind === 'place' || n.venue === undefined, {
    message: '只有 kind=place 才能带 venue 块',
    path: ['venue'],
  })
  .refine((n) => n.kind === 'coffee' || n.coffee === undefined, {
    message: '只有 kind=coffee 才能带 coffee 块',
    path: ['coffee'],
  });

export function safeParseNote(raw) {
  return noteSchema.safeParse(raw);
}

export function parseNote(raw) {
  return noteSchema.parse(raw);
}

const round6 = (n) => Math.round(n * 1e6) / 1e6;

function toCoords(latRaw, lngRaw) {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [round6(lng), round6(lat)];
}

export function extractCoords(url) {
  if (typeof url !== 'string') return null;
  if (/\/maps\/dir\//.test(url)) return null;
  const d = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d) return toCoords(d[1], d[2]);
  const s = url.match(/\/maps\/search\/(-?\d+(?:\.\d+)?),[+\s]*(-?\d+(?:\.\d+)?)/);
  if (s) return toCoords(s[1], s[2]);
  const q = url.match(/[?&]q(?:uery)?=(-?\d+(?:\.\d+)?),[+\s]*(-?\d+(?:\.\d+)?)/);
  if (q) return toCoords(q[1], q[2]);
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return toCoords(at[1], at[2]);
  return null;
}

export function extractPlaceName(url) {
  if (typeof url !== 'string') return '';
  const m = url.match(/\/maps\/place\/([^/@?"'\\\s]{1,200})/);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
  } catch {
    return m[1].replace(/\+/g, ' ').trim();
  }
}

export function localStamp(at) {
  const m = String(at).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) throw new Error(`无法解析时间: ${at}`);
  return `${m[1]}-${m[2]}-${m[3]}-${m[4]}${m[5]}`;
}

export function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

const idSuffix = (note) => String(note.id).split('-').pop();

export function noteFileName(note, taken = []) {
  const stamp = localStamp(note.at);
  const slug = slugify(note.title ?? '');
  const base = slug ? `${stamp}-${slug}` : stamp;
  if (!taken.includes(`${base}.yaml`)) return `${base}.yaml`;
  const withId = `${base}-${idSuffix(note)}`;
  if (!taken.includes(`${withId}.yaml`)) return `${withId}.yaml`;
  for (let n = 2; ; n += 1) {
    if (!taken.includes(`${withId}-${n}.yaml`)) return `${withId}-${n}.yaml`;
  }
}

export function photoFileName(note, index) {
  return `${localStamp(note.at)}-${String(index).padStart(2, '0')}.jpg`;
}

export function photoLocalName(note, file, taken = []) {
  if (!taken.includes(file)) return file;
  const withId = file.replace(/\.jpg$/i, `-${idSuffix(note)}.jpg`);
  if (!taken.includes(withId)) return withId;
  for (let n = 2; ; n += 1) {
    const candidate = withId.replace(/\.jpg$/i, `-${n}.jpg`);
    if (!taken.includes(candidate)) return candidate;
  }
}

export function isUpToDate(local, remote) {
  return Boolean(local) && local.updated_at === remote.updated_at;
}

export function checkToken(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (expected.length === 0 || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
