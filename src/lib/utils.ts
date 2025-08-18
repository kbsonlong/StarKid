import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 格式化日期
export function formatDate(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化时间
export function formatDateTime(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 计算年龄
export function calculateAge(birthDate: string) {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// 获取积分颜色
export function getPointsColor(points: number) {
  if (points >= 100) return 'text-green-600'
  if (points >= 50) return 'text-yellow-600'
  if (points >= 0) return 'text-gray-600'
  return 'text-red-600'
}

// 获取积分背景色
export function getPointsBgColor(points: number) {
  if (points >= 100) return 'bg-green-100'
  if (points >= 50) return 'bg-yellow-100'
  if (points >= 0) return 'bg-gray-100'
  return 'bg-red-100'
}