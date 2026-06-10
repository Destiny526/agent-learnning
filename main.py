"""
AI智能行程助手 - 统一启动脚本

使用方法:
    python main.py          # 启动所有服务
    python main.py --no-frontend  # 只启动后端服务
"""
import subprocess
import sys
import time
import signal
import os
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent

# 服务配置: (名称, 相对路径, 端口)
SERVICES = [
    ("user-service", "services/user-service/main.py", 8001),
    ("ticket-service", "services/ticket-service/main.py", 8002),
    ("ai-service", "services/ai-service/main.py", 8003),
    ("order-service", "services/order-service/main.py", 8004),
    ("notification-service", "services/notification-service/main.py", 8005),
    ("gateway", "services/gateway/main.py", 8000),
]

# 前端配置
FRONTEND_DIR = ROOT_DIR / "frontend"
FRONTEND_PORT = 3000


class ServiceManager:
    """服务管理器"""

    def __init__(self):
        self.processes: list[subprocess.Popen] = []
        self.running = True

    def start_backend_services(self):
        """启动所有后端服务"""
        print("\n" + "=" * 60)
        print("  启动后端服务...")
        print("=" * 60)

        for name, script, port in SERVICES:
            script_path = ROOT_DIR / script
            print(f"  启动 {name:<25} (端口 {port})...")

            process = subprocess.Popen(
                [sys.executable, str(script_path)],
                cwd=str(ROOT_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            self.processes.append((name, process))

        print("=" * 60)

    def start_frontend(self):
        """启动前端服务"""
        print("\n" + "=" * 60)
        print("  启动前端服务...")
        print("=" * 60)

        if not FRONTEND_DIR.exists():
            print("  [警告] frontend 目录不存在，跳过前端启动")
            return

        # 检查 node_modules 是否存在
        if not (FRONTEND_DIR / "node_modules").exists():
            print("  安装前端依赖...")
            subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), check=True)

        print(f"  启动 frontend{'':<20} (端口 {FRONTEND_PORT})...")
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,  # Windows 需要 shell=True
        )
        self.processes.append(("frontend", process))
        print("=" * 60)

    def wait_for_services(self):
        """等待服务启动"""
        print("\n等待服务启动...")
        time.sleep(3)

        # 检查进程状态
        all_running = True
        for name, process in self.processes:
            if process.poll() is not None:
                print(f"  [错误] {name} 启动失败!")
                all_running = False
            else:
                print(f"  [OK] {name} 已启动")

        if all_running:
            print("\n" + "=" * 60)
            print("  所有服务已启动!")
            print("=" * 60)
            self.print_urls()

    def print_urls(self):
        """打印访问地址"""
        print("\n访问地址:")
        print("-" * 40)
        print(f"  前端界面:    http://localhost:{FRONTEND_PORT}")
        print(f"  API 网关:    http://localhost:8000")
        print(f"  API 文档:    http://localhost:8000/docs")
        print("-" * 40)
        print("\n按 Ctrl+C 停止所有服务\n")

    def stop_all(self):
        """停止所有服务"""
        print("\n正在停止所有服务...")
        self.running = False

        for name, process in self.processes:
            if process.poll() is None:
                print(f"  停止 {name}...")
                process.terminate()

        # 等待进程结束
        for name, process in self.processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()

        print("所有服务已停止")

    def run(self, with_frontend=True):
        """运行服务管理器"""
        print("\n" + "=" * 60)
        print("  AI智能行程助手 - 启动中...")
        print("=" * 60)

        # 注册信号处理
        signal.signal(signal.SIGINT, lambda s, f: self.stop_all())
        signal.signal(signal.SIGTERM, lambda s, f: self.stop_all())

        try:
            self.start_backend_services()
            if with_frontend:
                self.start_frontend()
            self.wait_for_services()

            # 保持运行
            while self.running:
                time.sleep(1)

                # 检查是否有进程意外退出
                for name, process in self.processes:
                    if process.poll() is not None and self.running:
                        print(f"\n[警告] {name} 意外退出!")

        except KeyboardInterrupt:
            pass
        finally:
            self.stop_all()


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="AI智能行程助手 - 统一启动脚本")
    parser.add_argument(
        "--no-frontend",
        action="store_true",
        help="不启动前端服务",
    )
    args = parser.parse_args()

    manager = ServiceManager()
    manager.run(with_frontend=not args.no_frontend)


if __name__ == "__main__":
    main()
