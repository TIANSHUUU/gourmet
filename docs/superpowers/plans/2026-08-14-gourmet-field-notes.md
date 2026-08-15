# gourmet 现场笔记(Field Notes)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 gourmet 的 `web/` 仓库里加一套独立的 Cloudflare Worker + R2 现场笔记系统,让业主用手机现场记录酒评 / 餐厅点评,回电脑 `npm run notes:pull` 拉到本地,由 Claude 成稿更新网站。

**Architecture:** 独立 Worker(`web/notes-app/`)对 R2 桶 `gourmet-notes` 读写;手机端是一个内联 CSS/JS 的单文件 HTML;纯逻辑(zod schema + 坐标/文件名/token)集中在 `web/notes-app/shared/note.mjs`,Worker 与 pull 脚本共用,vitest 直接测。主站 Next.js 构建与 GitHub Pages 部署零改动——笔记永不进 `web/src/`。移植自 travel-timeline 的同名模块,按 gourmet 的两种笔记类型(`wine` / `place`)改造。

**Tech Stack:** Cloudflare Workers + R2 · wrangler · zod · yaml · vitest(gourmet 已装 v2.1.9)· 原生 Web(canvas 压缩 / geolocation / localStorage)

**参考实现(同一台机器上,直接读取/复制):**
- `/Users/tantianshu/Documents/code/travel-timeline/notes-app/{worker.ts,page.html,shared/note.mjs,wrangler.jsonc,env.d.ts}`
- `/Users/tantianshu/Documents/code/travel-timeline/scripts/notes-pull.mjs`
- `/Users/tantianshu/Documents/code/travel-timeline/tests/unit/fieldNote.test.ts`

**设计文档:** `web/docs/superpowers/specs/2026-08-14-gourmet-field-notes-design.md`

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `web/notes-app/shared/note.mjs` | 纯逻辑:zod schema(`kind`/`wine`/`venue` 块门控)、坐标解析、文件名生成、token 定长比较。Worker 与 pull 共用 |
| `web/notes-app/shared/note.test.mjs` | 上者的单元测试 |
| `web/notes-app/worker.ts` | Worker:`/api/*` 路由,R2 读写,resolve-place。按 `:kind` 分区 |
| `web/notes-app/page.html` | 手机端单页表单(🍷酒 / 🍽️店 两种) |
| `web/notes-app/wrangler.jsonc` | Worker 部署配置(name `gourmet-notes`,R2 桶绑定) |
| `web/notes-app/env.d.ts` | Worker 环境类型 |
| `web/scripts/notes-pull.mjs` | 单向拉取到 `web/field-notes/<kind>/` |
| `web/package.json` | 加 devDeps + `notes:*` 脚本 |
| `web/.gitignore` | 忽略 `.dev.vars`、`.wrangler/`、`field-notes/*/photos/` |
| `web/tsconfig.json` / `web/eslint.config.mjs` | 把 `notes-app`/`scripts` 排除出 Next 的类型检查与 lint |

**数据流:** 手机 → R2 → `notes:pull` → `web/field-notes/{wine,place}/notes/*.yaml`(入 git)+ `photos/`(gitignore)→ Claude 成稿。

---

## Task 1: 依赖、脚本、忽略与配置排除

**Files:**
- Modify: `web/package.json`
- Modify: `web/.gitignore`
- Modify: `web/tsconfig.json`
- Modify: `web/eslint.config.mjs`

- [ ] **Step 1: 加开发依赖与 notes 脚本到 `package.json`**

把 `web/package.json` 的 `scripts` 块改成(新增最后三行):

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "notes:dev": "wrangler dev --config notes-app/wrangler.jsonc",
    "notes:deploy": "wrangler deploy --config notes-app/wrangler.jsonc",
    "notes:pull": "node scripts/notes-pull.mjs"
  },
```

把 `devDependencies` 块加上四个依赖(保持字母序,示例):

```json
    "@cloudflare/workers-types": "^5.20260808.1",
    "wrangler": "^4.120.0",
    "yaml": "^2.8.0",
    "zod": "^3.25.76",
```

- [ ] **Step 2: 安装**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm install`
Expected: 安装成功,`node_modules/zod`、`node_modules/yaml`、`node_modules/wrangler`、`node_modules/@cloudflare/workers-types` 均存在。

- [ ] **Step 3: `.gitignore` 追加忽略项**

在 `web/.gitignore` 末尾追加:

```gitignore

# field notes (独立 Worker 的本地产物)
notes-app/.dev.vars
notes-app/.wrangler/
field-notes/*/photos/
```

(`.env*` 已被现有规则忽略,无需再加。)

- [ ] **Step 4: `tsconfig.json` 排除 notes-app**

把 `web/tsconfig.json` 的 `exclude` 改为:

```json
  "exclude": ["node_modules", "notes-app"]
```

原因:`include` 里的 `**/*.ts` 会把 `notes-app/worker.ts` 卷进 `next build` 的类型检查,而它用的是 Cloudflare 运行时类型、还 `import page from './page.html'`,不排除会让主站构建报错。`scripts/*.mjs` 与 `notes-app/shared/*.mjs` 不匹配 include 的 `.ts/.tsx/.mts` 通配,天然不被 tsc 收录。

- [ ] **Step 5: `eslint.config.mjs` 忽略 notes-app 与 scripts**

把 `web/eslint.config.mjs` 里的 `globalIgnores([...])` 改成:

```js
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 独立 Worker / Node 脚本,不套 Next 的前端 lint 规则:
    "notes-app/**",
    "scripts/**",
  ]),
```

- [ ] **Step 6: 确认主站测试/构建/lint 不受影响**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run test && npm run lint && npm run build`
Expected: 三者全部通过(此刻还没有 notes-app 文件,等于确认脚手架改动没弄坏主站)。

- [ ] **Step 7: Commit**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add package.json package-lock.json .gitignore tsconfig.json eslint.config.mjs
git commit -m "chore(notes): add field-notes deps, scripts, ignore & lint/ts excludes"
```

---

## Task 2: Worker 配置(wrangler.jsonc + env.d.ts)

**Files:**
- Create: `web/notes-app/wrangler.jsonc`
- Create: `web/notes-app/env.d.ts`

- [ ] **Step 1: 建 `web/notes-app/wrangler.jsonc`**

