import { useState, useEffect } from 'react'
import { useAuthStore } from '../store'
import { apiClient } from '../lib/api'

function Debug() {
  const { user, family, children } = useAuthStore()
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addTestResult = (test: string, result: any, error?: any) => {
    setTestResults(prev => [...prev, {
      test,
      result,
      error,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const testChildrenQuery = async () => {
    setLoading(true)
    try {
      if (!family) {
        addTestResult('Children Query', null, 'No family found')
        return
      }

      // 测试查询儿童数据
      try {
        const childrenData = await apiClient.getChildren(family.id)
        addTestResult('Children Query', childrenData, null)
      } catch (error) {
        addTestResult('Children Query', null, error)
      }

      // 测试查询家庭成员
      try {
        const membersData = await apiClient.getFamilyMembers(family.id)
        addTestResult('Family Members Query', membersData, null)
      } catch (error) {
        addTestResult('Family Members Query', null, error)
      }

      // 测试当前用户信息
      addTestResult('Current Auth User', user, null)

    } catch (error) {
      addTestResult('Test Error', null, error)
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">调试页面</h1>
        
        {/* 当前状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">当前状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-gray-700">用户信息</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">家庭信息</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(family, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">儿童信息</h3>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(children, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">测试操作</h2>
          <div className="flex space-x-4">
            <button
              onClick={testChildrenQuery}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试数据库查询'}
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清除结果
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">测试结果</h2>
          <div className="space-y-4">
            {testResults.length === 0 ? (
              <p className="text-gray-500">暂无测试结果</p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{result.test}</h3>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  {result.error ? (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <h4 className="text-red-800 font-medium mb-1">错误:</h4>
                      <pre className="text-xs text-red-700 overflow-auto">
                        {JSON.stringify(result.error, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <h4 className="text-green-800 font-medium mb-1">结果:</h4>
                      <pre className="text-xs text-green-700 overflow-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Debug