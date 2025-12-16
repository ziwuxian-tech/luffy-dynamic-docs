@echo off
setlocal

set "NODE_VERSION=v18.20.2"
set "LOCAL_DIR=%~dp0local"
set "NODE_DIR=%LOCAL_DIR%\node"
set "NODE_EXE=%NODE_DIR%\node.exe"

echo [Setup] 检查环境中

:: 1.检查是否有Node环境
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo [Setup] 检查环境中
    goto :check_pnpm
)

:: 2. 设置Node环境地址
if exist "%NODE_EXE%" (
    echo [Setup] 找到了本地Node环境
    set "PATH=%NODE_DIR%;%PATH%"
    goto :check_pnpm
)

:: 3. 如果没有Node环境下载Node
echo [Setup] Node.js 没找到Node环境，下载中

if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%"

set "URL=https://registry.npmmirror.com/-/binary/node/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip"
set "ZIP_FILE=%LOCAL_DIR%\node.zip"

powershell -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%ZIP_FILE%'"
if %errorlevel% neq 0 (
    echo [Error] 下载 Node.js 失败。
    pause
    exit /b 1
)

echo [Setup] 解压Node中
powershell -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%LOCAL_DIR%'"
del "%ZIP_FILE%"

:: 重命名Node文件夹名为Node
for /d %%d in ("%LOCAL_DIR%\node-*") do move "%%d" "%NODE_DIR%"

set "PATH=%NODE_DIR%;%PATH%"

:check_pnpm
:: 4. 检查是否有pnpm环境
call pnpm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [Setup] 未找到pnpm环境,安装中
    call npm install -g pnpm
)

:: 5. 安装依赖
if not exist "node_modules" (
    echo [Setup] 安装依赖中
    call pnpm install
)

:: 6. 检查环境配置
if not exist ".env" (
    echo [Setup] 未找到.env配置文件，正在从.env.example创建...
    copy .env.example .env
)

:: 7. 执行dev操作
echo [Setup] 正在启动开发服务器...
call pnpm run dev

endlocal
