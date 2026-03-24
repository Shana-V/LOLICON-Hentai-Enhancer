// ==UserScript==
// @name                LOLICON Hentai Enhancer
// @name:zh-CN          LOLICON Hentai 增强器
// @name:zh-TW          LOLICON Hentai 增強器
// @name:ja             LOLICON Hentai 強化版
// @name:ko             LOLICON Hentai 향상기
// @name:ru             LOLICON Hentai Улучшатель
// @namespace           https://greasyfork.org/scripts/516145
// @version             2026.03.24
// @description         E-Hentai/ExHentai Auto Window Adaptation, Adjustable Thumbnails (size/margin), Quick Favorite, Infinite Scroll, Load More Thumbnails, Quick Tag & Search Enhancer, Thumbnail Hover Zoom
// @description:zh-CN   E-Hentai/ExHentai 自动适配窗口尺寸、缩略图调整（大小/间距）、快捷收藏、无限滚动、加载更多缩略图、快捷标签 & 搜索增强、缩略图悬浮放大
// @description:zh-TW   E-Hentai/ExHentai 自動適配視窗尺寸、縮圖調整（大小/間距）、快捷收藏、無限滾動、加載更多縮圖、快捷標籤 & 搜尋增強、縮略圖懸浮放大
// @description:ja      E-Hentai/ExHentai ウィンドウ自動適応、サムネイルサイズ・間隔調整、クイックお気に入り、無限スクロール、サムネイル追加読み込み、クイックタグ & 検索強化、サムネイルホバー拡大
// @description:ko      E-Hentai/ExHentai 자동 창 크기 조절, 썸네일 크기/간격 조절, 빠른 즐겨찾기, 무한 스크롤, 썸네일 더보기, 빠른 태그 & 검색 강화, 썸네일 호버 확대
// @description:ru      E-Hentai/ExHentai Автоматическая подгонка окна, Настройка миниатюр (размер/отступ), Быстрое добавление в избранное, Бесконечная прокрутка, Загрузка дополнительных миниатюр, Быстрые теги & поиск улучшены, Увеличение при наведении на миниатюру
// @icon                https://e-hentai.org/favicon.ico
// @match               *://e-hentai.org/*
// @match               *://exhentai.org/*
// @match               *://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @match               *://*.e-hentai.org/*
// @match               *://*.exhentai.org/*
// @match               *://*.exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*
// @run-at              document-end
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_deleteValue
// @grant               GM_registerMenuCommand
// @noframes
// @downloadURL https://update.greasyfork.org/scripts/516145/LOLICON.user.js
// @updateURL https://update.greasyfork.org/scripts/516145/LOLICON.meta.js
// ==/UserScript==

