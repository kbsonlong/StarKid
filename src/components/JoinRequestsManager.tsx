import { useState, useEffect } from 'react'
import { Check, X, Clock, User, Mail, Calendar } from 'lucide-react'
import { useAuthStore } from '../store'
import { toast } from 'sonner'
import { formatDate } from '../lib/utils'

interface JoinRequest {
  id: string
  user_name: string
  user_email: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
}

interface JoinRequestsManagerProps {
  onRequestProcessed?: () => void
}

export function JoinRequestsManager({ onRequestProcessed }: JoinRequestsManagerProps) {
  const { getJoinRequests, approveJoinRequest } = useAuthStore()
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const loadRequests = async () => {
    try {
      setLoading(true)
      const data = await getJoinRequests()
      setRequests(data)
    } catch (error: any) {
      console.error('Failed to load join requests:', error)
      toast.error('加载申请列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleApprove = async (requestId: string, approved: boolean) => {
    try {
      setProcessing(requestId)
      const message = await approveJoinRequest(requestId, approved)
      toast.success(message)
      await loadRequests()
      onRequestProcessed?.()
    } catch (error: any) {
      console.error('Failed to process request:', error)
      toast.error(error.message || '处理申请失败')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">暂无待审核申请</h3>
        <p className="text-gray-600">当有新的家庭成员申请加入时，会在这里显示</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">待审核申请</h3>
        <span className="text-sm text-gray-500">{requests.length} 个待处理</span>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{request.user_name}</h4>
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-1" />
                      {request.user_email}
                    </div>
                  </div>
                </div>

                <div className="ml-13">
                  <p className="text-sm text-gray-600 mb-2">{request.message}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    申请时间：{formatDate(request.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleApprove(request.id, true)}
                  disabled={processing === request.id}
                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  {processing === request.id ? '处理中...' : '通过'}
                </button>
                <button
                  onClick={() => handleApprove(request.id, false)}
                  disabled={processing === request.id}
                  className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  拒绝
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>审核说明：</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-1 space-y-1">
          <li>• 通过申请后，用户将成为家庭成员，拥有查看和管理权限</li>
          <li>• 拒绝申请后，用户需要重新提交申请</li>
          <li>• 请仔细核实申请人身份，确保家庭信息安全</li>
        </ul>
      </div>
    </div>
  )
}