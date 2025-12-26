/**
 * 文件监控脚本
 * 监控配置文件中指定的多个项目目录,自动重新生成侧边栏配置
 */

const chokidar = require('chokidar');
const { generateSiteConfig } = require('./generate-site-config');
const { loadConfig } = require('./lib/config-loader');

const SEPARATOR = '='.repeat(60);
const DEFAULT_DEBOUNCE_DELAY = 1000;
const HIDDEN_PATH_PATTERN = /(^|[\/\\])\./;

let debounceTimer = null;
let cachedDelay = null;

/**
 * 规范化路径（统一使用正斜杠）
 */
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

/**
 * 创建路径忽略判断函数
 * @param {string[]} normalizedWatchDirs - 已规范化的监控目录列表
 * @returns {function} - 判断路径是否应被忽略的函数
 */
function createIgnoreChecker(normalizedWatchDirs) {
    return (filePath) => {
        const normalizedPath = normalizePath(filePath);

        // 配置的监控目录下的文件不忽略
        const isInWatchDir = normalizedWatchDirs.some(dir =>
            normalizedPath.startsWith(dir) || dir.startsWith(normalizedPath)
        );
        if (isInWatchDir) {
            return false;
        }

        // 其他隐藏文件/目录忽略
        return HIDDEN_PATH_PATTERN.test(filePath);
    };
}

/**
 * 处理 Markdown 文件变化（带防抖）
 */
function handleMarkdownChange(eventType, filePath) {
    if (!filePath.endsWith('.md')) {
        return;
    }

    console.log(`\n检测到文件${eventType}: ${filePath}`);

    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        console.log('\n重新生成侧边栏配置...');
        generateSiteConfig();
        console.log('✓ 完成!\n');
        console.log('继续监控文件变化...');
    }, cachedDelay);
}

/**
 * 打印启动信息
 */
function printStartupInfo(config, watchDirs) {
    console.log(SEPARATOR);
    console.log('VitePress 侧边栏自动生成器');
    console.log(SEPARATOR);

    console.log('监控的项目:');
    config.projects.forEach(project => {
        const status = project.enabled ? '✓' : '⊘';
        const suffix = project.enabled ? '' : ' (已禁用)';
        console.log(`  ${status} ${project.name}: ${project.sourceDir}${suffix}`);
    });

    console.log(`防抖延迟: ${cachedDelay}ms`);
    console.log(SEPARATOR);
}

/**
 * 启动文件监控
 */
function startWatcher() {
    const config = loadConfig();
    cachedDelay = config.settings.debounceDelay || DEFAULT_DEBOUNCE_DELAY;

    const watchDirs = config.projects
        .filter(p => p.enabled)
        .map(p => p.sourceDir);

    if (watchDirs.length === 0) {
        console.log('⚠️  没有启用的项目,请在配置中启用至少一个项目');
        process.exit(1);
    }

    printStartupInfo(config, watchDirs);

    // 初始化生成
    console.log('\n执行初始化生成...');
    generateSiteConfig();
    console.log('✓ 初始化完成!\n');

    // 预先规范化监控目录路径（避免在 ignored 函数中重复计算）
    const normalizedWatchDirs = watchDirs.map(normalizePath);

    const watcher = chokidar.watch(watchDirs, {
        ignored: createIgnoreChecker(normalizedWatchDirs),
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    watcher
        .on('add', path => handleMarkdownChange('新增', path))
        .on('change', path => handleMarkdownChange('修改', path))
        .on('unlink', path => handleMarkdownChange('删除', path))
        .on('error', error => console.error('监控器错误:', error))
        .on('ready', () => {
            console.log('✓ 文件监控已启动,等待文件变化...\n');
            console.log('提示: 按 Ctrl+C 停止监控\n');
        });

    process.on('SIGINT', () => {
        console.log('\n\n正在停止监控...');
        watcher.close().then(() => {
            console.log('✓ 监控已停止');
            process.exit(0);
        });
    });
}

if (require.main === module) {
    startWatcher();
}

module.exports = { startWatcher };