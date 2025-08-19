import React, { useState, useEffect } from 'react';
import { Users, Trophy, MessageCircle, UserPlus, Star, Gift } from 'lucide-react';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Friend {
  id: string;
  child_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend: {
    id: string;
    name: string;
    avatar_url?: string;
    points: number;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  points_reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  is_active: boolean;
  participants?: {
    child_id: string;
    status: 'joined' | 'completed' | 'abandoned';
    completed_at?: string;
    child: {
      name: string;
      avatar_url?: string;
    };
  }[];
}

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: 'text' | 'preset' | 'emoji';
  created_at: string;
  sender: {
    name: string;
    avatar_url?: string;
  };
}

const Community: React.FC = () => {
  const { user, selectedChild } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'challenges' | 'chat'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedChild) {
      loadFriends();
      loadChallenges();
      loadMessages();
    }
  }, [selectedChild]);

  const loadFriends = async () => {
    if (!selectedChild) return;
    
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          friend:children!friendships_friend_id_fkey(
            id, name, avatar_url, points
          )
        `)
        .eq('child_id', selectedChild.id)
        .eq('status', 'accepted');

      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          participants:challenge_participants(
            child_id, status, completed_at,
            child:children(name, avatar_url)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('加载挑战列表失败:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChild || !selectedFriend) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:children!chat_messages_sender_id_fkey(name, avatar_url)
        `)
        .or(`and(sender_id.eq.${selectedChild.id},receiver_id.eq.${selectedFriend}),and(sender_id.eq.${selectedFriend},receiver_id.eq.${selectedChild.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    }
  };

  const sendFriendInvite = async () => {
    if (!selectedChild || !inviteCode.trim()) {
      toast.error('请输入好友邀请码');
      return;
    }

    setLoading(true);
    try {
      // 查找目标儿童
      const { data: targetChild, error: findError } = await supabase
        .from('children')
        .select('id, name')
        .eq('child_invite_code', inviteCode.trim())
        .single();

      if (findError || !targetChild) {
        toast.error('邀请码无效');
        return;
      }

      if (targetChild.id === selectedChild.id) {
        toast.error('不能添加自己为好友');
        return;
      }

      // 检查是否已经是好友
      const { data: existingFriend } = await supabase
        .from('friendships')
        .select('id')
        .or(`and(child_id.eq.${selectedChild.id},friend_id.eq.${targetChild.id}),and(child_id.eq.${targetChild.id},friend_id.eq.${selectedChild.id})`)
        .single();

      if (existingFriend) {
        toast.error('已经是好友关系');
        return;
      }

      // 发送好友请求
      const { error: inviteError } = await supabase
        .from('friendships')
        .insert({
          child_id: selectedChild.id,
          friend_id: targetChild.id,
          status: 'pending'
        });

      if (inviteError) throw inviteError;

      toast.success(`已向 ${targetChild.name} 发送好友请求`);
      setInviteCode('');
    } catch (error) {
      console.error('发送好友邀请失败:', error);
      toast.error('发送好友邀请失败');
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!selectedChild) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          child_id: selectedChild.id,
          status: 'joined'
        });

      if (error) throw error;

      toast.success('成功加入挑战!');
      loadChallenges();
    } catch (error) {
      console.error('加入挑战失败:', error);
      toast.error('加入挑战失败');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedChild || !selectedFriend || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: selectedChild.id,
          receiver_id: selectedFriend,
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
    }
  };

  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 text-center">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
            <Users className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-3">开始儿童社交之旅</h3>
            <p className="text-gray-600 mb-6">
              为了让孩子与其他小朋友互动，请先添加并选择一个小朋友。
              孩子们可以通过邀请码成为好友，一起参与挑战！
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/settings'}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                前往添加小朋友
              </button>
              <p className="text-sm text-gray-500">
                💡 添加小朋友后，他们将获得专属邀请码用于交友
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                {selectedChild.avatar_url ? (
                  <img src={selectedChild.avatar_url} alt={selectedChild.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Users className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{selectedChild.name} 的互动社区</h1>
                <p className="text-sm text-gray-600">邀请码: {selectedChild.child_invite_code || '未生成'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-yellow-600">
              <Star className="w-5 h-5" />
              <span className="font-bold">{selectedChild.points} 积分</span>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'friends'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              好友
            </button>
            <button
              onClick={() => setActiveTab('challenges')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'challenges'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              挑战
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageCircle className="w-4 h-4 inline mr-2" />
              聊天
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {activeTab === 'friends' && (
            <div>
              {/* 添加好友 - 优化版 */}
              <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <UserPlus className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">添加新好友</h3>
                    <p className="text-green-700 mb-4">
                      输入其他小朋友的邀请码，让 {selectedChild.name} 和他们成为好朋友！
                      好朋友可以一起参与挑战，互相鼓励成长。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="请输入好友的邀请码（例如：ABC123）"
                        className="flex-1 px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                      <button
                        onClick={sendFriendInvite}
                        disabled={loading}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium inline-flex items-center justify-center"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        发送好友请求
                      </button>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      💡 提示：邀请码可以在小朋友的个人信息中找到
                    </p>
                  </div>
                </div>
              </div>

              {/* 好友列表 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">我的好友 ({friends.length})</h3>
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>还没有好友，快去邀请小伙伴吧!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                              {friend.friend.avatar_url ? (
                                <img src={friend.friend.avatar_url} alt={friend.friend.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-800">{friend.friend.name}</h4>
                              <p className="text-sm text-gray-600">{friend.friend.points} 积分</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFriend(friend.friend_id);
                              setActiveTab('chat');
                            }}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                          >
                            聊天
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'challenges' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">活跃挑战</h3>
              {challenges.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无活跃挑战</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {challenges.map((challenge) => {
                    const isParticipating = challenge.participants?.some(p => p.child_id === selectedChild?.id);
                    return (
                      <div key={challenge.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-800">{challenge.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                challenge.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                challenge.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {challenge.difficulty === 'easy' ? '简单' : challenge.difficulty === 'medium' ? '中等' : '困难'}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{challenge.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Gift className="w-4 h-4" />
                                <span>{challenge.points_reward} 积分</span>
                              </span>
                              <span>{challenge.participants?.length || 0} 人参与</span>
                            </div>
                          </div>
                          {!isParticipating && (
                            <button
                              onClick={() => joinChallenge(challenge.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
                            >
                              参与挑战
                            </button>
                          )}
                          {isParticipating && (
                            <span className="px-4 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg">
                              已参与
                            </span>
                          )}
                        </div>
                        
                        {/* 参与者列表 */}
                        {challenge.participants && challenge.participants.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600 mb-2">参与者:</p>
                            <div className="flex flex-wrap gap-2">
                              {challenge.participants.slice(0, 5).map((participant, index) => (
                                <div key={index} className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-white">{participant.child.name[0]}</span>
                                  </div>
                                  <span className="text-xs text-gray-700">{participant.child.name}</span>
                                </div>
                              ))}
                              {challenge.participants.length > 5 && (
                                <span className="text-xs text-gray-500">+{challenge.participants.length - 5} 更多</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              {!selectedFriend ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>请先选择一个好友开始聊天</p>
                </div>
              ) : (
                <div className="h-96 flex flex-col">
                  {/* 聊天记录 */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === selectedChild?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.sender_id === selectedChild?.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 发送消息 */}
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="输入消息..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                    >
                      发送
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;