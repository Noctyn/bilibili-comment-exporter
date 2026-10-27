// ==UserScript==
// @name         bilibili-comment-exporter
// @namespace    https://github.com/Noctyn/bilibili-comment-exporter
// @homepageURL  https://github.com/Noctyn/bilibili-comment-exporter
// @supportURL   https://github.com/Noctyn/bilibili-comment-exporter/issues
// @updateURL    https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js
// @downloadURL  https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js
// @version      0.5.0
// @description  一款基于 Bilibili API 的视频评论区导出工具，入口集成在视频工具栏与 UP 主空间页中，支持导出主评论和楼中楼为 CSV（UTF-8 BOM 防乱码），并带有实时 IP 属地、等级及性别数据统计看板。
// @author       heroxv
// @license      MIT
// @icon         https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/logo.svg
// @match        *://*.bilibili.com/video/*
// @match        *://space.bilibili.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. MD5 Hashing Algorithm (Pure JS)
    // ==========================================
    function md5(string) {
        function RotateLeft(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        }
        function AddUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) {
                return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            }
            if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                    return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                    return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
        }
        function F(x, y, z) { return (x & y) | ((~x) & z); }
        function G(x, y, z) { return (x & z) | (y & (~z)); }
        function H(x, y, z) { return (x ^ y ^ z); }
        function I(x, y, z) { return (y ^ (x | (~z))); }
        function FF(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function GG(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function HH(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function II(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function ConvertToWordArray(string) {
            var lWordCount;
            var lMessageLength = string.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lMessageLength + 8) - ((lMessageLength + 8) % 64);
            var lNumberOfWords = (lNumberOfWords_temp2 / 64 + 1) * 16;
            var lWordArray = Array(lNumberOfWords);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        }
        function WordToHex(lValue) {
            var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
            }
            return WordToHexValue;
        }
        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        }
        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        string = Utf8Encode(string);
        x = ConvertToWordArray(string);
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
        for (k = 0; k < x.length; k += 16) {
            AA = a; BB = b; CC = c; DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = AddUnsigned(a, AA);
            b = AddUnsigned(b, BB);
            c = AddUnsigned(c, CC);
            d = AddUnsigned(d, DD);
        }
        var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
        return temp.toLowerCase();
    }

    // ==========================================
    // 2. Bvid <-> Avid Converter
    // ==========================================
    const XOR_CODE = 23442827791579n;
    const MAX_CODE = 2251799813685247n;
    const CHARTS = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";

    function swapString(s, x, y) {
        let arr = s.split('');
        let tmp = arr[x];
        arr[x] = arr[y];
        arr[y] = tmp;
        return arr.join('');
    }

    function bvid2avid(bvid) {
        let s = swapString(swapString(bvid, 3, 9), 4, 7);
        let bv1 = s.slice(3);
        let temp = 0n;
        for (let c of bv1) {
            let idx = BigInt(CHARTS.indexOf(c));
            temp = temp * 58n + idx;
        }
        return Number((temp & MAX_CODE) ^ XOR_CODE);
    }

    function avid2bvid(avid) {
        let arr = ["B", "V", "1", "", "", "", "", "", "", "", "", ""];
        let bvIdx = arr.length - 1;
        let temp = (BigInt(avid) | (MAX_CODE + 1n)) ^ XOR_CODE;
        while (temp > 0n) {
            let idx = Number(temp % 58n);
            arr[bvIdx] = CHARTS[idx];
            temp /= 58n;
            bvIdx--;
        }
        let raw = arr.join('');
        return swapString(swapString(raw, 3, 9), 4, 7);
    }

    // ==========================================
    // 3. Wbi Signature Generation
    // ==========================================
    const mixinKeyEncTab = [
        46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
        33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
        61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
        36, 20, 34, 44, 52
    ];

    function getMixinKey(orig) {
        let temp = [];
        mixinKeyEncTab.forEach((n) => {
            temp.push(orig[n]);
        });
        return temp.join('').slice(0, 32);
    }

    function signWbiUrl(baseUrl, params, imgKey, subKey) {
        const mixinKey = getMixinKey(imgKey + subKey);
        const wts = Math.round(Date.now() / 1000);
        const signedParams = Object.assign({}, params, { wts });
        const keys = Object.keys(signedParams).sort();
        const queryParts = [];
        for (const key of keys) {
            let val = signedParams[key].toString();
            val = val.replace(/[!'()*]/g, ''); // Filter special characters
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
        }
        const queryStr = queryParts.join('&');
        const w_rid = md5(queryStr + mixinKey);
        return `${baseUrl}?${queryStr}&w_rid=${w_rid}`;
    }

    // ==========================================
    // 3.5 Network Utilities (Timeout / Retry / Abort)
    // ==========================================
    const FETCH_TIMEOUT_MS = 15000; // 15 seconds
    const MAX_RETRIES = 3;

    /**
     * 统一的接口错误：区分「业务错误码 / HTTP 状态 / 是否可重试」。
     * retryable 为 true 时由 withRetry 做指数退避重试，false 时直接向上抛出。
     */
    class ApiError extends Error {
        constructor(message, { code = null, status = null, retryable = false } = {}) {
            super(message);
            this.name = 'ApiError';
            this.code = code;
            this.status = status;
            this.retryable = retryable;
        }
    }

    function isAbortError(err) {
        return !!err && (err.name === 'AbortError' || err.code === 'ABORT_ERR');
    }

    function abortError() {
        return new DOMException('已取消', 'AbortError');
    }

    /**
     * 带超时的 fetch，同时支持外部 AbortSignal（用于「取消导出」立即中断在途请求）。
     */
    function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS, externalSignal = null) {
        if (externalSignal && externalSignal.aborted) {
            return Promise.reject(abortError());
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        let onExternalAbort = null;

        if (externalSignal) {
            onExternalAbort = () => controller.abort();
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
        const cleanup = () => {
            clearTimeout(timer);
            if (externalSignal && onExternalAbort) {
                externalSignal.removeEventListener('abort', onExternalAbort);
            }
        };

        return fetch(url, { ...options, signal: controller.signal })
            .then(response => { cleanup(); return response; })
            .catch(err => {
                cleanup();
                if (externalSignal && externalSignal.aborted) throw abortError();
                if (err.name === 'AbortError') {
                    throw new ApiError(`请求超时 (${timeoutMs / 1000}s)`, { retryable: true });
                }
                throw new ApiError(err.message || '网络请求失败', { retryable: true });
            });
    }

    /** 可中断的延时：取消导出时立即返回，不必等满整个间隔 */
    function sleep(ms, signal = null) {
        if (signal && signal.aborted) return Promise.resolve();
        return new Promise(resolve => {
            let onAbort = null;
            const timer = setTimeout(() => {
                if (signal && onAbort) signal.removeEventListener('abort', onAbort);
                resolve();
            }, ms);
            if (signal) {
                onAbort = () => { clearTimeout(timer); resolve(); };
                signal.addEventListener('abort', onAbort, { once: true });
            }
        });
    }

    /** 指数退避 + 随机抖动，避免多个请求在同一时刻重试 */
    function backoffDelay(attempt) {
        const base = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        return base + Math.floor(Math.random() * 300);
    }

    // ==========================================
    // 3.55 Global Rate Limiter
    // 并发抓取时只靠「每个循环里 sleep」无法约束全局 QPS，
    // 这里用令牌桶统一排队：所有 API 请求共享一个最小间隔。
    // ==========================================
    const rateLimiter = (() => {
        let minInterval = 0;
        let nextAt = 0;
        return {
            setInterval(ms) {
                minInterval = Math.max(0, ms || 0);
                nextAt = 0;
            },
            /** 同步占位、异步等待：JS 单线程保证占位是原子的 */
            async acquire(signal = null) {
                if (minInterval <= 0) return;
                const now = Date.now();
                const wait = Math.max(0, nextAt - now);
                nextAt = Math.max(now, nextAt) + minInterval;
                if (wait > 0) await sleep(wait, signal);
            }
        };
    })();

    /**
     * 限制并发的 map：最多 limit 个 worker 同时消费 items。
     * worker 通常直接写回自己的 item，调用方随后按 items 原顺序使用，从而保证输出顺序稳定。
     * worker 内部需自行处理业务错误，只有取消等致命异常才会向上抛。
     */
    async function mapWithConcurrency(items, limit, worker, signal = null) {
        if (items.length === 0) return;
        const size = Math.max(1, Math.min(limit, items.length));
        let cursor = 0;
        const runners = [];
        for (let i = 0; i < size; i++) {
            runners.push((async () => {
                while (true) {
                    if (signal && signal.aborted) return;
                    const index = cursor++;
                    if (index >= items.length) return;
                    await worker(items[index], index);
                }
            })());
        }
        // 用 allSettled 收口，避免某个 worker 抛错时其余 worker 的拒绝变成 unhandled rejection
        const outcomes = await Promise.allSettled(runners);
        const failed = outcomes.find(o => o.status === 'rejected');
        if (failed) throw failed.reason;
    }

    /**
     * 仅对「明确可重试」的错误做退避重试；参数错误 / 风控 / 用户取消一律立即失败。
     */
    async function withRetry(fetchFn, { retries = MAX_RETRIES, signal = null } = {}) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fetchFn(attempt);
            } catch (err) {
                lastError = err;
                const cancelled = isAbortError(err) || (signal && signal.aborted);
                if (cancelled) throw err;
                if (err.retryable !== true || attempt >= retries) throw err;
                await sleep(backoffDelay(attempt), signal);
            }
        }
        throw lastError;
    }

    // ==========================================
    // 3.6 Wbi Key Cache (memory 5min + localStorage 6h)
    // Wbi Key 全站统一且每日才更替，可跨页面/会话缓存以减少 nav 请求
    // ==========================================
    let cachedWbiKeys = null;
    let wbiKeysCachedAt = 0;
    let wbiLoginState = null;                    // null=未知, true=已登录, false=未登录
    const WBI_CACHE_TTL_MS = 5 * 60 * 1000;      // 内存缓存有效期
    const WBI_STORE_TTL_MS = 6 * 60 * 60 * 1000; // 本地缓存有效期（key 实际每日更替）
    const WBI_STORE_KEY = 'biliCmtExporter.wbiKeys';

    function readStoredWbiKeys() {
        try {
            const raw = localStorage.getItem(WBI_STORE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.imgKey || !parsed.subKey || !parsed.at) return null;
            const expired = Date.now() - parsed.at > WBI_STORE_TTL_MS;
            // Key 为每日更替：跨天缓存必然失效，提前丢弃，避免带着旧密钥去撞 -403
            const staleDay = new Date(parsed.at).toDateString() !== new Date().toDateString();
            if (expired || staleDay) {
                localStorage.removeItem(WBI_STORE_KEY);
                return null;
            }
            return { imgKey: parsed.imgKey, subKey: parsed.subKey };
        } catch (e) {
            return null;
        }
    }

    function storeWbiKeys(keys) {
        try {
            localStorage.setItem(WBI_STORE_KEY, JSON.stringify({
                imgKey: keys.imgKey,
                subKey: keys.subKey,
                at: Date.now()
            }));
        } catch (e) { /* localStorage 不可用时静默降级 */ }
    }

    function invalidateWbiKeys() {
        cachedWbiKeys = null;
        wbiKeysCachedAt = 0;
        try {
            localStorage.removeItem(WBI_STORE_KEY);
        } catch (e) { /* 忽略 */ }
    }

    async function getCachedWbiKeys() {
        const now = Date.now();
        if (cachedWbiKeys && (now - wbiKeysCachedAt) < WBI_CACHE_TTL_MS) {
            return cachedWbiKeys;
        }
        const stored = readStoredWbiKeys();
        if (stored) {
            cachedWbiKeys = stored;
            wbiKeysCachedAt = now;
            log('使用本地缓存的 Wbi 签名密钥。', 'info');
            return stored;
        }
        const keys = await getWbiKeys();
        cachedWbiKeys = keys;
        wbiKeysCachedAt = now;
        storeWbiKeys(keys);
        return keys;
    }

    // ==========================================
    // 4. API Client Integration
    // ==========================================
    const API_BASE = 'https://api.bilibili.com';

    async function getWbiKeys() {
        return withRetry(async () => {
            const response = await fetchWithTimeout(`${API_BASE}/x/web-interface/nav`, { credentials: 'include' });
            if (!response.ok) {
                throw new ApiError(`获取 Wbi Key 失败: HTTP ${response.status}`, { status: response.status, retryable: response.status >= 500 });
            }
            const json = await response.json();
            // 未登录时 code 为 -101，但 data.wbi_img 依然会返回，可直接用于签名
            if (json.code !== 0 && json.code !== -101) {
                throw new ApiError(`获取 Wbi Key 失败: ${json.message}`, { code: json.code });
            }
            const wbiImg = json.data && json.data.wbi_img;
            if (!wbiImg || !wbiImg.img_url || !wbiImg.sub_url) {
                throw new ApiError('获取 Wbi Key 失败: 响应缺少 wbi_img 字段');
            }
            // 记录登录态：IP 属地等字段需要登录才返回，未登录时提前告知用户
            const isLogin = !!(json.data && json.data.isLogin);
            wbiLoginState = isLogin;
            if (!isLogin) {
                log('当前未登录 B 站：IP 属地等需要登录的字段将缺失。', 'warn');
            }
            const imgKey = wbiImg.img_url.split('/').pop().split('.')[0];
            const subKey = wbiImg.sub_url.split('/').pop().split('.')[0];
            if (!imgKey || !subKey) {
                throw new ApiError('获取 Wbi Key 失败: 无法从 img_url/sub_url 解析密钥');
            }
            return { imgKey, subKey };
        });
    }

    /**
     * 统一的 GET 请求入口：负责 Wbi 签名、超时、状态码、业务错误码与重试分类。
     * 成功时返回 data 本体（保证非 null），失败时抛出 ApiError。
     */
    async function apiGet(path, params = {}, { wbi = false, signal = null, retries = MAX_RETRIES } = {}) {
        let wbiRefreshed = false;

        return withRetry(async () => {
            let url;
            if (wbi) {
                let keys;
                try {
                    keys = await getCachedWbiKeys();
                } catch (e) {
                    // 拿不到密钥时不要伪造签名（空 mixin_key 必然 -403），直接失败并给出可操作提示
                    if (isAbortError(e)) throw e;
                    throw new ApiError(`获取 Wbi 签名密钥失败：${e.message}，请刷新页面或先登录后重试`, { retryable: false });
                }
                url = signWbiUrl(API_BASE + path, params, keys.imgKey, keys.subKey);
            } else {
                url = `${API_BASE}${path}?${new URLSearchParams(params).toString()}`;
            }

            // 全局限速：并发抓取时由令牌桶统一保证最小请求间隔
            await rateLimiter.acquire(signal);
            const response = await fetchWithTimeout(url, { credentials: 'include' }, FETCH_TIMEOUT_MS, signal);

            // 412 = 风控拦截，继续重试只会加深风控分，直接失败让调用方停止
            if (response.status === 412) {
                throw new ApiError('触发风控校验 (HTTP 412)，请增大请求间隔或稍后再试', { status: 412 });
            }
            if (response.status === 429) {
                throw new ApiError('请求过于频繁 (HTTP 429)，正在退避重试', { status: 429, retryable: true });
            }
            if (!response.ok) {
                throw new ApiError(`HTTP ${response.status}`, { status: response.status, retryable: response.status >= 500 });
            }

            let json;
            try {
                json = await response.json();
            } catch (e) {
                throw new ApiError('响应不是合法 JSON（可能被风控页面拦截）', { retryable: true });
            }

            if (json.code === 0) {
                // 文档：w_rid/wts 缺失或错误时可能返回 code 0 + data.v_voucher
                if (json.data && json.data.v_voucher) {
                    throw new ApiError('接口返回验证码挑战 (v_voucher)，请稍后重试或更换网络环境', { code: -352 });
                }
                return json.data || {};
            }

            // -403 = Wbi 签名被拒（密钥可能已更替）：刷新密钥后重试一次
            if (json.code === -403 && !wbiRefreshed) {
                wbiRefreshed = true;
                invalidateWbiKeys();
                throw new ApiError('Wbi 签名被拒 (-403)，已刷新密钥，正在重试', { code: -403, retryable: true });
            }

            // 走到这里说明 -403 已经刷新过密钥仍被拒，再重试没有意义
            throw new ApiError(describeApiError(json.code, json.message), { code: json.code });
        }, { retries, signal });
    }

    async function fetchCommentsPage(oid, mode, paginationStr, signal = null) {
        const params = {
            oid: oid,
            type: 1,
            mode: mode, // 2 = 仅按时间, 3 = 仅按热度
            pagination_str: JSON.stringify({ offset: paginationStr || '' }),
            plat: 1,
            seek_rpid: '',
            web_location: '1315875'
        };
        const data = await apiGet('/x/v2/reply/wbi/main', params, { wbi: true, signal });
        if (!data.cursor) {
            throw new ApiError('响应缺少 cursor 字段（可能触发风控），已停止抓取');
        }
        return data;
    }

    async function fetchSubCommentsPage(oid, rootRpid, pageNum, signal = null) {
        return apiGet('/x/v2/reply/reply', {
            oid: oid,
            type: 1,
            root: rootRpid.toString(),
            ps: 20,   // 文档：1-49，但单页最多返回 20 条
            pn: pageNum,
            web_location: '333.788'
        }, { signal });
    }

    async function fetchUpVideosPage(mid, pageNum, order, signal = null) {
        return apiGet('/x/space/wbi/arc/search', {
            mid: mid,
            order: order, // 'pubdate', 'click', 'stow'
            platform: 'web',
            pn: pageNum,
            ps: 30,
            tid: 0
        }, { wbi: true, signal });
    }

    // ==========================================
    // 5. CSS Styling (Injected)
    // 设计语言对齐 B 站 Web 端：品牌粉 #FB7299、扁平白卡、1px 细边框、12px 圆角，
    // 文字层级 18191C / 61666D / 9499A0，避免玻璃拟态与渐变大圆角等非原生元素。
    // ==========================================
    const BCE_FONT = '"PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    const CSS_STYLES = `
        /* ========== 视频工具栏入口 ========== */
        .bili-cmt-entry {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            line-height: 1;
            color: #61666d;
            height: 100%;
            padding: 0 6px;
            border-radius: 6px;
            user-select: none;
            -webkit-user-select: none;
            white-space: nowrap;
            transition: color 0.2s ease, background-color 0.2s ease;
            font-family: ${BCE_FONT};
        }
        .bili-cmt-entry:hover { color: #00aeec; }
        .bili-cmt-entry:active { color: #00a1d6; }
        .bili-cmt-entry:focus-visible { outline: 2px solid #00aeec; outline-offset: 2px; }
        .bili-cmt-entry svg { display: block; width: 24px; height: 24px; flex-shrink: 0; }
        .bili-cmt-entry.bili-cmt-dark { color: #a2a7ae; }
        .bili-cmt-entry.bili-cmt-dark:hover { color: #40c4f5; }

        /* ========== 空间页入口 ========== */
        .bili-cmt-entry-space {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            height: 34px;
            padding: 0 16px;
            margin-left: 8px;
            border: none;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: #fff;
            font-size: 14px;
            font-weight: 600;
            line-height: 1;
            font-family: ${BCE_FONT};
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
            white-space: nowrap;
            transition: background-color 0.2s ease, transform 0.15s ease;
        }
        .bili-cmt-entry-space:hover { background: rgba(255, 255, 255, 0.3); }
        .bili-cmt-entry-space:active { transform: scale(0.97); }
        .bili-cmt-entry-space:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .bili-cmt-entry-space svg { width: 16px; height: 16px; }
        .bili-cmt-entry-space.bili-cmt-entry-space-legacy {
            height: 38px;
            background: #f1f2f3;
            color: #61666d;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
        }
        .bili-cmt-entry-space.bili-cmt-entry-space-legacy:hover { background: #e3e5e7; color: #fb7299; }

        /* ========== Toast ========== */
        .bili-cmt-toast-container {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            pointer-events: none;
            font-family: ${BCE_FONT};
        }
        .bili-cmt-toast {
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(24, 25, 28, 0.92);
            color: #fff;
            font-size: 13px;
            font-weight: 500;
            padding: 10px 16px;
            border-radius: 8px;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
            animation: bceToastIn 0.22s ease;
            max-width: 68vw;
            word-break: break-word;
            line-height: 1.4;
        }
        .bili-cmt-toast svg { width: 16px; height: 16px; flex-shrink: 0; }
        .bili-cmt-toast.success svg { color: #5ad48a; }
        .bili-cmt-toast.error svg { color: #ff7a7a; }
        .bili-cmt-toast.info svg { color: #60c8f5; }
        .bili-cmt-toast.out { animation: bceToastOut 0.2s ease forwards; }
        @keyframes bceToastIn {
            from { opacity: 0; transform: translateY(-12px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bceToastOut {
            to { opacity: 0; transform: translateY(-8px); }
        }

        /* ========== 面板基础 ========== */
        .bili-cmt-panel {
            /* 浅色主题令牌（对齐 B 站 Web 端取色） */
            --bce-brand: #fb7299;
            --bce-brand-hover: #ff85ad;
            --bce-brand-active: #e45c87;
            --bce-brand-weak: rgba(251, 114, 153, 0.1);
            --bce-blue: #00aeec;
            --bce-green: #0fa958;
            --bce-orange: #ff8a00;
            --bce-red: #f45b5b;
            --bce-text-1: #18191c;
            --bce-text-2: #61666d;
            --bce-text-3: #9499a0;
            --bce-line: #e3e5e7;
            --bce-line-weak: #f1f2f3;
            --bce-fill-1: #f6f7f8;
            --bce-fill-2: #f1f2f3;
            --bce-surface: #ffffff;
            --bce-seg-active: #ffffff;
            --bce-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
            --bce-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);

            position: fixed;
            right: 24px;
            bottom: 24px;
            width: 460px;
            max-width: calc(100vw - 32px);
            z-index: 100000;
            background: var(--bce-surface);
            border: 1px solid var(--bce-line);
            border-radius: 12px;
            box-shadow: var(--bce-shadow);
            font-family: ${BCE_FONT};
            color: var(--bce-text-1);
            display: flex;
            flex-direction: column;
            max-height: min(88vh, 800px);
            overflow: hidden;
            box-sizing: border-box;
            text-align: left;
            -webkit-font-smoothing: antialiased;
            opacity: 0;
            visibility: hidden;
            transform: translateY(8px) scale(0.99);
            transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1), visibility 0.2s;
        }
        .bili-cmt-panel.bili-cmt-open { opacity: 1; visibility: visible; transform: none; }
        .bili-cmt-panel.bili-cmt-dragging { transition: none; user-select: none; }
        .bili-cmt-panel.bili-cmt-dark {
            --bce-brand-weak: rgba(251, 114, 153, 0.16);
            --bce-text-1: #e3e5e7;
            --bce-text-2: #a2a7ae;
            --bce-text-3: #71767d;
            --bce-line: #2f3134;
            --bce-line-weak: #26282b;
            --bce-fill-1: #1b1c1f;
            --bce-fill-2: #26282b;
            --bce-surface: #212226;
            --bce-seg-active: #34373b;
            --bce-shadow: 0 12px 40px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
            --bce-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .bili-cmt-panel ::-webkit-scrollbar { width: 6px; height: 6px; }
        .bili-cmt-panel ::-webkit-scrollbar-track { background: transparent; }
        .bili-cmt-panel ::-webkit-scrollbar-thumb { background: var(--bce-line); border-radius: 3px; }
        .bili-cmt-panel ::-webkit-scrollbar-thumb:hover { background: var(--bce-text-3); }

        /* ========== 头部 ========== */
        .bili-cmt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 14px 16px 14px 20px;
            border-bottom: 1px solid var(--bce-line-weak);
            cursor: grab;
            flex-shrink: 0;
            user-select: none;
            -webkit-user-select: none;
        }
        .bili-cmt-header:active { cursor: grabbing; }

        .bili-cmt-title-area { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .bili-cmt-title-area h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            line-height: 20px;
            color: var(--bce-text-1);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        /* B 站常见的小标题前缀竖条 */
        .bili-cmt-title-area h3::before {
            content: "";
            width: 3px;
            height: 14px;
            border-radius: 2px;
            background: var(--bce-brand);
        }
        .bili-cmt-subtitle {
            font-size: 12px;
            line-height: 16px;
            color: var(--bce-text-3);
            padding-left: 11px;
        }
        .bili-cmt-icon-btn {
            flex-shrink: 0;
            background: transparent;
            border: none;
            color: var(--bce-text-3);
            cursor: pointer;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: background-color 0.2s ease, color 0.2s ease;
            outline: none;
            padding: 0;
        }
        .bili-cmt-icon-btn:hover { color: var(--bce-text-1); background: var(--bce-fill-2); }
        .bili-cmt-icon-btn:active { background: var(--bce-line); }
        .bili-cmt-icon-btn:focus-visible { outline: 2px solid var(--bce-brand); outline-offset: 1px; }
        .bili-cmt-icon-btn svg { width: 16px; height: 16px; }

        /* ========== 内容区 ========== */
        .bili-cmt-body {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-height: 0;
            overflow-y: auto;
            padding: 16px 20px 20px;
            box-sizing: border-box;
        }
        .bili-cmt-mode-progress .bili-cmt-tabs,
        .bili-cmt-mode-progress .bili-cmt-tab-content,
        .bili-cmt-mode-dashboard .bili-cmt-tabs,
        .bili-cmt-mode-dashboard .bili-cmt-tab-content { display: none !important; }

        /* ========== 顶部标签（B 站下划线式） ========== */
        .bili-cmt-tabs {
            display: flex;
            gap: 24px;
            border-bottom: 1px solid var(--bce-line-weak);
            margin-bottom: -2px;
        }
        .bili-cmt-tab {
            position: relative;
            padding: 0 0 10px;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            color: var(--bce-text-2);
            cursor: pointer;
            transition: color 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
        }
        .bili-cmt-tab:hover { color: var(--bce-brand); }
        .bili-cmt-tab.active { color: var(--bce-text-1); font-weight: 600; }
        .bili-cmt-tab.active::after {
            content: "";
            position: absolute;
            left: 50%;
            bottom: -1px;
            transform: translateX(-50%);
            width: 20px;
            height: 2px;
            border-radius: 2px;
            background: var(--bce-brand);
        }
        .bili-cmt-tab:focus-visible { outline: 2px solid var(--bce-brand); outline-offset: 2px; border-radius: 2px; }

        .bili-cmt-tab-content { display: none; flex-direction: column; gap: 16px; }
        .bili-cmt-tab-content.active { display: flex; }

        /* ========== 表单 ========== */
        .bili-cmt-form-group { display: flex; flex-direction: column; gap: 8px; }
        .bili-cmt-form-group > label {
            font-size: 13px;
            font-weight: 500;
            line-height: 18px;
            color: var(--bce-text-2);
        }
        .bili-cmt-form-group input[type="text"],
        .bili-cmt-form-group input[type="number"] {
            background: var(--bce-fill-1);
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 0 12px;
            height: 36px;
            font-size: 13px;
            outline: none;
            transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
            color: var(--bce-text-1);
            font-family: inherit;
            width: 100%;
            box-sizing: border-box;
        }
        .bili-cmt-form-group input[type="text"]:hover,
        .bili-cmt-form-group input[type="number"]:hover { background: var(--bce-fill-2); }
        .bili-cmt-form-group input[type="text"]:focus,
        .bili-cmt-form-group input[type="number"]:focus {
            background: var(--bce-surface);
            border-color: var(--bce-brand);
            box-shadow: 0 0 0 3px var(--bce-brand-weak);
        }
        .bili-cmt-form-group input::placeholder { color: var(--bce-text-3); opacity: 1; }
        /* 去掉数字输入框的上下箭头，保持与 B 站表单一致 */
        .bili-cmt-form-group input[type="number"]::-webkit-outer-spin-button,
        .bili-cmt-form-group input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .bili-cmt-form-group input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
        .bili-cmt-shake { animation: bceShake 0.4s ease; border-color: var(--bce-red) !important; }
        @keyframes bceShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }

        .bili-cmt-form-row { display: flex; gap: 12px; }
        .bili-cmt-form-group.half { flex: 1; width: 50%; min-width: 0; }

        /* ========== 分段选择器 ========== */
        .bili-cmt-segmented {
            display: flex;
            background: var(--bce-fill-2);
            border-radius: 8px;
            padding: 3px;
            gap: 2px;
        }
        .bili-cmt-segment-item { flex: 1; position: relative; cursor: pointer; text-align: center; min-width: 0; }
        .bili-cmt-segment-item input { position: absolute; opacity: 0; width: 0; height: 0; }
        .bili-cmt-segment-item span {
            display: block;
            padding: 7px 8px;
            font-size: 13px;
            font-weight: 500;
            line-height: 18px;
            color: var(--bce-text-2);
            border-radius: 6px;
            transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .bili-cmt-segment-item span:hover { color: var(--bce-text-1); }
        .bili-cmt-segment-item input:checked + span {
            background: var(--bce-seg-active);
            color: var(--bce-brand);
            font-weight: 600;
            box-shadow: var(--bce-shadow-sm);
        }
        .bili-cmt-segment-item input:focus-visible + span { outline: 2px solid var(--bce-brand); outline-offset: -1px; }

        /* ========== 复选框 ========== */
        .bili-cmt-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 500;
            line-height: 18px;
            color: var(--bce-text-2);
            cursor: pointer;
            user-select: none;
            -webkit-user-select: none;
        }
        .bili-cmt-checkbox-label:hover { color: var(--bce-text-1); }
        .bili-cmt-checkbox-label input {
            accent-color: var(--bce-brand);
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
            flex-shrink: 0;
        }

        /* ========== 按钮 ========== */
        .bili-cmt-btn {
            border: none;
            border-radius: 8px;
            height: 40px;
            padding: 0 20px;
            font-size: 14px;
            font-weight: 600;
            line-height: 1;
            font-family: inherit;
            cursor: pointer;
            transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
            text-align: center;
            outline: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-sizing: border-box;
        }
        .bili-cmt-btn:focus-visible { outline: 2px solid var(--bce-blue); outline-offset: 2px; }
        .bili-cmt-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
        .bili-cmt-btn.primary {
            background: var(--bce-brand);
            color: #fff;
            width: 100%;
        }
        .bili-cmt-btn.primary:hover { background: var(--bce-brand-hover); }
        .bili-cmt-btn.primary:active { background: var(--bce-brand-active); }
        .bili-cmt-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
        .bili-cmt-btn.danger {
            background: transparent;
            color: var(--bce-red);
            border: 1px solid var(--bce-line);
            width: 100%;
        }
        .bili-cmt-btn.danger:hover { background: rgba(244, 91, 91, 0.06); border-color: rgba(244, 91, 91, 0.4); }
        .bili-cmt-btn-text {
            background: transparent;
            border: none;
            color: var(--bce-blue);
            font-size: 13px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            outline: none;
            padding: 4px 0;
            line-height: 18px;
        }
        .bili-cmt-btn-text:hover { color: var(--bce-brand); }
        .bili-cmt-btn-text:focus-visible { outline: 2px solid var(--bce-blue); outline-offset: 2px; border-radius: 2px; }

        /* ========== 进度视图 ========== */
        .bili-cmt-progress-panel { display: none; flex-direction: column; gap: 16px; }
        .bili-cmt-progress-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
        .bili-cmt-progress-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            line-height: 20px;
            color: var(--bce-text-1);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #progress-percent {
            font-size: 24px;
            font-weight: 600;
            line-height: 26px;
            color: var(--bce-text-1);
            font-variant-numeric: tabular-nums;
            flex-shrink: 0;
        }
        .bili-cmt-progress-bar-container {
            background: var(--bce-fill-2);
            height: 6px;
            border-radius: 999px;
            overflow: hidden;
        }
        .bili-cmt-progress-bar-fill {
            background: var(--bce-brand);
            height: 100%;
            border-radius: 999px;
            width: 0%;
            transition: width 0.3s ease;
        }
        /* 分母不可靠时的不确定进度：滑动光条，避免显示错误的百分比 */
        .bili-cmt-progress-bar-fill.indeterminate {
            width: 32% !important;
            background: linear-gradient(90deg, transparent, var(--bce-brand), transparent);
            animation: bce-progress-slide 1.4s ease-in-out infinite;
        }
        @keyframes bce-progress-slide {
            0% { transform: translateX(-110%); }
            100% { transform: translateX(330%); }
        }
        .bili-cmt-stats-summary {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 12px;
            line-height: 18px;
            color: var(--bce-text-2);
        }
        .bili-cmt-badge {
            display: inline-block;
            min-width: 22px;
            padding: 1px 8px;
            border-radius: 999px;
            background: var(--bce-brand-weak);
            color: var(--bce-brand);
            font-size: 12px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            text-align: center;
        }
        #progress-speed { margin-left: auto; color: var(--bce-text-3); }

        .bili-cmt-console {
            background: var(--bce-fill-1);
            border-radius: 8px;
            padding: 12px;
            font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
            font-size: 12px;
            line-height: 1.6;
            flex-grow: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2px;
            text-align: left;
            min-height: 180px;
            max-height: 240px;
            box-sizing: border-box;
            color: var(--bce-text-2);
        }
        .log-line { word-break: break-word; }
        .log-line.info { color: var(--bce-text-2); }
        .log-line.success { color: var(--bce-green); }
        .log-line.error { color: var(--bce-red); }
        .log-line.warn { color: var(--bce-orange); }

        /* ========== 数据看板 ========== */
        .bili-cmt-dashboard { display: none; flex-direction: column; gap: 16px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .dashboard-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            line-height: 20px;
            color: var(--bce-text-1);
        }
        .dash-duration {
            font-size: 12px;
            line-height: 18px;
            color: var(--bce-text-2);
            padding: 10px 12px;
            background: var(--bce-fill-1);
            border-radius: 8px;
        }
        .dash-duration span { color: var(--bce-brand); font-weight: 600; }
        .dashboard-summary-cards { display: flex; gap: 8px; }
        .summary-card {
            flex: 1;
            min-width: 0;
            background: var(--bce-surface);
            border: 1px solid var(--bce-line);
            border-radius: 8px;
            padding: 12px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }
        .summary-card:first-child { border-color: var(--bce-brand-weak); background: var(--bce-brand-weak); }
        .card-num {
            font-size: 20px;
            font-weight: 600;
            line-height: 24px;
            color: var(--bce-text-1);
            font-variant-numeric: tabular-nums;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .summary-card:first-child .card-num { color: var(--bce-brand); }
        .card-label { font-size: 12px; line-height: 16px; color: var(--bce-text-3); }

        .dashboard-charts { display: flex; flex-direction: column; gap: 12px; }
        .chart-section {
            background: var(--bce-surface);
            border: 1px solid var(--bce-line);
            border-radius: 8px;
            padding: 12px 14px 14px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .chart-section h5 {
            margin: 0;
            font-size: 13px;
            font-weight: 600;
            line-height: 18px;
            color: var(--bce-text-1);
            text-align: left;
        }
        .chart-container { display: flex; flex-direction: column; gap: 10px; }
        .chart-empty {
            font-size: 12px;
            line-height: 18px;
            color: var(--bce-text-3);
            text-align: center;
            padding: 14px 0;
        }
        .chart-bar-row { display: flex; align-items: center; gap: 10px; font-size: 12px; line-height: 16px; }
        .chart-bar-label {
            width: 52px;
            flex-shrink: 0;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            text-align: left;
            color: var(--bce-text-2);
        }
        .chart-bar-bg {
            flex-grow: 1;
            background: var(--bce-fill-2);
            height: 8px;
            border-radius: 999px;
            overflow: hidden;
            position: relative;
        }
        .chart-bar-fill {
            background: var(--bce-brand);
            height: 100%;
            border-radius: 999px;
            width: 0%;
            transition: width 0.5s ease-out;
        }
        .chart-bar-val {
            width: 76px;
            flex-shrink: 0;
            text-align: right;
            color: var(--bce-text-3);
            font-variant-numeric: tabular-nums;
        }
        .chart-section-row { display: flex; gap: 12px; align-items: stretch; }
        .chart-section-row .chart-section.half {
            flex: 1;
            width: 50%;
            min-width: 0;
            display: flex;
            flex-direction: column;
        }
        /* 半宽卡片高度由最高的那张决定，内容少的（性别）需要垂直居中 */
        .chart-section-row .chart-section.half .chart-container {
            flex: 1;
            justify-content: center;
        }

        .level-stats-container { display: flex; flex-direction: column; gap: 8px; width: 100%; }
        .level-row { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 14px; }
        .level-label {
            width: 28px;
            flex-shrink: 0;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 0;
            border-radius: 4px;
            text-align: center;
            color: #fff;
            font-family: Helvetica, Arial, sans-serif;
        }
        .level-label.lv1 { background: #c9ccd0; }
        .level-label.lv2 { background: #8fd9ae; }
        .level-label.lv3 { background: #5cc4ef; }
        .level-label.lv4 { background: #ffab4d; }
        .level-label.lv5 { background: #ff8a5c; }
        .level-label.lv6 { background: #fb7299; }
        .level-bar-bg {
            flex-grow: 1;
            background: var(--bce-fill-2);
            height: 6px;
            border-radius: 999px;
            overflow: hidden;
            min-width: 0;
        }
        .level-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease-out; }
        .level-bar-fill.lv1 { background: #c9ccd0; }
        .level-bar-fill.lv2 { background: #8fd9ae; }
        .level-bar-fill.lv3 { background: #5cc4ef; }
        .level-bar-fill.lv4 { background: #ffab4d; }
        .level-bar-fill.lv5 { background: #ff8a5c; }
        .level-bar-fill.lv6 { background: #fb7299; }
        .level-val {
            width: 62px;
            flex-shrink: 0;
            text-align: right;
            color: var(--bce-text-3);
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        .gender-stats-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
            width: 100%;
        }
        .gender-item {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            font-size: 11px;
            line-height: 14px;
        }
        .g-icon {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2px;
        }
        .gender-item.male .g-icon { background: rgba(0, 174, 236, 0.1); color: var(--bce-blue); }
        .gender-item.female .g-icon { background: var(--bce-brand-weak); color: var(--bce-brand); }
        .gender-item.secret .g-icon { background: var(--bce-fill-2); color: var(--bce-text-3); }
        .gender-item .g-svg { stroke: currentColor; display: block; width: 16px; height: 16px; }
        .gender-item .g-label { color: var(--bce-text-3); }
        .gender-item .g-pct {
            font-size: 14px;
            font-weight: 600;
            line-height: 18px;
            color: var(--bce-text-1);
            font-variant-numeric: tabular-nums;
        }
        .gender-item .g-count { font-size: 11px; color: var(--bce-text-3); font-variant-numeric: tabular-nums; }
        .dashboard-footer { margin-top: 2px; }

        /* ========== 降低动效偏好 ========== */
        @media (prefers-reduced-motion: reduce) {
            .bili-cmt-panel,
            .bili-cmt-toast,
            .bili-cmt-progress-bar-fill,
            .chart-bar-fill,
            .level-bar-fill { transition: none !important; animation: none !important; }
            .bili-cmt-progress-bar-fill.indeterminate { width: 100% !important; opacity: 0.5; }
        }
    `;

    // ==========================================
    // 6. CSV Export Utility
    // ==========================================
    // 以 = + - @ 或制表符/回车开头的字段会被 Excel/WPS 当作公式执行，加前缀单引号阻断
    const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

    function escapeCSVField(field) {
        if (field === null || field === undefined) {
            return '""';
        }
        let str = field.toString();
        if (CSV_FORMULA_PREFIX.test(str)) {
            str = "'" + str;
        }
        str = str.replace(/"/g, '""'); // Double quotes escaping
        return `"${str}"`;
    }

    const CSV_HEADERS = ["bvid", "upname", "sex", "content", "pictures", "rpid", "oid", "mid", "parent", "fans_grade", "ctime", "like", "level", "location"];

    /**
     * 分块构建 Blob：评论数上万时，先把所有行拼成一个超大字符串会造成 3-4 倍内存峰值，
     * 这里改成按 CSV_CHUNK_ROWS 分块，交给 Blob 自己管理（浏览器可落盘）。
     */
    function buildCSVBlob(comments) {
        // UTF-8 BOM 解决 Excel/WPS 打开中文乱码
        const parts = ['\uFEFF' + CSV_HEADERS.join(',') + '\r\n'];
        let chunk = [];

        for (const cmt of comments) {
            const row = [
                cmt.bvid,
                cmt.upname,
                cmt.sex,
                cmt.content,
                cmt.pictures,
                cmt.rpid,
                cmt.oid,
                cmt.mid,
                cmt.parent,
                cmt.fans_grade,
                cmt.ctime,
                cmt.like,
                cmt.level,
                cmt.location
            ];
            chunk.push(row.map(escapeCSVField).join(','));
            if (chunk.length >= CSV_CHUNK_ROWS) {
                parts.push(chunk.join('\r\n') + '\r\n');
                chunk = [];
            }
        }
        if (chunk.length > 0) {
            parts.push(chunk.join('\r\n') + '\r\n');
        }

        return new Blob(parts, { type: 'text/csv;charset=utf-8;' });
    }

    function downloadCSV(comments, filename) {
        if (comments.length === 0) {
            toast('没有可导出的评论数据', 'error');
            return;
        }

        const blob = buildCSVBlob(comments);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Delay revokeObjectURL to ensure browser has time to trigger the download
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function sanitizeFilename(name) {
        return name.replace(/[\\/:*?"<>|]/g, "_");
    }

    // ==========================================
    // 7. Parsing Inputs
    // ==========================================
    // BV 号为固定 12 位、正文使用 base58 字符集（不含 0 / I / O / l）
    const BVID_PATTERN = /^BV1[1-9A-HJ-NP-Za-km-z]{9}$/;

    /**
     * 校验并规范化 BV 号。只把前缀 bv 规范成 BV——BV 号正文大小写敏感，不能整体转换。
     * 非法输入返回 null，避免把无效字符传给 bvid2avid 后静默算出错误的 avid。
     */
    function normalizeBvid(raw) {
        if (typeof raw !== 'string') return null;
        const s = raw.trim();
        if (!s) return null;
        const candidate = /^bv/i.test(s) ? 'BV' + s.slice(2) : s;
        return BVID_PATTERN.test(candidate) ? candidate : null;
    }

    function parseOidInput(input) {
        input = input.trim();
        if (!input) return null;

        // 视频链接
        const bvMatch = input.match(/video\/(bv[0-9a-z]{10})/i);
        if (bvMatch) {
            const bvid = normalizeBvid(bvMatch[1]);
            return bvid ? { oid: bvid2avid(bvid).toString(), bvid: bvid } : null;
        }
        const avMatch = input.match(/video\/av(\d+)/i);
        if (avMatch) {
            return { oid: avMatch[1], bvid: avid2bvid(BigInt(avMatch[1])) };
        }

        // 直接输入 BV 号
        const bvid = normalizeBvid(input);
        if (bvid) {
            return { oid: bvid2avid(bvid).toString(), bvid: bvid };
        }

        // 直接输入 AV 号
        const avRaw = input.match(/^av(\d+)$/i);
        if (avRaw && avRaw[1].length <= 18) {
            return { oid: avRaw[1], bvid: avid2bvid(BigInt(avRaw[1])) };
        }

        // 纯数字按 AV 号处理
        if (/^\d{1,18}$/.test(input)) {
            return { oid: input, bvid: avid2bvid(BigInt(input)) };
        }

        return null;
    }

    function parseMidInput(input) {
        input = input.trim();
        if (!input) return null;

        // Check space URL
        const match = input.match(/space\.bilibili\.com\/(\d+)/i);
        if (match) {
            return match[1];
        }

        // Check raw number
        if (/^\d+$/.test(input)) {
            return input;
        }

        return null;
    }

    /** 统一把表单里的数字输入收敛到安全范围，避免负延时 / 超大页数直接打到接口 */
    function clampInt(value, min, max, fallback) {
        const n = parseInt(value, 10);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    function getPageContext() {
        const url = window.location.href;
        let bvid = '';
        let avid = '';
        let mid = '';

        const bvMatch = url.match(/video\/(bv[0-9a-z]{10})/i);
        const avMatch = url.match(/video\/av(\d+)/i);
        const spaceMatch = url.match(/space\.bilibili\.com\/(\d+)/i);

        if (bvMatch) {
            bvid = normalizeBvid(bvMatch[1]) || '';
        } else if (avMatch) {
            avid = avMatch[1];
            bvid = avid2bvid(BigInt(avid));
        }

        if (spaceMatch) {
            mid = spaceMatch[1];
        }

        // Fallbacks from global variables
        if (!bvid && window.bvid) bvid = window.bvid;
        if (!avid && window.aid) {
            avid = window.aid.toString();
            bvid = avid2bvid(BigInt(avid));
        }

        return { bvid, avid, mid };
    }

    function getVideoTitle() {
        let title = '';
        const titleEl = document.querySelector('.video-title') || document.querySelector('.tit') || document.querySelector('.video-title-item');
        if (titleEl) {
            title = titleEl.innerText.trim();
        }
        if (!title) {
            title = document.title.replace(/_哔哩哔哩_bilibili.*/, '').trim();
        }
        return title || 'B站视频';
    }

    function getUpName() {
        const hName = document.querySelector('#h-name');
        if (hName) return hName.innerText.trim();

        const upName = document.querySelector('.up-name') || document.querySelector('.up-info-v2 .username') || document.querySelector('.up-card .name');
        if (upName) return upName.innerText.trim();

        return '';
    }

    // ==========================================
    // 8. Orchestrators & Handlers
    // ==========================================
    let isExporting = false;
    let shouldCancel = false;
    let exportStartTime = 0;
    const LOG_MAX_LINES = 200;
    const LOG_FLUSH_MS = 120;          // 日志合批刷新间隔
    const SUB_FETCH_CONCURRENCY = 3;    // 楼中楼并发的楼层数（实际 QPS 仍由令牌桶控制）
    const CSV_CHUNK_ROWS = 2000;        // CSV 分块大小，避免一次性拼出超大字符串

    let currentExportedComments = [];
    let currentFilename = "";
    let exportController = null;   // 当前导出的 AbortController

    // Throttled progress DOM update (max once per 400ms)
    let lastProgressUpdate = 0;
    function throttledProgressUpdate(stats, expected, force = false) {
        const now = Date.now();
        if (!force && now - lastProgressUpdate < 400) return;
        lastProgressUpdate = now;

        const fetched = stats.main + stats.sub;
        const mainEl = document.getElementById('stats-main');
        const subEl = document.getElementById('stats-sub');
        const speedEl = document.getElementById('progress-speed');
        const barEl = document.getElementById('progress-bar-fill');
        const pctEl = document.getElementById('progress-percent');

        if (mainEl) mainEl.innerText = stats.main;
        if (subEl) subEl.innerText = stats.sub;

        // expected 为 0 表示没有可靠分母（例如不抓楼中楼，而 all_count 含子评论），
        // 此时不显示百分比，避免进度条永远到不了 100% 的误导
        if (expected > 0) {
            const pct = Math.min(99, Math.round((fetched / expected) * 100));
            if (speedEl) speedEl.innerText = `已抓取 ${fetched} / 约 ${expected} 条`;
            if (pctEl) pctEl.innerText = `${pct}%`;
            if (barEl) {
                barEl.classList.remove('indeterminate');
                barEl.style.width = `${pct}%`;
            }
        } else {
            if (speedEl) speedEl.innerText = `已抓取 ${fetched} 条`;
            if (pctEl) pctEl.innerText = '—';
            if (barEl) barEl.classList.add('indeterminate');
        }
    }

    // 日志合批：抓取高峰期可能每秒几十条，逐条改动 DOM 会触发大量重排
    let logBuffer = [];
    let logFlushTimer = null;

    function log(msg, type = 'info') {
        const timeStr = new Date().toTimeString().split(' ')[0];
        logBuffer.push({ text: `[${timeStr}] ${msg}`, type });
        if (logFlushTimer) return;
        logFlushTimer = setTimeout(flushLogBuffer, LOG_FLUSH_MS);
    }

    function flushLogBuffer() {
        logFlushTimer = null;
        if (logBuffer.length === 0) return;
        const pending = logBuffer;
        logBuffer = [];

        const consoleDiv = document.getElementById('console-log');
        if (!consoleDiv) return;   // 面板已关闭，丢弃这批日志

        try {
            // 用户正往上翻看历史日志时不要强制拉到底部
            const clientHeight = consoleDiv.clientHeight || 0;
            const nearBottom = (consoleDiv.scrollHeight - consoleDiv.scrollTop - clientHeight) < 40;

            const frag = document.createDocumentFragment();
            for (const item of pending) {
                const line = document.createElement('div');
                line.className = `log-line ${item.type}`;
                line.innerText = item.text;
                frag.appendChild(line);
            }
            consoleDiv.appendChild(frag);

            while (consoleDiv.children.length > LOG_MAX_LINES) {
                consoleDiv.removeChild(consoleDiv.firstChild);
            }
            if (nearBottom) consoleDiv.scrollTop = consoleDiv.scrollHeight;
        } catch (e) {
            // 页面切换导致节点失效时忽略，日志问题不应影响导出
        }
    }

    // 错误码语义映射（依据 bilibili-API-collect 文档 comment/list.md 与 misc/sign/wbi.md）
    function describeApiError(code, message) {
        switch (code) {
            case 12002: return '该评论区已关闭';
            case 12009: return '评论区 type 参数不合法';
            case -101: return '账号未登录';
            case -352: return '触发 B 站风控 (-352)，请稍后再试或增大请求间隔';
            case -403: return 'Wbi 签名校验失败 (-403)';
            case -404: return '目标不存在或已被删除 (-404)';
            case -412: return '请求被拦截 (-412)，触发风控，请稍后再试';
            default: return (message && message !== '0') ? message : `code ${code}`;
        }
    }

    function createEmptyStats() {
        return {
            main: 0,
            sub: 0,
            ip: {},
            level: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0},
            sex: { '男': 0, '女': 0, '保密': 0 }
        };
    }

    function mapReplyItem(item, bvid) {
        let picURLs = '';
        if (item.content && item.content.pictures) {
            picURLs = item.content.pictures.map(p => p.img_src).join(';') + (item.content.pictures.length > 0 ? ';' : '');
        }

        let location = '';
        if (item.reply_control && item.reply_control.location) {
            location = item.reply_control.location.replace('IP属地：', '');
        }

        return {
            bvid: bvid,
            upname: item.member ? item.member.uname : '',
            sex: item.member ? item.member.sex : '保密',
            content: item.content ? item.content.message : '',
            pictures: picURLs,
            rpid: item.rpid,
            oid: item.oid,
            mid: item.mid,
            parent: item.parent || 0,
            fans_grade: item.fansgrade || 0,
            ctime: item.ctime,
            like: item.like || 0,
            level: (item.member && item.member.level_info) ? item.member.level_info.current_level : 0,
            location: location
        };
    }

    function updateStats(stats, cmt) {
        const loc = cmt.location || '未知';
        stats.ip[loc] = (stats.ip[loc] || 0) + 1;

        const lvl = cmt.level;
        if (lvl !== undefined && lvl >= 1 && lvl <= 6) {
            stats.level[lvl]++;
        }

        const sex = cmt.sex || '保密';
        if (stats.sex[sex] !== undefined) {
            stats.sex[sex]++;
        } else {
            stats.sex['保密']++;
        }
    }

    /** 把单次视频导出的统计数据合并进批量统计 */
    function mergeStats(target, source) {
        target.main += source.main;
        target.sub += source.sub;
        for (const loc in source.ip) {
            target.ip[loc] = (target.ip[loc] || 0) + source.ip[loc];
        }
        for (let lvl = 1; lvl <= 6; lvl++) {
            target.level[lvl] += source.level[lvl];
        }
        for (const s in source.sex) {
            target.sex[s] += source.sex[s];
        }
    }

    function setProgressTitle(text) {
        const el = document.getElementById('progress-title');
        if (el) el.innerText = text;
    }

    async function exportVideoComments(oid, bvid, mode, includeSub, limit, options = {}) {
        const signal = options.signal || null;
        const allComments = [];
        const rpidMap = new Set();     // rpid 本身是数字，用 Set<number> 省掉每条两次字符串转换
        const stats = createEmptyStats();
        const failedFloors = [];       // 子评论未完整抓取的楼层 rpid

        const cancelled = () => shouldCancel || !!(signal && signal.aborted);

        /**
         * 抓取单个楼层的全部子评论。楼层内部严格按页顺序，
         * 楼层之间由 mapWithConcurrency 并行，请求间隔交给全局令牌桶。
         */
        const collectSubComments = async (floor) => {
            const out = [];
            if (!includeSub || !(floor.rcount > 0)) return out;

            // 主评论接口已内联返回全部子评论时直接复用，省一次请求
            const preview = Array.isArray(floor.replies) ? floor.replies : [];
            if (preview.length > 0 && preview.length >= floor.rcount) return preview;

            let subPage = 1;
            let totalPages = 0;   // 0 表示未知，回退到「满页」判断

            while (!cancelled()) {
                if (subPage === 1 || subPage % 5 === 0) {
                    log(`  正在抓取主评论 ${floor.rpid} 的子评论第 ${subPage} 页...`, 'info');
                }

                let data;
                try {
                    data = await fetchSubCommentsPage(oid, floor.rpid, subPage, signal);
                } catch (e) {
                    if (isAbortError(e) || cancelled()) break;
                    failedFloors.push(String(floor.rpid));
                    log(`  主评论 ${floor.rpid} 的子评论第 ${subPage} 页抓取失败：${e.message}`, 'error');
                    break;
                }

                const subs = Array.isArray(data.replies) ? data.replies : [];
                if (subs.length === 0) break;
                for (const sub of subs) out.push(sub);

                // 文档：data.page.count 为二级评论总数，用它算总页数比「返回不足 20 条」更可靠
                if (!totalPages) {
                    const count = data.page && data.page.count;
                    if (count > 0) totalPages = Math.ceil(count / 20);
                }
                if (totalPages) {
                    if (subPage >= totalPages) break;
                } else if (subs.length < 20) {
                    break;
                }
                subPage++;
            }
            return out;
        };

        const pushComment = (item, isSub) => {
            const rpid = Number(item.rpid);
            if (!rpid || rpidMap.has(rpid)) return false;
            rpidMap.add(rpid);
            const mapped = mapReplyItem(item, bvid);
            allComments.push(mapped);
            if (isSub) stats.sub++; else stats.main++;
            updateStats(stats, mapped);
            return true;
        };

        let paginationStr = '';
        let round = 0;
        let expected = 0;
        let mainCountFetched = 0;
        let maxTryCount = 0;
        let completed = false;

        while (!cancelled()) {
            round++;
            log(`正在抓取视频 ${bvid} 的主评论第 ${round} 页...`, 'info');

            let page;
            try {
                page = await fetchCommentsPage(oid, mode, paginationStr, signal);
            } catch (e) {
                if (isAbortError(e) || cancelled()) break;
                log(`请求第 ${round} 页主评论失败：${e.message}`, 'error');
                break;
            }

            if (round === 1) {
                // all_count 含子评论：只有抓取楼中楼时才是有效的进度分母，
                // 否则强行使用会让进度条永远停在某个百分比
                if (includeSub) {
                    expected = page.cursor.all_count || 0;
                    log(`该视频评论区约 ${expected} 条（含楼中楼）。`, 'info');
                } else {
                    log('未勾选楼中楼：接口只提供含子评论的总数，进度以已抓取条数显示。', 'info');
                }
                throttledProgressUpdate(stats, expected, true);
            }

            const replies = Array.isArray(page.replies) ? page.replies : [];
            let currentReplies = replies.slice();

            if (round === 1) {
                // 置顶评论可能出现在 top_replies（数组）或 top.admin/upper/vote 中，合并后由 rpid 去重兜底
                const pinned = [];
                if (Array.isArray(page.top_replies)) {
                    for (const item of page.top_replies) pinned.push(item);
                }
                const top = page.top;
                if (top) {
                    ['admin', 'upper', 'vote'].forEach(key => {
                        if (top[key] && top[key].rpid) pinned.push(top[key]);
                    });
                }
                if (pinned.length > 0) currentReplies = pinned.concat(currentReplies);
            }

            if (currentReplies.length === 0) {
                log('本页未获取到评论，抓取结束。', 'info');
                completed = true;
                break;
            }

            const cursor = page.cursor || {};
            paginationStr = cursor.pagination_reply ? cursor.pagination_reply.next_offset : '';

            let hasNewComments = false;
            let limitReached = false;

            // 1) 按顺序挑出本页要处理的主评论：页内去重 + 按剩余额度裁剪
            const pageSeen = new Set();
            const tasks = [];
            for (const reply of currentReplies) {
                const rpid = Number(reply.rpid);
                if (!rpid || rpidMap.has(rpid) || pageSeen.has(rpid)) continue;
                if (limit && (mainCountFetched + tasks.length) >= limit) {
                    limitReached = true;
                    break;
                }
                pageSeen.add(rpid);
                tasks.push({ reply: reply, subs: [] });
            }
            if (limit && (mainCountFetched + tasks.length) >= limit) limitReached = true;

            // 2) 并行抓取本页各楼层的楼中楼（并发数固定，实际速率由令牌桶控制）
            if (tasks.length > 0) {
                await mapWithConcurrency(tasks, SUB_FETCH_CONCURRENCY, async (task) => {
                    task.subs = await collectSubComments(task.reply);
                }, signal);
            }

            // 3) 按楼层顺序合并，保证 CSV 中「主评论 → 其楼中楼」始终相邻。
            //    此时数据已在内存里，不需要再看取消标记，已抓到的不要浪费。
            for (const task of tasks) {
                if (!pushComment(task.reply, false)) continue;
                hasNewComments = true;
                for (const sub of task.subs) pushComment(sub, true);
                mainCountFetched++;
            }

            if (limitReached) {
                log(`已达到设定的主评论获取上限 (${limit} 条)，准备保存数据。`, 'success');
                completed = true;
                break;
            }
            if (cancelled()) break;

            if (!hasNewComments) {
                maxTryCount++;
                log(`本页获取到的全部评论皆为重复数据 (第 ${maxTryCount} 次)...`, 'warn');
                if (maxTryCount >= 5) {
                    log('连续 5 次获取到重复数据，停止抓取，防止陷入死循环。', 'warn');
                    break;
                }
            } else {
                maxTryCount = 0;
            }

            throttledProgressUpdate(stats, expected);

            if (!paginationStr || cursor.is_end) {
                log('已到达主评论底部。', 'success');
                completed = true;
                break;
            }
        }

        if (!completed && cancelled()) {
            log(`导出已中断：已抓取 ${stats.main} 条主评论 / ${stats.sub} 条楼中楼。`, 'warn');
        }
        if (failedFloors.length > 0) {
            log(`有 ${failedFloors.length} 个楼层的子评论未完整抓取（rpid: ${failedFloors.slice(0, 5).join(', ')}${failedFloors.length > 5 ? ' ...' : ''}）。`, 'warn');
        }

        return { allComments, stats, completed, failedFloors };
    }

    async function exportUpComments(mid, upPages, skipPages, includeSub, limitPerVideo, options = {}) {
        const signal = options.signal || null;
        const cancelled = () => shouldCancel || !!(signal && signal.aborted);

        const videos = [];
        const seenBvid = new Set();   // 翻页期间 UP 发新稿会导致偏移重复，按 bvid 去重
        const orderSelect = document.querySelector('input[name="up-order"]:checked');
        const order = orderSelect ? orderSelect.value : 'pubdate';

        const startPage = skipPages + 1;
        const endPage = skipPages + upPages;
        let totalVideoCount = 0;

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            if (cancelled()) break;
            log(`正在抓取 UP主 投稿列表第 ${pageNum} 页...`, 'info');

            let data;
            try {
                data = await fetchUpVideosPage(mid, pageNum, order, signal);
            } catch (e) {
                if (isAbortError(e) || cancelled()) break;
                log(`请求投稿列表第 ${pageNum} 页失败：${e.message}`, 'error');
                break;
            }

            // 文档：data.is_risk / gaia_res_type 表示被风控，此时 vlist 为空，
            // 不能当成「没有更多稿件」而静默截断
            if (data.is_risk) {
                log('投稿列表触发风控 (is_risk)，已停止翻页，请稍后再试或降低请求频率。', 'error');
                break;
            }

            const vlist = (data.list && Array.isArray(data.list.vlist)) ? data.list.vlist : [];
            if (vlist.length === 0) {
                log('没有更多视频了。', 'info');
                break;
            }

            let added = 0;
            for (const video of vlist) {
                if (!video || !video.bvid || seenBvid.has(video.bvid)) continue;
                seenBvid.add(video.bvid);
                videos.push(video);
                added++;
            }
            log(`第 ${pageNum} 页解析到 ${added} 个新视频。`, 'info');

            if (data.page && data.page.count) totalVideoCount = data.page.count;
            if (totalVideoCount && videos.length >= totalVideoCount) {
                log('已抓取全部投稿视频。', 'success');
                break;
            }
        }

        log(`共成功获取到 ${videos.length} 个视频。准备启动批量导出评论...`, 'success');

        const allComments = [];
        const stats = createEmptyStats();
        const totalVideos = videos.length;

        for (let i = 0; i < totalVideos; i++) {
            if (cancelled()) break;
            const video = videos[i];
            log('========================================', 'info');
            log(`[视频 ${i + 1}/${totalVideos}] 正在导出: ${video.title} (BVID: ${video.bvid})`, 'info');
            setProgressTitle(`UP 主批量导出中 · 第 ${i + 1}/${totalVideos} 个视频`);

            try {
                const result = await exportVideoComments(
                    String(video.aid),
                    video.bvid,
                    3, // 投稿列表按热度排序抓评论
                    includeSub,
                    limitPerVideo,
                    { signal }
                );

                // 逐个 push：直接 push(...arr) 在评论数上万时会触发 V8 参数上限（RangeError）
                for (const cmt of result.allComments) allComments.push(cmt);
                mergeStats(stats, result.stats);

            } catch (e) {
                if (isAbortError(e) || cancelled()) break;
                log(`视频 ${video.bvid} 导出失败：${e.message}`, 'error');
            }
        }

        return { allComments, stats, completed: !cancelled() };
    }

    // ==========================================
    // 9. Dashboard Visualization
    // ==========================================
    function formatDuration(ms) {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        if (m > 0) return `${m}分${s}秒`;
        return `${s}秒`;
    }

    function sendDesktopNotification(title, body) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/logo.svg' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    new Notification(title, { body, icon: 'https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/assets/logo.svg' });
                }
            });
        }
    }

    function displayStats(comments, stats, filename, incomplete = false) {
        currentExportedComments = comments;
        currentFilename = filename;

        document.getElementById('bili-cmt-progress-panel').style.display = 'none';

        const dash = document.getElementById('bili-cmt-dashboard');
        dash.style.display = 'flex';

        const total = stats.main + stats.sub;
        document.getElementById('dash-total').innerText = total;
        document.getElementById('dash-main').innerText = stats.main;
        document.getElementById('dash-sub').innerText = stats.sub;

        const dashTitle = document.getElementById('dash-title');
        if (dashTitle) dashTitle.innerText = incomplete ? '导出已中断 · 数据统计' : '导出完成 · 数据统计';

        // Show export duration
        const durationRow = document.getElementById('dash-duration-row');
        if (durationRow && exportStartTime > 0) {
            const elapsed = Date.now() - exportStartTime;
            const prefix = incomplete ? '已中断，' : '';
            durationRow.innerHTML = `${prefix}耗时 <span>${formatDuration(elapsed)}</span> · 共 ${total} 条评论`;
            durationRow.style.display = 'block';
        }

        // Desktop notification
        sendDesktopNotification(
            'bilibili-comment-exporter',
            incomplete ? `导出已中断，已保存 ${total} 条评论。` : `导出完成！共 ${total} 条评论。`
        );

        // Render IP locations Top 5
        const ipContainer = document.getElementById('chart-ip');
        ipContainer.innerHTML = '';
        const sortedIps = Object.keys(stats.ip)
            .map(loc => ({ loc, count: stats.ip[loc] }))
            .sort((a, b) => b.count - a.count);

        const topIps = sortedIps.slice(0, 5);
        const maxCount = topIps.length > 0 ? topIps[0].count : 1;

        if (topIps.length === 0) {
            ipContainer.innerHTML = '<div class="chart-empty">暂无 IP 属地数据<br>（需登录 B 站后才会返回该字段）</div>';
        } else {
            topIps.forEach(item => {
                const pct = Math.round((item.count / total) * 100);
                const fillPct = Math.round((item.count / maxCount) * 100);

                const row = document.createElement('div');
                row.className = 'chart-bar-row';
                row.innerHTML = `
                    <div class="chart-bar-label" title="${item.loc}">${item.loc}</div>
                    <div class="chart-bar-bg">
                        <div class="chart-bar-fill" style="width: ${fillPct}%"></div>
                    </div>
                    <div class="chart-bar-val">${item.count}次 (${pct}%)</div>
                `;
                ipContainer.appendChild(row);
            });
        }

        // Render levels
        const levelContainer = document.getElementById('chart-level');
        levelContainer.innerHTML = '';
        const levels = [1, 2, 3, 4, 5, 6];
        const lvlTotal = levels.reduce((sum, l) => sum + (stats.level[l] || 0), 0);
        const maxLvlCount = Math.max(...levels.map(l => stats.level[l] || 0));

        const levelStatsContainer = document.createElement('div');
        levelStatsContainer.className = 'level-stats-container';

        levels.forEach(lvl => {
            const count = stats.level[lvl] || 0;
            const pct = lvlTotal > 0 ? Math.round((count / lvlTotal) * 100) : 0;
            const fillPct = maxLvlCount > 0 ? Math.round((count / maxLvlCount) * 100) : 0;

            const row = document.createElement('div');
            row.className = 'level-row';
            row.innerHTML = `
                <div class="level-label lv${lvl}">LV${lvl}</div>
                <div class="level-bar-bg">
                    <div class="level-bar-fill lv${lvl}" style="width: ${fillPct}%"></div>
                </div>
                <div class="level-val">${count} (${pct}%)</div>
            `;
            levelStatsContainer.appendChild(row);
        });
        levelContainer.appendChild(levelStatsContainer);

        // Render genders
        const sexContainer = document.getElementById('chart-sex');
        const m = stats.sex['男'] || 0;
        const f = stats.sex['女'] || 0;
        const s = stats.sex['保密'] || 0;

        const mPct = total > 0 ? Math.round((m / total) * 100) : 0;
        const fPct = total > 0 ? Math.round((f / total) * 100) : 0;
        const sPct = total > 0 ? Math.round((s / total) * 100) : 0;

        const genderIcon = (kind, svg) => `
                <div class="gender-item ${kind}">
                    <span class="g-icon">${svg}</span>
                    <span class="g-label">${kind === 'male' ? '男' : kind === 'female' ? '女' : '保密'}</span>
                    <span class="g-pct">${kind === 'male' ? mPct : kind === 'female' ? fPct : sPct}%</span>
                    <span class="g-count">${kind === 'male' ? m : kind === 'female' ? f : s}</span>
                </div>`;

        sexContainer.innerHTML = `
            <div class="gender-stats-container">
                ${genderIcon('male', '<svg class="g-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="19" y1="5" x2="13.6" y2="10.4"></line><polyline points="14 5 19 5 19 10"></polyline></svg>')}
                ${genderIcon('female', '<svg class="g-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"></circle><line x1="12" y1="14" x2="12" y2="21"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>')}
                ${genderIcon('secret', '<svg class="g-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>')}
            </div>
        `;
    }

    // ==========================================
    // 10. UI Generation & Control
    // ==========================================
    const SCRIPT_VERSION = '0.5.0';
    const ENTRY_BTN_ID = 'bili-cmt-entry';
    const SETTINGS_KEY = 'biliCmtExporter.settings.v1';

    const ENTRY_ICON_SVG = '<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M7.75 4.5H20.25A4.75 4.75 0 0 1 25 9.25V14.25A4.75 4.75 0 0 1 20.25 19H10.4L5.35 23.55C4.72 24.12 3.75 23.67 3.75 22.82V9.25A4.75 4.75 0 0 1 7.75 4.5ZM13.1 8.5h1.8v4.4l2.5-2.5 1.3 1.3-4.7 4.7-4.7-4.7 1.3-1.3 2.5 2.5V8.5Z"></path></svg>';
    const CLOSE_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
    const DOWNLOAD_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';

    const VIDEO_ENTRY_HOSTS = [
        '.video-toolbar-container-main .video-toolbar-left-main',
        '.video-toolbar-container .video-toolbar-left-main',
        '.video-toolbar-left-main',
        '.video-toolbar-left',
        '.video-toolbar'
    ];

    const SPACE_ENTRY_HOSTS = [
        { selector: '.interactions', variant: 'overlay' },
        { selector: '.h-action', variant: 'legacy' },
        { selector: '.upinfo-btn-panel', variant: 'legacy' }
    ];

    // ---------- Toast 通知 ----------
    function toast(message, type = 'info', duration = 3200) {
        const box = document.getElementById('bili-cmt-toast-container');
        if (!box) return;
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        const el = document.createElement('div');
        el.className = 'bili-cmt-toast ' + type;
        el.innerHTML = (icons[type] || icons.info) + '<span></span>';
        el.querySelector('span').textContent = message;
        box.appendChild(el);
        while (box.children.length > 4) {
            box.removeChild(box.firstChild);
        }
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 240);
        }, duration);
    }

    function flagInvalid(inputEl, message) {
        toast(message, 'error');
        if (inputEl) {
            inputEl.classList.remove('bili-cmt-shake');
            void inputEl.offsetWidth;
            inputEl.classList.add('bili-cmt-shake');
            setTimeout(() => inputEl.classList.remove('bili-cmt-shake'), 480);
            inputEl.focus();
        }
    }

    // ---------- 暗色模式同步 ----------
    function isPageDark() {
        return !!(
            (document.body && (document.body.classList.contains('dark') || document.body.classList.contains('bili-dark'))) ||
            document.documentElement.classList.contains('dark') ||
            document.documentElement.classList.contains('bili-dark') ||
            document.querySelector('.bili-dark')
        );
    }

    function syncDarkTheme() {
        const dark = isPageDark();
        const targets = [
            document.getElementById('bili-cmt-panel'),
            document.getElementById('bili-cmt-toast-container'),
            document.getElementById(ENTRY_BTN_ID)
        ];
        targets.forEach(el => {
            if (el) el.classList.toggle('bili-cmt-dark', dark);
        });
    }

    function watchThemeChanges() {
        const observer = new MutationObserver(() => {
            try { syncDarkTheme(); } catch (e) { /* 忽略 */ }
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        if (document.body) {
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    }

    // ---------- 设置持久化 ----------
    function loadSavedSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function setRadio(name, value) {
        const el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (el) el.checked = true;
    }

    function persistSettings() {
        const orderEl = document.querySelector('input[name="video-order"]:checked');
        const upOrderEl = document.querySelector('input[name="up-order"]:checked');
        const data = {
            videoOrder: orderEl ? orderEl.value : '3',
            includeSub: document.getElementById('video-subcomments').checked,
            videoDelay: document.getElementById('video-delay').value,
            upOrder: upOrderEl ? upOrderEl.value : 'pubdate',
            upPages: document.getElementById('up-pages').value,
            upSkip: document.getElementById('up-skip').value,
            upIncludeSub: document.getElementById('up-subcomments').checked,
            upDelay: document.getElementById('up-delay').value
        };
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
        } catch (e) { /* localStorage 不可用时静默降级 */ }
    }

    function restoreSettings() {
        const s = loadSavedSettings();
        if (s.videoOrder) setRadio('video-order', String(s.videoOrder));
        if (typeof s.includeSub === 'boolean') document.getElementById('video-subcomments').checked = s.includeSub;
        if (s.videoDelay) document.getElementById('video-delay').value = s.videoDelay;
        if (s.upOrder) setRadio('up-order', String(s.upOrder));
        if (s.upPages) document.getElementById('up-pages').value = s.upPages;
        if (s.upSkip !== undefined && s.upSkip !== null && s.upSkip !== '') document.getElementById('up-skip').value = s.upSkip;
        if (typeof s.upIncludeSub === 'boolean') document.getElementById('up-subcomments').checked = s.upIncludeSub;
        if (s.upDelay) document.getElementById('up-delay').value = s.upDelay;
    }

    // ---------- 面板视图切换 ----------
    function setView(view) {
        const body = document.getElementById('bili-cmt-body');
        const progress = document.getElementById('bili-cmt-progress-panel');
        const dashboard = document.getElementById('bili-cmt-dashboard');
        if (!body) return;
        body.classList.toggle('bili-cmt-mode-progress', view === 'progress');
        body.classList.toggle('bili-cmt-mode-dashboard', view === 'dashboard');
        if (progress) progress.style.display = view === 'progress' ? 'flex' : 'none';
        if (dashboard) dashboard.style.display = view === 'dashboard' ? 'flex' : 'none';
    }

    function startProgressUI(title) {
        setView('progress');
        const titleEl = document.getElementById('progress-title');
        if (titleEl) titleEl.innerText = title;
        const bar = document.getElementById('progress-bar-fill');
        if (bar) {
            bar.classList.remove('indeterminate');
            bar.style.width = '0%';
        }
        const pct = document.getElementById('progress-percent');
        if (pct) pct.innerText = '0%';
        const speedEl = document.getElementById('progress-speed');
        if (speedEl) speedEl.innerText = '已抓取 0 条';
        const mainEl = document.getElementById('stats-main');
        const subEl = document.getElementById('stats-sub');
        if (mainEl) mainEl.innerText = '0';
        if (subEl) subEl.innerText = '0';
        const logBox = document.getElementById('console-log');
        if (logBox) logBox.innerHTML = '';
        logBuffer = [];
        lastProgressUpdate = 0;
        log('准备就绪，开始导出...', 'info');
    }

    function togglePanel(open) {
        const panel = document.getElementById('bili-cmt-panel');
        if (!panel) return;
        const willOpen = typeof open === 'boolean' ? open : !panel.classList.contains('bili-cmt-open');
        if (willOpen) {
            syncDarkTheme();
            restoreSettings();
            handleUrlChange();
            if (isExporting) setView('progress');
        }
        panel.classList.toggle('bili-cmt-open', willOpen);
    }

    function switchTab(tabName) {
        const tabs = document.querySelectorAll('.bili-cmt-tab');
        const contents = document.querySelectorAll('.bili-cmt-tab-content');
        tabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
        });
        contents.forEach(c => {
            c.classList.toggle('active', c.getAttribute('id') === 'tab-' + tabName);
        });
    }

    // ---------- 入口按钮注入 ----------
    function buildVideoEntry() {
        const wrap = document.createElement('div');
        wrap.className = 'toolbar-left-item-wrap';
        wrap.setAttribute('data-bce', 'wrap');
        const btn = document.createElement('div');
        btn.id = ENTRY_BTN_ID;
        btn.className = 'bili-cmt-entry';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', '导出当前视频评论区');
        btn.title = '导出当前视频评论区';
        btn.innerHTML = ENTRY_ICON_SVG + '<span>导出评论</span>';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePanel(true);
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePanel(true);
            }
        });
        wrap.appendChild(btn);
        return wrap;
    }

    function buildSpaceEntry(variant) {
        const btn = document.createElement('div');
        btn.id = ENTRY_BTN_ID;
        btn.className = 'bili-cmt-entry-space' + (variant === 'legacy' ? ' bili-cmt-entry-space-legacy' : '');
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.setAttribute('aria-label', '批量导出该 UP 主视频评论区');
        btn.title = '批量导出该 UP 主视频评论区';
        btn.innerHTML = ENTRY_ICON_SVG + '<span>导出评论</span>';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePanel(true);
        });
        return btn;
    }

    let pageLoadStamp = -1;
    if (document.readyState === 'complete') {
        pageLoadStamp = 0;
    } else {
        window.addEventListener('load', () => { pageLoadStamp = Date.now(); }, { once: true });
    }

    function entryInjectAllowed() {
        // 必须等页面 load 完成后再向 B 站组件容器插入节点：
        // 若在 Vue hydration 窗口期内注入，会打断其前端水合，导致顶栏、评论区等组件渲染异常。
        if (pageLoadStamp === 0) return true;
        if (pageLoadStamp > 0) return Date.now() - pageLoadStamp >= 1200;
        return performance.now() >= 8000;
    }

    function tryInjectEntry() {
        if (document.getElementById(ENTRY_BTN_ID)) return true;
        if (!entryInjectAllowed()) return false;
        const path = window.location.pathname;

        if (/^\/video\//.test(path)) {
            for (const sel of VIDEO_ENTRY_HOSTS) {
                const host = document.querySelector(sel);
                if (!host) continue;
                host.appendChild(buildVideoEntry());
                syncDarkTheme();
                return true;
            }
        }

        if (/space\.bilibili\.com$/.test(window.location.hostname)) {
            for (const item of SPACE_ENTRY_HOSTS) {
                const host = document.querySelector(item.selector);
                if (!host) continue;
                host.appendChild(buildSpaceEntry(item.variant));
                syncDarkTheme();
                return true;
            }
        }
        return false;
    }

    function watchEntryInjection() {
        let timer = null;
        const schedule = () => {
            if (timer) return;
            timer = setTimeout(() => {
                timer = null;
                try {
                    // 注入成功后 tryInjectEntry 内部已同步主题，这里不再重复查询 DOM
                    if (!document.getElementById(ENTRY_BTN_ID)) tryInjectEntry();
                } catch (e) { /* 忽略 */ }
            }, 400);
        };
        if (document.body) {
            new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
        }
    }

    // ---------- 面板构建 ----------
    function buildToastContainer() {
        if (document.getElementById('bili-cmt-toast-container')) return;
        const box = document.createElement('div');
        box.id = 'bili-cmt-toast-container';
        box.className = 'bili-cmt-toast-container';
        document.body.appendChild(box);
    }

    function buildPanel() {
        if (document.getElementById('bili-cmt-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bili-cmt-panel';
        panel.className = 'bili-cmt-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'B站评论区导出工具');
        panel.innerHTML = `
            <div class="bili-cmt-header">
                <div class="bili-cmt-title-area">
                    <h3>评论区导出</h3>
                    <span class="bili-cmt-subtitle">v${SCRIPT_VERSION} · 评论数据导出</span>
                </div>
                <button id="bili-cmt-close-btn" class="bili-cmt-icon-btn" aria-label="关闭面板">
                    ${CLOSE_ICON_SVG}
                </button>
            </div>
            <div class="bili-cmt-body" id="bili-cmt-body">
                <div class="bili-cmt-tabs">
                    <div class="bili-cmt-tab active" data-tab="video">视频导出</div>
                    <div class="bili-cmt-tab" data-tab="up">UP主批量</div>
                </div>

                <div class="bili-cmt-tab-content active" id="tab-video">
                    <div class="bili-cmt-form-group">
                        <label>视频 BV 号 / 链接</label>
                        <input type="text" id="video-bvid" placeholder="例如: BV1VJ4m1jk34K 或粘贴视频链接" />
                    </div>
                    <div class="bili-cmt-form-group">
                        <label>排序方式</label>
                        <div class="bili-cmt-segmented">
                            <label class="bili-cmt-segment-item">
                                <input type="radio" name="video-order" value="3" checked />
                                <span>热度优先</span>
                            </label>
                            <label class="bili-cmt-segment-item">
                                <input type="radio" name="video-order" value="2" />
                                <span>时间优先</span>
                            </label>
                        </div>
                    </div>
                    <div class="bili-cmt-form-group">
                        <label class="bili-cmt-checkbox-label">
                            <input type="checkbox" id="video-subcomments" checked />
                            <span>包含楼中楼子评论</span>
                        </label>
                    </div>
                    <div class="bili-cmt-form-row">
                        <div class="bili-cmt-form-group half">
                            <label>主评论限制数量</label>
                            <input type="number" id="video-limit" placeholder="不限" min="1" />
                        </div>
                        <div class="bili-cmt-form-group half">
                            <label>请求间隔 (毫秒)</label>
                            <input type="number" id="video-delay" value="500" min="100" />
                        </div>
                    </div>
                    <button id="video-start-btn" class="bili-cmt-btn primary">${DOWNLOAD_ICON_SVG}<span>开始导出</span></button>
                </div>

                <div class="bili-cmt-tab-content" id="tab-up">
                    <div class="bili-cmt-form-group">
                        <label>UP主 Mid / 主页链接</label>
                        <input type="text" id="up-mid" placeholder="例如: 123344555 或主页链接" />
                    </div>
                    <div class="bili-cmt-form-group">
                        <label>视频排序方式</label>
                        <div class="bili-cmt-segmented">
                            <label class="bili-cmt-segment-item">
                                <input type="radio" name="up-order" value="pubdate" checked />
                                <span>最新投稿</span>
                            </label>
                            <label class="bili-cmt-segment-item">
                                <input type="radio" name="up-order" value="click" />
                                <span>最多播放</span>
                            </label>
                            <label class="bili-cmt-segment-item">
                                <input type="radio" name="up-order" value="stow" />
                                <span>最多收藏</span>
                            </label>
                        </div>
                    </div>
                    <div class="bili-cmt-form-row">
                        <div class="bili-cmt-form-group half">
                            <label>爬取视频页数 (30条/页)</label>
                            <input type="number" id="up-pages" value="3" min="1" />
                        </div>
                        <div class="bili-cmt-form-group half">
                            <label>跳过前几页</label>
                            <input type="number" id="up-skip" value="0" min="0" />
                        </div>
                    </div>
                    <div class="bili-cmt-form-group">
                        <label class="bili-cmt-checkbox-label">
                            <input type="checkbox" id="up-subcomments" checked />
                            <span>包含楼中楼子评论</span>
                        </label>
                    </div>
                    <div class="bili-cmt-form-row">
                        <div class="bili-cmt-form-group half">
                            <label>单视频主评论限制</label>
                            <input type="number" id="up-video-limit" placeholder="不限" min="1" />
                        </div>
                        <div class="bili-cmt-form-group half">
                            <label>请求间隔 (毫秒)</label>
                            <input type="number" id="up-delay" value="500" min="100" />
                        </div>
                    </div>
                    <button id="up-start-btn" class="bili-cmt-btn primary">${DOWNLOAD_ICON_SVG}<span>开始批量导出</span></button>
                </div>

                <div id="bili-cmt-progress-panel" class="bili-cmt-progress-panel">
                    <div class="bili-cmt-progress-header">
                        <h4 id="progress-title">正在准备导出...</h4>
                        <span id="progress-percent">0%</span>
                    </div>
                    <div class="bili-cmt-progress-bar-container">
                        <div id="progress-bar-fill" class="bili-cmt-progress-bar-fill" style="width: 0%;"></div>
                    </div>
                    <div class="bili-cmt-stats-summary">
                        <div>主评论: <span id="stats-main" class="bili-cmt-badge">0</span></div>
                        <div>子评论: <span id="stats-sub" class="bili-cmt-badge">0</span></div>
                        <div id="progress-speed">进度: 0 / 0</div>
                    </div>
                    <div id="console-log" class="bili-cmt-console">
                        <div class="log-line info">等待开始导出…</div>
                    </div>
                    <button id="progress-cancel-btn" class="bili-cmt-btn danger">取消导出</button>
                </div>

                <div id="bili-cmt-dashboard" class="bili-cmt-dashboard">
                    <div class="dashboard-header">
                        <h4 id="dash-title">导出完成 · 数据统计</h4>
                        <button id="dashboard-back-btn" class="bili-cmt-btn-text">返回设置</button>
                    </div>
                    <div id="dash-duration-row" class="dash-duration" style="display:none;"></div>
                    <div class="dashboard-summary-cards">
                        <div class="summary-card">
                            <span class="card-num" id="dash-total">0</span>
                            <span class="card-label">总评论数</span>
                        </div>
                        <div class="summary-card">
                            <span class="card-num" id="dash-main">0</span>
                            <span class="card-label">主评论</span>
                        </div>
                        <div class="summary-card">
                            <span class="card-num" id="dash-sub">0</span>
                            <span class="card-label">楼中楼</span>
                        </div>
                    </div>
                    <div class="dashboard-charts">
                        <div class="chart-section">
                            <h5>IP 属地分布 (Top 5)</h5>
                            <div id="chart-ip" class="chart-container"></div>
                        </div>
                        <div class="chart-section-row">
                            <div class="chart-section half">
                                <h5>用户等级分布</h5>
                                <div id="chart-level" class="chart-container"></div>
                            </div>
                            <div class="chart-section half">
                                <h5>性别比例</h5>
                                <div id="chart-sex" class="chart-container"></div>
                            </div>
                        </div>
                    </div>
                    <div class="dashboard-footer">
                        <button id="dashboard-download-btn" class="bili-cmt-btn primary" style="width: 100%;">
                            ${DOWNLOAD_ICON_SVG}<span>重新下载 CSV 文件</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // ---------- 事件绑定 ----------
        document.getElementById('bili-cmt-close-btn').addEventListener('click', () => togglePanel(false));

        document.querySelectorAll('.bili-cmt-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (isExporting) return;
                switchTab(tab.getAttribute('data-tab'));
            });
        });

        document.getElementById('progress-cancel-btn').addEventListener('click', () => {
            shouldCancel = true;
            // 同时中断在途请求：否则最长要等一个 15s 超时的请求才能停下
            if (exportController) exportController.abort();
            log('正在取消导出，已中断在途请求...', 'warn');
        });

        /**
         * 统一收尾：无论正常结束还是用户中断，都把已抓取的数据落盘，避免几十分钟的抓取白费。
         */
        function finishExport(result, filename, interruptedLabel, doneLabel) {
            const total = result.allComments.length;
            const incomplete = !result.completed;

            if (incomplete) {
                log(`${interruptedLabel}：已抓取 ${total} 条，将保存已抓取的部分数据。`, 'warn');
            }
            if (total === 0) {
                toast(incomplete ? '导出已中断，且未抓取到任何数据' : '没有抓取到任何评论数据', 'error', 5000);
                return;
            }

            const finalName = incomplete ? filename.replace(/\.csv$/i, '_中断.csv') : filename;
            log('正在保存 CSV 文件...', 'success');
            downloadCSV(result.allComments, finalName);
            displayStats(result.allComments, result.stats, finalName, incomplete);

            if (incomplete) {
                toast(`已中断，已保存 ${total} 条评论（数据可能不完整）`, 'info', 5000);
            } else {
                toast(`${doneLabel}，共 ${total} 条评论，已开始下载 CSV`, 'success', 4200);
            }
        }

        document.getElementById('dashboard-back-btn').addEventListener('click', () => setView('form'));

        document.getElementById('dashboard-download-btn').addEventListener('click', () => {
            if (!currentExportedComments.length) {
                toast('没有可重新下载的数据', 'error');
                return;
            }
            downloadCSV(currentExportedComments, currentFilename);
            toast('已开始下载 CSV 文件', 'success');
        });

        const bvidInput = document.getElementById('video-bvid');
        const midInput = document.getElementById('up-mid');
        bvidInput.addEventListener('input', () => { bvidTouched = true; });
        midInput.addEventListener('input', () => { midTouched = true; });
        bvidInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('video-start-btn').click();
        });

        // ---------- 视频导出 ----------
        document.getElementById('video-start-btn').addEventListener('click', async () => {
            if (isExporting) return;
            const parsed = parseOidInput(bvidInput.value);
            if (!parsed) {
                flagInvalid(bvidInput, '请输入合法的 BV 号或视频链接');
                return;
            }
            // 文档：mode 2 = 仅按时间，3 = 仅按热度
            const mode = parseInt(document.querySelector('input[name="video-order"]:checked').value, 10) === 2 ? 2 : 3;
            const includeSub = document.getElementById('video-subcomments').checked;
            const limit = clampInt(document.getElementById('video-limit').value, 0, 100000, 0);
            const delayVal = clampInt(document.getElementById('video-delay').value, 100, 10000, 500);

            persistSettings();
            isExporting = true;
            shouldCancel = false;
            exportController = new AbortController();
            exportStartTime = Date.now();
            // 请求间隔改由全局令牌桶统一调度（并发抓取时也只有它能约束整体 QPS）
            rateLimiter.setInterval(delayVal);
            startProgressUI('视频评论导出中...');

            try {
                const result = await exportVideoComments(
                    parsed.oid,
                    parsed.bvid,
                    mode,
                    includeSub,
                    limit,
                    { signal: exportController.signal }
                );
                const title = getVideoTitle();
                const filename = sanitizeFilename(`${title}_${parsed.bvid}_评论.csv`);
                finishExport(result, filename, '导出已中断', '导出完成');
            } catch (err) {
                if (isAbortError(err)) {
                    log('导出已取消。', 'warn');
                    toast('导出已取消', 'info');
                } else {
                    log(`导出失败：${err.message}`, 'error');
                    toast(`导出失败：${err.message}`, 'error', 5000);
                }
            } finally {
                isExporting = false;
                exportController = null;
                rateLimiter.setInterval(0);
            }
        });

        // ---------- UP 主批量导出 ----------
        document.getElementById('up-start-btn').addEventListener('click', async () => {
            if (isExporting) return;
            const parsedMid = parseMidInput(midInput.value);
            if (!parsedMid) {
                flagInvalid(midInput, '请输入合法的 UP 主 Mid 或主页链接');
                return;
            }
            const pages = clampInt(document.getElementById('up-pages').value, 1, 50, 3);
            const skip = clampInt(document.getElementById('up-skip').value, 0, 10000, 0);
            const includeSub = document.getElementById('up-subcomments').checked;
            const limit = clampInt(document.getElementById('up-video-limit').value, 0, 100000, 0);
            const delayVal = clampInt(document.getElementById('up-delay').value, 100, 10000, 500);

            persistSettings();
            isExporting = true;
            shouldCancel = false;
            exportController = new AbortController();
            exportStartTime = Date.now();
            rateLimiter.setInterval(delayVal);
            startProgressUI('UP 主视频批量导出中...');

            try {
                const result = await exportUpComments(
                    parsedMid,
                    pages,
                    skip,
                    includeSub,
                    limit,
                    { signal: exportController.signal }
                );
                const upName = getUpName();
                const filename = sanitizeFilename(`UP主_${upName || parsedMid}_视频评论.csv`);
                finishExport(result, filename, '批量导出已中断', '批量导出完成');
            } catch (err) {
                if (isAbortError(err)) {
                    log('批量导出已取消。', 'warn');
                    toast('批量导出已取消', 'info');
                } else {
                    log(`批量导出失败：${err.message}`, 'error');
                    toast(`批量导出失败：${err.message}`, 'error', 5000);
                }
            } finally {
                isExporting = false;
                exportController = null;
                rateLimiter.setInterval(0);
            }
        });

        // ---------- 面板拖拽 ----------
        const header = panel.querySelector('.bili-cmt-header');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.bili-cmt-icon-btn')) return;
            isDragging = true;
            panel.classList.add('bili-cmt-dragging');
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newLeft = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffsetX));
            const newTop = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffsetY));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            panel.classList.remove('bili-cmt-dragging');
        });
    }

    // ---------- URL 上下文感知 ----------
    let lastDetectedBvid = '';
    let lastDetectedMid = '';
    let bvidTouched = false;
    let midTouched = false;

    function handleUrlChange() {
        const ctx = getPageContext();
        const bvidInput = document.getElementById('video-bvid');
        const midInput = document.getElementById('up-mid');

        if (ctx.bvid && ctx.bvid !== lastDetectedBvid) {
            lastDetectedBvid = ctx.bvid;
            if (bvidInput && (!bvidTouched || !bvidInput.value.trim())) {
                bvidInput.value = ctx.bvid;
                bvidTouched = false;
                switchTab('video');
            }
        }

        if (ctx.mid && ctx.mid !== lastDetectedMid) {
            lastDetectedMid = ctx.mid;
            if (midInput && (!midTouched || !midInput.value.trim())) {
                midInput.value = ctx.mid;
                midTouched = false;
                switchTab('up');
            }
        }

        // SPA 路由变化后工具栏可能被重建，尝试重新注入入口
        if (!document.getElementById(ENTRY_BTN_ID)) tryInjectEntry();
    }

    // ==========================================
    // 11. Initializer & URL Watcher
    // ==========================================
    function init() {
        if (document.getElementById('bili-cmt-panel')) return;

        const style = document.createElement('style');
        style.id = 'bili-cmt-styles';
        style.textContent = CSS_STYLES;
        document.head.appendChild(style);

        buildToastContainer();
        buildPanel();
        watchThemeChanges();
        watchEntryInjection();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const panel = document.getElementById('bili-cmt-panel');
                if (panel && panel.classList.contains('bili-cmt-open')) {
                    togglePanel(false);
                }
            }
        });

        // 页面加载初期定时重试注入（工具栏异步渲染），30 秒后放弃
        let retries = 0;
        const retryTimer = setInterval(() => {
            retries += 1;
            if (tryInjectEntry() || retries >= 60) clearInterval(retryTimer);
        }, 500);

        handleUrlChange();
    }

    function watchUrlChanges() {
        const notify = () => {
            try {
                handleUrlChange();
            } catch (e) { /* 不得让脚本异常传播进宿主页面的路由调用 */ }
        };
        const origPushState = history.pushState;
        const origReplaceState = history.replaceState;
        history.pushState = function(...args) {
            origPushState.apply(this, args);
            notify();
        };
        history.replaceState = function(...args) {
            origReplaceState.apply(this, args);
            notify();
        };
        window.addEventListener('popstate', notify);
    }

    init();
    watchUrlChanges();

})();
