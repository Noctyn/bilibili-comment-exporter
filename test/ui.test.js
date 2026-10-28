import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBCE, makeReply, NAV_ROUTE } from './harness.mjs';

const { api, env, listeners } = loadBCE({ dom: 'stub' });

test('buildPanel 能完整构建且重复调用不抛异常', () => {
    assert.doesNotThrow(() => api.buildPanel());
    assert.doesNotThrow(() => api.buildPanel());
});

test('关键按钮的事件监听器都已绑定', () => {
    for (const key of [
        'video-start-btn:click',
        'up-start-btn:click',
        'progress-cancel-btn:click',
        'bili-cmt-close-btn:click',
        'dashboard-back-btn:click',
        'dashboard-download-btn:click'
    ]) {
        assert.ok(listeners.has(key), `未绑定 ${key}`);
    }
});

// ---------- 入口注入：不能在 B 站 Vue 渲染过程中插节点 ----------

test('宿主容器刚出现时不允许注入', () => {
    // 第一次调用只会记录宿主出现的时间，不会真的插入
    assert.equal(api.tryInjectEntry(), false);
    assert.equal(api.entryInjectAllowed(), false);
    assert.equal(document.getElementById('bili-cmt-entry'), null);
});

test('宿主稳定 800ms 后才允许注入', async () => {
    await new Promise(r => setTimeout(r, 900));
    assert.equal(api.entryInjectAllowed(), true);
    assert.equal(api.tryInjectEntry(), true);
    assert.ok(document.getElementById('bili-cmt-entry'), '入口未插入');
});

test('重复触发注入不会插入第二个入口', () => {
    for (let i = 0; i < 5; i++) api.tryInjectEntry();
    const host = document.querySelector('.video-toolbar-container-main .video-toolbar-left-main');
    const wraps = host.children.filter(c => c.getAttribute && c.getAttribute('data-bce') === 'wrap');
    assert.equal(wraps.length, 1, `宿主里有 ${wraps.length} 个入口包裹`);
});

test('removeEntry 连同外层包裹一起摘掉（路由切换前调用）', () => {
    api.removeEntry();
    assert.equal(document.getElementById('bili-cmt-entry'), null, '入口节点应已脱离文档');
    const host = document.querySelector('.video-toolbar-container-main .video-toolbar-left-main');
    assert.equal(host.children.length, 0, '外层包裹应一并移除');
});

test('handleUrlChange 能从 URL 识别 BVID', () => {
    api.handleUrlChange();
    assert.equal(document.getElementById('video-bvid').value, 'BV1e7NRemEwv');
});

test('startProgressUI / setView 切换视图不抛异常', () => {
    assert.doesNotThrow(() => {
        api.startProgressUI('测试中');
        api.setView('form');
        api.setView('progress');
        api.setView('dashboard');
    });
});

test('日志合批：多条日志只触发一次 DOM 追加', () => {
    const box = document.getElementById('console-log');
    api.flushLogBuffer();            // 先清掉上一组用例遗留的缓冲
    box.children.length = 0;

    let appends = 0;
    const rawAppend = box.appendChild.bind(box);
    box.appendChild = child => { appends++; return rawAppend(child); };

    for (let i = 0; i < 20; i++) api.log('日志 ' + i, 'info');
    assert.equal(appends, 0, '合批期间不应立即写入 DOM');

    api.flushLogBuffer();
    assert.equal(appends, 1, '同一批日志应只 append 一次（DocumentFragment）');
    assert.equal(box.children.length, 20);
});

test('日志超过上限时裁剪到 LOG_MAX_LINES', () => {
    const box = document.getElementById('console-log');
    api.flushLogBuffer();
    box.children.length = 0;
    for (let i = 0; i < 260; i++) api.log('行 ' + i);
    api.flushLogBuffer();
    assert.equal(box.children.length, 200);
});

test('displayStats 渲染看板并标记中断状态', () => {
    api.setExportStart(Date.now() - 5000);
    const stats = {
        main: 1, sub: 0,
        ip: { 北京: 1 },
        level: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 },
        sex: { 男: 1, 女: 0, 保密: 0 }
    };
    assert.doesNotThrow(() => api.displayStats([makeReply(1)], stats, 'x.csv', true));
    assert.match(document.getElementById('dash-duration-row').innerHTML, /已中断/);
    assert.equal(document.getElementById('dash-total').innerText, 1);
});

test('端到端：点击「开始导出」走通 抓取 → CSV → 看板', async () => {
    document.getElementById('video-bvid').value = 'BV1e7NRemEwv';
    document.getElementById('video-delay').value = '100';
    document.getElementById('video-subcomments').checked = true;

    env.setRoutes([NAV_ROUTE, {
        match: 'x/v2/reply/wbi/main',
        handler: () => ({
            body: {
                code: 0,
                data: {
                    cursor: { all_count: 1, is_end: true, pagination_reply: null },
                    replies: [makeReply(1, { content: { message: '=1+1', pictures: [] } })]
                }
            }
        })
    }]);

    await listeners.get('video-start-btn:click')();

    assert.equal(env.blobUrlCount, 1, '应触发一次 CSV 下载');
    const csv = await env.lastBlob.text();
    assert.ok(csv.startsWith('bvid,upname,sex'), 'CSV 表头不正确');
    assert.ok(csv.includes('"\'=1+1"'), '公式注入未被转义');
    assert.ok(csv.includes('"北京"'), 'IP 属地应写入 CSV');
    assert.equal(document.getElementById('dash-total').innerText, 1);
});
