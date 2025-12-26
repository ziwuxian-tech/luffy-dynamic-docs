/**
 * 文件工具模块
 * 提供文件操作相关的工具函数
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { minimatch } = require('minimatch');

/**
 * 从 Markdown 文件中提取一级标题
 * @param {string} filePath - 文件路径
 * @returns {string|null} - 提取的标题或 null
 */
function extractTitle(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
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
 * 检查文件是否应该被排除（支持 glob 模式）
 * @param {string} file - 文件名
 * @param {Array} excludes - 排除模式列表
 * @returns {boolean} - 是否排除
 */
function isExcluded(file, excludes) {
    return excludes.some(pattern => minimatch(file, pattern));
}

/**
 * 规范内部链接，确保以 / 开头
 * @param {string} link - 链接地址
 * @returns {string} - 规范化后的链接
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
 * 统计配置项数量（递归统计文档链接数）
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
 * 展开路径中的 ~ 为用户主目录
 * @param {string} filePath - 文件路径
 * @returns {string} - 展开后的路径
 */
function expandTildePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return filePath;
    }
    if (filePath.startsWith('~/') || filePath === '~') {
        return path.join(os.homedir(), filePath.slice(1));
    }
    return filePath;
}

module.exports = {
    extractTitle,
    getFileName,
    isExcluded,
    normalizeLink,
    countItems,
    expandTildePath
};