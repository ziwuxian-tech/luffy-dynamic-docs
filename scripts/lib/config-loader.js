/**
 * 配置加载模块
 * 负责读取和解析 YAML 配置文件
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { expandTildePath } = require('./file-utils');

// 加载 .env 文件中的环境变量
require('dotenv').config();

// 配置文件基础路径
const CONFIG_BASE = path.join(__dirname, '../../docs-config');

/**
 * 读取配置文件
 * 优先级:
 * 1. docs-config.{env}.yaml
 * 2. docs-config.yaml
 * @returns {Object} - 配置对象
 */
function loadConfig() {
    try {
        const env = process.env.DOCS_ENV;
        const configFiles = [];

        // 如果指定了环境，优先尝试环境配置
        if (env) {
            console.log(`ℹ️  当前环境: ${env}`);
            configFiles.push(`${CONFIG_BASE}.${env}.yaml`);
        }

        // 默认配置作为后备
        configFiles.push(`${CONFIG_BASE}.yaml`);

        // 遍历尝试加载
        for (const file of configFiles) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf-8');
                const config = yaml.load(content);
                console.log(`✓ 使用配置文件: ${path.basename(file)}`);

                // 展开所有 project.sourceDir 中的 ~
                if (Array.isArray(config.projects)) {
                    config.projects.forEach(project => {
                        if (project.sourceDir) {
                            project.sourceDir = expandTildePath(project.sourceDir);
                        }
                    });
                }

                return config;
            }
        }

        console.error('错误: 未找到有效的配置文件');
        console.log('搜索路径:');
        configFiles.forEach(f => console.log(`  - ${f}`));
        process.exit(1);
    } catch (error) {
        console.error(`读取配置文件失败: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { loadConfig };