// 用法: node scripts/notes-pull.mjs [wine|place]
// 从途中笔记 Worker 拉笔记与照片,写进 field-notes/。单向、幂等,不动 R2 上的任何东西。
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Document, parse, visit } from 'yaml';
import { noteFileName, photoLocalName, isUpToDate, safeParseNote } from '../notes-app/shared/note.mjs';

// process.loadEnvFile 是 Node 21.7+ 的能力,本机 22.2 没问题。文件不存在(ENOENT)时允许
// 直接用外部环境变量;其他错误(比如权限问题、传了个目录进来)不要吞掉,让用户看到原因
try {
  process.loadEnvFile('.env');
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error(`.env 读取失败:${err.message}\n也可以不用 .env,直接在环境变量里设置 NOTES_URL / NOTES_TOKEN 后重试。`);
    process.exit(1);
  }
}

const BASE = process.env.NOTES_URL;
const TOKEN = process.env.NOTES_TOKEN;
if (!BASE || !TOKEN) {
  console.error('缺少 NOTES_URL 或 NOTES_TOKEN(放在 .env 里,或者直接设置成环境变量)');
  process.exit(1);
}

const api = async (path) => {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { 'X-Notes-Token': TOKEN } });
  } catch (err) {
    // fetch 本身抛出通常是连不上(地址错、Worker 没启动、断网),不是业务错误,单独给一句人话
    throw new Error(`连不上 ${BASE}(${err.message})。请检查 .env 里的 NOTES_URL,以及 Worker 是否在运行。`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const body = JSON.parse(text);
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      /* 不是 JSON,原样展示 */
    }
    if (res.status === 401) {
      throw new Error(`Token 不对或已失效(${message})。请检查 .env 里的 NOTES_TOKEN,或者用手机上最新那条带 #t= 的链接重新复制一次。`);
    }
    throw new Error(`请求失败:${path} → HTTP ${res.status} ${message}`);
  }
  return res;
};

// coords 用行内数组 [lng, lat] 而不是逐行列表,body 多行文字用块字面量(|),
// 中文原样不转义——这份 yaml 是给人(业主/Claude)读和手改的,不是机器专用格式
function noteToYaml(note) {
  const doc = new Document(note);
  visit(doc, {
    Pair(_, pair) {
      if (pair.key?.value === 'coords' && pair.value) pair.value.flow = true;
    },
  });
  return doc.toString({ lineWidth: 0, flowCollectionPadding: false });
}

const KINDS = ['wine', 'place', 'coffee'];
const kindArg = process.argv[2];
if (kindArg && !KINDS.includes(kindArg)) {
  console.error('用法:npm run notes:pull [wine|place|coffee](省略则全拉)');
  process.exit(1);
}
const kinds = kindArg ? [kindArg] : KINDS;

