// ==UserScript==
// @name                LOLICON Wide Hentai
// @name:zh-CN          LOLICON 宽屏E绅士
// @name:zh-TW          LOLICON 寬屏E紳士
// @name:ja             LOLICON ワイド Hentai
// @name:ko             LOLICON 와이드 Hentai
// @name:ru             LOLICON Широкий Hentai
// @namespace           https://greasyfork.org/scripts/516145
// @version             2025.06.26
// @description         Full width E-Hentai and Exhentai, dynamically adjusting the page width, also allows you to adjust the size and margins of the thumbnails, infinite scroll to automatically load the next page
// @description:zh-CN   全屏宽度 E 绅士，动态调整页面宽度，同时支持调整缩略图大小和边距，无限滚动自动加载下一页
// @description:zh-TW   全螢幕寬度 E 紳士，動態調整頁面寬度，並支援調整縮圖大小及邊距，無限滾動自動加載下一頁
// @description:ja      フルスクリーン幅 E-Hentai と Exhentai、ページ幅を動的に調整し、サムネイルのサイズと余白も調整可能、スクロール時に自動的に次のページを読み込み
// @description:ko      전체 화면 너비 E-Hentai와 Exhentai, 페이지 너비를 동적으로 조정하고 썸네일 크기와 여백도 조정 가능, 스크롤 시 자동으로 다음 페이지를 로드
// @description:ru      Полная ширина E-Hentai и Exhentai, динамически регулирующая ширину страницы, а также позволяющая изменять размер миниатюр и поля, автоматическая загрузка следующей страницы при прокрутке
// @icon                https://e-hentai.org/favicon.ico
// @match               https://e-hentai.org/*
// @match               https://exhentai.org/*
// @exclude             https://e-hentai.org/s/*
// @exclude             https://exhentai.org/s/*
// @run-at              document-end
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_deleteValue
// @grant               GM_registerMenuCommand
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    function $(id) { return document.getElementById(id); }

    function c(id) { return document.getElementsByClassName(id); }

    // 获取当前设备的设备像素比（DPR）
    const devicePixelRatio = window.devicePixelRatio || 1;

    // 获取用户语言
    const userLang = navigator.language || navigator.userLanguage;

    let columnWidthS,
        columnWidthSb,
        columnWidthG,
        marginAdjustmentS,
        marginAdjustmentG,
        paddingAdjustmentS,
        columnsS,
        OLDcolumnsS;

    // 搜索类别行
    let initialTableRows = null;

    // 缩略图信息
    let thumbnailData = [];

    // gl1t序号
    let gl1tIndex = 0;

    // 配置项
    const config = {
        zoomFactorS: { step: 0.01, min: 0.5, max: 10 },
        zoomFactorG: { step: 0.01, min: 0.5, max: 10 },
        margin: { step: 1, min: 0, max: 100 },
        spacing: { step: 1, min: 0, max: 100 },
        pageMargin: { step: 1, min: 0, max: 1000 },
        pagePadding: { step: 1, min: 0, max: 100 },
    };

    // 设置默认值
    const defaults = {
        zoomFactorS: 1,
        zoomFactorG: 1,
        margin: 10,
        spacing: 15,
        pageMargin: 10,
        pagePadding: 10,
        fullScreenMode: false,
        squareMode: false,
        infiniteScroll: false,
        showIndex: false,
        liveURLUpdate: false
    };

    let zoomFactorS = GM_getValue('zoomFactorS', defaults.zoomFactorS);
    let zoomFactorG = GM_getValue('zoomFactorG', defaults.zoomFactorG);
    let margin = GM_getValue('margin', defaults.margin);
    let spacing = GM_getValue('spacing', defaults.spacing);
    let pageMargin = GM_getValue('pageMargin', defaults.pageMargin);
    let pagePadding = GM_getValue('pagePadding', defaults.pagePadding);
    let fullScreenMode = GM_getValue('fullScreenMode', defaults.fullScreenMode);
    let squareMode = GM_getValue('squareMode', defaults.squareMode);
    let infiniteScroll = GM_getValue('infiniteScroll', defaults.infiniteScroll);
    let showIndex = GM_getValue('showIndex', defaults.showIndex);
    let liveURLUpdate = GM_getValue('liveURLUpdate', defaults.liveURLUpdate);

    const originalUrl = window.location.href;

    const isThumbnailMode = !!c('itg gld')[0]; // 缩略图模式
    const isGalleryPage = window.location.pathname.indexOf('/g/') == 0; // /g/ 画廊页面
    const isWatchedPage = window.location.pathname.indexOf('/watched') == 0; // /watched 订阅页面
    const isPopularPage = window.location.pathname.indexOf('/popular') == 0; // /popular 热门页面
    const isFavoritesPage = window.location.pathname.indexOf('/favorites.php') == 0; // /favorites 收藏夹页面

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    // 定义语言包
    const _translations = {
        'zoomFactorS': {
            'en': 'Thumbnail Zoom',
            'zh-CN': '缩略图缩放',
            'zh-TW': '縮圖縮放',
            'ja': 'サムネイルズーム',
            'ko': '썸네일 확대 비율',
            'ru': 'Масштаб миниатюры'
        },
        'zoomFactorG': {
            'en': 'Gallery Thumbnail Zoom',
            'zh-CN': '画廊缩略图缩放',
            'zh-TW': '畫廊縮圖縮放',
            'ja': 'ギャラリーサムネイルズーム',
            'ko': '갤러리 썸네일 확대 비율',
            'ru': 'Масштаб миниатюр галереи'
        },
        'margin': {
            'en': 'Thumbnail Margin',
            'zh-CN': '缩略图边距',
            'zh-TW': '縮圖邊距',
            'ja': 'サムネイルマージン',
            'ko': '썸네일 여백',
            'ru': 'Отступы миниатюры'
        },
        'spacing': {
            'en': 'Thumbnail Spacing',
            'zh-CN': '缩略图间距',
            'zh-TW': '縮圖間距',
            'ja': 'サムネイル間隔',
            'ko': '썸네일 간격',
            'ru': 'Интервал миниатюр'
        },
        'pageMargin': {
            'en': 'Page Margin',
            'zh-CN': '页面外边距',
            'zh-TW': '頁面外邊距',
            'ja': 'ページマージン',
            'ko': '페이지 외부 여백',
            'ru': 'Внешний отступ страницы'
        },
        'pagePadding': {
            'en': 'Page Padding',
            'zh-CN': '页面内边距',
            'zh-TW': '頁面內邊距',
            'ja': 'ページパディング',
            'ko': '페이지 내부 여백',
            'ru': 'Внутренний отступ страницы'
        },
        'fullScreenMode': {
            'en': 'Full Screen Mode',
            'zh-CN': '全屏模式',
            'zh-TW': '全螢幕模式',
            'ja': 'フルスクリーンモード',
            'ko': '전체 화면 모드',
            'ru': 'Режим полного экрана'
        },
        'squareMode': {
            'en': 'Square Thumbnail',
            'zh-CN': '方形缩略图',
            'zh-TW': '方形縮圖',
            'ja': 'スクエアサムネイル',
            'ko': '정사각형 썸네일',
            'ru': 'Квадратная миниатюра'
        },
        'infiniteScroll': {
            'en': 'Infinite Scroll',
            'zh-CN': '无限滚动',
            'zh-TW': '無限滾動',
            'ja': '無限スクロール',
            'ko': '무한 스크롤',
            'ru': 'Бесконечная прокрутка',
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
        'settings': {
            'en': 'Settings',
            'zh-CN': '设置',
            'zh-TW': '設置',
            'ja': '設定',
            'ko': '설정',
            'ru': 'Настройки'
        },
        'settingsPanel': {
            'en': 'Settings Panel',
            'zh-CN': '设置面板',
            'zh-TW': '設置面板',
            'ja': '設定パネル',
            'ko': '설정 패널',
            'ru': 'Панель настроек'
        },
        'save': {
            'en': 'Save',
            'zh-CN': '保存',
            'zh-TW': '儲存',
            'ja': '保存',
            'ko': '저장',
            'ru': 'Сохранить'
        },
        'cancel': {
            'en': 'Cancel',
            'zh-CN': '取消',
            'zh-TW': '取消',
            'ja': 'キャンセル',
            'ko': '취소',
            'ru': 'Отменить'
        },
        'InvalidPage': {
            'en': 'only effective in thumbnail mode or gallery page.',
            'zh-CN': '仅在缩略图模式或画廊页面有效',
            'zh-TW': '僅在縮圖模式或畫廊頁面有效',
            'ja': 'サムネイルモードまたはギャラリーページでのみ有効です。',
            'ko': '썸네일 모드 또는 갤러리 페이지에서만 유효합니다.',
            'ru': 'это возможно только в режиме миниатюр или на странице галереи.'
        },
    };

    // 模板
    const rangeTemplates = {
        'en': `Invalid {{label}}! Please enter a value between {{min}} and {{max}}. Default {{default}}.`,
        'zh-CN': `{{label}}无效！请输入介于 {{min}} 和 {{max}} 之间的值。默认值为 {{default}}。`,
        'zh-TW': `{{label}}無效！請輸入介於 {{min}} 和 {{max}} 之間的值。預設值為 {{default}}。`,
        'ja': `{{label}}が無効です！{{min}}から{{max}}までの値を入力してください。デフォルトは{{default}}です。`,
        'ko': `잘못된 {{label}}! {{min}} 에서 {{max}} 사이의 값을 입력하세요. 기본값 {{default}}`,
        'ru': `Неверный {{label}}! Пожалуйста, введите значение от {{min}} до {{max}}. По умолчанию {{default}}`
    };

    // 模板替换函数
    function interpolate(template, values) {
        return template.replace(/{{(.*?)}}/g, (_, key) => values[key.trim()] ?? '');
    }

    // 包装 Proxy
    const translations = new Proxy(_translations, {
        get(target, prop) {
            // 如果访问的是 xxxRange
            const match = prop.match(/^(.+)Range$/);
            if (match) {
                const baseKey = match[1];
                const labelEntry = target[baseKey];
                if (!labelEntry || !config[baseKey] || !defaults[baseKey]) return undefined;

                const output = {};
                for (const lang of Object.keys(rangeTemplates)) {
                    output[lang] = interpolate(rangeTemplates[lang], {
                        label: labelEntry[lang],
                        min: config[baseKey].min,
                        max: config[baseKey].max,
                        default: defaults[baseKey]
                    });
                }
                return output;
            }

            // 普通字段直接返回
            return target[prop];
        }
    });

    // 根据用户语言选择对应的文本
    const translate = (key) => {
        const lang = userLang.substring(0, 2);

        switch (lang) {
            case 'zh':
                return translations[key][userLang.startsWith('zh-TW') ? 'zh-TW' : 'zh-CN'];
            case 'ja':
                return translations[key].ja;
            case 'ko':
                return translations[key].ko;
            case 'ru':
                return translations[key].ru;
            default:
                return translations[key].en;
        }
    };

    // 创建和显示设置面板
    function showSettingsPanel() {
        if (document.getElementById('settings-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'settings-panel';
        panel.style.position = 'fixed';
        panel.style.top = '24px';
        panel.style.right = '24px';
        panel.style.padding = '12px 12px';
        panel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        panel.style.border = '2px solid #00AAFF';
        panel.style.borderRadius = '9px';
        panel.style.boxShadow = '0 0 12px rgba(0,0,0,0.24)';
        panel.style.zIndex = '999999';
        panel.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        panel.style.fontSize = '12px';
        panel.style.color = '#222';

        if (isThumbnailMode) {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('zoomFactorS', zoomFactorS, config.zoomFactorS.step, config.zoomFactorS.min, config.zoomFactorS.max)}
            ${createInputHTML('margin', margin, config.margin.step, config.margin.min, config.margin.max)}
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createInputHTML('pagePadding', pagePadding, config.pagePadding.step, config.pagePadding.min, config.pagePadding.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode == true)}
            ${createCheckboxHTML('squareMode', squareMode == true)}
            ${createCheckboxHTML('infiniteScroll', infiniteScroll == true)}
            ${createCheckboxHTML('showIndex', showIndex == true)}
            ${createCheckboxHTML('liveURLUpdate', liveURLUpdate == true)}
            ${createButtonsHTML()}
        `;
        } else if (isGalleryPage) {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('zoomFactorG', zoomFactorG, config.zoomFactorG.step, config.zoomFactorG.min, config.zoomFactorG.max)}
            ${createInputHTML('spacing', spacing, config.spacing.step, config.spacing.min, config.spacing.max)}
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode == true)}
            ${createButtonsHTML()}
        `;
        } else {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            <div style='margin-top: 20px; margin-bottom: 20px; font-size: 14px; line-height: 2; font-weight: bold; text-align: center;'>${translate('InvalidPage')}</div>
            ${createButtonsHTML()}
        `;
        }

        document.body.appendChild(panel);

        panel.addEventListener('wheel', (event) => {
            event.preventDefault();
            event.stopPropagation();
        }, { passive: false });

        bindInputEvents(panel);
        bindButtons(panel);
    }

    // 动态生成输入框HTML
    function createInputHTML(name, value, step, min, max) {
        return `
        <div style='margin-bottom: 10px; display: flex; align-items: center;'>
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)} </label>
            <input type='number' id='${name}Input' value='${value}' step='${step}' min='${min}' max='${max}' style='width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-left: auto;'>
        </div>
    `;
    }

    // 动态生成复选框HTML
    function createCheckboxHTML(name, checked) {
        return `
        <div style='margin-bottom: 10px; display: flex; align-items: center;'>
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)} </label>
            <input type='checkbox' id='${name}Input' style='width: 30px; height: 20px; cursor: pointer; margin-left: auto;' ${checked ? 'checked' : ''}>
        </div>
    `;
    }

    // 动态生成按钮HTML
    function createButtonsHTML() {
        return `
        <div style='display: flex; justify-content: space-between;'>
            <button id='saveSettingsBtn' style='padding: 8px 12px; background-color: #00AAFF; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;'>${translate('save')}</button>
            <button id='cancelSettingsBtn' style='padding: 8px 12px; background-color: #FF2222; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;'>${translate('cancel')}</button>
        </div>
    `;
    }

    // 绑定事件
    function bindInputEvents(panel) {
        panel.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', handleInputChange);
            input.addEventListener('wheel', handleWheelChange);
        });

        ['#fullScreenModeInput', '#squareModeInput', '#infiniteScrollInput', '#showIndexInput', '#liveURLUpdateInput'].forEach(selector => {
            const input = panel.querySelector(selector);
            if (input) {
                input.addEventListener('change', handleCheckboxChange);
            }
        });
    }

    function bindButtons(panel) {
        panel.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseover', function () { this.style.opacity = '0.8'; });
            btn.addEventListener('mouseout', function () { this.style.opacity = '1'; });
        });

        if (isThumbnailMode || isGalleryPage) {
            panel.querySelector('#saveSettingsBtn').addEventListener('click', () => saveSettings(panel));
            panel.querySelector('#cancelSettingsBtn').addEventListener('click', () => cancelSettings(panel));
        } else {
            panel.querySelector('#saveSettingsBtn').addEventListener('click', () => panel.remove());
            panel.querySelector('#cancelSettingsBtn').addEventListener('click', () => panel.remove());
        }
    }

    // 输入框变化事件
    function handleInputChange(event) {
        const { id, value } = event.target;
        const numValue = parseFloat(value);

        if (id.includes('zoomFactorS') && numValue >= config.zoomFactorS.min && numValue <= config.zoomFactorS.max) {
            zoomFactorS = numValue;
        } else if (id.includes('zoomFactorG') && numValue >= config.zoomFactorG.min && numValue <= config.zoomFactorG.max) {
            zoomFactorG = numValue;
        } else if (id.includes('margin') && numValue >= config.margin.min && numValue <= config.margin.max) {
            margin = numValue;
        } else if (id.includes('spacing') && numValue >= config.spacing.min && numValue <= config.spacing.max) {
            spacing = numValue;
        } else if (id.includes('pageMargin') && numValue >= config.pageMargin.min && numValue <= config.pageMargin.max) {
            pageMargin = numValue;
        } else if (id.includes('pagePadding') && numValue >= config.pagePadding.min && numValue <= config.pagePadding.max) {
            pagePadding = numValue;
        }

        applyChanges();
    }

    // 滚轮事件处理
    function handleWheelChange(event) {
        event.preventDefault();
        const input = event.target;
        let value = parseFloat(input.value);
        const step = parseFloat(input.step);
        const delta = event.deltaY < 0 ? step : -step;

        value = Math.min(parseFloat(input.max), Math.max(parseFloat(input.min), value + delta));

        if (step < 1) {
            input.value = value.toFixed(2);
        } else {
            input.value = value;
        }

        input.dispatchEvent(new Event('input'));
    }

    // 复选框变化事件
    function handleCheckboxChange(event) {
        if (event.target.id === 'fullScreenModeInput') {
            fullScreenMode = event.target.checked ? true : false;
        } else if (event.target.id === 'squareModeInput') {
            squareMode = event.target.checked ? true : false;
        } else if (event.target.id === 'infiniteScrollInput') {
            infiniteScroll = event.target.checked ? true : false;
        } else if (event.target.id === 'showIndexInput') {
            showIndex = event.target.checked ? true : false;
        } else if (event.target.id === 'liveURLUpdateInput') {
            liveURLUpdate = event.target.checked ? true : false;
        }

        applyChanges();
    }

    // 保存设置
    function saveSettings(panel) {
        GM_setValue('fullScreenMode', fullScreenMode);
        GM_setValue('squareMode', squareMode);
        GM_setValue('infiniteScroll', infiniteScroll);
        GM_setValue('showIndex', showIndex);
        GM_setValue('liveURLUpdate', liveURLUpdate);

        let errors = [];
        Object.entries(config).forEach(([settingKey, { min, max }]) => {
            const input = panel.querySelector('#' + settingKey + 'Input');
            if (input) {
                const value = parseFloat(input.value);
                if (isNaN(value) || value < min || value > max) {
                    errors.push(translate(settingKey + 'Range'));
                    return;
                }
                GM_setValue(settingKey, value);
            }
        });

        if (errors.length > 0) {
            alert(errors.join('\n\n'));
            return;
        }
        panel.remove();
    }

    // 取消设置
    function cancelSettings(panel) {
        zoomFactorS = GM_getValue('zoomFactorS');
        zoomFactorG = GM_getValue('zoomFactorG');
        margin = GM_getValue('margin');
        spacing = GM_getValue('spacing');
        pageMargin = GM_getValue('pageMargin');
        pagePadding = GM_getValue('pagePadding');
        fullScreenMode = GM_getValue('fullScreenMode');
        squareMode = GM_getValue('squareMode');
        infiniteScroll = GM_getValue('infiniteScroll');
        showIndex = GM_getValue('showIndex');
        liveURLUpdate = GM_getValue('liveURLUpdate');

        applyChanges();
        panel.remove();
    }

    // 应用更改
    function applyChanges() {
        calculateDimensions();

        if (isThumbnailMode) {
            adjustColumnsS();
            modifyThumbnailSizeS();
        } else if (isGalleryPage) {
            adjustColumnsG();
            modifyThumbnailSizeG();
        }
    }

    // 初始化设置 如果为空 先保存初始值
    function initialize() {
        if (GM_getValue('zoomFactor') !== undefined && GM_getValue('zoomFactorS') === undefined) {
            GM_setValue('zoomFactorS', GM_getValue('zoomFactor'));
            GM_deleteValue('zoomFactor');
        }

        for (const [key, defaultValue] of Object.entries(defaults)) {
            window[key] = GM_getValue(key, defaultValue);

            if (GM_getValue(key) === undefined) {
                GM_setValue(key, defaultValue);
            }
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    // 计算尺寸
    function calculateDimensions() {
        columnWidthS = 250 * zoomFactorS + margin * 2; // 每列的宽度 250-400 270
        columnWidthSb = columnWidthS + (2 / devicePixelRatio); // 加上缩略图边框，边框宽度受设备像素比影响
        columnWidthG = 100 * zoomFactorG + spacing; // 画廊每列的宽度(100X) spacing:15  + (2 / devicePixelRatio)
        marginAdjustmentS = 14 + pageMargin * 2; // 页面边距调整值 body-padding:2 ido-padding:5
        marginAdjustmentG = 34 + pageMargin * 2; // 画廊页面边距调整值 body-padding:2 gdt-padding:15
        paddingAdjustmentS = pagePadding * 2; // 页面内边距调整值
    }

    // 根据页面宽度动态调整列数 非画廊页面 且 缩略图模式
    function adjustColumnsS() {
        console.log('LOLICON 缩略图页面调整');

        const width = document.documentElement.clientWidth; // window.innerWidth
        const minWidthNumber = parseFloat(getComputedStyle(c('ido')[0]).minWidth);

        let clientWidthS_itg = Math.max(width - marginAdjustmentS - paddingAdjustmentS, minWidthNumber); // 计算宽度
        columnsS = Math.max(Math.floor(clientWidthS_itg / columnWidthSb), 1); // 计算列数

        clientWidthS_itg = Math.max(columnsS * columnWidthSb, fullScreenMode ? clientWidthS_itg : minWidthNumber); // 根据全屏模式调整

        let clientWidthS_ido = Math.min(clientWidthS_itg + paddingAdjustmentS, width);
        c('ido')[0].style.maxWidth = clientWidthS_ido + 'px'; // 设置最大宽度 1370
        c('itg gld')[0].style.gridTemplateColumns = 'repeat(' + columnsS + ', 1fr)'; // 设置列数
        c('itg gld')[0].style.width = clientWidthS_itg + 'px'; // 设置边距 '99%'

        const searchbox = $('searchbox'); // 搜索盒子
        if (searchbox) {
            const tbody = searchbox.querySelector('tbody');
            if (tbody) {
                // 保存搜索类别行
                if (!initialTableRows) {
                    initialTableRows = tbody.innerHTML;
                }
                if (clientWidthS_ido >= 1460) {
                    // 合并搜索类别行
                    const rows = tbody.querySelectorAll('tr');
                    if (rows.length >= 2) {
                        const firstRow = rows[0];
                        const secondRow = rows[1];

                        Array.from(secondRow.children).forEach(td => {
                            firstRow.appendChild(td);
                        });
                        secondRow.remove();
                    }
                } else {
                    // 恢复为初始状态
                    tbody.innerHTML = initialTableRows;
                }
            }

            // 调整搜索盒子大小
            const isLargerWidth = clientWidthS_ido >= 1460;
            if (c('idi')[0]) { c('idi')[0].style.width = (isLargerWidth ? 720 + 670 : 720) + 'px'; }
            if (c('idi')[1]) { c('idi')[1].style.width = (isLargerWidth ? 720 + 670 : 720) + 'px'; }
            if ($('f_search')) { $('f_search').style.width = (isLargerWidth ? 560 + 670 : 560) + 'px'; }
        }

        // 调整更窄的收藏页面，和首页保持一致
        if (isFavoritesPage && clientWidthS_ido < (930 + paddingAdjustmentS)) {
            const noselWidth = Math.max(735, Math.min(825, clientWidthS_ido));
            if (c('nosel')[1]) { c('nosel')[1].style.width = noselWidth + 'px'; }
            const fpElements = document.querySelectorAll('div.fp');
            const fpWidth = Math.max(142, Math.min(160, (clientWidthS_ido - 16) / 5 - 1)) + 'px';
            for (let i = 0; i < Math.min(10, fpElements.length); i++) {
                fpElements[i].style.width = fpWidth;
            }
            const idoTarget = document.querySelector('.ido > div:nth-child(3)');
            if (idoTarget) {
                idoTarget.style.width = noselWidth + 'px';
                const inputTarget = idoTarget.querySelector('form:nth-child(1) > div:nth-child(2) > input:nth-child(1)');
                if (inputTarget) {
                    inputTarget.setAttribute('size', Math.max(84, Math.min(90, 84 + (noselWidth - 735) / 15)));
                }
            }
        } else if (isFavoritesPage) {
            if (c('nosel')[1]) { c('nosel')[1].style.width = '825px'; }
            const fpElements = document.querySelectorAll('div.fp');
            for (let i = 0; i < Math.min(10, fpElements.length); i++) {
                fpElements[i].style.width = '160px';
            }
            const idoTarget = document.querySelector('.ido > div:nth-child(3)');
            if (idoTarget) {
                idoTarget.style.width = '825px';
                const inputTarget = idoTarget.querySelector('form:nth-child(1) > div:nth-child(2) > input:nth-child(1)');
                if (inputTarget) {
                    inputTarget.setAttribute('size', '90');
                }
            }
        }

        if (columnsS != OLDcolumnsS && liveURLUpdate && !isPopularPage && !isFavoritesPage) {
            throttledGetTheLeftmostGl1t();
            OLDcolumnsS = columnsS;
        }
    }

    // 根据页面宽度动态调整列数 画廊页面
    function adjustColumnsG() {
        console.log('LOLICON 画廊页面调整');

        const gdt = $('gdt');
        if (gdt) {

            const width = window.innerWidth;
            const isGT200 = gdt.classList.contains('gt200');
            const pixelCorrection = 2 / devicePixelRatio;

            const spacingCorrection = isGT200 ? spacing * 2 : spacing;
            const columnWidthGL = isGT200 ? columnWidthG * 2 + pixelCorrection : columnWidthG + pixelCorrection;

            const clientWidthGL = Math.max(700, width - marginAdjustmentG) + spacingCorrection;
            const columnsG = Math.floor(clientWidthGL / columnWidthGL);
            const clientWidthG_gdt = fullScreenMode ? Math.max(700, width - marginAdjustmentG) : Math.max(700, columnsG * columnWidthGL - spacingCorrection);

            if (c('gm')[0]) { c('gm')[0].style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置最详情大宽度 720 960 1200
            if (c('gm')[1]) { c('gm')[1].style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置最评论区大宽度 720 960 1200
            if ($('gdo')) { $('gdo').style.maxWidth = clientWidthG_gdt + 20 + 'px'; } // 设置缩略图设置栏最大宽度 720 960 1200

            let clientWidthG_gdt_gd2 = clientWidthG_gdt - 255 // 设置标题栏宽度 710 925
            let clientWidthG_gdt_gmid = clientWidthG_gdt - 250 // 设置标签栏宽度 710 930
            let clientWidthG_gdt_gd4 = clientWidthG_gdt - 600 // 设置标签栏宽度 360 580

            if (width <= 1230) {
                clientWidthG_gdt_gd2 = clientWidthG_gdt_gd2 + 255;
                clientWidthG_gdt_gmid = clientWidthG_gdt_gmid + 255;
                clientWidthG_gdt_gd4 = clientWidthG_gdt_gd4 + 255;
            }

            if ($('gd2')) { $('gd2').style.width = clientWidthG_gdt_gd2 + 'px'; }
            if ($('gmid')) { $('gmid').style.width = clientWidthG_gdt_gmid + 'px'; }
            if ($('gd4')) { $('gd4').style.width = clientWidthG_gdt_gd4 + 'px'; }


            gdt.style.maxWidth = clientWidthG_gdt + 'px'; // 设置最大宽度 700 940 1180
            gdt.style.gridTemplateColumns = 'repeat(' + columnsG + ', 1fr)';
            gdt.style.gap = spacing + 'px';
        }
    }

    // 收集缩略图信息
    function collectThumbnailDataS() {
        const gl1tElements = document.querySelectorAll('.gl1t');

        gl1tElements.forEach((gl1t, index) => {
            if (index == gl1tIndex) {
                gl1tIndex++;

                const gl3t = gl1t.querySelector('.gl3t');
                const gl4t = gl1t.querySelector('.gl4t');
                const gl5t = gl1t.querySelector('.gl5t');
                const gl6t = gl1t.querySelector('.gl6t');
                const glink = gl1t.querySelector('.glink');
                const gl5tFirstChildDiv = gl5t?.querySelector('div:nth-child(1)');
                const img = gl3t?.querySelector('img');

                thumbnailData.push({
                    gl1t,
                    gl3t,
                    gl4t,
                    gl5t,
                    gl6t,
                    glink,
                    gl5tFirstChildDiv,
                    img,
                    originalWidth: gl3t?.clientWidth,
                    originalHeight: gl3t?.clientHeight,
                    originalImgWidth: img?.clientWidth,
                    originalImgHeight: img?.clientHeight,
                });
            }
        });
    }

    // 收集画廊缩略图信息
    function collectThumbnailDataG() {
        const gdt = $('gdt');
        const gdtThumbs = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(1)');
        const gdtThumbPages = gdt.querySelectorAll('a > div:nth-child(1) > div:nth-child(2)');

        gdtThumbs.forEach((el, index) => {
            const style = getComputedStyle(el);
            const backgroundPosition = style.backgroundPosition;
            const backgroundImage = style.backgroundImage;

            const width = el.clientWidth;
            const height = el.clientHeight;
            const pageEl = gdtThumbPages[index] ?? null;

            thumbnailData.push({
                el,
                backgroundPosition,
                backgroundImage,
                width,
                height,
                pageEl,
            });
        });
    }

    // 修改缩略图大小
    function modifyThumbnailSizeS() {
        console.log('LOLICON 修改缩略图大小');

        const minWidthNumber = parseFloat(getComputedStyle(c('ido')[0]).minWidth);
        let columnWidthSbm = Math.max(columnWidthSb, minWidthNumber / Math.floor(Math.max(minWidthNumber / columnWidthSb, 1)));

        if (fullScreenMode) {
            columnWidthSbm = columnWidthS * 2;
        }

        thumbnailData.forEach((data, index) => {
            const {
                gl1t,
                gl3t,
                gl4t,
                gl5t,
                gl6t,
                glink,
                gl5tFirstChildDiv,
                img,
                originalWidth,
                originalHeight,
                originalImgWidth,
                originalImgHeight
            } = data;

            let zoomFactorL = zoomFactorS;

            if (squareMode && originalWidth < 250) {
                zoomFactorL = zoomFactorS * 250 / originalWidth;
            }

            // 设置 gl1t 的宽度
            gl1t.style.minWidth = columnWidthS + 'px';
            gl1t.style.maxWidth = columnWidthSbm + 'px';

            // 调整 gl3t 的宽高
            if (gl3t) {
                const newWidth = originalWidth * zoomFactorL;
                const newHeight = originalHeight * zoomFactorL;
                gl3t.style.width = newWidth + 'px';
                gl3t.style.height = (squareMode ? newWidth : newHeight) + 'px';
            }

            // 小列宽时处理 gl5t 换行逻辑
            if (gl5t) {
                const isSmallWidth = columnWidthS <= 199;
                gl5t.style.flexWrap = isSmallWidth ? 'wrap' : '';
                gl5t.style.height = isSmallWidth ? '92px' : '';

                if (gl5tFirstChildDiv) { gl5tFirstChildDiv.style.left = isSmallWidth ? '4.5px' : ''; }
            }

            // 调整 glink 的标题序号
            if (glink) {
                const glinkSpan = glink.querySelector('span[data-LOLICON-index="true"]');

                if (showIndex) {
                    if (!glinkSpan) {
                        const span = document.createElement('span');
                        span.setAttribute('data-LOLICON-index', 'true');
                        span.textContent = `【${index + 1}】 `;
                        glink.insertBefore(span, glink.firstChild);
                    }
                } else if (glinkSpan) {
                    glinkSpan.remove();
                }
            }

            // 调整图片的宽高
            if (img) {
                const newImgWidth = originalImgWidth * zoomFactorL;
                const newImgHeight = originalImgHeight * zoomFactorL;
                let width = newImgWidth;
                let height = newImgHeight;
                let top = '';
                let left = '';

                if (squareMode) {
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
            }
        });
    }

    // 修改画廊缩略图大小
    function modifyThumbnailSizeG() {
        console.log('LOLICON 修改画廊缩略图大小');

        const totalThumbs = thumbnailData.length;

        thumbnailData.forEach((data, index) => {
            const {
                el,
                backgroundPosition,
                backgroundImage,
                width,
                height,
                pageEl,
            } = data;

            const isSprite = backgroundImage.includes('hath.network');
            const isJpg = backgroundImage.includes('.jpg');

            el.style.width = width * zoomFactorG + 'px';
            el.style.height = height * zoomFactorG + 'px';

            const [x] = backgroundPosition.split(' ').map(parseFloat);
            el.style.backgroundPosition = x * zoomFactorG + 'px 0px';

            const isLarge = width > 100 || height > 150;
            const itemWidth = isLarge ? 200 : 100;
            const itemsPerSprite = (isLarge ? 20 : 40) / (isJpg ? 2 : 1);

            pageEl.style.maxWidth = itemWidth * zoomFactorG + 'px';

            const isLastSprite = index >= totalThumbs - (totalThumbs % itemsPerSprite || itemsPerSprite);
            const itemsInThisSprite = isLastSprite ? (totalThumbs % itemsPerSprite || itemsPerSprite) : itemsPerSprite;
            const spriteWidth = itemWidth * itemsInThisSprite * zoomFactorG;

            if (isSprite) {
                el.style.backgroundSize = spriteWidth + 'px auto';
            } else {
                el.style.backgroundSize = width * zoomFactorG + 'px auto';
            }
        });
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    let isLoading = false; // 防止重复加载
    let nextPageLink = document.querySelector('#dnext')?.href; // 初始化下一页链接
    let hasMorePages = !!nextPageLink; // 检查是否还有更多页面

    // 无限滚动加载下一页
    async function loadNextPage() {
        if (isLoading || !hasMorePages) return;

        isLoading = true;
        try {
            console.log('LOLICON 加载下一页：', nextPageLink);
            const response = await fetch(nextPageLink);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const nextContent = doc.querySelectorAll('.gl1t');

            if (nextContent.length > 0) {
                const fragment = document.createDocumentFragment();
                nextContent.forEach(item => fragment.appendChild(item));
                c('itg gld')[0].appendChild(fragment);
                console.log('LOLICON 下一页内容已成功加载。');
                collectThumbnailDataS();
                modifyThumbnailSizeS();

                if (liveURLUpdate && !isPopularPage && !isFavoritesPage) {
                    getTheLeftmostGl1t();
                }
            } else {
                console.log('LOLICON 未找到下一页的内容，停止加载。');
                hasMorePages = false;
            }

            nextPageLink = doc.querySelector('#dnext')?.href;
            hasMorePages = !!nextPageLink;

            if (hasMorePages) {
                console.log('LOLICON 下一页链接已更新为：', nextPageLink);
            } else {
                console.log('LOLICON 已是最后一页');
            }
        } catch (error) {
            console.error('LOLICON 加载下一页时发生错误：', error);
        } finally {
            isLoading = false;
        }

        if (document.body.offsetHeight <= window.innerHeight) {
            loadNextPage();
        }
    }

    let elementPositions = [];

    // 获取最左侧的 gl1t 位置和URL
    function getTheLeftmostGl1t() {
        elementPositions = [];
        const gl1tElements = document.querySelectorAll('.gl1t');
        const scrollY = window.scrollY;

        for (let i = 0; i < gl1tIndex; i++) {
            if (i % columnsS === 0) {
                const gl1t = gl1tElements[i];
                if (gl1t) {
                    const rect = gl1t.getBoundingClientRect();
                    const urlElement = gl1t.querySelector('a:nth-child(1)');
                    const match = urlElement.href.match(/\/g\/(\d+)\//);

                    elementPositions.push({
                        bottom: rect.bottom + scrollY,
                        url: Number(match[1]) + 1,
                    });
                }
            }
        }

        updateURLOnScroll();
    }

    let topMostElementURL;

    // 更新地址栏
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
            let urlObj = new URL(originalUrl);
            urlObj.searchParams.delete('jump');
            urlObj.searchParams.delete('seek');
            urlObj.searchParams.set('next', newTopMostElementURL);
            window.history.replaceState(null, '', urlObj.toString());
            topMostElementURL = newTopMostElementURL;
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    // 防抖函数
    function debounce(func, wait) {
        let timeout;

        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // 节流函数
    function throttle(func, wait) {
        let lastTime = 0;
        let timeout = null;

        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - lastTime);

            if (remaining <= 0) {
                lastTime = now;
                func(...args);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    lastTime = Date.now();
                    timeout = null;
                    func(...args);
                }, remaining);
            }
        };
    }

    const throttledUpdateURLOnScroll = throttle(updateURLOnScroll, 240);
    const throttledGetTheLeftmostGl1t = throttle(getTheLeftmostGl1t, 600);

    // 设置菜单
    GM_registerMenuCommand(translate('settings'), showSettingsPanel);

    // 监控无限滚动
    function monitorInfiniteScroll() {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && infiniteScroll) {
                loadNextPage();
            }
        });

        const bottomElement = document.createElement('div');
        bottomElement.classList.add('LOLICON-infinite-scroll-trigger');
        document.body.appendChild(bottomElement);

        observer.observe(bottomElement);
    }

    console.log('LOLICON 开始');

    // 初始化
    initialize();
    calculateDimensions();
    if (isFavoritesPage) {
        c('ido')[0].style.minWidth = '740px';
    }
    if (isThumbnailMode) {
        collectThumbnailDataS();
        modifyThumbnailSizeS();
        adjustColumnsS();
        monitorInfiniteScroll();

        window.addEventListener('resize', adjustColumnsS);
        window.addEventListener('scroll', () => {
            if (liveURLUpdate && !isPopularPage && !isFavoritesPage) {
                throttledUpdateURLOnScroll();
            }
        });
    } else if (isGalleryPage) {
        collectThumbnailDataG();
        modifyThumbnailSizeG();
        adjustColumnsG();
        window.addEventListener('resize', adjustColumnsG);
    }

})();
