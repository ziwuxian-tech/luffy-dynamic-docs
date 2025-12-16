/**
 * 自动生成 VitePress 侧边栏配置
 * 支持多项目、固定链接和本地通用文档
 * 支持 YAML 和 JSON 配置文件
 * 支持环境配置 (DOCS_ENV)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// 加载 .env 文件中的环境变量
require('dotenv').config();

// 配置文件基础路径
const CONFIG_BASE = path.join(__dirname, '../docs-config');

/**
 * 读取配置文件
 * 优先级:
 * 1. docs-config.{env}.yaml
 * 3. docs-config.yaml
 * @returns {Object} - 配置对象
 */
function loadConfig() {
    try {
        const env = process.env.DOCS_ENV;
        let configFiles = [];

        // 如果指定了环境，优先尝试环境配置
        if (env) {
            console.log(`ℹ️  当前环境: ${env}`);
            configFiles.push(`${CONFIG_BASE}.${env}.yaml`);
        }

        // 默认配置作为后备
        configFiles.push(`${CONFIG_BASE}.yaml`);

        let configFile;
        let content;
        let config;

        // 遍历尝试加载
        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                configFile = file;
                content = fs.readFileSync(file, 'utf-8');
                config = yaml.load(content);
                console.log(`✓ 使用配置文件: ${path.basename(file)}`);
                break;
            }
        }

        if (!config) {
            console.error('错误: 未找到有效的配置文件');
            console.log('搜索路径:');
            configFiles.forEach(f => console.log(`  - ${f}`));
            process.exit(1);
        }

        return config;
    } catch (error) {
        console.error(`读取配置文件失败: ${error.message}`);
        process.exit(1);
    }
}

/**
 * 从 Markdown 文件中提取一级标题
 * @param {string} filePath - 文件路径
 * @returns {string|null} - 提取的标题或 null
 */
function extractTitle(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        // 匹配第一个一级标题 # Title
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
    } catch (error) {
        console.error(`读取文件失败: ${filePath}`, error);
        return null;
    }
}

/**
 * 获取文件名(不含扩展名)作为备用标题
 * @param {string} filePath - 文件路径
 * @returns {string} - 文件名
 */
function getFileName(filePath) {
    return path.basename(filePath, '.md');
}

/**
 * 递归扫描目录,构建侧边栏配置
 * @param {string} dir - 要扫描的目录
 * @param {string} baseDir - 基础目录(用于计算相对路径)
 * @param {string} projectName - 项目名称(用于生成链接)
 * @param {Array} excludes - 排除列表
 * @returns {Array} - 侧边栏配置数组
 */
function scanDirectory(dir, baseDir, projectName, excludes) {
    const items = [];

    try {
        if (!fs.existsSync(dir)) {
            return items;
        }

        const files = fs.readdirSync(dir);

        for (const file of files) {
            // 跳过排除的文件和目录
            if (excludes.includes(file)) {
                continue;
            }

            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // 递归处理子目录
                const subItems = scanDirectory(fullPath, baseDir, projectName, excludes);
                if (subItems.length > 0) {
                    items.push({
                        text: file,
                        collapsed: false,
                        items: subItems
                    });
                }
            } else if (file.endsWith('.md')) {
                // 处理 Markdown 文件
                const title = extractTitle(fullPath) || getFileName(fullPath);
                const relativePath = path.relative(baseDir, fullPath);
                // 转换为 VitePress 的链接格式(使用正斜杠,去掉 .md 扩展名)
                const link = '/docs/' + projectName + '/' + relativePath.replace(/\\/g, '/').replace(/\.md$/, '');

                items.push({
                    text: title,
                    link: link
                });
            }
        }
    } catch (error) {
        console.error(`扫描目录失败: ${dir}`, error);
    }

    return items;
}

/**
 * 生成侧边栏配置
 */
