// ==UserScript==
// @name                LOLICON Wide Hentai
// @name:zh-CN          LOLICON 宽屏E绅士
// @name:zh-TW          LOLICON 寬屏E紳士
// @name:ja             LOLICON ワイド Hentai
// @name:ko             LOLICON 와이드 Hentai
// @name:ru             LOLICON Широкий Hentai
// @namespace           https://greasyfork.org/scripts/516145
// @version             2024.12.04
// @description         Full width E-Hentai and Exhentai, dynamically adjusting the page width, also allows you to adjust the size and margins of the thumbnails
// @description:zh-CN   全屏宽度 E 绅士，动态调整页面宽度，同时支持调整缩略图大小和边距
// @description:zh-TW   全螢幕寬度 E 紳士，動態調整頁面寬度，並支援調整縮圖大小及邊距
// @description:ja      フルスクリーン幅 E-Hentai と Exhentai、ページ幅を動的に調整し、サムネイルのサイズと余白も調整可能
// @description:ko      전체 화면 너비 E-Hentai와 Exhentai, 페이지 너비를 동적으로 조정하고 썸네일 크기와 여백도 조정 가능
// @description:ru      Полная ширина E-Hentai и Exhentai, динамически регулирующая ширину страницы, а также позволяющая изменять размер миниатюр и поля
// @icon                https://e-hentai.org/favicon.ico
// @match               https://e-hentai.org/*
// @match               https://exhentai.org/*
// @exclude             https://e-hentai.org/s/*
// @exclude             https://exhentai.org/s/*
// @run-at              document-end
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_registerMenuCommand
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    function $(id) { return document.getElementById(id); }

    function c(id) { return document.getElementsByClassName(id); }

    // 获取当前设备的设备像素比（DPR）
    const devicePixelRatio = window.devicePixelRatio || 1;

    // 获取用户语言
    const userLang = navigator.language || navigator.userLanguage;

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    // 定义语言包
    const translations = {
        'zoomFactor': {
            'en': 'Zoom Factor :',
            'zh-CN': '缩放比例 :',
            'zh-TW': '縮放比例 :',
            'ja': 'ズームファクター :',
            'ko': '확대 비율 :',
            'ru': 'Масштаб :'
        },
        'zoomFactorRange': {
            'en': 'Invalid zoom factor! Please enter a value between 0.5 and 10. Default 1',
            'zh-CN': '缩放比例无效！请输入 0.5 至 10 之间的值。 默认 1',
            'zh-TW': '縮放比例無效！請輸入 0.5 至 10 之間的值。 預設為 1',
            'ja': '無効なズームファクター！ 0.5 から 10 の間の値を入力してください。 デフォルトは 1',
            'ko': '잘못된 확대 비율! 0.5 에서 10 사이의 값을 입력하세요. 기본값 1',
            'ru': 'Неверный масштаб! Пожалуйста, введите значение от 0.5 до 10. По умолчанию 1'
        },
        'margin': {
            'en': 'Minimum Margin :',
            'zh-CN': '最小边距 :',
            'zh-TW': '最小邊距 :',
            'ja': '最小マージン :',
            'ko': '최소 여백 :',
            'ru': 'Минимальный отступ :'
        },
        'marginRange': {
            'en': 'Invalid minimum margin! Please enter a value between 0 and 100. Default 10',
            'zh-CN': '最小边距无效！请输入 0 至 100 之间的值。 默认 10',
            'zh-TW': '最小邊距無效！請輸入 0 至 100 之間的值。 預設為 10',
            'ja': '無効な最小マージン！ 0 から 100 の間の値を入力してください。 デフォルトは 10',
            'ko': '잘못된 최소 여백! 0 에서 100 사이의 값을 입력하세요. 기본값 10',
            'ru': 'Неверный Минимальный отступ! Пожалуйста, введите значение от 0 до 100. По умолчанию 10'
        },
        'pageMargin': {
            'en': 'Page Margin :',
            'zh-CN': '页面边距 :',
            'zh-TW': '頁面邊距 :',
            'ja': 'ページマージン :',
            'ko': '페이지 여백 :',
            'ru': 'Страница отступ :'
        },
        'pageMarginRange': {
            'en': 'Invalid page margin! Please enter a value between 0 and 1000. Default 0',
            'zh-CN': '页面边距无效！请输入 0 至 1000 之间的值。 默认 0',
            'zh-TW': '頁面邊距無效！請輸入 0 至 1000 之間的值。 預設為 0',
            'ja': '無効なページマージン！ 0 から 1000 の間の値を入力してください。 デフォルトは 0',
            'ko': '잘못된 페이지 여백! 0 에서 1000 사이의 값을 입력하세요. 기본값 0',
            'ru': 'Неверный Страница отступ! Пожалуйста, введите значение от 0 до 1000. По умолчанию 0'
        },
        'fullScreenMode': {
            'en': 'Full Screen Mode :',
            'zh-CN': '全屏模式 :',
            'zh-TW': '全螢幕模式 :',
            'ja': 'フルスクリーンモード :',
            'ko': '전체 화면 모드 :',
            'ru': 'Режим полного экрана :'
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
    };

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
        panel.style.backgroundColor = 'rgba(255, 255, 255, 0.84)';
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
            ${createInputHTML('zoomFactor', zoomFactor, config.zoomFactor.step, config.zoomFactor.min, config.zoomFactor.max)}
            ${createInputHTML('margin', margin, config.margin.step, config.margin.min, config.margin.max)}
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode === 1)}
            ${createButtonsHTML()}
        `;
        } else if (isGalleryPage) {
            panel.innerHTML = `
            <h3 style='margin: 0; margin-bottom: 10px; font-size: 16px; color: #00AAFF; text-align: center;'>${translate('settingsPanel')}</h3>
            ${createInputHTML('pageMargin', pageMargin, config.pageMargin.step, config.pageMargin.min, config.pageMargin.max)}
            ${createCheckboxHTML('fullScreenMode', fullScreenMode === 1)}
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
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)}</label>
            <input type='number' id='${name}Input' value='${value}' step='${step}' min='${min}' max='${max}' style='width: 60px; padding: 5px; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; margin-left: auto;'>
        </div>
    `;
    }

    // 动态生成复选框HTML
    function createCheckboxHTML(name, checked) {
        return `
        <div style='margin-bottom: 10px; display: flex; align-items: center;'>
            <label for='${name}Input' style='font-weight: bold; margin-right: 10px;'>${translate(name)}</label>
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
        panel.querySelector('#fullScreenModeInput').addEventListener('change', handleCheckboxChange);
    }

    function bindButtons(panel) {
        panel.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseover', function() { this.style.opacity = '0.8'; });
            btn.addEventListener('mouseout', function() { this.style.opacity = '1'; });
        });
        panel.querySelector('#saveSettingsBtn').addEventListener('click', () => saveSettings(panel));
        panel.querySelector('#cancelSettingsBtn').addEventListener('click', () => cancelSettings(panel));
    }

    // 输入框变化事件
    function handleInputChange(event) {
        const { id, value } = event.target;
        const numValue = parseFloat(value);
        if (id.includes('zoomFactor') && numValue >= config.zoomFactor.min && numValue <= config.zoomFactor.max) {
            zoomFactor = numValue;
        } else if (id.includes('margin') && numValue >= config.margin.min && numValue <= config.margin.max) {
            margin = numValue;
        } else if (id.includes('pageMargin') && numValue >= config.pageMargin.min && numValue <= config.pageMargin.max) {
            pageMargin = numValue;
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
        fullScreenMode = event.target.checked ? 1 : 0;
        applyChanges();
    }

    // 保存设置
    function saveSettings(panel) {
        GM_setValue('fullScreenMode', fullScreenMode);
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
        zoomFactor = GM_getValue('zoomFactor');
        margin = GM_getValue('margin');
        pageMargin = GM_getValue('pageMargin');
        fullScreenMode = GM_getValue('fullScreenMode');
        applyChanges();
        panel.remove();
    }

    // 应用更改
    function applyChanges() {
        calculateDimensions();
        if (isThumbnailMode) {
            adjustColumnsS();
            modifyThumbnailSize();
        } else if (isGalleryPage) {
            adjustColumnsG();
        }
    }

    // 初始化设置 如果为空 先保存初始值
    function initialize() {
        for (const [key, defaultValue] of Object.entries(defaults)) {
            window[key] = GM_getValue(key, defaultValue);
            if (GM_getValue(key) === undefined) {
                GM_setValue(key, defaultValue);
            }
        }
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    function calculateDimensions() {
        columnWidthS = 250 * zoomFactor + margin * 2; // 每列的宽度 250-400 270
        columnWidthSb = columnWidthS + (2 / devicePixelRatio); // 加上缩略图边框，边框宽度受设备像素比影响
        columnWidthG = 240; // 画廊每列的宽度
        marginAdjustmentS = 14 + pageMargin * 2; // 页面边距调整值 body-padding:2 ido-padding:5
        marginAdjustmentG = 34 + pageMargin * 2; // 画廊页面边距调整值 body-padding:2 gdt-padding:15
    }

    // 根据页面宽度动态调整列数 非画廊页面 且 缩略图模式
    function adjustColumnsS() {
        const width = window.innerWidth;
        let columnsS = Math.floor((width - marginAdjustmentS) / columnWidthSb); // 计算列数
        if (columnsS < 3) {
            columnsS = Math.floor(Math.max(c('ido')[0].clientWidth / columnWidthSb, 1));
        }
        let clientWidthS = columnsS * columnWidthSb; // 计算宽度
        if (fullScreenMode == 1) {
            clientWidthS = width - marginAdjustmentS;
        }
        c('ido')[0].style.maxWidth = clientWidthS + 'px'; // 设置最大宽度   1370
        c('itg gld')[0].style = `grid-template-columns: repeat(${columnsS}, 1fr); Width:100%`; // 设置列数和边距
        const searchbox = $('searchbox'); //搜索盒子
        if (searchbox) {
            const tbody = searchbox.querySelector('tbody');
            if (tbody) {
                // 保存搜索类别行
                if (!initialTableRows) {
                    initialTableRows = tbody.innerHTML;
                }
                if (clientWidthS >= 1460) {
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
            if (clientWidthS >= 1460) {
                if (c('idi')[0]) { c('idi')[0].style.width = 720 + 670 + 'px'; }
                if (c('idi')[1]) { c('idi')[1].style.width = 720 + 670 + 'px'; }
                if ($('f_search')) { $('f_search').style.width = 560 + 670 + 'px'; }
            } else {
                if (c('idi')[0]) { c('idi')[0].style.width = 720 + 'px'; }
                if (c('idi')[1]) { c('idi')[1].style.width = 720 + 'px'; }
                if ($('f_search')) { $('f_search').style.width = 560 + 'px'; }
            }
        }
    }

    // 根据页面宽度动态调整列数 画廊页面
    function adjustColumnsG() {
        const width = window.innerWidth;
        let columnsG = Math.floor((width - marginAdjustmentG) / columnWidthG); // 减去边距，并计算列数
        columnsG = Math.max(columnsG, 3);
        let clientWidthG = 700 + (columnsG - 3) * columnWidthG;
        if (fullScreenMode == 1 && columnsG >= 6) {
            clientWidthG = width - marginAdjustmentG;
        }
        if (columnsG >= 6) {
            if (c('gm')[0]) { c('gm')[0].style.maxWidth = (clientWidthG + 20) + 'px'; } // 设置最详情大宽度 720 960 1200
            if (c('gm')[1]) { c('gm')[1].style.maxWidth = (clientWidthG + 20) + 'px'; } // 设置最评论区大宽度 720 960 1200
            if ($('gd2')) { $('gd2').style.width = (clientWidthG - 255) + 'px'; } // 设置标题栏宽度 710 925
            if ($('gmid')) { $('gmid').style.width = (clientWidthG - 250) + 'px'; } // 设置标签栏宽度 710 930
            if ($('gd4')) { $('gd4').style.width = (clientWidthG - 600) + 'px'; } // 设置标签栏宽度 360 580
            if ($('gdo')) { $('gdo').style.maxWidth = (clientWidthG + 20) + 'px'; } // 设置缩略图设置栏最大宽度 720 960 1200
        } else {
            if (c('gm')[0]) { c('gm')[0].style.maxWidth = ''; } // 设置最详情大宽度
            if (c('gm')[1]) { c('gm')[1].style.maxWidth = ''; } // 设置最评论区大宽度
            if ($('gd2')) { $('gd2').style.width = ''; } // 设置标题栏宽度
            if ($('gmid')) { $('gmid').style.width = ''; } // 设置标签栏宽度
            if ($('gd4')) { $('gd4').style.width = '' } // 设置标签栏宽度
            if ($('gdo')) { $('gdo').style.maxWidth = ''; } // 设置缩略图设置栏最大宽度
        }
        const gdt = $('gdt');
        if (gdt) {
            if (columnsG < 6) {
                const minWidthNumber = parseFloat(getComputedStyle(c('gm')[0]).maxWidth);
                clientWidthG = minWidthNumber - 20;
                columnsG = Math.floor(minWidthNumber / columnWidthG);
            }
            gdt.style.maxWidth = clientWidthG + 'px'; // 设置最大宽度 700 940 1180
            if (gdt.classList.contains('gt100')) {
                gdt.style.gridTemplateColumns = `repeat(` + columnsG * 2 + `, 1fr)`;
            } else if (gdt.classList.contains('gt200')) {
                gdt.style.gridTemplateColumns = `repeat(` + columnsG + `, 1fr)`;
            }
        }
    }

    // 收集缩略图信息
    function collectThumbnailData() {
        const gl1tElements = document.querySelectorAll('.gl1t');
        gl1tElements.forEach(gl1t => {
            const gl3t = gl1t.querySelector('.gl3t');
            const gl5t = gl1t.querySelector('.gl5t');
            const img = gl3t ? gl3t.querySelector('img') : null;
            thumbnailData.push({
                gl1t,
                gl5t,
                gl3t,
                img,
                originalWidth: gl3t ? gl3t.clientWidth : 0,
                originalHeight: gl3t ? gl3t.clientHeight : 0,
                originalImgWidth: img ? img.clientWidth : 0,
                originalImgHeight: img ? img.clientHeight : 0,
            });
        });
    }

    // 修改缩略图大小
    function modifyThumbnailSize() {
        const minWidthNumber = parseFloat(getComputedStyle(c('ido')[0]).minWidth);
        let columnWidthSbm = Math.max(columnWidthSb, minWidthNumber / Math.floor(Math.max(minWidthNumber / columnWidthSb, 1)));
        if (fullScreenMode == 1) {
            columnWidthSbm = columnWidthS * 2;
        }
        thumbnailData.forEach(data => {
            const { gl1t, gl3t, gl5t, img, originalWidth, originalHeight, originalImgWidth, originalImgHeight } = data;
            // 设置 .gl1t 的宽度
            gl1t.style.minWidth = columnWidthS + 'px';
            gl1t.style.maxWidth = columnWidthSbm + 'px';
            // 调整 gl3t 的宽高
            if (gl3t) {
                const newWidth = originalWidth * zoomFactor;
                const newHeight = originalHeight * zoomFactor;
                gl3t.style.width = newWidth + 'px';
                gl3t.style.height = newHeight + 'px';
            }
            // 调整图片的宽高
            if (img) {
                const newImgWidth = originalImgWidth * zoomFactor;
                const newImgHeight = originalImgHeight * zoomFactor;
                img.style.width = newImgWidth + 'px';
                img.style.height = newImgHeight + 'px';
                img.style.top = ((originalHeight * zoomFactor) - newImgHeight) / 2 + 'px';
            }
            // 小列宽时处理换行逻辑
            if (gl5t) {
                if (columnWidthS <= 199) {
                    gl5t.style.flexWrap = 'wrap';
                    gl5t.style.height = '92px';
                    const firstChild = gl5t.querySelector('div:nth-child(1)');
                    if (firstChild) firstChild.style.left = '4.5px';
                } else {
                    gl5t.style.flexWrap = '';
                    gl5t.style.height = '';
                    const firstChild = gl5t.querySelector('div:nth-child(1)');
                    if (firstChild) firstChild.style.left = '';
                }
            }
        });
    }

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    /* ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

    let columnWidthS, columnWidthSb, columnWidthG, marginAdjustmentS, marginAdjustmentG;

    // 搜索类别行
    let initialTableRows = null;

    // 缩略图信息
    let thumbnailData = [];

    // 配置项
    const config = {
        zoomFactor: { step: 0.01, min: 0.5, max: 10 },
        margin: { step: 1, min: 0, max: 100 },
        pageMargin: { step: 1, min: 0, max: 1000 },
    }

    // 设置默认值
    const defaults = { zoomFactor: 1, margin: 10, pageMargin: 0, fullScreenMode: 0 };

    let zoomFactor = GM_getValue('zoomFactor', defaults.zoomFactor);
    let margin = GM_getValue('margin', defaults.margin);
    let pageMargin = GM_getValue('pageMargin', defaults.pageMargin);
    let fullScreenMode = GM_getValue('fullScreenMode', defaults.fullScreenMode);

    const isThumbnailMode = window.location.pathname.indexOf('/g/') != 0 && c('itg gld')[0]; // 非画廊页面 且 缩略图模式
    const isGalleryPage = window.location.pathname.indexOf('/g/') == 0 // /g/ 画廊页面

    GM_registerMenuCommand(`${translate('settings')}`, () => {
        showSettingsPanel();
    });

    initialize();
    calculateDimensions();
    if (isThumbnailMode) {
        collectThumbnailData();
        modifyThumbnailSize();
        adjustColumnsS();
        window.addEventListener('resize', adjustColumnsS); // 窗口大小变化时调整列数
    } else if (isGalleryPage) {
        adjustColumnsG();
        window.addEventListener('resize', adjustColumnsG); // 窗口大小变化时调整列数
    }

})();