(function () {
    'use strict';

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 1. 工具函数
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** getElementById 根据 id 获取对应的 DOM 元素 */
    const $i = (id) => document.getElementById(id);
    /** getElementsByClassName 根据类名获取 DOM 集合 (HTMLCollection) */
    const $c = (name) => document.getElementsByClassName(name);
    /** querySelector 单个元素 */
    const $ = (sel) => document.querySelector(sel);
    /** querySelectorAll 多个元素 (NodeList) */
    const $$ = (sel) => document.querySelectorAll(sel);
    /** createElement 创建元素 */
    const $el = (tag) => document.createElement(tag);

    /** 防抖函数 */
    function debounce(func, wait) {
        let timeout;

        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /** 节流函数 */
    function throttle(func, wait, options = { leading: true, trailing: true }) {
        let lastTime = 0;
        let timeout = null;

        return function (...args) {
            const now = Date.now();
            // 如果是第一次触发且不需要开头触发，则把上次执行时间同步为当前时间
            if (!lastTime && options.leading === false) lastTime = now;
            const remaining = wait - (now - lastTime);

            if (remaining <= 0) {
                // 清除可能存在的尾部定时器
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                lastTime = now;
                func.apply(this, args);
            } else if (!timeout && options.trailing !== false) {
                // 只有在允许尾部触发时，才开启定时器
                timeout = setTimeout(() => {
                    lastTime = options.leading === false ? 0 : Date.now();
                    timeout = null;
                    func.apply(this, args);
                }, remaining);
            }
        };
    }

    /** 更新列表页宽-节流 */
    const throttledAdjustColumnsL = throttle(adjustColumnsL, 60);
    /** 更新画廊页宽-节流 */
    const throttledAdjustColumnsG = throttle(adjustColumnsG, 60);
    /** 更新地址栏-节流 */
    const throttledUpdateURLOnScroll = throttle(updateURLOnScroll, 120);
    /** 获取行信息-节流 */
    const throttledGetRowInfo = throttle(getRowInfo, 240);
    /** 加载页面内容-节流 */
    const throttledLoadPage = throttle(loadPage, 600); //, { trailing: false }

    /** Fetch 发包限速队列 */
    const queuedFetch = (() => {
        const queue = [];
        let isRunning = false; // 队列循环的锁
        let lastRequestTime = 0; // 记录上一次发起请求的时间

        const originalFetch = window.fetch.bind(window);

        async function processQueue() {
            if (isRunning) return;
            isRunning = true;

            try {
                while (queue.length > 0) {
                    const task = queue.shift();

                    if (task.nativeOptions?.signal?.aborted) {
                        task.reject(new DOMException('Aborted', 'AbortError'));
                        continue;
                    }

                    // 计算等待时间
                    const wait = task.q_interval - (performance.now() - lastRequestTime);

                    if (wait > 0) {
                        await new Promise((r) => setTimeout(r, wait));
                        if (task.nativeOptions?.signal?.aborted) {
                            task.reject(new DOMException('Aborted', 'AbortError'));
                            continue;
                        }
                    }

                    // 更新发起时间
                    lastRequestTime = performance.now();

                    (async () => {
                        const internalController = new AbortController();
                        let isTimeout = false;
                        let timeoutId = null;

                        // 只有当 q_timeout 大于 0 时才启用超时控制
                        if (task.q_timeout > 0) {
                            timeoutId = setTimeout(() => {
                                isTimeout = true; // 标记为超时状态
                                internalController.abort();
                            }, task.q_timeout);
                        }

                        const userSignal = task.nativeOptions?.signal;
                        let finalSignal = internalController.signal;
                        let abortHandler = null;

                        // 信号合并与兼容性处理
                        if (userSignal) {
                            if (typeof AbortSignal.any === 'function') {
                                finalSignal = AbortSignal.any([userSignal, internalController.signal]);
                            } else {
                                abortHandler = () => internalController.abort();
                                userSignal.addEventListener('abort', abortHandler);
                            }
                        }

                        try {
                            const response = await originalFetch(task.url, {
                                ...task.nativeOptions,
                                signal: finalSignal
                            });
                            task.resolve(response);
                        } catch (error) {
                            const finalError = isTimeout ? new DOMException('Request timed out', 'TimeoutError') : error;
                            task.reject(finalError);
                            console.error('LOLICON Fetch 队列任务失败：', finalError.message);
                        } finally {
                            clearTimeout(timeoutId);
                            if (userSignal && abortHandler) {
                                userSignal.removeEventListener('abort', abortHandler);
                            }
                        }
                    })();
                }
            } finally {
                isRunning = false;
            }
        }

        return function (url, options = {}) {
            return new Promise((resolve, reject) => {
                if (options?.signal?.aborted) {
                    return reject(new DOMException('Aborted', 'AbortError'));
                }

                const {
                    q_priority: q_priority = 0, // 任务优先级，值越大越先执行，默认 0
                    q_interval: q_interval = 600, // 任务请求间隔，默认 600ms
                    q_timeout: q_timeout = 12000, // 超时时间，默认 12000ms
                    ...nativeOptions
                } = options;

                const task = {
                    url,
                    nativeOptions,
                    resolve,
                    reject,
                    q_priority,
                    q_interval,
                    q_timeout,
                };

                // 优先级插入
                const index = queue.findIndex((t) => task.q_priority > t.q_priority);
                if (index === -1) {
                    queue.push(task);
                } else {
                    queue.splice(index, 0, task);
                }

                processQueue();
            });
        };
    })();

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 2. 常量与定义
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 获取当前设备的设备像素比（DPR）*/
    const getDPR = () => window.devicePixelRatio ?? 1;

    /** 用于存储布局相关的动态数据 */
    const layout = {};

    /** 配置项 - T: 列表页-缩略图模式, L: 列表页, G: 画廊页, S: 搜索框, NB: 导航栏, EH: 可切换网址 */
    const config = {
        // 列表页布局配置
        layoutEnabledL: { pages: ['L', 'S'], def: true }, // 列表页布局修改模式
        layoutSizeModeT: { pages: ['T'], def: 0, options: ['layoutAuto', 'layoutLimitColumn', 'layoutLimitWidth'] }, // 缩略图布局模式
        min_ColumnCountT: { pages: ['T'], def: 2, step: 1, min: 1, max: 100 }, // 缩略图最小列数
        max_ColumnCountT: { pages: ['T'], def: 5, step: 1, min: 1, max: 100 }, // 缩略图最大列数
        min_FixedWidthT: { pages: ['T'], def: 740, step: 1, min: 740, max: 9999 }, // 缩略图最小宽度
        max_FixedWidthT: { pages: ['T'], def: 1370, step: 1, min: 740, max: 9999 }, // 缩略图最大宽度
        zoomFactorT: { pages: ['T'], def: 1, step: 0.01, min: 0.5, max: 10 }, // 缩略图缩放
        margin: { pages: ['T'], def: 10, step: 1, min: 0, max: 100 }, // 缩略图边距
        squareMode: { pages: ['T'], def: false }, // 方形缩略图
        pageMarginL: { pages: ['L', 'S'], def: 10, step: 1, min: 0, max: 1000 }, // 列表页页面外边距
        pagePadding: { pages: ['L', 'S'], def: 10, step: 1, min: 0, max: 1000 }, // 列表页页面内边距
        fullWidthModeL: { pages: ['L', 'S'], def: false }, // 列表页全宽布局

        // 画廊页布局配置
        layoutEnabledG: { pages: ['G'], def: true }, // 画廊页布局修改模式
        layoutSizeModeG: { pages: ['G'], def: 0, options: ['layoutAuto', 'layoutLimitColumn', 'layoutLimitWidth'] }, // 画廊页缩略图布局模式
        min_ColumnCountG: { pages: ['G'], def: 3, step: 1, min: 1, max: 100 }, // 画廊页缩略图最小列数
        max_ColumnCountG: { pages: ['G'], def: 5, step: 1, min: 1, max: 100 }, // 画廊页缩略图最大列数
        min_FixedWidthG: { pages: ['G'], def: 700, step: 1, min: 700, max: 9999 }, // 画廊页缩略图最小宽度
        max_FixedWidthG: { pages: ['G'], def: 1200, step: 1, min: 700, max: 9999 }, // 画廊页缩略图最大宽度
        zoomFactorG: { pages: ['G'], def: 1, step: 0.01, min: 0.5, max: 10 }, // 画廊页缩略图缩放
        spacing: { pages: ['G'], def: 20, step: 1, min: 0, max: 100 }, // 画廊页缩略图间距
        pageMarginG: { pages: ['G'], def: 10, step: 1, min: 0, max: 1000 }, // 画廊页页面外边距
        fullWidthModeG: { pages: ['G'], def: false }, // 画廊页全宽布局

        // 功能开关
        showIndex: { pages: ['L'], def: false }, // 显示序号
        liveURLUpdate: { pages: ['L'], def: false }, // 实时更新网址
        tagSearchG: { pages: ['G'], def: true }, // 画廊标签搜索
        quickTag: { pages: ['G', 'S'], def: true }, // 快捷标签
        quickFavorite: { pages: ['G', 'S'], def: true }, // 快捷收藏
        favLayout: { pages: ['G', 'S'], def: 0, options: ['A : 1x10', 'B : 2x5', 'C : 2x5', 'D : 5x2'] }, // 收藏夹布局
        infiniteScroll: { pages: ['L'], def: true }, // 无限滚动
        maxPagesL: { pages: ['L'], def: 0, step: 1, min: 0, max: 1000 }, // 最大页数 [0 = 无限] (列表)
        moreThumbnail: { pages: ['G'], def: true }, // 更多缩略图
        maxPagesG: { pages: ['G'], def: 0, step: 1, min: 0, max: 1000 }, // 最大页数 [0 = 无限] (画廊)
        thumbScroll: { pages: ['G'], def: false }, // 缩略图独立滚动
        thumbHoverZoom: { pages: ['T', 'G'], def: true }, // 缩略图悬浮放大
        hoverScale: { pages: ['T', 'G'], def: 2, step: 0.01, min: 1, max: 10 }, // 悬浮缩放倍数
        hoverDelay: { pages: ['T', 'G'], def: 1, step: 0.01, min: 0.5, max: 10 }, // 悬浮显示延迟 (s)
        hoverLoadLargeImage: { pages: ['T', 'G'], def: false }, // 悬浮加载大图
        scriptSettings: { pages: ['NB'], def: true }, // 脚本设置按钮
        toggleEH: { pages: ['EH'], def: false }, // EH/ExH 切换按钮
    };

    /** EH 标签命名空间 缩写映射表 */
    const tag_nsMap = {
        artist: 'a',
        character: 'c',
        cosplayer: 'cos',
        female: 'f',
        group: 'g',
        language: 'l',
        male: 'm',
        mixed: 'x',
        other: 'o',
        parody: 'p',
        reclass: 'r',
    };

    // 脚本样式
    const CSS_MODULES = {

        LOLICON: /* css */ `
            [data-lolicon-index] { white-space: nowrap; }
        `,

        // 变量
        vars: /* css */ `
            body { --lolicon-primary-rgb: 0, 0, 0; --lolicon-bg-rgb: 255, 255, 255; --lolicon-text-rgb: 22, 22, 22; }
            body.ex, body.tor { --lolicon-primary-rgb: 255, 255, 255; --lolicon-bg-rgb: 0, 0, 0; --lolicon-text-rgb: 234, 234, 234; }
        `,

        // 设置页面样式
        settings: /* css */ `
            #lolicon-settings-panel {
                display: flex;
                flex-direction: column;
                position: fixed;
                top: 36px;
                right: 24px;
                background-color: rgba(var(--lolicon-bg-rgb), 0.8);
                border-radius: 12px;
                box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
                font-size: 14px;
                color: rgba(var(--lolicon-text-rgb), 1);
                white-space: nowrap;
                width: max-content;
                min-width: 180px;
                min-height: 180px;
                max-height: calc(100vh - 60px);
                overflow: hidden;
                backdrop-filter: blur(2px);
                touch-action: none;
                will-change: transform;
            }
            .lolicon-settings-header { flex-shrink: 0; }
            #lolicon-settings-panel h3 {
                margin: 0;
                padding: 18px 6px 6px 6px;
                font-size: 18px;
                color: #00AAFF;
                text-align: center;
                user-select: none;
            }
            .lolicon-settings-body {
                flex: 1;
                overflow-y: auto;
                padding: 0 12px;
                margin: 6px;
                user-select: none;
            }
            .lolicon-settings-body-row-extra {
                opacity: 0.6;
                filter: grayscale(0.36);
            }
            .lolicon-settings-toggle-bar {
                padding: 0px 12px 12px 12px;
            }
            .lolicon-settings-toggle-btn {
                width: 100%;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: transparent;
                border: 1px dashed #00AAFF;
                border-radius: 4px;
                color: #00AAFF;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.1s ease;
            }
            .lolicon-settings-toggle-btn svg {
                width: 16px;
                height: 16px;
                fill: currentColor;
            }
            .lolicon-settings-toggle-btn:hover {
                background: rgba(0, 170, 255, 0.1);
                border-style: solid;
            }
            .lolicon-settings-toggle-btn:active { transform: scale(0.96); }
            .lolicon-settings-toggle-btn.active {
                background: rgba(0, 170, 255, 0.1);
                border-style: solid;
            }
            .lolicon-settings-footer {
                flex-shrink: 0;
                display: flex;
                gap: 12px;
                padding: 0px 12px 12px 12px;
            }
            .lolicon-settings-btn {
                flex: 1;
                padding: 8px 12px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.1s ease;
            }
            .lolicon-settings-btn-save { background-color: #0088FF; color: #FFF; }
            .lolicon-settings-btn-cancel { background-color: #666; color: #FFF; }
            .lolicon-settings-btn:hover { filter: brightness(1.2); transform: scale(1.02); }
            .lolicon-settings-btn:active { transform: scale(0.96); }
            .lolicon-settings-control-row {
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                --lolicon-indent-level: 0;
                padding-left: calc(var(--lolicon-indent-level) * 24px);
            }
            .lolicon-settings-control-row label {
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
            }
            #lolicon-settings-panel input[type='number'] {
                width: 60px;
                padding: 4px;
                border: 2px solid #666;
                border-radius: 6px;
                box-sizing: border-box;
                margin-left: auto;
            }
            #lolicon-settings-panel input[type='checkbox'] {
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            #lolicon-settings-panel select {
                padding: 4px;
                border: 2px solid #666;
                border-radius: 6px;
                margin-left: auto;
            }
            .lolicon-settings-message {
                margin: 20px 0;
                font-size: 16px;
                font-weight: bold;
                text-align: center;
            }
            .lolicon-settings-input-error { border: 2px solid #F44 !important; }
        `,

        // 悬浮预览样式
        preview: /* css */ `
            #lolicon-preview {
                position: fixed;
                background-repeat: no-repeat;
                display: none;
                box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
                overflow: hidden;
                pointer-events: auto;
                touch-action: none;
            }
            #lolicon-preview img {
                width: 100%;
                height: auto;
                display: none;
            }
            .lolicon-loading-shimmer {
                position: absolute;
                inset: 0;
                overflow: hidden;
                pointer-events: none;
            }
            .lolicon-loading-shimmer::after {
                content: "";
                position: absolute;
                inset: 0;
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0) 40%,
                    rgba(255, 255, 255, 0.24) 50%,
                    rgba(255, 255, 255, 0) 60%
                );
                transform: translateX(-100%) skewX(-24deg);
                will-change: transform;
                animation: lolicon-shimmer 1.6s linear infinite;
            }
            @keyframes lolicon-shimmer {
                to { transform: translateX(100%) skewX(-24deg); }
            }
        `,

        // 标签面板与管理界面样式
        tags: /* css */ `
            #lolicon-tag-panel { padding-top: 6px; }
            #lolicon-tag-panel > input[type="button"] { margin: 2px; }
            input[type="button"].lolicon-tag-active,
            input[type="button"].lolicon-tag-active:hover { border: 2px solid currentColor !important; }
            input[type="button"].lolicon-tag-or,
            input[type="button"].lolicon-tag-or:hover { border: 2px solid #EA0 !important; }
            input[type="button"].lolicon-tag-exclusion,
            input[type="button"].lolicon-tag-exclusion:hover { border: 2px solid #E20 !important; }
            input[type="button"].lolicon-tag-mixed,
            input[type="button"].lolicon-tag-mixed:hover {
                border: 2px solid !important;
                border-image: linear-gradient(to right, currentColor, #EA0, #EA0, #E20) 1 !important;
            }
            #lolicon-tag-manage-panel {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: inherit;
                padding: 0 12px;
                border-radius: 8px;
                box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
                user-select: none;
                touch-action: none;
                will-change: transform;
            }
            #lolicon-tag-manage-header {
                padding: 12px;
                font-weight: bold;
                font-size: 16px;
                user-select: none;
            }
            #lolicon-tag-manage-textarea {
                min-width: 300px; min-height: 300px;
                width: 420px; height: 420px;
                padding: 6px 12px;
                font-family: NSimSun, monospace;
                line-height: 1.2;
                white-space: pre;
                user-select: text;
            }
            #lolicon-tag-manage-footer { display: flex; padding: 6px 0; }
            #lolicon-tag-manage-hint {
                font-size: 12px;
                white-space: pre-line;
                text-align: left;
            }
            #lolicon-tag-manage-buttons { margin-left: auto; }
            #lolicon-tag-manage-save, #lolicon-tag-manage-cancel { margin: 6px; }
        `,

        // 收藏菜单界面样式
        favMenu: /* css */ `
            .lolicon-fav-popup-menu {
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
                padding: 2px;
                color: #fff;
                min-width: 166px;
                font-size: 10pt;
                font-weight: bold;
                text-shadow: 0 0 1.2px #000, 0 0 2.4px #000, 0 0 3.6px #000;
                display: block;
                backdrop-filter: blur(2px);
                user-select: none;
            }
            .lolicon-fav-grid { display: grid; }
            .lolicon-fav-grid.layout-1 { grid-auto-flow: column; grid-template-rows: repeat(5, 1fr); grid-template-columns: 1fr 1fr; }
            .lolicon-fav-grid.layout-2 { grid-template-columns: 1fr 1fr; }
            .lolicon-fav-grid.layout-3 { grid-template-columns: repeat(5, 1fr); }
            .lolicon-fav-menu-item {
                padding: 6px;
                cursor: pointer;
                user-select: none;
                min-height: 18px;
                line-height: 18px;
                background: transparent;
            }
            .lolicon-fav-menu-item:hover { color: #fff !important; background-color: var(--hover-color, #555); }
            .lolicon-fav-action-row { display: flex; }
            .lolicon-fav-action-item { flex: 1; text-align: center; }
            .lolicon-fav-hover-gallery:not([style*="background"]):hover {
                background-color: rgba(var(--lolicon-primary-rgb), 0.12) !important;
                box-shadow: inset 0 0 0 2px rgba(var(--lolicon-primary-rgb), 0.12) !important;
            }
            .lolicon-fav-hover-list:not([style*="background"]):hover {
                border-color: rgb(var(--lolicon-primary-rgb)) !important;
            }
            .lolicon-fav-gdf-btn {
                padding-top: 0 !important;
                padding-left: 0 !important;
                height: 36px !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                margin-top: 6px !important;
            }
            .lolicon-fav-gdf-btn #fav .i { margin-left: 0 !important; }
        `,

        // 无限滚动加载指示器样式
        loading: /* css */ `
            .lolicon-loading-container {
                box-sizing: border-box;
                color: inherit;
                min-height: 36px;
            }
            div.lolicon-loading-container {
                display: flex;
                align-items: center;
                justify-content: center;
                grid-column: 1 / -1;
                width: 100%;
                border-radius: 4px;
                border: 1px solid color-mix(in srgb, currentColor, transparent 80%);
            }
            tr.lolicon-loading-container td {
                text-align: center;
                color: inherit;
                vertical-align: middle;
                border: 1px solid color-mix(in srgb, currentColor, transparent 80%);
            }
            div.lolicon-loading-container:has(.loading-link),
            tr.lolicon-loading-container:has(.loading-link) td {
                cursor:pointer;
                border-color: color-mix(in srgb, currentColor, transparent 60%);
            }
            div.lolicon-loading-container:has(.loading-link):hover,
            tr.lolicon-loading-container:has(.loading-link):hover td,
            div.lolicon-loading-container:has(.lolicon-loading-spinner),
            tr.lolicon-loading-container:has(.lolicon-loading-spinner) td {
                border-color: color-mix(in srgb, currentColor, transparent 40%);
                background: rgba(var(--lolicon-primary-rgb), 0.06);
            }
            .lolicon-loading-spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 4px solid rgba(120, 120, 120, 0.36);
                border-radius: 50%;
                border-top-color: currentColor;
                animation: lolicon-loading-spin 0.6s linear infinite;
                vertical-align: middle;
            }
            @keyframes lolicon-loading-spin { to { transform: rotate(360deg); } }
            .lolicon-loading-status-text {
                font-size: 18px;
                display: inline-block;
                color: inherit;
                user-select: none;
                margin-left: 10px;
                vertical-align: middle;
                line-height: 24px;
            }
            .lolicon-loading-status-text.loading-end {
                opacity: 0.6;
            }
        `,

        // 缩略图滚动容器样式
        thumbScroller: /* css */ `
            .lolicon-thumb-scroller-active {
                max-height: calc(90vh - 120px) !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
            }
        `,
    };

    /** 定义语言包 */
    const _translations = {
        'layoutEnabledL': {
            'en': 'List Layout Adjust',
            'zh-CN': '列表布局调整',
            'zh-TW': '列表佈局調整',
            'ja': 'リストレイアウト調整',
            'ko': '리스트 레이아웃 조정',
            'ru': 'Настройка макета списка',
        },
        'layoutEnabledG': {
            'en': 'Gallery Layout Adjust',
            'zh-CN': '画廊布局调整',
            'zh-TW': '畫廊佈局調整',
            'ja': 'ギャラリーレイアウト調整',
            'ko': '갤러리 레이아웃 조정',
            'ru': 'Настройка макета галереи',
        },
        'layoutSizeMode': {
            'en': 'Thumbnail Layout',
            'zh-CN': '缩略图布局',
            'zh-TW': '縮圖佈局',
            'ja': 'サムネイルレイアウト',
            'ko': '썸네일 레이아웃',
            'ru': 'Макет миниатюр',
        },
        'layoutAuto': {
            'en': 'Auto',
            'zh-CN': '自动',
            'zh-TW': '自動',
            'ja': '自動',
            'ko': '자동',
            'ru': 'Авто',
        },
        'layoutLimitColumn': {
            'en': 'Max/Min Column',
            'zh-CN': '限制列数',
            'zh-TW': '限制列數',
            'ja': '列数制限',
            'ko': '열 개수 제한',
            'ru': 'Ограничение столбцов',
        },
        'layoutLimitWidth': {
            'en': 'Max/Min Width',
            'zh-CN': '限制宽度',
            'zh-TW': '限制寬度',
            'ja': '幅制限',
            'ko': '너비 제한',
            'ru': 'Ограничение ширины',
        },
        'min_ColumnCount': {
            'en': 'Min Columns',
            'zh-CN': '最小列数',
            'zh-TW': '最小列數',
            'ja': '最小列数',
            'ko': '최소 열 개수',
            'ru': 'Мин. столбцов',
        },
        'max_ColumnCount': {
            'en': 'Max Columns',
            'zh-CN': '最大列数',
            'zh-TW': '最大列數',
            'ja': '最大列数',
            'ko': '최대 열 개수',
            'ru': 'Макс. столбцов',
        },
        'min_FixedWidth': {
            'en': 'Min Width',
            'zh-CN': '最小宽度',
            'zh-TW': '最小寬度',
            'ja': '最小幅',
            'ko': '최소 너비',
            'ru': 'Мин. ширина',
        },
        'max_FixedWidth': {
            'en': 'Max Width',
            'zh-CN': '最大宽度',
            'zh-TW': '最大寬度',
            'ja': '最大幅',
            'ko': '최대 너비',
            'ru': 'Макс. ширина',
        },
        'zoomFactor': {
            'en': 'Thumbnail Zoom',
            'zh-CN': '缩略图缩放',
            'zh-TW': '縮圖縮放',
            'ja': 'サムネイルズーム',
            'ko': '썸네일 확대 비율',
            'ru': 'Масштаб миниатюры',
        },
        'margin': {
            'en': 'Thumbnail Margin',
            'zh-CN': '缩略图边距',
            'zh-TW': '縮圖邊距',
            'ja': 'サムネイルマージン',
            'ko': '썸네일 여백',
            'ru': 'Отступы миниатюры',
        },
        'spacing': {
            'en': 'Thumbnail Spacing',
            'zh-CN': '缩略图间距',
            'zh-TW': '縮圖間距',
            'ja': 'サムネイル間隔',
            'ko': '썸네일 간격',
            'ru': 'Интервал миниатюр',
        },
        'pageMargin': {
            'en': 'Page Margin',
            'zh-CN': '页面外边距',
            'zh-TW': '頁面外邊距',
            'ja': 'ページマージン',
            'ko': '페이지 외부 여백',
            'ru': 'Внешний отступ страницы',
        },
        'pagePadding': {
            'en': 'Page Padding',
            'zh-CN': '页面内边距',
            'zh-TW': '頁面內邊距',
            'ja': 'ページパディング',
            'ko': '페이지 내부 여백',
            'ru': 'Внутренний отступ страницы',
        },
        'fullWidthMode': {
            'en': 'Full Width Layout',
            'zh-CN': '全宽布局',
            'zh-TW': '全寬佈局',
            'ja': '全幅レイアウト',
            'ko': '전체 너비 레이아웃',
            'ru': 'Полная ширина макета',
        },
        'squareMode': {
            'en': 'Square Thumbnail',
            'zh-CN': '方形缩略图',
            'zh-TW': '方形縮圖',
            'ja': 'スクエアサムネイル',
            'ko': '정사각형 썸네일',
            'ru': 'Квадратная миниатюра',
        },
        'showIndex': {
            'en': 'Show Index',
            'zh-CN': '显示序号',
            'zh-TW': '顯示序號',
            'ja': 'インデックスを表示',
            'ko': '인덱스 표시',
            'ru': 'Показать индекс',
        },
        'liveURLUpdate': {
            'en': 'Live URL Update',
            'zh-CN': '实时更新网址',
            'zh-TW': '實時更新網址',
            'ja': 'URLのライブ更新',
            'ko': '실시간 URL 업데이트',
            'ru': 'Живое обновление URL',
        },
        'tagSearchG': {
            'en': 'Gallery Tag Search',
            'zh-CN': '画廊标签搜索',
            'zh-TW': '畫廊標籤搜尋',
            'ja': 'ギャラリータグ検索',
            'ko': '갤러리 태그 검색',
            'ru': 'Поиск по тегам в галерее',
        },
        'quickTag': {
            'en': 'Quick Tag',
            'zh-CN': '快捷标签',
            'zh-TW': '快捷標籤',
            'ja': 'クイックタグ',
            'ko': '빠른 태그',
            'ru': 'Быстрые теги',
        },
        'quickFavorite': {
            'en': 'Quick Favorite',
            'zh-CN': '快捷收藏',
            'zh-TW': '快捷收藏',
            'ja': 'クイックお気に入り',
            'ko': '빠른 즐겨찾기',
            'ru': 'Быстрое избранное',
        },
        'favLayout': {
            'en': 'Favorite Layout',
            'zh-CN': '收藏夹布局',
            'zh-TW': '收藏夾佈局',
            'ja': 'お気に入りレイアウト',
            'ko': '즐겨찾기 레이아웃',
            'ru': 'Макет избранного',
        },
        'infiniteScroll': {
            'en': 'Infinite Scroll',
            'zh-CN': '无限滚动',
            'zh-TW': '無限滾動',
            'ja': '無限スクロール',
            'ko': '무한 스크롤',
            'ru': 'Бесконечная прокрутка',
        },
        'moreThumbnail': {
            'en': 'More Thumbnail',
            'zh-CN': '更多缩略图',
            'zh-TW': '更多縮圖',
            'ja': 'もっとサムネイル',
            'ko': '썸네일 더보기',
            'ru': 'Ещё миниатюры',
        },
        'maxPages': {
            'en': 'Max Pages [0 = Unlimited]',
            'zh-CN': '最大页数 [0 = 无限]',
            'zh-TW': '最大頁數 [0 = 無限]',
            'ja': '最大ページ数 [0 = 無制限]',
            'ko': '최대 페이지 [0 = 무한]',
            'ru': 'Макс. страниц [0 = Бесконечно]',
        },
        'thumbScroll': {
            'en': 'Scrollable Thumbnails',
            'zh-CN': '缩略图独立滚动',
            'zh-TW': '縮略圖獨立滾動',
            'ja': 'サムネイル専用スクロール',
            'ko': '썸네일 전용 스크롤',
            'ru': 'Независимая прокрутка миниатюр',
        },
        'thumbHoverZoom': {
            'en': 'Thumbnail Hover Zoom',
            'zh-CN': '缩略图悬浮放大',
            'zh-TW': '縮略圖懸浮放大',
            'ja': 'サムネイルホバー拡大',
            'ko': '썸네일 호버 확대',
            'ru': 'Увеличение при наведении на миниатюру',
        },
        'hoverScale': {
            'en': 'Zoom Scale',
            'zh-CN': '缩放倍数',
            'zh-TW': '縮放倍數',
            'ja': '拡大倍率',
            'ko': '확대 배율',
            'ru': 'Масштаб зума',
        },
        'hoverDelay': {
            'en': 'Display Delay (s)',
            'zh-CN': '显示延迟 (s)',
            'zh-TW': '顯示延遲 (s)',
            'ja': '表示遅延 (s)',
            'ko': '표시 지연 (s)',
            'ru': 'Задержка (s)',
        },
        'hoverLoadLargeImage': {
            'en': 'Load Large Image',
            'zh-CN': '加载大图',
            'zh-TW': '加載大圖',
            'ja': '大きい画像を読み込む',
            'ko': '대형 이미지 로드',
            'ru': 'Загрузка больших изображений',
        },
        'scriptSettings': {
            'en': 'Script Settings Button',
            'zh-CN': '脚本设置按钮',
            'zh-TW': '腳本設定按鈕',
            'ja': 'スクリプト設定ボタン',
            'ko': '스크립트 설정 버튼',
            'ru': 'Кнопка настроек скрипта',
        },
        'toggleEH': {
            'en': 'EH/ExH Switch Button',
            'zh-CN': 'EH/ExH 切换按钮',
            'zh-TW': 'EH/ExH 切換按鈕',
            'ja': 'EH/ExH 切替ボタン',
            'ko': 'EH/ExH 전환 버튼',
            'ru': 'Кнопка EH/ExH',
        },
        'settings': {
            'en': 'Settings',
            'zh-CN': '设置',
            'zh-TW': '設置',
            'ja': '設定',
            'ko': '설정',
            'ru': 'Настройки',
        },
        'showAllSettings': {
            'en': 'Show All Settings',
            'zh-CN': '显示全部设置',
            'zh-TW': '顯示全部設定',
            'ja': 'すべての設定を表示',
            'ko': '모든 설정 표시',
            'ru': 'Показать все настройки',
        },
        'hideInactiveSettings': {
            'en': 'Hide Unavailable Settings',
            'zh-CN': '隐藏不可用设置',
            'zh-TW': '隱藏不可用設定',
            'ja': '利用不可な設定を非表示',
            'ko': '사용 불가능한 설정 숨기기',
            'ru': 'Скрыть недоступные настройки',
        },
        'save': {
            'en': 'Save',
            'zh-CN': '保存',
            'zh-TW': '儲存',
            'ja': '保存',
            'ko': '저장',
            'ru': 'Сохранить',
        },
        'cancel': {
            'en': 'Cancel',
            'zh-CN': '取消',
            'zh-TW': '取消',
            'ja': 'キャンセル',
            'ko': '취소',
            'ru': 'Отменить',
        },
        'invalidPage': {
            'en': 'Unsupported page',
            'zh-CN': '不支持此页面',
            'zh-TW': '不支援此頁面',
            'ja': 'このページはサポートされていません',
            'ko': '이 페이지는 지원되지 않습니다',
            'ru': 'Эта страница не поддерживается',
        },
        'manageCustomTags': {
            'en': 'Manage Custom Tags',
            'zh-CN': '管理自定义标签',
            'zh-TW': '管理自訂標籤',
            'ja': 'カスタムタグを管理',
            'ko': '사용자 지정 태그 관리',
            'ru': 'Управление пользовательскими тегами',
        },
        'openSearchInNewTab': {
            'en': 'Right-click or Ctrl+Left-click to search in a new tab',
            'zh-CN': '右键 或 Ctrl+左键 在新标签页搜索',
            'zh-TW': '右鍵 或 Ctrl+左鍵 在新標籤頁搜尋',
            'ja': '右クリックまたはCtrl+左クリックで新しいタブで検索',
            'ko': '새 탭에서 검색하려면 마우스 오른쪽 버튼 클릭 또는 Ctrl+왼쪽 클릭',
            'ru': 'Щелкните правой кнопкой мыши или Ctrl+ЛКМ, чтобы искать в новой вкладке',
        },
        'inputFormatHint': {
            'en': '[name @ tag] or [name @ tag1 tag2 ...]\nUse [ _ ] as a separator for line breaks',
            'zh-CN': '[name @ tag] 或 [name @ tag1 tag2 ...]\n使用 [ _ ] 作为换行分隔符',
            'zh-TW': '[name @ tag] 或 [name @ tag1 tag2 ...]\n使用 [ _ ] 作為換行分隔符',
            'ja': '[name @ tag] または [name @ tag1 tag2 ...]\n[ _ ] を改行区切りとして使用',
            'ko': '[name @ tag] 또는 [name @ tag1 tag2 ...]\n줄바꿈 구분자로 [ _ ] 사용',
            'ru': '[name @ tag] или [name @ tag1 tag2 ...]\nИспользуйте [ _ ] как разделитель переноса строки',
        },
        'invalidInput': {
            'en': 'Invalid input\n\nUse [tag] or [name @ tag] or [name @ tag1 tag2 ...] format\nExample:\nLOLI @ f:lolicon$\n\nError line:\n',
            'zh-CN': '无效输入\n\n请使用 [tag] 或 [name @ tag] 或 [name @ tag1 tag2 ...] 格式\n示例:\nLOLI @ f:lolicon$\n\n错误行:\n',
            'zh-TW': '無效輸入\n\n請使用 [tag] 或 [name @ tag] 或 [name @ tag1 tag2 ...] 格式\n範例:\nLOLI @ f:lolicon$\n\n錯誤行:\n',
            'ja': '無効な入力です\n\n[tag] または [name @ tag] または [name @ tag1 tag2 ...] 形式を使用してください\n例:\nLOLI @ f:lolicon$\n\nエラー行:\n',
            'ko': '잘못된 입력\n\n[tag] 또는 [name @ tag] 또는 [name @ tag1 tag2 ...] 형식을 사용하세요\n예시:\nLOLI @ f:lolicon$\n\n오류 줄:\n',
            'ru': 'Неверный ввод\n\nИспользуйте формат [tag] или [name @ tag] или [name @ tag1 tag2 ...]\nПример:\nLOLI @ f:lolicon$\n\nСтрока с ошибкой:\n',
        },
        'unmatchedQuotes': {
            'en': 'Unmatched quotes\n\nEnsure quotes in tag names and tags are paired\n\nError line:\n',
            'zh-CN': '引号未成对\n\n请确保标签名称和标签中的引号成对出现\n\n错误行:\n',
            'zh-TW': '引號未成對\n\n請確保標籤名稱和標籤中的引號成對出現\n\n錯誤行:\n',
            'ja': '引用符が正しく閉じられていません\n\nタグ名とタグ内の引用符が対になっていることを確認してください\n\nエラー行:\n',
            'ko': '인용 부호 불일치\n\n태그 이름과 태그 내 인용 부호가 짝을 이루도록 하세요\n\n오류 줄:\n',
            'ru': 'Непарные кавычки\n\nУбедитесь, что кавычки в имени тега и в теге парные\n\nСтрока с ошибкой:\n',
        },
        'duplicateName': {
            'en': 'Duplicate name\n\nEnsure each tag name is unique\n\nDuplicate name:\n',
            'zh-CN': '名称重复\n\n请确保每个标签名称都是唯一的\n\n重复名称:\n',
            'zh-TW': '名稱重複\n\n請確保每個標籤名稱都是唯一的\n\n重複名稱:\n',
            'ja': '名前が重複しています\n\n各タグ名が一意であることを確認してください\n\n重複した名前:\n',
            'ko': '중복 이름\n\n각 태그 이름이 고유한지 확인하세요\n\n중복 이름:\n',
            'ru': 'Дублирующее имя\n\nУбедитесь, что каждое имя тега уникально\n\nДублирующее имя:\n',
        },
        'loading': {
            'en': 'Loading...',
            'zh-CN': '正在加载...',
            'zh-TW': '正在載入...',
            'ja': '読み込み中...',
            'ko': '로드 중...',
            'ru': 'Загрузка...',
        },
        'loadMoreContent': {
            'en': '--- Load more ---',
            'zh-CN': '--- 加载更多 ---',
            'zh-TW': '--- 載入更多 ---',
            'ja': '--- さらに読み込む ---',
            'ko': '--- 더 불러오기 ---',
            'ru': '--- Загрузить ещё ---',
        },
        'noMoreContent': {
            'en': '--- No more content ---',
            'zh-CN': '--- 没有更多内容 ---',
            'zh-TW': '--- 沒有更多內容 ---',
            'ja': '--- これ以上ありません ---',
            'ko': '--- 더 이상 없음 ---',
            'ru': '--- Контент закончился ---',
        },
        'loadFailedRetry': {
            'en': '--- Load failed · Retry ---',
            'zh-CN': '--- 加载失败 · 重试 ---',
            'zh-TW': '--- 載入失敗 · 重試 ---',
            'ja': '--- 読み込み失敗 · 再試行 ---',
            'ko': '--- 로드 실패 · 다시 시도 ---',
            'ru': '--- Ошибка · Повторить ---',
        },
    };

    /** 输入报错模板 */
    const rangeTemplates = {
        'en': `Invalid {{label}}! \nPlease enter a value between {{min}} - {{max}}. Default {{default}}`,
        'zh-CN': `{{label}} 无效！\n请输入介于 {{min}} ~ {{max}} 之间的值。默认值为 {{default}}`,
        'zh-TW': `{{label}} 無效！\n請輸入介於 {{min}} ~ {{max}} 之間的值。預設值為 {{default}}`,
        'ja': `{{label}} が無効です！\n{{min}} ~ {{max}} までの値を入力してください。デフォルトは {{default}} です`,
        'ko': `잘못된 {{label}}! \n{{min}} ~ {{max}} 사이의 값을 입력하세요. 기본값 {{default}}`,
        'ru': `Неверный {{label}}! \nПожалуйста, введите значение от {{min}} - {{max}}. По умолчанию {{default}}`,
    };

    /** 模板替换函数 */
    function interpolate(template, values) {
        return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
    }

    /** 包装 Proxy */
    const translations = new Proxy(_translations, {
        get(target, prop) {
            // 如果访问的是 xxxRange
            const rangeMatch = prop.match(/^(.+)Range$/);
            if (rangeMatch) {
                let baseKey = rangeMatch[1];

                // 处理 L/G/T 后缀
                const suffixMatch = baseKey.match(/^(.+)([LGT])$/);
                if (suffixMatch) {
                    const pureKey = suffixMatch[1];
                    if (!Object.prototype.hasOwnProperty.call(target, baseKey) &&
                        Object.prototype.hasOwnProperty.call(target, pureKey)) {
                        baseKey = pureKey;
                    }
                }

                const labelEntry = target[baseKey];
                const conf = (baseKey in config) ? config[baseKey] : config[rangeMatch[1]];
                if (!labelEntry || !conf) return undefined;

                const output = {};
                for (const lang of Object.keys(rangeTemplates)) {
                    output[lang] = interpolate(rangeTemplates[lang], {
                        label: labelEntry[lang],
                        min: conf.min,
                        max: conf.max,
                        default: conf.def,
                    });
                }
                return output;
            }

            // 处理 L/G/T 后缀
            const suffixMatch = prop.match(/^(.+)([LGT])$/);
            if (suffixMatch) {
                const baseKey = suffixMatch[1];
                return Object.prototype.hasOwnProperty.call(target, baseKey)
                    ? target[baseKey]
                    : target[prop];
            }

            // 普通字段直接返回
            return target[prop];
        }
    });

    /** 确定用户语言 */
    const LANG = (() => {
        const userLang = navigator.language || 'en';
        if (userLang.startsWith('zh-TW')) return 'zh-TW';
        if (userLang.startsWith('zh')) return 'zh-CN';
        return userLang.substring(0, 2);
    })();

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 3. 状态管理
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 页面项目信息 */
    let pageItemsData = [];

    /** 用于存储脚本的用户配置 */
    const cfg = {};

    /** 当前网页信息 */
    const pageInfo = {
        originalUrl: window.location.href, // 当前 URL
        isEhentai: window.location.hostname.endsWith('e-hentai.org'), // 判断是否是 e变态
        isExhentai: window.location.hostname.endsWith('exhentai.org'), // 判断是否是 ex变态
        isTor: window.location.hostname.endsWith('exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion'), // 判断是否是 Tor

        isHomePage: window.location.pathname === '/', // 首页&搜索页面
        isWatchedPage: window.location.pathname.startsWith('/watched'), // 订阅页面
        isPopularPage: window.location.pathname.startsWith('/popular'), // 热门页面
        isTorrentsPage: window.location.pathname.startsWith('/torrents.php'), // 种子页面
        isFavoritesPage: window.location.pathname.startsWith('/favorites.php'), // 收藏夹页面
        isUconfigPage: window.location.pathname.startsWith('/uconfig.php'), // 设置页面
        isMytagsPage: window.location.pathname.startsWith('/mytags'), // 我的标签页面
        isGalleryPage: window.location.pathname.startsWith('/g/'), // 画廊页面
        isImagePage: window.location.pathname.startsWith('/s/'), // 图片页面
        isTagPage: window.location.pathname.startsWith('/tag/'), // 标签页面？和首页&搜索页一样
        isGalleryPopupsPage: window.location.pathname.startsWith('/gallerypopups.php'), // 画廊弹出窗口

        listDisplayMode: $('.searchnav select[onchange*="dm_"]')?.value, // 列表显示模式（m/p/l/e/t）
        hasSearchBox: !!$i('f_search') || !!$('form[action*="favorites.php"] input[name="f_search"]') // 是否存在搜索框
    };

    /** 当前输入设备 mouse/touch/pen */
    let inputDevice = null;
    document.addEventListener('pointerup', (e) => {
        inputDevice = e.pointerType;
    });

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 4. 设置面板
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 根据用户语言选择对应的文本 */
    const translate = (key) => {
        const tKey = translations[key];
        if (!tKey) return key;
        return tKey[LANG] || tKey.en || key;
    };

    /** 创建控件 HTML */
    function createControlHTML(type, name, value, options = {}) {
        const classes = ['lolicon-settings-control-row'];
        if (options.extraClass) classes.push('lolicon-settings-body-row-extra');

        const indentStyle = options.indentLevel > 0
            ? `style="--lolicon-indent-level: ${options.indentLevel}"`
            : '';

        const rowClass = classes.join(' ');
        switch (type) {
            case 'input': {
                const { step, min, max } = config[name];
                return `<div class="${rowClass}" ${indentStyle}>
                    <label for="${name}Input">${translate(name)}</label>
                    <input type="number" id="${name}Input" value="${value}" step="${step}" min="${min}" max="${max}">
                </div>`;
            }
            case 'checkbox': {
                return `<div class="${rowClass}" ${indentStyle}>
                    <label for="${name}Input">${translate(name)}</label>
                    <input type="checkbox" id="${name}Input" ${value ? "checked" : ""}>
                </div>`;
            }
            case 'select': {
                const items = config[name].options;
                const optionsHTML = items.map((text, idx) =>
                    `<option value="${idx}" ${idx === value ? "selected" : ""}>${translate(text)}</option>`,
                ).join('');
                return `<div class="${rowClass}" ${indentStyle}>
                    <label for="${name}Input">${translate(name)}</label>
                    <select id="${name}Input">${optionsHTML}</select>
                </div>`;
            }
            case 'viewToggle': {
                const isActive = isFullMode;
                const btnClass = `lolicon-settings-toggle-btn ${isActive ? 'active' : ''}`;
                const btnText = isActive ? translate('hideInactiveSettings') : translate('showAllSettings');
                return `
                <button id="toggleViewBtn" class="${btnClass}">
                    <svg viewBox="0 0 24 24"><path d="M12 5.83L15.17 9l1.41-1.41L12 3 7.41 7.59 8.83 9 12 5.83zm0 12.34L8.83 15l-1.41 1.41L12 21l4.59-4.59L15.17 15 12 18.17z"/></svg>
                    <span>${btnText}</span>
                </button>`;
            }
            case 'buttons': {
                return `
                    <button id="saveSettingsBtn" class="lolicon-settings-btn lolicon-settings-btn-save">${translate('save')}</button>
                    <button id="cancelSettingsBtn" class="lolicon-settings-btn lolicon-settings-btn-cancel">${translate('cancel')}</button>
                `;
            }
            case 'message': {
                return `<div class="lolicon-settings-message">${translate(name)}</div>`;
            }
        }
    }

    /** 子项联动配置表：主开关名 -> [子控件名, 是否缩进(默认 true), 显示条件(默认 true，可填数或数组)] */
    const extraControls = {
        layoutEnabledL: [
            ['layoutSizeModeT'],
            ['zoomFactorT'],
            ['margin'],
            ['squareMode'],
            ['pageMarginL'],
            ['pagePadding'],
            ['fullWidthModeL'],
        ],
        layoutEnabledG: [
            ['layoutSizeModeG'],
            ['zoomFactorG'],
            ['spacing'],
            ['pageMarginG'],
            ['fullWidthModeG'],
        ],
        layoutSizeModeT: [
            ['min_ColumnCountT', true, 1],
            ['max_ColumnCountT', true, 1],
            ['min_FixedWidthT', true, 2],
            ['max_FixedWidthT', true, 2],
        ],
        layoutSizeModeG: [
            ['min_ColumnCountG', true, 1],
            ['max_ColumnCountG', true, 1],
            ['min_FixedWidthG', true, 2],
            ['max_FixedWidthG', true, 2],
        ],
        infiniteScroll: [['maxPagesL']],
        moreThumbnail: [['maxPagesG']],
        tagSearchG: [['quickTag']],
        quickFavorite: [['favLayout']],
        thumbHoverZoom: [
            ['hoverScale'],
            ['hoverDelay'],
            ['hoverLoadLargeImage'],
        ],
    };

    /** 根据配置 key 自动推断控件类型 */
    function getControlType(key) {
        if (typeof config[key].def === 'boolean') return 'checkbox';
        if (config[key].options) return 'select';
        return 'input';
    }

    /** 获取当前页面所有特征标签 */
    function getActiveTags() {
        const tags = new Set(['All']); // 默认包含通用项

        if (pageInfo.listDisplayMode === 't') tags.add('T'); // 列表页-缩略图模式
        if (pageInfo.listDisplayMode) tags.add('L'); // 列表页
        if (pageInfo.isGalleryPage) tags.add('G'); // 画廊页
        if (pageInfo.hasSearchBox) tags.add('S'); // 搜索栏
        if ($i('nb')) tags.add('NB'); // 导航栏
        if (toggleEHInfo.allowed) tags.add('EH'); // 允许切换网址

        return tags;
    }

    /** 获取面板内容 */
    function getPanelContent() {
        const activeTags = getActiveTags();
        const htmlPieces = [];

        // 判断项是否属于当前页面
        const getIsInPage = (name) => {
            const itemCfg = config[name];
            if (!itemCfg || !itemCfg.pages) return false;
            const p = itemCfg.pages;
            return Array.isArray(p) ? p.some((t) => activeTags.has(t)) : activeTags.has(p);
        };

        // 动态依赖解析
        const logicDepMap = {};
        for (const [pKey, subs] of Object.entries(extraControls)) {
            const pIsInPage = getIsInPage(pKey);
            subs.forEach(([sKey, indent = true, cond]) => {
                // 优先级：如果已绑定了原生父项，则不再被幽灵父项覆盖
                const existingDep = logicDepMap[sKey];
                if (!existingDep || (!getIsInPage(existingDep.pKey) && pIsInPage)) {
                    logicDepMap[sKey] = { pKey, cond, indent };
                }
            });
        }

        // 初始根节点判定
        const allSubKeys = new Set(Object.values(extraControls).flatMap((arr) => arr.map((i) => i[0])));
        const topLevelKeys = Object.keys(config).filter((k) => {
            const dep = logicDepMap[k];
            if (!dep) return true; // 本身就是根
            // 如果父项不在当前页，且 [自己是在当前页的原生项] ，则在当前页作为根节点出现
            if (!getIsInPage(dep.pKey) && getIsInPage(k)) return true;
            // 如果父子都不在当前页，则它应该由幽灵父项带出来，不作为根
            return false;
        }).reverse();

        const stack = topLevelKeys.map((k) => ({ name: k, indentLevel: 0, parentState: true }));
        const processed = new Set();
        const renderQueue = [];

        // 栈驱动渲染
        while (stack.length > 0) {
            const { name, indentLevel, parentState } = stack.pop();
            if (processed.has(name)) continue;

            const dep = logicDepMap[name];
            const isInPage = getIsInPage(name);
            let currentIndent = indentLevel;
            let logicCondMet = true;

            if (dep) {
                const pValue = cfg[dep.pKey];
                const pIsInPage = getIsInPage(dep.pKey);

                logicCondMet = dep.cond === undefined
                    ? pValue === true
                    : (Array.isArray(dep.cond) ? dep.cond.includes(pValue) : pValue === dep.cond);

                // 只有当 [父项非原生] 且 [子项是原生] 时，才自立门户 (缩进 0)
                if (!pIsInPage && isInPage) {
                    currentIndent = 0;
                }
            }

            const isOrphan = dep ? !getIsInPage(dep.pKey) : true;
            const isActive = isOrphan
                ? (isInPage && logicCondMet)
                : (parentState && isInPage && logicCondMet);

            if (!isActive && !isFullMode) continue;

            renderQueue.push({ name, isActive, indentLevel: currentIndent });
            processed.add(name);

            // 压入子项
            const subItems = extraControls[name];
            if (subItems) {
                const currentAsParentState = isActive && (cfg[name] === true || typeof cfg[name] !== 'boolean');
                for (let i = subItems.length - 1; i >= 0; i--) {
                    const [subKey, subIndent] = subItems[i];

                    // 如果我是幽灵父项，我不能带走已经是原生根节点的子项
                    const subIsInPage = getIsInPage(subKey);
                    if (!getIsInPage(name) && subIsInPage) continue;

                    stack.push({
                        name: subKey,
                        indentLevel: (subIndent !== false) ? currentIndent + 1 : currentIndent,
                        parentState: currentAsParentState
                    });
                }
            }
        }

        // 渲染 HTML
        renderQueue.forEach((item) => {
            const { name, isActive, indentLevel } = item;
            htmlPieces.push(createControlHTML(getControlType(name), name, cfg[name], {
                indentLevel,
                extraClass: isFullMode && !isActive
            }));
        });

        return htmlPieces.length > 0 ? htmlPieces.join('') : createControlHTML('message', 'invalidPage');
    }

    let isFullMode;
    /** 创建和显示设置面板 */
    function showSettingsPanel() {
        if ($i('lolicon-settings-panel')) return;
        const panel = $el('div');
        panel.id = 'lolicon-settings-panel';
        panel.innerHTML = `
            <h3 class="lolicon-settings-header">${translate('settings')}</h3>
            <div id='settings-controls' class="lolicon-settings-body">${getPanelContent()}</div>
            <div class="lolicon-settings-toggle-bar">${createControlHTML('viewToggle')}</div>
            <div class="lolicon-settings-footer">${createControlHTML('buttons')}</div>
        `;

        document.body.appendChild(panel);

        // 绑定切换视图事件
        const toggleBtn = $i('toggleViewBtn');
        toggleBtn.onclick = () => {
            isFullMode = !isFullMode;
            panel.refreshControls();
            const span = toggleBtn.querySelector('span');
            span.textContent = isFullMode ? translate('hideInactiveSettings') : translate('showAllSettings');
            toggleBtn.classList.toggle('active', isFullMode);
        };

        enablePanelTop(panel);
        enablePanelDrag(panel);

        // 防止触发全局快捷键
        panel.addEventListener('keydown', (e) => {
            e.stopPropagation();
        }, true);

        // 面板整体的行为与按钮绑定
        panel.addEventListener('input', (e) => {
            if (e.target.type === 'number') handleInputChange(e);
            if (e.target.type === 'checkbox') handleCheckboxChange(e);
        });
        panel.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') handleSelectChange(e);
        });
        panel.addEventListener('wheel', (e) => {
            if (e.target.type === 'number') handleWheelChange(e);
        }, { passive: false });

        $i('saveSettingsBtn')?.addEventListener('click', () => saveSettings(panel));
        $i('cancelSettingsBtn')?.addEventListener('click', () => cancelSettings(panel));

        // 暴露局部刷新函数，方便外部调用
        panel.refreshControls = () => refreshSettingsControls(panel);
    }

    /** 局部刷新（只替换 #settings-controls 的 innerHTML，保留容器和已绑定的委托事件） */
    function refreshSettingsControls(panel) {
        const container = panel.querySelector('#settings-controls');
        if (!container) return;
        container.innerHTML = getPanelContent();
        // 不需要重新绑定事件，因为事件委托绑定在 container 元素上并不会被替换
    }

    /** 复选框和展示逻辑有关，局部刷新控件 */
    function tryRefreshPanel(key) {
        if (Object.keys(extraControls).includes(key)) {
            const panel = $i('lolicon-settings-panel');
            if (panel && typeof panel.refreshControls === 'function') {
                panel.refreshControls();
            }
        }
    }

    /** 验证输入数值的合法性并同步联动项状态 */
    function validateInput(key, value, isSilent = false) {
        const isMin = key.startsWith('min_');
        const isMax = key.startsWith('max_');
        const peerKey = (isMin || isMax) ? (isMin ? key.replace('min_', 'max_') : key.replace('max_', 'min_')) : null;
        const peerInput = peerKey ? $i(`${peerKey}Input`) : null;
        const peerValue = peerInput ? parseFloat(peerInput.value) : NaN;

        // 同步联动项
        if (!isSilent && peerInput && config[peerKey]) {
            const isLogicConflict = isMin ? (value > peerValue) : (value < peerValue);
            if (isNaN(value) || !isLogicConflict) {
                if (!isNaN(peerValue) && peerValue >= config[peerKey].min && peerValue <= config[peerKey].max) {
                    peerInput.classList.remove('lolicon-settings-input-error');
                    cfg[peerKey] = peerValue;
                }
            } else if (isLogicConflict) {
                peerInput.classList.add('lolicon-settings-input-error');
            }
        }

        // 验证输入数值的合法性
        if (isNaN(value) || value < config[key].min || value > config[key].max) return false;
        if (peerKey && !isNaN(peerValue)) {
            if (isMin ? value > peerValue : value < peerValue) return false;
        }

        return true;
    }

    /** 从元素 ID 中提取配置项的 Key */
    const getCfgKey = (id) => id.replace(/Input$/, '');

    /** 输入框变化事件 */
    function handleInputChange(event) {
        const { id, value } = event.target;
        const key = getCfgKey(id);
        const numValue = parseFloat(value);

        if (validateInput(key, numValue)) {
            event.target.classList.remove('lolicon-settings-input-error');
            cfg[key] = numValue;
            applyChanges();
        } else {
            event.target.classList.add('lolicon-settings-input-error');
        }
    }

    /** 复选框变化事件 */
    function handleCheckboxChange(event) {
        const { id, checked } = event.target;
        const key = getCfgKey(id);
        cfg[key] = checked;
        applyChanges();
        tryRefreshPanel(key);
    }

    /** 下拉菜单变化事件 */
    function handleSelectChange(event) {
        const { id, value } = event.target;
        const key = getCfgKey(id);
        const numValue = parseInt(value);
        cfg[key] = numValue;
        applyChanges();
        tryRefreshPanel(key);
    }

    /** 滚轮事件处理 */
    function handleWheelChange(event) {
        if (event.target.type !== 'number') return;
        event.preventDefault();
        const input = event.target;
        let value = parseFloat(input.value);
        const step = parseFloat(input.step);
        value = Math.min(parseFloat(input.max), Math.max(parseFloat(input.min), value + (event.deltaY < 0 ? step : -step)));
        input.value = step < 1 ? value.toFixed(2) : value;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    /** 保存设置 */
    function saveSettings(panel) {
        let errors = [];
        panel.querySelectorAll('input[type="number"]').forEach((input) => {
            const key = input.id.replace('Input', '');
            const value = parseFloat(input.value);
            if (!validateInput(key, value, true)) {
                errors.push(translate(key + 'Range'));
            }
        });
        if (errors.length > 0) {
            alert(errors.join('\n\n'));
            return;
        }
        // 无错误时保存所有设置
        Object.keys(config).forEach((key) => GM_setValue(key, cfg[key]));
        panel.remove();
    }

    /** 取消设置 */
    function cancelSettings(panel) {
        Object.keys(config).forEach((key) => {
            cfg[key] = GM_getValue(key);
        });
        applyChanges();
        panel.remove();
    }

    /** 初始化设置 如果为空 先保存初始值 */
    function initialize() {
        for (const [key, cfgItem] of Object.entries(config)) {
            let val = GM_getValue(key);

            if (val === undefined) {
                if (key.endsWith('T') || key.endsWith('L')) {
                    const oldKey = key.slice(0, -1) + 'S';
                    const oldVal = GM_getValue(oldKey);

                    if (oldVal !== undefined) {
                        val = oldVal;
                        GM_setValue(key, val);
                        GM_deleteValue(oldKey);
                    }
                }
            }

            if (val === undefined) {
                GM_setValue(key, cfgItem.def);
                val = cfgItem.def;
            }
            cfg[key] = val;
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 5. 页面调整
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 计算尺寸 */
    function calculateDimensions() {
        layout.columnWidthL = 250 * cfg.zoomFactorT + cfg.margin * 2; // 每列的宽度 250-400 270
        layout.columnWidthLb = layout.columnWidthL + (2 / getDPR()); // 加上缩略图边框，边框宽度受设备像素比影响
        layout.columnWidthG = 100 * cfg.zoomFactorG + cfg.spacing; // 画廊每列的宽度(100X) spacing:15 + (2 / getDPR())
        layout.marginAdjustmentL = 14 + cfg.pageMarginL * 2; // 页面边距调整值 body-padding:2 ido-padding:5
        layout.marginAdjustmentG = 34 + cfg.pageMarginG * 2; // 画廊页面边距调整值 body-padding:2 gdt-padding:15
        layout.paddingAdjustmentL = cfg.pagePadding * 2; // 页面内边距调整值
    }

    /** 搜索类别行td */
    let initialRowTDs = null;

    /** 调整列表页 */
    function adjustColumnsL() {
        console.log('LOLICON 列表页调整');

        const width = document.documentElement.clientWidth; // window.innerWidth
        const minWidthNumber = parseFloat(getComputedStyle($c('ido')[0]).minWidth);

        const clientWidthLO = Math.max(width - layout.marginAdjustmentL - layout.paddingAdjustmentL, minWidthNumber); // 计算宽度

        // 计算列数
        if (cfg.layoutSizeModeT === 0) {
            layout.columnsT = Math.max(1, Math.floor(clientWidthLO / layout.columnWidthLb));
        } else if (cfg.layoutSizeModeT === 1) { // 限制列数模式
            let potentialCols = Math.floor(clientWidthLO / layout.columnWidthLb);
            layout.columnsT = Math.max(cfg.min_ColumnCountT, Math.min(potentialCols, cfg.max_ColumnCountT));
        } else if (cfg.layoutSizeModeT === 2) { // 限制宽度模式
            let limitedWidth = Math.max(cfg.min_FixedWidthT, Math.min(clientWidthLO, cfg.max_FixedWidthT));
            layout.columnsT = Math.max(1, Math.floor(limitedWidth / layout.columnWidthLb));
        }

        // 计算宽度
        let clientWidthL_itg;
        if (cfg.fullWidthModeL) {
            if (cfg.layoutSizeModeT === 0) clientWidthL_itg = Math.max(minWidthNumber, clientWidthLO);
            else if (cfg.layoutSizeModeT === 1) clientWidthL_itg = Math.max(clientWidthLO, layout.columnsT * layout.columnWidthLb);
            else if (cfg.layoutSizeModeT === 2) clientWidthL_itg = Math.max(cfg.min_FixedWidthT, Math.min(clientWidthLO, cfg.max_FixedWidthT));
        } else {
            clientWidthL_itg = (pageInfo.listDisplayMode === 't')
                ? Math.max(minWidthNumber, layout.columnsT * layout.columnWidthLb)
                : Math.max(minWidthNumber, Math.min(720 + 670 + 14, clientWidthLO));
        }

        // 应用样式
        let clientWidthL_ido = clientWidthL_itg + layout.paddingAdjustmentL;
        $c('ido')[0].style.maxWidth = !cfg.layoutEnabledL ? (pageInfo.listDisplayMode === 't' ? '1370px' : '') : clientWidthL_ido + 'px'; // 设置最大宽度 1370
        if (pageInfo.listDisplayMode === 't' && $c('itg gld')[0]) {
            $c('itg gld')[0].style.gridTemplateColumns = !cfg.layoutEnabledL ? '' : 'repeat(' + layout.columnsT + ', 1fr)'; // 设置列数
            $c('itg gld')[0].style.width = !cfg.layoutEnabledL ? '' : clientWidthL_itg + 'px'; // 设置边距 '99%'
        } else if ($c('itg')[0]) {
            $c('itg')[0].style.maxWidth = !cfg.layoutEnabledL ? '' : clientWidthL_itg + 'px';
            $c('itg')[0].style.width = !cfg.layoutEnabledL ? '' : clientWidthL_itg + 'px';
        }

        const totalRequiredWidthL = clientWidthL_ido + layout.marginAdjustmentL;
        if (totalRequiredWidthL > width) {
            document.body.style.minWidth = !cfg.layoutEnabledL ? '' : totalRequiredWidthL + 'px';
        } else {
            document.body.style.minWidth = '';
        }

        const searchnavEls = $c('searchnav');
        const paddingValue = (width - layout.marginAdjustmentL - layout.paddingAdjustmentL >= minWidthNumber)
            ? cfg.pagePadding
            : (width - minWidthNumber - layout.marginAdjustmentL) / 2;
        for (let i = 0; i < 2; i++) {
            const el = searchnavEls[i];
            if (!el) continue;
            el.children[0].style.padding = !cfg.layoutEnabledL ? '' : '0 0 0 ' + + paddingValue + 'px';
            el.children[6].style.padding = !cfg.layoutEnabledL ? '' : '0 ' + paddingValue + 'px 0 0';
        }

        const isLargerWidth = cfg.layoutEnabledL && (clientWidthL_ido >= 720 + 670 + 14 + layout.paddingAdjustmentL); //1460
        adjustSearchBox(isLargerWidth);

        // 调整收藏页面
        if (pageInfo.isFavoritesPage) {
            const fpElements = $$('div.fp');
            const searchInput = $('form[action*="favorites.php"] input[name="f_search"]');
            const searchContainer = searchInput?.closest('.ido > div');

            const isNarrowMode = cfg.layoutEnabledL && clientWidthL_ido < (930 + layout.paddingAdjustmentL);

            const noselWidth = Math.max(735, Math.min(825, clientWidthL_ido));
            if ($c('nosel')[1]) { $c('nosel')[1].style.width = (isNarrowMode ? noselWidth : 825) + 'px'; }

            const fpWidth = Math.max(142, Math.min(160, (clientWidthL_ido - 16) / 5 - 1));
            for (let i = 0; i < Math.min(10, fpElements.length); i++) {
                fpElements[i].style.width = (isNarrowMode ? fpWidth : 160) + 'px';
            }

            if (searchContainer && isNarrowMode) {
                searchContainer.style.width = noselWidth + 'px';
                searchInput.setAttribute('size', Math.max(84, Math.min(90, 84 + (noselWidth - 735) / 15)));
                searchInput.style.width = '';
            } else if (searchContainer) {
                searchContainer.style.width = (isLargerWidth ? 720 + 670 : 825) + 'px';
                searchInput.setAttribute('size', '90');
                searchInput.style.width = (isLargerWidth ? '1230px' : '');
            }
        }
    }

    /** 调整画廊详情页面 */
    function adjustColumnsG() {
        console.log('LOLICON 画廊页面调整');

        const gdt = $i('gdt');
        if (gdt) {
            const width = window.innerWidth;
            const thumbScale = gdt.classList.contains('gt200') ? 2 : 1;
            const pixelCorrection = 2 / getDPR();

            const spacingCorrection = cfg.spacing * thumbScale;
            const columnWidthGO = layout.columnWidthG * thumbScale + pixelCorrection;

            const clientWidthGO = Math.max(700, width - layout.marginAdjustmentG) + spacingCorrection; // 计算宽度

            // 计算列数
            let columnsG;
            if (cfg.layoutSizeModeG === 0) { // 自动模式
                columnsG = Math.max(1, Math.floor(clientWidthGO / columnWidthGO));
            } else if (cfg.layoutSizeModeG === 1) { // 限制列数模式
                let potentialCols = Math.floor(clientWidthGO / columnWidthGO);
                columnsG = Math.max(cfg.min_ColumnCountG * 2 / thumbScale, Math.min(potentialCols, cfg.max_ColumnCountG * 2 / thumbScale));
            } else if (cfg.layoutSizeModeG === 2) { // 限制宽度模式
                let limitedWidth = Math.max(cfg.min_FixedWidthG + spacingCorrection, Math.min(clientWidthGO, cfg.max_FixedWidthG + spacingCorrection));
                columnsG = Math.max(1, Math.floor(limitedWidth / columnWidthGO));
            }

            // 计算宽度
            let clientWidthG_gdt;
            if (cfg.fullWidthModeG) {
                if (cfg.layoutSizeModeG === 0) clientWidthG_gdt = clientWidthGO - spacingCorrection;
                else if (cfg.layoutSizeModeG === 1) clientWidthG_gdt = Math.max(clientWidthGO - spacingCorrection, columnsG * columnWidthGO - spacingCorrection);
                else if (cfg.layoutSizeModeG === 2) clientWidthG_gdt = Math.max(cfg.min_FixedWidthG, Math.min(clientWidthGO - spacingCorrection, cfg.max_FixedWidthG));
            } else {
                clientWidthG_gdt = Math.max(700, columnsG * columnWidthGO - spacingCorrection);
            }

            if ($c('gm')[0]) { $c('gm')[0].style.maxWidth = !cfg.layoutEnabledG ? '' : clientWidthG_gdt + 20 + 'px'; } // 设置最详情大宽度 720 960 1200
            if ($c('gm')[1]) { $c('gm')[1].style.maxWidth = !cfg.layoutEnabledG ? '' : clientWidthG_gdt + 20 + 'px'; } // 设置最评论区大宽度 720 960 1200
            if ($i('gdo')) { $i('gdo').style.maxWidth = !cfg.layoutEnabledG ? '' : clientWidthG_gdt + 20 + 'px'; } // 设置缩略图设置栏最大宽度 720 960 1200

            let clientWidthG_gdt_gd2 = clientWidthG_gdt - 255; // 设置标题栏宽度 710 925
            let clientWidthG_gdt_gmid = clientWidthG_gdt - 250; // 设置标签栏宽度 710 930
            let clientWidthG_gdt_gd4 = clientWidthG_gdt - 600; // 设置标签栏宽度 360 580
            if ($i('gd1')) { $i('gd1').style.display = ''; }

            let layoutWidth = (cfg.layoutSizeModeG === 0 && cfg.fullWidthModeG) ? width : clientWidthG_gdt + 2 * cfg.pageMarginG + 34;
            if (width <= 1230 || (cfg.layoutEnabledG && layoutWidth <= 1230 - 190)) {
                clientWidthG_gdt_gd2 = clientWidthG_gdt_gd2 + 255;
                clientWidthG_gdt_gmid = clientWidthG_gdt_gmid + 255;
                clientWidthG_gdt_gd4 = clientWidthG_gdt_gd4 + 255;
                if ($i('gd1')) { $i('gd1').style.display = 'none'; }
            }

            if ($i('gd2')) { $i('gd2').style.width = !cfg.layoutEnabledG ? '' : clientWidthG_gdt_gd2 + 'px'; }
            if ($i('gmid')) { $i('gmid').style.width = !cfg.layoutEnabledG ? '' : clientWidthG_gdt_gmid + 'px'; }
            if ($i('gd4')) { $i('gd4').style.width = !cfg.layoutEnabledG ? '' : clientWidthG_gdt_gd4 + 'px'; }

            gdt.style.maxWidth = !cfg.layoutEnabledG ? '' : clientWidthG_gdt + 'px'; // 设置最大宽度 700 940 1180
            gdt.style.gridTemplateColumns = !cfg.layoutEnabledG ? '' : 'repeat(' + columnsG + ', 1fr)';
            gdt.style.gap = !cfg.layoutEnabledG ? '' : cfg.spacing + 'px';

            const totalRequiredWidthG = clientWidthG_gdt + layout.marginAdjustmentG;
            if (cfg.layoutEnabledG && totalRequiredWidthG > width) {
                document.body.style.minWidth = totalRequiredWidthG + 'px';
            } else {
                document.body.style.minWidth = '';
            }

            const isLargerWidth = cfg.layoutEnabledG && (clientWidthG_gdt >= 720 + 670 + 14); //1460
            adjustSearchBox(isLargerWidth);
        }
    }

    /** 调整搜索盒子 */
    function adjustSearchBox(isLargerWidth) {
        const searchbox = $i('searchbox'); // 搜索盒子
        if (searchbox) {
            const tbody = searchbox.querySelector('tbody');
            if (tbody) {
                if (!initialRowTDs) {
                    const rows = Array.from(tbody.children);
                    initialRowTDs = rows.map((row) => Array.from(row.children)); // 保存每行 td 节点引用
                }

                if (isLargerWidth) {
                    // 合并行
                    const rows = Array.from(tbody.children);
                    if (rows.length >= 2) {
                        const firstRow = rows[0];
                        const secondRow = rows[1];
                        Array.from(secondRow.children).forEach((td) => firstRow.appendChild(td));
                        secondRow.remove();
                    }
                } else {
                    // 拆分回原始两行
                    tbody.innerHTML = ''; // 清空 tbody

                    initialRowTDs.forEach((tdArray) => {
                        const tr = $el('tr');
                        tdArray.forEach((td) => tr.appendChild(td)); // 移动原 td 节点
                        tbody.appendChild(tr);
                    });
                }
            }

            // 调整搜索盒子大小
            if ($c('idi')[0]) { $c('idi')[0].style.width = (isLargerWidth ? 720 + 670 : 720) + 'px'; }
            if ($c('idi')[1]) { $c('idi')[1].style.width = (isLargerWidth ? 720 + 670 : 720) + 'px'; }
            if ($i('f_search')) { $i('f_search').style.width = (isLargerWidth ? 560 + 670 : 560) + 'px'; }
        }
    }

    /** 收集列表页信息 */
    function collectDataL(root = document, direction = 'next') {
        console.log('LOLICON 收集列表页信息');
        const isThumbnailMode = pageInfo.listDisplayMode === 't';
        const gElements = isThumbnailMode
            ? root.querySelectorAll('.gl1t')
            : (root === document)
                ? root.querySelectorAll('.itg > tbody > tr:not(.lolicon-loading-container)')
                : Array.from(root.children);

        const newData = [];

        gElements.forEach((el, index) => {
            if (el._loliconData) return;

            if (!isThumbnailMode && el.querySelector('td.itd')) return; // 跳过广告行

            const glink = el.querySelector('.glink');
            if (!glink) return; // 跳过非画廊 如表头

            const url = glink.closest('a')?.href;
            const match = url?.match(/\/g\/(\d+)\//);
            const gid = match ? Number(match[1]) : null;

            let itemData = {
                el,
                glink,
                gid,
                url,
                pageIndex: 0,
                lastStatus: null,
            };

            if (isThumbnailMode) {
                const gl3t = el.querySelector('.gl3t');
                const gl4t = el.querySelector('.gl4t');
                const gl5t = el.querySelector('.gl5t');
                const gl6t = el.querySelector('.gl6t');
                const gl5tFirstChildDiv = gl5t?.querySelector('div:nth-child(1)');
                const img = gl3t?.querySelector('img');
                const gl3tStyle = gl3t ? gl3t.style : null;
                const imgStyle = img ? img.style : null;

                Object.assign(itemData, {
                    gl3t,
                    gl4t,
                    gl5t,
                    gl6t,
                    gl5tFirstChildDiv,
                    img,
                    originalGl3tWidth: gl3tStyle ? parseFloat(gl3tStyle.width) : 0,
                    originalGl3tHeight: gl3tStyle ? parseFloat(gl3tStyle.height) : 0,
                    originalImgWidth: imgStyle ? parseFloat(imgStyle.width) : 0,
                    originalImgHeight: imgStyle ? parseFloat(imgStyle.height) : 0,
                    originalImgTop: imgStyle ? parseFloat(imgStyle.top) : 0,
                });
            }

            el._loliconData = itemData;
            newData.push(itemData);
        });

        if (direction === 'next') {
            newData.forEach((item) => {
                item.pageIndex = pageItemsData.length;
                pageItemsData.push(item);
            });
        } else {
            pageItemsData.unshift(...newData);
            pageItemsData.forEach((item, idx) => {
                item.pageIndex = idx;
            });
        }

        return newData;
    }

    /** 收集画廊页面信息 */
    function collectDataG(root = document, direction = 'next') {
        console.log('LOLICON 收集画廊页面信息');
        const gdt = (root === document) ? $i('gdt') : root;
        const gdtThumbsSingle = gdt.querySelectorAll('a > div:nth-child(1)');
        const gdtThumbsDouble = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(1)');
        const gdtThumbs = gdtThumbsDouble.length ? gdtThumbsDouble : gdtThumbsSingle;
        const gdtThumbPages = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(2)');

        const spriteCountMap = new Map(); // 记录每张背景图出现次数
        const newData = [];

        gdtThumbs.forEach((el, index) => {
            if (el._loliconData) return;

            const style = el.style;
            const backgroundPositionX = parseFloat(style.backgroundPosition);
            const backgroundImage = style.backgroundImage;

            const spriteIndex = (spriteCountMap.get(backgroundImage) || 0) + 1;
            spriteCountMap.set(backgroundImage, spriteIndex);

            const width = parseFloat(style.width);
            const height = parseFloat(style.height);
            const itemWidth = (width === 200 || height === 300) ? 200 : 100;

            const pageEl = gdtThumbPages[index] ?? null;
            const url = el.closest('a').href;

            const itemData = {
                el,
                backgroundPositionX,
                backgroundImage,
                spriteIndex,
                itemsPerSprite: null,
                width,
                height,
                itemWidth,
                pageEl,
                url,
                pageIndex: 0,
                lastStatus: null,
            };

            el._loliconData = itemData;
            newData.push(itemData);
        });

        newData.forEach((data) => {
            if (data.itemsPerSprite == null) {
                data.itemsPerSprite = spriteCountMap.get(data.backgroundImage) || 1;
            }
        });

        if (direction === 'next') {
            newData.forEach((item) => {
                item.pageIndex = pageItemsData.length;
                pageItemsData.push(item);
            });
        } else {
            pageItemsData.unshift(...newData);
            pageItemsData.forEach((item, idx) => {
                item.pageIndex = idx;
            });
        }

        return newData;
    }

    /** 修改列表页缩略图大小 */
    function modifyThumbnailSizeL(items = pageItemsData) {
        console.log('LOLICON 修改缩略图大小');

        const currentStatus = `${cfg.layoutEnabledL}_${cfg.zoomFactorT}_${cfg.margin}_${cfg.squareMode}`;

        items.forEach((data, index) => {
            if (data.lastStatus === currentStatus) return;
            const {
                el,
                gl3t,
                gl4t,
                gl5t,
                gl6t,
                glink,
                gl5tFirstChildDiv,
                img,
                gid,
                originalGl3tWidth,
                originalGl3tHeight,
                originalImgWidth,
                originalImgHeight,
                originalImgTop,
                url,
            } = data;

            let zoomFactorO = 1;
            if (cfg.layoutEnabledL) {
                if (cfg.squareMode && originalGl3tWidth < 250) {
                    zoomFactorO = cfg.zoomFactorT * 250 / originalGl3tWidth;
                } else {
                    zoomFactorO = cfg.zoomFactorT;
                }
            }

            // 设置 gl1t 的宽度
            el.style.minWidth = !cfg.layoutEnabledL ? '' : layout.columnWidthL + 'px';
            el.style.maxWidth = !cfg.layoutEnabledL ? '' : 'none';

            // 调整 gl3t 的宽高
            if (gl3t) {
                const newWidth = originalGl3tWidth * zoomFactorO;
                const newHeight = originalGl3tHeight * zoomFactorO;
                gl3t.style.width = newWidth + 'px';
                gl3t.style.height = (cfg.layoutEnabledL && cfg.squareMode ? newWidth : newHeight) + 'px';
            }

            // 小列宽时处理 gl5t 换行逻辑
            if (gl5t) {
                const isSmallWidth = cfg.layoutEnabledL && layout.columnWidthL <= 199;
                gl5t.style.flexWrap = isSmallWidth ? 'wrap' : '';
                gl5t.style.height = isSmallWidth ? '92px' : '';

                if (gl5tFirstChildDiv) { gl5tFirstChildDiv.style.left = isSmallWidth ? '4.5px' : ''; }
            }

            // 调整图片的宽高
            if (img) {
                if (cfg.layoutEnabledL && cfg.squareMode) {
                    if (originalImgWidth <= originalImgHeight) {
                        img.style.width = '100%';
                        img.style.height = 'auto';
                        img.style.top = ((originalGl3tWidth - originalImgHeight) * zoomFactorO) / 2 + 'px';
                        img.style.left = '';
                    } else {
                        img.style.width = 'auto';
                        img.style.height = '100%';
                        img.style.top = '';
                        img.style.left = ((originalGl3tWidth - (originalGl3tWidth * originalImgWidth / originalImgHeight)) * zoomFactorO) / 2 + 'px';
                    }
                } else if (cfg.layoutEnabledL || img._largeImg instanceof Image) {
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.top = ((originalGl3tHeight - originalImgHeight) * zoomFactorO) / 2 + 'px';
                    img.style.left = '';
                } else {
                    img.style.width = originalImgWidth + 'px';
                    img.style.height = originalImgHeight + 'px';
                    img.style.top = originalImgTop ? originalImgTop + 'px' : '';
                    img.style.left = '';
                }

                bindThumbHoverZoom(data);
            }

            // 解决原网页缩略图可能存在的 1px 误差
            if (cfg.layoutEnabledL && gl3t && img) {
                const updateWH = () => {
                    if (img.naturalWidth > 0 && originalGl3tWidth - img.naturalWidth === 1) {
                        gl3t.style.width = img.naturalWidth * zoomFactorO + 'px';
                        // img.style.width = img.naturalWidth * zoomFactorO + 'px';
                    }
                    if (img.naturalHeight > 0 && originalGl3tHeight - img.naturalHeight === 1) {
                        gl3t.style.height = (cfg.layoutEnabledL && cfg.squareMode ? img.naturalWidth : img.naturalHeight) * zoomFactorO + 'px';
                        // img.style.height = img.naturalHeight * zoomFactorO + 'px';
                    }
                };
                if (img.complete) {
                    updateWH();
                } else {
                    img.addEventListener('load', updateWH, { once: true });
                }
            }
            data.lastStatus = currentStatus;
        });
    }

    /** 调整 glink 的标题序号 */
    function updateGlinkIndex(items = pageItemsData) {
        console.log('LOLICON 调整 glink 的标题序号');

        items.forEach((data, index) => {
            const { glink, pageIndex } = data;

            if (glink) {
                const glinkSpan = glink.querySelector('span[data-lolicon-index="true"]');

                if (cfg.showIndex) {
                    const targetText = `【${pageIndex + 1}】 `;
                    if (!glinkSpan) {
                        const span = $el('span');
                        span.setAttribute('data-lolicon-index', 'true');
                        span.textContent = targetText;
                        glink.insertBefore(span, glink.firstChild);
                    } else if (glinkSpan.textContent !== targetText) {
                        glinkSpan.textContent = targetText;
                    }
                } else if (glinkSpan) {
                    glinkSpan.remove();
                }
            }
        });
    }

    /** 修改画廊缩略图大小 */
    function modifyThumbnailSizeG(items = pageItemsData) {
        console.log('LOLICON 修改画廊缩略图大小');

        const currentStatus = `${cfg.layoutEnabledG}_${cfg.zoomFactorG}`;
        const zoomFactorO = cfg.layoutEnabledG ? cfg.zoomFactorG : 1;
        const isSprite = items[0].itemsPerSprite !== 1 && items.length > 1;

        items.forEach((data, index) => {
            if (data.lastStatus === currentStatus) return;
            const {
                el,
                backgroundPositionX,
                backgroundImage,
                spriteIndex,
                itemsPerSprite,
                width,
                height,
                itemWidth,
                pageEl,
                url,
            } = data;

            const bgTotalWidth = isSprite
                ? itemWidth * itemsPerSprite
                : width;

            // 设置缩略图尺寸
            el.style.width = width * zoomFactorO + 'px';
            el.style.height = height * zoomFactorO + 'px';

            // 设置page最大宽度（便于居中）
            if (pageEl) {
                pageEl.style.maxWidth = itemWidth * zoomFactorO + 'px';
            }

            // 背景图位置、尺寸缩放
            if (!(el._largeImg instanceof Image)) {
                el.style.backgroundPosition = backgroundPositionX * zoomFactorO + 'px 0px';
                el.style.backgroundSize = !cfg.layoutEnabledG ? '' : bgTotalWidth * zoomFactorO + 'px auto';
            }

            bindThumbHoverZoom(data);
            data.lastStatus = currentStatus;
        });
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 6. 缩略图悬浮放大
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 全局状态与常量定义 */
    const PREVIEW_MARGIN = 12; // 预览框距离窗口边缘的最小间距
    let hoverTimer = null; // 悬浮延迟用的定时器
    let previewLink = null;
    let preview = null;
    let previewShimmer = null;
    let previewImg = null;

    /** 预览状态管理 */
    const previewState = {
        active: false, // 是否显示预览
        el: null, // 当前缩略图元素
        data: null, // 关联的数据对象
        scale: 1, // 当前缩放比例
        bw: 0, // 基础宽度
        bh: 0, // 基础高度
        isDragging: false, // 是否处于拖动状态
    };

    /** 预览 DOM 初始化（只执行一次） */
    function initPreviewDOM() {
        if (preview) return;

        previewLink = $el('a');
        previewLink.id = 'lolicon-preview-link';
        document.body.appendChild(previewLink);

        preview = $el('div');
        preview.id = 'lolicon-preview';
        preview.innerHTML = '<div class="lolicon-loading-shimmer"></div><img>';// 用于大图替换、显示
        previewShimmer = preview.querySelector('.lolicon-loading-shimmer');
        previewImg = preview.querySelector('img');
        previewLink.appendChild(preview);

        // 绑定预览框上的全局事件（只需绑定一次）
        preview.addEventListener('wheel', handleWheel, { passive: false }); // 滚轮缩放
        preview.addEventListener('pointerdown', handlePointerDown); // 拖拽
        preview.addEventListener('click', handleClick); // 防误点
        preview.addEventListener('pointerleave', hidePreview); // 鼠标离开关闭
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePreview(); }); // ESC 关闭
    }

    /** 平衡预览框位置，确保不超出窗口边界 */
    function balancePosition(rectPos, rectSize, previewSize, windowSize) {
        let pos = rectPos + rectSize / 2 - previewSize / 2;
        const maxPos = windowSize - previewSize - PREVIEW_MARGIN;
        if (previewSize + 2 * PREVIEW_MARGIN > windowSize) {
            return (windowSize - previewSize) / 2;
        }
        return Math.max(PREVIEW_MARGIN, Math.min(pos, maxPos));
    }

    /** 计算并更新预览框的几何属性（尺寸与位置），并返回计算结果 */
    function updatePreviewGeometry(wheelEvent = null) {
        if (!previewState.active) return;

        const { bw, bh, scale, el, isDragging } = previewState;
        let pw, ph, left, top;

        if (pageInfo.listDisplayMode === 't' && cfg.layoutEnabledL && cfg.squareMode && bw > bh) {
            ph = bw * scale;
            pw = (el._largeImg instanceof Image)
                ? ph * el._largeImg.naturalWidth / el._largeImg.naturalHeight
                : ph * bw / bh;
        } else {
            pw = bw * scale;
            ph = (el._largeImg instanceof Image)
                ? pw * el._largeImg.naturalHeight / el._largeImg.naturalWidth
                : bh * scale;
        }

        // 计算预览框位置
        if (isDragging && wheelEvent) {
            // 拖动后缩放：以鼠标为中心
            const rect = preview.getBoundingClientRect();
            const ow = parseFloat(preview.style.width);
            const oh = parseFloat(preview.style.height);
            left = rect.left - (wheelEvent.clientX - rect.left) * (pw / ow - 1);
            top = rect.top - (wheelEvent.clientY - rect.top) * (ph / oh - 1);
        } else {
            // 默认：以缩略图为中心
            const rect = el.getBoundingClientRect();
            left = balancePosition(rect.left, rect.width, pw, window.innerWidth);
            top = balancePosition(rect.top, rect.height, ph, window.innerHeight);
        }

        // 应用预览框尺寸和位置并显示
        preview.style.width = pw + 'px';
        preview.style.height = ph + 'px';
        preview.style.left = left + 'px';
        preview.style.top = top + 'px';

        return { pw, ph, left, top };
    }

    /** 渲染预览框位置和内容，支持缩放与大图加载 */
    function renderPreview(loadLarge = true, wheelEvent = null) {
        if (!previewState.active) return;

        const { bw, bh, scale, el, isDragging } = previewState;
        const { pw } = updatePreviewGeometry(wheelEvent);

        preview.style.display = 'block';
        enablePanelTop(preview);

        // 图片显示逻辑
        if (el._largeImg instanceof Image) {
            // 已缓存大图
            previewImg.src = el._largeImg.src;
            previewImg.style.display = 'block';
        } else {
            // 先显示缩略图背景
            previewImg.style.display = 'none';
            previewImg.src = '';
            applyThumbnailStyle(scale, pw);

            // 再异步加载大图
            if (cfg.hoverLoadLargeImage && loadLarge) {
                handleLargeImageLoading();
            }
        }
    }

    /** 设置预览框缩略图背景样式，支持列表页和画廊页 */
    function applyThumbnailStyle(scale, pw) {
        const {
            bw,
            data: {
                zoomFactorO,
                img,
                backgroundImage,
                backgroundPositionX,
                itemsPerSprite,
                itemWidth,
            },
        } = previewState;

        if (pageInfo.listDisplayMode === 't') {
            // 列表页：直接用缩略图作为背景
            preview.style.backgroundImage = `url("${img.src}")`;
            preview.style.backgroundSize = pw + 'px auto';
        } else if (pageInfo.isGalleryPage) {
            // 图库页：需要还原 zoomFactorO 的缩放影响
            const bgTotalWidth = (pageItemsData[0].itemsPerSprite !== 1 && pageItemsData.length > 1)
                ? itemWidth * itemsPerSprite * zoomFactorO
                : bw;

            preview.style.backgroundImage = backgroundImage;
            preview.style.backgroundSize = bgTotalWidth * scale + 'px auto';
            preview.style.backgroundPosition = backgroundPositionX * zoomFactorO * scale + 'px 0px';
        }
    }

    /** 异步获取原图 URL (此处消耗配额)*/
    async function fetchLargeImage(pageUrl) {
        const parser = new DOMParser();
        let depth = 0;
        const getDoc = async (url) => {
            const res = await queuedFetch(url, {
                credentials: 'include',
                q_priority: depth++,
            });
            if (!res.ok) throw new Error();
            return parser.parseFromString(await res.text(), 'text/html');
        };

        try {
            let url = pageUrl;
            let doc = await getDoc(url);

            // 如果是列表页模式，先跳转到图片页面
            if (pageInfo.listDisplayMode === 't') {
                if (pageInfo.isEhentai) {
                    const retry = doc.querySelector('a[href*="nw=session"]')?.href; // R18G
                    if (retry) doc = await getDoc(retry);
                }
                url = doc.querySelector('#gdt a')?.href;
                if (!url) return null;
                doc = await getDoc(url);
            }

            const img = doc.querySelector('#img');
            if (!img?.src) return null;

            const loadFail = doc.querySelector("#loadfail");
            const match = loadFail?.getAttribute("onclick")?.match(/nl\('([^']+)'\)/);

            let retryUrl = null;
            if (match && match[1]) {
                const u = new URL(url);
                u.searchParams.append("nl", match[1]);
                retryUrl = u.href;
            }

            return {
                src: img.src,
                retryUrl,
            };
        } catch {
            return null;
        }
    }

    /** 异步加载大图并替换预览框和缩略图 */
    function handleLargeImageLoading() {
        const { data: { url }, el } = previewState;
        if (el._largeImg) return;

        previewShimmer.style.display = 'block';
        if (el._isFetching) return;
        el._isFetching = true;

        let retryCount = 0;

        fetchLargeImage(url).then((data) => {
            if (!data?.src) {
                finishFail();
                return;
            }
            loadImage(data.src, data.retryUrl);
        });

        function loadImage(src, retryUrl = null) {
            const preImg = new Image();

            preImg.onload = () => {
                el._largeImg = preImg; // 缓存到元素上
                el._isFetching = false;

                // 预览框还在显示时更新大图
                if (previewState.active && previewState.el === el) {
                    previewShimmer.style.display = 'none';
                    updatePreviewGeometry();
                    previewImg.src = preImg.src;

                    const showImg = () => {
                        if (previewState.el === el) previewImg.style.display = 'block';
                    };

                    if (previewImg.decode) {
                        previewImg.decode().then(showImg).catch(showImg);
                    } else {
                        showImg();
                    }
                }

                // 替换页面上的缩略图
                if (pageInfo.listDisplayMode === 't') {
                    el.src = preImg.src;
                    if (!cfg.layoutEnabledL) {
                        el.style.width = '100%';
                        el.style.height = 'auto';
                    }
                } else if (pageInfo.isGalleryPage) {
                    el.style.backgroundImage = `url("${preImg.src}")`;
                    el.style.backgroundSize = '100% auto';
                    el.style.backgroundPosition = 'center';
                }
            };

            preImg.onerror = async () => {
                if (retryUrl && retryCount < 2) {
                    retryCount++;

                    try {
                        console.log(`LOLICON 加载大图失败: ${retryCount * 600}ms 后第 ${retryCount} 次尝试换源重试...\n`, retryUrl);
                        await new Promise((r) => setTimeout(r, retryCount * 600)); // 稍后重试

                        const retryData = await fetchLargeImage(retryUrl);

                        if (retryData?.src) {
                            loadImage(retryData.src, retryData.retryUrl);
                            return;
                        }
                    } catch { }
                }
                finishFail();
            };

            preImg.src = src;
        }

        function finishFail() {
            el._largeImg = null;
            el._isFetching = false;
            previewShimmer.style.display = 'none';
        }
    }

    /** 初始化悬浮预览并计算缩放参数 */
    function startHover(thumbEl, data) {
        // 初始化 DOM（只创建一次）
        if (!preview) initPreviewDOM();

        clearTimeout(hoverTimer); // 清除上一次定时器
        previewLink.href = data.url; // 设置预览链接
        previewState.active = true;
        previewState.el = thumbEl;
        previewState.isDragging = false;

        hoverTimer = setTimeout(() => {
            // 计算基础参数
            const { originalGl3tWidth, width, height, img } = data;
            let zoomFactorO = 1;
            let widthO = width;
            let heightO = height;
            if (pageInfo.listDisplayMode === 't') {
                if (cfg.layoutEnabledL) {
                    if (cfg.squareMode && originalGl3tWidth < 250) {
                        zoomFactorO = cfg.zoomFactorT * 250 / originalGl3tWidth;
                    } else {
                        zoomFactorO = cfg.zoomFactorT;
                    }
                }
                // 缓存自然宽高
                if (!thumbEl._thumbBaseWidth || !thumbEl._thumbBaseHeight) {
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        thumbEl._thumbBaseWidth = img.naturalWidth;
                        thumbEl._thumbBaseHeight = img.naturalHeight;
                    }
                }
                widthO = thumbEl._thumbBaseWidth;
                heightO = thumbEl._thumbBaseHeight;
            } else if (cfg.layoutEnabledG && pageInfo.isGalleryPage) {
                zoomFactorO = cfg.zoomFactorG;
            }

            // 更新全局预览状态
            previewState.data = { ...data, zoomFactorO }; // 注入计算出的 zoomFactorO
            previewState.scale = cfg.hoverScale;
            previewState.bw = widthO * zoomFactorO;
            previewState.bh = heightO * zoomFactorO;

            renderPreview();
        }, cfg.hoverDelay * 1000); // 延迟渲染预览
    }

    /** 隐藏放大预览并重置状态 */
    function hidePreview() {
        clearTimeout(hoverTimer); // 清除悬浮延迟
        previewState.active = false; // 标记预览已关闭

        if (preview) {
            preview.style.display = 'none';
            preview.style.backgroundImage = 'none';
            previewShimmer.style.display = 'none';
            if (previewImg) previewImg.src = '';
        }

        // 恢复缩略图状态标记
        if (previewState.el) {
            previewState.el = null;
        }
    }

    /** 处理预览框滚轮缩放 */
    function handleWheel(e) {
        if (preview.style.display !== 'block') return; // 未显示时忽略
        e.preventDefault(); // 阻止页面滚动

        const SCALE_STEP = 1.2;
        previewState.scale *= e.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP;

        // 限制最大缩放
        const { bw, bh } = previewState;
        const maxScaleWidth = (window.innerWidth * 6) / bw;
        const maxScaleHeight = (window.innerHeight * 6) / bh;
        const maxScale = Math.max(maxScaleWidth, maxScaleHeight);

        previewState.scale = Math.max(1, Math.min(maxScale, previewState.scale));

        renderPreview(false, e); // 更新预览，传入 event 用于以鼠标为中心缩放
    }

    /** 阻止拖动时误触点击 */
    function handleClick(e) {
        if (previewState.isDragging) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    /** 处理预览框鼠标按下，用于拖拽 */
    function handlePointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // 鼠标只响应左键，触控默认通过
        e.preventDefault();
        preview.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseFloat(preview.style.left);
        const startTop = parseFloat(preview.style.top);

        previewState.isDragging = false; // 拖拽标记重置

        function onPointerMove(ev) {
            const deltaX = ev.clientX - startX;
            const deltaY = ev.clientY - startY;

            // 如果尚未激活拖拽，检查位移是否超过阈值
            if (!previewState.isDragging) {
                if (Math.hypot(deltaX, deltaY) < 6) return;

                previewState.isDragging = true;
            }

            preview.style.left = startLeft + deltaX + 'px';
            preview.style.top = startTop + deltaY + 'px';
        }

        function onPointerUp(ev) {
            preview.releasePointerCapture(ev.pointerId);
            preview.removeEventListener('pointermove', onPointerMove);
            preview.removeEventListener('pointerup', onPointerUp);
            preview.removeEventListener('pointercancel', onPointerUp);
        }

        preview.addEventListener('pointermove', onPointerMove); // 绑定拖拽
        preview.addEventListener('pointerup', onPointerUp); // 释放拖拽
        preview.addEventListener('pointercancel', onPointerUp);
    }

    /** 绑定缩略图悬浮放大功能到单个缩略图 */
    function bindThumbHoverZoom(data) {
        const { el, img } = data;

        let thumbEl;
        if (pageInfo.listDisplayMode === 't') {
            thumbEl = img;
        } else if (pageInfo.isGalleryPage) {
            thumbEl = el;
        }

        // 无元素或已绑定则跳过
        if (!thumbEl || thumbEl.getAttribute('data-lolicon-bound')) return;
        thumbEl.setAttribute('data-lolicon-bound', 'true');

        // 悬浮显示大图
        thumbEl.addEventListener('pointerenter', () => {
            if (!cfg.thumbHoverZoom) return;
            startHover(thumbEl, data);
        });

        // 鼠标离开缩略图
        thumbEl.addEventListener('pointerleave', (e) => {
            clearTimeout(hoverTimer);
            // 如果去向不是预览框，且当前处于激活状态，则隐藏
            if (!preview?.contains(e.relatedTarget) && previewState.active) {
                hidePreview();
            }
        });

        // 移动取消 (仅针对触控，防止滑动网页时误弹)
        thumbEl.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch' && !previewState.active) {
                clearTimeout(hoverTimer);
            }
        });
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 7. 快捷标签
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 用于在 GM 存储中保存搜索标签数据的键名。 */
    const STORAGE_KEY = 'custom_tag';

    /** 搜索框相关对象 */
    const searchBox = {
        tags: loadTags(), // 当前所有自定义标签 [{ type, name, tag }, ...]
        permaBound: false, // 是否已完成一次性事件绑定（避免重复绑定）
        container: null, // 面板容器 DOM
        input: null, // 搜索框 DOM
        searchBtn: null, // “搜索”按钮 DOM
        clearBtn: null, // “清空”按钮 DOM
        cache: {
            tokenMap: new Map(), // 存储 Token 规范化结果
            value: null, // 记录上一次解析的文本
        },
    };

    /** 快捷标签正则集 */
    const TAG_RE = {
        TOKEN: /[^"\s]*"[^"]*"|[^\s"]+/g,
        CJK: /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/,
        PRE: /^[~-]/,
        STRUCT: /^([~-]?)([a-z]+):(.*)$/i,
    };

    /** 加载已存储标签（若不存在则写入默认初始值、旧格式迁移新格式） */
    function loadTags() {
        let data = GM_getValue(STORAGE_KEY);

        if (!data || (Array.isArray(data) && data.length === 0)) {
            data = [
                { type: 'tag', name: 'LOLI', tag: 'f:lolicon$' },
                { type: 'tag', name: 'MLP', tag: 'p:"my little pony friendship is magic$"' },
                { type: 'tag', name: '-AI', tag: '-o:"ai generated$"' },
                { type: 'tag', name: 'LOLI|SB', tag: '~f:lolicon$ ~f:"small breasts$"' }
            ];
            GM_setValue(STORAGE_KEY, data);
        } else if (!Array.isArray(data)) { // 旧对象格式迁移
            data = Object.entries(data).map(([name, tag]) =>
                tag === '_'
                    ? { type: 'break' } // 旧版 "_" 标签改为分割线
                    : { type: 'tag', name, tag }, // 普通标签
            );
            GM_setValue(STORAGE_KEY, data);
        }
        return data;
    }

    /** 将搜索字符串分割成独立的 token（标签） */
    function tokenize(str) {
        return str.match(TAG_RE.TOKEN) || [];
    }

    /** 计算字符串在等宽字体下的视觉宽度 */
    function visualWidth(str) {
        return Array.from(str).reduce((w, ch) => w + (TAG_RE.CJK.test(ch) ? 2 : 1), 0);
    }

    /** 快捷标签面板 */
    function quickTagPanel() {
        const panel = $i('lolicon-tag-panel');
        if (pageInfo.isFavoritesPage) {
            searchBox.input = $('form[action*="favorites.php"] input[name="f_search"]');
        } else {
            searchBox.input = $i('f_search');
        }
        if (!searchBox.input) return;
        searchBox.container = searchBox.input?.parentNode;
        searchBox.searchBtn = searchBox.input?.nextElementSibling;
        searchBox.clearBtn = searchBox.searchBtn?.nextElementSibling;
        if (!searchBox.permaBound) {
            bindPermanentEvents();
            searchBox.permaBound = true;
        }
        if (cfg.quickTag) {
            buildPanel();
            bindToggleableEvents();
        } else {
            if (panel) panel.remove();

            if (searchBox.input && searchBox.input._quickTagHandlers) {
                const { refresh, dblclick } = searchBox.input._quickTagHandlers;
                searchBox.input.removeEventListener('input', refresh);
                searchBox.input.removeEventListener('focus', refresh);
                searchBox.input.removeEventListener('click', refresh);
                searchBox.input.removeEventListener('dblclick', dblclick);
                delete searchBox.input._quickTagHandlers;
            }
            if (searchBox.clearBtn && searchBox.clearBtn._quickTagHandler) {
                searchBox.clearBtn.removeEventListener('click', searchBox.clearBtn._quickTagHandler, { capture: true });
                delete searchBox.clearBtn._quickTagHandler;
            }
        }
    }

    /** 当输入框内容发生实质变化时 刷新搜索缓存 */
    function refreshSearchCache() {
        const val = searchBox.input ? searchBox.input.value : '';
        if (searchBox.cache.value === val) {
            return searchBox.cache.tokenMap;
        }

        searchBox.cache.tokenMap = getSearchContext(val);
        searchBox.cache.value = val;
        return searchBox.cache.tokenMap;
    }

    /** 构建搜索标签按钮面板并将其插入到页面中 */
    function buildPanel() {
        let panel = $i('lolicon-tag-panel');
        if (panel) panel.remove(); // 如果面板已存在，先移除，用于刷新

        panel = $el('div');
        panel.id = 'lolicon-tag-panel';

        const fragment = document.createDocumentFragment();

        // 遍历搜索标签对象，为每个条目创建一个按钮
        searchBox.tags.forEach((item, index) => {
            const btn = $el('input');
            btn.type = 'button';
            btn.dataset.index = index; // 存储索引供事件代理使用

            if (item.type === 'break') {
                btn.value = '↵';
                btn.dataset.type = 'break';
                fragment.append(btn, $el('br'));
            } else {
                btn.value = item.name; // 按钮上显示的文本
                btn.dataset.type = 'tag';
                btn.title = item.tag; // 鼠标悬停时显示的完整标签
                btn.draggable = true; // 开启拖拽
                fragment.append(btn);
            }
        });

        // 创建“管理”按钮
        const addBtn = $el('input');
        addBtn.type = 'button';
        addBtn.value = '+';
        addBtn.dataset.type = 'manage';
        fragment.append(addBtn);

        panel.append(fragment);

        // 点击处理
        panel.addEventListener('click', (e) => {
            const target = e.target;
            if (target.type !== 'button') return;

            if (target.dataset.type === 'tag') {
                toggleTag(target.title);
            } else if (target.dataset.type === 'manage') {
                showManagePanel();
            }
        });

        // 滚轮处理
        panel.addEventListener('wheel', (e) => {
            const target = e.target;
            if (target.type === 'button' && target.title) {
                e.preventDefault();
                handleTagWheel(e, target.title);
            }
        }, { passive: false });

        // 右键处理
        panel.addEventListener('contextmenu', (e) => {
            const target = e.target;
            if (target.type === 'button') {
                e.preventDefault();
                showManagePanel(target.dataset.index ? parseInt(target.dataset.index) : undefined);
            }
        });

        searchBox.container.append(panel);
        updateActiveStyles();
        enableDragSort(panel);
    }

    /** 绑定可开关的事件：input 和 clearBtn 为页面上的相关元素绑定事件监听器 */
    function bindToggleableEvents() {
        if (searchBox.input && !searchBox.input._quickTagHandlers) {
            const refresh = () => updateActiveStyles();
            searchBox.input.addEventListener('input', refresh);
            searchBox.input.addEventListener('focus', refresh);
            searchBox.input.addEventListener('click', refresh);
            searchBox.input.addEventListener('dblclick', selectTokenByDoubleClick);

            searchBox.input._quickTagHandlers = { refresh, dblclick: selectTokenByDoubleClick };
        }

        if (searchBox.clearBtn && !searchBox.clearBtn._quickTagHandler) {
            const listener = (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                searchBox.input.value = '';
                searchBox.input.dispatchEvent(new Event('input', { bubbles: true }));
                if (inputDevice === 'mouse') searchBox.input.focus();
            };
            searchBox.clearBtn.addEventListener('click', listener, { capture: true });
            searchBox.clearBtn._quickTagHandler = listener;
        }
    }

    /** 绑定永久事件：搜索按钮和分类元素绑定事件监听器 */
    function bindPermanentEvents() {
        // 设置搜索按钮 title 提示
        if (searchBox.searchBtn) {
            searchBox.searchBtn.title = translate('openSearchInNewTab');
        }

        // 使用事件代理绑定搜索按钮的右键和 Ctrl+点击
        if (searchBox.container) {
            searchBox.container.addEventListener('contextmenu', function (e) {
                if (e.target.matches('[type="submit"][value="Search"]')) {
                    e.preventDefault();
                    openInNewTab();
                }
            });

            searchBox.container.addEventListener('click', function (e) {
                if (e.target.matches('[type="submit"][value="Search"]') && e.ctrlKey) {
                    e.preventDefault();
                    openInNewTab();
                }
            });
        }

        // 绑定分类元素的右键事件
        const categories = $$('table.itc div.cs[id^="cat_"]');
        if (categories.length > 0) {
            categories.forEach((el) => {
                el.addEventListener('contextmenu', function (e) {
                    e.preventDefault(); // 阻止默认右键菜单

                    categories.forEach((other) => {
                        if (other !== el && !other.getAttribute('data-disabled')) {
                            other.onclick();
                        }
                    });

                    if (el.getAttribute('data-disabled')) {
                        el.onclick();
                    }
                });
            });
        }
    }

    /** 标准化标签：将所有全拼命名空间统一转换为 EH 缩写，以便等效比较 */
    function normalizeToken(token) {
        // 匹配：可选的修饰符(~或-) + 命名空间(字母) + 冒号 + 剩余标签内容
        const match = token.match(TAG_RE.STRUCT);
        if (match) {
            const modifier = match[1]; // 如 "~" 或 "-"
            const ns = match[2].toLowerCase(); // 如 "female" 或 "f"
            const rest = match[3]; // 如 "lolicon$" 或 '"small breasts$"'

            // 如果该命名空间在映射表中有对应缩写（如 female -> f），则转换；否则保持原样
            const nsAbbr = tag_nsMap[ns] || ns;
            return `${modifier}${nsAbbr}:${rest}`;
        }
        return token; // 如果不是带命名空间的标签，则直接返回原字符串
    }

    /** 解析搜索内容并返回状态 Map */
    function getSearchContext(value) {
        const tokens = tokenize(value);
        const map = new Map();

        for (const t of tokens) {
            // 提取核心词（去除前缀修饰符）
            const core = normalizeToken(t).replace(TAG_RE.PRE, '');

            // 确定状态：1:正常, 2:或(~), 3:排除(-)
            let state = 1;
            if (t.startsWith('~')) state = 2;
            else if (t.startsWith('-')) state = 3;
            map.set(core, state);
        }
        return map;
    }

    /** 获取标签当前状态：0:无, 1:正常, 2:或(~), 3:排除(-), 4:全在但符号不一 */
    function getTagState(tag, inputMap) {
        if (!searchBox.input || !inputMap || inputMap.size === 0) return 0;

        const btnTokens = tokenize(tag);
        const states = btnTokens.map((bt) => {
            const core = normalizeToken(bt).replace(TAG_RE.PRE, '');
            return inputMap.get(core) || 0;
        });

        // 只要有一个标签不存在 (0)，整个按钮就视为未激活 (0)
        if (states.includes(0)) return 0;

        // 全部都在，检查符号是否统一
        const firstState = states[0];
        const isAllSame = states.every((s) => s === firstState);
        return isAllSame ? firstState : 4; // 符号不统一返回 4
    }

    /** 根据当前搜索框的内容，更新所有搜索标签按钮边框样式 */
    function updateActiveStyles() {
        const panel = $i('lolicon-tag-panel');
        if (!panel || !searchBox.input) return;

        const inputMap = refreshSearchCache();

        // 批量更新按钮样式（除了'+''↵'按钮）
        const btns = panel.querySelectorAll('input[type="button"]');
        for (const btn of btns) {
            if (!btn.title) continue;

            const state = getTagState(btn.title, inputMap);

            btn.classList.toggle('lolicon-tag-active', state === 1);
            btn.classList.toggle('lolicon-tag-or', state === 2);
            btn.classList.toggle('lolicon-tag-exclusion', state === 3);
            btn.classList.toggle('lolicon-tag-mixed', state === 4);
        }
    }

    /** 处理搜索标签按钮的点击事件，在搜索框中添加或移除对应的标签 */
    function toggleTag(tag) {
        if (!searchBox.input) return;

        // 获取按钮代表的标签集合（可能有多个词），并进行标准化处理
        const btnTokens = tokenize(tag);
        const btnNorms = btnTokens.map((t) => normalizeToken(t).replace(TAG_RE.PRE, ''));
        // 获取输入框现有的所有标签，并进行标准化处理
        let inputTokens = tokenize(searchBox.input.value);
        const inputNorms = inputTokens.map((t) => normalizeToken(t).replace(TAG_RE.PRE, ''));

        // 只有当按钮的【所有词】都在输入框内时，才执行删除；否则补全缺失的词
        const allExists = btnNorms.every((bn) => inputNorms.includes(bn));

        if (allExists) {
            inputTokens = inputTokens.filter((inTok) => {
                const inNorm = normalizeToken(inTok).replace(TAG_RE.PRE, '');
                return !btnNorms.includes(inNorm);
            }); // 删除标签
        } else {
            btnTokens.forEach((bt) => {
                const btNorm = normalizeToken(bt).replace(TAG_RE.PRE, '');
                if (!inputNorms.includes(btNorm)) inputTokens.push(bt);
            }); // 添加标签
        }

        searchBox.input.value = inputTokens.join(' ').trim(); // 更新输入框
        // 触发 input 事件以通知其他监听器（包括 updateActiveStyles）
        searchBox.input.dispatchEvent(new Event('input', { bubbles: true }));
        if (inputDevice === 'mouse') searchBox.input.focus();
    }

    /** 处理搜索标签按钮的滚轮事件，切换标签状态 */
    function handleTagWheel(e, tag) {
        e.preventDefault();
        if (!searchBox.input) return;

        const tokens = tokenize(searchBox.input.value);
        const inputMap = refreshSearchCache();

        let currentState = getTagState(tag, inputMap);
        if (currentState === 0) currentState = 1;

        const nextState = e.deltaY < 0
            ? (currentState % 3) + 1
            : ((currentState - 2 + 3) % 3) + 1;

        const btnTokens = tokenize(tag);
        const targetMap = new Map();
        btnTokens.forEach((bt) => {
            const base = bt.replace(TAG_RE.PRE, '');
            let final;
            if (nextState === 1) final = base;
            else if (nextState === 2) final = `~${base}`;
            else if (nextState === 3) final = `-${base}`;
            targetMap.set(normalizeToken(base), final);
        });

        // 遍历输入框，如果匹配到核心词，就地替换
        const matchedNorms = new Set();
        const nextInputTokens = tokens.map((inTok) => {
            const inNorm = normalizeToken(inTok).replace(TAG_RE.PRE, '');
            if (targetMap.has(inNorm)) {
                matchedNorms.add(inNorm);
                return targetMap.get(inNorm); // 替换成带新前缀的词
            }
            return inTok; // 不相关的词保持原样
        });

        // 如果按钮里有些词在输入框里原本不存在，则推入末尾
        targetMap.forEach((finalValue, normKey) => {
            if (!matchedNorms.has(normKey)) nextInputTokens.push(finalValue);
        });

        searchBox.input.value = nextInputTokens.join(' ').trim();
        searchBox.input.dispatchEvent(new Event('input', { bubbles: true }));
        if (inputDevice === 'mouse') searchBox.input.focus();
    }

    /** 显示用于编辑所有搜索标签的管理面板（模态框） */
    function showManagePanel(targetIndex) {
        $i('lolicon-tag-manage-panel')?.remove();

        const panel = $el('div');
        panel.id = 'lolicon-tag-manage-panel';
        const header = $el('div');
        header.id = 'lolicon-tag-manage-header';
        header.textContent = translate('quickTag');
        const ta = $el('textarea');
        ta.id = 'lolicon-tag-manage-textarea';

        // 计算最长的按钮名视觉宽度，用于对齐
        const maxW = Math.max(...searchBox.tags.map((t) => visualWidth(t.name || '')), 0);
        // 将 tags 对象格式化为易于编辑的文本
        const lines = searchBox.tags.map((t) => {
            if (t.type === 'break') return '_'; // break 行显示为 _
            const padding = ' '.repeat(maxW - visualWidth(t.name));
            return `${t.name}${padding}  @  ${t.tag}`;
        });
        ta.value = lines.join('\n') + '\n';

        // 创建包含“保存”和“取消”按钮的工具栏
        const bar = $el('div');
        bar.id = 'lolicon-tag-manage-footer';

        const btnSave = $el('input');
        btnSave.type = 'button';
        btnSave.value = translate('save');
        btnSave.id = 'lolicon-tag-manage-save';
        btnSave.addEventListener('click', saveTags);

        const btnCancel = $el('input');
        btnCancel.type = 'button';
        btnCancel.value = translate('cancel');
        btnCancel.id = 'lolicon-tag-manage-cancel';
        btnCancel.addEventListener('click', () => panel.remove()); // 取消按钮直接移除面板

        const hint = $el('div');
        hint.id = 'lolicon-tag-manage-hint';
        hint.textContent = translate('inputFormatHint');
        const btnBox = $el('div');
        btnBox.id = 'lolicon-tag-manage-buttons';
        btnBox.append(btnSave, btnCancel);
        bar.append(hint, btnBox);

        panel.append(header, ta, bar);
        document.body.append(panel);
        enablePanelTop(panel);
        enablePanelDrag(panel);

        // 防止触发全局快捷键
        panel.addEventListener('keydown', (e) => {
            e.stopPropagation();
        }, true);

        // 如果传入 targetIndex，则定位到对应行并选中
        if (Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < lines.length) {
            const startPos = targetIndex > 0 ? lines.slice(0, targetIndex).join('\n').length + 1 : 0;
            const lineText = lines[targetIndex];

            ta.focus();
            ta.setSelectionRange(startPos, startPos + lineText.length);

            const lineHeight = parseInt(window.getComputedStyle(ta).lineHeight) || 18;
            ta.scrollTop = Math.max(0, targetIndex * lineHeight - (ta.clientHeight - lineHeight) / 2);
            return;
        }

        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        ta.scrollTop = ta.scrollHeight;
    }

    /** 解析管理面板文本框中的内容，并保存新的搜索标签配置 */
    function saveTags() {
        const ta = $i('lolicon-tag-manage-textarea');
        if (!ta) return;

        const lines = ta.value.split('\n').filter((s) => s.trim()); // 按行分割并忽略空行
        const nextTags = []; // 用于存储解析后的新配置

        for (const line of lines) {
            if (line.trim() === '_') {
                nextTags.push({ type: 'break' });
                continue;
            }

            const parts = line.split('@').map((s) => s.trim());
            const name = parts[0];
            const tag = parts[1] || parts[0];

            if (!name || !tag || parts.length > 2) {
                alert(translate('invalidInput') + line);
                return;
            }
            if (((name.split('"').length - 1) % 2) || ((tag.split('"').length - 1) % 2)) {
                alert(translate('unmatchedQuotes') + line);
                return;
            }
            if (nextTags.some((t) => t.type === 'tag' && t.name === name)) {
                alert(translate('duplicateName') + name);
                return;
            }

            nextTags.push({ type: 'tag', name, tag });
        }

        searchBox.tags = nextTags;
        GM_setValue(STORAGE_KEY, searchBox.tags);
        $i('lolicon-tag-manage-panel')?.remove();
        buildPanel();
    }

    /** 启用标签按钮拖拽排序 */
    function enableDragSort(panel) {
        let dragging = null;

        panel.querySelectorAll('input[type="button"]').forEach((btn) => {
            if (btn.dataset.type === 'manage') return; // "+" 不参与排序

            btn.draggable = true;

            btn.addEventListener('dragstart', (e) => {
                dragging = btn;
                e.dataTransfer.effectAllowed = 'move';
                btn.classList.add('dragging');
            });

            btn.addEventListener('dragend', () => {
                dragging = null;
                btn.classList.remove('dragging');
                saveOrderFromPanel(panel);
            });

            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!dragging || dragging === btn) return;

                const rect = btn.getBoundingClientRect();
                const before = (e.clientX - rect.left) < rect.width / 2;

                if (before) {
                    panel.insertBefore(dragging, btn);
                } else {
                    panel.insertBefore(dragging, btn.nextSibling);
                }
            });
        });
    }

    /** 从排序后的 panel 元素重新生成 tags 并保存 */
    function saveOrderFromPanel(panel) {
        const newOrder = [];
        panel.querySelectorAll('input[type="button"]').forEach((btn) => {
            if (btn.dataset.type === 'manage') return;
            const index = Number(btn.dataset.index);
            const item = searchBox.tags[index];
            if (item) newOrder.push(item);
        });

        searchBox.tags = newOrder;
        GM_setValue(STORAGE_KEY, newOrder);

        buildPanel(); // 刷新 UI
    }

    /** 处理搜索框的双击事件，选中光标所在位置的完整 token */
    function selectTokenByDoubleClick(e) {
        const input = e.target;
        const value = input.value;
        const cursor = input.selectionStart ?? 0; // 获取当前光标位置
        const items = tokenize(value);

        let searchFrom = 0;
        for (const item of items) {
            const start = value.indexOf(item, searchFrom);
            const end = start + item.length;
            // 判断光标是否在该 token 的范围内
            if (cursor >= start && cursor < end) {
                input.setSelectionRange(start, end); // 选中该 token
                break;
            }
            searchFrom = end;
        }
    }

    /** 根据当前表单内容构建 URL，并在新标签页中打开 */
    function openInNewTab() {
        // 找到输入框所在的表单
        const form = searchBox.input?.form;
        if (!form) return;

        // 使用表单的 action 属性和当前页面地址来构建一个完整的 URL
        const url = new URL(form.action, window.location.origin);

        // 遍历表单中的所有元素，将它们的值添加到 URL 的查询参数中
        Array.from(form.elements).forEach((el) => {
            // 忽略没有 name、被禁用、值为空或为0的元素
            if (!el.name || el.disabled) return;
            const v = el.value;
            if (v == null || v === '' || v === '0') return;
            // 对于复选框和单选框，只添加被选中的
            if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;

            url.searchParams.set(el.name, v);
        });

        window.open(url, '_blank');
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 8. 画廊标签搜索
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 画廊搜索框模板（复刻 EH 原生结构） */
    const G_SEARCH_HTML = /* html */ `
        <h1 class="ih"></h1><div id="searchbox" class="idi"><form method="get" style="margin:0px; padding:0px">
        <input type="hidden" id="f_cats" name="f_cats" value="0">
        <table class="itc"><tbody><tr>
        <td><div id="cat_2" class="cs ct2">Doujinshi</div></td>
        <td><div id="cat_4" class="cs ct3">Manga</div></td>
        <td><div id="cat_8" class="cs ct4">Artist CG</div></td>
        <td><div id="cat_16" class="cs ct5">Game CG</div></td>
        <td><div id="cat_512" class="cs cta">Western</div></td>
        </tr><tr>
        <td><div id="cat_256" class="cs ct9">Non-H</div></td>
        <td><div id="cat_32" class="cs ct6">Image Set</div></td>
        <td><div id="cat_64" class="cs ct7">Cosplay</div></td>
        <td><div id="cat_128" class="cs ct8">Asian Porn</div></td>
        <td><div id="cat_1" class="cs ct1">Misc</div></td>
        </tr></tbody></table>
        <div><input type="text" id="f_search" name="f_search" placeholder="Search Keywords" size="90" maxlength="200"><input type="submit" value="Search"><input type="button" value="Clear"></div>
        <div>[<a href="#" id="adv_toggle">Show Advanced Options</a>]</div>
        <div id="advdiv" style="display: none;"></div></form></div>
    `;

    /** 画廊搜索框高级选项模板 */
    const G_SEARCH_ADV_HTML = /* html */ `
        <input type="hidden" id="advsearch" name="advsearch" value="1">
        <div class="searchadv"><div>
        <div><label class="lc"><input type="checkbox" name="f_sh"><span></span> Browse Expunged Galleries</label></div>
        <div><label class="lc"><input type="checkbox" name="f_sto"><span></span> Require Gallery Torrent</label></div>
        </div><div>
        <div>Between <input type="text" id="f_spf" name="f_spf" size="4" maxlength="4" style="width:30px"> and <input type="text" id="f_spt" name="f_spt" size="4" maxlength="4" style="width:30px"> pages</div>
        <div>Minimum Rating: <select id="f_srdd" name="f_srdd"><option value="0">Any Rating</option><option value="2">2 Stars</option><option value="3">3 Stars</option><option value="4">4 Stars</option><option value="5">5 Stars</option></select></div>
        </div><div>
        <div>Disable custom filters for:</div>
        <div><label class="lc"><input type="checkbox" name="f_sfl"><span></span> Language</label></div>
        <div><label class="lc"><input type="checkbox" name="f_sfu"><span></span> Uploader</label></div>
        <div><label class="lc"><input type="checkbox" name="f_sft"><span></span> Tags</label></div>
        </div></div>
    `;

    /** 标签解析器 */
    const tagTokenFromHref = (href) => {
        if (!href) return null;

        // 从 href 提取标签 命名空间:标签名
        const match = href.match(/\/tag\/([^:]+):(.+)$/);
        if (!match) return null;
        const nsAbbr = tag_nsMap[match[1]] || match[1]; // 映射为 EH 搜索缩写
        let tagName = decodeURIComponent(match[2].replace(/\+/g, ' ')); // + 转空格

        // 如果 tagName 包含空格，用双引号括起来并把 $ 放入引号内
        return /\s/.test(tagName)
            ? `${nsAbbr}:"${tagName}$"`
            : `${nsAbbr}:${tagName}$`;
    };

    /** 画廊标签交互处理 (单击 滚动) */
    const tagInteractG = (e) => {
        const tagList = $i('taglist');
        const a = e.target.closest('a');
        if (!a || !tagList || !tagList.contains(a)) return;

        // 获取原始路径
        const tagToken = tagTokenFromHref(a.getAttribute('href'));
        if (!tagToken) return;

        e.preventDefault();
        $i('toppane').style.display = 'block';

        if (e.type === 'click') {
            toggleTag(tagToken);
        } else if (e.type === 'wheel') {
            handleTagWheel(e, tagToken);
        }
    };

    /** 构建并插入一个搜索框到画廊详情页 */
    function tagSearchG() {
        const tagList = $i('taglist');

        if (cfg.tagSearchG && !$i('toppane')) {
            // 创建搜索容器
            const searchContainer = $el('div');
            searchContainer.id = 'toppane';
            searchContainer.style.display = 'none'; // 默认隐藏，点击标签时再显示

            const gLeft = $i('gleft');
            gLeft.parentNode.insertBefore(searchContainer, gLeft); // 插入到 #gleft 前方，使搜索框位于页面顶部合适位置
            gLeft.style.top = 'unset'; // 修正封面 #gleft 定位

            // 注入 HTML
            searchContainer.innerHTML = G_SEARCH_HTML;
            searchContainer.querySelector('form').action = window.location.origin + '/';

            // 为所有分类按钮绑定点击事件（位掩码控制 f_cats）
            searchContainer.querySelectorAll('[id^="cat_"]').forEach((el) => {
                const id = parseInt(el.id.replace('cat_', ''), 10);
                el.onclick = () => toggleCategory(id);
            });

            // 防止触发全局快捷键
            searchContainer.addEventListener('keydown', (e) => {
                e.stopPropagation();
            }, true);

            // 高级选项 Advanced Options 展开/收起逻辑
            const advToggle = $i('adv_toggle');
            const advDiv = $i('advdiv');
            advToggle.onclick = (e) => {
                if (advDiv.style.display === 'none') {
                    advDiv.innerHTML = G_SEARCH_ADV_HTML;
                    advDiv.style.display = '';
                    advToggle.textContent = 'Hide Advanced Options';
                } else {
                    advDiv.innerHTML = '';
                    advDiv.style.display = 'none';
                    advToggle.textContent = 'Show Advanced Options';
                }
            };

            // 绑定标签列表事件委托
            if (tagList && !tagList.hasAttribute('data-lolicon-bound')) {
                tagList.addEventListener('click', tagInteractG);
                tagList.addEventListener('wheel', tagInteractG, { passive: false });
                tagList.setAttribute('data-lolicon-bound', 'true');
            }

        } else if (!cfg.tagSearchG && $i('toppane')) {
            // 标签列表事件解绑
            if (tagList && tagList.hasAttribute('data-lolicon-bound')) {
                tagList.removeEventListener('click', tagInteractG);
                tagList.removeEventListener('wheel', tagInteractG);
                tagList.removeAttribute('data-lolicon-bound');
            }

            // 搜索框删除
            $i('toppane').remove();
            searchBox.permaBound = false;
        }
    }

    /** 切换分类状态（EH f_cats 位掩码）*/
    function toggleCategory(id) {
        const el = $i('cat_' + id);
        const hidden = $i('f_cats');
        if (!el || !hidden) return;

        let cats = parseInt(hidden.value) || 0;

        if (el.dataset.disabled === '1') {
            // 启用该分类
            delete el.dataset.disabled;
            el.style.opacity = '1';
            cats &= ~id;
        } else {
            // 禁用该分类
            el.dataset.disabled = '1';
            el.style.opacity = '0.4';
            cats |= id;
        }
        hidden.value = cats;
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 9. 快捷收藏
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 颜色映射表，用于给不同收藏夹分配颜色 */
    const COLOR_MAP = {
        0: '#cccccc', 1: '#ff8080', 2: '#ffaa55', 3: '#ffff00', 4: '#80ff80',
        5: '#aaff55', 6: '#00ffff', 7: '#aaaaff', 8: '#cc80ff', 9: '#ff80cc',
    };

    const COLOR_MAP_B = {
        0: 'rgb(0, 0, 0)', 1: 'rgb(255, 0, 0)', 2: 'rgb(255, 170, 0)', 3: 'rgb(221, 221, 0)', 4: 'rgb(0, 136, 0)',
        5: 'rgb(153, 255, 68)', 6: 'rgb(68, 187, 255)', 7: 'rgb(0, 0, 255)', 8: 'rgb(85, 0, 136)', 9: 'rgb(238, 136, 238)',
    };

    /** 异步获取收藏夹目录列表 */
    const getFavcatList = async () => {
        let names = [];
        try {
            if (pageInfo.isFavoritesPage) {
                const icons = $$('.nosel .fp .i');
                names = [...icons].map((div) => div.title.trim());
            } else if (pageInfo.isUconfigPage) {
                names = [...$$('input[name^="favorite_"][type="text"]')].map((input) => input.value.trim());
            } else if (pageInfo.isGalleryPopupsPage) {
                const nosel = $('.nosel');
                if (nosel) {
                    names = [...nosel.querySelectorAll('div[style*="cursor:pointer"]')]
                        .map((div) => {
                            const textDiv = div.querySelector('div[style*="padding-top"]');
                            return textDiv ? textDiv.textContent.trim() : null; // 找不到就返回 null (从收藏中移除 按钮)
                        })
                        .filter(Boolean); // 去掉 null
                }
            } else {
                // 其他页面用 fetch 请求
                const res = await queuedFetch(window.location.origin + '/uconfig.php', { q_priority: 6 });
                const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
                names = [...doc.querySelectorAll('input[name^="favorite_"][type="text"]')].map((i) => i.value.trim());
            }
        } catch (error) {
            console.error('LOLICON 获取收藏夹目录列表时发生错误：', error.message);
        }
        return names;
    };

    /** 收藏夹目录 */
    let favCategoryList = [];

    /** 安全获取 localStorage */
    function safeGetLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    /** 安全设置 localStorage */
    function safeSetLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('LOLICON localStorage 写入失败', error.message);
        }
    }

    /** 异步函数：更新收藏夹目录 */
    async function updateFavcat() {
        favCategoryList = await getFavcatList();
        safeSetLocalStorage('lolicon_favcat', JSON.stringify(favCategoryList));
        console.log('LOLICON 更新收藏夹目录', favCategoryList);
    }

    /** 异步函数：初始化收藏夹列表 */
    async function initFavcat() {
        const cache = safeGetLocalStorage('lolicon_favcat');
        if (!cache) {
            await updateFavcat();
        } else {
            favCategoryList = JSON.parse(cache);
        }
    }

    /** 异步函数：发送收藏或取消收藏请求 // url: 请求地址 // add: true为收藏，false为取消收藏 // favIndex: 收藏夹编号 */
    const fetchFav = async (url, add, favIndex) => {
        try {
            // 发送POST请求，提交收藏/取消收藏参数
            const res = await queuedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: add
                    ? `favcat=${favIndex}&favnote=&apply=Add+to+Favorites&update=1`
                    : 'favcat=favdel&favnote=&update=1', // 取消收藏请求体
                credentials: 'same-origin', // 同源策略，携带cookie
                q_priority: 12,
            });

            const html = await res.text();
            // 从返回HTML中提取<script>代码（用于更新父窗口）
            const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
            if (scripts.length > 1) {
                let updateCode = scripts[1][1];
                // 去除window.opener调用和窗口关闭代码，防止影响当前页面
                updateCode = updateCode
                    .replace(/window\.opener\./g, '')
                    .replace(/window\.close\(\);?/g, '');
                new Function(updateCode)(); // 执行提取的JS代码
            }
        } catch (error) {
            console.error('LOLICON 发送收藏或取消收藏请求时发生错误：', error.message);
        }
    };

    /** 显示收藏菜单 // anchorEl: 触发菜单的锚元素，用于定位菜单位置 // favUrl: 收藏请求URL */
    function showFavMenu(anchorEl, favUrl) {
        // 移除已有的收藏菜单，避免重复显示
        const existingMenu = $('.lolicon-fav-popup-menu');
        if (existingMenu) existingMenu.remove();

        // 判断是否显示“取消收藏”菜单项
        const shouldShowRemoveItem = () => {
            if (anchorEl.id === 'gdf') {
                if (anchorEl.querySelector('div.i') === null) return false;
            } else {
                if (!anchorEl.hasAttribute('title')) return false;
            }
            return true;
        };

        const menu = $el('div');
        menu.className = 'lolicon-fav-popup-menu';
        const favGrid = $el('div');
        favGrid.className = `lolicon-fav-grid layout-${cfg.favLayout}`;

        function createMenuItem(text, color, onClick, options = {}) {
            const item = $el('div');
            item.className = 'lolicon-fav-menu-item';
            if (options.isAction) item.classList.add('lolicon-fav-action-item');

            item.textContent = text;
            item.style.color = color;
            // 将颜色通过 CSS 变量传给 hover 伪类
            item.style.setProperty('--hover-color', color);
            if (options.fontSize) item.style.fontSize = options.fontSize + 'pt';

            item.onclick = (e) => {
                e.stopPropagation();
                onClick();
                menu.remove();
            };
            return item;
        }

        // 添加收藏夹菜单项
        favCategoryList.forEach((name, idx) => {
            const label = (cfg.favLayout === 3) ? '❤' : name;
            const color = COLOR_MAP[idx] || '#fff';

            const item = createMenuItem(label, color, () => {
                fetchFav(favUrl, true, idx);
            });
            favGrid.appendChild(item);
        });
        menu.appendChild(favGrid);

        // 添加“取消收藏”和“收藏弹窗”同一行按钮
        const actionRow = $el('div');
        actionRow.style.display = 'flex';

        // 左侧：收藏弹窗
        const popupItem = createMenuItem('⭐', '#fff', () => {
            window.open(favUrl, '_blank', 'width=675, height=415');
            menu.remove();
        }, { isAction: true, fontSize: 12 });
        actionRow.appendChild(popupItem);

        // 右侧：取消收藏
        if (shouldShowRemoveItem()) {
            const removeItem = createMenuItem('❌', '#f22', () => {
                fetchFav(favUrl, false, 0);
                menu.remove();
            }, { isAction: true, fontSize: 12 });
            actionRow.appendChild(removeItem);
        }

        menu.appendChild(actionRow);

        // 插入页面并定位
        document.body.appendChild(menu);
        enablePanelTop(menu);
        const rect = anchorEl.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        let left = window.scrollX + rect.left;
        const scrollY = window.scrollY;
        let top = scrollY + rect.top - menuHeight;
        if (top < scrollY) {
            top = scrollY + rect.bottom;
        }

        menu.style.left = left + 'px';
        menu.style.top = top + 'px';

        // 关闭菜单的函数
        const closeMenu = () => {
            if (menu.parentNode) {
                menu.remove();
            }
            document.removeEventListener('pointerdown', handler);
            document.removeEventListener('contextmenu', handler);
            window.removeEventListener('resize', handler);
        };

        const handler = (e) => {
            if (e.type === 'pointerdown') {
                if (!menu.contains(e.target) && e.target !== anchorEl) {
                    closeMenu();
                }
            } else if (e.type === 'contextmenu' || e.type === 'resize') {
                closeMenu();
            }
        };

        // 绑定事件
        document.addEventListener('pointerdown', handler);
        document.addEventListener('contextmenu', handler);
        window.addEventListener('resize', handler);
    }

    /** 用 Map 存储元素对应的原始状态，支持遍历批量操作 */
    const originalStates = new Map();

    /** 点击处理 */
    const clickHandler = (e) => {
        const el = e.currentTarget;
        const favUrl = el.dataset.favUrl;

        e.stopPropagation();
        // 确保数据存在
        if (!favCategoryList || favCategoryList.length === 0) {
            initFavcat().then(() => showFavMenu(el, favUrl));
        } else {
            showFavMenu(el, favUrl);
        }
    };

    /** 替换元素原onclick事件，绑定自定义点击事件显示收藏菜单 */
    const replaceOnClick = (el, favUrl, extra = {}) => {
        const originalOnClick = el.getAttribute('onclick');

        el.dataset.favUrl = favUrl;
        el.removeAttribute('onclick');
        el.addEventListener('click', clickHandler);

        // 保存必要状态
        originalStates.set(el, { originalOnClick, ...extra });
    };

    /** 恢复元素原onclick事件、鼠标样式、取消自定义点击事件 */
    function restoreElements() {
        for (const [el, { originalOnClick, iconMarginLeft }] of originalStates) {

            // 移除点击事件监听
            el.removeEventListener('click', clickHandler);

            // 恢复 onclick 属性
            if (originalOnClick) {
                el.setAttribute('onclick', originalOnClick);
            }

            // 恢复样式类
            el.classList.remove('lolicon-fav-hover-list', 'lolicon-fav-hover-gallery', 'lolicon-fav-gdf-btn', 'lolicon-fav-gdf-btn-center');

            // 清理标记位与数据
            el.removeAttribute('data-lolicon-bound');
            delete el.dataset.favUrl;

            if (pageInfo.listDisplayMode) {

            } else if (pageInfo.isGalleryPage) {
                el.removeAttribute('style');
                // 设置 gdf 内部 div#fav div.i 的 margin-left 为 0
                const iconDiv = el.querySelector('div#fav div.i');
                if (iconDiv) {
                    iconDiv.style.marginLeft = iconMarginLeft;
                }
            }
        }
        // 从缓存中移除，防止内存泄漏
        originalStates.clear();
    }

    /** 给列表页中的元素替换点击事件，启用收藏菜单 */
    async function replaceFavClickL(items = pageItemsData) {
        if (!pageInfo.listDisplayMode) return;

        await initFavcat(); // 等待 favcat 数据就绪

        // 遍历所有匹配元素
        items.forEach((data) => {
            const el = data.el.querySelector('div[id^="posted_"]');
            if (!el || !el.onclick) return; // 无onclick则跳过
            if (el.getAttribute('data-lolicon-bound')) return;
            el.setAttribute('data-lolicon-bound', 'true');
            el.classList.add('lolicon-fav-hover-list');

            const favUrl = el.onclick.toString().match(/https.*addfav/)[0]; // 从onclick字符串提取收藏URL
            replaceOnClick(el, favUrl); // 替换点击事件绑定收藏弹窗
        });
    }

    /** 给画廊元素替换点击事件，启用收藏菜单 */
    async function replaceFavClickG() {
        await initFavcat(); // 等待 favcat 数据就绪

        // 从URL路径解析画廊ID和类型
        const matchGallery = window.location.pathname.match(/\/g\/(\d+)\/(\w+)/);
        if (!matchGallery) return;
        // 获取画廊按钮容器元素
        const gdf = $i('gdf');

        if (gdf.getAttribute('data-lolicon-bound')) return;
        gdf.setAttribute('data-lolicon-bound', 'true');

        // 调整按钮容器样式，使内容居中且无左边距，设定固定高度和半透明背景
        gdf.classList.add('lolicon-fav-gdf-btn', 'lolicon-fav-hover-gallery');

        let extra = {};
        // 设置 gdf 内部 div#fav div.i 的 margin-left 为 0
        const iconDiv = gdf.querySelector('div#fav div.i');
        if (iconDiv) {
            extra.iconMarginLeft = iconDiv.style.marginLeft;
            iconDiv.style.marginLeft = '0';
        }

        // 拼接收藏请求地址
        const favUrl = `${window.location.origin}/gallerypopups.php?gid=${matchGallery[1]}&t=${matchGallery[2]}&act=addfav`;

        replaceOnClick(gdf, favUrl, extra); // 替换点击事件绑定收藏弹窗
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 10. 加载更多
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 页面加载状态管理 */
    const nextPage = { isLoading: false, pageLink: null, isError: false, loadedCount: 1 };
    const prevPage = { isLoading: false, pageLink: null, isError: false };

    /** 观察者实例 */
    let scrollObserver = null;

    /** 提取并更新页面链接 */
    function updatePageLink(doc, direction = 'both') {
        if (direction === 'both' || direction === 'next') {
            if (pageInfo.listDisplayMode) {
                nextPage.pageLink = doc.querySelector('#dnext')?.href;
                if (nextPage.pageLink) {
                    $i('unext').href = nextPage.pageLink;
                    $i('dnext').href = nextPage.pageLink;
                }
            } else if (pageInfo.isGalleryPage) {
                nextPage.pageLink = doc.querySelector('.ptb tr:first-child td:last-child a')?.href;
                if (nextPage.pageLink) {
                    $('.ptt tr:first-child td:last-child a').href = nextPage.pageLink;
                    $('.ptb tr:first-child td:last-child a').href = nextPage.pageLink;
                }
            }
        }

        if (direction === 'both' || direction === 'prev') {
            if (pageInfo.listDisplayMode) {
                prevPage.pageLink = doc.querySelector('#dprev')?.href;
                if (prevPage.pageLink) {
                    $i('uprev').href = prevPage.pageLink;
                    $i('dprev').href = prevPage.pageLink;
                }
            } else if (pageInfo.isGalleryPage) {
                prevPage.pageLink = doc.querySelector('.ptb tr:first-child td:first-child a')?.href;
                if (prevPage.pageLink) {
                    $('.ptt tr:first-child td:first-child a').href = prevPage.pageLink;
                    $('.ptb tr:first-child td:first-child a').href = prevPage.pageLink;
                }
            }
        }
    }

    /** 无限滚动加载页面内容 */
    async function loadPage(direction = 'next') {
        const isNext = direction === 'next';
        const state = isNext ? nextPage : prevPage;
        if (state.isLoading || !state.pageLink) return;

        state.isLoading = true;
        updateLoadingStatus('loading', direction); // 显示加载中
        try {
            console.log(`LOLICON 加载${isNext ? '下' : '上'}一页：`, state.pageLink);
            const response = await queuedFetch(state.pageLink, { q_priority: 2 });
            const html = await response.text();
            const parser = new DOMParser();
            const fetchedDoc = parser.parseFromString(html, 'text/html');
            let contentNodes;
            if (pageInfo.listDisplayMode === 't') {
                contentNodes = fetchedDoc.querySelectorAll('.gl1t');
            } else if (pageInfo.listDisplayMode) {
                contentNodes = fetchedDoc.querySelectorAll('.itg > tbody > tr');
            } else if (pageInfo.isGalleryPage) {
                contentNodes = fetchedDoc.querySelectorAll('#gdt > a');
            }

            if (contentNodes.length > 0) {
                const fragment = document.createDocumentFragment();
                contentNodes.forEach((item, index) => {
                    if (pageInfo.listDisplayMode === 't' || pageInfo.listDisplayMode === 'e' || pageInfo.isGalleryPage || index > 0) {
                        fragment.appendChild(item);
                    }
                });

                const newData = pageInfo.listDisplayMode ? collectDataL(fragment, direction) : collectDataG(fragment, direction);

                isNext ? $i('lolicon-next-indicator').before(fragment) : $i('lolicon-prev-indicator').after(fragment);

                if (isNext) state.loadedCount++;
                console.log(`LOLICON ${isNext ? '下' : '上'}一页内容已成功加载。`);
                if (pageInfo.listDisplayMode) {
                    if (pageInfo.listDisplayMode === 't') modifyThumbnailSizeL(newData);
                    updateGlinkIndex(direction === 'next' ? newData : pageItemsData);
                    if (cfg.quickFavorite) replaceFavClickL(newData);
                    if (cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
                        throttledGetRowInfo();
                    }
                } else if (pageInfo.isGalleryPage) {
                    modifyThumbnailSizeG(newData);
                }

            } else {
                console.log(`LOLICON 未找到${isNext ? '下' : '上'}一页的内容，停止加载。`);
            }

            updatePageLink(fetchedDoc, direction);

            if (state.pageLink) {
                console.log(`LOLICON ${isNext ? '下' : '上'}一页链接已更新。`);
                updateLoadingStatus('idle', direction);
            } else {
                console.log(isNext ? 'LOLICON 已是最后一页' : 'LOLICON 已追溯至第一页');
                updateLoadingStatus('end', direction);
            }

        } catch (error) {
            console.error(`LOLICON 加载${isNext ? '下' : '上'}一页时发生错误：`, error.message);
            updateLoadingStatus('error', direction);
        } finally {
            state.isLoading = false;

            if (isNext && !state.isError && state.pageLink) {
                const indicator = $i('lolicon-next-indicator');
                if (indicator && scrollObserver) {
                    scrollObserver.unobserve(indicator);
                    scrollObserver.observe(indicator);
                }
            }
        }
    }

    /** 更新加载指示器 */
    function updateLoadingStatus(status, direction = 'next') {
        const isNext = direction === 'next';
        const parent = pageInfo.listDisplayMode === 't' ? $c('itg gld')[0] :
            pageInfo.listDisplayMode ? $('.itg > tbody') :
                pageInfo.isGalleryPage ? $i('gdt') : null;
        if (!parent) return;
        const isTable = parent.tagName === 'TBODY';
        const indicatorId = isNext ? 'lolicon-next-indicator' : 'lolicon-prev-indicator';
        let container = $i(indicatorId);

        // 不存在则创建
        if (!container) {
            container = $el(isTable ? 'tr' : 'div');
            container.id = indicatorId;
            container.className = 'lolicon-loading-container';
            if (isTable) container.innerHTML = '<td colspan="100%"></td>';
            if (isNext) {
                parent.appendChild(container);
            } else {
                if (pageInfo.listDisplayMode === 't' || pageInfo.listDisplayMode === 'e' || pageInfo.isGalleryPage) {
                    parent.insertBefore(container, parent.firstElementChild);
                } else {
                    parent.insertBefore(container, parent.firstElementChild.nextElementSibling);
                }
                status = 'idle';
            }
        }

        // 判断是否需要隐藏
        const shouldShow = (cfg.infiniteScroll && pageInfo.listDisplayMode) || (cfg.moreThumbnail && pageInfo.isGalleryPage);
        if (!shouldShow || (!isNext && !prevPage.pageLink)) {
            container.style.display = 'none';
            return;
        }

        container.style.display = '';

        // 配置状态内容
        const config = {
            idle: `<span class="lolicon-loading-status-text loading-link">${translate('loadMoreContent')}</span>`,
            loading: `<div class="lolicon-loading-spinner"></div><span class="lolicon-loading-status-text">${translate('loading')}</span>`,
            end: `<span class="lolicon-loading-status-text loading-end">${translate('noMoreContent')}</span>`,
            error: `<span class="lolicon-loading-status-text loading-link">${translate('loadFailedRetry')}</span>`,
        };

        // 更新 UI
        if (status !== 'toggle') {
            const target = isTable ? container.firstElementChild : container;
            target.innerHTML = config[status];
            const state = isNext ? nextPage : prevPage;
            state.isError = (status === 'error');
            container.onclick = (status === 'error' || status === 'idle') ? () => {
                state.isError = false; // 解锁
                throttledLoadPage(direction);
            } : null;
        }

        // 移动到末尾
        if (isNext && parent.lastElementChild !== container) {
            parent.appendChild(container);
        }
    }

    /** 元素位置 */
    let elementPositions = [];

    /** 获取行信息 */
    function getRowInfo() {
        const layoutRowInfoKey = `${cfg.layoutEnabledL}_${cfg.zoomFactorT}_${cfg.squareMode}_${layout.columnsT}_${pageItemsData.length}`;
        if (layout.layoutRowInfoKey === layoutRowInfoKey) return;
        layout.layoutRowInfoKey = layoutRowInfoKey;

        console.log('LOLICON 获取行信息');
        elementPositions = [];
        const scrollY = window.scrollY;
        const step = (pageInfo.listDisplayMode === 't') ? layout.columnsT : 1;

        for (let i = 0; i < pageItemsData.length; i += step) {
            const el = pageItemsData[i].el;
            elementPositions.push({
                bottom: el.getBoundingClientRect().bottom + scrollY,
                url: pageItemsData[i].gid + 1,
            });
        }

        updateURLOnScroll();
    }

    /** 最顶部元素的 URL */
    let topMostElementURL;

    /** 更新地址栏 */
    function updateURLOnScroll() {
        let newTopMostElementURL;
        const scrollY = window.scrollY;

        for (let i = 0; i < elementPositions.length; i++) {
            const { bottom, url } = elementPositions[i];
            if (bottom >= scrollY) {
                newTopMostElementURL = url;
                break;
            }
        }

        if (newTopMostElementURL != topMostElementURL) {
            let urlObj = new URL(pageInfo.originalUrl);
            urlObj.searchParams.delete('jump');
            urlObj.searchParams.delete('seek');
            urlObj.searchParams.set('next', newTopMostElementURL);
            window.history.replaceState(null, '', urlObj.toString());
            topMostElementURL = newTopMostElementURL;
        }
    }

    /** 缩略图独立滚动 */
    function setupThumbScroller() {
        const gdt = $i('gdt');
        if (!gdt) return;

        if (cfg.thumbScroll) {
            gdt.classList.add('lolicon-thumb-scroller-active');
        } else {
            gdt.classList.remove('lolicon-thumb-scroller-active');
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 11. 导航栏按钮
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** EH/ExH 页面切换信息 */
    const toggleEHInfo = {
        allowed: false, // 是否可切换
        currentHost: null, // 当前 host
        targetHost: null, // 切换目标 host
    };

    /** 获取 EH/ExH 页面切换信息 */
    function getToggleEHInfo() {
        let allowPathReplace =
            pageInfo.isHomePage ||
            pageInfo.isGalleryPage ||
            pageInfo.isWatchedPage ||
            pageInfo.isPopularPage ||
            pageInfo.isTorrentsPage ||
            pageInfo.isFavoritesPage ||
            pageInfo.isUconfigPage ||
            pageInfo.isMytagsPage ||
            pageInfo.isTagPage;

        if (window.location.hostname === 'upload.e-hentai.org') {
            toggleEHInfo.currentHost = 'upload.e-hentai.org';
            toggleEHInfo.targetHost = 'upld.exhentai.org/upld';
            allowPathReplace = true;
        } else if (window.location.hostname === 'upld.exhentai.org' && window.location.pathname.startsWith('/upld')) {
            toggleEHInfo.currentHost = 'upld.exhentai.org/upld';
            toggleEHInfo.targetHost = 'upload.e-hentai.org';
            allowPathReplace = true;
        } else if (pageInfo.isEhentai) {
            toggleEHInfo.currentHost = 'e-hentai.org';
            toggleEHInfo.targetHost = 'exhentai.org';
        } else if (pageInfo.isExhentai) {
            toggleEHInfo.currentHost = 'exhentai.org';
            toggleEHInfo.targetHost = 'e-hentai.org';
        }

        toggleEHInfo.allowed = !pageInfo.isTor && $i('nb') && allowPathReplace;
    }

    /** 脚本设置按钮 */
    function scriptSettingsButton() {
        if (cfg.scriptSettings && !$i('scriptSettings')) {
            $i('toggleEH')?.remove();
            const div = $el('div');
            const btn = $el('a');

            btn.textContent = 'LOLICON';
            btn.href = 'javascript:void(0);';
            btn.onclick = () => {
                showSettingsPanel();
            };

            div.id = 'scriptSettings';
            div.appendChild(btn);
            $i('nb').appendChild(div);
        } else if (!cfg.scriptSettings && $i('scriptSettings')) {
            $i('scriptSettings').remove();
        }
    }

    /** 切换 EH/ExH 按钮 */
    function toggleEHButton() {
        if (cfg.toggleEH && !$i('toggleEH')) {
            const div = $el('div');
            const btn = $el('a');

            btn.textContent = pageInfo.isEhentai ? 'ExH' : 'EH';
            btn.href = pageInfo.originalUrl.replace(toggleEHInfo.currentHost, toggleEHInfo.targetHost);

            div.id = 'toggleEH';
            div.appendChild(btn);
            $i('nb').appendChild(div);
        } else if (!cfg.toggleEH && $i('toggleEH')) {
            $i('toggleEH').remove();
        }
    }

    /** 更新导航栏样式 */
    function updateNbStyle() {
        const nb = $i('nb');

        if (!cfg.scriptSettings && (!cfg.toggleEH || !toggleEHInfo.allowed)) {
            nb.style.width = '';
            nb.style.minWidth = '';
            nb.style.maxWidth = '';
            nb.style.gap = '';
        } else {
            nb.style.width = 'max-content';
            nb.style.minWidth = '710px';
            nb.style.maxWidth = '1200px';
            nb.style.gap = '2px';
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 12. 其他
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 向页面注入脚本所需的 CSS 样式 */
    function injectCSS() {
        if ($i('lolicon-main-style')) return;

        const style = $el('style');
        style.id = 'lolicon-main-style';
        style.textContent = Object.values(CSS_MODULES).join('\n\n');
        document.head.append(style);
        if (pageInfo.isExhentai) {
            document.body.classList.add('ex');
        } else if (pageInfo.isTor) {
            document.body.classList.add('tor');
        }
    }

    /** 启用面板拖动 */
    function enablePanelDrag(panel) {
        panel.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.target.closest('textarea, input, button, select, a, label')) return;

            panel.setPointerCapture(e.pointerId);

            const startX = e.clientX;
            const startY = e.clientY;
            let isDragging = false;
            let rect, viewportW, viewportH, maxW, maxH;

            const onPointerMove = (ev) => {
                const deltaX = ev.clientX - startX;
                const deltaY = ev.clientY - startY;

                // 如果尚未激活拖拽，检查位移是否超过阈值
                if (!isDragging) {
                    if (Math.hypot(deltaX, deltaY) < 6) return;

                    isDragging = true;

                    viewportW = document.documentElement.clientWidth;
                    viewportH = document.documentElement.clientHeight;
                    rect = panel.getBoundingClientRect();

                    // 冻结当前位置，切换为像素控制
                    panel.style.transition = 'none';
                    panel.style.left = rect.left + 'px';
                    panel.style.top = rect.top + 'px';
                    panel.style.right = 'auto';
                    panel.style.bottom = 'auto';
                    panel.style.transform = 'translate3d(0px, 0px, 0px)';

                    // 强制重绘
                    void panel.offsetWidth;

                    maxW = viewportW - rect.width;
                    maxH = viewportH - rect.height;
                }

                let newLeft = rect.left + deltaX;
                let newTop = rect.top + deltaY;
                newLeft = Math.max(0, Math.min(newLeft, maxW));
                newTop = Math.max(0, Math.min(newTop, maxH));

                const clampDeltaX = newLeft - rect.left;
                const clampDeltaY = newTop - rect.top;
                panel.style.transform = `translate3d(${clampDeltaX}px, ${clampDeltaY}px, 0)`;
            };

            const onPointerUp = (ev) => {
                panel.releasePointerCapture(ev.pointerId);
                panel.removeEventListener('pointermove', onPointerMove);
                panel.removeEventListener('pointerup', onPointerUp);
                panel.removeEventListener('pointercancel', onPointerUp);

                if (!isDragging) return;

                const finalRect = panel.getBoundingClientRect();
                panel.style.transform = 'none';

                const maxLeftInside = `calc(100% - ${finalRect.width}px)`;
                const maxTopInside = `calc(100% - ${finalRect.height}px)`;
                const midPointLimitX = `calc(50vw - ${finalRect.width / 2}px)`;
                const midPointLimitY = `calc(50vh - ${finalRect.height / 2}px)`;

                const leftRatio = finalRect.left / viewportW;
                const rightRatio = finalRect.right / viewportW;
                const topRatio = finalRect.top / viewportH;
                const bottomRatio = finalRect.bottom / viewportH;

                // X 轴锚定
                if (leftRatio < 1 - rightRatio && leftRatio < 0.2) {
                    panel.style.left = `clamp(0px, ${finalRect.left}px, ${midPointLimitX})`;
                    panel.style.right = 'auto';
                } else if (1 - rightRatio <= leftRatio && rightRatio > 0.8) {
                    panel.style.left = 'auto';
                    panel.style.right = `clamp(0px, ${viewportW - finalRect.right}px, ${midPointLimitX})`;
                } else {
                    const centerXRatio = (finalRect.left + finalRect.width / 2) / viewportW;
                    const percentX = (centerXRatio * 100).toFixed(3);
                    const halfWidth = finalRect.width / 2;
                    panel.style.left = `clamp(0px, calc(${percentX}% - ${halfWidth}px), ${maxLeftInside})`;
                    panel.style.right = 'auto';
                }

                // Y 轴锚定
                if (topRatio < 1 - bottomRatio && topRatio < 0.2) {
                    panel.style.top = `clamp(0px, ${finalRect.top}px, ${midPointLimitY})`;
                    panel.style.bottom = 'auto';
                } else if (1 - bottomRatio <= topRatio && bottomRatio > 0.8) {
                    panel.style.top = 'auto';
                    panel.style.bottom = `clamp(0px, ${viewportH - finalRect.bottom}px, ${midPointLimitY})`;
                } else {
                    const centerYRatio = (finalRect.top + finalRect.height / 2) / viewportH;
                    const percentY = (centerYRatio * 100).toFixed(3);
                    const halfHeight = finalRect.height / 2;
                    panel.style.top = `clamp(0px, calc(${percentY}% - ${halfHeight}px), ${maxTopInside})`;
                    panel.style.bottom = 'auto';
                }

                panel.style.transition = '';
            };

            panel.addEventListener('pointermove', onPointerMove);
            panel.addEventListener('pointerup', onPointerUp);
            panel.addEventListener('pointercancel', onPointerUp);
        });
    }

    /** 最大 z-index 基准 */
    let maxZIndex = 1000000;

    /** 启用面板置顶 */
    function enablePanelTop(panel) {
        panel.style.zIndex = ++maxZIndex;
        if (!panel._loliconTopBound) {
            panel._loliconTopBound = true;
            panel.addEventListener('pointerdown', () => enablePanelTop(panel));
        }
    }

    /** 滚动监控 加载下一页 */
    function setupScrollObserver() {
        const configKey = pageInfo.isGalleryPage ? 'moreThumbnail' : 'infiniteScroll';
        const maxPagesKey = pageInfo.isGalleryPage ? 'maxPagesG' : 'maxPagesL';
        if (!nextPage.pageLink) {
            updateLoadingStatus('end');
            return;
        }
        updateLoadingStatus('idle');
        const indicator = $i('lolicon-next-indicator');
        if (scrollObserver) scrollObserver.disconnect();
        scrollObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !nextPage.isLoading && !nextPage.isError && cfg[configKey]) {

                if (!nextPage.pageLink) {
                    updateLoadingStatus('end');
                    scrollObserver.unobserve(indicator);
                    return;
                }

                const maxPageLimit = cfg[maxPagesKey];
                if (maxPageLimit !== 0 && nextPage.loadedCount >= maxPageLimit) {
                    console.log('LOLICON 已达到最大页数限制: ', nextPage.loadedCount, ' >= ', maxPageLimit);
                    updateLoadingStatus('idle');
                    return;
                }

                throttledLoadPage();
            }
        }, {
            root: (pageInfo.isGalleryPage && cfg.thumbScroll) ? $i('gdt') : null,
            rootMargin: '-24px',
        });

        if (indicator) scrollObserver.observe(indicator);
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 初始化与事件绑定
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 应用更改 */
    function applyChanges() {
        console.log('LOLICON 应用更改 开始');
        if (pageInfo.isFavoritesPage) {
            $c('ido')[0].style.minWidth = !cfg.layoutEnabledL ? '930px' : '740px';
        }
        calculateDimensions();
        if (pageInfo.listDisplayMode) {
            throttledAdjustColumnsL();
            if (pageInfo.listDisplayMode === 't') modifyThumbnailSizeL();
            updateGlinkIndex();
            quickTagPanel();
            updateLoadingStatus('toggle');
            updateLoadingStatus('toggle', 'prev');
            cfg.quickFavorite ? replaceFavClickL() : restoreElements();
            if (cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
                throttledGetRowInfo();
            }
        } else if (pageInfo.isGalleryPage) {
            tagSearchG();
            throttledAdjustColumnsG();
            modifyThumbnailSizeG();
            quickTagPanel();
            setupThumbScroller();
            updateLoadingStatus('toggle');
            updateLoadingStatus('toggle', 'prev');
            cfg.quickFavorite ? replaceFavClickG() : restoreElements();
        } else if (pageInfo.hasSearchBox) {
            throttledAdjustColumnsL();
            quickTagPanel();
        }
        if ($i('nb')) {
            updateNbStyle();
            scriptSettingsButton();
        }
        if (toggleEHInfo.allowed) {
            toggleEHButton();
        }
        console.log('LOLICON 应用更改 结束');
    }

    /** 绑定全局事件 */
    function bindEvents() {
        if (pageInfo.listDisplayMode) {
            setupScrollObserver();
            window.addEventListener('resize', throttledAdjustColumnsL);
            window.addEventListener('scroll', () => {
                if (cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
                    throttledUpdateURLOnScroll();
                }
            });
        } else if (pageInfo.isGalleryPage) {
            setupScrollObserver();
            window.addEventListener('resize', throttledAdjustColumnsG);
        } else if (pageInfo.hasSearchBox) {
            window.addEventListener('resize', throttledAdjustColumnsL);
        }
    }

    /** 启动!! */
    function init() {
        console.log('LOLICON 启动 开始');

        // 设置菜单
        GM_registerMenuCommand(translate('settings'), showSettingsPanel);

        // 初始化基础
        initialize();
        injectCSS();
        getToggleEHInfo();

        // 更新收藏夹目录
        if (pageInfo.isFavoritesPage || pageInfo.isUconfigPage || pageInfo.isGalleryPopupsPage) {
            updateFavcat();
        }

        // 初始数据收集
        if (pageInfo.listDisplayMode) {
            collectDataL();
            updatePageLink(document);
        } else if (pageInfo.isGalleryPage) {
            collectDataG();
            updatePageLink(document);
        }

        // 应用初始变更
        applyChanges();
        bindEvents();

        console.log('LOLICON 启动 结束');
    }

    init();

})();