function generateSidebar() {
    console.log('='.repeat(60));
    console.log('开始生成侧边栏配置...');
    console.log('='.repeat(60));

    // 加载配置
    const config = loadConfig();
    const sidebarConfig = [];
    let totalDocs = 0;

    // 处理各个项目
    if (config.projects && config.projects.length > 0) {
        console.log('📁 处理项目文档...');
        config.projects.forEach(project => {
            if (!project.enabled) {
                console.log(`  ⊘ ${project.name}: 已禁用`);
                return;
            }

            console.log(`  → ${project.name}`);
            console.log(`    源目录: ${project.sourceDir}`);

            if (!fs.existsSync(project.sourceDir)) {
                console.log(`    ⚠️  目录不存在,跳过`);
                return;
            }

            // 扫描项目目录
            const projectItems = scanDirectory(
                project.sourceDir,
                project.sourceDir,
                project.name,
                config.settings.excludes
            );

            if (projectItems.length > 0) {
                sidebarConfig.push({
                    text: project.name,
                    collapsed: project.collapsed || false,
                    items: projectItems
                });

                const count = countItems(projectItems);
                totalDocs += count;
                console.log(`    ✓ 找到 ${count} 个文档`);

                // 同步文档文件
                syncProjectDocuments(project, config.settings.docsDir);
            } else {
                console.log(`    ⚠️  未找到文档`);
            }
        });
        console.log('');
    }

    // 构建导航配置并写入配置文件
    const navConfig = buildNavConfig(config, sidebarConfig);
    const outputFile = path.join(__dirname, '..', config.settings.outputFile);
    writeSiteConfig(sidebarConfig, navConfig, outputFile);

    console.log('='.repeat(60));
    console.log(`✓ 侧边栏配置已生成: ${outputFile}`);
    console.log(`✓ 共找到 ${totalDocs} 个项目文档`);
    console.log('='.repeat(60));
}

/**
 * 同步项目文档到 VitePress docs 目录
 * @param {Object} project - 项目配置
 * @param {string} docsBaseDir - docs 基础目录
 */
function syncProjectDocuments(project, docsBaseDir) {
    const targetDir = path.join(__dirname, '..', docsBaseDir, project.name);

    // 确保目标目录存在
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // 复制文件
    copyDirectory(project.sourceDir, targetDir);
}

