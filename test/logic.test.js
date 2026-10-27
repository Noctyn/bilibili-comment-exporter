import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBCE, makeReply, NAV_ROUTE } from './harness.mjs';

const { api, env } = loadBCE({ dom: 'null' });

const cursor = (next, end) => ({
    all_count: 3,
    is_end: end,
    pagination_reply: next ? { next_offset: next } : null
});

// ---------------------------------------------------------------- 纯函数

test('md5 与标准向量一致', () => {
    assert.equal(api.md5('abc'), '900150983cd24fb0d6963f7d28e17f72');
    assert.equal(api.md5(''), 'd41d8cd98f00b204e9800998ecf8427e');
    assert.equal(api.md5('中文'), 'a7bac2239fcdcb3a067903d8077c4a07');
});

test('BV / AV 双向转换', () => {
    assert.equal(api.bvid2avid('BV1e7NRemEwv'), 113976755094913);
    assert.equal(api.avid2bvid(113976755094913n), 'BV1e7NRemEwv');
    assert.equal(api.avid2bvid(170001n), 'BV17x411w7KC');
});

test('normalizeBvid 拒绝非法长度与字符', () => {
    assert.equal(api.normalizeBvid('BV1e7NRemEwv'), 'BV1e7NRemEwv');
    assert.equal(api.normalizeBvid('bv1e7NRemEwv'), 'BV1e7NRemEwv'); // 仅规范化前缀
    assert.equal(api.normalizeBvid('BV1!!!!!!!!!'), null);
    assert.equal(api.normalizeBvid('BV1e7NRemEw'), null);
    assert.equal(api.normalizeBvid('BV1e7NRemEwvxx'), null);
    assert.equal(api.normalizeBvid(''), null);
});

test('parseOidInput 支持 BV / av / 链接 / 纯数字', () => {
    assert.deepEqual(api.parseOidInput('BV1e7NRemEwv'), { oid: '113976755094913', bvid: 'BV1e7NRemEwv' });
    assert.deepEqual(api.parseOidInput('https://www.bilibili.com/video/BV1e7NRemEwv?p=2'),
        { oid: '113976755094913', bvid: 'BV1e7NRemEwv' });
    assert.deepEqual(api.parseOidInput('av170001'), { oid: '170001', bvid: 'BV17x411w7KC' });
    assert.deepEqual(api.parseOidInput('170001'), { oid: '170001', bvid: 'BV17x411w7KC' });
    assert.equal(api.parseOidInput('BV1!!!!!!!!!'), null);
    assert.equal(api.parseOidInput('随便乱输'), null);
});

test('Wbi 签名与官方文档示例逐字节一致', () => {
    const realNow = Date.now;
    Date.now = () => 1702204169000;
    try {
        const url = api.signWbiUrl('https://api.bilibili.com/x/test', { foo: '114', bar: '514', zab: 1919810 },
            '7cd084941338484aae1ad9425b84077c', '4932caff0ff746eab6f01bf08b70ac45');
        assert.equal(url,
            'https://api.bilibili.com/x/test?bar=514&foo=114&wts=1702204169&zab=1919810&w_rid=8f6f2b5b3d485fe1886cec6a0be8c5d4');
    } finally {
        Date.now = realNow;
    }
});

test('CSV 字段转义与公式注入防护', () => {
    assert.equal(api.escapeCSVField('=1+1'), '"\'=1+1"');
    assert.equal(api.escapeCSVField('@SUM(A1)'), '"\'@SUM(A1)"');
    assert.equal(api.escapeCSVField('普通"文本'), '"普通""文本"');
    assert.equal(api.escapeCSVField(null), '""');
    assert.equal(api.escapeCSVField(0), '"0"');
});