```jsonc
// gourmet 现场笔记 Worker(与主站 Next.js 完全独立)
{
  "name": "gourmet-notes",
  "main": "worker.ts",
  "compatibility_date": "2026-07-01",
  "rules": [{ "type": "Text", "globs": ["**/*.html"], "fallthrough": false }],
  "r2_buckets": [{ "binding": "NOTES", "bucket_name": "gourmet-notes" }]
}
```

- [ ] **Step 2: 建 `web/notes-app/env.d.ts`**

```ts
declare module '*.html' {
  const content: string;
  export default content;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add notes-app/wrangler.jsonc notes-app/env.d.ts
git commit -m "chore(notes): add wrangler config and worker env types"
```

---

## Task 3: `shared/note.mjs` 纯逻辑 + 单测(TDD)

这是唯一有实质逻辑改动的文件,走完整 TDD。纯函数(`extractCoords`/`extractPlaceName`/`localStamp`/`slugify`/`photoFileName`/`photoLocalName`/`isUpToDate`/`checkToken`)照搬 travel;schema 换成 `kind: wine|place` + `wine`/`venue` 块门控;`noteFileName` 的 slug 源从 `place.name` 改成 `title`。

**Files:**
- Create: `web/notes-app/shared/note.mjs`
- Test: `web/notes-app/shared/note.test.mjs`

- [ ] **Step 1: 写失败的测试 `web/notes-app/shared/note.test.mjs`**

```js
import { describe, it, expect } from 'vitest';
import {
  safeParseNote, extractCoords, extractPlaceName,
  localStamp, noteFileName, photoFileName, photoLocalName, isUpToDate, checkToken,
} from './note.mjs';

const base = {
  id: '2026-08-14T20-30-00Z-a7f3',
  kind: 'wine',
  at: '2026-08-14T20:30:00+10:00',
  title: 'Muto Touriga Nacional 2022',
  created_at: '2026-08-14T10:31:02Z',
  updated_at: '2026-08-14T10:38:11Z',
};

describe('笔记 schema', () => {
  it('接受只有必填字段的笔记,并补齐默认值', () => {
    const r = safeParseNote({ ...base });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.body).toBe('');
      expect(r.data.photos).toEqual([]);
    }
  });

  it('缺 title 时失败', () => {
    const { title, ...noTitle } = base;
    expect(safeParseNote(noTitle).success).toBe(false);
  });

  it('title 为空字符串时失败', () => {
    expect(safeParseNote({ ...base, title: '' }).success).toBe(false);
  });

  it('kind 只能是 wine 或 place', () => {
    expect(safeParseNote({ ...base, kind: 'dive' }).success).toBe(false);
  });

  it('坐标必须是 [lng, lat] 且在合法范围内', () => {
    const ok = safeParseNote({ ...base, kind: 'place', place: { coords: [144.9631, -37.8136] } });
    expect(ok.success).toBe(true);
    const bad = safeParseNote({ ...base, kind: 'place', place: { coords: [-37.8136, 144.9631] } });
    expect(bad.success).toBe(false);
  });

  it('kind 为 place 时不允许带 wine 块', () => {
    const r = safeParseNote({ ...base, kind: 'place', wine: { winery: 'x' } });
    expect(r.success).toBe(false);
  });

  it('kind 为 wine 时不允许带 venue 块', () => {
    const r = safeParseNote({ ...base, kind: 'wine', venue: { cuisine: 'x' } });
    expect(r.success).toBe(false);
  });

  it('wine 字段全部可选,flavours 默认空数组、wine_type 默认 null', () => {
    const r = safeParseNote({ ...base, wine: { winery: 'Muto Wines' } });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.wine?.flavours).toEqual([]);
      expect(r.data.wine?.wine_type).toBeNull();
    }
  });

  it('venue 字段全部可选,dishes 默认空数组、category 默认 null', () => {
    const r = safeParseNote({ ...base, kind: 'place', venue: { cuisine: '尼日利亚菜' } });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.venue?.dishes).toEqual([]);
      expect(r.data.venue?.category).toBeNull();
    }
  });

  it('photos[].file 必填', () => {
    const r = safeParseNote({ ...base, photos: [{ note: '没有 file' }] });
    expect(r.success).toBe(false);
  });

  it('未传 place 时保持 undefined,不补成空对象', () => {
    const r = safeParseNote({ ...base });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.place).toBeUndefined();
  });

  it('at 必须是有效日期时间,非法月日被拒', () => {
    expect(safeParseNote({ ...base, at: '2026-13-03T20:30:00+10:00' }).success).toBe(false);
  });
});

describe('Google Maps 链接解析', () => {
  it('优先取 !3d/!4d 的地点精确坐标', () => {
    const url =
      'https://www.google.com/maps/place/Marys/@-37.7980,144.9840,15z/data=!4m6!3m5!1s0x0!8m2!3d-37.8010!4d144.9860';
    expect(extractCoords(url)).toEqual([144.986, -37.801]);
  });

  it('没有 !3d/!4d 时退回 @lat,lng', () => {
    expect(extractCoords('https://www.google.com/maps/place/Marys/@-37.8010,144.9860,17z'))
      .toEqual([144.986, -37.801]);
  });

  it('支持 ?q=lat,lng 形式', () => {
    expect(extractCoords('https://maps.google.com/?q=-37.8136,144.9631')).toEqual([144.9631, -37.8136]);
  });

  it('未展开的短链没有坐标,返回 null', () => {
    expect(extractCoords('https://maps.app.goo.gl/abcd1234')).toBeNull();
  });

  it('超出合法范围的数字视为无坐标', () => {
    expect(extractCoords('https://maps.google.com/?q=-999,144.9631')).toBeNull();
  });

  it('非字符串输入返回 null', () => {
    expect(extractCoords(undefined)).toBeNull();
  });

  it('路线链接不返回坐标', () => {
    expect(extractCoords('https://www.google.com/maps/dir/A/B/@-37.80,144.96,14z')).toBeNull();
  });

  it('认得 /maps/search/<纬度>,+<经度>(手机分享短链展开后的常见落点)', () => {
    expect(extractCoords('https://www.google.com/maps/search/-37.813600,+144.963100?entry=tts'))
      .toEqual([144.9631, -37.8136]);
  });

  it('/maps/search/ 的精确坐标优先于同一条链接里的 @ 取景框中心', () => {
    expect(extractCoords('https://www.google.com/maps/search/-37.813600,+144.963100/@10.0,20.0,12z'))
      .toEqual([144.9631, -37.8136]);
  });

  it('支持 ?query=lat,lng(api=1 分享格式)', () => {
    expect(extractCoords('https://www.google.com/maps/search/?api=1&query=-37.8136,144.9631'))
      .toEqual([144.9631, -37.8136]);
  });

  it('从 /maps/place/<名字>/ 取地名并还原空格', () => {
    expect(extractPlaceName('https://www.google.com/maps/place/Marys+Collingwood/@-37.80,144.98,17z'))
      .toBe('Marys Collingwood');
  });

  it('没有 place 段时地名为空字符串', () => {
    expect(extractPlaceName('https://maps.google.com/?q=-37.8,144.9')).toBe('');
  });

  it('HTML 正文里的地名不被 JSON 碎片污染', () => {
    const html =
      '[null,"https://www.google.com/maps/place/Marys,+Collingwood,+Melbourne",null,null,0,"","https://x.google.com"]';
    expect(extractPlaceName(html)).toBe('Marys, Collingwood, Melbourne');
  });
});

const wineNote = {
  ...base,
  place: { name: 'Barmera', gmaps_url: '', coords: null },
};

describe('文件名生成', () => {
  it('时间戳按字符串解析,不受运行机器时区影响', () => {
    expect(localStamp('2026-08-14T20:30:00+10:00')).toBe('2026-08-14-2030');
    expect(localStamp('2026-08-14T20:30:00-05:00')).toBe('2026-08-14-2030');
  });

  it('笔记文件名的 slug 来自 title', () => {
    expect(noteFileName(wineNote)).toBe('2026-08-14-2030-muto-touriga-nacional-2022.yaml');
  });

  it('title 清成空 slug 时省略 slug 段', () => {
    expect(noteFileName({ ...wineNote, title: '🍷🍷' })).toBe('2026-08-14-2030.yaml');
  });

  it('撞名时补 id 后缀', () => {
    const taken = ['2026-08-14-2030-muto-touriga-nacional-2022.yaml'];
    expect(noteFileName(wineNote, taken)).toBe('2026-08-14-2030-muto-touriga-nacional-2022-a7f3.yaml');
  });

  it('补了 id 后缀仍撞名时继续加序号,绝不返回已占用的名字', () => {
    const taken = [
      '2026-08-14-2030-muto-touriga-nacional-2022.yaml',
      '2026-08-14-2030-muto-touriga-nacional-2022-a7f3.yaml',
    ];
    const name = noteFileName(wineNote, taken);
    expect(name).toBe('2026-08-14-2030-muto-touriga-nacional-2022-a7f3-2.yaml');
    expect(taken).not.toContain(name);
  });

  it('中日文标题原样保留在文件名里', () => {
    expect(noteFileName({ ...wineNote, title: '相馬菓子舗' })).toBe('2026-08-14-2030-相馬菓子舗.yaml');
  });

  it('照片名用笔记时刻加两位序号', () => {
    expect(photoFileName(wineNote, 1)).toBe('2026-08-14-2030-01.jpg');
    expect(photoFileName(wineNote, 12)).toBe('2026-08-14-2030-12.jpg');
  });

  it('at 畸形时 photoFileName 抛错', () => {
    expect(() => photoFileName({}, 1)).toThrow();
  });

  it('本地平铺时同分钟撞名的照片补 id 后缀', () => {
    expect(photoLocalName(wineNote, '2026-08-14-2030-01.jpg', [])).toBe('2026-08-14-2030-01.jpg');
    expect(photoLocalName(wineNote, '2026-08-14-2030-01.jpg', ['2026-08-14-2030-01.jpg']))
      .toBe('2026-08-14-2030-01-a7f3.jpg');
  });
});

describe('幂等与鉴权', () => {
  it('updated_at 相同才算已是最新', () => {
    expect(isUpToDate({ updated_at: 'x' }, { updated_at: 'x' })).toBe(true);
    expect(isUpToDate({ updated_at: 'x' }, { updated_at: 'y' })).toBe(false);
    expect(isUpToDate(null, { updated_at: 'x' })).toBe(false);
  });

  it('token 相等才放行,类型或长度不符一律拒绝', () => {
    expect(checkToken('abc123', 'abc123')).toBe(true);
    expect(checkToken('abc124', 'abc123')).toBe(false);
    expect(checkToken('abc', 'abc123')).toBe(false);
    expect(checkToken(null, 'abc123')).toBe(false);
    expect(checkToken('abc123', '')).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npx vitest run notes-app/shared/note.test.mjs`
