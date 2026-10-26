// ==UserScript==
// @name         bilibili-comment-exporter
// @namespace    https://github.com/Noctyn/bilibili-comment-exporter
// @homepageURL  https://github.com/Noctyn/bilibili-comment-exporter
// @supportURL   https://github.com/Noctyn/bilibili-comment-exporter/issues
// @updateURL    https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js
// @downloadURL  https://raw.githubusercontent.com/Noctyn/bilibili-comment-exporter/main/bilibili_comment_exporter.user.js
// @version      0.2.0
// @description  一款基于 Bilibili API 的视频评论区导出工具，支持导出主评论和子评论（楼中楼）为 CSV 文件，带有 UTF-8 BOM 解决乱码，并有漂亮的玻璃质感 UI 和实时的 IP 属地、等级及性别数据统计图表。
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
    // 3.5 Network Utilities (Timeout + Retry)
    // ==========================================
    const FETCH_TIMEOUT_MS = 15000; // 15 seconds
    const MAX_RETRIES = 3;

    function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
            .then(response => { clearTimeout(timer); return response; })
            .catch(err => {
                clearTimeout(timer);
                if (err.name === 'AbortError') {
                    throw new Error(`请求超时 (${timeoutMs / 1000}s)`);
                }
                throw err;
            });
    }

    async function retryFetch(fetchFn, retries = MAX_RETRIES) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fetchFn();
            } catch (err) {
                lastError = err;
                if (attempt < retries) {
                    const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                    await new Promise(r => setTimeout(r, backoffMs));
                }
            }
        }
        throw lastError;
    }

    // ==========================================
    // 3.6 Wbi Key Cache (5-min TTL)
    // ==========================================
    let cachedWbiKeys = null;
    let wbiKeysCachedAt = 0;
    const WBI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    async function getCachedWbiKeys() {
        const now = Date.now();
        if (cachedWbiKeys && (now - wbiKeysCachedAt) < WBI_CACHE_TTL_MS) {
            return cachedWbiKeys;
        }
        const keys = await getWbiKeys();
        cachedWbiKeys = keys;
        wbiKeysCachedAt = now;
        return keys;
    }

    // ==========================================
    // 4. API Client Integration
    // ==========================================
    async function getWbiKeys() {
        return retryFetch(async () => {
            const response = await fetchWithTimeout('https://api.bilibili.com/x/web-interface/nav', { credentials: 'include' });
            const json = await response.json();
            if (json.code !== 0) {
                throw new Error(`获取 Wbi Key 失败: ${json.message}`);
            }
            const imgUrl = json.data.wbi_img.img_url;
            const subUrl = json.data.wbi_img.sub_url;
            const imgKey = imgUrl.split('/').pop().split('.')[0];
            const subKey = subUrl.split('/').pop().split('.')[0];
            return { imgKey, subKey };
        });
    }

    async function fetchCommentsPage(oid, mode, paginationStr, imgKey, subKey) {
        return retryFetch(async () => {
            const baseUrl = 'https://api.bilibili.com/x/v2/reply/wbi/main';
            let paginationStrParam = '{"offset":""}';
            if (paginationStr) {
                paginationStrParam = JSON.stringify({ offset: paginationStr });
            }
            const params = {
                oid: oid,
                type: 1,
                mode: mode, // 2 = time, 3 = hot
                pagination_str: paginationStrParam,
                plat: 1,
                seek_rpid: '',
                web_location: '1315875'
            };
            const signedUrl = signWbiUrl(baseUrl, params, imgKey, subKey);
            const response = await fetchWithTimeout(signedUrl, { credentials: 'include' });
            return await response.json();
        });
    }

    async function fetchSubCommentsPage(oid, rootRpid, pageNum) {
        return retryFetch(async () => {
            const params = new URLSearchParams({
                oid: oid,
                type: '1',
                root: rootRpid.toString(),
                ps: '20',
                pn: pageNum.toString(),
                web_location: '333.788'
            });
            const url = `https://api.bilibili.com/x/v2/reply/reply?${params.toString()}`;
            const response = await fetchWithTimeout(url, { credentials: 'include' });
            return await response.json();
        });
    }

    async function fetchUpVideosPage(mid, pageNum, order, imgKey, subKey) {
        return retryFetch(async () => {
            const baseUrl = 'https://api.bilibili.com/x/space/wbi/arc/search';
            const params = {
                mid: mid,
                order: order, // 'pubdate', 'click', 'stow'
                platform: 'web',
                pn: pageNum,
                ps: '30',
                tid: '0'
            };
            const signedUrl = signWbiUrl(baseUrl, params, imgKey, subKey);
            const response = await fetchWithTimeout(signedUrl, { credentials: 'include' });
            return await response.json();
        });
    }

    // ==========================================
    // 5. CSS Styling (Injected)
    // ==========================================
    const CSS_STYLES = `
        :root {
            --bili-pink: #fb7299;
            --bili-pink-hover: #ff6699;
            --bili-blue: #00aeec;
            --bili-blue-hover: #33bdf0;
            --text-main: #18191c;
            --text-sub: #9499a0;
            --border-color: rgba(251, 114, 153, 0.2);
            --glass-bg: rgba(255, 255, 255, 0.88);
            --glass-border: rgba(255, 255, 255, 0.45);
            --glass-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
        }

        .bili-cmt-float-btn {
            position: fixed;
            right: 25px;
            bottom: 110px;
            z-index: 99999;
            background: linear-gradient(135deg, var(--bili-pink), #ff9eb6);
            color: white;
            border-radius: 50px;
            padding: 10px 18px;
            box-shadow: 0 6px 20px rgba(251, 114, 153, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            user-select: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .bili-cmt-float-btn:hover {
            transform: translateY(-3px) scale(1.03);
            box-shadow: 0 8px 25px rgba(251, 114, 153, 0.5);
            background: linear-gradient(135deg, var(--bili-pink-hover), #ffb3c5);
        }

        .bili-cmt-float-btn:active {
            transform: translateY(1px) scale(0.98);
        }

        .bili-cmt-panel {
            position: fixed;
            right: 25px;
            bottom: 170px;
            width: 440px;
            z-index: 99998;
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            box-shadow: var(--glass-shadow);
            border-radius: 20px;
            padding: 22px;
            font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
            color: var(--text-main);
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: all 0.3s ease;
            max-height: 80vh;
            overflow-y: auto;
            box-sizing: border-box;
            text-align: left;
        }

        .bili-cmt-panel::-webkit-scrollbar {
            width: 6px;
        }
        .bili-cmt-panel::-webkit-scrollbar-track {
            background: transparent;
        }
        .bili-cmt-panel::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.15);
            border-radius: 10px;
        }
        .bili-cmt-panel::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.25);
        }

        .bili-cmt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            padding-bottom: 10px;
        }

        .bili-cmt-title-area h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
            color: var(--bili-pink);
            background: linear-gradient(90deg, var(--bili-pink), #e03e7a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .bili-cmt-subtitle {
            font-size: 10px;
            color: var(--text-sub);
            display: block;
            margin-top: 2px;
        }

        .bili-cmt-close-btn {
            background: transparent;
            border: none;
            font-size: 24px;
            color: var(--text-sub);
            cursor: pointer;
            transition: all 0.2s;
            line-height: 18px;
            height: 24px;
            width: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        .bili-cmt-close-btn:hover {
            color: var(--bili-pink);
            background: rgba(251, 114, 153, 0.1);
        }

        .bili-cmt-tabs {
            display: flex;
            background: rgba(0, 0, 0, 0.04);
            border-radius: 10px;
            padding: 3px;
            gap: 4px;
        }

        .bili-cmt-tab {
            flex: 1;
            text-align: center;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 8px;
            color: var(--text-sub);
            transition: all 0.2s;
            user-select: none;
        }

        .bili-cmt-tab.active {
            background: white;
            color: var(--bili-pink);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .bili-cmt-tab-content {
            display: none;
            flex-direction: column;
            gap: 14px;
        }

        .bili-cmt-tab-content.active {
            display: flex;
        }

        .bili-cmt-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .bili-cmt-form-group label {
            font-size: 12px;
            font-weight: 600;
            color: #61666d;
        }

        .bili-cmt-form-group input[type="text"],
        .bili-cmt-form-group input[type="number"] {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 13px;
            outline: none;
            transition: all 0.2s;
            color: var(--text-main);
        }

        .bili-cmt-form-group input[type="text"]:focus,
        .bili-cmt-form-group input[type="number"]:focus {
            border-color: var(--bili-pink);
            background: white;
            box-shadow: 0 0 0 3px rgba(251, 114, 153, 0.15);
        }

        .bili-cmt-form-row {
            display: flex;
            gap: 12px;
        }

        .bili-cmt-form-group.half {
            flex: 1;
            width: 50%;
        }

        .bili-cmt-segmented {
            display: flex;
            background: rgba(0, 0, 0, 0.04);
            border-radius: 8px;
            padding: 3px;
            gap: 4px;
        }

        .bili-cmt-segment-item {
            flex: 1;
            position: relative;
            cursor: pointer;
            text-align: center;
        }

        .bili-cmt-segment-item input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }

        .bili-cmt-segment-item span {
            display: block;
            padding: 7px 10px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-sub);
            border-radius: 6px;
            transition: all 0.2s;
            user-select: none;
        }

        .bili-cmt-segment-item input:checked + span {
            background: white;
            color: var(--bili-pink);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }

        .bili-cmt-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
            color: #61666d;
            cursor: pointer;
            user-select: none;
        }

        .bili-cmt-checkbox-label input {
            accent-color: var(--bili-pink);
            width: 15px;
            height: 15px;
        }

        .bili-cmt-btn {
            border: none;
            border-radius: 10px;
            padding: 11px 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            outline: none;
        }

        .bili-cmt-btn.primary {
            background: linear-gradient(135deg, var(--bili-pink), #ff84a1);
            color: white;
            box-shadow: 0 4px 12px rgba(251, 114, 153, 0.3);
        }

        .bili-cmt-btn.primary:hover {
            background: linear-gradient(135deg, var(--bili-pink-hover), #ff9eb6);
            box-shadow: 0 6px 16px rgba(251, 114, 153, 0.4);
            transform: translateY(-1px);
        }

        .bili-cmt-btn.primary:active {
            transform: translateY(1px);
        }

        .bili-cmt-btn.danger {
            background: #ff4d4f;
            color: white;
        }
        .bili-cmt-btn.danger:hover {
            background: #ff7875;
        }

        .bili-cmt-btn-text {
            background: transparent;
            border: none;
            color: var(--bili-blue);
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
        }
        .bili-cmt-btn-text:hover {
            color: var(--bili-blue-hover);
        }

        /* Progress Panel Styles */
        .bili-cmt-progress-panel {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 22px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 14px;
            box-sizing: border-box;
        }

        .bili-cmt-progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .bili-cmt-progress-header h4 {
            margin: 0;
            font-size: 15px;
            color: var(--bili-pink);
            font-weight: 700;
        }

        #progress-speed {
            font-size: 11px;
            color: var(--text-sub);
            font-weight: 600;
        }

        .bili-cmt-progress-bar-container {
            background: rgba(0, 0, 0, 0.06);
            height: 8px;
            border-radius: 10px;
            overflow: hidden;
        }

        .bili-cmt-progress-bar-fill {
            background: linear-gradient(90deg, var(--bili-pink), var(--bili-blue));
            height: 100%;
            border-radius: 10px;
            width: 0%;
            transition: width 0.2s ease;
        }

        .bili-cmt-stats-summary {
            display: flex;
            gap: 20px;
            font-size: 12px;
            font-weight: 600;
            color: #61666d;
        }

        .bili-cmt-badge {
            background: rgba(251, 114, 153, 0.1);
            color: var(--bili-pink);
            padding: 2px 8px;
            border-radius: 20px;
            font-weight: 700;
        }

        .bili-cmt-console {
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-radius: 10px;
            padding: 12px;
            font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
            font-size: 11px;
            flex-grow: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
            text-align: left;
            max-height: 220px;
        }

        .log-line {
            word-break: break-all;
            line-height: 1.4;
        }
        .log-line.info { color: #61666d; }
        .log-line.success { color: #2ecc71; font-weight: 600; }
        .log-line.error { color: #e74c3c; font-weight: 600; }
        .log-line.warn { color: #f39c12; }

        /* Dashboard Styles */
        .bili-cmt-dashboard {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            padding-bottom: 8px;
        }

        .dashboard-header h4 {
            margin: 0;
            font-size: 15px;
            color: var(--bili-pink);
            font-weight: 700;
        }

        .dashboard-summary-cards {
            display: flex;
            gap: 10px;
        }

        .summary-card {
            flex: 1;
            background: rgba(255, 255, 255, 0.65);
            border: 1px solid rgba(251, 114, 153, 0.15);
            border-radius: 12px;
            padding: 12px 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }

        .card-num {
            font-size: 16px;
            font-weight: 800;
            color: var(--bili-pink);
        }

        .card-label {
            font-size: 9px;
            color: var(--text-sub);
            font-weight: 600;
            text-align: center;
        }

        .dashboard-charts {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .chart-section {
            background: rgba(255, 255, 255, 0.55);
            border: 1px solid rgba(0, 0, 0, 0.05);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chart-section h5 {
            margin: 0;
            font-size: 11px;
            font-weight: 700;
            color: #61666d;
            text-align: left;
        }

        .chart-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .chart-bar-row {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 11px;
        }

        .chart-bar-label {
            width: 55px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            text-align: left;
            font-weight: 600;
        }

        .chart-bar-bg {
            flex-grow: 1;
            background: rgba(0, 0, 0, 0.04);
            height: 12px;
            border-radius: 6px;
            overflow: hidden;
            position: relative;
        }

        .chart-bar-fill {
            background: linear-gradient(90deg, var(--bili-pink), #ff9eb6);
            height: 100%;
            border-radius: 6px;
            width: 0%;
            transition: width 0.5s ease-out;
        }

        .chart-bar-val {
            width: 80px;
            text-align: right;
            font-weight: 700;
            color: #61666d;
        }

        .chart-section-row {
            display: flex;
            gap: 10px;
        }

        .chart-section-row .chart-section.half {
            flex: 1;
            width: 50%;
        }

        .level-stats-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
            width: 100%;
        }

        .level-row {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
        }

        .level-label {
            width: 32px;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 4px;
            border-radius: 4px;
            text-align: center;
            color: #fff;
        }
        .level-label.lv1 { background: #95ddb2; }
        .level-label.lv2 { background: #92d1e5; }
        .level-label.lv3 { background: #ffb37c; }
        .level-label.lv4 { background: #ff8e29; }
        .level-label.lv5 { background: #ee6363; }
        .level-label.lv6 { background: #ff0000; }

        .level-bar-bg {
            flex-grow: 1;
            background: rgba(0, 0, 0, 0.04);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
        }

        .level-bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease-out;
        }
        .level-bar-fill.lv1 { background: #95ddb2; }
        .level-bar-fill.lv2 { background: #92d1e5; }
        .level-bar-fill.lv3 { background: #ffb37c; }
        .level-bar-fill.lv4 { background: #ff8e29; }
        .level-bar-fill.lv5 { background: #ee6363; }
        .level-bar-fill.lv6 { background: #ff0000; }

        .level-val {
            width: 58px;
            text-align: right;
            font-weight: 700;
            color: #61666d;
            white-space: nowrap;
        }

        .gender-stats-container {
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 100%;
            padding: 8px 0;
            width: 100%;
        }

        .gender-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 600;
        }

        .gender-item.male { color: var(--bili-blue); }
        .gender-item.female { color: var(--bili-pink); }
        .gender-item.secret { color: var(--text-sub); }

        .gender-item .g-svg {
            stroke: currentColor;
            display: block;
        }

        .gender-item .g-label {
            font-size: 11px;
            font-weight: 700;
        }

        .gender-item .g-pct {
            font-size: 13px;
            font-weight: 800;
        }

        .gender-item .g-count {
            font-size: 9px;
            color: var(--text-sub);
        }

        /* Drag handle on header */
        .bili-cmt-header {
            cursor: grab;
        }
        .bili-cmt-header:active {
            cursor: grabbing;
        }

        /* Duration badge */
        .dash-duration {
            font-size: 11px;
            color: var(--text-sub);
            font-weight: 600;
            text-align: center;
            padding: 4px 0;
        }
        .dash-duration span {
            color: var(--bili-pink);
            font-weight: 700;
        }
    `;

    // ==========================================
    // 6. CSV Export Utility
    // ==========================================
    function escapeCSVField(field) {
        if (field === null || field === undefined) {
            return '""';
        }
        let str = field.toString();
        str = str.replace(/"/g, '""'); // Double quotes escaping
        return `"${str}"`;
    }

    function downloadCSV(comments, filename) {
        if (comments.length === 0) {
            alert("没有可导出的评论数据。");
            return;
        }

        const headers = ["bvid", "upname", "sex", "content", "pictures", "rpid", "oid", "mid", "parent", "fans_grade", "ctime", "like", "level", "location"];
        const csvLines = [headers.join(',')];

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
            csvLines.push(row.map(val => escapeCSVField(val)).join(','));
        }

        const csvContent = csvLines.join('\r\n') + '\r\n';

        // Add UTF-8 BOM to solve Excel encoding issues (中文乱码)
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
    function parseOidInput(input) {
        input = input.trim();
        if (!input) return null;

        // Check if video link
        const bvMatch = input.match(/video\/(BV[a-zA-Z0-9]{10})/i);
        const avMatch = input.match(/video\/av(\d+)/i);
        if (bvMatch) {
            const bvid = bvMatch[1];
            return { oid: bvid2avid(bvid).toString(), bvid: bvid };
        }
        if (avMatch) {
            const avid = avMatch[1];
            return { oid: avid, bvid: avid2bvid(BigInt(avid)) };
        }

        // Check raw BV ID
        if (input.toLowerCase().startsWith('bv')) {
            const bvid = input.slice(0, 12);
            try {
                return { oid: bvid2avid(bvid).toString(), bvid: bvid };
            } catch (e) {
                return null;
            }
        }

        // Check raw AV ID
        if (input.toLowerCase().startsWith('av')) {
            const avid = input.slice(2);
            if (/^\d+$/.test(avid)) {
                return { oid: avid, bvid: avid2bvid(BigInt(avid)) };
            }
        }

        // Check raw number (AVID)
        if (/^\d+$/.test(input)) {
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

    function getPageContext() {
        const url = window.location.href;
        let bvid = '';
        let avid = '';
        let mid = '';

        const bvMatch = url.match(/video\/(BV[a-zA-Z0-9]{10})/i);
        const avMatch = url.match(/video\/av(\d+)/i);
        const spaceMatch = url.match(/space\.bilibili\.com\/(\d+)/i);

        if (bvMatch) {
            bvid = bvMatch[1];
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
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const LOG_MAX_LINES = 200;

    let currentExportedComments = [];
    let currentFilename = "";

    // Throttled progress DOM update (max once per 500ms)
    let lastProgressUpdate = 0;
    function throttledProgressUpdate(stats, totalCount) {
        const now = Date.now();
        if (now - lastProgressUpdate < 500) return;
        lastProgressUpdate = now;

        const totalFetched = stats.main + stats.sub;
        const mainEl = document.getElementById('stats-main');
        const subEl = document.getElementById('stats-sub');
        const speedEl = document.getElementById('progress-speed');
        const barEl = document.getElementById('progress-bar-fill');

        if (mainEl) mainEl.innerText = stats.main;
        if (subEl) subEl.innerText = stats.sub;
        if (speedEl) speedEl.innerText = `进度: ${totalFetched} / ${totalCount}`;

        if (barEl) {
            const pct = totalCount > 0 ? Math.min(100, Math.round((totalFetched / totalCount) * 100)) : 50;
            barEl.style.width = `${pct}%`;
        }
    }

    function log(msg, type = 'info') {
        const consoleDiv = document.getElementById('console-log');
        if (!consoleDiv) return;

        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        const timeStr = new Date().toTimeString().split(' ')[0];
        line.innerText = `[${timeStr}] ${msg}`;
        consoleDiv.appendChild(line);
        while (consoleDiv.children.length > LOG_MAX_LINES) {
            consoleDiv.removeChild(consoleDiv.firstChild);
        }
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
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

    async function exportVideoComments(oid, bvid, mode, includeSub, limit, requestDelay, options = {}) {
        const { stopOnLimit = true, wbiKeys = null } = options;
        let allComments = [];
        let rpidMap = new Set();
        let stats = createEmptyStats();

        let imgKey, subKey;
        try {
            log('正在解析 Wbi Key...', 'info');
            const keys = await getCachedWbiKeys();
            imgKey = keys.imgKey;
            subKey = keys.subKey;
            log('Wbi Key 解析成功。', 'success');
        } catch (e) {
            log(`获取 Wbi Key 失败: ${e.message}，将直接请求可能受限的 API。`, 'warn');
        }

        let paginationStr = '';
        let round = 0;
        let totalCount = 0;
        let mainCountFetched = 0;
        let maxTryCount = 0;

        while (isExporting && !shouldCancel) {
            round++;
            log(`正在抓取视频 ${bvid} 的主评论第 ${round} 页...`, 'info');

            let cmtInfo;
            try {
                cmtInfo = await fetchCommentsPage(oid, mode, paginationStr, imgKey, subKey);
            } catch (e) {
                log(`请求第 ${round} 页主评论异常: ${e.message}`, 'error');
                break;
            }

            if (!cmtInfo || cmtInfo.code !== 0) {
                const msg = cmtInfo ? cmtInfo.message : '空响应';
                log(`抓取主评论失败: ${msg}`, 'error');
                break;
            }

            if (round === 1) {
                totalCount = cmtInfo.data.cursor.all_count || 0;
                log(`该视频总计约 ${totalCount} 条评论（包含子评论）。`, 'info');
                updateProgressUI(stats, totalCount);
            }

            const replies = cmtInfo.data.replies || [];
            const topReplies = cmtInfo.data.top_replies || [];

            let currentReplies = [...replies];
            if (round === 1 && topReplies.length > 0) {
                currentReplies = [...topReplies, ...currentReplies];
            }

            if (currentReplies.length === 0) {
                log(`本页未获取到评论，抓取结束。`, 'info');
                break;
            }

            paginationStr = cmtInfo.data.cursor.pagination_reply ? cmtInfo.data.cursor.pagination_reply.next_offset : '';

            // Process comments
            let hasNewComments = false;
            for (const reply of currentReplies) {
                if (shouldCancel) break;

                if (rpidMap.has(String(reply.rpid))) continue;
                rpidMap.add(String(reply.rpid));
                hasNewComments = true;

                const mainCmt = mapReplyItem(reply, bvid);
                allComments.push(mainCmt);
                stats.main++;
                updateStats(stats, mainCmt);

                // Fetch Subcomments (Floor replies)
                if (includeSub && reply.rcount > 0) {
                    if (reply.replies && reply.replies.length > 0 && reply.replies.length === reply.rcount) {
                        for (const subReply of reply.replies) {
                            if (rpidMap.has(String(subReply.rpid))) continue;
                            rpidMap.add(String(subReply.rpid));

                            const subCmt = mapReplyItem(subReply, bvid);
                            allComments.push(subCmt);
                            stats.sub++;
                            updateStats(stats, subCmt);
                        }
                    } else {
                        let subPage = 1;
                        while (isExporting && !shouldCancel) {
                            if (subPage === 1 || subPage % 5 === 0) {
                                log(`  正在抓取主评论 ${reply.rpid} 的子评论第 ${subPage} 页...`, 'info');
                            }
                            await delay(requestDelay);

                            let subInfo;
                            try {
                                subInfo = await fetchSubCommentsPage(oid, reply.rpid, subPage);
                            } catch (e) {
                                log(`  子评论抓取异常: ${e.message}`, 'error');
                                break;
                            }

                            if (!subInfo || subInfo.code !== 0) break;

                            const subReplies = subInfo.data.replies || [];
                            if (subReplies.length === 0) break;

                            for (const subReply of subReplies) {
                                if (rpidMap.has(String(subReply.rpid))) continue;
                                rpidMap.add(String(subReply.rpid));

                                const subCmt = mapReplyItem(subReply, bvid);
                                allComments.push(subCmt);
                                stats.sub++;
                                updateStats(stats, subCmt);
                            }

                            if (subReplies.length < 20) break;
                            subPage++;
                        }
                    }
                }

                mainCountFetched++;
                if (limit && mainCountFetched >= limit) {
                    log(`已达到设定的主评论获取上限 (${limit}条)。`, 'warn');
                    if (stopOnLimit) shouldCancel = true;
                    break;
                }
            }

            if (!hasNewComments && currentReplies.length > 0) {
                maxTryCount++;
                log(`本页获取到的全部评论皆为重复数据 (第 ${maxTryCount} 次)...`, 'warn');
                if (maxTryCount >= 5) {
                    log(`连续 5 次获取到重复数据，停止抓取，防止陷入死循环。`, 'warn');
                    break;
                }
            } else {
                maxTryCount = 0;
            }

            // Update progress (throttled)
            throttledProgressUpdate(stats, totalCount);

            if (shouldCancel) break;

            await delay(requestDelay);

            if (!paginationStr || (cmtInfo.data.cursor && cmtInfo.data.cursor.is_end)) {
                log('已到达主评论底部。', 'success');
                break;
            }
        }

        return { allComments, stats };
    }

    async function exportUpComments(mid, upPages, skipPages, includeSub, limitPerVideo, requestDelay) {
        let imgKey, subKey;
        try {
            log('正在解析 Wbi Key...', 'info');
            const keys = await getCachedWbiKeys();
            imgKey = keys.imgKey;
            subKey = keys.subKey;
            log('Wbi Key 解析成功。', 'success');
        } catch (e) {
            log(`获取 Wbi Key 失败: ${e.message}。将直接请求可能受限的 API。`, 'warn');
        }

        const videos = [];
        const orderSelect = document.querySelector('input[name="up-order"]:checked');
        const order = orderSelect ? orderSelect.value : 'pubdate';

        const startPage = skipPages + 1;
        const endPage = skipPages + upPages;

        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            if (shouldCancel) break;
            log(`正在抓取 UP主 投稿列表第 ${pageNum} 页...`, 'info');

            let listInfo;
            try {
                listInfo = await fetchUpVideosPage(mid, pageNum, order, imgKey, subKey);
            } catch(e) {
                log(`请求投稿列表第 ${pageNum} 页异常: ${e.message}`, 'error');
                break;
            }

            if (!listInfo || listInfo.code !== 0) {
                const msg = listInfo ? listInfo.message : '空响应';
                log(`抓取投稿列表失败: ${msg}`, 'error');
                break;
            }

            const vlist = listInfo.data && listInfo.data.list && listInfo.data.list.vlist;
            if (!vlist || vlist.length === 0) {
                log(`没有更多视频了。`, 'info');
                break;
            }

            videos.push(...vlist);
            await delay(requestDelay);
        }

        log(`共成功获取到 ${videos.length} 个视频。准备启动批量导出评论...`, 'success');

        let allComments = [];
        let stats = createEmptyStats();

        const totalVideos = videos.length;
        for (let i = 0; i < totalVideos; i++) {
            if (shouldCancel) break;
            const video = videos[i];
            log(`========================================`, 'info');
            log(`[视频 ${i+1}/${totalVideos}] 正在导出: ${video.title} (BVID: ${video.bvid})`, 'info');

            try {
                const exportOpts = { stopOnLimit: false };
                if (imgKey && subKey) exportOpts.wbiKeys = { imgKey, subKey };
                const result = await exportVideoComments(
                    video.aid.toString(),
                    video.bvid,
                    3, // hot order for UP list videos
                    includeSub,
                    limitPerVideo,
                    requestDelay,
                    exportOpts
                );

                allComments.push(...result.allComments);
                stats.main += result.stats.main;
                stats.sub += result.stats.sub;

                // Merge stats
                for (const loc in result.stats.ip) {
                    stats.ip[loc] = (stats.ip[loc] || 0) + result.stats.ip[loc];
                }
                for (let lvl = 1; lvl <= 6; lvl++) {
                    stats.level[lvl] += result.stats.level[lvl];
                }
                for (const s in result.stats.sex) {
                    stats.sex[s] += result.stats.sex[s];
                }

            } catch (e) {
                log(`视频 ${video.bvid} 导出失败: ${e.message}`, 'error');
            }

            await delay(requestDelay * 2);
        }

        return { allComments, stats };
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
            new Notification(title, { body, icon: 'https://github.com/heroxv/bilibili-comment-exporter/raw/main/assets/logo.svg' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') {
                    new Notification(title, { body, icon: 'https://github.com/heroxv/bilibili-comment-exporter/raw/main/assets/logo.svg' });
                }
            });
        }
    }

    function displayStats(comments, stats, filename) {
        currentExportedComments = comments;
        currentFilename = filename;

        document.getElementById('bili-cmt-progress-panel').style.display = 'none';

        const dash = document.getElementById('bili-cmt-dashboard');
        dash.style.display = 'flex';

        const total = stats.main + stats.sub;
        document.getElementById('dash-total').innerText = total;
        document.getElementById('dash-main').innerText = stats.main;
        document.getElementById('dash-sub').innerText = stats.sub;

        // Show export duration
        const durationRow = document.getElementById('dash-duration-row');
        if (durationRow && exportStartTime > 0) {
            const elapsed = Date.now() - exportStartTime;
            durationRow.innerHTML = `✅ 导出完成，耗时 <span>${formatDuration(elapsed)}</span>，共 ${total} 条评论`;
            durationRow.style.display = 'block';
        }

        // Desktop notification
        sendDesktopNotification('bilibili-comment-exporter', `导出完成！共 ${total} 条评论。`);

        // Render IP locations Top 5
        const ipContainer = document.getElementById('chart-ip');
        ipContainer.innerHTML = '';
        const sortedIps = Object.keys(stats.ip)
            .map(loc => ({ loc, count: stats.ip[loc] }))
            .sort((a, b) => b.count - a.count);

        const topIps = sortedIps.slice(0, 5);
        const maxCount = topIps.length > 0 ? topIps[0].count : 1;

        if (topIps.length === 0) {
            ipContainer.innerHTML = '<div style="font-size:12px;color:var(--text-sub);text-align:center;padding:10px 0;">无 IP 地理位置数据</div>';
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

        sexContainer.innerHTML = `
            <div class="gender-stats-container">
                <div class="gender-item male">
                    <svg class="g-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="19" y1="5" x2="13.6" y2="10.4"></line><polyline points="14 5 19 5 19 10"></polyline></svg>
                    <span class="g-label">男</span>
                    <span class="g-pct">${mPct}%</span>
                    <span class="g-count">(${m})</span>
                </div>
                <div class="gender-item female">
                    <svg class="g-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"></circle><line x1="12" y1="14" x2="12" y2="21"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>
                    <span class="g-label">女</span>
                    <span class="g-pct">${fPct}%</span>
                    <span class="g-count">(${f})</span>
                </div>
                <div class="gender-item secret">
                    <svg class="g-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span class="g-label">保密</span>
                    <span class="g-pct">${sPct}%</span>
                    <span class="g-count">(${s})</span>
                </div>
            </div>
        `;
    }

    // ==========================================
    // 10. UI Generation & Control
    // ==========================================
    function createUI() {
        if (document.getElementById('bili-cmt-float-btn')) return;

        // Inject Styles
        const style = document.createElement('style');
        style.innerText = CSS_STYLES;
        document.head.appendChild(style);

        // Floating Button
        const floatBtn = document.createElement('div');
        floatBtn.id = 'bili-cmt-float-btn';
        floatBtn.className = 'bili-cmt-float-btn';
        floatBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <polyline points="10 9 14 9 14 13"></polyline>
                <line x1="9" y1="13" x2="14" y2="8"></line>
            </svg>
            <span>导出评论</span>
        `;
        document.body.appendChild(floatBtn);

        // Control Panel
        const panel = document.createElement('div');
        panel.id = 'bili-cmt-panel';
        panel.className = 'bili-cmt-panel';
        panel.style.display = 'none';
        panel.innerHTML = `
            <div class="bili-cmt-header">
                <div class="bili-cmt-title-area">
                    <h3>B站评论区导出工具</h3>
                    <span class="bili-cmt-subtitle">bilibili-comment-exporter v0.2.0</span>
                </div>
                <button id="bili-cmt-close-btn" class="bili-cmt-close-btn">&times;</button>
            </div>
            
            <div class="bili-cmt-tabs">
                <div class="bili-cmt-tab active" data-tab="video">视频导出</div>
                <div class="bili-cmt-tab" data-tab="up">UP主批量</div>
            </div>
            
            <div class="bili-cmt-tab-content active" id="tab-video">
                <div class="bili-cmt-form-group">
                    <label>视频 BV 号 / 链接</label>
                    <input type="text" id="video-bvid" placeholder="例如: BV1VJ4m1jk34K 或 视频链接" />
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
                
                <div class="bili-cmt-form-group-row">
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
                        <label>请求间隔延迟 (ms)</label>
                        <input type="number" id="video-delay" value="500" min="100" />
                    </div>
                </div>
                
                <button id="video-start-btn" class="bili-cmt-btn primary">开始导出</button>
            </div>
            
            <div class="bili-cmt-tab-content" id="tab-up">
                <div class="bili-cmt-form-group">
                    <label>UP主 Mid / 主页链接</label>
                    <input type="text" id="up-mid" placeholder="例如: 123344555 或 主页链接" />
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
                
                <div class="bili-cmt-form-group-row">
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
                        <label>请求间隔延迟 (ms)</label>
                        <input type="number" id="up-delay" value="500" min="100" />
                    </div>
                </div>
                
                <button id="up-start-btn" class="bili-cmt-btn primary">开始批量导出</button>
            </div>
            
            <!-- Progress Overlay -->
            <div id="bili-cmt-progress-panel" class="bili-cmt-progress-panel" style="display: none;">
                <div class="bili-cmt-progress-header">
                    <h4 id="progress-title">正在准备导出...</h4>
                    <span id="progress-speed">进度: 0/0</span>
                </div>
                
                <div class="bili-cmt-progress-bar-container">
                    <div id="progress-bar-fill" class="bili-cmt-progress-bar-fill" style="width: 0%;"></div>
                </div>
                
                <div class="bili-cmt-stats-summary">
                    <div>已抓取主评论: <span id="stats-main" class="bili-cmt-badge">0</span></div>
                    <div>已抓取子评论: <span id="stats-sub" class="bili-cmt-badge">0</span></div>
                </div>
                
                <div id="console-log" class="bili-cmt-console">
                    <div class="log-line info">[INFO] 准备就绪，等待开始。</div>
                </div>
                
                <button id="progress-cancel-btn" class="bili-cmt-btn danger">取消导出</button>
            </div>
            
            <!-- Stats Dashboard -->
            <div id="bili-cmt-dashboard" class="bili-cmt-dashboard" style="display: none;">
                <div class="dashboard-header">
                    <h4>📊 导出完成数据统计</h4>
                    <button id="dashboard-back-btn" class="bili-cmt-btn-text">返回设置</button>
                </div>
                
                <div id="dash-duration-row" class="dash-duration" style="display:none;"></div>
                
                <div class="dashboard-summary-cards">
                    <div class="summary-card">
                        <span class="card-num" id="dash-total">0</span>
                        <span class="card-label">总下载评论数</span>
                    </div>
                    <div class="summary-card">
                        <span class="card-num" id="dash-main">0</span>
                        <span class="card-label">主评论</span>
                    </div>
                    <div class="summary-card">
                        <span class="card-num" id="dash-sub">0</span>
                        <span class="card-label">楼中楼评论</span>
                    </div>
                </div>
                
                <div class="dashboard-charts">
                    <div class="chart-section">
                        <h5>📍 IP属地分布 (Top 5)</h5>
                        <div id="chart-ip" class="chart-container">
                            <!-- Dynamic Bars -->
                        </div>
                    </div>
                    <div class="chart-section-row">
                        <div class="chart-section half">
                            <h5>用户等级分布</h5>
                            <div id="chart-level" class="chart-container">
                                <!-- Level list -->
                            </div>
                        </div>
                        <div class="chart-section half">
                            <h5>性别比例</h5>
                            <div id="chart-sex" class="chart-container">
                                <!-- Sex stats -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-footer" style="margin-top: 10px;">
                    <button id="dashboard-download-btn" class="bili-cmt-btn primary" style="width: 100%;">重新下载 CSV 文件</button>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Bind Events
        floatBtn.addEventListener('click', () => {
            if (panel.style.display === 'none') {
                panel.style.display = 'flex';
                handleUrlChange();
            } else {
                panel.style.display = 'none';
            }
        });

        document.getElementById('bili-cmt-close-btn').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Tab switches
        const tabs = document.querySelectorAll('.bili-cmt-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (isExporting) return; // disable during active export
                switchTab(tab.getAttribute('data-tab'));
            });
        });

        // Cancel button
        document.getElementById('progress-cancel-btn').addEventListener('click', () => {
            shouldCancel = true;
            log('正在取消导出进程，等待当前请求完成...', 'warn');
        });

        // Back from dashboard
        document.getElementById('dashboard-back-btn').addEventListener('click', () => {
            document.getElementById('bili-cmt-dashboard').style.display = 'none';
        });

        // Redownload CSV
        document.getElementById('dashboard-download-btn').addEventListener('click', () => {
            downloadCSV(currentExportedComments, currentFilename);
        });

        // Helper: enable/disable export buttons
        function setExportButtonsEnabled(enabled) {
            const videoBtn = document.getElementById('video-start-btn');
            const upBtn = document.getElementById('up-start-btn');
            if (videoBtn) { videoBtn.disabled = !enabled; videoBtn.style.opacity = enabled ? '1' : '0.5'; videoBtn.style.pointerEvents = enabled ? 'auto' : 'none'; }
            if (upBtn) { upBtn.disabled = !enabled; upBtn.style.opacity = enabled ? '1' : '0.5'; upBtn.style.pointerEvents = enabled ? 'auto' : 'none'; }
        }

        // Start Video Export
        document.getElementById('video-start-btn').addEventListener('click', async () => {
            if (isExporting) return;
            const bvidVal = document.getElementById('video-bvid').value;
            const parsed = parseOidInput(bvidVal);
            if (!parsed) {
                alert("请输入合法的 BV 号或视频链接！");
                return;
            }

            const mode = parseInt(document.querySelector('input[name="video-order"]:checked').value);
            const includeSub = document.getElementById('video-subcomments').checked;
            const limit = parseInt(document.getElementById('video-limit').value) || 0;
            const delayVal = parseInt(document.getElementById('video-delay').value) || 500;

            const progressPanel = document.getElementById('bili-cmt-progress-panel');
            progressPanel.style.display = 'flex';
            document.getElementById('progress-title').innerText = "视频评论导出中...";
            document.getElementById('progress-bar-fill').style.width = '0%';
            document.getElementById('stats-main').innerText = '0';
            document.getElementById('stats-sub').innerText = '0';
            document.getElementById('console-log').innerHTML = '';

            isExporting = true;
            shouldCancel = false;
            exportStartTime = Date.now();
            setExportButtonsEnabled(false);

            try {
                const result = await exportVideoComments(parsed.oid, parsed.bvid, mode, includeSub, limit, delayVal);
                isExporting = false;
                setExportButtonsEnabled(true);

                if (shouldCancel) {
                    log('导出已被取消。', 'warn');
                } else {
                    log('导出顺利完成！正在保存文件...', 'success');
                    const title = getVideoTitle();
                    const filename = sanitizeFilename(`${title}_${parsed.bvid}_评论.csv`);
                    downloadCSV(result.allComments, filename);
                    displayStats(result.allComments, result.stats, filename);
                }
            } catch (err) {
                isExporting = false;
                setExportButtonsEnabled(true);
                log(`发生严重错误: ${err.message}`, 'error');
            }
        });

        // Start UP space batch export
        document.getElementById('up-start-btn').addEventListener('click', async () => {
            if (isExporting) return;
            const midVal = document.getElementById('up-mid').value;
            const mid = parseMidInput(midVal);
            if (!mid) {
                alert("请输入合法的 UP 主 Mid 或主页链接！");
                return;
            }

            const pages = parseInt(document.getElementById('up-pages').value) || 3;
            const skip = parseInt(document.getElementById('up-skip').value) || 0;
            const includeSub = document.getElementById('up-subcomments').checked;
            const limit = parseInt(document.getElementById('up-video-limit').value) || 0;
            const delayVal = parseInt(document.getElementById('up-delay').value) || 500;

            const progressPanel = document.getElementById('bili-cmt-progress-panel');
            progressPanel.style.display = 'flex';
            document.getElementById('progress-title').innerText = "UP 视频批量导出中...";
            document.getElementById('progress-bar-fill').style.width = '0%';
            document.getElementById('stats-main').innerText = '0';
            document.getElementById('stats-sub').innerText = '0';
            document.getElementById('console-log').innerHTML = '';

            isExporting = true;
            shouldCancel = false;
            exportStartTime = Date.now();
            setExportButtonsEnabled(false);

            try {
                const result = await exportUpComments(mid, pages, skip, includeSub, limit, delayVal);
                isExporting = false;
                setExportButtonsEnabled(true);

                if (shouldCancel) {
                    log('批量导出已被取消。', 'warn');
                } else {
                    log('批量导出顺利完成！正在保存文件...', 'success');
                    const upName = getUpName();
                    const filename = sanitizeFilename(`UP主_${upName || mid}_视频评论.csv`);
                    downloadCSV(result.allComments, filename);
                    displayStats(result.allComments, result.stats, filename);
                }
            } catch (err) {
                isExporting = false;
                setExportButtonsEnabled(true);
                log(`批量导出发生严重错误: ${err.message}`, 'error');
            }
        });

        // Panel Drag Functionality
        const header = panel.querySelector('.bili-cmt-header');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking the close button
            if (e.target.closest('.bili-cmt-close-btn')) return;
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newLeft = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffsetX));
            const newTop = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffsetY));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Initialize state
        handleUrlChange();
    }

    function switchTab(tabName) {
        const tabs = document.querySelectorAll('.bili-cmt-tab');
        const contents = document.querySelectorAll('.bili-cmt-tab-content');

        tabs.forEach(t => {
            if (t.getAttribute('data-tab') === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        contents.forEach(c => {
            if (c.getAttribute('id') === `tab-${tabName}`) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
    }

    let lastDetectedBvid = '';
    let lastDetectedMid = '';

    function handleUrlChange() {
        const ctx = getPageContext();
        const bvidInput = document.getElementById('video-bvid');
        const midInput = document.getElementById('up-mid');

        if (ctx.bvid && ctx.bvid !== lastDetectedBvid) {
            lastDetectedBvid = ctx.bvid;
            if (bvidInput) {
                bvidInput.value = ctx.bvid;
                switchTab('video');
            }
        }

        if (ctx.mid && ctx.mid !== lastDetectedMid) {
            lastDetectedMid = ctx.mid;
            if (midInput) {
                midInput.value = ctx.mid;
                switchTab('up');
            }
        }
    }

    // ==========================================
    // 11. Initializer & URL Watcher
    // ==========================================
    createUI();

    function watchUrlChanges() {
        const notify = () => handleUrlChange();
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

    watchUrlChanges();

})();