test('buildCSVBlob 分块输出内容完整（含 BOM、表头、末行）', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ // 跨过 CSV_CHUNK_ROWS=2000 的分块边界
        bvid: 'BV1e7NRemEwv', upname: 'u' + i, sex: '男', content: 'c' + i, pictures: '',
        rpid: i, oid: 1, mid: 2, parent: 0, fans_grade: 0, ctime: 1, like: 0, level: 5, location: '北京'
    }));
    const blob = api.buildCSVBlob(rows);

    // Blob.text() 解码时会吞掉 BOM，必须直接看字节
    const head = new Uint8Array(await blob.arrayBuffer()).slice(0, 3);
    assert.deepEqual([...head], [0xEF, 0xBB, 0xBF], '缺少 UTF-8 BOM');

    const text = await blob.text();
    assert.ok(text.startsWith('bvid,upname,sex'), '缺少表头');
    const lines = text.trim().split('\r\n');
    assert.equal(lines.length, 2501, '表头 + 2500 行');
    assert.ok(lines[1].includes('"u0"'));
    assert.ok(lines[2500].includes('"u2499"'));
});

test('错误码映射与数值收敛', () => {
    assert.equal(api.describeApiError(12002, 'x'), '该评论区已关闭');
    assert.match(api.describeApiError(-352, 'x'), /风控/);
    assert.equal(api.describeApiError(-1, '0'), 'code -1');
    assert.equal(api.clampInt('-5', 100, 10000, 500), 100);
    assert.equal(api.clampInt('999999', 100, 10000, 500), 10000);
    assert.equal(api.clampInt('', 100, 10000, 500), 500);
});

// ---------------------------------------------------------------- 并发 / 限速

test('mapWithConcurrency 遵守并发上限且覆盖全部元素', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    let running = 0;
    let peak = 0;
    await api.mapWithConcurrency(items, 3, async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise(r => setTimeout(r, 10));
        running--;
    });
    assert.equal(peak, 3, '并发峰值应正好等于上限');
});

test('rateLimiter 保证全局最小请求间隔', async () => {
    api.rateLimiter.setInterval(50);
    const t0 = Date.now();
    try {
        await Promise.all([api.rateLimiter.acquire(), api.rateLimiter.acquire(), api.rateLimiter.acquire()]);
    } finally {
        api.rateLimiter.setInterval(0);
    }
    const elapsed = Date.now() - t0;
    assert.ok(elapsed >= 95, `3 次请求应至少隔开 100ms，实际 ${elapsed}ms`);
});

// ---------------------------------------------------------------- apiGet

const mainRoute = handler => ({ match: 'x/v2/reply/wbi/main', handler });

test('apiGet 识别 code:0 + data.v_voucher（不再抛 TypeError）', async () => {
    api.invalidateWbiKeys();
    env.setRoutes([NAV_ROUTE, mainRoute(() => ({ body: { code: 0, message: '0', data: { v_voucher: 'voucher_x' } } }))]);
    await assert.rejects(
        () => api.apiGet('/x/v2/reply/wbi/main', { oid: 1 }, { wbi: true }),
        e => e.name === 'ApiError' && e.code === -352 && /验证码/.test(e.message)
    );
});

test('apiGet 对 HTTP 412 不重试（熔断）', async () => {
    api.invalidateWbiKeys();
    env.setRoutes([NAV_ROUTE, mainRoute(() => ({ status: 412, body: {} }))]);
    await assert.rejects(() => api.apiGet('/x/v2/reply/wbi/main', { oid: 1 }, { wbi: true }));
    assert.equal(env.calls.filter(u => u.includes('reply/wbi/main')).length, 1);
});

test('apiGet 对 HTTP 500 重试 3 次后失败', async () => {
    api.invalidateWbiKeys();
    env.setRoutes([NAV_ROUTE, mainRoute(() => ({ status: 500, rawBody: true }))]);
    await assert.rejects(() => api.apiGet('/x/v2/reply/wbi/main', { oid: 1 }, { wbi: true }));
    assert.equal(env.calls.filter(u => u.includes('reply/wbi/main')).length, 3);
});

test('apiGet 遇 -403 刷新密钥并重试一次', async () => {
    api.invalidateWbiKeys();
    let n = 0;
    env.setRoutes([NAV_ROUTE, mainRoute(() => {
        n++;
        return n === 1
            ? { body: { code: -403, message: '访问权限不足' } }
            : { body: { code: 0, data: { cursor: cursor(null, true), replies: [] } } };
    })]);
    const data = await api.apiGet('/x/v2/reply/wbi/main', { oid: 1 }, { wbi: true });
    assert.equal(n, 2);
    assert.ok(data.cursor);
});

