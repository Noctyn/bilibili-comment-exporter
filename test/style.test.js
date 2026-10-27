import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPT_PATH } from './harness.mjs';

const src = fs.readFileSync(SCRIPT_PATH, 'utf8');
const match = src.match(/const CSS_STYLES = `([\s\S]*?)`;/);
assert.ok(match, '未找到 CSS_STYLES');

const css = match[1];

function collectVars(text, pattern) {
    const set = new Set();
    let m;
    while ((m = pattern.exec(text)) !== null) set.add(m[1]);
    return set;
}

test('CSS 中引用的自定义属性都已定义', () => {
    const used = collectVars(css, /var\((--[\w-]+)/g);
    const defined = collectVars(css, /^\s*(--[\w-]+)\s*:/gm);
    const missing = [...used].filter(v => !defined.has(v));
    assert.deepEqual(missing, [], `存在未定义的 CSS 变量: ${missing.join(', ')}`);
});

test('没有定义了却从未使用的令牌', () => {
    const used = collectVars(css, /var\((--[\w-]+)/g);
    const defined = collectVars(css, /^\s*(--[\w-]+)\s*:/gm);
    const unused = [...defined].filter(v => !used.has(v));
    assert.deepEqual(unused, [], `存在无用令牌: ${unused.join(', ')}`);
});

test('浅色 / 暗色主题的核心令牌都已声明', () => {
    for (const token of ['--bce-brand', '--bce-text-1', '--bce-text-2', '--bce-text-3',
        '--bce-line', '--bce-surface', '--bce-fill-1', '--bce-fill-2', '--bce-seg-active']) {
        assert.match(css, new RegExp(`^\\s*${token}\\s*:`, 'm'), `缺少令牌 ${token}`);
    }
    // 暗色主题块必须覆盖文字色与表面色
    const darkBlock = css.match(/\.bili-cmt-panel\.bili-cmt-dark \{([\s\S]*?)\}/);
    assert.ok(darkBlock, '未找到暗色主题变量块');
    for (const token of ['--bce-text-1', '--bce-surface', '--bce-seg-active']) {
        assert.match(darkBlock[1], new RegExp(`${token}\\s*:`), `暗色主题缺少 ${token}`);
    }
});

test('关键类名都保留（JS 依赖这些类名）', () => {
    for (const cls of ['.bili-cmt-panel', '.bili-cmt-header', '.bili-cmt-tabs', '.bili-cmt-tab',
        '.bili-cmt-segmented', '.bili-cmt-btn', '.bili-cmt-progress-bar-fill', '.bili-cmt-console',
        '.bili-cmt-dashboard', '.summary-card', '.chart-bar-fill', '.level-bar-fill', '.gender-item',
        '.bili-cmt-toast']) {
        assert.ok(css.includes(cls), `CSS 中缺少 ${cls}`);
    }
    // 不确定进度条的动画与类名由 JS 动态添加
    assert.ok(css.includes('.bili-cmt-progress-bar-fill.indeterminate'), '缺少 indeterminate 样式');
});

test('动画关键帧都被引用', () => {
    const keyframes = collectVars(css, /@keyframes\s+([\w-]+)/g);
    for (const name of keyframes) {
        const uses = css.match(new RegExp(`animation:\\s*[^;]*${name}`, 'g')) || [];
        assert.ok(uses.length > 0, `@keyframes ${name} 定义后未被使用`);
    }
});
