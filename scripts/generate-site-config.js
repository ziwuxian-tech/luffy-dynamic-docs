/**
 * 自动生成 VitePress 站点配置（侧边栏 + 导航栏）
 * 支持多项目、固定链接和本地通用文档
 * sidebar 按路径分组，实现不同页面显示不同侧边栏
 */

const fs = require('fs');
const path = require('path');

const { loadConfig } = require('./lib/config-loader');
const { countItems, normalizeLink } = require('./lib/file-utils');
const { scanDirectory } = require('./lib/directory-scanner');
const { syncProjectDocuments, generateEmptyProjectPage } = require('./lib/file-sync');
const { buildNavConfig } = require('./lib/nav-builder');

const SEPARATOR = '='.repeat(60);
const ROOT_DIR = path.join(__dirname, '..');

/**
 * 写入配置数据到文件
 * @param {Object} sidebarConfig - 侧边栏配置（按路径分组的对象）
 * @param {Object} navData - 导航配置数据
 * @param {string} outputFile - 输出文件路径
 */
function writeSiteConfig(sidebarConfig, navData, outputFile) {
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const content = `// 此文件由 scripts/generate-site-config.js 自动生成
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
 * 处理单个项目，返回 sidebar section 配置
 * @param {Object} project - 项目配置
 * @param {Object} settings - 全局设置
 * @returns {Object|null} - { text, collapsed, items, count } 或 null
 */
function processProject(project, settings) {
    if (!project.enabled) {
        console.log(`  ⊘ ${project.name}: 已禁用`);
        return null;
    }

    console.log(`  → ${project.name}`);
    console.log(`    源目录: ${project.sourceDir}`);

    if (!fs.existsSync(project.sourceDir)) {
        console.log(`    ⚠️  目录不存在,跳过`);
        return null;
    }

    // 无论是否有文档，都先同步（处理已删除文件的占位页面）
    syncProjectDocuments(project, settings.docsDir, settings.excludes, ROOT_DIR);

    const projectItems = scanDirectory(
        project.sourceDir,
        project.sourceDir,
        project.name,
        settings.excludes
    );

    if (projectItems.length > 0) {
        const count = countItems(projectItems);
        console.log(`    ✓ 找到 ${count} 个文档`);

        return {
            text: project.name,
            collapsed: project.collapsed !== false,  // 默认折叠
            items: projectItems,
            count
        };
    }

    // 生成空项目占位页面
    generateEmptyProjectPage(project, settings.docsDir, ROOT_DIR);
    console.log(`    ⚠️  未找到文档，已生成占位页面`);

    return {
        text: project.name,
        collapsed: project.collapsed !== false,
        items: [{ text: '暂无文档', link: `/docs/${project.name}/index` }],
        count: 0
    };
}

/**
 * 处理本地固定文档，生成对应的 sidebar 配置
 * @param {Array} localFixedDocs - 本地固定文档配置
 * @returns {Object} - 路径分组的 sidebar 配置
 */
function processLocalFixedDocs(localFixedDocs) {
    const result = {};

    if (!Array.isArray(localFixedDocs)) {
        return result;
    }

    for (const section of localFixedDocs) {
        if (!section || !Array.isArray(section.items) || section.items.length === 0) {
            continue;
        }

        // 从第一个 item 的 link 提取路径前缀
        const firstLink = section.items[0]?.link || '';
        const normalized = normalizeLink(firstLink);

        // 提取路径前缀，如 /local/guide/使用指南 -> /local/
        const pathMatch = normalized.match(/^(\/[^/]+\/)/);
        if (pathMatch) {
            const pathKey = pathMatch[1];
            result[pathKey] = section.items.map(item => ({
                text: item.text,
                link: normalizeLink(item.link)
            }));
        }
    }

    return result;
}

/**
 * 生成站点配置（主入口）
 */
function generateSiteConfig() {
    console.log(SEPARATOR);
    console.log('开始生成站点配置...');
    console.log(SEPARATOR);

    const config = loadConfig();
    const sidebarConfig = {};
    const docsSidebar = [];  // 所有项目共享的 sidebar
    let totalDocs = 0;

    // 处理各个项目，收集到同一个 sidebar 数组中
    if (config.projects?.length > 0) {
        console.log('📁 处理项目文档...');

        for (const project of config.projects) {
            const result = processProject(project, config.settings);
            if (result) {
                docsSidebar.push({
                    text: result.text,
                    collapsed: result.collapsed,
                    items: result.items
                });
                totalDocs += result.count;
            }
        }

        // 所有项目共享 /docs/ 路径
        if (docsSidebar.length > 0) {
            sidebarConfig['/docs/'] = docsSidebar;
        }

        console.log('');
    }

    // 处理本地固定文档
    if (config.localFixedDocs) {
        console.log('📄 处理本地固定文档...');
        const localSidebar = processLocalFixedDocs(config.localFixedDocs);
        Object.assign(sidebarConfig, localSidebar);
        console.log(`    ✓ 添加了 ${Object.keys(localSidebar).length} 个本地文档路径\n`);
    }

    // 构建导航配置并写入配置文件
    const navConfig = buildNavConfig(config, sidebarConfig);
    const outputFile = path.join(ROOT_DIR, config.settings.outputFile);
    writeSiteConfig(sidebarConfig, navConfig, outputFile);

    console.log(SEPARATOR);
    console.log(`✓ 站点配置已生成: ${outputFile}`);
    console.log(`✓ 共找到 ${totalDocs} 个项目文档`);
    console.log(SEPARATOR);
}

// 执行生成
if (require.main === module) {
    try {
        generateSiteConfig();
    } catch (error) {
        console.error('生成失败:', error);
        process.exit(1);
    }
}

module.exports = { generateSiteConfig, loadConfig };