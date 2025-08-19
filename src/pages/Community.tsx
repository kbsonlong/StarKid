import React, { useState, useEffect } from 'react';
import { Users, Trophy, MessageCircle, Star, Clock, Target, Send, Smile, Shield, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store'
import { useChallengesStore } from '../store'
import { useChatStore } from '../store'
import { useLeaderboardStore } from '../store'
import { useSupervisionStore } from '../store';

// 类型定义
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'group';
  difficulty: 'easy' | 'medium' | 'hard';
  points_reward: number;
  end_date: string;
  participants?: number;
  is_participating?: boolean;
  is_active: boolean;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
    message: string;
    created_at: string;
    message_type: 'text' | 'preset' | 'emoji';
    is_read: boolean;
}

interface PresetMessage {
  id: string;
  text: string;
  category: 'greeting' | 'encouragement' | 'celebration' | 'question';
  emoji?: string;
}

// 预设消息模板
const PRESET_MESSAGES: PresetMessage[] = [
  { id: '1', text: '你好！', category: 'greeting', emoji: '👋' },
  { id: '2', text: '早上好！', category: 'greeting', emoji: '🌅' },
  { id: '3', text: '做得很棒！', category: 'encouragement', emoji: '👏' },
  { id: '4', text: '继续加油！', category: 'encouragement', emoji: '💪' },
  { id: '5', text: '恭喜你！', category: 'celebration', emoji: '🎉' },
  { id: '6', text: '太棒了！', category: 'celebration', emoji: '⭐' },
  { id: '7', text: '你在做什么？', category: 'question', emoji: '❓' },
  { id: '8', text: '今天过得怎么样？', category: 'question', emoji: '😊' }
]

// 模拟挑战数据
const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: '每日阅读挑战',
    description: '连续7天每天阅读30分钟',
    type: 'individual',
    difficulty: 'easy',
    points_reward: 50,
    end_date: '2024-01-31',
    is_active: true,
    participants: 15
  },
  {
    id: '2',
    title: '家务小帮手',
    description: '本周帮助家长完成5项家务',
    type: 'individual',
    difficulty: 'medium',
    points_reward: 80,
    end_date: '2024-01-07',
    is_active: true,
    participants: 23
  },
  {
    id: '3',
    title: '团队合作挑战',
    description: '与朋友一起完成拼图游戏',
    type: 'group',
    difficulty: 'hard',
    points_reward: 120,
    end_date: '2024-01-14',
    is_active: true,
    participants: 8
  }
]



// 模拟聊天消息
const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    sender_id: 'child1',
    receiver_id: 'child2',
    message: '大家好！',
    message_type: 'preset',
    is_read: false,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: '2',
    sender_id: 'child2',
    receiver_id: 'child1',
    message: '你好！今天天气真好呢！',
    message_type: 'text',
    is_read: false,
    created_at: '2024-01-01T10:05:00Z'
  },
  {
    id: '3',
    sender_id: 'child3',
    receiver_id: 'child1',
    message: '做得很棒！',
    message_type: 'preset',
    is_read: true,
    created_at: '2024-01-01T10:10:00Z'
  }
]

