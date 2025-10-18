// 安全的网页采集器 - CSP兼容版本
// 这个文件提供了一个完全CSP兼容的网页数据采集解决方案

/**
 * 安全采集器类 - 避免CSP限制
 */
class SafeScraper {
    constructor() {
        this.pageData = null;
        this.results = [];
    }

    /**
     * 提取页面数据
     */
    extractPageData() {
        const data = {
            // 基础信息
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            
            // 页面结构
            html: document.documentElement.outerHTML,
            
            // 元素数据
            elements: {
                // 所有链接
                links: this.extractLinks(),
                
                // 所有图片
                images: this.extractImages(),
                
                // 所有表单
                forms: this.extractForms(),
                
                // 所有表格
                tables: this.extractTables(),
                
                // 所有列表
                lists: this.extractLists(),
                
                // 所有标题
                headings: this.extractHeadings(),
                
                // 所有段落
                paragraphs: this.extractParagraphs(),
                
                // 所有按钮
                buttons: this.extractButtons()
            },
            
            // 元数据
            meta: this.extractMeta(),
            
            // 样式信息
            styles: this.extractStyles()
        };
        
        this.pageData = data;
        return data;
    }

    /**
     * 提取链接数据
     */
    extractLinks() {
        return Array.from(document.querySelectorAll('a')).map(link => ({
            text: link.textContent.trim(),
            href: link.href,
            title: link.title,
            target: link.target,
            rel: link.rel
        }));
    }

    /**
     * 提取图片数据
     */
    extractImages() {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt,
            title: img.title,
            width: img.width,
            height: img.height,
            loading: img.loading
        }));
    }

    /**
     * 提取表单数据
     */
    extractForms() {
        return Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action,
            method: form.method,
            enctype: form.enctype,
            inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                name: input.name,
                type: input.type,
                value: input.value,
                placeholder: input.placeholder,
                required: input.required,
                disabled: input.disabled
            }))
        }));
    }

    /**
     * 提取表格数据
     */
    extractTables() {
        return Array.from(document.querySelectorAll('table')).map(table => ({
            headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim()),
            rows: Array.from(table.querySelectorAll('tr')).map(tr => 
                Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
            )
        }));
    }

    /**
     * 提取列表数据
     */
    extractLists() {
        return Array.from(document.querySelectorAll('ul, ol')).map(list => ({
            type: list.tagName.toLowerCase(),
            items: Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim())
        }));
    }

    /**
     * 提取标题数据
     */
    extractHeadings() {
        return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(heading => ({
            level: parseInt(heading.tagName.charAt(1)),
            text: heading.textContent.trim()
        }));
    }

    /**
     * 提取段落数据
     */
    extractParagraphs() {
        return Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim());
    }

    /**
     * 提取按钮数据
     */
    extractButtons() {
        return Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
            text: btn.textContent.trim() || btn.value,
            type: btn.type,
            disabled: btn.disabled,
            form: btn.form?.id
        }));
    }

    /**
     * 提取元数据
     */
    extractMeta() {
        return {
            description: document.querySelector('meta[name="description"]')?.content,
            keywords: document.querySelector('meta[name="keywords"]')?.content,
            author: document.querySelector('meta[name="author"]')?.content,
            viewport: document.querySelector('meta[name="viewport"]')?.content,
            robots: document.querySelector('meta[name="robots"]')?.content
        };
    }

    /**
     * 提取样式信息
     */
    extractStyles() {
        return {
            bodyClasses: document.body.className,
            documentClasses: document.documentElement.className,
            bodyId: document.body.id,
            documentId: document.documentElement.id
        };
    }

    /**
     * 根据选择器查找元素
     */
    findElements(selector) {
        try {
            return Array.from(document.querySelectorAll(selector)).map(el => ({
                tagName: el.tagName.toLowerCase(),
                text: el.textContent.trim(),
                html: el.innerHTML,
                attributes: this.getElementAttributes(el),
                classes: el.className,
                id: el.id
            }));
        } catch (error) {
            console.error('选择器查找失败:', selector, error);
            return [];
        }
    }

    /**
     * 获取元素属性
     */
    getElementAttributes(element) {
        const attributes = {};
        for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
        }
        return attributes;
    }

    /**
     * 根据用户配置执行采集
     */
    async executeScraping(config) {
        try {
            // 提取页面数据
            const pageData = this.extractPageData();
            
            // 根据配置执行采集
            const results = await this.processScrapingConfig(config, pageData);
            
            return {
                success: true,
                data: results,
                page: {
                    url: pageData.url,
                    title: pageData.title,
                    timestamp: pageData.timestamp
                }
            };
            
        } catch (error) {
            console.error('采集执行失败:', error);
            return {
                success: false,
                error: error.message,
                page: {
                    url: window.location.href,
                    title: document.title,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 处理采集配置
     */
    async processScrapingConfig(config, pageData) {
        const results = {};
        
        // 处理选择器配置
        if (config.selectors) {
            for (const [key, selector] of Object.entries(config.selectors)) {
                try {
                    const elements = this.findElements(selector);
                    results[key] = elements;
                } catch (error) {
                    results[key] = { error: error.message };
                }
            }
        }
        
        // 处理文本提取配置
        if (config.textExtraction) {
            for (const [key, selector] of Object.entries(config.textExtraction)) {
                try {
                    const elements = this.findElements(selector);
                    results[key] = elements.map(el => el.text);
                } catch (error) {
                    results[key] = { error: error.message };
                }
            }
        }
        
        // 处理属性提取配置
        if (config.attributeExtraction) {
            for (const [key, config_item] of Object.entries(config.attributeExtraction)) {
                try {
                    const elements = this.findElements(config_item.selector);
                    results[key] = elements.map(el => el.attributes[config_item.attribute] || null);
                } catch (error) {
                    results[key] = { error: error.message };
                }
            }
        }
        
        // 处理等待配置
        if (config.wait) {
            await this.wait(config.wait);
        }
        
        return results;
    }

    /**
     * 等待指定时间
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 滚动到元素
     */
    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * 点击元素
     */
    clickElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.click();
        }
    }

    /**
     * 设置输入框值
     */
    setInputValue(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// 导出安全采集器
window.SafeScraper = SafeScraper;