Expected: FAIL —— `Cannot find module './note.mjs'` / import 解析失败。

- [ ] **Step 3: 写实现 `web/notes-app/shared/note.mjs`**

```js
// gourmet 现场笔记的纯逻辑:Worker 与 scripts/notes-pull.mjs 共用这一份。
// 写成 .mjs 是因为 Node 的 .mjs 不能 import .ts;单一实现,vitest 直接测。
import { z } from 'zod';

const nonEmpty = z.string().min(1);
const coords = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const placeSchema = z.object({
  name: z.string().default(''),
  gmaps_url: z.string().default(''),
  coords: coords.nullable().default(null),
});

export const wineSchema = z.object({
  winery: z.string().default(''),
  wine_type: z.enum(['red', 'white', 'rose', 'sparkling']).nullable().default(null),
  vintage: z.string().default(''),
  abv: z.string().default(''),        // 存字符串,照抄酒标(带 % / 小数)
  varieties: z.string().default(''),
  region: z.string().default(''),
  price_aud: z.string().default(''),  // 字符串,与 wines.json 里一致
  pairing: z.string().default(''),
  flavours: z.array(nonEmpty).default([]),
});

export const venueSchema = z.object({
  category: z.enum(['food', 'cafe', 'bar']).nullable().default(null),
  cuisine: z.string().default(''),
  dishes: z.array(nonEmpty).default([]),
});

export const photoSchema = z.object({
  file: nonEmpty,
  note: z.string().default(''),
});

export const noteSchema = z
  .object({
    id: nonEmpty,
    kind: z.enum(['wine', 'place']),
    at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'at 必须是带日期与时刻的 ISO 字符串')
      .refine((v) => !Number.isNaN(Date.parse(v)), '不是有效日期时间'),
    title: nonEmpty,
    place: placeSchema.optional(),
    body: z.string().default(''),
    wine: wineSchema.optional(),
    venue: venueSchema.optional(),
    photos: z.array(photoSchema).default([]),
    created_at: nonEmpty,
    updated_at: nonEmpty,
  })
  // kind 为 place 时不能带 wine 块;kind 为 wine 时不能带 venue 块(与 travel 里 dive 块的 refine 同理)
  .refine((n) => n.kind === 'wine' || n.wine === undefined, {
    message: 'kind 为 place 时不能带 wine 块',
    path: ['wine'],
  })
  .refine((n) => n.kind === 'place' || n.venue === undefined, {
    message: 'kind 为 wine 时不能带 venue 块',
    path: ['venue'],
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
  return [round6(lng), round6(lat)]; // [lng, lat]
}

/**
 * 从展开后的 Google Maps 长链里提取坐标,返回 [lng, lat] 或 null。
 * 优先级:明确指名某个点的写法(!3d/!4d、/maps/search/lat,lng、?q=/?query=)排在 @lat,lng 前面。
 */
export function extractCoords(url) {
  if (typeof url !== 'string') return null;
  if (/\/maps\/dir\//.test(url)) return null; // 路线链接里的坐标是取景框/途经点,宁可返回 null 让人手填
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

/** 从 /maps/place/<名字>/ 取地名;取不到返回空字符串 */
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

/** 取 at 字符串里的当地日期与时刻 → '2026-08-14-2030'。按字符解析,不经 Date,避免运行机器时区干扰 */
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
    // 文件名不是 URL,中日文原样留着更好翻;只清掉文件系统/shell 不友好的字符
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

const idSuffix = (note) => String(note.id).split('-').pop();

/** field-notes 里的笔记文件名;slug 取自 title。taken 是该目录已有文件名,用于避开撞名 */
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

/** 一条笔记内第 index 张照片的名字(index 从 1 开始) */
export function photoFileName(note, index) {
  return `${localStamp(note.at)}-${String(index).padStart(2, '0')}.jpg`;
}

/** 本地照片按 kind 平铺,两条笔记落在同一分钟会撞名,补 id 后缀 */
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

/** 定长比较,避免因提前 return 泄露前缀信息 */
export function checkToken(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (expected.length === 0 || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npx vitest run notes-app/shared/note.test.mjs`
Expected: PASS —— 约 30 个用例全部通过。

