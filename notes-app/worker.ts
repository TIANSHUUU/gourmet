import page from './page.html';
import { checkToken, safeParseNote, photoFileName, localStamp, extractCoords, extractPlaceName } from './shared/note.mjs';

export interface Env {
  NOTES: R2Bucket;
  NOTES_TOKEN: string;
}

// 这些响应之后会带上笔记正文、坐标、潜水记录,一律不缓存
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });

const KINDS = ['wine', 'place'];

const noteKey = (kind: string, id: string) => `${kind}/${id}/note.json`;
const notePrefix = (kind: string, id: string) => `${kind}/${id}/`;

/** 列表接口靠对象的 customMetadata 一次拿全摘要,不为每条笔记再 GET 一次 */
function summaryOf(note: Record<string, unknown>) {
  return {
    id: String(note.id),
    title: String(note.title).slice(0, 120), // customMetadata 有大小上限;这里只是列表预览,完整标题在 note.json 里
    at: String(note.at),
    kind: String(note.kind),
    updated_at: String(note.updated_at),
    photo_count: String((note.photos as unknown[] | undefined)?.length ?? 0),
  };
}

/** R2 单次 list 有条数上限,超了会静默少给对象——笔记还在,手机上却像丢了。必须走完游标 */
async function listAll(bucket: R2Bucket, options: R2ListOptions) {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await bucket.list({ ...options, cursor });
    objects.push(...page.objects);
    if (!page.truncated) return objects;
    cursor = page.cursor;
  }
}

const photoPrefix = (kind: string, id: string) => `${kind}/${id}/photos/`;
const photoKey = (kind: string, id: string, file: string) => `${kind}/${id}/photos/${file}`;

/**
 * 下一张照片的序号取"已有文件名里的最大序号 + 1",不能用数量 + 1:
 * 删掉 -01.jpg 后只剩 -02.jpg、-03.jpg 两个对象,数量是 2,count+1 会算出 -03,
 * 正好撞上还在的 -03.jpg,静默覆盖。改成扫最大序号就不会有这问题。
 */
