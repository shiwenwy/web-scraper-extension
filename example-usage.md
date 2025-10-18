# Web Scraper 扩展 - HTTP请求功能使用示例

## 功能概述

现在Web Scraper扩展支持通用的HTTP POST请求功能，用户可以在项目配置中指定要发送的URL和数据。

## 配置步骤

### 1. 创建新项目
1. 点击"添加项目"按钮
2. 填写项目名称和描述
3. 在"采集代码"字段中编写JavaScript代码

### 2. 编写采集代码
在"采集代码"字段中编写JavaScript代码，直接在代码中配置HTTP请求：

```javascript
// 采集页面数据
const title = document.title;
const links = Array.from(document.querySelectorAll('a')).map(a => ({
    text: a.textContent.trim(),
    href: a.href
}));

// 发送HTTP请求到指定URL
await sendHttpRequest('https://api.example.com/webhook', {
    title,
    links,
    timestamp: new Date().toISOString(),
    url: document.location.href
}, {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
});

// 返回采集的数据
return {
    title,
    links,
    timestamp: new Date().toISOString(),
    url: document.location.href
};
```

## 使用场景示例

### 1. 电商产品监控
```javascript
// 监控产品价格变化
const product = {
    name: document.querySelector('.product-title')?.textContent.trim(),
    price: document.querySelector('.price')?.textContent.trim(),
    availability: document.querySelector('.stock-status')?.textContent.trim(),
    url: document.location.href,
    timestamp: new Date().toISOString()
};

// 发送到监控API
await sendHttpRequest('https://api.example.com/products', product, {
    'Authorization': 'Bearer your-api-token',
    'Content-Type': 'application/json'
});

return product;
```

### 2. 新闻文章采集
```javascript
// 采集新闻文章
const article = {
    headline: document.querySelector('h1')?.textContent.trim(),
    author: document.querySelector('.author')?.textContent.trim(),
    publishDate: document.querySelector('.date')?.textContent.trim(),
    content: document.querySelector('.content')?.textContent.trim(),
    url: document.location.href,
    timestamp: new Date().toISOString()
};

// 发送到内容管理系统
await sendHttpRequest('https://cms.example.com/articles', article, {
    'X-API-Key': 'your-api-key',
    'Content-Type': 'application/json'
});

return article;
```

### 3. 表单数据自动提交
```javascript
// 采集表单数据
const formData = {
    name: document.querySelector('#name')?.value,
    email: document.querySelector('#email')?.value,
    message: document.querySelector('#message')?.value,
    timestamp: new Date().toISOString()
};

// 发送到后端API
await sendHttpRequest('https://api.example.com/forms', formData, {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
});

return formData;
```

## 技术特性

- ✅ **CORS绕过**：通过background script发送请求，避免跨域限制
- ✅ **重试机制**：自动重试失败的请求（最多3次）
- ✅ **错误处理**：完善的错误处理和日志记录
- ✅ **灵活配置**：在代码中直接配置URL和请求头
- ✅ **异步支持**：支持async/await语法
- ✅ **数据验证**：自动验证JSON格式的请求头

## 注意事项

1. **URL格式**：确保在代码中配置的URL是有效的HTTP/HTTPS地址
2. **请求头格式**：请求头必须是有效的JavaScript对象格式
3. **数据安全**：不要在代码中硬编码敏感信息，考虑使用环境变量
4. **网络连接**：确保目标服务器可访问
5. **权限设置**：某些API可能需要特定的认证信息

## 故障排除

### 常见问题
1. **请求失败**：检查代码中的URL是否正确，网络是否连通
2. **认证失败**：检查代码中请求头的认证信息
3. **格式错误**：确保请求头是有效的JavaScript对象格式
4. **超时问题**：检查目标服务器的响应时间

### 调试方法
1. 打开浏览器开发者工具查看控制台日志
2. 检查background script的日志输出
3. 验证代码中请求URL和数据的格式
4. 测试目标API的连通性
