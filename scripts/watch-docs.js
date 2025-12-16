/**
 * 文件监控脚本
 * 监控配置文件中指定的多个项目目录,自动重新生成侧边栏配置
 */

const chokidar = require('chokidar');
const { generateSidebar, loadConfig } = require('./generate-sidebar');

let debounceTimer = null;

/**
 * 防抖处理文件变化
 */
function handleChange(eventType, filePath) {
    console.log(`\n检测到文件${eventType}: ${filePath}`);

    // 清除之前的定时器
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    const config = loadConfig();
    const delay = config.settings.debounceDelay || 1000;

    // 设置新的定时器
    debounceTimer = setTimeout(() => {
        console.log('\n重新生成侧边栏配置...');
        generateSidebar();
        console.log('✓ 完成!\n');
        console.log('继续监控文件变化...');
    }, delay);
}

/**
 * 启动文件监控
 */
function startWatcher() {
    console.log('='.repeat(60));
    console.log('VitePress 侧边栏自动生成器');
    console.log('='.repeat(60));

    // 加载配置
    const config = loadConfig();
    const delay = config.settings.debounceDelay || 1000;

    // 获取所有启用的项目目录
    const watchDirs = config.projects
        .filter(p => p.enabled)
        .map(p => p.sourceDir);

    if (watchDirs.length === 0) {
        console.log('⚠️  没有启用的项目,请在 配置 中启用至少一个项目');
        process.exit(1);
    }

    console.log('监控的项目:');
    config.projects.forEach(project => {
        if (project.enabled) {
            console.log(`  ✓ ${project.name}: ${project.sourceDir}`);
        } else {
            console.log(`  ⊘ ${project.name}: 已禁用`);
        }
    });
    console.log(`防抖延迟: ${delay}ms`);
    console.log('='.repeat(60));

    // 初始化时生成一次
    console.log('\n执行初始化生成...');
    generateSidebar();
    console.log('✓ 初始化完成!\n');

    // 创建监控器
    const watcher = chokidar.watch(watchDirs, {
        ignored: /(^|[\/\\])\../, // 忽略隐藏文件
        persistent: true,
        ignoreInitial: true, // 忽略初始添加事件
        awaitWriteFinish: {
            stabilityThreshold: 500,
            pollInterval: 100
        }
    });

    // 监听事件
    watcher
        .on('add', filePath => {
            if (filePath.endsWith('.md')) {
                handleChange('新增', filePath);
            }
        })
        .on('change', filePath => {
            if (filePath.endsWith('.md')) {
                handleChange('修改', filePath);
            }
        })
        .on('unlink', filePath => {
            if (filePath.endsWith('.md')) {
                handleChange('删除', filePath);
            }
        })
        .on('error', error => {
            console.error('监控器错误:', error);
        })
        .on('ready', () => {
            console.log('✓ 文件监控已启动,等待文件变化...\n');
            console.log('提示: 按 Ctrl+C 停止监控\n');
        });

    // 优雅退出
    process.on('SIGINT', () => {
        console.log('\n\n正在停止监控...');
        watcher.close().then(() => {
            console.log('✓ 监控已停止');
            process.exit(0);
        });
    });
}

// 启动监控
if (require.main === module) {
    startWatcher();
}

module.exports = { startWatcher };
