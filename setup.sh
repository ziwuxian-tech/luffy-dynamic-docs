#!/bin/bash

# 配置
NODE_VERSION="v18.20.2"
LOCAL_DIR="$(input_dir=$(dirname "$0"); cd "$input_dir" && pwd)/local"
NODE_DIR="$LOCAL_DIR/node"
OS_TYPE=$(uname -s)
ARCH_TYPE=$(uname -m)

# 颜色配置
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}[Setup] 正在检查环境...${NC}"

# 确保本地目录存在
if [ ! -d "$LOCAL_DIR" ]; then
    mkdir -p "$LOCAL_DIR"
fi

# 检查Node命令是否存在的函数
check_node() {
    if command -v node >/dev/null 2>&1; then
        echo -e "${GREEN}[Setup] Node.js 已安装: $(node -v)${NC}"
        return 0
    fi

    # 检查本地Node
    if [ -f "$NODE_DIR/bin/node" ]; then
        echo -e "${GREEN}[Setup] 使用本地 Node.js: $($NODE_DIR/bin/node -v)${NC}"
        export PATH="$NODE_DIR/bin:$PATH"
        return 0
    fi

    return 1
}

# 如果缺少Node，下载并安装
if ! check_node; then
    echo -e "${BLUE}[Setup] 未找到 Node.js。正在安装便携版...${NC}"

    # Determine download URL
    if [ "$OS_TYPE" == "Darwin" ]; then
        OS_PLATFORM="darwin"
    elif [ "$OS_TYPE" == "Linux" ]; then
        OS_PLATFORM="linux"
    else
        echo -e "${RED}[Error] 不支持的操作系统: $OS_TYPE${NC}"
        exit 1
    fi

    if [ "$ARCH_TYPE" == "x86_64" ]; then
        ARCH="x64"
    elif [ "$ARCH_TYPE" == "arm64" ] || [ "$ARCH_TYPE" == "aarch64" ]; then
        ARCH="arm64"
    else
        echo -e "${RED}[Error] 不支持的架构: $ARCH_TYPE${NC}"
        exit 1
    fi

    FILENAME="node-$NODE_VERSION-$OS_PLATFORM-$ARCH"
    URL="https://registry.npmmirror.com/-/binary/node/$NODE_VERSION/$FILENAME.tar.gz"

    echo -e "${BLUE}[Setup] 正在下载 $URL...${NC}"
    curl -L "$URL" -o "$LOCAL_DIR/node.tar.gz"

    if [ $? -ne 0 ]; then
        echo -e "${RED}[Error] 下载失败。${NC}"
        exit 1
    fi

    echo -e "${BLUE}[Setup] 正在解压...${NC}"
    tar -xzf "$LOCAL_DIR/node.tar.gz" -C "$LOCAL_DIR"
    mv "$LOCAL_DIR/$FILENAME" "$NODE_DIR"
    rm "$LOCAL_DIR/node.tar.gz"

    export PATH="$NODE_DIR/bin:$PATH"
    echo -e "${GREEN}[Setup] Node.js 安装成功！${NC}"
fi

# 如果缺少pnpm，安装pnpm
if ! command -v pnpm >/dev/null 2>&1; then
    echo -e "${BLUE}[Setup] 正在安装 pnpm...${NC}"
    npm install -g pnpm
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[Setup] 正在安装依赖...${NC}"
    pnpm install
else
    echo -e "${GREEN}[Setup] 依赖已安装。${NC}"
fi

# 检查环境配置文件 .env
if [ ! -f ".env" ]; then
    echo -e "${BLUE}[Setup] 未找到 .env 配置文件，正在从 .env.example 创建...${NC}"
    cp .env.example .env
fi

# 运行dev
echo -e "${GREEN}[Setup] 正在启动开发服务器...${NC}"
pnpm run dev
