// Content Script - 在网页中执行爬虫代码
console.log('Web Scraper Content Script loaded');

// 防止重复注入 - 如果已经存在实例，则移除旧的监听器
if (window.webScraperContentScript) {
    console.log('⚠️ 检测到重复的content script，移除旧实例');
    if (window.webScraperContentScript.messageListener) {
        chrome.runtime.onMessage.removeListener(window.webScraperContentScript.messageListener);
    }
}

// 创建单例实例
window.webScraperContentScript = {
    isRunning: false,
    messageListener: null
};

// 监听来自popup的消息
window.webScraperContentScript.messageListener = (message, sender, sendResponse) => {
    if (message.action === 'ping') {
        // 响应ping消息，表示content script已存在
        if (sendResponse) {
            sendResponse({ success: true, message: 'Content script已存在' });
        }
        return true;
    }
    
    if (message.action === 'runScraping') {
        // 防止重复执行
        if (window.webScraperContentScript.isRunning) {
            console.log('⚠️ 爬虫正在运行中，跳过重复执行');
            if (sendResponse) {
                sendResponse({ success: false, message: '正在运行中' });
            }
            return true;
        }

        console.log('🚀 开始执行爬虫项目:', message.project.name);
        console.log('📝 项目数据:', message.project);
        
        window.webScraperContentScript.isRunning = true;
        runScrapingCode(message.project);
        
        // 确保发送响应
        if (sendResponse) {
            sendResponse({ success: true });
        }
    }
    
    // 返回true表示异步响应
    return true;
};

// 注册消息监听器
chrome.runtime.onMessage.addListener(window.webScraperContentScript.messageListener);

/**
 * 执行爬虫代码
 * @param {Object} project - 项目配置
 */
