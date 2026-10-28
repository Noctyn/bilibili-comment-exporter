/**
 * 用户脚本的离线测试装载器。
 *
 * 思路：用户脚本是一个 IIFE，内部函数对外不可见。这里把结尾的 `init(); watchUrlChanges();`
 * 替换成一段导出赋值，从而在 Node 里直接调用内部函数；同时提供最小可用的
 * document / localStorage / fetch 桩，避免引入 jsdom 等依赖。
 *
 * 注意：若脚本尾部结构变化导致替换失败，这里会抛出明确错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SCRIPT_PATH = path.join(ROOT, 'bilibili_comment_exporter.user.js');

const TAIL = /\n {4}init\(\);\n {4}watchUrlChanges\(\);/;

const EXPOSE = `
    globalThis.__BCE = {
        md5, bvid2avid, avid2bvid, signWbiUrl, normalizeBvid, parseOidInput, escapeCSVField,
        describeApiError, clampInt, apiGet, exportVideoComments, exportUpComments,
        getCachedWbiKeys, invalidateWbiKeys, sleep, rateLimiter, buildCSVBlob,
        mapWithConcurrency, buildPanel, init, handleUrlChange, syncDarkTheme,
        startProgressUI, displayStats, setView, togglePanel, log, flushLogBuffer,
        tryInjectEntry, removeEntry, entryInjectAllowed, scheduleInject, watchUrlChanges,
        setCancel: v => { shouldCancel = v; },
        setExportStart: v => { exportStartTime = v; },
        reset: () => { shouldCancel = false; isExporting = true; }
    };`;

const noop = () => {};

function makeEnv() {
    const calls = [];
    let routes = [];
    return {
        calls,
        blobUrlCount: 0,
        lastBlob: null,
        get routes() { return routes; },
        setRoutes(next) { routes = next; calls.length = 0; },
        async fetchImpl(url, options = {}) {
            calls.push(String(url));
            const signal = options.signal;
            if (signal && signal.aborted) {
                throw new DOMException('aborted', 'AbortError');
            }

            const route = routes.find(r => String(url).includes(r.match));
            if (!route) throw new Error('未匹配的请求: ' + url);

            const produced = typeof route.handler === 'function'
                ? route.handler(String(url), options)
                : route.handler;

            // 与真实 fetch 一致：signal 中止时立即以 AbortError 拒绝，而不是等响应返回
            const out = await new Promise((resolve, reject) => {
                if (!signal) { Promise.resolve(produced).then(resolve, reject); return; }
                const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
                signal.addEventListener('abort', onAbort, { once: true });
                Promise.resolve(produced).then(value => {
                    signal.removeEventListener('abort', onAbort);
                    resolve(value);
                }, err => {
                    signal.removeEventListener('abort', onAbort);
                    reject(err);
                });
            });

            if (out instanceof Error) throw out;
            const status = out.status || 200;
            return {
                ok: status >= 200 && status < 300,
                status,
                json: async () => {
                    if (out.rawBody) throw new SyntaxError('Unexpected token <');
                    return out.body;
                }
            };
        }
    };
}

/** 极简元素桩：够 buildPanel / 入口注入跑通，并记录事件监听器 */
function makeElement(ctx, id = '', isFragment = false) {
    const attrs = Object.create(null);

    // 用内部函数而不是 el.appendChild：测试里会替换 appendChild 来统计调用次数，
    // 片段展开不应再经过替换后的版本
    function appendChildImpl(child) {
        if (child && child.isFragment) {
            const kids = child.children.slice();
            child.children.length = 0;
            for (const kid of kids) appendChildImpl(kid);
            return child;
        }
        el.children.push(child);
        if (child) {
            child.parentNode = el;
            child.__attached = true;
            if (child.id) ctx.byId.set(child.id, child);
        }
        return child;
    }

    const el = {
        id,
        tagName: 'DIV',
        isFragment,
        style: {},
        dataset: {},
        className: '',
        title: '',
        textContent: '',
        innerText: '',
        innerHTML: '',
        value: '',
        checked: false,
        children: [],
        parentNode: null,
        offsetWidth: 1,
        scrollTop: 0,
        scrollHeight: 0,
        clientHeight: 0,
        classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
        setAttribute(name, value) { attrs[name] = String(value); },
        getAttribute(name) { return name in attrs ? attrs[name] : null; },
        removeAttribute(name) { delete attrs[name]; },
        appendChild: appendChildImpl,
        removeChild(child) {
            const i = el.children.indexOf(child);
            if (i >= 0) el.children.splice(i, 1);
            if (child) {
                child.parentNode = null;
                if (child.id && ctx.byId.get(child.id) === child) ctx.byId.delete(child.id);
            }
            return child;
        },
        insertBefore: noop,
        remove() { if (el.parentNode) el.parentNode.removeChild(el); },
        focus: noop,
        click: noop,
        addEventListener(type, fn) { ctx.listeners.set(`${id}:${type}`, fn); },
        removeEventListener: noop,
        querySelector: () => makeElement(ctx),
        querySelectorAll: () => [],
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
        // 脚本里只用到 [data-bce="wrap"] 和 .class 两种写法
        closest(selector) {
            const attrMatch = selector.match(/^\[([\w-]+)="([^"]*)"\]$/);
            let node = el;
            while (node) {
                if (attrMatch && node.getAttribute && node.getAttribute(attrMatch[1]) === attrMatch[2]) return node;
                if (!attrMatch && selector.startsWith('.') && node.className
                    && String(node.className).split(/\s+/).includes(selector.slice(1))) return node;
                node = node.parentNode;
            }
            return null;
        }
    };
    Object.defineProperty(el, 'firstChild', {
        get: () => (el.children.length > 0 ? el.children[0] : null)
    });
    return el;
}

