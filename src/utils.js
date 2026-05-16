// 艾宾浩斯遗忘曲线复习间隔（天）
// 学习当天为 day 0，依次在 1, 2, 4, 7, 15, 30, 60, 90 天后复习
const INTERVALS = [1, 2, 4, 7, 15, 30, 60, 90]

// 复习阶段名称
const STAGE_NAMES = [
  '第1次复习 (1天后)',
  '第2次复习 (2天后)',
  '第3次复习 (4天后)',
  '第4次复习 (7天后)',
  '第5次复习 (15天后)',
  '第6次复习 (30天后)',
  '第7次复习 (60天后)',
  '第8次复习 (90天后)',
]

export function getIntervals() {
  return INTERVALS
}

export function getStageName(stage) {
  return STAGE_NAMES[stage] || '已完成'
}

/**
 * 计算下一次复习日期
 * @param {number} reviewStage - 当前复习阶段 (0-7)，代表已完成第几次复习
 * @returns {Date} 下一次复习的日期
 */
export function calcNextReviewDate(reviewStage) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (reviewStage >= INTERVALS.length) {
    return null // 全部完成，无需复习
  }
  const interval = INTERVALS[reviewStage]
  const next = new Date(today)
  next.setDate(next.getDate() + interval)
  return next
}

/**
 * 获取当天零点
 */
export function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 判断两个日期是否是同一天
 */
export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * 计算逾期天数（用于颜色标记）
 * today: 当前日期
 * nextReviewDate: 应该复习的日期
 * 返回正数表示逾期天数，0 表示今天刚到期，负数表示还没到
 */
export function getOverdueDays(nextReviewDate) {
  const now = todayStart()
  const reviewDate = new Date(nextReviewDate)
  reviewDate.setHours(0, 0, 0, 0)
  return Math.floor((now - reviewDate) / (1000 * 60 * 60 * 24))
}

/**
 * 格式化日期为中文
 */
export function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