async function runScrapingCode(project) {
    try {
        console.log('🚀 开始执行爬虫代码:', project.code);
        console.log('📝 项目配置详情:', {
            name: project.name
        });
        // 创建安全的执行环境
        const result = await executeUserCode(project.code, project);
        console.log('🚀 爬虫执行完成:', result);
        // 结果已经在executeUserCode中发送，这里不需要重复发送
        
    } catch (error) {
        console.error('❌ 爬虫执行失败:', error.message);
        
        // 发送错误信息回popup
        chrome.runtime.sendMessage({
            action: 'scrapingError',
            projectName: project.name,
            error: error.message,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
    } finally {
        // 重置运行状态
        window.webScraperContentScript.isRunning = false;
    }
}

/**
 * 安全执行用户代码 - 使用Web Worker方式，绕过CSP限制
 * @param {string} userCode - 用户编写的JS代码
 * @param {Object} project - 项目配置
 * @returns {Promise<any>} 执行结果
 */
async function executeUserCode(userCode, project) {
    try {
        console.log('🚀 开始执行用户代码，使用Web Worker方式');
        console.log('📝 用户代码内容:', userCode);
        console.log('📝 项目配置:', project);
        
        return new Promise((resolve, reject) => {
            // 创建内联Worker代码
            const workerCode = `
                // 监听来自主线程的消息
                self.addEventListener('message', function(e) {
                    const { userCode, pageData } = e.data;
                    
                    try {
                        console.log('🚀 Worker开始执行用户代码');
                        
                        // 在worker中执行用户代码
                        const result = executeUserCodeInWorker(userCode, pageData);
                        
                        // 发送结果回主线程
                        self.postMessage({
                            success: true,
                            data: result,
                            message: '用户代码执行完成',
                            timestamp: new Date().toISOString()
                        });
                        
                    } catch (error) {
                        console.error('❌ Worker执行失败:', error);
                        
                        // 发送错误回主线程
                        self.postMessage({
                            success: false,
                            error: error.message,
                            stack: error.stack,
                            message: '用户代码执行失败',
                            timestamp: new Date().toISOString()
                        });
                    }
                });
                
                 // 在Worker中执行用户代码
                 function executeUserCodeInWorker(userCode, pageData) {
                     
                     // 创建执行环境，模拟页面环境
                     const executionContext = {
                         // 基本对象
                         console: console,
                         setTimeout: setTimeout,
                         setInterval: setInterval,
                         clearTimeout: clearTimeout,
                         clearInterval: clearInterval,
                         Promise: Promise,
                         Array: Array,
                         Object: Object,
                         JSON: JSON,
                         Date: Date,
                         Math: Math,
                         String: String,
                         Number: Number,
                         Boolean: Boolean,
                         RegExp: RegExp,
                         Error: Error,
                         TypeError: TypeError,
                         ReferenceError: ReferenceError,
                         SyntaxError: SyntaxError,
                         
                         // 页面数据
                         pageData: pageData,
                         
                         // 模拟window对象
                         window: {
                             location: {
                                 href: pageData.url,
                                 hostname: new URL(pageData.url).hostname,
                                 pathname: new URL(pageData.url).pathname
                             }
                         },
                         
                         // HTTP请求功能
                         sendHttpRequest: function(url, data, headers = {}) {
                             console.log('📤 用户代码请求发送HTTP请求:', { url, data, headers });
                             
                             // 发送消息到主线程，由主线程转发到background script
                             self.postMessage({
                                 type: 'sendHttpRequest',
                                 data: {
                                     url: url,
                                     data: data,
                                     headers: headers
                                 }
                             });
                             
                             return Promise.resolve({
                                 success: true,
                                 message: 'HTTP请求已发送'
                             });
                         }
                     };
                    
                    // 创建执行函数
                    const executeCode = \`
                        (function() {
                            // 用户代码在这里执行
                            \${userCode}
                        })();
                    \`;
                    
                    // 使用Function构造器执行（在worker中通常允许）
                    const executeFunction = new Function(
                        ...Object.keys(executionContext),
                        executeCode
                    );
                    
                    // 执行用户代码
                    return executeFunction(...Object.values(executionContext));
                }
            `;
            
            // 创建Blob URL
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            // 创建Web Worker
            const worker = new Worker(workerUrl);
            
            // 准备页面数据
            const pageData = {
                title: document.title,
                url: window.location.href,
                html: document.documentElement.outerHTML
            };
            
            // 不再需要HTTP配置，用户直接在代码中配置
            
            // 监听worker消息
            worker.onmessage = function(e) {
                const result = e.data;

                if (result.type === 'sendHttpRequest') {
                    // 通过background script发送HTTP请求，避免CORS问题
                    sendHttpRequestViaBackground(result.data);
                    return; // 只处理HTTP请求，不发送结果消息
                }
                
                // 清理worker和Blob URL
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                
                console.log('✅ 用户代码执行完成，结果:', result);
                
                // 发送结果到popup
                chrome.runtime.sendMessage({
                    action: 'scrapingResult',
                    projectName: project.name,
                    data: result,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
                
                resolve({
                    message: '用户代码执行完成',
                    result: result,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
            };
            
            // 监听worker错误
            worker.onerror = function(error) {
                console.error('❌ Worker执行失败:', error);
                
                // 清理worker和Blob URL
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                
                const errorResult = {
                    success: false,
                    error: error.message,
                    stack: error.stack,
                    message: 'Worker执行失败',
                    timestamp: new Date().toISOString()
                };
                
                // 发送错误信息
                chrome.runtime.sendMessage({
                    action: 'scrapingError',
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                
                reject(error);
            };
            
            // 发送用户代码到worker
            worker.postMessage({
                userCode: userCode,
                pageData: pageData
            });
            
            // 设置超时
            setTimeout(() => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                reject(new Error('执行超时'));
            }, 10000);
        });
        
    } catch (error) {
        console.error('❌ 执行失败:', error);
        
        const errorResult = {
            success: false,
            error: error.message,
            stack: error.stack,
            message: '代码执行失败',
            timestamp: new Date().toISOString()
        };
        
        // 发送错误信息
        chrome.runtime.sendMessage({
            action: 'scrapingError',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        throw error;
    }
}


// 通过background script发送HTTP请求，避免CORS问题
async function sendHttpRequestViaBackground(requestData) {
    try {
        console.log('📤 通过background script发送HTTP请求...');
        console.log('请求数据:', requestData);
        
        const response = await chrome.runtime.sendMessage({
            action: 'sendHttpRequest',
            data: requestData
        });
        
        if (response && response.success) {
            console.log('✅ HTTP请求发送成功！', response.message);
        } else {
            console.log('⚠️ HTTP请求发送失败:', response ? response.message : '未知错误');
        }
        
    } catch (error) {
        console.error('❌ HTTP请求发送失败:', error);
    }
}