test('apiGet 对业务错误 -400 不重试', async () => {
    api.invalidateWbiKeys();
    env.setRoutes([NAV_ROUTE, mainRoute(() => ({ body: { code: -400, message: '请求错误' } }))]);
    await assert.rejects(() => api.apiGet('/x/v2/reply/wbi/main', { oid: 1 }, { wbi: true }), /请求错误/);
    assert.equal(env.calls.filter(u => u.includes('reply/wbi/main')).length, 1);
});

// ---------------------------------------------------------------- 抓取流程

test('两页抓取：置顶合并 + rpid 去重 + 顺序保持', async () => {
    api.reset();
    env.setRoutes([NAV_ROUTE, mainRoute(url => ({
        body: {
            code: 0,
            data: url.includes('OFF1')
                ? { cursor: cursor(null, true), replies: [makeReply(3)] }
                : {
                    cursor: cursor('OFF1', false),
                    replies: [makeReply(1), makeReply(2)],
                    top_replies: [makeReply(1)]   // 与 replies 重复，应被去重
                }
        }
    }))]);

    const r = await api.exportVideoComments('113976755094913', 'BV1e7NRemEwv', 3, true, 0);
    assert.equal(r.completed, true);
    assert.equal(r.allComments.length, 3);
    assert.deepEqual(r.allComments.map(c => c.rpid), [1, 2, 3], '输出顺序应与接口顺序一致');
});

test('楼中楼按 data.page.count 翻页（首页不满 20 条也继续）', async () => {
    api.reset();
    env.setRoutes([
        NAV_ROUTE,
        mainRoute(() => ({ body: { code: 0, data: { cursor: cursor(null, true), replies: [makeReply(10, { rcount: 25 })] } } })),
        {
            match: 'x/v2/reply/reply',
            handler: url => {
                const pn = Number(new URL(url).searchParams.get('pn'));
                const size = pn === 1 ? 18 : 7;   // 第一页因折叠/删除不足一整页
                const replies = pn <= 2
                    ? Array.from({ length: size }, (_, i) => makeReply(1000 + pn * 100 + i))
                    : [];
                return { body: { code: 0, data: { page: { count: 25 }, replies } } };
            }
        }
    ]);

    const r = await api.exportVideoComments('113976755094913', 'BV1e7NRemEwv', 3, true, 0);
    assert.equal(r.stats.sub, 25, '应抓满 25 条子评论');
    assert.deepEqual(r.allComments.map(c => c.rpid)[0], 10, '主评论应排在其楼中楼之前');
});

test('并发抓取楼中楼后仍保持「主评论 → 其楼中楼」顺序', async () => {
    api.reset();
    env.setRoutes([
        NAV_ROUTE,
        mainRoute(() => ({
            body: {
                code: 0,
                data: {
                    cursor: cursor(null, true),
                    replies: [makeReply(100, { rcount: 3 }), makeReply(200, { rcount: 3 })]
                }
            }
        })),
        {
            match: 'x/v2/reply/reply',
            handler: async url => {
                const root = new URL(url).searchParams.get('root');
                // 让先派发的楼层更慢，人为制造「完成顺序」与「输出顺序」不一致
                await new Promise(r => setTimeout(r, root === '100' ? 30 : 5));
                const base = root === '100' ? 101 : 201;
                return {
                    body: {
                        code: 0,
                        data: { page: { count: 3 }, replies: [makeReply(base), makeReply(base + 1), makeReply(base + 2)] }
                    }
                };
            }
        }
    ]);

    const r = await api.exportVideoComments('113976755094913', 'BV1e7NRemEwv', 3, true, 0);
    assert.deepEqual(r.allComments.map(c => c.rpid), [100, 101, 102, 103, 200, 201, 202, 203]);
});

