/**
 * 导航构建模块
 * 负责构建 VitePress 顶部导航配置
 */

const { normalizeLink } = require('./file-utils');

/**
 * 构建 VitePress 顶部导航数据
 * @param {Object} config - 完整配置
 * @param {Array} sidebarConfig - 侧边栏配置
 * @returns {Object} - 导航配置数据
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

    // 合并处理 localFixedDocs 和 fixedLinks
    [config.localFixedDocs, config.fixedLinks]
        .filter(Array.isArray)
        .flat()
        .forEach(section => {
            const navSection = buildNavSection(section);
            if (navSection) {
                nav.push(navSection);
            }
        });

    return {
        nav,
        projectNav: projectNavSection?.items ?? [],
        projectNavTitle: projectNavSection?.title ?? (config.settings?.projectNavTitle || '')
    };
}

/**
 * 将配置节转换为导航项
 * @param {Object} section - 配置节
 * @returns {Object|null} - 导航项或 null
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
 * 构建项目跳转导航
 * @param {Object} config - 完整配置
 * @param {Object} sidebarConfig - 侧边栏配置（路径分组对象）
 * @returns {Object|null} - 项目导航配置或 null
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

    // 从 /docs/ 路径获取所有项目的 sidebar
    const docsSidebar = sidebarConfig['/docs/'] || [];

    const items = enabledProjects
        .map(project => {
            // 从 sidebar 中找到对应项目的配置
            const projectSection = docsSidebar.find(section => section.text === project.name);
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

    return { title, items };
}

/**
 * 生成项目在 VitePress 中的路径
 * @param {Object} project - 项目配置
 * @param {string} docsDir - docs 目录名
 * @returns {string} - 项目路径
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
 * @param {Array} sidebarConfig - 侧边栏配置
 * @returns {Map<string, Object>} - 映射表
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
 * @param {Object} section - 配置节
 * @returns {string} - 第一个文档链接或空字符串
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

module.exports = {
    buildNavConfig,
    buildNavSection,
    buildProjectNavSection,
    resolveProjectLink,
    buildSectionMap,
    findFirstDocLink
};
