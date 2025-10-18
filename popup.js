// 项目数据管理
class ProjectManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.autoRunInterval = null;
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupEventListeners();
        this.renderProjects();
        this.updateCurrentProjectDisplay();
        
        // 初始化完成
        console.log('🚀 Web Scraper 已初始化');
    }

    async loadProjects() {
        try {
            const result = await chrome.storage.local.get(['projects', 'currentProject']);
            this.projects = result.projects || [];
            this.currentProject = result.currentProject || null;
        } catch (error) {
            console.error('加载项目失败:', error);
            this.projects = [];
        }
    }

    async saveProjects() {
        try {
            await chrome.storage.local.set({
                projects: this.projects,
                currentProject: this.currentProject
            });
        } catch (error) {
            console.error('保存项目失败:', error);
        }
    }

    setupEventListeners() {
        // 添加项目按钮
        document.getElementById('addProjectBtn').addEventListener('click', () => {
            this.showProjectModal();
        });

        // 模态框相关事件
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideProjectModal();
        });

        document.getElementById('cancelProject').addEventListener('click', () => {
            this.hideProjectModal();
        });

        document.getElementById('saveProject').addEventListener('click', () => {
            this.saveProject();
        });

        // 运行按钮
        document.getElementById('runOnceBtn').addEventListener('click', () => {
            this.runCurrentProject();
        });


        // 自动运行按钮
        document.getElementById('toggleAutoBtn').addEventListener('click', () => {
            this.toggleAutoRun();
        });

        // 点击模态框外部关闭
        document.getElementById('projectModal').addEventListener('click', (e) => {
            if (e.target.id === 'projectModal') {
                this.hideProjectModal();
            }
        });
    }

    showProjectModal(project = null) {
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('modalTitle');
        const nameInput = document.getElementById('projectName');
        const descInput = document.getElementById('projectDescription');
        const codeInput = document.getElementById('scrapingCode');

        if (project) {
            title.textContent = '编辑项目';
            nameInput.value = project.name;
            descInput.value = project.description || '';
            codeInput.value = project.code || '';
        } else {
            title.textContent = '添加新项目';
            nameInput.value = '';
            descInput.value = '';
            codeInput.value = '';
        }

        modal.style.display = 'block';
        nameInput.focus();
    }

    hideProjectModal() {
        document.getElementById('projectModal').style.display = 'none';
    }

    async saveProject() {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription').value.trim();
        const code = document.getElementById('scrapingCode').value.trim();

        if (!name) {
            alert('请输入项目名称');
            return;
        }

        if (!code) {
            alert('请输入采集代码');
            return;
        }

        // 检查是否是编辑模式
        if (this.editingProjectId) {
            // 编辑现有项目
            const existingProjectIndex = this.projects.findIndex(p => p.id === this.editingProjectId);
            if (existingProjectIndex >= 0) {
                this.projects[existingProjectIndex] = {
                    ...this.projects[existingProjectIndex],
                    name,
                    description,
                    code,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // 创建新项目
            const project = {
                id: Date.now().toString(),
                name,
                description,
                code,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.projects.push(project);
        }

        await this.saveProjects();
        this.renderProjects();
        this.hideProjectModal();
        this.editingProjectId = null;
        
        this.showRunStatus('✅ 项目保存成功！', 'success');
    }

    renderProjects() {
        const projectsList = document.getElementById('projectsList');
        
        if (this.projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📁</div>
                    <h3>还没有项目</h3>
                    <p>点击"添加项目"开始创建你的第一个爬虫项目</p>
                </div>
            `;
            return;
        }

        projectsList.innerHTML = this.projects.map(project => `
            <div class="project-card ${this.currentProject?.id === project.id ? 'active' : ''}" 
                 data-project-id="${project.id}">
                <div class="project-name">${this.escapeHtml(project.name)}</div>
                <div class="project-description">${this.escapeHtml(project.description || '无描述')}</div>
                <div class="project-actions">
                    <button class="btn btn-primary" data-action="select" data-project-id="${project.id}">
                        <span class="icon">▶</span>
                        选择
                    </button>
                    <button class="btn btn-secondary" data-action="edit" data-project-id="${project.id}">
                        <span class="icon">✏️</span>
                        编辑
                    </button>
                    <button class="btn btn-danger" data-action="delete" data-project-id="${project.id}">
                        <span class="icon">🗑️</span>
                        删除
                    </button>
                </div>
            </div>
        `).join('');
        
        // 重新绑定事件监听器
        this.bindProjectActions();
    }

    bindProjectActions() {
        // 使用事件委托来处理动态生成的按钮
        const projectsList = document.getElementById('projectsList');
        if (projectsList) {
            // 移除旧的事件监听器（如果存在）
            projectsList.removeEventListener('click', this.handleProjectAction);
            
            // 添加新的事件监听器
            this.handleProjectAction = (e) => {
                const button = e.target.closest('button[data-action]');
                if (button) {
                    const action = button.getAttribute('data-action');
                    const projectId = button.getAttribute('data-project-id');
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    switch (action) {
                        case 'select':
                            this.selectProject(projectId);
                            break;
                        case 'edit':
                            this.editProject(projectId);
                            break;
                        case 'delete':
                            this.deleteProject(projectId);
                            break;
                    }
                }
            };
            
            projectsList.addEventListener('click', this.handleProjectAction);
        }
    }

    async selectProject(projectId) {
        this.currentProject = this.projects.find(p => p.id === projectId);
        await this.saveProjects();
        this.renderProjects();
        this.updateCurrentProjectDisplay();
        this.showRunStatus('✅ 项目已选择: ' + this.currentProject.name, 'success');
    }

    editProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            this.editingProjectId = projectId;
            this.showProjectModal(project);
        }
    }

    async deleteProject(projectId) {
        if (confirm('确定要删除这个项目吗？')) {
            this.projects = this.projects.filter(p => p.id !== projectId);
            if (this.currentProject?.id === projectId) {
                this.currentProject = null;
                this.stopAutoRun();
            }
            await this.saveProjects();
            this.renderProjects();
            this.updateCurrentProjectDisplay();
            this.showRunStatus('✅ 项目已删除', 'success');
        }
    }

    updateCurrentProjectDisplay() {
        const currentSection = document.getElementById('currentProjectSection');
        const currentName = document.getElementById('currentProjectName');
        const toggleBtn = document.getElementById('toggleAutoBtn');

        if (this.currentProject) {
            currentSection.style.display = 'block';
            currentName.textContent = this.currentProject.name;
            
            if (this.autoRunInterval) {
                toggleBtn.innerHTML = '<span class="icon">⏸</span>停止自动运行';
                toggleBtn.classList.remove('btn-secondary');
                toggleBtn.classList.add('btn-danger');
            } else {
                toggleBtn.innerHTML = '<span class="icon">▶</span>自动运行';
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-secondary');
            }
        } else {
            currentSection.style.display = 'none';
        }
    }

    async runCurrentProject() {
        if (!this.currentProject) {
            alert('请先选择一个项目');
            return;
        }

        try {
            // 获取当前活动标签页
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                alert('无法获取当前标签页');
                return;
            }

            console.log('🎯 运行项目:', this.currentProject.name, '| 页面:', tab.url);

            // 检查是否是支持的页面
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
                alert('无法在此页面运行爬虫，请打开一个普通网页');
                return;
            }

            // 尝试注入content script（如果还没有注入）
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (injectError) {
                // Content script可能已经存在，忽略错误
            }

            // 等待一下确保content script加载完成
            await new Promise(resolve => setTimeout(resolve, 100));

            // 向content script发送运行指令
            await chrome.tabs.sendMessage(tab.id, {
                action: 'runScraping',
                project: this.currentProject
            });

            // 显示运行状态
            this.showRunStatus('正在运行...', 'success');
        } catch (error) {
            console.error('运行项目失败:', error);
            
            if (error.message.includes('Could not establish connection')) {
                this.showRunStatus('连接失败: 请刷新页面后重试', 'error');
            } else {
                this.showRunStatus('运行失败: ' + error.message, 'error');
            }
        }
    }

    toggleAutoRun() {
        if (this.autoRunInterval) {
            this.stopAutoRun();
        } else {
            this.startAutoRun();
        }
    }

    startAutoRun() {
        if (!this.currentProject) {
            alert('请先选择一个项目');
            return;
        }

        this.autoRunInterval = setInterval(() => {
            this.runCurrentProject();
        }, 5000); // 每5秒运行一次

        this.updateCurrentProjectDisplay();
        this.showRunStatus('已启动自动运行', 'success');
    }

    stopAutoRun() {
        if (this.autoRunInterval) {
            clearInterval(this.autoRunInterval);
            this.autoRunInterval = null;
        }
        this.updateCurrentProjectDisplay();
        this.showRunStatus('已停止自动运行', 'info');
    }

    showRunStatus(message, type) {
        // 创建状态提示
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;

        document.body.appendChild(statusDiv);

        // 3秒后自动移除
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

}

// 初始化项目管理器
const projectManager = new ProjectManager();

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'scrapingResult') {
        console.log('🚀 收到结果:', message.data);
        projectManager.showRunStatus('✅ 代码执行完成', 'success');
        
        // 存储结果到当前项目
        if (projectManager.currentProject) {
            projectManager.currentProject.lastResult = message.data;
            projectManager.currentProject.lastRunTime = new Date().toISOString();
            projectManager.saveProjects();
        }
    }
    if (message.action === 'scrapingError') {
        console.error('🚨 执行错误:', message.error);
        projectManager.showRunStatus('❌ 代码执行失败: ' + message.error, 'error');
    }
});
