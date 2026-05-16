import { useEffect, useState, useCallback } from 'react'
import db from './db'
import { calcNextReviewDate, todayStart, getOverdueDays, formatDate, getStageName } from './utils'

export default function App() {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [tab, setTab] = useState('review') // 'review' | 'all' | 'completed'

  const loadItems = useCallback(async () => {
    const all = await db.knowledge.toArray()
    // 按 createdAt 倒序
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    setItems(all)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const addKnowledge = async () => {
    const name = newName.trim()
    if (!name) return
    await db.knowledge.add({
      name,
      createdAt: new Date(),
      reviewStage: 0,
      nextReviewDate: calcNextReviewDate(0),
      completed: false,
    })
    setNewName('')
    await loadItems()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addKnowledge()
  }

  // 标记已复习：进入下一阶段
  const markReviewed = async (item) => {
    const nextStage = item.reviewStage + 1
    const intervals = [1, 2, 4, 7, 15, 30, 60, 90]
    const completed = nextStage >= intervals.length
    await db.knowledge.update(item.id, {
      reviewStage: nextStage,
      nextReviewDate: completed ? null : calcNextReviewDate(nextStage),
      completed,
    })
    await loadItems()
  }

  // 删除知识点
  const deleteItem = async (id) => {
    await db.knowledge.delete(id)
    await loadItems()
  }

  const today = todayStart()

  // 今日待复习：nextReviewDate <= 今天 且 未完成
  const reviewItems = items.filter((item) => {
    if (item.completed) return false
    if (!item.nextReviewDate) return false
    return new Date(item.nextReviewDate) <= today
  })

  const completedItems = items.filter((item) => item.completed)
  const allActiveItems = items.filter((item) => !item.completed)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 text-center">
            记忆助手
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* 统计区 */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="今日待复习"
            value={reviewItems.length}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            label="学习中"
            value={allActiveItems.length}
            color="text-orange-600"
            bg="bg-orange-50"
          />
          <StatCard
            label="已完成"
            value={completedItems.length}
            color="text-green-600"
            bg="bg-green-50"
          />
        </div>

        {/* 添加新知识 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            今天学了什么？
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入知识点名称..."
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={addKnowledge}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap"
            >
              添加
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            添加后将按照艾宾浩斯遗忘曲线自动安排复习计划
          </p>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <TabButton
            active={tab === 'review'}
            onClick={() => setTab('review')}
            badge={reviewItems.length}
          >
            今日复习
          </TabButton>
          <TabButton
            active={tab === 'all'}
            onClick={() => setTab('all')}
            badge={allActiveItems.length}
          >
            全部知识
          </TabButton>
          <TabButton
            active={tab === 'completed'}
            onClick={() => setTab('completed')}
            badge={completedItems.length}
          >
            已完成
          </TabButton>
        </div>

        {/* 内容区 */}
        {tab === 'review' && (
          <ReviewList
            items={reviewItems}
            onReviewed={markReviewed}
            onDelete={deleteItem}
            emptyText="今天没有需要复习的内容，学点新东西吧~"
          />
        )}
        {tab === 'all' && (
          <AllList
            items={allActiveItems}
            onReviewed={markReviewed}
            onDelete={deleteItem}
            emptyText="还没有添加任何知识，开始学习吧！"
          />
        )}
        {tab === 'completed' && (
          <CompletedList
            items={completedItems}
            onDelete={deleteItem}
            emptyText="还没有完成任何知识点的全部复习，继续加油！"
          />
        )}
      </div>
    </div>
  )
}

// 统计卡片
function StatCard({ label, value, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

// Tab 按钮
function TabButton({ active, onClick, badge, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors relative ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
      {badge > 0 && (
        <span
          className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs rounded-full ${
            active
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-600'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// 今日待复习列表
function ReviewList({ items, onReviewed, onDelete, emptyText }) {
  if (items.length === 0) {
    return <Empty text={emptyText} />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          onReviewed={onReviewed}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// 全部知识列表
function AllList({ items, onReviewed, onDelete, emptyText }) {
  if (items.length === 0) {
    return <Empty text={emptyText} />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AllCard
          key={item.id}
          item={item}
          onReviewed={onReviewed}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

// 已完成列表
function CompletedList({ items, onDelete, emptyText }) {
  if (items.length === 0) {
    return <Empty text={emptyText} />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-xl shadow-sm border border-green-200 p-4 flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {item.name}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              学习于 {formatDate(item.createdAt)} · 全部复习已完成
            </div>
          </div>
          <button
            onClick={() => onDelete(item.id)}
            className="ml-3 text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
          >
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

// 今日待复习卡片
function ReviewCard({ item, onReviewed, onDelete }) {
  const overdueDays = getOverdueDays(item.nextReviewDate)

  let borderColor = 'border-gray-200'
  let badgeColor = 'bg-gray-100 text-gray-600'
  let badgeText = '今日到期'

  if (overdueDays > 3) {
    borderColor = 'border-red-300'
    badgeColor = 'bg-red-50 text-red-600'
    badgeText = `逾期 ${overdueDays} 天`
  } else if (overdueDays > 0) {
    borderColor = 'border-orange-300'
    badgeColor = 'bg-orange-50 text-orange-600'
    badgeText = `逾期 ${overdueDays} 天`
  } else if (overdueDays === 0) {
    borderColor = 'border-blue-200'
    badgeColor = 'bg-blue-50 text-blue-600'
    badgeText = '今日到期'
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border ${borderColor} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 break-words">
            {item.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>
              {badgeText}
            </span>
            <span className="text-xs text-gray-400">
              {getStageName(item.reviewStage)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onReviewed(item)}
          className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
        >
          已复习
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}

// 全部知识卡片（未完成的）
function AllCard({ item, onReviewed, onDelete }) {
  const isDue = item.nextReviewDate && new Date(item.nextReviewDate) <= todayStart()
  const overdueDays = item.nextReviewDate ? getOverdueDays(item.nextReviewDate) : 0

  let statusLabel = ''
  let statusColor = ''

  if (isDue) {
    if (overdueDays > 3) {
      statusLabel = `逾期 ${overdueDays} 天`
      statusColor = 'bg-red-50 text-red-600'
    } else if (overdueDays > 0) {
      statusLabel = `逾期 ${overdueDays} 天`
      statusColor = 'bg-orange-50 text-orange-600'
    } else {
      statusLabel = '今日待复习'
      statusColor = 'bg-blue-50 text-blue-600'
    }
  } else {
    const remaining = item.nextReviewDate
      ? Math.ceil((new Date(item.nextReviewDate) - todayStart()) / (1000 * 60 * 60 * 24))
      : 0
    statusLabel = `${remaining} 天后复习`
    statusColor = 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 break-words">
            {item.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-gray-400">
              {getStageName(item.reviewStage)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {isDue && (
          <button
            onClick={() => onReviewed(item)}
            className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            已复习
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          删除
        </button>
      </div>
    </div>
  )
}

// 空状态
function Empty({ text }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
      <div className="text-4xl mb-3">📚</div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  )
}
