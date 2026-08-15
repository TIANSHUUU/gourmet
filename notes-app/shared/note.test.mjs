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
