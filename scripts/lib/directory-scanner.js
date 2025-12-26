/**
 * 目录扫描模块
 * 负责递归扫描目录，构建侧边栏配置
 */

const fs = require('fs');
const path = require('path');
const { extractTitle, getFileName, isExcluded } = require('./file-utils');

/**
 * 递归扫描目录，构建侧边栏配置
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

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (isExcluded(entry.name, excludes)) {
                continue;
            }

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                const subItems = scanDirectory(fullPath, baseDir, projectName, excludes);
                if (subItems.length > 0) {
                    items.push({
                        text: entry.name,
                        collapsed: false,
                        items: subItems
                    });
                }
            } else if (entry.name.endsWith('.md')) {
                const title = extractTitle(fullPath) || getFileName(fullPath);
                const relativePath = path.relative(baseDir, fullPath);
                const link = `/docs/${projectName}/${relativePath.replace(/\\/g, '/').replace(/\.md$/, '')}`;

                items.push({ text: title, link });
            }
        }
    } catch (error) {
        console.error(`扫描目录失败: ${dir}`, error);
    }

    return items;
}

module.exports = { scanDirectory };