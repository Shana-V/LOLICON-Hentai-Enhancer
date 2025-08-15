// ==UserScript==
// @name                LOLICON Wide Hentai
// @name:zh-CN          LOLICON 宽屏E绅士
// @name:zh-TW          LOLICON 寬屏E紳士
// @name:ja             LOLICON ワイド Hentai
// @name:ko             LOLICON 와이드 Hentai
// @name:ru             LOLICON Широкий Hentai
// @namespace           https://greasyfork.org/scripts/516145
// @version             2025.08.12
// @description         Full width E-Hentai/Exhentai, adjustable thumbnails, quick favorites, infinite scroll
// @description:zh-CN   全屏宽度E绅士，缩略图可调，快捷收藏，无限滚动
// @description:zh-TW   全螢幕寬度E紳士，縮圖可調，快捷收藏，無限滾動
// @description:ja      E-Hentai/Exhentai全画面、サムネ調整、クイックお気に入り、無限スクロール
// @description:ko      E-Hentai/Exhentai 전체화면, 썸네일 조절, 빠른 즐겨찾기, 무한 스크롤
// @description:ru      Полная ширина E-Hentai/Exhentai, настройка миниатюр, быстрые избранные, бесконечная прокрутка
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
// ==/UserScript==

(function () {
    'use strict';

    /** 根据 id 获取对应的 DOM 元素 */
    function $(id) { return document.getElementById(id); }

    /** 根据类名获取所有匹配的 DOM 元素集合 */
    function c(id) { return document.getElementsByClassName(id); }

    /** 获取当前设备的设备像素比（DPR）*/
    const devicePixelRatio = window.devicePixelRatio || 1;

    /** 获取用户语言 */
    const userLang = navigator.language || navigator.userLanguage;

    let columnWidthS,
        columnWidthSb,
        columnWidthG,
        marginAdjustmentS,
        marginAdjustmentG,
        paddingAdjustmentS,
        columnsS,
        OLDcolumnsS;

    /** 搜索类别行 */
    let initialTableRows = null;

    /** 页面项目信息 */
    let pageItemsData = [];

    /** 页面项目序号 */
    let pageItemsIndex = 0;

    /** 配置项 */
    const config = {
        zoomFactorS: { step: 0.01, min: 0.5, max: 10 },
        zoomFactorG: { step: 0.01, min: 0.5, max: 10 },
        margin: { step: 1, min: 0, max: 100 },
        spacing: { step: 1, min: 0, max: 100 },
        pageMargin: { step: 1, min: 0, max: 1000 },
        pagePadding: { step: 1, min: 0, max: 1000 },
    };

    /** 设置默认值 */
    const defaults = {
        zoomFactorS: 1,
        zoomFactorG: 1,
        margin: 10,
        spacing: 15,
        pageMargin: 10,
        pagePadding: 10,
        fullScreenMode: false,
        squareMode: false,
        quickFavorite: true,
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
    let quickFavorite = GM_getValue('quickFavorite', defaults.quickFavorite);
    let infiniteScroll = GM_getValue('infiniteScroll', defaults.infiniteScroll);
    let showIndex = GM_getValue('showIndex', defaults.showIndex);
    let liveURLUpdate = GM_getValue('liveURLUpdate', defaults.liveURLUpdate);

    const originalUrl = window.location.href;

    const isEXH = window.location.hostname.endsWith('exhentai.org'); // 判断是否是 ex变态
    const isGalleryPage = window.location.pathname.startsWith('/g/'); // /g/ 画廊页面
    const isWatchedPage = window.location.pathname.startsWith('/watched'); // /watched 订阅页面
    const isPopularPage = window.location.pathname.startsWith('/popular'); // /popular 热门页面
    const isFavoritesPage = window.location.pathname.startsWith('/favorites.php'); // /favorites 收藏夹页面
    const displayMode = document.querySelector('.searchnav div:last-child select')?.value; // 获取当前列表的显示模式（m/p/l/e/t）

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /** 定义语言包 */
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
        'quickFavorite': {
            'en': 'Quick Favorite',
            'zh-CN': '快捷收藏',
            'zh-TW': '快捷收藏',
            'ja': 'クイックお気に入り',
            'ko': '빠른 즐겨찾기',
            'ru': 'Быстрое избранное'
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
            'en': 'Unsupported page',
            'zh-CN': '不支持此页面',
            'zh-TW': '不支援此頁面',
            'ja': 'このページはサポートされていません',
            'ko': '이 페이지는 지원되지 않습니다',
            'ru': 'Эта страница не поддерживается'
        }
    };

    /** 模板 */
    const rangeTemplates = {
        'en': `Invalid {{label}}! Please enter a value between {{min}} and {{max}}. Default {{default}}.`,
        'zh-CN': `{{label}}无效！请输入介于 {{min}} 和 {{max}} 之间的值。默认值为 {{default}}。`,
        'zh-TW': `{{label}}無效！請輸入介於 {{min}} 和 {{max}} 之間的值。預設值為 {{default}}。`,
        'ja': `{{label}}が無効です！{{min}}から{{max}}までの値を入力してください。デフォルトは{{default}}です。`,
        'ko': `잘못된 {{label}}! {{min}} 에서 {{max}} 사이의 값을 입력하세요. 기본값 {{default}}`,
        'ru': `Неверный {{label}}! Пожалуйста, введите значение от {{min}} до {{max}}. По умолчанию {{default}}`
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

    /** 根据用户语言选择对应的文本 */
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

    /** 创建和显示设置面板 */
    function showSettingsPanel() {
        if ($('settings-panel')) return;

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

        if (displayMode === 't') {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('zoomFactorS', zoomFactorS, config.zoomFactorS.step, config.zoomFactorS.min, config.zoomFactorS.max)}
            ${createInputHTML('margin', margin, config.margin.step, config.margin.min, config.margin.max)}
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createInputHTML('pagePadding', pagePadding, config.pagePadding.step, config.pagePadding.min, config.pagePadding.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode === true)}
            ${createCheckboxHTML('squareMode', squareMode === true)}
            ${createCheckboxHTML('quickFavorite', quickFavorite === true)}
            ${createCheckboxHTML('infiniteScroll', infiniteScroll === true)}
            ${createCheckboxHTML('showIndex', showIndex === true)}
            ${createCheckboxHTML('liveURLUpdate', liveURLUpdate === true)}
            ${createButtonsHTML()}
        `;
        } else if (displayMode) {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createInputHTML('pagePadding', pagePadding, config.pagePadding.step, config.pagePadding.min, config.pagePadding.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode === true)}
            ${createCheckboxHTML('quickFavorite', quickFavorite === true)}
            ${createCheckboxHTML('infiniteScroll', infiniteScroll === true)}
            ${createCheckboxHTML('showIndex', showIndex === true)}
            ${createCheckboxHTML('liveURLUpdate', liveURLUpdate === true)}
            ${createButtonsHTML()}
        `;
        } else if (isGalleryPage) {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('zoomFactorG', zoomFactorG, config.zoomFactorG.step, config.zoomFactorG.min, config.zoomFactorG.max)}
            ${createInputHTML('spacing', spacing, config.spacing.step, config.spacing.min, config.spacing.max)}
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode === true)}
            ${createCheckboxHTML('quickFavorite', quickFavorite === true)}
            ${createButtonsHTML()}
        `;
        } else {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            <div style='margin-top: 20px; margin-bottom: 20px; font-size: 14px; line-height: 2; font-weight: bold; text-align: center; min-width: 160px;'>${translate('InvalidPage')}</div>
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

    /** 动态生成输入框HTML */
    function createInputHTML(name, value, step, min, max) {
        return `
        <div style='margin-bottom: 10px; display: flex; align-items: center;'>
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)} </label>
            <input type='number' id='${name}Input' value='${value}' step='${step}' min='${min}' max='${max}' style='width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-left: auto;'>
        </div>
    `;
    }

    /** 动态生成复选框HTML */
    function createCheckboxHTML(name, checked) {
        return `
        <div style='margin-bottom: 10px; display: flex; align-items: center;'>
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)} </label>
            <input type='checkbox' id='${name}Input' style='width: 30px; height: 20px; cursor: pointer; margin-left: auto;' ${checked ? 'checked' : ''}>
        </div>
    `;
    }

    /** 动态生成按钮HTML */
    function createButtonsHTML() {
        return `
        <div style='display: flex; justify-content: space-between;'>
            <button id='saveSettingsBtn' style='padding: 8px 12px; background-color: #00AAFF; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;'>${translate('save')}</button>
            <button id='cancelSettingsBtn' style='padding: 8px 12px; background-color: #FF2222; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;'>${translate('cancel')}</button>
        </div>
    `;
    }

    /** 绑定事件 */
    function bindInputEvents(panel) {
        panel.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', handleInputChange);
            input.addEventListener('wheel', handleWheelChange);
        });

        ['#fullScreenModeInput', '#squareModeInput', '#quickFavoriteInput', '#infiniteScrollInput', '#showIndexInput', '#liveURLUpdateInput'].forEach(selector => {
            const input = panel.querySelector(selector);
            if (input) {
                input.addEventListener('change', handleCheckboxChange);
            }
        });
    }

    /** 绑定按钮 */
    function bindButtons(panel) {
        panel.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseover', function () { this.style.opacity = '0.8'; });
            btn.addEventListener('mouseout', function () { this.style.opacity = '1'; });
        });

        if (displayMode || isGalleryPage) {
            panel.querySelector('#saveSettingsBtn').addEventListener('click', () => saveSettings(panel));
            panel.querySelector('#cancelSettingsBtn').addEventListener('click', () => cancelSettings(panel));
        } else {
            panel.querySelector('#saveSettingsBtn').addEventListener('click', () => panel.remove());
            panel.querySelector('#cancelSettingsBtn').addEventListener('click', () => panel.remove());
        }
    }

    /** 输入框变化事件 */
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

    /** 滚轮事件处理 */
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

    /** 复选框变化事件 */
    function handleCheckboxChange(event) {
        if (event.target.id === 'fullScreenModeInput') {
            fullScreenMode = event.target.checked ? true : false;
        } else if (event.target.id === 'squareModeInput') {
            squareMode = event.target.checked ? true : false;
        } else if (event.target.id === 'quickFavoriteInput') {
            quickFavorite = event.target.checked ? true : false;
        } else if (event.target.id === 'infiniteScrollInput') {
            infiniteScroll = event.target.checked ? true : false;
        } else if (event.target.id === 'showIndexInput') {
            showIndex = event.target.checked ? true : false;
        } else if (event.target.id === 'liveURLUpdateInput') {
            liveURLUpdate = event.target.checked ? true : false;
        }

        applyChanges();
    }

    /** 保存设置 */
    function saveSettings(panel) {
        GM_setValue('fullScreenMode', fullScreenMode);
        GM_setValue('squareMode', squareMode);
        GM_setValue('quickFavorite', quickFavorite);
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

    /** 取消设置 */
    function cancelSettings(panel) {
        zoomFactorS = GM_getValue('zoomFactorS');
        zoomFactorG = GM_getValue('zoomFactorG');
        margin = GM_getValue('margin');
        spacing = GM_getValue('spacing');
        pageMargin = GM_getValue('pageMargin');
        pagePadding = GM_getValue('pagePadding');
        fullScreenMode = GM_getValue('fullScreenMode');
        squareMode = GM_getValue('squareMode');
        quickFavorite = GM_getValue('quickFavorite');
        infiniteScroll = GM_getValue('infiniteScroll');
        showIndex = GM_getValue('showIndex');
        liveURLUpdate = GM_getValue('liveURLUpdate');

        applyChanges();
        panel.remove();
    }

    /** 应用更改 */
    function applyChanges() {
        calculateDimensions();

        if (displayMode) {
            adjustColumnsS();
            if (displayMode === 't') {
                modifyThumbnailSizeS();
            }
            updateGlinkIndex();
            if (quickFavorite) {
                initFavcat();
                replaceFavClickS();
            } else {
                restoreElements();
            }
        } else if (isGalleryPage) {
            adjustColumnsG();
            modifyThumbnailSizeG();
            if (quickFavorite) {
                initFavcat();
                replaceFavClickG();
            } else {
                restoreElements();
            }
        }
    }

    /** 初始化设置 如果为空 先保存初始值 */
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

    /** 计算尺寸 */
    function calculateDimensions() {
        columnWidthS = 250 * zoomFactorS + margin * 2; // 每列的宽度 250-400 270
        columnWidthSb = columnWidthS + (2 / devicePixelRatio); // 加上缩略图边框，边框宽度受设备像素比影响
        columnWidthG = 100 * zoomFactorG + spacing; // 画廊每列的宽度(100X) spacing:15  + (2 / devicePixelRatio)
        marginAdjustmentS = 14 + pageMargin * 2; // 页面边距调整值 body-padding:2 ido-padding:5
        marginAdjustmentG = 34 + pageMargin * 2; // 画廊页面边距调整值 body-padding:2 gdt-padding:15
        paddingAdjustmentS = pagePadding * 2; // 页面内边距调整值
    }

    /** 根据页面宽度动态调整列数 非画廊页面 */
    function adjustColumnsS() {
        console.log('LOLICON 非画廊页面调整');

        const width = document.documentElement.clientWidth; // window.innerWidth
        const minWidthNumber = parseFloat(getComputedStyle(c('ido')[0]).minWidth);

        let clientWidthS_itg = Math.max(width - marginAdjustmentS - paddingAdjustmentS, minWidthNumber); // 计算宽度
        columnsS = Math.max(Math.floor(clientWidthS_itg / columnWidthSb), 1); // 计算列数
        const baseWidth = (displayMode === 't') ? columnsS * columnWidthSb : Math.min(720 + 670 + 14, clientWidthS_itg);
        clientWidthS_itg = Math.max(baseWidth, fullScreenMode ? clientWidthS_itg : minWidthNumber); // 根据全屏模式调整

        let clientWidthS_ido = Math.min(clientWidthS_itg + paddingAdjustmentS, width);
        c('ido')[0].style.maxWidth = clientWidthS_ido + 'px'; // 设置最大宽度 1370
        if (displayMode === 't') {
            c('itg gld')[0].style.gridTemplateColumns = 'repeat(' + columnsS + ', 1fr)'; // 设置列数
            c('itg gld')[0].style.width = clientWidthS_itg + 'px'; // 设置边距 '99%'
        } else {
            c('itg')[0].style.maxWidth = clientWidthS_itg + 'px';
            c('itg')[0].style.width = clientWidthS_itg + 'px';
        }

        const searchnavEls = c('searchnav');
        const paddingValue = (width - marginAdjustmentS - paddingAdjustmentS >= minWidthNumber)
            ? pagePadding
            : (width - minWidthNumber - marginAdjustmentS) / 2;
        for (let i = 0; i < 2; i++) {
            const el = searchnavEls[i];
            if (!el) continue;
            el.children[0].style.padding = '0 0 0 ' + + paddingValue + 'px';
            el.children[6].style.padding = '0 ' + paddingValue + 'px 0 0';
        }

        const searchbox = $('searchbox'); // 搜索盒子
        if (searchbox) {
            const tbody = searchbox.querySelector('tbody');
            if (tbody) {
                // 保存搜索类别行
                if (!initialTableRows) {
                    initialTableRows = tbody.innerHTML;
                }
                if (clientWidthS_ido >= 720 + 670 + 14 + paddingAdjustmentS) { //1460
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
            const isLargerWidth = clientWidthS_ido >= 720 + 670 + 14 + paddingAdjustmentS; //1460
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
            throttledgetRowInfo();
            OLDcolumnsS = columnsS;
        }
    }

    /** 根据页面宽度动态调整列数 画廊页面 */
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

            let clientWidthG_gdt_gd2 = clientWidthG_gdt - 255; // 设置标题栏宽度 710 925
            let clientWidthG_gdt_gmid = clientWidthG_gdt - 250; // 设置标签栏宽度 710 930
            let clientWidthG_gdt_gd4 = clientWidthG_gdt - 600; // 设置标签栏宽度 360 580

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

    /** 收集非画廊页面信息 */
    function collectDataS() {
        if (displayMode === 't') {
            const gElements = document.querySelectorAll('.gl1t');
            gElements.forEach((gl1t, index) => {
                if (index === pageItemsIndex) {
                    pageItemsIndex++;

                    const gl3t = gl1t.querySelector('.gl3t');
                    const gl4t = gl1t.querySelector('.gl4t');
                    const gl5t = gl1t.querySelector('.gl5t');
                    const gl6t = gl1t.querySelector('.gl6t');
                    const glink = gl1t.querySelector('.glink');
                    const gl5tFirstChildDiv = gl5t?.querySelector('div:nth-child(1)');
                    const img = gl3t?.querySelector('img');

                    pageItemsData.push({
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
        } else {
            const gElements = document.querySelectorAll('.itg > tbody > tr');
            gElements.forEach((tr, index) => {
                if (index === pageItemsIndex) {
                    pageItemsIndex++;

                    if (tr.querySelector('td.itd')) return; // 跳过广告行
                    const glink = tr.querySelector('.glink');
                    pageItemsData.push({
                        tr,
                        glink,
                    });
                }
            });
        }
    }

    /** 收集画廊页面信息 */
    function collectDataG() {
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

            pageItemsData.push({
                el,
                backgroundPosition,
                backgroundImage,
                width,
                height,
                pageEl,
            });
        });
    }

    /** 修改缩略图大小 */
    function modifyThumbnailSizeS() {
        console.log('LOLICON 修改缩略图大小');

        const minWidthNumber = parseFloat(getComputedStyle(c('ido')[0]).minWidth);
        let columnWidthSbm = Math.max(columnWidthSb, minWidthNumber / Math.floor(Math.max(minWidthNumber / columnWidthSb, 1)));

        if (fullScreenMode) {
            columnWidthSbm = columnWidthS * 2;
        }

        pageItemsData.forEach((data, index) => {
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

    /** 调整 glink 的标题序号 */
    function updateGlinkIndex() {
        console.log('LOLICON 调整 glink 的标题序号');

        pageItemsData.forEach((data, index) => {
            const { glink } = data;

            if (glink) {
                const glinkSpan = glink.querySelector('span[data-LOLICON-index="true"]');

                if (showIndex) {
                    if (!glinkSpan) {
                        const span = document.createElement('span');
                        span.setAttribute('data-LOLICON-index', 'true');
                        if (displayMode === 't' || displayMode === 'e') {
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

    /** 获取雪碧图信息 */
    function getSpriteTypeInfo(url) {
        if (url.includes('.hath.network/c2/')) {
            return { isSprite: true, itemWidth: 200, itemsPerSprite: 20 };
        } else if (url.includes('.hath.network/c1/')) {
            return { isSprite: true, itemWidth: 100, itemsPerSprite: 40 };
        } else if (url.includes('.hath.network/cm/')) {
            return { isSprite: true, itemWidth: 100, itemsPerSprite: 20 };
        } else {
            return { isSprite: false, itemWidth: 200, itemsPerSprite: 1 };
        }
        // 20210812开始更换缩略图
        // 旧100x雪碧图2000px   20张    .hath.network/cm/*.jpg
        // 旧200x缩略图200px    1张     ehgt.org/*.jpg
        // 旧200x缩略图200px    1张     exhentai.org/*.jpg
        // 新100x雪碧图4000px   40张    .hath.network/c1/*.webp
        // 新200x雪碧图4000px   20张    .hath.network/c2/*.webp
    }

    /** 修改画廊缩略图大小 */
    function modifyThumbnailSizeG() {
        console.log('LOLICON 修改画廊缩略图大小');

        const totalThumbs = pageItemsData.length;

        pageItemsData.forEach((data, index) => {
            const {
                el,
                backgroundPosition,
                backgroundImage,
                width,
                height,
                pageEl,
            } = data;

            // 获取雪碧图信息
            const { isSprite, itemWidth, itemsPerSprite } = getSpriteTypeInfo(backgroundImage);

            // 设置缩略图尺寸
            el.style.width = width * zoomFactorG + 'px';
            el.style.height = height * zoomFactorG + 'px';

            // 背景图位置缩放
            const [x] = backgroundPosition.split(' ').map(parseFloat);
            el.style.backgroundPosition = x * zoomFactorG + 'px 0px';

            // 设置page最大宽度（便于居中）
            pageEl.style.maxWidth = itemWidth * zoomFactorG + 'px';

            // 处理雪碧图尺寸
            if (isSprite) {
                const isLastSprite = index >= totalThumbs - (totalThumbs % itemsPerSprite || itemsPerSprite);
                const itemsInThisSprite = isLastSprite ? (totalThumbs % itemsPerSprite || itemsPerSprite) : itemsPerSprite;
                const spriteWidth = itemWidth * itemsInThisSprite * zoomFactorG;
                el.style.backgroundSize = spriteWidth + 'px auto';
            } else {
                // 非雪碧图直接缩放原图
                el.style.backgroundSize = width * zoomFactorG + 'px auto';
            }
        });
    }
    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
    /** 颜色映射表，用于给不同收藏分类分配颜色 */
    const COLOR_MAP = {
        0: '#cccccc', 1: '#ff8080', 2: '#ffaa55', 3: '#ffff00', 4: '#80ff80',
        5: '#aaff55', 6: '#00ffff', 7: '#aaaaff', 8: '#cc80ff', 9: '#ff80cc'
    };

    const COLOR_MAP_B = {
        0: 'rgb(0, 0, 0)', 1: 'rgb(255, 0, 0)', 2: 'rgb(255, 170, 0)', 3: 'rgb(221, 221, 0)', 4: 'rgb(0, 136, 0)',
        5: 'rgb(153, 255, 68)', 6: 'rgb(68, 187, 255)', 7: 'rgb(0, 0, 255)', 8: 'rgb(85, 0, 136)', 9: 'rgb(238, 136, 238)'
    };

    /** 异步获取收藏分类名称列表 */
    const getFavcatList = async () => {
        let names = [];
        try {
            if (location.pathname === '/uconfig.php') {
                const html = document.documentElement.innerHTML;
                names = [...html.matchAll(/input type="text" name="favorite_\d" value="(.*?)"/g)].map(m => m[1]);
            }
            else if (location.pathname === '/gallerypopups.php') {
                const nosel = document.querySelector('.nosel');
                if (nosel) {
                    names = [...nosel.querySelectorAll('div[style*="cursor:pointer"]')]
                        .map(div => div.querySelector('div[style*="padding-top"]').textContent.trim());
                }
            } else {
                // 其他页面用 fetch 请求
                const res = await fetch(location.origin + '/uconfig.php');
                const html = await res.text();
                names = [...html.matchAll(/input type="text" name="favorite_\d" value="(.*?)"/g)].map(m => m[1]);
            }
        } catch (error) {
            console.error('LOLICON 获取收藏分类名称列表时发生错误：', error);
        }
        return names;
    };

    let favcat = [];

    /** 异步函数：更新收藏分类名称 */
    async function updateFavcat() {
        favcat = await getFavcatList();
        localStorage.favcat = JSON.stringify(favcat);
        console.log('LOLICON 更新收藏分类名称', favcat);
    }

    /** 异步函数：初始化收藏分类列表 */
    async function initFavcat() {
        if (['/uconfig.php', '/gallerypopups.php'].includes(location.pathname)) {
            await updateFavcat();
        } else if (!localStorage.favcat || localStorage.favcat === '[]') {
            await updateFavcat();
        } else {
            favcat = JSON.parse(localStorage.favcat);
        }
    }

    /** 异步函数：发送收藏或取消收藏请求 // url: 请求地址 // add: true为收藏，false为取消收藏 // favcat: 收藏分类编号 */
    const fetchFav = async (url, add, favcat) => {
        try {
            // 发送POST请求，提交收藏/取消收藏参数
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: add
                    ? `favcat=${favcat}&favnote=&apply=Add+to+Favorites&update=1`
                    : 'favcat=favdel&favnote=&update=1', // 取消收藏请求体
                credentials: 'same-origin' // 同源策略，携带cookie
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
        const existingMenu = document.querySelector('.fav_popup_menu');
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

        // 创建菜单容器并设置基础样式
        const menu = document.createElement('div');
        menu.className = 'fav_popup_menu';
        menu.style.position = 'absolute';
        menu.style.background = 'rgba(0, 0, 0, 0.8)';
        // menu.style.border = '1px solid #000';
        // menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 0 6px rgba(0,0,0,0.8)';
        menu.style.padding = '2px';
        menu.style.zIndex = 9999;
        menu.style.color = '#fff';
        menu.style.minWidth = '166px';
        menu.style.fontSize = '10pt';
        menu.style.fontWeight = 'bold';
        menu.style.textShadow = '0 0 1.2px #000, 0 0 2.4px #000, 0 0 3.6px #000';


        // 创建菜单项的辅助函数
        function createMenuItem(text, color, onClick, options = {}) {
            const item = document.createElement('div');
            item.textContent = text;
            item.style.padding = '6px';
            item.style.cursor = 'pointer';
            item.style.color = color;
            item.style.userSelect = 'none';
            item.style.minHeight = '18px';
            item.style.lineHeight = '18px';
            // item.style.transition = 'background 0.1s';

            if (options.isAction) {
                item.style.flex = '1';
                item.style.textAlign = 'center';
                item.style.fontSize = (options.fontSize || 10) + 'pt';
            }

            item.addEventListener('mouseenter', () => {
                item.style.color = '#fff';
                item.style.background = color;
            });
            item.addEventListener('mouseleave', () => {
                item.style.color = color;
                item.style.background = 'transparent';
            });
            item.addEventListener('click', onClick);

            return item;
        }

        // 添加收藏分类菜单项
        favcat.forEach((name, idx) => {
            const item = createMenuItem(name, COLOR_MAP[idx] || '#fff', () => {
                fetchFav(favUrl, true, idx).then(() => {
                    const iconDiv = anchorEl.querySelector('div#fav div.i');
                    if (iconDiv) {
                        iconDiv.style.marginLeft = '0';
                    }
                });
                menu.remove();
            });
            menu.appendChild(item);
        });

        // 添加“取消收藏”和“收藏弹窗”同一行按钮
        const actionRow = document.createElement('div');
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
        let top = window.scrollY + rect.top - menuHeight;

        if (top < window.scrollY) {
            top = window.scrollY + rect.bottom;
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

        const handler = e => {
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
        if (!Array.isArray(favcat) || favcat.length !== 10) return;

        // 先保存原始状态
        const originalOnClick = el.getAttribute('onclick');
        const originalCursor = el.style.cursor;

        // 自定义点击事件回调
        const clickHandler = e => {
            e.stopPropagation();
            showFavMenu(el, favUrl);
        };

        // 移除原onclick属性，防止冲突
        el.removeAttribute('onclick');

        // 设置鼠标样式为指针
        el.style.cursor = 'pointer';

        // 添加自定义事件监听
        el.addEventListener('click', clickHandler);

        // 保存状态以备恢复
        const oldState = originalStates.get(el) || {};
        originalStates.set(el, {
            ...oldState,
            originalOnClick,
            originalCursor,
            clickHandler,
        });
    };

    /** 恢复元素原onclick事件、鼠标样式、取消自定义点击事件 */
    function restoreElements() {
        // 先把所有保存的元素缓存到数组，避免边遍历边修改 Map 导致的问题
        const elements = Array.from(originalStates.keys());

        for (const el of elements) {
            const state = originalStates.get(el);
            if (!state) continue;

            const { originalOnClick, originalCursor, clickHandler, onMouseEnter, onMouseLeave, iconMarginLeft } = state;

            el.style.cursor = originalCursor || '';

            // 移除鼠标悬停事件监听
            el.removeEventListener('mouseenter', onMouseEnter);
            el.removeEventListener('mouseleave', onMouseLeave);

            if (displayMode) {

            } else if (isGalleryPage) {
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

            // 解绑自定义点击事件
            el.removeEventListener('click', clickHandler);

            // 从缓存中移除，防止内存泄漏
            originalStates.delete(el);
        }
    }

    /** 给元素绑定鼠标悬停事件 */
    function bindHoverEffect(el) {
        function onMouseEnter() {
            let color = '#000000';
            if (isEXH) { color = '#ffffff'; }
            if (displayMode) {
                if (el.style.backgroundColor) return;
                el.style.borderColor = color;
            } else if (isGalleryPage) {
                el.style.backgroundColor = color + '24';
                el.style.boxShadow = 'inset 0 0 0 2px' + color + '12';
            }
        }
        function onMouseLeave() {
            if (displayMode) {
                if (el.style.backgroundColor) return;
                el.style.borderColor = '';
            } else if (isGalleryPage) {
                el.style.backgroundColor = '';
                el.style.boxShadow = '';
            }
        }

        // 保存状态以备恢复
        const oldState = originalStates.get(el) || {};
        originalStates.set(el, {
            ...oldState,
            onMouseEnter,
            onMouseLeave,
        });

        // 绑定事件
        el.addEventListener('mouseenter', onMouseEnter);
        el.addEventListener('mouseleave', onMouseLeave);
    }

    /** 给列表页中的元素替换点击事件，启用收藏菜单 */
    function replaceFavClickS() {
        if (!displayMode) return;

        // 不同显示模式对应的选择器，选出需要绑定收藏功能的元素
        const strategies = {
            m: '.glthumb + div',
            p: '.glthumb + div',
            l: '.glthumb + div > :first-child',
            e: '.gl3e>:nth-child(2)',
            t: '.gl5t>:first-child>:nth-child(2)'
        };

        // 遍历所有匹配元素
        document.querySelectorAll(strategies[displayMode]).forEach(el => {
            if (!el.onclick) return; // 无onclick则跳过

            bindHoverEffect(el);

            const favUrl = el.onclick.toString().match(/https.*addfav/)[0]; // 从onclick字符串提取收藏URL
            replaceOnClick(el, favUrl); // 替换点击事件绑定收藏弹窗
        });
    }

    /** 给画廊元素替换点击事件，启用收藏菜单 */
    function replaceFavClickG() {
        // 从URL路径解析画廊ID和类型
        const matchGallery = location.pathname.match(/\/g\/(\d+)\/(\w+)/);
        if (!matchGallery) return;

        // 拼接收藏请求地址
        const favUrl = `${location.origin}/gallerypopups.php?gid=${matchGallery[1]}&t=${matchGallery[2]}&act=addfav`;

        // 获取画廊按钮容器元素
        const gdf = document.querySelector('#gdf');
        if (!gdf) return;

        // 调整按钮容器样式，使内容居中且无左边距，设定固定高度和半透明背景
        gdf.style.paddingTop = '0';
        gdf.style.paddingLeft = '0';
        gdf.style.height = '36px';
        gdf.style.display = 'flex';
        gdf.style.justifyContent = 'center';
        gdf.style.alignItems = 'center';
        gdf.style.marginTop = '6px';

        bindHoverEffect(gdf);

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

        replaceOnClick(gdf, favUrl); // 替换点击事件绑定收藏弹窗
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    let isLoading = false; // 防止重复加载
    let nextPageLink = document.querySelector('#dnext')?.href; // 初始化下一页链接
    let hasMorePages = !!nextPageLink; // 检查是否还有更多页面

    /** 无限滚动加载下一页 */
    async function loadNextPage() {
        if (isLoading || !hasMorePages) return;

        isLoading = true;
        try {
            console.log('LOLICON 加载下一页：', nextPageLink);
            const response = await fetch(nextPageLink);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let nextContent;
            if (displayMode === 't') {
                nextContent = doc.querySelectorAll('.gl1t');
            } else {
                nextContent = doc.querySelectorAll('.itg > tbody > tr');
            }

            if (nextContent.length > 0) {
                const fragment = document.createDocumentFragment();
                nextContent.forEach((item, index) => {
                    if (displayMode === 't' || displayMode === 'e' || index > 0) {
                        fragment.appendChild(item);
                    }
                });

                if (displayMode === 't') {
                    c('itg gld')[0].appendChild(fragment);
                } else {
                    document.querySelector('.itg > tbody').appendChild(fragment);
                }

                console.log('LOLICON 下一页内容已成功加载。');
                collectDataS();
                if (displayMode === 't') {
                    modifyThumbnailSizeS();
                }
                updateGlinkIndex();
                if (quickFavorite) {
                    replaceFavClickS();
                }

                if (liveURLUpdate && !isPopularPage && !isFavoritesPage) {
                    getRowInfo();
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

    /** 获取行信息 */
    function getRowInfo() {
        const strategies = {
            m: 'td:nth-child(4) > a:nth-child(1)',
            p: 'td:nth-child(4) > a:nth-child(1)',
            l: 'td:nth-child(3) > a:nth-child(1)',
            e: 'td:nth-child(1) > div:nth-child(1) > a:nth-child(1)',
            t: 'a:nth-child(1)'
        };
        elementPositions = [];
        const scrollY = window.scrollY;
        let gElements;
        if (displayMode === 't') {
            gElements = document.querySelectorAll('.gl1t');
        } else {
            gElements = document.querySelectorAll('.itg > tbody > tr');
        }
        const startIndex = (displayMode === 't' || displayMode === 'e') ? 0 : 1;
        for (let i = startIndex; i < pageItemsIndex; i++) {
            if (displayMode !== 't' || i % columnsS === 0) {
                const el = gElements[i];
                if (el) {
                    const rect = el.getBoundingClientRect();
                    const urlElement = el.querySelector(strategies[displayMode]);
                    if (!urlElement) continue;
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

    /** 防抖函数 */
    function debounce(func, wait) {
        let timeout;

        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /** 节流函数 */
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

    /** 更新地址栏-节流 */
    const throttledUpdateURLOnScroll = throttle(updateURLOnScroll, 240);
    /** 获取行信息-节流 */
    const throttledgetRowInfo = throttle(getRowInfo, 600);

    /** 监控无限滚动 */
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

    // 设置菜单
    GM_registerMenuCommand(translate('settings'), showSettingsPanel);

    // 初始化基础
    initialize();
    calculateDimensions();

    // 收藏页面设置
    if (isFavoritesPage) {
        c('ido')[0].style.minWidth = '740px';
    }

    // 初始化收藏分类
    if (quickFavorite) {
        initFavcat();
    }

    if (displayMode) {
        collectDataS();

        if (displayMode === 't') {
            modifyThumbnailSizeS();
        }
        adjustColumnsS();
        updateGlinkIndex();
        monitorInfiniteScroll();

        if (quickFavorite) {
            replaceFavClickS();
        }
        window.addEventListener('resize', adjustColumnsS);
        window.addEventListener('scroll', () => {
            if (liveURLUpdate && !isPopularPage && !isFavoritesPage) {
                throttledUpdateURLOnScroll();
            }
        });
    } else if (isGalleryPage) {
        collectDataG();
        modifyThumbnailSizeG();
        adjustColumnsG();

        if (quickFavorite) {
            replaceFavClickG();
        }
        window.addEventListener('resize', adjustColumnsG);
    }

})();