export function Community() {
  const { user, family, children, selectedChild } = useAuthStore();
  const { 
    challenges, 
    participants, 
    loading: challengesLoading, 
    loadChallenges, 
    joinChallenge, 
    updateProgress 
  } = useChallengesStore();
  const { 
    messages, 
    loading: chatLoading, 
    loadMessages, 
    sendMessage, 
    loadPresetMessages 
  } = useChatStore();
  const { leaderboard, loading: leaderboardLoading, loadLeaderboard } = useLeaderboardStore();
  const { logs, flaggedLogs, loading: supervisionLoading, loadSupervisionLogs, flagActivity, reviewActivity, getActivityStats } = useSupervisionStore();
  
  const [activeTab, setActiveTab] = useState<'challenges' | 'chat' | 'leaderboard' | 'supervision'>('challenges');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  // 初始化数据加载
  useEffect(() => {
    if (selectedChild) {
      loadChallenges();
      loadPresetMessages();
      if (selectedFriend) {
        loadMessages(selectedChild.id, selectedFriend);
      }
    }
    
    // 加载排行榜数据
    if (family?.id) {
      loadLeaderboard(family.id);
      // 只有家长才能查看监督日志
      if (user?.role === 'parent') {
        loadSupervisionLogs(family.id);
      }
    }
  }, [selectedChild, selectedFriend, family?.id, user?.role, loadChallenges, loadPresetMessages, loadMessages, loadLeaderboard, loadSupervisionLogs]);

  // 检查是否有选中的儿童
  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">请先选择儿童</h2>
          <p className="text-gray-600">需要选择一个儿童账户才能访问互动社区</p>
        </div>
      </div>
    )
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'hard': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600'
      case 2: return 'text-gray-500'
      case 3: return 'text-orange-600'
      default: return 'text-gray-700'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  // 处理挑战参与
  const handleJoinChallenge = async (challengeId: string) => {
    if (!selectedChild) return;
    
    try {
      await joinChallenge(challengeId, selectedChild.id);
      // 重新加载挑战数据以更新参与状态
      await loadChallenges();
    } catch (error) {
      console.error('参与挑战失败:', error);
    }
  };

  // 处理发送消息
  const handleSendMessage = async (message: string, type: 'text' | 'preset' = 'text') => {
    if (!message.trim() || !selectedFriend || !selectedChild) return;

    try {
      await sendMessage(
        selectedChild.id,
        selectedFriend,
        message.trim(),
        type
      );
      setNewMessage('');
      setShowPresets(false);
      // 重新加载消息
      await loadMessages(selectedChild.id, selectedFriend);
    } catch (error) {
      console.error('消息发送失败:', error);
    }
  };

  const handlePresetMessage = (preset: PresetMessage) => {
    handleSendMessage(preset.text, 'preset')
  }

  // 获取挑战的参与状态
  const getChallengeParticipation = (challengeId: string) => {
    if (!selectedChild) return false;
    return participants.some(p => 
      p.challenge_id === challengeId && 
      p.child_id === selectedChild.id
    );
  };

  // 获取挑战的参与者数量
  const getChallengeParticipants = (challengeId: string) => {
    return participants.filter(p => p.challenge_id === challengeId).length;
  };

  // 获取当前聊天的消息
  const getCurrentMessages = () => {
    if (!selectedChild || !selectedFriend) return [];
    return messages.filter(m => 
      (m.sender_id === selectedChild.id && m.receiver_id === selectedFriend) ||
      (m.sender_id === selectedFriend && m.receiver_id === selectedChild.id)
    );
  };

  // 按类别分组预设消息
  const groupedPresets = PRESET_MESSAGES.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, PresetMessage[]>);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              互动社区
            </h1>
            <p className="text-gray-600">
              与其他小朋友一起参加挑战，分享成长的快乐！
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">当前用户</div>
            <div className="text-lg font-semibold text-blue-600">
              {selectedChild.name}
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'challenges', name: '社区挑战', icon: Target },
              { id: 'chat', name: '安全聊天', icon: MessageCircle },
              { id: 'leaderboard', name: '积分排行', icon: Trophy },
              ...(user?.role === 'parent' ? [{ id: 'supervision', name: '家长监督', icon: Shield }] : [])
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* 社区挑战标签页 */}
          {activeTab === 'challenges' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">当前挑战</h2>
                <div className="flex items-center text-sm text-gray-500">
                  <Shield className="h-4 w-4 mr-1" />
                  所有挑战都经过安全审核
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challengesLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">加载挑战中...</p>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">暂无挑战活动</p>
                  </div>
                ) : (
                  challenges.map((challenge) => {
                    const isParticipating = getChallengeParticipation(challenge.id);
                    const participantCount = getChallengeParticipants(challenge.id);
                    
                    return (
                      <div key={challenge.id} className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${
                              challenge.type === 'group' ? 'bg-purple-100' : 'bg-blue-100'
                            }`}>
                              {challenge.type === 'group' ? (
                                <Users className={`h-5 w-5 ${
                                  challenge.type === 'group' ? 'text-purple-600' : 'text-blue-600'
                                }`} />
                              ) : (
                                <Target className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              getDifficultyColor(challenge.difficulty)
                            }`}>
                              {challenge.difficulty === 'easy' ? '简单' : 
                               challenge.difficulty === 'medium' ? '中等' : '困难'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-600">
                              +{challenge.points_reward}
                            </div>
                            <div className="text-xs text-gray-500">积分</div>
                          </div>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {challenge.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                          {challenge.description}
                        </p>

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            截止 {new Date(challenge.end_date).toLocaleDateString('zh-CN')}
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {participantCount} 人参与
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              challenge.type === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {challenge.type === 'individual' ? '个人挑战' : '团队挑战'}
                            </span>
                            {challenge.is_active && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                进行中
                              </span>
                            )}
                            {isParticipating && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                已参与
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinChallenge(challenge.id)}
                          disabled={isParticipating || !challenge.is_active}
                          className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                            isParticipating || !challenge.is_active
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {isParticipating ? '已参与' : !challenge.is_active ? '已结束' : '参加挑战'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 安全聊天标签页 */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">安全聊天</h2>
                <div className="flex items-center text-sm text-green-600">
                  <Shield className="h-4 w-4 mr-1" />
                  家长监督中
                </div>
              </div>

              {/* 聊天区域 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">安全聊天</h3>
                  <p className="text-sm text-gray-500">使用预设消息模板进行安全交流</p>
                  {!selectedFriend && (
                    <p className="text-sm text-orange-500 mt-1">请先选择聊天对象</p>
                  )}
                </div>
                
                {/* 消息列表 */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2 text-sm">加载消息中...</p>
                    </div>
                  ) : !selectedFriend ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">选择好友开始聊天</p>
                    </div>
                  ) : getCurrentMessages().length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">还没有消息，开始对话吧！</p>
                    </div>
                  ) : (
                    getCurrentMessages().map((message) => {
                      const isOwn = message.sender_id === selectedChild?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs opacity-70">
                                {formatTime(message.created_at)}
                              </p>
                              {message.message_type === 'preset' && (
                                <span className="text-xs opacity-70 ml-2">预设</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {/* 输入区域 */}
                <div className="p-4 border-t border-gray-100">
                  {showPresets && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">选择预设消息：</h4>
                      {Object.keys(groupedPresets).length === 0 ? (
                        <p className="text-sm text-gray-500">暂无预设消息</p>
                      ) : (
                        Object.entries(groupedPresets).map(([category, presets]) => (
                          <div key={category} className="mb-3">
                            <h5 className="text-xs font-medium text-gray-600 mb-1 capitalize">{category}</h5>
                            <div className="grid grid-cols-1 gap-1">
                              {presets.map((preset) => (
                                <button
                                  key={preset.id}
                                  onClick={() => handleSendMessage(preset.text, 'preset')}
                                  className="text-left p-2 text-sm bg-white rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                >
                                  {preset.emoji && <span className="mr-2">{preset.emoji}</span>}
                                  {preset.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPresets(!showPresets)}
                      disabled={!selectedFriend}
                      className={`p-2 transition-colors ${
                        selectedFriend 
                          ? 'text-gray-500 hover:text-blue-500' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && selectedFriend && handleSendMessage(newMessage)}
                      placeholder={selectedFriend ? "输入消息..." : "请先选择聊天对象"}
                      disabled={!selectedFriend}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={() => handleSendMessage(newMessage)}
                      disabled={!selectedFriend || !newMessage.trim()}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedFriend && newMessage.trim()
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 消息输入区域 */}
              <div className="space-y-4">
                {/* 预设消息 */}
                <div>
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showPresets ? '隐藏' : '显示'}快捷消息
                  </button>
                  
                  {showPresets && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {PRESET_MESSAGES.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleSendMessage(preset.text, 'preset')}
                          className="p-2 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
                        >
                          <span className="mr-1">{preset.emoji}</span>
                          {preset.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 文本输入 */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(newMessage)}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSendMessage(newMessage)}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>

                {/* 安全提示 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>安全提示：</strong> 请不要分享个人信息，如真实姓名、地址、电话等。所有聊天记录都会被家长监督。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 积分排行标签页 */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">积分排行榜</h2>
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>
              
              {leaderboardLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
                  <p className="text-gray-500 mt-2">加载排行榜中...</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无排行榜数据</p>
                  <p className="text-gray-400 text-sm mt-2">完成挑战和行为记录来获得积分吧！</p>
                </div>
              ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className={`bg-gray-50 rounded-xl p-4 flex items-center justify-between ${
                    index < 3 ? 'ring-2 ring-yellow-200' : ''
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl font-bold ${
                        getRankColor(entry.rank)
                      }`}>
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {entry.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {entry.name}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-600">
                        {entry.points}
                      </div>
                      <div className="text-sm text-gray-500">积分</div>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* 当前用户排名 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Star className="h-6 w-6 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-800">
                        {selectedChild.name} 的排名
                      </div>
                      <div className="text-sm text-blue-600">
                        继续努力，争取更好的排名！
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">
                      {selectedChild.total_points || 0}
                    </div>
                    <div className="text-sm text-blue-500">积分</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 家长监督标签页 */}
          {activeTab === 'supervision' && user?.role === 'parent' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">家长监督</h2>
                <Shield className="h-6 w-6 text-green-600" />
              </div>

              {/* 监督统计 */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="text-sm text-blue-600 font-medium">今日活动</div>
                       <div className="text-2xl font-bold text-blue-800">
                         {logs.filter(log => {
                           const today = new Date().toDateString()
                           return new Date(log.created_at).toDateString() === today
                         }).length}
                       </div>
                     </div>
                     <MessageCircle className="h-8 w-8 text-blue-500" />
                   </div>
                 </div>
                 <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="text-sm text-yellow-600 font-medium">待审核</div>
                        <div className="text-2xl font-bold text-yellow-800">
                          {logs.filter(log => log.flagged && !log.reviewed_at).length}
                        </div>
                     </div>
                     <Clock className="h-8 w-8 text-yellow-500" />
                   </div>
                 </div>
                 <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <div className="text-sm text-red-600 font-medium">已标记</div>
                       <div className="text-2xl font-bold text-red-800">
                         {flaggedLogs.length}
                       </div>
                     </div>
                     <Shield className="h-8 w-8 text-red-500" />
                   </div>
                 </div>
               </div>

              {/* 监督日志 */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">活动监督日志</h3>
                </div>
                <div className="p-4">
                  {supervisionLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                      <p className="text-gray-500 mt-2">加载监督日志中...</p>
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">暂无监督日志</p>
                      <p className="text-gray-400 text-sm mt-2">当有社区活动时，监督日志会显示在这里</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logs.slice(0, 10).map((log) => (
                        <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            log.flagged ? 'bg-red-500' : 'bg-green-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-800">
                                {log.child?.name || '未知用户'} - {log.activity_type}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {log.details?.description || '活动详情'}
                            </div>
                            {log.flagged && (
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">已标记</span>
                                <button
                                  onClick={() => reviewActivity(log.id, true)}
                                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                                >
                                  批准
                                </button>
                                <button
                                  onClick={() => reviewActivity(log.id, false)}
                                  className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                                >
                                  拒绝
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 监督设置 */}
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">监督设置</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">自动标记敏感内容</div>
                      <div className="text-sm text-gray-600">自动检测并标记可能不当的聊天内容</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">实时通知</div>
                      <div className="text-sm text-gray-600">当有标记活动时立即通知家长</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 家长监督提示 */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
          <div className="text-sm text-green-800">
            <strong>家长监督：</strong> 所有社区活动都在家长的监督下进行。聊天记录会被保存，挑战活动经过安全审核。如有任何问题，请联系家长或管理员。
          </div>
        </div>
      </div>
    </div>
  )
}

export default Community