- [ ] **Step 5: 确认主站测试没被带坏**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run test`
Expected: PASS —— 主站原有测试 + 新增 note.test.mjs 一起全绿。

- [ ] **Step 6: Commit**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add notes-app/shared/note.mjs notes-app/shared/note.test.mjs
git commit -m "feat(notes): shared schema & pure logic for wine/place field notes"
```

---

## Task 4: `worker.ts`(移植 travel,`:trip` → `:kind`)

worker.ts 逻辑与 travel 几乎一致,把「trip」概念换成「kind」并加白名单校验。

**Files:**
- Create: `web/notes-app/worker.ts`(以 travel 的 `worker.ts` 为底)

- [ ] **Step 1: 复制 travel 的 worker.ts 作为起点**

Run:
```bash
cp /Users/tantianshu/Documents/code/travel-timeline/notes-app/worker.ts \
   /Users/tantianshu/Documents/code/gourmet/web/notes-app/worker.ts
```

- [ ] **Step 2: 顶部加 kind 白名单常量**

在 `web/notes-app/worker.ts` 里 `const noteKey = ...` 这一行**上方**插入:

```ts
const KINDS = ['wine', 'place'];
```

- [ ] **Step 3: 全局把标识符 `trip` 改成 `kind`**

在 `web/notes-app/worker.ts` 内,把所有作为**变量名/解构名/字符串键**的 `trip` 改成 `kind`(worker.ts 里 `trip` 不作为任何其它单词的子串出现,可安全整体替换),并把错误文案里的「旅行」改为「类型」。涉及:

- `noteKey(trip, id)` / `notePrefix(trip, id)` / `photoPrefix` / `photoKey` 的形参与内部 `${trip}` → `kind`
- 列表路由 `const trip = url.searchParams.get('trip')` → `const kind = url.searchParams.get('kind')`
- 各路由里的 `const [, , trip, id] = seg` → `const [, , kind, id] = seg`,以及后续所有 `trip` 引用
- PUT 里 `if (note.trip !== trip || note.id !== id)` → `if (note.kind !== kind || note.id !== id)`,文案改「路径与笔记内容里的 kind/id 不一致」

- [ ] **Step 4: 列表路由校验 kind 白名单**

把列表路由(`seg[1] === 'notes' && seg.length === 2 && GET`)里的这段:

```ts
        const kind = url.searchParams.get('kind');
        if (!kind || kind.includes('/')) return json({ error: '缺少 kind 参数,或 kind 里不能有斜杠' }, 400);
```

改成:

```ts
        const kind = url.searchParams.get('kind');
        if (!kind || !KINDS.includes(kind)) return json({ error: 'kind 只能是 wine 或 place' }, 400);
        const objects = await listAll(env.NOTES, { prefix: `${kind}/`, include: ['customMetadata'] });
```

(第三行是原本就有的 `list` 调用,列出来确认 `prefix` 用的是 `${kind}/`。)

- [ ] **Step 5: 其余路由把 kind 的斜杠校验换成白名单校验**

在这几处路由里(单条 GET/PUT/DELETE、上传照片 POST、删照片 DELETE、取照片 GET),原本对第一段做的是 `if (trip.includes('/') || id.includes('/'))`。把其中针对 kind 的那半改成白名单校验,例如单条笔记路由:

```ts
      if (seg[1] === 'notes' && seg.length === 4) {
        const [, , kind, id] = seg;
        if (!KINDS.includes(kind) || id.includes('/')) {
          return json({ error: 'kind 只能是 wine 或 place,id 里不能有斜杠' }, 400);
        }
```

对 `seg.length === 5`(上传照片)、`seg.length === 6`(删照片)、`seg[1] === 'photos'`(取照片)三处同理:kind 用 `!KINDS.includes(kind)`,`id`/`file` 仍保留 `.includes('/')` 检查。

- [ ] **Step 6: 本地起 Worker 冒烟(用本地 R2 模拟)**