/**
 * 递归复制目录
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 */
function copyDirectory(src, dest) {
    const config = loadConfig();
    const excludeList = config.settings.excludes || [];

    // 确保目标目录存在
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);

    for (const file of files) {
        // 跳过排除的文件和目录
        if (excludeList.includes(file)) {
            continue;
        }

        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else if (file.endsWith('.md')) {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * 写入配置数据到文件
 * @param {Array} sidebarConfig - 侧边栏配置
 * @param {Object} navData - 导航配置数据
 * @param {string} outputFile - 输出文件路径
 */
function writeSiteConfig(sidebarConfig, navData, outputFile) {
    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const content = `// 此文件由 scripts/generate-sidebar.js 自动生成
// 最后更新时间: ${new Date().toLocaleString('zh-CN')}
// 请勿手动修改

export const sidebar = ${JSON.stringify(sidebarConfig, null, 2)}

export const nav = ${JSON.stringify(navData.nav, null, 2)}

export const projectNav = ${JSON.stringify(navData.projectNav, null, 2)}

export const projectNavTitle = ${JSON.stringify(navData.projectNavTitle, null, 2)}

export default { sidebar, nav, projectNav, projectNavTitle }
`;

    fs.writeFileSync(outputFile, content, 'utf-8');
}

/**
 * 统计配置项数量
 * @param {Array} items - 配置项数组
 * @returns {number} - 项目数量
 */
function countItems(items) {
    let count = 0;
    for (const item of items) {
        if (item.items) {
            count += countItems(item.items);
        } else if (item.link && !item.link.startsWith('http')) {
            count++;
        }
    }
    return count;
}

/**
 * 构建 VitePress 顶部导航数据
 * @param {Object} config
 * @returns {Array}
 */
function buildNavConfig(config, sidebarConfig) {
    const nav = [];

    const projectNavSection = buildProjectNavSection(config, sidebarConfig);
    if (projectNavSection) {
        nav.push({
            text: projectNavSection.title,
            items: projectNavSection.items
        });
    }

    if (Array.isArray(config.localFixedDocs)) {
        config.localFixedDocs.forEach(section => {
            const navSection = buildNavSection(section);
            if (navSection) {
                nav.push(navSection);
            }
        });
    }

    if (Array.isArray(config.fixedLinks)) {
        config.fixedLinks.forEach(section => {
            const navSection = buildNavSection(section);
            if (navSection) {
                nav.push(navSection);
            }
        });
    }

    return {
        nav,
        projectNav: projectNavSection ? projectNavSection.items : [],
        projectNavTitle: projectNavSection ? projectNavSection.title : (config.settings?.projectNavTitle || '')
    };
}

/**
 * 将配置节转换为导航项
 * @param {Object} section
 * @returns {Object|null}
 */
function buildNavSection(section) {
    if (!section || !Array.isArray(section.items) || section.items.length === 0) {
        return null;
    }

    return {
        text: section.text,
        items: section.items.map(item => ({
            text: item.text,
            link: normalizeLink(item.link)
        }))
    };
}

/**
 * 规范内部链接，确保以 / 开头
 * @param {string} link
 * @returns {string}
 */
function normalizeLink(link) {
    if (!link || typeof link !== 'string') {
        return '';
    }

    if (link.startsWith('http://') || link.startsWith('https://')) {
        return link;
    }

    return link.startsWith('/') ? link : `/${link}`;
}

/**
 * 构建项目跳转导航
 * @param {Object} config
 * @returns {Object|null}
 */
function buildProjectNavSection(config, sidebarConfig) {
    if (!config || !Array.isArray(config.projects)) {
        return null;
    }

    const enabledProjects = config.projects.filter(project => project && project.enabled);
    if (enabledProjects.length === 0) {
        return null;
    }

    const docsDir = config.settings?.docsDir || 'docs';
    const title = config.settings?.projectNavTitle || '配置导航';
    const sectionMap = buildSectionMap(sidebarConfig);

    const items = enabledProjects
        .map(project => {
            const projectSection = sectionMap.get(project.name);
            const firstDocLink = findFirstDocLink(projectSection);
            const resolvedLink = project.navLink || firstDocLink || resolveProjectLink(project, docsDir);
            const normalized = normalizeLink(resolvedLink);

            if (!normalized) {
                return null;
            }

            return {
                text: project.name,
                link: normalized
            };
        })
        .filter(Boolean);

    if (items.length === 0) {
        return null;
    }

    return {
        title,
        items
    };
}

/**
 * 生成项目在 VitePress 中的路径
 * @param {Object} project
 * @param {string} docsDir
 * @returns {string}
 */
function resolveProjectLink(project, docsDir) {
    if (project.navLink) {
        return project.navLink;
    }

    const normalizedDocsDir = docsDir.replace(/^\/+|\/+$/g, '');
    return `/${normalizedDocsDir}/${project.name}/`;
}

/**
 * 根据侧边栏配置构建文本到 section 的映射
 * @param {Array} sidebarConfig
 * @returns {Map<string, Object>}
 */
function buildSectionMap(sidebarConfig) {
    const map = new Map();
    if (!Array.isArray(sidebarConfig)) {
        return map;
    }

    sidebarConfig.forEach(section => {
        if (section && section.text) {
            map.set(section.text, section);
        }
    });

    return map;
}

/**
 * 查找 section 中第一个文档链接
 * @param {Object} section
 * @returns {string}
 */
function findFirstDocLink(section) {
    if (!section) {
        return '';
    }

    if (section.link && !section.items) {
        return section.link;
    }

    if (Array.isArray(section.items)) {
        for (const item of section.items) {
            const link = findFirstDocLink(item);
            if (link) {
                return link;
            }
        }
    }

    return '';
}

// 执行生成
if (require.main === module) {
    try {
        generateSidebar();
    } catch (error) {
        console.error('生成失败:', error);
        process.exit(1);
    }
}

module.exports = { generateSidebar, loadConfig };
