// ==UserScript==
// @name                LOLICON Hentai Enhancer
// @name:zh-CN          LOLICON Hentai 增强器
// @name:zh-TW          LOLICON Hentai 增強器
// @name:ja             LOLICON Hentai 強化版
// @name:ko             LOLICON Hentai 향상기
// @name:ru             LOLICON Hentai Улучшатель
// @namespace           https://greasyfork.org/scripts/516145
// @version             2026.02.24
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

    /** 更新画廊列表页宽-节流 */
    const throttledAdjustColumnsS = throttle(adjustColumnsS, 60);
    /** 更新画廊页宽-节流 */
    const throttledAdjustColumnsG = throttle(adjustColumnsG, 60);
    /** 更新地址栏-节流 */
    const throttledUpdateURLOnScroll = throttle(updateURLOnScroll, 60);
    /** 获取行信息-节流 */
    const throttledGetRowInfo = throttle(getRowInfo, 240);
    /** 加载下一页-节流 */
    const throttledLoadNextPage = throttle(loadNextPage, 600); //, { trailing: false }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 2. 常量与定义
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 获取当前设备的设备像素比（DPR）*/
    const devicePixelRatio = window.devicePixelRatio || 1;

    /** 用于存储布局相关的动态数据 */
    const layout = {};

    /** 配置项 */
    const config = {
        zoomFactorS: { def: 1, step: 0.01, min: 0.5, max: 10 },
        zoomFactorG: { def: 1, step: 0.01, min: 0.5, max: 10 },
        margin: { def: 10, step: 1, min: 0, max: 100 },
        spacing: { def: 15, step: 1, min: 0, max: 100 },
        pageMargin: { def: 10, step: 1, min: 0, max: 1000 },
        pagePadding: { def: 10, step: 1, min: 0, max: 1000 },
        fullScreenMode: { def: false },
        squareMode: { def: false },
        showIndex: { def: false },
        liveURLUpdate: { def: false },
        tagSearchG: { def: true },
        quickTag: { def: true },
        quickFavorite: { def: true },
        favLayout: { def: 0, options: ['A : 1x10', 'B : 2x5', 'C : 2x5', 'D : 5x2'] },
        infiniteScroll: { def: true },
        maxPagesS: { def: 0, step: 1, min: 0, max: 1000 },
        moreThumbnail: { def: true },
        maxPagesG: { def: 0, step: 1, min: 0, max: 1000 },
        thumbScroll: { def: false },
        thumbHoverZoom: { def: true },
        hoverScale: { def: 2, step: 0.01, min: 1, max: 10 },
        hoverDelay: { def: 1, step: 0.01, min: 0.5, max: 10 },
        hoverLoadLargeImage: { def: false },
        scriptSettings: { def: true },
        toggleEH: { def: false },
    };

    /**  EH 标签命名空间 缩写映射表 */
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

        // 变量
        vars: /* css */ `
            body { --lolicon-vars-bg-rgb: 0, 0, 0;  --lolicon-vars-text-rgb: 255, 255, 255; }
            body.ex, body.tor { --lolicon-vars-bg-rgb: 255, 255, 255; --lolicon-vars-text-rgb: 0, 0, 0; }
        `,

        // 设置页面样式
        settings: /* css */ `
            #lolicon-settings-panel {
                display: flex;
                flex-direction: column;
                position: fixed;
                top: 36px;
                right: 24px;
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 12px;
                box-shadow: 0 0 12px rgba(0,0,0,0.6);
                z-index: 999999;
                font-size: 14px;
                color: #222;
                min-width: 180px;
                min-height: 180px;
                max-height: calc(100vh - 60px);
                overflow: hidden;
                backdrop-filter: blur(2px);
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
            }
            .lolicon-settings-control-row label { font-weight: bold; cursor: pointer; }
            .lolicon-settings-indent { margin-left: 24px; color: #666; }
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
                border: 1px solid #000;
                z-index: 999998;
                background-repeat: no-repeat;
                display: none;
                box-shadow: 0 0 12px rgba(0,0,0,0.6);
                overflow: hidden;
                will-change: width, height, left, top;
                pointer-events: auto;
            }
            #lolicon-preview img {
                object-fit: cover;
                width: 100%;
                height: 100%;
                display: none;
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
                box-shadow: 0 0 12px rgba(0,0,0,0.6);
                z-index: 1000;
                user-select: none;
            }
            #lolicon-tag-manage-header {
                padding: 12px;
                font-weight: bold;
                font-size: 16px;
                user-select: none;
            }
            #lolicon-tag-manage-textarea {
                min-width: 240px; min-height: 240px;
                width: 36vw; height: 36vh;
                padding: 6px 12px;
                font-family: NSimSun, monospace;
                line-height: 1.2;
                white-space: pre;
                user-select: text;
            }
            #lolicon-tag-manage-footer { display: flex; justify-content: flex-end; padding: 6px 0; }
            #lolicon-tag-manage-save, #lolicon-tag-manage-cancel { margin: 6px; }
        `,

        // 收藏菜单界面样式
        favMenu: /* css */ `
            .lolicon-fav-popup-menu {
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                box-shadow: 0 0 6px rgba(0,0,0,0.6);
                padding: 2px;
                z-index: 999996;
                color: #fff;
                min-width: 166px;
                font-size: 10pt;
                font-weight: bold;
                text-shadow: 0 0 1.2px #000, 0 0 2.4px #000, 0 0 3.6px #000;
                display: block;
                backdrop-filter: blur(2px);
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
                background-color: rgba(var(--lolicon-vars-bg-rgb), 0.12) !important;
                box-shadow: inset 0 0 0 2px rgba(var(--lolicon-vars-bg-rgb), 0.12) !important;
            }
            .lolicon-fav-hover-list:not([style*="background"]):hover {
                border-color: rgb(var(--lolicon-vars-bg-rgb)) !important;
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
                grid-column: 1 / -1;
                box-sizing: border-box;
                padding: 6px 0;
                width: 100%;
                color: inherit;
                min-height: 36px;
            }
            div.lolicon-loading-container {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            tr.lolicon-loading-container td {
                text-align: center;
                padding: 6px 0;
                color: inherit;
                vertical-align: middle;
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
                margin-left: 10px;
                vertical-align: middle;
                opacity: 0.8;
                line-height: 24px;
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
        'zoomFactorS': {
            'en': 'Thumbnail Zoom',
            'zh-CN': '缩略图缩放',
            'zh-TW': '縮圖縮放',
            'ja': 'サムネイルズーム',
            'ko': '썸네일 확대 비율',
            'ru': 'Масштаб миниатюры',
        },
        'zoomFactorG': {
            'en': 'Gallery Thumbnail Zoom',
            'zh-CN': '画廊缩略图缩放',
            'zh-TW': '畫廊縮圖縮放',
            'ja': 'ギャラリーサムネイルズーム',
            'ko': '갤러리 썸네일 확대 비율',
            'ru': 'Масштаб миниатюр галереи',
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
        'fullScreenMode': {
            'en': 'Full Screen Mode',
            'zh-CN': '全屏模式',
            'zh-TW': '全螢幕模式',
            'ja': 'フルスクリーンモード',
            'ko': '전체 화면 모드',
            'ru': 'Режим полного экрана',
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
        'maxPagesS': {
            'en': 'Max Pages [0 = Unlimited]',
            'zh-CN': '最大页数 [0 = 无限]',
            'zh-TW': '最大頁數 [0 = 無限]',
            'ja': '最大ページ数 [0 = 無制限]',
            'ko': '최대 페이지 [0 = 무한]',
            'ru': 'Макс. страниц [0 = Бесконечно]',
        },
        'moreThumbnail': {
            'en': 'More Thumbnail',
            'zh-CN': '更多缩略图',
            'zh-TW': '更多縮圖',
            'ja': 'もっとサムネイル',
            'ko': '썸네일 더보기',
            'ru': 'Ещё миниатюры',
        },
        'maxPagesG': {
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
            'en': 'Hover Zoom Scale',
            'zh-CN': '悬浮缩放倍数',
            'zh-TW': '懸浮縮放倍數',
            'ja': 'ホバーズーム倍率',
            'ko': '호버 확대 배율',
            'ru': 'Масштаб увеличения при наведении',
        },
        'hoverDelay': {
            'en': 'Hover Display Delay (s)',
            'zh-CN': '悬浮显示延迟 (s)',
            'zh-TW': '懸浮顯示延遲 (s)',
            'ja': 'ホバー表示遅延 (s)',
            'ko': '호버 표시 지연 (s)',
            'ru': 'Задержка отображения при наведении (s)',
        },
        'hoverLoadLargeImage': {
            'en': 'Load Large Image on Hover',
            'zh-CN': '悬浮加载大图',
            'zh-TW': '懸浮加載大圖',
            'ja': 'ホバー時に大きい画像を読み込む',
            'ko': '호버 시 대형 이미지 로드',
            'ru': 'Загрузка большой картинки при наведении',
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
        'settingsPanel': {
            'en': 'Settings',
            'zh-CN': '设置',
            'zh-TW': '設定',
            'ja': '設定',
            'ko': '설정',
            'ru': 'Настройки',
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
        'invalidInput': {
            'en': 'Invalid input\n\nUse [tag] or [name @ tag] or [name @ tag tag] format\nExample:\nLOLI @ f:lolicon$\n\nError line:\n',
            'zh-CN': '无效输入\n\n请使用 [tag] 或 [name @ tag] 或 [name @ tag tag] 格式\n示例:\nLOLI @ f:lolicon$\n\n错误行:\n',
            'zh-TW': '無效輸入\n\n請使用 [tag] 或 [name @ tag] 或 [name @ tag tag] 格式\n範例:\nLOLI @ f:lolicon$\n\n錯誤行:\n',
            'ja': '無効な入力です\n\n[tag] または [name @ tag] または [name @ tag tag] 形式を使用してください\n例:\nLOLI @ f:lolicon$\n\nエラー行:\n',
            'ko': '잘못된 입력\n\n[tag] 또는 [name @ tag] 또는 [name @ tag tag] 형식을 사용하세요\n예시:\nLOLI @ f:lolicon$\n\n오류 줄:\n',
            'ru': 'Неверный ввод\n\nИспользуйте формат [tag] или [name @ tag] или [name @ tag tag]\nПример:\nLOLI @ f:lolicon$\n\nСтрока с ошибкой:\n',
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
        'maxPageReached': {
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
        'en': `Invalid {{label}}! Please enter a value between {{min}} - {{max}}. Default {{default}}.`,
        'zh-CN': `{{label}} 无效！请输入介于 {{min}} ~ {{max}} 之间的值。默认值为 {{default}}。`,
        'zh-TW': `{{label}} 無效！請輸入介於 {{min}} ~ {{max}} 之間的值。預設值為 {{default}}。`,
        'ja': `{{label}} が無効です！{{min}} ~ {{max}} までの値を入力してください。デフォルトは {{default}} です。`,
        'ko': `잘못된 {{label}}! {{min}} ~ {{max}} 사이의 값을 입력하세요. 기본값 {{default}}`,
        'ru': `Неверный {{label}}! Пожалуйста, введите значение от {{min}} - {{max}}. По умолчанию {{default}}`,
    };

    /** 模板替换函数 */
    function interpolate(template, values) {
        return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
    }

    /** 包装 Proxy */
    const translations = new Proxy(_translations, {
        get(target, prop) {
            // 如果访问的是 xxxRange
            const match = prop.match(/^(.+)Range$/);
            if (match) {
                const baseKey = match[1];
                const labelEntry = target[baseKey];
                if (!labelEntry || !config[baseKey]) return undefined;

                const output = {};
                for (const lang of Object.keys(rangeTemplates)) {
                    output[lang] = interpolate(rangeTemplates[lang], {
                        label: labelEntry[lang],
                        min: config[baseKey].min,
                        max: config[baseKey].max,
                        default: config[baseKey].def,
                    });
                }
                return output;
            }

            // 普通字段直接返回
            return target[prop];
        },
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

    /** 页面项目序号 */
    let pageItemsIndex = 0;

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

        listDisplayMode: $('.searchnav div:last-child select')?.value, // 列表显示模式（m/p/l/e/t）
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
        const rowClass = options.isIndented ? 'lolicon-settings-control-row lolicon-settings-indent' : 'lolicon-settings-control-row';
        switch (type) {
            case 'input': {
                const { step, min, max } = config[name];
                return `<div class="${rowClass}">
                    <label for="${name}Input">${translate(name)}</label>
                    <input type="number" id="${name}Input" value="${value}" step="${step}" min="${min}" max="${max}">
                </div>`;
            }
            case 'checkbox': {
                return `<div class="${rowClass}">
                    <label for="${name}Input">${translate(name)}</label>
                    <input type="checkbox" id="${name}Input" ${value ? "checked" : ""}>
                </div>`;
            }
            case 'select': {
                const items = config[name].options;
                const optionsHTML = items.map((text, idx) =>
                    `<option value="${idx}" ${idx === value ? "selected" : ""}>${text}</option>`,
                ).join('');
                return `<div class="${rowClass}">
                    <label for="${name}Input">${translate(name)}</label>
                    <select id="${name}Input">${optionsHTML}</select>
                </div>`;
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

    /** 获取面板内容 */
    function getPanelContent() {
        let controlNames = [];

        if (pageInfo.listDisplayMode === 't') {
            controlNames = [
                'zoomFactorS', 'margin', 'pageMargin', 'pagePadding',
                'fullScreenMode', 'squareMode', 'showIndex',
                'infiniteScroll', 'thumbHoverZoom',
                'quickTag', 'quickFavorite',
                'liveURLUpdate',
            ];
        } else if (pageInfo.listDisplayMode) {
            controlNames = [
                'pageMargin', 'pagePadding',
                'fullScreenMode', 'showIndex',
                'infiniteScroll',
                'quickTag', 'quickFavorite',
                'liveURLUpdate',
            ];
        } else if (pageInfo.isGalleryPage) {
            controlNames = [
                'zoomFactorG', 'spacing', 'pageMargin',
                'fullScreenMode',
                'moreThumbnail', 'thumbScroll', 'thumbHoverZoom',
                'tagSearchG', 'quickFavorite',
            ];
        } else if ($i('searchbox') || pageInfo.isFavoritesPage) {
            controlNames = [
                'pageMargin', 'pagePadding',
                'fullScreenMode',
                'quickTag',
            ];
        } else if (!toggleEHInfo.allowed) {
            return createControlHTML('message', 'invalidPage');
        }

        if (toggleEHInfo.allowed) {
            controlNames.push('scriptSettings', 'toggleEH');
        }

        const htmlPieces = [];
        controlNames.forEach((name) => {
            let type;
            if (typeof config[name].def === 'boolean') {
                type = 'checkbox';
            } else if (config[name].options) {
                type = 'select';
            } else {
                type = 'input';
            }
            htmlPieces.push(createControlHTML(type, name, cfg[name]));

            // 根据当前主开关 name，渲染对应的额外子控件
            const extraItems = extraControls[name];
            if (extraItems && cfg[name]) {
                extraItems.forEach(([type, cfgKey, isIndented = true]) => {
                    let html = createControlHTML(type, cfgKey, cfg[cfgKey], { isIndented: isIndented });
                    htmlPieces.push(html);
                });
            }
        });

        return htmlPieces.join('');
    }

    /** 额外子控件配置表：主开关名 -> [控件类型, 子控件名, 是否缩进(默认 true) */
    const extraControls = {
        infiniteScroll: [['input', 'maxPagesS']],
        moreThumbnail: [['input', 'maxPagesG']],
        tagSearchG: [['checkbox', 'quickTag', false]],
        quickFavorite: [['select', 'favLayout']],
        thumbHoverZoom: [
            ['input', 'hoverScale'],
            ['input', 'hoverDelay'],
            ['checkbox', 'hoverLoadLargeImage'],
        ],
    };

    /** 创建和显示设置面板 */
    function showSettingsPanel() {
        if ($i('lolicon-settings-panel')) return;
        const panel = $el('div');
        panel.id = 'lolicon-settings-panel';
        panel.innerHTML = `
            <h3 class="lolicon-settings-header">${translate('settingsPanel')}</h3>
            <div id='settings-controls' class="lolicon-settings-body">${getPanelContent()}</div>
            <div class="lolicon-settings-footer">${createControlHTML('buttons')}</div>
        `;

        document.body.appendChild(panel);
        enablePanelDrag(panel);

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

        const saveBtn = $i('saveSettingsBtn'), cancelBtn = $i('cancelSettingsBtn');
        if (pageInfo.listDisplayMode || $i('searchbox') || pageInfo.isGalleryPage) {
            saveBtn?.addEventListener('click', () => saveSettings(panel));
            cancelBtn?.addEventListener('click', () => cancelSettings(panel));
        } else {
            saveBtn?.addEventListener('click', () => panel.remove());
            cancelBtn?.addEventListener('click', () => panel.remove());
        }

        // 暴露局部刷新函数，方便外部调用
        panel.refreshControls = () => refreshSettingsControls(panel);
    }

    // 局部刷新（只替换 #settings-controls 的 innerHTML，保留容器和已绑定的委托事件）
    function refreshSettingsControls(panel) {
        const container = panel.querySelector('#settings-controls');
        if (!container) return;
        container.innerHTML = getPanelContent();
        // 不需要重新绑定事件，因为事件委托绑定在 container 元素上并不会被替换
    }

    /** 从元素 ID 中提取配置项的 Key */
    const getCfgKey = (id) => id.replace(/Input$/, '');

    /** 输入框变化事件 */
    function handleInputChange(event) {
        const { id, value } = event.target;
        const key = getCfgKey(id);
        const numValue = parseFloat(value);
        if (
            config[key] &&
            numValue >= config[key].min &&
            numValue <= config[key].max
        ) {
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

        // 如果这个复选框和展示逻辑有关，局部刷新控件
        const refreshKeys = Object.keys(extraControls);
        if (refreshKeys.includes(getCfgKey(id))) {
            const panel = $i('lolicon-settings-panel');
            if (panel && typeof panel.refreshControls === 'function') {
                panel.refreshControls();
            }
        }
    }

    /** 下拉菜单变化事件 */
    function handleSelectChange(event) {
        const { id, value } = event.target;
        const key = getCfgKey(id);
        const numValue = parseInt(value);
        cfg[key] = numValue;
        applyChanges();
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
            if (isNaN(value) || value < config[key].min || value > config[key].max) {
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
        layout.columnWidthS = 250 * cfg.zoomFactorS + cfg.margin * 2; // 每列的宽度 250-400 270
        layout.columnWidthSb = layout.columnWidthS + (2 / devicePixelRatio); // 加上缩略图边框，边框宽度受设备像素比影响
        layout.columnWidthG = 100 * cfg.zoomFactorG + cfg.spacing; // 画廊每列的宽度(100X) spacing:15  + (2 / devicePixelRatio)
        layout.marginAdjustmentS = 14 + cfg.pageMargin * 2; // 页面边距调整值 body-padding:2 ido-padding:5
        layout.marginAdjustmentG = 34 + cfg.pageMargin * 2; // 画廊页面边距调整值 body-padding:2 gdt-padding:15
        layout.paddingAdjustmentS = cfg.pagePadding * 2; // 页面内边距调整值
    }

    /** 搜索类别行td */
    let initialRowTDs = null;

    /** 根据页面宽度动态调整列数 画廊列表页面 */
    function adjustColumnsS() {
        console.log('LOLICON 画廊列表页面调整');

        const width = document.documentElement.clientWidth; // window.innerWidth
        const minWidthNumber = parseFloat(getComputedStyle($c('ido')[0]).minWidth);

        let clientWidthS_itg = Math.max(width - layout.marginAdjustmentS - layout.paddingAdjustmentS, minWidthNumber); // 计算宽度
        layout.columnsS = Math.max(Math.floor(clientWidthS_itg / layout.columnWidthSb), 1); // 计算列数
        const baseWidth = (pageInfo.listDisplayMode === 't') ? layout.columnsS * layout.columnWidthSb : Math.min(720 + 670 + 14, clientWidthS_itg);
        clientWidthS_itg = Math.max(baseWidth, cfg.fullScreenMode ? clientWidthS_itg : minWidthNumber); // 根据全屏模式调整

        let clientWidthS_ido = Math.min(clientWidthS_itg + layout.paddingAdjustmentS, width);
        $c('ido')[0].style.maxWidth = clientWidthS_ido + 'px'; // 设置最大宽度 1370
        if (pageInfo.listDisplayMode === 't' && $c('itg gld')[0]) {
            $c('itg gld')[0].style.gridTemplateColumns = 'repeat(' + layout.columnsS + ', 1fr)'; // 设置列数
            $c('itg gld')[0].style.width = clientWidthS_itg + 'px'; // 设置边距 '99%'
        } else if ($c('itg')[0]) {
            $c('itg')[0].style.maxWidth = clientWidthS_itg + 'px';
            $c('itg')[0].style.width = clientWidthS_itg + 'px';
        }

        const searchnavEls = $c('searchnav');
        const paddingValue = (width - layout.marginAdjustmentS - layout.paddingAdjustmentS >= minWidthNumber)
            ? cfg.pagePadding
            : (width - minWidthNumber - layout.marginAdjustmentS) / 2;
        for (let i = 0; i < 2; i++) {
            const el = searchnavEls[i];
            if (!el) continue;
            el.children[0].style.padding = '0 0 0 ' + + paddingValue + 'px';
            el.children[6].style.padding = '0 ' + paddingValue + 'px 0 0';
        }

        const isLargerWidth = clientWidthS_ido >= 720 + 670 + 14 + layout.paddingAdjustmentS; //1460
        adjustSearchBox(isLargerWidth);

        // 调整更窄的收藏页面，和首页保持一致
        if (pageInfo.isFavoritesPage && clientWidthS_ido < (930 + layout.paddingAdjustmentS)) {
            const noselWidth = Math.max(735, Math.min(825, clientWidthS_ido));
            if ($c('nosel')[1]) { $c('nosel')[1].style.width = noselWidth + 'px'; }
            const fpElements = $$('div.fp');
            const fpWidth = Math.max(142, Math.min(160, (clientWidthS_ido - 16) / 5 - 1)) + 'px';
            for (let i = 0; i < Math.min(10, fpElements.length); i++) {
                fpElements[i].style.width = fpWidth;
            }
            const idoTarget3 = $('.ido > div:nth-child(3)');
            if (idoTarget3) {
                idoTarget3.style.width = noselWidth + 'px';
                const inputTarget = idoTarget3.querySelector('form:nth-child(1) > div:nth-child(2) > input:nth-child(1)');
                if (inputTarget) {
                    inputTarget.setAttribute('size', Math.max(84, Math.min(90, 84 + (noselWidth - 735) / 15)));
                }
            }
        } else if (pageInfo.isFavoritesPage) {
            if ($c('nosel')[1]) { $c('nosel')[1].style.width = '825px'; }
            const fpElements = $$('div.fp');
            for (let i = 0; i < Math.min(10, fpElements.length); i++) {
                fpElements[i].style.width = '160px';
            }
            const idoTarget3 = $('.ido > div:nth-child(3)');
            if (idoTarget3) {
                idoTarget3.style.width = (isLargerWidth ? 720 + 670 : 825) + 'px';
                const inputTarget = idoTarget3.querySelector('form:nth-child(1) > div:nth-child(2) > input:nth-child(1)');
                if (inputTarget) {
                    inputTarget.setAttribute('size', '90');
                }
            }
            $('form[action*="favorites.php"] input[name="f_search"]').style.width = (isLargerWidth ? '1230px' : '');
        }

        if (layout.columnsS != layout.OLDcolumnsS && cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
            throttledGetRowInfo();
            layout.OLDcolumnsS = layout.columnsS;
        }
    }

    /** 根据页面宽度动态调整列数 画廊页面 */
    function adjustColumnsG() {
        console.log('LOLICON 画廊页面调整');

        const gdt = $i('gdt');
        if (gdt) {
            const width = window.innerWidth;
            const isGT200 = gdt.classList.contains('gt200');
            const pixelCorrection = 2 / devicePixelRatio;

            const spacingCorrection = isGT200 ? cfg.spacing * 2 : cfg.spacing;
            const columnWidthGL = isGT200 ? layout.columnWidthG * 2 + pixelCorrection : layout.columnWidthG + pixelCorrection;

            const clientWidthGL = Math.max(700, width - layout.marginAdjustmentG) + spacingCorrection;
            const columnsG = Math.floor(clientWidthGL / columnWidthGL);
            const clientWidthG_gdt = cfg.fullScreenMode ? Math.max(700, width - layout.marginAdjustmentG) : Math.max(700, columnsG * columnWidthGL - spacingCorrection);

            if ($c('gm')[0]) { $c('gm')[0].style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置最详情大宽度 720 960 1200
            if ($c('gm')[1]) { $c('gm')[1].style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置最评论区大宽度 720 960 1200
            if ($i('gdo')) { $i('gdo').style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置缩略图设置栏最大宽度 720 960 1200

            let clientWidthG_gdt_gd2 = clientWidthG_gdt - 255; // 设置标题栏宽度 710 925
            let clientWidthG_gdt_gmid = clientWidthG_gdt - 250; // 设置标签栏宽度 710 930
            let clientWidthG_gdt_gd4 = clientWidthG_gdt - 600; // 设置标签栏宽度 360 580

            if (width <= 1230) {
                clientWidthG_gdt_gd2 = clientWidthG_gdt_gd2 + 255;
                clientWidthG_gdt_gmid = clientWidthG_gdt_gmid + 255;
                clientWidthG_gdt_gd4 = clientWidthG_gdt_gd4 + 255;
            }

            if ($i('gd2')) { $i('gd2').style.width = clientWidthG_gdt_gd2 + 'px'; }
            if ($i('gmid')) { $i('gmid').style.width = clientWidthG_gdt_gmid + 'px'; }
            if ($i('gd4')) { $i('gd4').style.width = clientWidthG_gdt_gd4 + 'px'; }


            gdt.style.maxWidth = clientWidthG_gdt + 'px'; // 设置最大宽度 700 940 1180
            gdt.style.gridTemplateColumns = 'repeat(' + columnsG + ', 1fr)';
            gdt.style.gap = cfg.spacing + 'px';

            const isLargerWidth = clientWidthG_gdt >= 720 + 670 + 14; //1460
            adjustSearchBox(isLargerWidth);
        }
    }

    /** 根据页面宽度动态调搜索盒子 */
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

    /** 收集画廊列表页面信息 */
    function collectDataS() {
        const strategies = {
            m: 'td:nth-child(4) > a:nth-child(1)',
            p: 'td:nth-child(4) > a:nth-child(1)',
            l: 'td:nth-child(3) > a:nth-child(1)',
            e: 'td:nth-child(1) > div:nth-child(1) > a:nth-child(1)',
            t: 'a:nth-child(1)',
        };
        const isThumbnailMode = pageInfo.listDisplayMode === 't';
        const gElements = isThumbnailMode ? $$('.gl1t') : $$('.itg > tbody > tr:not(#lolicon-loading-indicator)');
        gElements.forEach((el, index) => {
            if (index === pageItemsIndex) {
                pageItemsIndex++;
                if (!isThumbnailMode && el.querySelector('td.itd')) return; // 跳过广告行

                const glink = el.querySelector('.glink');
                const url = glink?.closest('a')?.href;

                const urlElement = el.querySelector(strategies[pageInfo.listDisplayMode]);
                const match = urlElement?.href.match(/\/g\/(\d+)\//);
                const gid = match ? Number(match[1]) : null;

                if (isThumbnailMode) {
                    const gl3t = el.querySelector('.gl3t');
                    const gl4t = el.querySelector('.gl4t');
                    const gl5t = el.querySelector('.gl5t');
                    const gl6t = el.querySelector('.gl6t');
                    const gl5tFirstChildDiv = gl5t?.querySelector('div:nth-child(1)');
                    const img = gl3t?.querySelector('img');

                    pageItemsData.push({
                        el,
                        gl3t,
                        gl4t,
                        gl5t,
                        gl6t,
                        glink,
                        gl5tFirstChildDiv,
                        img,
                        gid,
                        originalWidth: gl3t?.clientWidth,
                        originalHeight: gl3t?.clientHeight,
                        originalImgWidth: img?.clientWidth,
                        originalImgHeight: img?.clientHeight,
                        url,
                    });
                } else {
                    pageItemsData.push({
                        el,
                        glink,
                        gid,
                        url,
                    });
                }
            }
        });
    }

    /** 收集画廊页面信息 */
    function collectDataG() {
        const gdt = $i('gdt');
        const gdtThumbsSingle = gdt.querySelectorAll('a > div:nth-child(1)');
        const gdtThumbsDouble = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(1)');
        const gdtThumbs = gdtThumbsDouble.length ? gdtThumbsDouble : gdtThumbsSingle;
        const gdtThumbPages = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(2)');

        const spriteCountMap = new Map(); // 记录每张背景图出现次数

        gdtThumbs.forEach((el, index) => {
            if (index === pageItemsIndex) {
                pageItemsIndex++;

                const style = getComputedStyle(el);
                const backgroundPosition = style.backgroundPosition;
                const backgroundImage = style.backgroundImage;

                const spriteIndex = (spriteCountMap.get(backgroundImage) || 0) + 1;
                spriteCountMap.set(backgroundImage, spriteIndex);

                const width = el.clientWidth;
                const height = el.clientHeight;
                const itemWidth = (width === 200 || height === 300) ? 200 : 100;

                const pageEl = gdtThumbPages[index] ?? null;
                const url = el.closest('a').href;

                pageItemsData.push({
                    el,
                    backgroundPosition,
                    backgroundImage,
                    spriteIndex,
                    itemsPerSprite: null,
                    width,
                    height,
                    itemWidth,
                    pageEl,
                    url,
                });
            }
        });

        pageItemsData.forEach((data) => {
            if (data.itemsPerSprite == null) {
                data.itemsPerSprite = spriteCountMap.get(data.backgroundImage) || 1;
            }
        });
    }

    /** 修改画廊列表缩略图大小 */
    function modifyThumbnailSizeS() {
        console.log('LOLICON 修改缩略图大小');

        const minWidthNumber = parseFloat(getComputedStyle($c('ido')[0]).minWidth);
        let columnWidthSbm = Math.max(layout.columnWidthSb, minWidthNumber / Math.floor(Math.max(minWidthNumber / layout.columnWidthSb, 1)));

        if (cfg.fullScreenMode) {
            columnWidthSbm = layout.columnWidthS * 2;
        }

        pageItemsData.forEach((data, index) => {
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
                originalWidth,
                originalHeight,
                originalImgWidth,
                originalImgHeight,
                url,
            } = data;

            let zoomFactorL = cfg.zoomFactorS;

            if (cfg.squareMode && originalWidth < 250) {
                zoomFactorL = cfg.zoomFactorS * 250 / originalWidth;
            }

            // 设置 gl1t 的宽度
            el.style.minWidth = layout.columnWidthS + 'px';
            el.style.maxWidth = columnWidthSbm + 'px';

            // 调整 gl3t 的宽高
            if (gl3t) {
                const newWidth = originalWidth * zoomFactorL;
                const newHeight = originalHeight * zoomFactorL;
                gl3t.style.width = newWidth + 'px';
                gl3t.style.height = (cfg.squareMode ? newWidth : newHeight) + 'px';
            }

            // 小列宽时处理 gl5t 换行逻辑
            if (gl5t) {
                const isSmallWidth = layout.columnWidthS <= 199;
                gl5t.style.flexWrap = isSmallWidth ? 'wrap' : '';
                gl5t.style.height = isSmallWidth ? '92px' : '';

                if (gl5tFirstChildDiv) { gl5tFirstChildDiv.style.left = isSmallWidth ? '4.5px' : ''; }
            }

            // 调整图片的宽高
            if (img) {
                const newImgWidth = originalImgWidth * zoomFactorL;
                const newImgHeight = originalImgHeight * zoomFactorL;
                let width = newImgWidth;
                let height = newImgHeight;
                let top = '';
                let left = '';

                if (cfg.squareMode) {
                    if (newImgWidth <= newImgHeight) {
                        top = ((originalWidth * zoomFactorL) - newImgHeight) / 2 + 'px';
                    } else {
                        left = ((originalWidth * zoomFactorL) - (newImgWidth * newImgWidth / newImgHeight)) / 2 + 'px';
                        width = newImgWidth * newImgWidth / newImgHeight;
                        height = newImgWidth;
                    }
                } else {
                    top = ((originalHeight * zoomFactorL) - newImgHeight) / 2 + 'px';
                }

                img.style.width = width + 'px';
                img.style.height = height + 'px';
                img.style.top = top;
                img.style.left = left;

                bindThumbHoverZoom(data);
            }
        });
    }

    /** 调整 glink 的标题序号 */
    function updateGlinkIndex() {
        console.log('LOLICON 调整 glink 的标题序号');

        pageItemsData.forEach((data, index) => {
            const { glink } = data;

            if (glink) {
                const glinkSpan = glink.querySelector('span[data-LOLICON-index="true"]');

                if (cfg.showIndex) {
                    if (!glinkSpan) {
                        const span = $el('span');
                        span.setAttribute('data-LOLICON-index', 'true');
                        if (pageInfo.listDisplayMode === 't' || pageInfo.listDisplayMode === 'e') {
                            span.textContent = `【${index + 1}】 `;
                        } else {
                            span.textContent = `【${index}】 `;
                        }
                        glink.insertBefore(span, glink.firstChild);
                    }
                } else if (glinkSpan) {
                    glinkSpan.remove();
                }
            }
        });
    }

    /** 修改画廊缩略图大小 */
    function modifyThumbnailSizeG() {
        console.log('LOLICON 修改画廊缩略图大小');

        const isSprite = pageItemsData[0].itemsPerSprite !== 1 && pageItemsData.length > 1;

        pageItemsData.forEach((data, index) => {
            const {
                el,
                backgroundPosition,
                backgroundImage,
                spriteIndex,
                itemsPerSprite,
                width,
                height,
                itemWidth,
                pageEl,
                url,
            } = data;

            const [x] = backgroundPosition.split(' ').map(parseFloat);

            const bgTotalWidth = isSprite
                ? itemWidth * itemsPerSprite * cfg.zoomFactorG
                : width * cfg.zoomFactorG;

            // 设置缩略图尺寸
            el.style.width = width * cfg.zoomFactorG + 'px';
            el.style.height = height * cfg.zoomFactorG + 'px';

            // 设置page最大宽度（便于居中）
            if (pageEl) {
                pageEl.style.maxWidth = itemWidth * cfg.zoomFactorG + 'px';
            }

            // 背景图位置、尺寸缩放
            if (!(el._largeImg instanceof Image)) {
                el.style.backgroundPosition = x * cfg.zoomFactorG + 'px 0px';
                el.style.backgroundSize = bgTotalWidth + 'px auto';
            }

            bindThumbHoverZoom(data);
        });
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 6. 缩略图悬浮放大
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 全局状态与常量定义 */
    const PREVIEW_MARGIN = 12; // 预览框距离窗口边缘的最小间距
    let hoverTimer = null; // 悬浮延迟用的定时器
    let fetchLocked = false; // 防止同时发起多个 fetch 的锁
    let previewLink = $i('lolicon-preview-link');
    let preview = $i('lolicon-preview');
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
        preview.innerHTML = '<img>'; // 用于大图替换、显示
        previewImg = preview.querySelector('img');
        previewLink.appendChild(preview);

        // 绑定预览框上的全局事件（只需绑定一次）
        preview.addEventListener('wheel', handleWheel); // 滚轮缩放
        preview.addEventListener('mousedown', handleMouseDown); // 拖拽
        preview.addEventListener('click', handleClick); // 防误点
        preview.addEventListener('mouseleave', hidePreview); // 鼠标离开关闭
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePreview(); }); // ESC 关闭
    }

    /** 异步获取原图 URL（带锁） */
    async function fetchLargeImage(pageUrl) {
        if (fetchLocked) return null;
        fetchLocked = true;
        setTimeout(() => { fetchLocked = false; }, config['hoverDelay'].def * 1000);

        try {
            let targetUrl = pageUrl;
            if (pageInfo.listDisplayMode === 't') {
                const res = await fetch(pageUrl);
                const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
                targetUrl = doc.querySelector('#gdt > a:nth-child(1)')?.href;
                if (!targetUrl) return null;
            }
            const res = await fetch(targetUrl);
            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            return doc.querySelector('#img')?.src;
        } catch {
            return null;
        }
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

    /** 渲染预览框位置和内容，支持缩放与大图加载 */
    function renderPreview(loadLarge = true, wheelEvent = null) {
        if (!previewState.active) return;

        const { bw, bh, scale, el, isDragging } = previewState;
        const pw = bw * scale;
        const ph = bh * scale;

        // 计算预览框位置
        let left, top;
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
            const pixelCorrection = (pageInfo.listDisplayMode === 't') ? (1 / devicePixelRatio) : 0;
            left = balancePosition(rect.left - pixelCorrection, bw, pw, window.innerWidth);
            top = balancePosition(rect.top - pixelCorrection, bh, ph, window.innerHeight);
        }

        // 应用预览框尺寸和位置并显示
        preview.style.width = pw + 'px';
        preview.style.height = ph + 'px';
        preview.style.left = left + 'px';
        preview.style.top = top + 'px';
        preview.style.display = 'block';

        // 图片显示逻辑
        if (el._largeImg instanceof Image) {
            // 已缓存大图
            previewImg.src = el._largeImg.src;
            previewImg.style.display = 'block';
        } else {
            // 先显示缩略图背景
            previewImg.style.display = 'none';
            previewImg.src = '';
            applyThumbnailStyle(scale);

            // 再异步加载大图
            if (cfg.hoverLoadLargeImage && loadLarge) {
                handleLargeImageLoading();
            }
        }
    }

    /** 设置预览框缩略图背景样式，支持列表页和图库页 */
    function applyThumbnailStyle(scale) {
        const {
            bw,
            data: {
                zoomFactorO,
                img,
                backgroundImage,
                backgroundPosition,
                itemsPerSprite,
                itemWidth,
            },
        } = previewState;

        if (pageInfo.listDisplayMode === 't') {
            // 列表页：直接用缩略图作为背景
            preview.style.backgroundImage = `url("${img.src}")`;
            preview.style.backgroundSize = bw * scale + 'px auto';
        } else if (pageInfo.isGalleryPage) {
            // 图库页：需要还原 zoomFactorO 的缩放影响
            const bgTotalWidth = (pageItemsData[0].itemsPerSprite !== 1 && pageItemsData.length > 1)
                ? itemWidth * itemsPerSprite * zoomFactorO
                : bw;

            preview.style.backgroundImage = backgroundImage;
            preview.style.backgroundSize = bgTotalWidth * scale + 'px auto';

            const [x] = backgroundPosition.split(' ').map(parseFloat);
            preview.style.backgroundPosition = x * zoomFactorO * scale + 'px 0px';
        }
    }

    /** 异步加载大图并替换预览框和缩略图 */
    function handleLargeImageLoading() {
        const { data: { url }, el } = previewState;

        fetchLargeImage(url).then((src) => {
            if (!src) return;

            const preImg = new Image();
            preImg.src = src;
            preImg.onload = () => {
                el._largeImg = preImg; // 缓存到元素上

                // 预览框还在显示时更新大图
                if (previewState.active && previewState.el === el) {
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
                } else if (pageInfo.isGalleryPage) {
                    el.style.backgroundImage = `url("${preImg.src}")`;
                    el.style.backgroundSize = 'cover';
                    el.style.backgroundPosition = 'center';
                }
            };
        });
    }

    /** 初始化悬浮预览并计算缩放参数 */
    function startHover(thumbEl, data) {
        // 初始化 DOM（只创建一次）
        if (!preview) initPreviewDOM();

        clearTimeout(hoverTimer); // 清除上一次定时器
        previewLink.href = data.url; // 设置预览链接

        // 计算基础参数
        let zoomFactorO, widthO, heightO;
        const { originalWidth, width, height, img } = data;

        if (pageInfo.listDisplayMode === 't') {
            if (cfg.squareMode && originalWidth < 250) {
                zoomFactorO = cfg.zoomFactorS * 250 / originalWidth;
            } else {
                zoomFactorO = cfg.zoomFactorS;
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
        } else if (pageInfo.isGalleryPage) {
            zoomFactorO = cfg.zoomFactorG;
            widthO = width;
            heightO = height;
        }

        // 更新全局预览状态
        previewState.active = true;
        previewState.el = thumbEl;
        previewState.data = { ...data, zoomFactorO }; // 注入计算出的 zoomFactorO
        previewState.scale = cfg.hoverScale;
        previewState.bw = widthO * zoomFactorO;
        previewState.bh = heightO * zoomFactorO;
        previewState.isDragging = false;

        hoverTimer = setTimeout(() => renderPreview(true), cfg.hoverDelay * 1000); // 延迟渲染预览
    }

    /** 隐藏放大预览并重置状态 */
    function hidePreview() {
        clearTimeout(hoverTimer); // 清除悬浮延迟
        previewState.active = false; // 标记预览已关闭

        if (preview) {
            preview.style.display = 'none';
            preview.style.backgroundImage = 'none';
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
    function handleMouseDown(e) {
        if (e.button !== 0) return; // 只响应左键
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const rect = preview.getBoundingClientRect();
        const startLeft = rect.left;
        const startTop = rect.top;

        previewState.isDragging = false; // 拖拽标记重置

        function onMouseMove(ev) {
            const deltaX = ev.clientX - startX;
            const deltaY = ev.clientY - startY;
            if (!previewState.isDragging && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
                previewState.isDragging = true; // 超过阈值视为拖拽
            }

            preview.style.left = startLeft + deltaX + 'px';
            preview.style.top = startTop + deltaY + 'px';
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove); // 绑定拖拽
        document.addEventListener('mouseup', onMouseUp); // 释放拖拽
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
        if (!thumbEl || thumbEl.getAttribute('data-LOLICON-bound')) return;
        thumbEl.setAttribute('data-LOLICON-bound', 'true');

        // 悬浮显示大图
        thumbEl.addEventListener('mouseenter', () => {
            if (!cfg.thumbHoverZoom) return;
            startHover(thumbEl, data);
        });

        // 鼠标离开缩略图
        thumbEl.addEventListener('mouseleave', (e) => {
            clearTimeout(hoverTimer);
            // 如果去向不是预览框，且当前处于激活状态，则隐藏
            if (!preview?.contains(e.relatedTarget) && previewState.active) {
                hidePreview();
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
        const isAllSame = states.every(s => s === firstState);
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
        const btnNorms = btnTokens.map(t => normalizeToken(t).replace(TAG_RE.PRE, ''));
        // 获取输入框现有的所有标签，并进行标准化处理
        let inputTokens = tokenize(searchBox.input.value);
        const inputNorms = inputTokens.map(t => normalizeToken(t).replace(TAG_RE.PRE, ''));

        // 只有当按钮的【所有词】都在输入框内时，才执行删除；否则补全缺失的词
        const allExists = btnNorms.every(bn => inputNorms.includes(bn));

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

        bar.append(btnSave, btnCancel);
        panel.append(header, ta, bar);
        document.body.append(panel);
        enablePanelDrag(panel);

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
                const res = await fetch(window.location.origin + '/uconfig.php');
                const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
                names = [...doc.querySelectorAll('input[name^="favorite_"][type="text"]')].map((i) => i.value.trim());
            }
        } catch (error) {
            console.error('LOLICON 获取收藏夹目录列表时发生错误：', error);
        }
        return names;
    };

    /** 收藏夹目录 */
    let favcat = [];

    /** 异步函数：更新收藏夹目录 */
    async function updateFavcat() {
        favcat = await getFavcatList();
        localStorage.favcat = JSON.stringify(favcat);
        console.log('LOLICON 更新收藏夹目录', favcat);
    }

    /** 异步函数：初始化收藏夹列表 */
    async function initFavcat() {
        if (!localStorage.favcat || localStorage.favcat === '') {
            await updateFavcat();
        } else {
            favcat = JSON.parse(localStorage.favcat);
        }
    }

    /** 异步函数：发送收藏或取消收藏请求 // url: 请求地址 // add: true为收藏，false为取消收藏 // favIndex: 收藏夹编号 */
    const fetchFav = async (url, add, favIndex) => {
        try {
            // 发送POST请求，提交收藏/取消收藏参数
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: add
                    ? `favcat=${favIndex}&favnote=&apply=Add+to+Favorites&update=1`
                    : 'favcat=favdel&favnote=&update=1', // 取消收藏请求体
                credentials: 'same-origin', // 同源策略，携带cookie
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
            console.error('LOLICON 发送收藏或取消收藏请求时发生错误：', error);
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
        favcat.forEach((name, idx) => {
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
            window.open(favUrl, '_blank', 'width=675,height=415');
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
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('contextmenu', handler);
            window.removeEventListener('resize', handler);
        };

        const handler = (e) => {
            if (e.type === 'mousedown') {
                if (!menu.contains(e.target) && e.target !== anchorEl) {
                    closeMenu();
                }
            } else if (e.type === 'contextmenu' || e.type === 'resize') {
                closeMenu();
            }
        };

        // 绑定事件
        document.addEventListener('mousedown', handler);
        document.addEventListener('contextmenu', handler);
        window.addEventListener('resize', handler);
    }

    /** 用 Map 存储元素对应的原始状态，支持遍历批量操作 */
    const originalStates = new Map();

    /** 替换元素原onclick事件，绑定自定义点击事件显示收藏菜单 */
    const replaceOnClick = (el, favUrl) => {
        const originalOnClick = el.getAttribute('onclick');

        const clickHandler = (e) => {
            e.stopPropagation();
            // 确保数据存在
            if (!favcat || favcat.length === 0) {
                initFavcat().then(() => showFavMenu(el, favUrl));
            } else {
                showFavMenu(el, favUrl);
            }
        };

        el.removeAttribute('onclick');
        el.addEventListener('click', clickHandler);

        // 仅保存必要状态
        const oldState = originalStates.get(el) || {};
        originalStates.set(el, { ...oldState, originalOnClick, clickHandler });
    };

    /** 恢复元素原onclick事件、鼠标样式、取消自定义点击事件 */
    function restoreElements() {
        // 先把所有保存的元素缓存到数组，避免边遍历边修改 Map 导致的问题
        const elements = Array.from(originalStates.keys());

        for (const el of elements) {
            const state = originalStates.get(el);
            if (!state) continue;

            const {
                originalOnClick,
                originalCursor,
                clickHandler,
                onMouseEnter,
                onMouseLeave,
                iconMarginLeft,
            } = state;

            el.style.cursor = originalCursor || '';

            // 移除鼠标悬停事件监听
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);
            el.removeEventListener('click', clickHandler);

            el.classList.remove('lolicon-fav-hover-list', 'lolicon-fav-hover-gallery', 'lolicon-fav-gdf-btn', 'lolicon-fav-gdf-btn-center');

            if (pageInfo.listDisplayMode) {

            } else if (pageInfo.isGalleryPage) {
                el.removeAttribute('style');
                // 设置 gdf 内部 div#fav div.i 的 margin-left 为 0
                const iconDiv = el.querySelector('div#fav div.i');
                if (iconDiv) {
                    iconDiv.style.marginLeft = iconMarginLeft;
                }
            }

            // 恢复 onclick 属性
            if (originalOnClick) {
                el.setAttribute('onclick', originalOnClick);
            }

            // 从缓存中移除，防止内存泄漏
            originalStates.delete(el);
            el.removeAttribute('data-LOLICON-bound');
        }
    }

    /** 给列表页中的元素替换点击事件，启用收藏菜单 */
    async function replaceFavClickS() {
        if (!pageInfo.listDisplayMode) return;

        await initFavcat(); // 等待 favcat 数据就绪

        // 不同显示模式对应的选择器，选出需要绑定收藏功能的元素
        const strategies = {
            m: '.glthumb + div',
            p: '.glthumb + div',
            l: '.glthumb + div > :first-child',
            e: '.gl3e>:nth-child(2)',
            t: '.gl5t>:first-child>:nth-child(2)',
        };

        // 遍历所有匹配元素
        $$(strategies[pageInfo.listDisplayMode]).forEach((el) => {
            if (!el.onclick) return; // 无onclick则跳过
            if (el.getAttribute('data-LOLICON-bound')) return;
            el.setAttribute('data-LOLICON-bound', 'true');
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

        if (gdf.getAttribute('data-LOLICON-bound')) return;
        gdf.setAttribute('data-LOLICON-bound', 'true');

        // 调整按钮容器样式，使内容居中且无左边距，设定固定高度和半透明背景
        gdf.classList.add('lolicon-fav-gdf-btn', 'lolicon-fav-hover-gallery');

        // 设置 gdf 内部 div#fav div.i 的 margin-left 为 0
        const iconDiv = gdf.querySelector('div#fav div.i');
        if (iconDiv) {
            // 保存状态以备恢复
            const oldState = originalStates.get(gdf) || {};
            originalStates.set(gdf, {
                ...oldState,
                iconMarginLeft: iconDiv.style.marginLeft,
            });
            iconDiv.style.marginLeft = '0';
        }

        // 拼接收藏请求地址
        const favUrl = `${window.location.origin}/gallerypopups.php?gid=${matchGallery[1]}&t=${matchGallery[2]}&act=addfav`;

        replaceOnClick(gdf, favUrl); // 替换点击事件绑定收藏弹窗
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    // 10. 加载更多
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 加载下一页的状态 */
    const nextPage = {
        isLoading: false,
        nextPageLink: null,
        loadedCount: 1,
    };

    /** 观察者实例 */
    let scrollObserver = null;

    /** 获取下一页链接 */
    function getNextPageLink(doc) {
        if (pageInfo.listDisplayMode) {
            nextPage.nextPageLink = doc.querySelector('#dnext')?.href;
            if (nextPage.nextPageLink) {
                $i('unext').href = nextPage.nextPageLink;
                $i('dnext').href = nextPage.nextPageLink;
            }
        } else if (pageInfo.isGalleryPage) {
            nextPage.nextPageLink = doc.querySelector('.ptb tr:first-child td:last-child a')?.href;
            if (nextPage.nextPageLink) {
                $('.ptt tr:first-child td:last-child a').href = nextPage.nextPageLink;
                $('.ptb tr:first-child td:last-child a').href = nextPage.nextPageLink;
            }
        }
    }

    /** 无限滚动加载下一页 */
    async function loadNextPage() {
        if (nextPage.isLoading || !nextPage.nextPageLink) return;

        nextPage.isLoading = true;
        updateLoadingStatus('loading'); // 显示加载中
        try {
            console.log('LOLICON 加载下一页：', nextPage.nextPageLink);
            const response = await fetch(nextPage.nextPageLink);
            const html = await response.text();
            const parser = new DOMParser();
            const fetchedDoc = parser.parseFromString(html, 'text/html');
            let nextContent;
            if (pageInfo.listDisplayMode === 't') {
                nextContent = fetchedDoc.querySelectorAll('.gl1t');
            } else if (pageInfo.listDisplayMode) {
                nextContent = fetchedDoc.querySelectorAll('.itg > tbody > tr');
            } else if (pageInfo.isGalleryPage) {
                nextContent = fetchedDoc.querySelectorAll('#gdt > a');
            }

            if (nextContent.length > 0) {
                const fragment = document.createDocumentFragment();
                nextContent.forEach((item, index) => {
                    if (pageInfo.listDisplayMode === 't' || pageInfo.listDisplayMode === 'e' || pageInfo.isGalleryPage || index > 0) {
                        fragment.appendChild(item);
                    }
                });

                $i('lolicon-loading-indicator').before(fragment);

                nextPage.loadedCount++;
                console.log('LOLICON 下一页内容已成功加载。');
                if (pageInfo.listDisplayMode) {
                    collectDataS();
                    if (pageInfo.listDisplayMode === 't') modifyThumbnailSizeS();
                    updateGlinkIndex();
                    if (cfg.quickFavorite) replaceFavClickS();
                    if (cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
                        throttledGetRowInfo();
                    }
                } else if (pageInfo.isGalleryPage) {
                    collectDataG();
                    modifyThumbnailSizeG();
                    throttledAdjustColumnsG();
                }

            } else {
                console.log('LOLICON 未找到下一页的内容，停止加载。');
            }

            getNextPageLink(fetchedDoc);

            if (nextPage.nextPageLink) {
                console.log('LOLICON 下一页链接已更新为：', nextPage.nextPageLink);
                updateLoadingStatus('idle');
            } else {
                console.log('LOLICON 已是最后一页');
                updateLoadingStatus('end');
            }

        } catch (error) {
            console.error('LOLICON 加载下一页时发生错误：', error);
            updateLoadingStatus('error');
        } finally {
            nextPage.isLoading = false;

            if (!nextPage.isError && nextPage.nextPageLink) {
                const indicator = $i('lolicon-loading-indicator');
                if (indicator && scrollObserver) {
                    scrollObserver.unobserve(indicator);
                    scrollObserver.observe(indicator);
                }
            }
        }
    }

    /** 更新加载指示器 */
    function updateLoadingStatus(status) {
        const parent = pageInfo.listDisplayMode === 't' ? $c('itg gld')[0] :
            pageInfo.listDisplayMode ? $('.itg > tbody') :
                pageInfo.isGalleryPage ? $i('gdt') : null;
        if (!parent) return;
        const isTable = parent.tagName === 'TBODY';
        let container = $i('lolicon-loading-indicator');

        // 不存在则创建
        if (!container) {
            container = $el(isTable ? 'tr' : 'div');
            container.id = 'lolicon-loading-indicator';
            container.className = 'lolicon-loading-container';
            if (isTable) container.innerHTML = '<td colspan="100%""></td>';
            parent.appendChild(container);
        }

        // 判断是否需要隐藏
        const shouldShow = (cfg.infiniteScroll && pageInfo.listDisplayMode) || (cfg.moreThumbnail && pageInfo.isGalleryPage);
        if (!shouldShow) {
            container.style.display = 'none';
            return;
        }

        container.style.display = '';

        // 配置状态内容
        const config = {
            idle: `<span class="lolicon-loading-status-text">· · ·</span>`,
            loading: `<div class="lolicon-loading-spinner"></div><span class="lolicon-loading-status-text">${translate('loading')}</span>`,
            maxLimit: `<span class="lolicon-loading-status-text" style="cursor:pointer;text-decoration:underline">${translate('maxPageReached')}</span>`,
            end: `<span class="lolicon-loading-status-text">${translate('noMoreContent')}</span>`,
            error: `<span class="lolicon-loading-status-text" style="cursor:pointer;text-decoration:underline">${translate('loadFailedRetry')}</span>`,
        };

        // 更新 UI
        if (status !== 'toggle') {
            const target = isTable ? container.firstElementChild : container;
            target.innerHTML = config[status];
            nextPage.isError = (status === 'error');
            container.onclick = (status === 'error' || status === 'maxLimit') ? () => {
                nextPage.isError = false; // 解锁
                throttledLoadNextPage();
            } : null;
        }

        // 移动到末尾
        if (parent.lastElementChild !== container) {
            parent.appendChild(container);
        }
    }

    /** 元素位置 */
    let elementPositions = [];

    /** 获取行信息 */
    function getRowInfo() {
        elementPositions = [];
        const scrollY = window.scrollY;
        const startIndex = (pageInfo.listDisplayMode === 't' || pageInfo.listDisplayMode === 'e') ? 0 : 1;
        const step = (pageInfo.listDisplayMode === 't') ? layout.columnsS : 1;

        for (let i = startIndex; i < pageItemsData.length; i += step) {
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
            $i('nb').style.width = 'max-content';
            $i('nb').style.gap = '12px';
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
            $i('nb').style.width = 'max-content';
            $i('nb').style.gap = '12px';
        } else if (!cfg.toggleEH && $i('toggleEH')) {
            $i('toggleEH').remove();
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
        const fixPosition = () => {
            if (!panel.style.left) return;
            let x = parseInt(panel.style.left);
            let y = parseInt(panel.style.top);

            const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
            if (x > maxLeft) panel.style.left = maxLeft + 'px';

            const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
            if (y > maxTop) panel.style.top = maxTop + 'px';
        };
        window.addEventListener('resize', fixPosition);

        panel.onmousedown = (e) => {
            if (e.button !== 0 || e.target.closest('textarea, input, button, select, a, label')) return;

            const rect = panel.getBoundingClientRect();
            panel.style.transform = 'none';
            panel.style.left = rect.left + 'px';
            panel.style.top = rect.top + 'px';
            panel.style.right = 'auto';

            const onMouseMove = (ev) => {
                let x = rect.left + (ev.clientX - e.clientX);
                let y = rect.top + (ev.clientY - e.clientY);
                x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
                y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
                panel.style.left = x + 'px';
                panel.style.top = y + 'px';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }

    /** 滚动监控 加载下一页 */
    function setupScrollObserver() {
        const configKey = pageInfo.isGalleryPage ? 'moreThumbnail' : 'infiniteScroll';
        const maxPagesKey = pageInfo.isGalleryPage ? 'maxPagesG' : 'maxPagesS';
        if (!nextPage.nextPageLink) {
            updateLoadingStatus('end');
            return;
        }
        updateLoadingStatus('idle');
        const indicator = $i('lolicon-loading-indicator');
        if (scrollObserver) scrollObserver.disconnect();
        scrollObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !nextPage.isLoading && !nextPage.isError && cfg[configKey]) {

                if (!nextPage.nextPageLink) {
                    updateLoadingStatus('end');
                    scrollObserver.unobserve(indicator);
                    return;
                }

                const maxPageLimit = cfg[maxPagesKey];
                if (maxPageLimit !== 0 && nextPage.loadedCount >= maxPageLimit) {
                    console.log('LOLICON 已达到最大页数限制: ', nextPage.loadedCount, ' >= ', maxPageLimit);
                    updateLoadingStatus('maxLimit');
                    scrollObserver.unobserve(indicator);
                    return;
                }

                throttledLoadNextPage();
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
        calculateDimensions();
        if (pageInfo.listDisplayMode) {
            throttledAdjustColumnsS();
            if (pageInfo.listDisplayMode === 't') modifyThumbnailSizeS();
            updateGlinkIndex();
            quickTagPanel();
            updateLoadingStatus('toggle');
            cfg.quickFavorite ? replaceFavClickS() : restoreElements();
        } else if (pageInfo.isGalleryPage) {
            tagSearchG();
            throttledAdjustColumnsG();
            modifyThumbnailSizeG();
            quickTagPanel();
            setupThumbScroller();
            updateLoadingStatus('toggle');
            cfg.quickFavorite ? replaceFavClickG() : restoreElements();
        } else if ($i('searchbox') || pageInfo.isFavoritesPage) {
            throttledAdjustColumnsS();
            quickTagPanel();
        }
        scriptSettingsButton();
        if (toggleEHInfo.allowed) {
            toggleEHButton();
        }
    }

    /** 绑定全局事件 */
    function bindEvents() {
        if (pageInfo.listDisplayMode) {
            setupScrollObserver();
            window.addEventListener('resize', throttledAdjustColumnsS);
            window.addEventListener('scroll', () => {
                if (cfg.liveURLUpdate && !pageInfo.isPopularPage && !pageInfo.isFavoritesPage) {
                    throttledUpdateURLOnScroll();
                }
            });
        } else if (pageInfo.isGalleryPage) {
            setupScrollObserver();
            window.addEventListener('resize', throttledAdjustColumnsG);
        } else if ($i('searchbox') || pageInfo.isFavoritesPage) {
            window.addEventListener('resize', throttledAdjustColumnsS);
        }
    }

    /** 启动!! */
    function init() {
        console.log('LOLICON 开始');

        // 设置菜单
        GM_registerMenuCommand(translate('settings'), showSettingsPanel);

        // 初始化基础
        initialize();
        injectCSS();
        getToggleEHInfo();

        // 收藏页面修改
        if (pageInfo.isFavoritesPage) {
            $c('ido')[0].style.minWidth = '740px';
        }

        // 更新收藏夹目录
        if (pageInfo.isFavoritesPage || pageInfo.isUconfigPage || pageInfo.isGalleryPopupsPage) {
            updateFavcat();
        }

        // 初始数据收集
        if (pageInfo.listDisplayMode) {
            collectDataS();
            getNextPageLink(document);
        } else if (pageInfo.isGalleryPage) {
            collectDataG();
            getNextPageLink(document);
        }

        // 应用初始变更
        applyChanges();
        bindEvents();

    }

    init();

})();
