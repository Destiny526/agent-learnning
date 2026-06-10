#!/bin/bash
# Railway 部署快速配置脚本

set -e

echo "=========================================="
echo "  Railway 部署快速配置"
echo "=========================================="

# 检查是否安装了 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "错误: 未安装 Railway CLI"
    echo "请先安装: npm install -g @railway/cli"
    exit 1
fi

# 检查是否登录
if ! railway whoami &> /dev/null; then
    echo "请先登录 Railway:"
    railway login
fi

echo ""
echo "选择部署方式:"
echo "1) 独立部署（推荐）- 每个服务独立部署"
echo "2) 合并部署 - 所有服务合并为一个"
read -p "请输入选项 (1 或 2): " choice

case $choice in
    1)
        echo ""
        echo "=========================================="
        echo "  独立部署模式"
        echo "=========================================="
        echo ""
        echo "请按照以下步骤操作:"
        echo ""
        echo "1. 在 Railway 控制台创建新项目"
        echo "2. 添加 MySQL 数据库插件"
        echo "3. 添加 Redis 数据库插件"
        echo "4. 为每个服务创建独立的 Railway 服务:"
        echo "   - gateway (Root Directory: services/gateway)"
        echo "   - user-service (Root Directory: services/user-service)"
        echo "   - ticket-service (Root Directory: services/ticket-service)"
        echo "   - ai-service (Root Directory: services/ai-service)"
        echo "   - order-service (Root Directory: services/order-service)"
        echo "   - notification-service (Root Directory: services/notification-service)"
        echo ""
        echo "5. 在每个服务的 Variables 中配置环境变量"
        echo "6. 在 Gateway 服务中配置其他服务的内网地址"
        echo ""
        echo "详细说明请参考: RAILWAY_DEPLOY.md"
        ;;
    2)
        echo ""
        echo "=========================================="
        echo "  合并部署模式"
        echo "=========================================="
        echo ""
        echo "请按照以下步骤操作:"
        echo ""
        echo "1. 在 Railway 控制台创建新项目"
        echo "2. 添加 MySQL 数据库插件"
        echo "3. 添加 Redis 数据库插件"
        echo "4. 创建一个 Railway 服务:"
        echo "   - Root Directory: / (根目录)"
        echo "   - Start Command: python start_all.py"
        echo ""
        echo "5. 在 Variables 中配置环境变量"
        echo ""
        echo "详细说明请参考: RAILWAY_DEPLOY.md"
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  配置完成"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. 推送代码到 GitHub"
echo "2. 在 Railway 控制台连接 GitHub 仓库"
echo "3. 配置环境变量"
echo "4. 部署服务"
echo ""
echo "环境变量模板: .env.railway.example"
echo "部署文档: RAILWAY_DEPLOY.md"
echo ""