test('主评论数量上限在主评论粒度生效', async () => {
    api.reset();
    env.setRoutes([NAV_ROUTE, mainRoute(url => ({
        body: {
            code: 0,
            data: url.includes('OFF1')
                ? { cursor: cursor(null, true), replies: [makeReply(4), makeReply(5)] }
                : { cursor: cursor('OFF1', false), replies: [makeReply(1), makeReply(2), makeReply(3)] }
        }
    }))]);

    const r = await api.exportVideoComments('113976755094913', 'BV1e7NRemEwv', 3, false, 3);
    assert.equal(r.stats.main, 3);
    assert.equal(r.completed, true);
    assert.equal(env.calls.filter(u => u.includes('reply/wbi/main')).length, 1, '达到上限后不应再翻页');
});

test('取消后返回已抓取的部分数据', async () => {
    api.reset();
    env.setRoutes([NAV_ROUTE, mainRoute(() => ({
        body: { code: 0, data: { cursor: cursor('OFF1', false), replies: [makeReply(1)] } }
    }))]);

    const promise = api.exportVideoComments('113976755094913', 'BV1e7NRemEwv', 3, true, 0);
    setTimeout(() => api.setCancel(true), 5);
    const r = await promise;
    assert.equal(r.completed, false);
    assert.equal(r.allComments.length, 1);
});

test('AbortSignal 能中断在途请求而不是等 15s 超时', async () => {
    api.reset();
    env.setRoutes([NAV_ROUTE, mainRoute(() => new Promise(resolve => {
        const timer = setTimeout(() => resolve({ body: { code: 0, data: {} } }), 3000);
        if (timer.unref) timer.unref();
    }))]);
    const ac = new AbortController();
    const t0 = Date.now();
    const promise = api.exportVideoComments('1', 'BV1e7NRemEwv', 3, true, 0, { signal: ac.signal });
    setTimeout(() => ac.abort(), 30);
    const r = await promise;
    assert.equal(r.completed, false);
    assert.ok(Date.now() - t0 < 1500, `中断耗时过长: ${Date.now() - t0}ms`);
});

test('楼中楼抓取失败会记录楼层且不影响主流程', async () => {
    api.reset();
    env.setRoutes([
        NAV_ROUTE,
        mainRoute(() => ({ body: { code: 0, data: { cursor: cursor(null, true), replies: [makeReply(7, { rcount: 5 })] } } })),
        { match: 'x/v2/reply/reply', handler: () => ({ body: { code: -352, message: '风控校验失败' } }) }
    ]);
    const r = await api.exportVideoComments('1', 'BV1e7NRemEwv', 3, true, 0);
    assert.equal(r.stats.main, 1);
    assert.deepEqual(r.failedFloors, ['7']);
});

// ---------------------------------------------------------------- 批量导出

test('投稿列表 is_risk 时停止而不是静默截断', async () => {
    api.reset();
    env.setRoutes([NAV_ROUTE, {
        match: 'x/space/wbi/arc/search',
        handler: () => ({ body: { code: 0, data: { is_risk: true, list: { vlist: [] } } } })
    }]);
    const r = await api.exportUpComments('1', 2, 0, true, 0);
    assert.equal(r.allComments.length, 0);
});

test('投稿列表按 bvid 去重，且只抓一次', async () => {
    api.reset();
    env.setRoutes([
        NAV_ROUTE,
        {
            match: 'x/space/wbi/arc/search',
            handler: url => {
                const pn = Number(new URL(url).searchParams.get('pn'));
                return {
                    body: {
                        code: 0,
                        data: {
                            page: { count: 2 },
                            list: {
                                vlist: pn === 1
                                    ? [{ aid: 1, bvid: 'BV1e7NRemEwv', title: 'a' }]
                                    : [{ aid: 1, bvid: 'BV1e7NRemEwv', title: 'a' }, { aid: 2, bvid: 'BV17x411w7KC', title: 'b' }]
                            }
                        }
                    }
                };
            }
        },
        mainRoute(() => ({ body: { code: 0, data: { cursor: cursor(null, true), replies: [makeReply(1)] } } }))
    ]);

    const r = await api.exportUpComments('1', 3, 0, false, 1);
    assert.equal(r.allComments.length, 2, '两个不同视频各 1 条');
    assert.equal(env.calls.filter(u => u.includes('reply/wbi/main')).length, 2, '重复 bvid 不应重复抓取');
});
