"""
合并启动所有服务 - 用于 Railway 合并部署模式

使用方法:
    python start_all.py
"""
import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent

# 服务配置: (名称, 相对路径, 默认端口)
SERVICES = [
    ("gateway", "services/gateway/main.py", 8000),
    ("user-service", "services/user-service/main.py", 8001),
    ("ticket-service", "services/ticket-service/main.py", 8002),
    ("ai-service", "services/ai-service/main.py", 8003),
    ("order-service", "services/order-service/main.py", 8004),
    ("notification-service", "services/notification-service/main.py", 8005),
]

processes = []


def signal_handler(sig, frame):
    """处理停止信号"""
    print("\n正在停止所有服务...")
    for name, process in processes:
        if process.poll() is None:
            print(f"  停止 {name}...")
            process.terminate()

    # 等待进程结束
    for name, process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()

    print("所有服务已停止")
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def check_service(name: str, process: subprocess.Popen) -> bool:
    """检查服务是否运行正常"""
    if process.poll() is not None:
        print(f"  ✗ {name} 启动失败!")
        # 打印错误信息
        stderr = process.stderr.read().decode("utf-8", errors="ignore")
        if stderr:
            print(f"    错误: {stderr[:500]}")
        return False
    return True


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("  AI 智能行程助手 - 合并启动模式")
    print("=" * 60)

    # 检查是否在 Railway 环境
    is_railway = os.getenv("RAILWAY_ENVIRONMENT") is not None
    if is_railway:
        print("  检测到 Railway 环境")

    # 启动所有服务
    print("\n启动服务中...")
    for name, script, default_port in SERVICES:
        script_path = ROOT_DIR / script

        if not script_path.exists():
            print(f"  ✗ {name}: 脚本不存在 ({script_path})")
            continue

        # 设置环境变量
        env = os.environ.copy()

        # 为每个服务分配端口（合并模式下使用默认端口）
        # 在 Railway 合并模式下，只有 gateway 对外暴露
        env["PORT"] = str(default_port)

        # 配置服务间通信地址（合并模式下使用 localhost）
        if name == "gateway":
            # Gateway 需要知道其他服务的地址
            env["USER_SERVICE_URL"] = f"http://localhost:{8001}"
            env["TICKET_SERVICE_URL"] = f"http://localhost:{8002}"
            env["AI_SERVICE_URL"] = f"http://localhost:{8003}"
            env["ORDER_SERVICE_URL"] = f"http://localhost:{8004}"
            env["NOTIFICATION_SERVICE_URL"] = f"http://localhost:{8005}"

        print(f"  启动 {name:<25} (端口 {default_port})...")

        process = subprocess.Popen(
            [sys.executable, str(script_path)],
            cwd=str(ROOT_DIR),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        processes.append((name, process))

    # 等待服务启动
    print("\n等待服务启动...")
    time.sleep(3)

    # 检查服务状态
    all_running = True
    for name, process in processes:
        if check_service(name, process):
            print(f"  ✓ {name} 已启动")
        else:
            all_running = False

    if all_running:
        print("\n" + "=" * 60)
        print("  所有服务已启动!")
        print("=" * 60)
        print("\n访问地址:")
        print("-" * 40)
        print(f"  API 网关:    http://localhost:8000")
        print(f"  API 文档:    http://localhost:8000/docs")
        print("-" * 40)
        print("\n按 Ctrl+C 停止所有服务\n")
    else:
        print("\n[警告] 部分服务启动失败，请检查日志")
        sys.exit(1)

    # 保持运行并监控服务
    while True:
        time.sleep(1)

        # 检查是否有服务意外退出
        for name, process in processes:
            if process.poll() is not None:
                print(f"\n[警告] {name} 意外退出!")
                # 尝试重启
                print(f"  尝试重启 {name}...")
                for i, (n, p) in enumerate(processes):
                    if n == name:
                        script_path = ROOT_DIR / SERVICES[i][1]
                        env = os.environ.copy()
                        env["PORT"] = str(SERVICES[i][2])

                        new_process = subprocess.Popen(
                            [sys.executable, str(script_path)],
                            cwd=str(ROOT_DIR),
                            env=env,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                        )
                        processes[i] = (name, new_process)
                        time.sleep(2)

                        if check_service(name, new_process):
                            print(f"  ✓ {name} 重启成功")
                        else:
                            print(f"  ✗ {name} 重启失败")
                        break


if __name__ == "__main__":
    main()