Run(前台起服务,新开一个终端跑 curl):
```bash
cd /Users/tantianshu/Documents/code/gourmet/web && npm run notes:dev
```
Expected: wrangler 打印 `Ready on http://localhost:8787`(端口以实际输出为准),无编译错误。

在另一终端设一个本地 token(`notes:dev` 会读 `notes-app/.dev.vars`)。先建 `web/notes-app/.dev.vars`:
```
NOTES_TOKEN=devtoken
```
重启 `notes:dev` 后 curl:
```bash
# 无 token → 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/api/notes?kind=wine
# 带 token,空列表 → {"notes":[]}
curl -s -H "X-Notes-Token: devtoken" "http://localhost:8787/api/notes?kind=wine"
# 非法 kind → 400
curl -s -H "X-Notes-Token: devtoken" "http://localhost:8787/api/notes?kind=dive"
# PUT 一条 → 回显笔记 JSON
curl -s -H "X-Notes-Token: devtoken" -H "content-type: application/json" -X PUT \
  --data '{"id":"t1","kind":"wine","at":"2026-08-14T20:30:00+10:00","title":"Test","created_at":"2026-08-14T10:30:00Z","updated_at":"2026-08-14T10:30:00Z"}' \
  http://localhost:8787/api/notes/wine/t1
# 列表里出现 t1
curl -s -H "X-Notes-Token: devtoken" "http://localhost:8787/api/notes?kind=wine"
# resolve-place(需联网):解析出坐标
curl -s -H "X-Notes-Token: devtoken" -H "content-type: application/json" -X POST \
  --data '{"url":"https://www.google.com/maps/?q=-37.8136,144.9631"}' \
  http://localhost:8787/api/resolve-place
```
Expected: 依次得到 `401` / `{"notes":[]}` / `kind 只能是 wine 或 place` / 笔记 JSON / 含 t1 的列表 / `{"name":"","coords":[144.9631,-37.8136],...}`。验证完 `Ctrl-C` 停掉 `notes:dev`。

- [ ] **Step 7: Commit**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add notes-app/worker.ts
git commit -m "feat(notes): worker API partitioned by kind (wine/place)"
```

---

## Task 5: `scripts/notes-pull.mjs`(移植 travel,按 kind 分区)

**Files:**
- Create: `web/scripts/notes-pull.mjs`(以 travel 的 `scripts/notes-pull.mjs` 为底)

- [ ] **Step 1: 复制 travel 的 notes-pull.mjs**

Run:
```bash
mkdir -p /Users/tantianshu/Documents/code/gourmet/web/scripts
cp /Users/tantianshu/Documents/code/travel-timeline/scripts/notes-pull.mjs \
   /Users/tantianshu/Documents/code/gourmet/web/scripts/notes-pull.mjs
```

(import 路径 `../notes-app/shared/note.mjs` 在 gourmet 里同样成立,不用改。)

- [ ] **Step 2: 把「遍历 trip」改成「遍历固定的两个 kind」**

在 `web/scripts/notes-pull.mjs` 里,把这段(决定要拉哪些 trip 的逻辑):

```js
const tripsArg = process.argv[2];

