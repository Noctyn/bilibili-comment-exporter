/**
 * 入口注入的时序回归测试（单独一个文件，方便独立跑）。
 *
 * 对应真实问题：从首页 SPA 点进视频页时入口偶尔不出现，刷新整页就好了。
 * 根因是补枪完全依赖 DOM 变动事件 —— 页面渲染完就安静了，最后一次失败的
 * 尝试之后再没有事件触发重试，入口就永远不出现。
 *
 * 这里逐条盯住：
 *   1. 宿主空着（Vue 还没往里渲染东西）时不能注入
 *   2. 路由切换必须作废上一页的稳定窗口，不能沿用
 *   3. 宿主被整个换掉（脱离文档）后要重新计时
 *   4. 页面彻底安静时看门狗也能把入口补上
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBCE } from './harness.mjs';

const { api, document } = loadBCE({ dom: 'stub' });
const HOST_SELECTOR = '.video-toolbar-container-main .video-toolbar-left-main';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** 把宿主容器摆成指定状态：kids 为直接子节点数量，模拟 Vue 渲染进度 */
function setHost(kids) {
    const host = document.querySelector(HOST_SELECTOR);
    host.children.length = 0;
    for (let i = 0; i < kids; i++) host.appendChild(document.createElement('div'));
    return host;
}

/** 每个用例结束都要停掉看门狗，否则定时器会把测试进程拖住 */
async function withWatchdogStopped(fn) {
    try {
        await fn();
    } finally {
        api.stopEntryWatchdog();
    }
}

test('宿主还是空的（Vue 没渲染完）时不注入', async () => {
    await withWatchdogStopped(async () => {
        setHost(0);
        api.resetEntryState();

        assert.equal(api.tryInjectEntry(), false, '刚发现宿主不该立刻注入');

        await sleep(900);   // 已经超过 800ms 稳定期，但宿主依旧是空的
        assert.equal(api.entryInjectAllowed(), false, '宿主空着说明这一轮渲染还没走完');
        assert.equal(document.getElementById('bili-cmt-entry'), null);

        setHost(3);         // Vue 把工具栏内容渲染出来了
        assert.equal(api.entryInjectAllowed(), true);
        assert.equal(api.tryInjectEntry(), true);
    });
});

test('路由切换后注入计时从头算，不沿用上一页的稳定窗口', async () => {
    await withWatchdogStopped(async () => {
        setHost(3);
        api.resetEntryState();
        api.tryInjectEntry();
        await sleep(900);
        assert.equal(api.tryInjectEntry(), true, '前置条件：先成功注入一次');

        api.watchUrlChanges();
        // 模拟 SPA 跳转：路径变了才摘节点并重置计时
        globalThis.history.pushState({}, '', '/video/BV1ABCDEFGHJ');

        assert.equal(document.getElementById('bili-cmt-entry'), null, '跳转前必须把入口摘掉');
        assert.equal(api.entryInjectAllowed(), false, '旧页面的稳定窗口不能带进新页面');

        // 看门狗/补枪在跳转后约 400ms 才发现「新」宿主，稳定期从那时重新起算
        await sleep(1500);
        assert.equal(api.entryInjectAllowed(), true, '新页面重新等足稳定期后才放行');
        assert.ok(document.getElementById('bili-cmt-entry'), '新页面应重新注入入口');
    });
});

test('宿主被 Vue 整个换掉（脱离文档）后重新计时', async () => {
    await withWatchdogStopped(async () => {
        const host = setHost(3);
        api.resetEntryState();
        api.tryInjectEntry();
        await sleep(900);
        assert.equal(api.tryInjectEntry(), true);

        document.body.removeChild(host);   // 旧容器被卸载
        assert.equal(api.tryInjectEntry(), false, '不能往已经脱离文档的节点里插');
        assert.equal(api.entryInjectAllowed(), false);

        document.body.appendChild(host);   // 新容器挂上来
        api.tryInjectEntry();
        await sleep(900);
        assert.equal(api.tryInjectEntry(), true, '新容器稳定后应重新注入');
    });
});

test('页面彻底安静时，看门狗也能把入口补上', async () => {
    await withWatchdogStopped(async () => {
        setHost(3);
        api.removeEntry();
        api.resetEntryState();
        api.tryInjectEntry();          // 只观察，不放行
        await sleep(900);

        // 此后再没有任何 DOM 变动 —— 等同于视频页渲染完就安静下来的场景
        api.startEntryWatchdog();
        await sleep(700);

        assert.ok(document.getElementById('bili-cmt-entry'), '看门狗没能把入口补上');
    });
});