async function pullKind(kind) {
  const noteDir = `field-notes/${kind}/notes`;
  const photoDir = `field-notes/${kind}/photos`;
  await mkdir(noteDir, { recursive: true });
  await mkdir(photoDir, { recursive: true });

  // 已有的本地笔记:按 id 建索引,用于判断是否需要重写。
  // 单个文件解析失败(手改坏了、传输截断)不该拖垮整次拉取——跳过它、给出警告,
  // 但要提醒清楚后果:如果对应笔记还在服务器上,这次会把它当成"新笔记"重新拉一份,
  // 本地就会有两份;需要人工比对后删掉坏文件或去重。
  const existingFiles = await readdir(noteDir);
  const localById = new Map();
  for (const f of existingFiles.filter((f) => f.endsWith('.yaml'))) {
    try {
      const doc = parse(await readFile(`${noteDir}/${f}`, 'utf8'));
      if (!doc || typeof doc.id !== 'string') throw new Error('缺少 id 字段');
      localById.set(doc.id, { file: f, doc });
    } catch (err) {
      console.error(`警告:${noteDir}/${f} 解析失败(${err.message}),已跳过。如果对应笔记还在服务器上,这次会重新拉一份新文件,请稍后人工检查这个坏文件。`);
    }
  }

  const { notes: summaries } = await (await api(`/api/notes?kind=${encodeURIComponent(kind)}`)).json();
  let added = 0;
  let updated = 0;
  let photos = 0;
  let failed = 0;

  for (const s of summaries) {
    const local = localById.get(s.id);
    if (isUpToDate(local?.doc, s)) continue;

    try {
      const raw = await (await api(`/api/notes/${encodeURIComponent(kind)}/${encodeURIComponent(s.id)}`)).json();
      const parsed = safeParseNote(raw);
      if (!parsed.success) {
        console.error(`警告:笔记 ${s.id} 格式不合法,已跳过:${JSON.stringify(parsed.error.issues)}`);
        continue;
      }
      const note = parsed.data;

      // 照片撞名判断:只看"别的笔记"已经占用的文件名,绝不能用目录里现有的全部文件——
      // 那样会把这条笔记自己上一次拉下来的照片也当成"被占用",于是每次编辑笔记重拉,
      // 都会误判撞名、生成一个新文件名再下载一遍,越拉越多重复照片(这是要修的 bug)。
      // 本地 yaml 里记录了每条笔记自己的 photos[].file,从 localById 里排除掉当前这条
      // 笔记本身,剩下的就是"别人"的文件名。
      const takenPhotos = [];
      for (const [id, v] of localById) {
        if (id === s.id) continue;
        for (const p of v.doc.photos ?? []) takenPhotos.push(p.file);
      }

      for (const p of note.photos) {
        const localName = photoLocalName(note, p.file, takenPhotos);
        const destPath = `${photoDir}/${localName}`;
        if (!existsSync(destPath)) {
          const res = await api(`/api/photos/${encodeURIComponent(kind)}/${encodeURIComponent(note.id)}/${encodeURIComponent(p.file)}`);
          const buf = Buffer.from(await res.arrayBuffer());
          // 先整份下载到内存、写到临时文件,再 rename 到最终文件名。
          // rename 在同一文件系统内是原子操作,中途断网/断电不会留下一个"写了一半"的
          // 半截 jpg——那样反而比没有更糟(既会被当成"已下载"跳过,打开又是坏图)。
          const tmpPath = `${destPath}.part`;
          await writeFile(tmpPath, buf);
          await rename(tmpPath, destPath);
          photos += 1;
        }
        takenPhotos.push(localName);
        p.file = localName;
      }

      // 文件名:已存在的那条沿用原名,避免改标题后留下两份
      const takenNames = [...localById.values()].filter((v) => v.doc.id !== note.id).map((v) => v.file);
      const file = local?.file ?? noteFileName(note, takenNames);
      await writeFile(`${noteDir}/${file}`, noteToYaml(note), 'utf8');
      localById.set(note.id, { file, doc: note });
      if (local) updated += 1;
      else added += 1;
    } catch (err) {
      // 单条笔记处理失败(比如下载到一半断网)不能拖垮整个 kind:已经成功的照片/笔记
      // 保留在磁盘上,这条笔记本身跳过,下次重跑会自然重试——已下载的部分不会重复下载
      // (见上面 takenPhotos 的处理),没下载完的部分会接着下。
      failed += 1;
      console.error(`警告:笔记 ${s.id}(${s.title ?? ''})处理失败,已跳过,下次拉取会自动重试:${err.message}`);
    }
  }

  // 本地照片文件里,没有被任何一条当前 yaml 引用到的,提示一下但绝不自动删除——
  // 如果业主已经清空手机相册,这份本地文件可能是唯一副本了。留给人来决定要不要删。
  const referenced = new Set();
  for (const v of localById.values()) {
    for (const p of v.doc.photos ?? []) referenced.add(p.file);
  }
  const dirFilesFinal = await readdir(photoDir);
  const orphaned = dirFilesFinal.filter((f) => !referenced.has(f) && !f.endsWith('.part'));

  console.log(`${kind}: 新增 ${added} 条、更新 ${updated} 条、下载 ${photos} 张照片${failed ? `(${failed} 条处理失败,已跳过,详见上面的警告)` : ''}`);
  if (orphaned.length) {
    console.log(`  提醒:${photoDir} 下有 ${orphaned.length} 张照片未被任何笔记引用(可能是笔记里删掉的图,不会自动清理):${orphaned.join('、')}`);
  }
}

try {
  for (const kind of kinds) {
    await pullKind(kind);
  }
} catch (err) {
  // 走到这里的通常是连接/权限问题(见 api() 里的分类),对每个 kind 重复报同样的错没有意义,直接停
  console.error(`出错了:${err.message}`);
  process.exit(1);
}
