/**
 * 文件同步模块
 * 负责将源目录的文档同步到 VitePress docs 目录
 * 删除的文件会生成占位页面，而不是直接 404
 */

const fs = require('fs');
const path = require('path');
const { isExcluded } = require('./file-utils');

/**
 * 收集目录中所有 md 文件的相对路径
 * @param {string} dir - 目录路径
 * @param {string} baseDir - 基础目录（用于计算相对路径）
 * @param {Array} excludeList - 排除列表
 * @returns {Set<string>} - 相对路径集合
 */
function collectMdFiles(dir, baseDir, excludeList = []) {
    const files = new Set();

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        if (isExcluded(entry.name, excludeList)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const subFiles = collectMdFiles(fullPath, baseDir, excludeList);
            subFiles.forEach(f => files.add(f));
        } else if (entry.name.endsWith('.md')) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            files.add(relativePath);
        }
    }

    return files;
}

/**
 * 生成已删除文档的占位页面
 * @param {string} filePath - 目标文件路径
 * @param {string} originalTitle - 原文档标题（从现有文件提取）
 */
function generateDeletedPlaceholder(filePath, originalTitle) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = path.basename(filePath, '.md');
    const title = originalTitle || fileName;

    const content = `# ${title}

> 该文档已被删除或移动

---

此页面对应的源文档已不存在。可能的原因：

- 文档已被删除
- 文档已移动到其他位置
- 文档已重命名

**建议操作：**

- 使用左侧导航栏查找相关文档
- 使用搜索功能查找内容
- [返回首页](/)

---

*此页面由系统自动生成*
`;

    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 从 md 文件提取标题
 * @param {string} filePath - 文件路径
 * @returns {string|null} - 标题或 null
 */
function extractTitleFromFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : null;
    } catch {
        return null;
    }
}

/**
 * 同步项目文档到 VitePress docs 目录
 * @param {Object} project - 项目配置
 * @param {string} docsBaseDir - docs 基础目录
 * @param {Array} excludeList - 排除列表
 * @param {string} rootDir - 项目根目录
 */
function syncProjectDocuments(project, docsBaseDir, excludeList, rootDir) {
    const targetDir = path.join(rootDir, docsBaseDir, project.name);

    // 收集源目录和目标目录的文件
    const sourceFiles = collectMdFiles(project.sourceDir, project.sourceDir, excludeList);
    const targetFiles = collectMdFiles(targetDir, targetDir, []);

    // 找出已删除的文件（在目标目录但不在源目录）
    const deletedFiles = [...targetFiles].filter(f => !sourceFiles.has(f));

    // 为已删除的文件生成占位页面
    for (const relativePath of deletedFiles) {
        const targetPath = path.join(targetDir, relativePath);
        const originalTitle = extractTitleFromFile(targetPath);

        // 检查是否已经是占位页面（避免重复处理）
        const content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';
        if (!content.includes('该文档已被删除或移动')) {
            generateDeletedPlaceholder(targetPath, originalTitle);
        }
    }

    // 复制源文件到目标目录
    copyDirectory(project.sourceDir, targetDir, excludeList);
}

/**
 * 清理目标目录（删除所有 .md 文件，保留目录结构由 copyDirectory 重建）
 * @param {string} dir - 目标目录
 */
function cleanTargetDirectory(dir) {
    if (!fs.existsSync(dir)) {
        return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            cleanTargetDirectory(fullPath);
            if (fs.readdirSync(fullPath).length === 0) {
                fs.rmdirSync(fullPath);
            }
        } else if (entry.name.endsWith('.md')) {
            fs.unlinkSync(fullPath);
        }
    }
}

/**
 * 为空项目生成占位页面
 * @param {Object} project - 项目配置
 * @param {string} docsBaseDir - docs 基础目录
 * @param {string} rootDir - 项目根目录
 */
function generateEmptyProjectPage(project, docsBaseDir, rootDir) {
    const targetDir = path.join(rootDir, docsBaseDir, project.name);
    const indexFile = path.join(targetDir, 'index.md');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const content = `# ${project.name}

> 该项目暂无文档

## 源目录

\`${project.sourceDir}\`

${project.description ? `## 描述\n\n${project.description}` : ''}

---

*此页面由系统自动生成，当源目录中添加 \`.md\` 文件后将自动更新。*
`;

    fs.writeFileSync(indexFile, content, 'utf-8');
}

/**
 * 递归复制目录（只复制包含 .md 文件的目录）
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 * @param {Array} excludeList - 排除列表
 * @returns {boolean} - 是否复制了文件
 */
function copyDirectory(src, dest, excludeList) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    let hasCopiedFiles = false;

    for (const entry of entries) {
        if (isExcluded(entry.name, excludeList)) {
            continue;
        }

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            if (copyDirectory(srcPath, destPath, excludeList)) {
                hasCopiedFiles = true;
            }
        } else if (entry.name.endsWith('.md')) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            fs.copyFileSync(srcPath, destPath);
            hasCopiedFiles = true;
        }
    }

    return hasCopiedFiles;
}

module.exports = {
    syncProjectDocuments,
    cleanTargetDirectory,
    generateEmptyProjectPage,
    copyDirectory,
    collectMdFiles,
    generateDeletedPlaceholder
};