/**
 * @param {{ dom?: 'null' | 'stub' }} options
 *   dom='null' 仅用于纯逻辑测试（所有 getElementById 返回 null）
 *   dom='stub' 用于 UI / 注入测试（返回元素桩，可捕获事件监听器）
 */
export function loadBCE({ dom = 'null' } = {}) {
    let code = fs.readFileSync(SCRIPT_PATH, 'utf8');
    if (!TAIL.test(code)) {
        throw new Error('无法定位脚本尾部的 init() 调用，测试装载器需要同步更新');
    }
    code = code.replace(TAIL, EXPOSE);

    const env = makeEnv();
    const listeners = new Map();
    const byId = new Map();
    const ctx = { listeners, byId };

    // 这两个容器初始不存在，buildPanel / buildToastContainer 才会真正执行创建逻辑
    const createdByScript = new Set(['bili-cmt-panel', 'bili-cmt-toast-container']);
    // 入口节点只能由 appendChild 注册，不能按需凭空创建，否则测不出重复注入
    const tracked = new Set(['bili-cmt-entry']);

    const queryCache = new Map();
    const store = new Map();

    const bodyEl = dom === 'null' ? { appendChild: noop, classList: { contains: () => false } } : makeElement(ctx, 'body');
    const headEl = dom === 'null' ? { appendChild: noop } : makeElement(ctx, 'head');
    const docEl = dom === 'null' ? { classList: { contains: () => false } } : makeElement(ctx, 'html');

    /** 顺着 parentNode 往上走，看节点是否还挂在文档根上 */
    function isConnected(node) {
        let n = node;
        let guard = 0;
        while (n && n.parentNode && guard++ < 2000) n = n.parentNode;
        return n === bodyEl || n === headEl || n === docEl;
    }

    globalThis.document = {
        readyState: 'complete',
        title: '测试视频_哔哩哔哩_bilibili',
        head: headEl,
        body: bodyEl,
        documentElement: docEl,
        createElement: () => makeElement(ctx),
        createDocumentFragment: () => makeElement(ctx, 'frag', true),
        getElementById: id => {
            if (dom === 'null') return null;
            const el = byId.get(id);
            // 曾经挂到树上、现在已脱离文档的节点要当作不存在，
            // 否则测不出「把外层包裹删掉后入口也跟着消失」这种场景
            if (el && el.__attached && !isConnected(el)) {
                byId.delete(id);
                return null;
            }
            if (createdByScript.has(id) || tracked.has(id)) return el || null;
            if (!el) {
                const created = makeElement(ctx, id);
                byId.set(id, created);
                return created;
            }
            return el;
        },
        querySelector: sel => {
            if (dom === 'null') return null;
            if (!queryCache.has(sel)) {
                // 真实 DOM 里 querySelector 的结果必然在文档中，这里也挂到 body 上，
                // 否则「节点是否还在文档里」的判断会误伤
                const found = makeElement(ctx);
                bodyEl.appendChild(found);
                queryCache.set(sel, found);
            }
            return queryCache.get(sel);
        },
        querySelectorAll: () => [],
        addEventListener: noop
    };

    globalThis.window = {
        location: {
            href: 'https://www.bilibili.com/video/BV1e7NRemEwv?p=1',
            pathname: '/video/BV1e7NRemEwv',
            hostname: 'www.bilibili.com'
        },
        addEventListener: noop,
        innerWidth: 1920,
        innerHeight: 1080
    };

    globalThis.localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
    };

    globalThis.MutationObserver = class { observe() {} disconnect() {} };
    globalThis.history = { pushState: noop, replaceState: noop };
    globalThis.Notification = class {
        static permission = 'denied';
        static requestPermission() { return Promise.resolve('denied'); }
    };
    globalThis.URL.createObjectURL = blob => { env.blobUrlCount++; env.lastBlob = blob; return 'blob:test'; };
    globalThis.URL.revokeObjectURL = noop;
    globalThis.fetch = (url, options) => env.fetchImpl(url, options);

    new Function(code)();

    return { api: globalThis.__BCE, env, listeners, byId, store, document: globalThis.document };
}

/** 构造一个最小可用的评论条目响应对象 */
export function makeReply(rpid, extra = {}) {
    return {
        rpid,
        oid: 113976755094913,
        mid: 1000 + rpid,
        rcount: 0,
        parent: 0,
        ctime: 1700000000,
        like: 1,
        fansgrade: 0,
        member: { uname: 'user' + rpid, sex: '男', level_info: { current_level: 5 } },
        content: { message: 'content-' + rpid, pictures: [] },
        reply_control: { location: 'IP属地：北京' },
        replies: null,
        ...extra
    };
}

/** 标准的 nav 响应（未登录但 wbi_img 可用） */
export const NAV_ROUTE = {
    match: 'x/web-interface/nav',
    handler: () => ({
        body: {
            code: -101,
            message: '账号未登录',
            data: {
                isLogin: false,
                wbi_img: {
                    img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
                    sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
                }
            }
        }
    })
};
