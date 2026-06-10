// ============================================================
// 日志系统
// 支持 access / error / system 三种日志类型
// ============================================================

import fs from 'fs';
import path from 'path';

// ---------- 配置 ----------

const LOG_DIR = path.join(process.cwd(), 'logs');

// 确保日志目录存在
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// ---------- 日志格式化 ----------

interface LogEntry {
  timestamp: string;
  level: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  ip?: string;
  userId?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry) + '\n';
}

function getTimestamp(): string {
  return new Date().toISOString();
}

// ---------- 写入日志 ----------

function writeLog(filename: string, entry: LogEntry) {
  try {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, filename);
    const content = formatLog(entry);
    fs.appendFileSync(filePath, content, 'utf-8');
  } catch (error) {
    // 日志写入失败不应影响业务
    console.error('日志写入失败:', (error as Error).message);
  }
}

// ---------- 访问日志 ----------

interface AccessLogData {
  method: string;
  path: string;
  status: number;
  duration?: number;
  ip?: string;
  userId?: number;
  userAgent?: string;
}

/**
 * 记录访问日志
 */
export function logAccess(data: AccessLogData) {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'INFO',
    type: 'ACCESS',
    message: `${data.method} ${data.path} ${data.status}`,
    data: {
      method: data.method,
      path: data.path,
      status: data.status,
      duration: data.duration,
      userAgent: data.userAgent,
    },
    ip: data.ip,
    userId: data.userId,
  };

  writeLog('access.log', entry);
}

// ---------- 错误日志 ----------

interface ErrorLogData {
  message: string;
  error?: Error;
  path?: string;
  method?: string;
  userId?: number;
  ip?: string;
  context?: Record<string, unknown>;
}

/**
 * 记录错误日志
 */
export function logError(data: ErrorLogData) {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'ERROR',
    type: 'ERROR',
    message: data.message,
    data: {
      path: data.path,
      method: data.method,
      context: data.context,
    },
    ip: data.ip,
    userId: data.userId,
    error: data.error
      ? {
          name: data.error.name,
          message: data.error.message,
          stack: data.error.stack,
        }
      : undefined,
  };

  writeLog('error.log', entry);
  // 同时输出到控制台
  console.error(`[ERROR] ${data.message}`, data.error?.stack || '');
}

// ---------- 系统日志 ----------

interface SystemLogData {
  action: string;
  message: string;
  userId?: number;
  ip?: string;
  data?: Record<string, unknown>;
}

/**
 * 记录系统日志
 */
export function logSystem(data: SystemLogData) {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level: 'INFO',
    type: 'SYSTEM',
    message: `[${data.action}] ${data.message}`,
    data: {
      action: data.action,
      ...data.data,
    },
    ip: data.ip,
    userId: data.userId,
  };

  writeLog('system.log', entry);
}

// ---------- 业务日志快捷方法 ----------

/** 用户登录日志 */
export function logUserLogin(userId: number, phone: string, ip?: string) {
  logSystem({
    action: 'USER_LOGIN',
    message: `用户登录成功: ${phone}`,
    userId,
    ip,
    data: { phone },
  });
}

/** 用户注册日志 */
export function logUserRegister(userId: number, phone: string, ip?: string) {
  logSystem({
    action: 'USER_REGISTER',
    message: `新用户注册: ${phone}`,
    userId,
    ip,
    data: { phone },
  });
}

/** 创建订单日志 */
export function logOrderCreate(userId: number, orderNo: string, route: string, ip?: string) {
  logSystem({
    action: 'ORDER_CREATE',
    message: `创建订单: ${orderNo} (${route})`,
    userId,
    ip,
    data: { orderNo, route },
  });
}

/** 订单状态变更日志 */
export function logOrderStatusChange(userId: number, orderNo: string, fromStatus: string, toStatus: string, ip?: string) {
  logSystem({
    action: 'ORDER_STATUS_CHANGE',
    message: `订单状态变更: ${orderNo} ${fromStatus} -> ${toStatus}`,
    userId,
    ip,
    data: { orderNo, fromStatus, toStatus },
  });
}

/** 添加收藏日志 */
export function logFavoriteAdd(userId: number, route: string, ip?: string) {
  logSystem({
    action: 'FAVORITE_ADD',
    message: `添加收藏: ${route}`,
    userId,
    ip,
    data: { route },
  });
}

/** 删除收藏日志 */
export function logFavoriteRemove(userId: number, route: string, ip?: string) {
  logSystem({
    action: 'FAVORITE_REMOVE',
    message: `删除收藏: ${route}`,
    userId,
    ip,
    data: { route },
  });
}

/** 通知发送日志 */
export function logNotificationSend(userId: number, type: string, title: string, ip?: string) {
  logSystem({
    action: 'NOTIFICATION_SEND',
    message: `发送通知: ${title}`,
    userId,
    ip,
    data: { type, title },
  });
}

/** 接口异常日志 */
export function logApiError(path: string, method: string, error: Error, userId?: number, ip?: string) {
  logError({
    message: `接口异常: ${method} ${path}`,
    error,
    path,
    method,
    userId,
    ip,
  });
}

/** 数据库异常日志 */
export function logDatabaseError(operation: string, error: Error, context?: Record<string, unknown>) {
  logError({
    message: `数据库异常: ${operation}`,
    error,
    context: { operation, ...context },
  });
}

/** Redis 异常日志 */
export function logRedisError(operation: string, error: Error, context?: Record<string, unknown>) {
  logError({
    message: `Redis 异常: ${operation}`,
    error,
    context: { operation, ...context },
  });
}