function nextPhotoIndex(objects: R2Object[], prefix: string): number {
  let max = 0;
  for (const o of objects) {
    const m = o.key.slice(prefix.length).match(/-(\d+)\.jpg$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

const ALLOWED_MAPS_HOSTS = ['google.com', 'goo.gl', 'google.co.jp'];

/**
 * /api/resolve-place 会让 Worker 去 fetch 一个用户提供的 URL——不限制目标域名,
 * 这就是一个现成的 SSRF 出口(可以拿它探内网、云厂商元数据端点等)。这个接口本来就只
 * 为解析 Google Maps 分享链接而存在,所以只放行 Google 自己的域名(及其子域名)。
 * 用 h === d || h.endsWith('.' + d) 而不是 includes(),否则 google.com.evil.net 也会放过。
 */
function isAllowedMapsHost(u: URL): boolean {
  if (u.protocol !== 'https:') return false;
  const h = u.hostname.toLowerCase();
  return ALLOWED_MAPS_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 根路径是一张空表单,不含数据,不做保护;token 由 #t= 带入后存进 localStorage
    // (fragment 不上送服务器,token 不会进请求日志或 Referer;也因此这里绝不能放任何密钥)
    if (path === '/' || path === '/index.html') {
      return new Response(page, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    if (!path.startsWith('/api/')) return new Response('Not found', { status: 404 });

    if (!checkToken(request.headers.get('X-Notes-Token'), env.NOTES_TOKEN)) {
      // 业主真会看到这句(比如清了浏览器数据之后),写成他看得懂的话和下一步动作
      return json({ error: '没有权限,请重新用带 #t= 的链接打开一次' }, 401);
    }

    try {
      // pathname 不会 percent-decode,但 body 里的 kind/id 是解码后的值;不解码则中文/带空格的名字永远对不上
      let seg: string[];
      try {
        seg = path.split('/').filter(Boolean).map(decodeURIComponent);
      } catch {
        return json({ error: '路径编码不合法' }, 400);
      }

      if (seg[1] === 'notes' && seg.length === 2 && request.method === 'GET') {
        const kind = url.searchParams.get('kind');
        if (!kind || !KINDS.includes(kind)) return json({ error: 'kind 只能是 wine 或 place' }, 400);
        const objects = await listAll(env.NOTES, { prefix: `${kind}/`, include: ['customMetadata'] });
        const notes = objects
          .filter((o) => o.key.endsWith('/note.json') && o.customMetadata?.id)
          .map((o) => ({ ...o.customMetadata, photo_count: Number(o.customMetadata?.photo_count ?? 0) }))
          .sort((a, b) => String(b.at).localeCompare(String(a.at))); // 新的在前
        return json({ notes });
      }

      if (seg[1] === 'notes' && seg.length === 4) {
        const [, , kind, id] = seg;

        // kind/id 进 R2 键要保持层级,含斜杠会把前缀结构冲乱
        if (!KINDS.includes(kind) || id.includes('/')) {
          return json({ error: 'kind 只能是 wine 或 place,id 里不能有斜杠' }, 400);
        }

        if (request.method === 'GET') {
          const obj = await env.NOTES.get(noteKey(kind, id));
          if (!obj) return json({ error: 'not found' }, 404);
          return json(await obj.json());
        }

        if (request.method === 'PUT') {
          const raw = await request.json().catch(() => null);
          if (raw === null) return json({ error: '请求体不是合法 JSON' }, 400);
          const parsed = safeParseNote(raw);
          if (!parsed.success) {
            return json({ error: '笔记格式不合法', issues: parsed.error.issues }, 400);
          }
          const note = parsed.data;
          if (note.kind !== kind || note.id !== id) {
            return json({ error: '路径与笔记内容里的 kind/id 不一致' }, 400);
          }
          await env.NOTES.put(noteKey(kind, id), JSON.stringify(note), {
            httpMetadata: { contentType: 'application/json; charset=utf-8' },
            customMetadata: summaryOf(note),
          });
          return json(note);
        }

        if (request.method === 'DELETE') {
          const objects = await listAll(env.NOTES, { prefix: notePrefix(kind, id) });
          if (objects.length) await env.NOTES.delete(objects.map((o) => o.key));
          return json({ deleted: objects.length });
        }
      }

      // POST /api/notes/:kind/:id/photos?at=<笔记的 at>   body 为 JPEG 字节
      // 注意:这里不改 note.json——一次编辑里可能连续传好几张照片,谁先 PUT 谁的 note.json
      // 就会把后传的照片信息盖掉;photos[] 由手机端在本地攒好,离开编辑页再统一 PUT 笔记。
      if (seg[1] === 'notes' && seg.length === 5 && seg[4] === 'photos' && request.method === 'POST') {
        const [, , kind, id] = seg;
        if (!KINDS.includes(kind) || id.includes('/')) {
          return json({ error: 'kind 只能是 wine 或 place,id 里不能有斜杠' }, 400);
        }

        const at = url.searchParams.get('at');
        if (!at) return json({ error: '缺少 at 参数' }, 400);
        // 先验 at 再动 R2:这是客户端传错,该报 400 而不是让 photoFileName 抛出去变成 500,
        // 也免得为一个注定失败的请求白跑一次 list
        try {
          localStamp(at);
        } catch {
          return json({ error: 'at 参数格式不对' }, 400);
        }

        const body = await request.arrayBuffer();
        if (body.byteLength === 0) return json({ error: '照片是空的' }, 400);
        // 压缩正常时约 400KB;超过 3MB 只可能是手机端压缩失效,宁可当场报错也不要默默吃掉 R2 额度
        if (body.byteLength > 3_000_000) return json({ error: '照片过大,手机端压缩可能失效了' }, 413);

        // 先读已有序号再写,所以同一条笔记的上传必须串行——手机端 addPhotos 是 for-await 串行的,
        // 别把它改成并发(Promise.all),那样两张会算出同一个序号,后写的静默覆盖先写的
        const prefix = photoPrefix(kind, id);
        const existing = await listAll(env.NOTES, { prefix });
        const index = nextPhotoIndex(existing, prefix);
        const file = photoFileName({ at }, index); // at 已在上面验过

        await env.NOTES.put(photoKey(kind, id, file), body, {
          httpMetadata: { contentType: 'image/jpeg' },
        });
        return json({ file });
      }

      // DELETE /api/notes/:kind/:id/photos/:file
      if (seg[1] === 'notes' && seg.length === 6 && seg[4] === 'photos' && request.method === 'DELETE') {
        const [, , kind, id, , file] = seg;
        if (!KINDS.includes(kind) || id.includes('/') || file.includes('/')) {
          return json({ error: 'kind 只能是 wine 或 place,id、file 里不能有斜杠' }, 400);
        }
        await env.NOTES.delete(photoKey(kind, id, file));
        return json({ deleted: true });
      }

      // GET /api/photos/:kind/:id/:file —— 手机端缩略图、notes-pull 下载都走这个
      if (seg[1] === 'photos' && seg.length === 5 && request.method === 'GET') {
        const [, , kind, id, file] = seg;
        if (!KINDS.includes(kind) || id.includes('/') || file.includes('/')) {
          return json({ error: 'kind 只能是 wine 或 place,id、file 里不能有斜杠' }, 400);
        }
        const obj = await env.NOTES.get(photoKey(kind, id, file));
        if (!obj) return new Response('Not found', { status: 404 });
        return new Response(obj.body, {
          // 序号不会被复用(见 nextPhotoIndex 的注释),同一个文件名永远指向同一张照片,可以放心长缓存
          headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000' },
        });
      }

      // POST /api/resolve-place   body: { url }
      // 手机上"分享"给出的短链(maps.app.goo.gl)不含坐标,这里跟随重定向拿长链再提取
      if (path === '/api/resolve-place' && request.method === 'POST') {
        const raw = (await request.json().catch(() => null)) as { url?: string } | null;
        const target = raw?.url;
        if (!target || !/^https?:\/\//.test(target)) return json({ error: '不是合法链接' }, 400);

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return json({ error: '不是合法链接' }, 400);
        }
        // 只服务 Google Maps 链接;别的域名一律拒绝,见 isAllowedMapsHost 上面的注释
        if (!isAllowedMapsHost(parsed)) {
          return json({ error: '只支持 Google Maps 链接,请从 Google 地图分享' }, 400);
        }

        let finalUrl = target;
        let bodyText = '';
        try {
          // 短链里不含坐标,跟随重定向拿长链;少数情况下重定向发生在页面里(meta refresh),
          // 因此正文也扫一遍。8 秒超时,页面卡死也不能让手机一直转圈
          const res = await fetch(target, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
          finalUrl = res.url || target;
          if (!extractCoords(finalUrl)) bodyText = (await res.text()).slice(0, 200_000);
        } catch {
          // 含超时触发的 AbortError——统一当成"打不开"处理,不把 abort 抛给上层变成 500
          return json({ error: '打不开这个链接' }, 502);
        }

        const coords = extractCoords(finalUrl) ?? extractCoords(bodyText);
        const name = extractPlaceName(finalUrl) || extractPlaceName(bodyText);
        return json({ name, coords, resolved_url: finalUrl });
      }

      return json({ error: 'not found' }, 404);
    } catch (err) {
      // 别把堆栈甩给手机;统一成 JSON,客户端才敢假设响应都是 JSON
      return json({ error: '服务端出错', detail: err instanceof Error ? err.message : String(err) }, 500);
    }
  },
};
