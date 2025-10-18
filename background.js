// Background Script - 处理扩展的后台逻辑
console.log('Web Scraper Background Script loaded');

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Web Scraper Extension installed');
    
    // 初始化存储数据
    chrome.storage.local.set({
        projects: [],
        currentProject: null,
        settings: {
            autoRunInterval: 5000, // 默认5秒自动运行间隔
            maxProjects: 50, // 最大项目数量
            enableLogging: true
        }
    });
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'scrapingResult':
            handleScrapingResult(message, sender);
            break;
        case 'scrapingError':
            handleScrapingError(message, sender);
            break;
        case 'getSettings':
            getSettings().then(sendResponse);
            return true; // 保持消息通道开放
        case 'updateSettings':
            updateSettings(message.settings).then(sendResponse);
            return true;
        case 'sendHttpRequest':
            sendHttpRequest(message.data).then(sendResponse);
            return true;
    }
});

/**
 * 处理爬虫执行结果
 */
function handleScrapingResult(message, sender) {
    console.log('Scraping result received:', message);
    
    // 保存结果到存储
    saveScrapingResult(message);
    
    // 直接转发消息给popup，不重复包装
    chrome.runtime.sendMessage(message).catch(() => {
        // popup可能已关闭，忽略错误
    });
}

/**
 * 处理爬虫执行错误
 */
function handleScrapingError(message, sender) {
    console.error('Scraping error received:', message);
    
    // 直接转发错误消息给popup，不重复包装
    chrome.runtime.sendMessage(message).catch(() => {
        // popup可能已关闭，忽略错误
    });
}

/**
 * 保存爬虫结果
 */
async function saveScrapingResult(message) {
    try {
        const result = await chrome.storage.local.get(['scrapingResults']);
        const results = result.scrapingResults || [];
        
        // 添加新结果
        results.push({
            id: Date.now().toString(),
            projectName: message.projectName,
            data: message.data,
            timestamp: message.timestamp,
            url: message.url
        });
        
        // 只保留最近100条结果
        if (results.length > 100) {
            results.splice(0, results.length - 100);
        }
        
        await chrome.storage.local.set({ scrapingResults: results });
    } catch (error) {
        console.error('保存爬虫结果失败:', error);
    }
}

/**
 * 获取设置
 */
async function getSettings() {
    try {
        const result = await chrome.storage.local.get(['settings']);
        return result.settings || {
            autoRunInterval: 5000,
            maxProjects: 50,
            enableLogging: true
        };
    } catch (error) {
        console.error('获取设置失败:', error);
        return null;
    }
}

/**
 * 更新设置
 */
async function updateSettings(newSettings) {
    try {
        const currentSettings = await getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        await chrome.storage.local.set({ settings: updatedSettings });
        return true;
    } catch (error) {
        console.error('更新设置失败:', error);
        return false;
    }
}

// 监听标签页更新，用于自动运行
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // 检查是否有自动运行的项目
        checkAutoRun(tabId);
    }
});

/**
 * 检查是否需要自动运行
 */
async function checkAutoRun(tabId) {
    try {
        const result = await chrome.storage.local.get(['currentProject', 'settings']);
        const currentProject = result.currentProject;
        const settings = result.settings;
        
        if (currentProject && settings?.autoRun) {
            // 延迟执行，确保页面完全加载
            setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                    action: 'runScraping',
                    project: currentProject
                }).catch(() => {
                    // 忽略错误，可能是页面不支持content script
                });
            }, 1000);
        }
    } catch (error) {
        console.error('检查自动运行失败:', error);
    }
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.currentProject) {
            console.log('当前项目已更改:', changes.currentProject.newValue);
        }
        
        if (changes.projects) {
            console.log('项目列表已更新');
        }
    }
});

// 扩展启动时的初始化
chrome.runtime.onStartup.addListener(() => {
    console.log('Web Scraper Extension started');
});

/**
 * 发送HTTP请求 - 通过background script避免CORS问题
 * 包含重试机制和错误处理
 * @param {Object} requestData - 请求数据
 * @param {string} requestData.url - 请求URL
 * @param {Object} requestData.data - 请求数据
 * @param {Object} requestData.headers - 请求头
 * @param {number} retryCount - 重试次数
 */
async function sendHttpRequest(requestData, retryCount = 0) {
    const { url, data, headers = {} } = requestData;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    
    // 默认请求头
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...headers
    };
    
    try {
        console.log(`📤 通过background script发送HTTP请求... (尝试 ${retryCount + 1}/${maxRetries + 1})`);
        console.log('请求URL:', url);
        console.log('请求数据:', data);
        console.log('请求头:', defaultHeaders);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(data)
        });
        
        console.log('📤 HTTP请求已发送，状态:', response.status);
        
        if (response.ok) {
            const result = await response.text();
            console.log('✅ HTTP请求发送成功！', result);
            return { success: true, message: 'HTTP请求发送成功', response: result };
        } else {
            const errorText = await response.text();
            console.log('⚠️ HTTP请求发送失败，状态码:', response.status, errorText);
            
            // 如果是服务器错误且还有重试次数，则重试
            if (response.status >= 500 && retryCount < maxRetries) {
                console.log(`🔄 服务器错误，${retryDelay}ms后重试...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return await sendHttpRequest(requestData, retryCount + 1);
            }
            
            return { success: false, message: `HTTP请求发送失败，状态码: ${response.status}`, response: errorText };
        }
        
    } catch (error) {
        console.error('❌ HTTP请求发送失败:', error);
        
        // 如果是网络错误且还有重试次数，则重试
        if (retryCount < maxRetries && (
            error.name === 'TypeError' || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')
        )) {
            console.log(`🔄 网络错误，${retryDelay}ms后重试...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return await sendHttpRequest(requestData, retryCount + 1);
        }
        
        return { success: false, message: `HTTP请求发送失败: ${error.message}` };
    }
}