// 没指定 trip 时,拉本地已有的全部 trip;一个都没有就必须显式指定
const trips = tripsArg
  ? [tripsArg]
  : existsSync('field-notes')
    ? (await readdir('field-notes', { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
if (!trips.length) {
  console.error('第一次拉取请指定旅行,例:npm run notes:pull bali-2026');
  process.exit(1);
}
```

替换成:

```js
const KINDS = ['wine', 'place'];
const kindArg = process.argv[2];
if (kindArg && !KINDS.includes(kindArg)) {
  console.error('用法:npm run notes:pull [wine|place](省略则两种都拉)');
  process.exit(1);
}
const kinds = kindArg ? [kindArg] : KINDS;
```

- [ ] **Step 3: 把 `pullTrip` 改名并按 kind 组织目录与接口**

把函数 `async function pullTrip(trip) { ... }` 改为 `async function pullKind(kind) { ... }`,并在函数体内:

- 目录:`const noteDir = \`field-notes/${kind}/notes\`;` / `const photoDir = \`field-notes/${kind}/photos\`;`
- 列表接口:`await api(\`/api/notes?kind=${encodeURIComponent(kind)}\`)`
- 单条接口:`await api(\`/api/notes/${encodeURIComponent(kind)}/${encodeURIComponent(s.id)}\`)`
- 照片接口:`await api(\`/api/photos/${encodeURIComponent(kind)}/${encodeURIComponent(note.id)}/${encodeURIComponent(p.file)}\`)`
- 末尾 `console.log` 里的 `${trip}:` → `${kind}:`(`wine`/`place` 前缀)

`readdir('field-notes'...)` 的引用已在 Step 2 删掉;`existsSync` 仍用于照片去重判断,保留 import 不动。

- [ ] **Step 4: 把底部的调用循环改成遍历 kinds**

把文件底部:

```js
try {
  for (const trip of trips) {
    await pullTrip(trip);
  }
} catch (err) {
```

改成:

```js
try {
  for (const kind of kinds) {
    await pullKind(kind);
  }
} catch (err) {
```

- [ ] **Step 5: 用本地 Worker 跑通一次 pull**

先起本地 Worker(`npm run notes:dev`,沿用 Task 4 Step 6 的 `.dev.vars` token),PUT 进一条带一张照片的笔记(或复用 Task 4 存的 `t1`)。另建 `web/.env`:
```
NOTES_URL=http://localhost:8787
NOTES_TOKEN=devtoken
```
Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run notes:pull wine`
Expected: 打印 `wine: 新增 N 条、更新 0 条、下载 M 张照片`;`web/field-notes/wine/notes/*.yaml` 出现,`coords` 若有则为行内 `[lng, lat]`。再跑一次同命令 → `新增 0 条、更新 0 条`(验证幂等)。停掉 `notes:dev`。

- [ ] **Step 6: Commit**(注意 `.env` / `field-notes/*/photos/` 已被 gitignore,只提交脚本与笔记 yaml)

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add scripts/notes-pull.mjs
git commit -m "feat(notes): notes:pull to field-notes/<kind>/, one-way & idempotent"
```

---

## Task 6: `page.html`(手机端两表单,移植 travel + 改造)

travel 的 `page.html` 里,压缩 / api / token / 草稿 / 照片网格 / 缩略图缓存这些机制**原样保留**;要改的是:去掉 trip 输入、把类型切换换成「🍷酒 / 🍽️店」、把地点块并进「店」表单、加两种类型各自的字段、`collect`/`fillForm`/`blankNote`/列表按 kind 组织。page.html 没有单测,靠 `notes:dev` + 手机冒烟验证(见 Task 7 / Task 8)。

**Files:**
- Create: `web/notes-app/page.html`(以 travel 的 `page.html` 为底)

- [ ] **Step 1: 复制 travel 的 page.html**

Run:
```bash
cp /Users/tantianshu/Documents/code/travel-timeline/notes-app/page.html \
   /Users/tantianshu/Documents/code/gourmet/web/notes-app/page.html
```

- [ ] **Step 2: 改标题**

把 `<title>途中笔记</title>` 改成 `<title>gourmet 笔记</title>`。

- [ ] **Step 3: 替换编辑器 DOM(`<div id="editor" ...>` 整块)**

把从 `<div id="editor" hidden>` 到它对应的 `</div>`(travel 里约 65–121 行,含 trip 输入、时间、标题、地点、正文、diveBlock、删除按钮、photoBlock、status)整体替换成:

```html
  <div id="editor" hidden>
    <div class="seg">
      <button type="button" data-kind="wine" aria-pressed="true">🍷 酒</button>
      <button type="button" data-kind="place" aria-pressed="false">🍽️ 店</button>
    </div>

    <label for="at">时间</label>
    <input id="at" type="datetime-local" />

    <label for="title">标题 *</label>
    <input id="title" placeholder="酒名 / 店名" />

    <label for="body">正文</label>
    <textarea id="body" placeholder="想到什么写什么"></textarea>

    <div id="wineBlock">
      <label>风味关键词</label>
      <div class="tags" id="flavours"></div>

      <label for="winery">酒庄</label>
      <input id="winery" placeholder="Muto Wines" />

      <label for="wine_type">类型</label>
      <select id="wine_type">
        <option value="">未填</option><option value="red">红</option><option value="white">白</option>
        <option value="rose">桃红</option><option value="sparkling">气泡</option>
      </select>

      <div class="grid4" style="margin-top:14px">
        <div><label for="vintage">年份</label><input id="vintage" inputmode="numeric" /></div>
        <div><label for="abv">ABV</label><input id="abv" placeholder="13%" /></div>
        <div style="grid-column:span 2"><label for="price_aud">价格 AUD</label><input id="price_aud" inputmode="decimal" /></div>
      </div>

      <label for="varieties">品种</label>
      <input id="varieties" placeholder="Touriga Nacional" />
      <label for="region">产区</label>
      <input id="region" placeholder="Riverland, SA" />
      <label for="pairing">配餐</label>
      <input id="pairing" placeholder="配了什么吃的" />
    </div>

    <div id="venueBlock">
      <label>招牌菜 / 关键词</label>
      <div class="tags" id="dishes"></div>

      <label for="category">类别</label>
      <select id="category">
        <option value="">未填</option><option value="food">美食</option>
        <option value="cafe">咖啡</option><option value="bar">酒吧</option>
      </select>

      <label for="cuisine">菜系</label>
      <input id="cuisine" placeholder="尼日利亚菜" />

      <label for="gmaps">地点(Google Maps 链接)</label>
      <div class="row">
        <input id="gmaps" style="flex:1;min-width:0" placeholder="贴 Google Maps 链接" />
        <button class="btn" id="here" type="button">当前</button>
      </div>
      <div id="placeInfo" style="font-size:12px;color:var(--muted);padding-top:4px"></div>
      <input id="coords" style="margin-top:6px" placeholder="解析不出时手填:经度, 纬度" />
    </div>

    <button class="btn" id="delNote" type="button" style="margin-top:14px;color:#a32d2d">删除这条笔记</button>

    <div id="photoBlock"></div>
    <div id="status"></div>
  </div>
```

- [ ] **Step 4: 替换 `blankNote()`**

把 `function blankNote() { ... }` 整体替换成:

```js
function blankNote() {
  return {
    id: newId(),
    kind: localStorage.getItem('notes_last_kind') || 'wine',
    at: '',
    title: '',
    place: { name: '', gmaps_url: '', coords: null },
    body: '',
    wine: {},
    venue: {},
    photos: [],
  };
}
```

- [ ] **Step 5: 改标签状态与 `renderTags` 的 prompt 文案**

把 `let tags = { life: [], buddies: [] };` 改成:

```js
let tags = { flavours: [], dishes: [] };
```

把 `renderTags` 里那行 add 按钮的 onclick:

```js
  add.onclick = () => addTag(key, prompt(key === 'life' ? '看到了什么?' : '同行人(化名/角色)'));
```

改成:

```js
  add.onclick = () => addTag(key, prompt(key === 'flavours' ? '风味关键词?' : '招牌菜 / 关键词?'));
```

- [ ] **Step 6: 替换 `fillForm()`**

把 `function fillForm(n) { ... }` 整体替换成:

```js
function fillForm(n) {
  clearThumbCache();
  note = n;
  $('at').value = n.at ? n.at.slice(0, 16) : toLocalInput(new Date());
  $('title').value = n.title;
  $('body').value = n.body || '';
  $('gmaps').value = n.place?.gmaps_url || '';
  setPlace(n.place || { name: '', gmaps_url: '', coords: null });
  for (const k of ['winery', 'vintage', 'abv', 'varieties', 'region', 'price_aud', 'pairing']) {
    $(k).value = n.wine?.[k] ?? '';
  }
  $('wine_type').value = n.wine?.wine_type ?? '';
  $('cuisine').value = n.venue?.cuisine ?? '';
  $('category').value = n.venue?.category ?? '';
  tags = {
    flavours: n.wine?.flavours ? [...n.wine.flavours] : [],
    dishes: n.venue?.dishes ? [...n.venue.dishes] : [],
  };
  setKind(n.kind);
  renderTags('flavours'); renderTags('dishes');
  renderPhotos();
}
```

- [ ] **Step 7: 替换 `setKind()`**

把 `function setKind(kind) { ... }` 整体替换成:

```js
function setKind(kind) {
  note.kind = kind;
  document.querySelectorAll('[data-kind]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  $('wineBlock').hidden = kind !== 'wine';
  $('venueBlock').hidden = kind !== 'place';
}
```

- [ ] **Step 8: 删掉潜水数值校验(`NUM_FIELDS` / `numField`)**

删除 travel 里的 `const NUM_FIELDS = [...]` 数组与 `function numField(...) {...}` 整个函数(gourmet 的酒字段都是字符串,不需要数值校验)。

- [ ] **Step 9: 替换 `collect()`**

把 `function collect() { ... }` 整体替换成:

```js
function collect() {
  const now = new Date().toISOString();
  const n = {
    ...note,
    at: withOffset($('at').value),
    title: str('title'),
    body: str('body'),
    created_at: note.created_at || now,
    updated_at: now,
  };
  if (n.kind === 'wine') {
    n.wine = {
      winery: str('winery'),
      wine_type: str('wine_type') || null,
      vintage: str('vintage'),
      abv: str('abv'),
      varieties: str('varieties'),
      region: str('region'),
      price_aud: str('price_aud'),
      pairing: str('pairing'),
      flavours: tags.flavours,
    };
    delete n.venue;   // wine 不带 venue 块(见 noteSchema 的 refine)
    delete n.place;   // 酒不采集地点
  } else {
    n.venue = {
      category: str('category') || null,
      cuisine: str('cuisine'),
      dishes: tags.dishes,
    };
    n.place = {
      name: note.place?.name || '',
      gmaps_url: str('gmaps'),
      coords: note.place?.coords ?? null,
    };
    delete n.wine;    // place 不带 wine 块
  }
  return n;
}
```

- [ ] **Step 10: API 路径:`trip` → `kind`,标题必填校验去掉 trip**

page.html 的 JS 里所有 `/api/notes/${encodeURIComponent(n.trip)}/...`、`?trip=` 等,把 `n.trip` / `note.trip` 替换为 `n.kind` / `note.kind`,`?trip=` 替换为 `?kind=`。具体位置:`saveNote`(PUT)、`addPhotos`(PUT + 上传 URL)、`photoUrl`、`delPhoto`、`openList`(GET 列表)、`openNote`(GET 单条)、`delNote`(DELETE)。同时:

- `saveNote` 里 `if (!n.trip || !n.title) { say('旅行和标题必填'); ... }` → `if (!n.title) { say('标题必填'); return false; }`;并把 `localStorage.setItem('notes_last_trip', n.trip)` 改成 `localStorage.setItem('notes_last_kind', n.kind)`。
- `addPhotos` 里 `if (!n.trip || !n.title) { say('先填旅行和标题,再加照片'); ... }` → `if (!n.title) { say('先填标题,再加照片'); return; }`。

- [ ] **Step 11: 替换列表逻辑 `openList()`(按 kind,不再有 trip 输入)**

把 `async function openList() { ... }` 整体替换成(单函数;顶部 kind 切换直接递归调用自己,pressed 状态与列表体一起重建):

```js
async function openList(kind) {
  kind = kind || note?.kind || localStorage.getItem('notes_last_kind') || 'wine';
  localStorage.setItem('notes_last_kind', kind);
  showList();
  $('head').textContent = kind === 'wine' ? '酒' : '店';
  const box = $('list');
  box.innerHTML = '';

  // 顶部 kind 切换:决定看哪一类的列表
  const seg = document.createElement('div');
  seg.className = 'seg';
  for (const [k, lbl] of [['wine', '🍷 酒'], ['place', '🍽️ 店']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = lbl;
    b.setAttribute('aria-pressed', String(k === kind));
    b.onclick = () => openList(k);
    seg.append(b);
  }
  box.append(seg);

  const msg = (t) => {
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--muted);font-size:13px';
    p.textContent = t;
    box.append(p);
  };
  try {
    const { notes } = await api(`/api/notes?kind=${encodeURIComponent(kind)}`);
    if (!notes.length) msg(kind === 'wine' ? '还没有酒笔记' : '还没有店笔记');
    notes.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'item';
      // 结构是写死的静态标签,数据一律 textContent 填,不用 innerHTML 拼业主输入
      row.innerHTML = '<div class="ph"></div><div><b></b><span></span></div>';
      row.querySelector('b').textContent = s.title;
      row.querySelector('span').textContent =
        `${s.at.slice(0, 16).replace('T', ' ')} · ${s.photo_count} 张`;
      if (s.photo_count > 0) row.querySelector('.ph').textContent = String(s.photo_count);
      row.onclick = () => openNote(kind, s.id);
      box.append(row);
    });
  } catch (e) {
    msg(`加载失败:${e.message}`);
  }

  const add = document.createElement('button');
  add.className = 'btn';
  add.type = 'button';
  add.style.marginTop = '14px';
  add.textContent = kind === 'wine' ? '＋ 新酒笔记' : '＋ 新店笔记';
  add.onclick = () => {
    const n = blankNote();
    n.kind = kind;
    localStorage.removeItem(DRAFT);
    fillForm(n);
    $('head').textContent = '新笔记';
    showEditor();
    say('');
  };
  box.append(add);
}
```

`$('back')`、`$('delNote')`、启动兜底都仍调用 `openList()`(无参),会自动回到 `note.kind` 或上次的 kind。

- [ ] **Step 12: `openNote` 签名 `trip` → `kind`**

把 `async function openNote(trip, id) { ... }` 的形参与内部 `trip` 改成 `kind`(GET 路径用 `${encodeURIComponent(kind)}`)。

- [ ] **Step 13: 本地起 Worker,用浏览器手动过一遍两种表单**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run notes:dev`
在电脑浏览器打开 `http://localhost:8787/#t=devtoken`(用 Task 4 的 `.dev.vars` token)。检查:
- 顶部 🍷酒/🍽️店 切换,字段块随之显示/隐藏(酒:酒庄/类型/年份/ABV/品种/产区/价格/配餐/风味标签;店:类别/菜系/Google Maps/招牌菜标签)。
- 存一条酒、一条店 → 返回列表能看到、能点进去编辑、能删。
- 店表单贴一个 Google Maps 链接点解析,`placeInfo` 显示店名/已定位。
Expected: 两种表单都能存/读/改/删;控制台无报错。停掉 `notes:dev`。

- [ ] **Step 14: Commit**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add notes-app/page.html
git commit -m "feat(notes): mobile form with wine/place kinds"
```

---

## Task 7: 端到端本地冒烟 + 主站回归

**Files:** 无(纯验证)

- [ ] **Step 1: 完整链路本地跑一遍**

起 `npm run notes:dev`(带 `.dev.vars` 的 devtoken),浏览器 `http://localhost:8787/#t=devtoken`:各存一条带 1–2 张照片的酒笔记与店笔记。然后另开终端(`web/.env` 指向 `http://localhost:8787`):
```bash
cd /Users/tantianshu/Documents/code/gourmet/web && npm run notes:pull
```
Expected: 打印 `wine: 新增 1 …` 与 `place: 新增 1 …`;`web/field-notes/wine/notes/*.yaml`、`web/field-notes/place/notes/*.yaml`、以及 `photos/` 下的 `.jpg` 均出现;yaml 里 `flavours`/`dishes` 是列表,`coords`(若店有)是行内数组。再跑一次 → 全部 `新增 0`(幂等)。

- [ ] **Step 2: 确认笔记照片没进 git、yaml 进得去**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && git status --porcelain field-notes`
Expected: 只列出 `field-notes/wine/notes/*.yaml` 和 `field-notes/place/notes/*.yaml`(照片被 `.gitignore` 挡住,不出现)。

- [ ] **Step 3: 主站回归——构建/测试/lint 全绿,部署无变化**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run test && npm run lint && npm run build`
Expected: 三者全部通过;`out/` 里**不含** notes-app / field-notes 任何内容(主站零改动的硬约束成立)。

- [ ] **Step 4: 提交本地冒烟产出的样例笔记(可选)**

```bash
cd /Users/tantianshu/Documents/code/gourmet/web
git add field-notes/*/notes/*.yaml
git commit -m "test(notes): sample field notes from local smoke run"
```
(若不想把测试样例入库,可跳过并删掉 `field-notes/` 里的样例文件。)

---

## Task 8: 上线部署 + 真机冒烟(业主一次性动作)

> 本 Task 需要业主的 Cloudflare 账号(已绑卡、R2 可用),由业主执行或在业主在场时执行。非代码任务,不产生提交。

- [ ] **Step 1: 建 R2 桶**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npx wrangler r2 bucket create gourmet-notes`
Expected: 提示桶创建成功。

- [ ] **Step 2: 生成并设置 token**

Run:
```bash
openssl rand -hex 32   # 记下这串
cd /Users/tantianshu/Documents/code/gourmet/web
npx wrangler secret put NOTES_TOKEN --config notes-app/wrangler.jsonc   # 粘贴上面那串
```
并把同一串写进 `web/.env`(已 gitignore):
```
NOTES_URL=https://gourmet-notes.tianshu-tan.workers.dev
NOTES_TOKEN=<那串>
```

- [ ] **Step 3: 部署 Worker**

Run: `cd /Users/tantianshu/Documents/code/gourmet/web && npm run notes:deploy`
Expected: 打印已部署到 `https://gourmet-notes.tianshu-tan.workers.dev`。

- [ ] **Step 4: 手机加主屏**

手机用 Safari 打开 `https://gourmet-notes.tianshu-tan.workers.dev/?t=<那串>`(⚠️ `?t=` **不是** `#t=`——2026-08-15 真机踩实:iOS 主屏 app 会吞掉 URL 里的 `#fragment`、且存储与 Safari 隔离,只有 `?t=` 能随图标存下),**直接「添加到主屏幕」**。token 随图标保存,独立 app 里没有地址栏、看不见。

- [ ] **Step 5: 真机冒烟清单**(模拟不了,必须真机过一遍)

- [ ] 🍷酒:存一条带 3–5 张照片的 → 照片确实被压到长边 1600px(几百 KB)、方向正确
- [ ] 🍽️店:贴 Google Maps 分享短链 → 能解析出店名/坐标
- [ ] 相册多选一次选 8–10 张 → 串行处理不卡死、逐张进网格
- [ ] 编辑已存笔记:改文字、删一张照片、加一张 → 保存成功
- [ ] 断网时打字 → 恢复网络回来内容还在(localStorage 草稿)
- [ ] 电脑 `npm run notes:pull` → 两类笔记与照片正确落地
- [ ] 手机 app 里把已发布的笔记整条删掉 → 列表消失、R2 清掉

---

## Self-Review

**1. Spec coverage（对照设计文档逐节）:**
- §3 架构 / 独立 Worker / 三条实现约束 → Task 1(deps/exclude)+ Task 2(wrangler)+ Task 4(worker)✓
- §4 数据模型(kind、wine/venue 门控、place、R2/本地布局、文件名规则)→ Task 3(schema + 文件名)✓
- §5 手机端两表单 → Task 6 ✓
- §6 Worker API(:kind、白名单、resolve-place、鉴权闸口)→ Task 4 ✓
- §7 notes:pull(按 kind、幂等、.part、孤儿只报告)→ Task 5(照搬保留这些行为)✓
- §8 成稿映射 → 属 Claude 成稿时的对话动作,不落代码(设计文档 §8 已定义),计划无需任务 ✓
- §9 安全隐私(token/fragment、EXIF 剥离、笔记不进构建、SSRF 白名单、gitignore)→ Task 1(gitignore)+ Task 4(白名单)+ Task 6(压缩剥 EXIF、token)+ Task 7 Step 3(不进构建)✓
- §10 测试(shared 单测、无 e2e、主站不受影响)→ Task 3 + Task 7 ✓
- §11 YAGNI → 计划未引入评分/离线/双向同步/自动成稿/批量清理 ✓
- §13 部署与一次性动作 → Task 8 ✓

**2. Placeholder 扫描:** 无 TBD/TODO;所有代码步骤给了完整代码或精确的 old→new 编辑;移植文件均指明「复制参考文件 + 具体改动」,参考文件在本机可读。✓

**3. 类型/命名一致性:** 导出函数名(`safeParseNote`/`extractCoords`/`extractPlaceName`/`localStamp`/`noteFileName`/`photoFileName`/`photoLocalName`/`isUpToDate`/`checkToken`)在 note.mjs、note.test.mjs、worker.ts(Step 3 import 不变)、notes-pull.mjs(import 不变)间一致;`kind` 值域 `wine|place` 在 schema、worker `KINDS`、pull `KINDS`、page.html seg 按钮间一致;R2 键前缀 `${kind}/` 与 pull 目录 `field-notes/<kind>/` 对应。✓

---

**执行方式见文末 handoff。**
