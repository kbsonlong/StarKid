import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Settings, Copy, Check, Crown, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { JoinRequestsManager } from '../components/JoinRequestsManager';

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'parent' | 'guardian' | 'member';
  permissions: string[];
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface PendingBehavior {
  id: string;
  child_id: string;
  type: 'positive' | 'negative';
  description: string;
  points: number;
  recorded_by: string;
  is_verified: boolean;
  created_at: string;
  child: {
    name: string;
    avatar_url?: string;
  };
  recorder: {
    name: string;
  };
}

interface PendingReward {
  id: string;
  child_id: string;
  name: string;
  points_cost: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  created_at: string;
  child: {
    name: string;
    avatar_url?: string;
  };
}

const Collaborate: React.FC = () => {
  const { user, family, generateInviteCode } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'members' | 'permissions' | 'approvals' | 'join-requests'>('members');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [pendingBehaviors, setPendingBehaviors] = useState<PendingBehavior[]>([]);
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (family) {
      loadFamilyMembers();
      loadPendingApprovals();
      // 如果家庭没有邀请码，自动生成一个
      if (!family.invite_code) {
        generateNewInviteCode();
      } else {
        setInviteCode(family.invite_code);
      }
    }
  }, [family]);

  const loadFamilyMembers = async () => {
    if (!family) return;
    
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          *,
          user:users(
            id, name, email, avatar_url
          )
        `)
        .eq('family_id', family.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('加载家庭成员失败:', error);
    }
  };

  const loadPendingApprovals = async () => {
    if (!family) return;
    
    try {
      // 加载待审核行为
      const { data: behaviors, error: behaviorError } = await supabase
        .from('behaviors')
        .select(`
          *,
          child:children(name, avatar_url),
          recorder:users!behaviors_recorded_by_fkey(name)
        `)
        .eq('is_verified', false)
        .in('child_id', family.children?.map(c => c.id) || [])
        .order('created_at', { ascending: false });

      if (behaviorError) throw behaviorError;
      setPendingBehaviors(behaviors || []);

      // 加载待审核奖励
      const { data: rewards, error: rewardError } = await supabase
        .from('rewards')
        .select(`
          *,
          child:children(name, avatar_url)
        `)
        .eq('status', 'pending')
        .in('child_id', family.children?.map(c => c.id) || [])
        .order('created_at', { ascending: false });

      if (rewardError) throw rewardError;
      setPendingRewards(rewards || []);
    } catch (error) {
      console.error('加载待审核项目失败:', error);
    }
  };

  const generateNewInviteCode = async () => {
    if (!family) return;
    
    setLoading(true);
    try {
      const newCode = await generateInviteCode();
      
      const { error } = await supabase
        .from('families')
        .update({ invite_code: newCode })
        .eq('id', family.id);

      if (error) throw error;

      setInviteCode(newCode);
      toast.success('邀请码已更新');
    } catch (error) {
      console.error('生成邀请码失败:', error);
      toast.error('生成邀请码失败');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      toast.success('邀请码已复制到剪贴板');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'parent' | 'guardian' | 'member') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('成员角色已更新');
      loadFamilyMembers();
    } catch (error) {
      console.error('更新成员角色失败:', error);
      toast.error('更新成员角色失败');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('确定要移除此成员吗？')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('成员已移除');
      loadFamilyMembers();
    } catch (error) {
      console.error('移除成员失败:', error);
      toast.error('移除成员失败');
    } finally {
      setLoading(false);
    }
  };

  const approveBehavior = async (behaviorId: string, approved: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('behaviors')
        .update({ 
          is_verified: approved,
          verified_by: approved ? user?.id : null
        })
        .eq('id', behaviorId);

      if (error) throw error;

      toast.success(approved ? '行为已审核通过' : '行为已拒绝');
      loadPendingApprovals();
    } catch (error) {
      console.error('审核行为失败:', error);
      toast.error('审核行为失败');
    } finally {
      setLoading(false);
    }
  };

  const approveReward = async (rewardId: string, approved: boolean, note?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ 
          status: approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          approval_note: note
        })
        .eq('id', rewardId);

      if (error) throw error;

      toast.success(approved ? '奖励已审核通过' : '奖励已拒绝');
      loadPendingApprovals();
    } catch (error) {
      console.error('审核奖励失败:', error);
      toast.error('审核奖励失败');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'parent': return '家长';
      case 'guardian': return '监护人';
      case 'member': return '成员';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'parent': return 'bg-blue-100 text-blue-800';
      case 'guardian': return 'bg-green-100 text-green-800';
      case 'member': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!family) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-4 xs:p-6 text-center">
          <Users className="w-12 h-12 xs:w-16 xs:h-16 text-blue-500 mx-auto mb-3 xs:mb-4" />
          <h2 className="text-lg xs:text-xl font-bold text-gray-800 mb-2">创建或加入家庭</h2>
          <p className="text-sm xs:text-base text-gray-600">请先在设置页面创建或加入一个家庭来使用协作功能</p>
        </div>
      </div>
    );
  }

  const currentUserMember = familyMembers.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'parent';
  const canManageMembers = isAdmin || currentUserMember?.role === 'guardian';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{family.name} - 家长协作</h1>
                <p className="text-sm text-gray-600">{family.description || '共同管理孩子的成长'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">成员数: {familyMembers.length}</span>
            </div>
          </div>

          {/* 邀请家长提示卡片 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">邀请更多家长参与</h3>
                <p className="text-blue-700 mb-4">
                  邀请配偶、祖父母或其他照顾者加入家庭，共同记录和管理孩子的行为表现。
                  多人协作让孩子的成长记录更完整！
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowInviteCode(!showInviteCode)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {showInviteCode ? '隐藏邀请码' : '生成邀请码'}
                  </button>
                  <div className="text-sm text-blue-600">
                    <span className="font-medium">提示：</span> 其他家长使用邀请码即可加入您的家庭
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 邀请码区域 */}
          {canManageMembers && (
            <div className="bg-blue-50 rounded-lg p-3 xs:p-4 mb-4">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between space-y-3 xs:space-y-0">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-800 mb-1">家庭邀请码</h3>
                  <div className="flex flex-col xs:flex-row xs:items-center space-y-2 xs:space-y-0 xs:space-x-3">
                    <div className="flex items-center space-x-2">
                      <code className={`px-2 xs:px-3 py-1 bg-white rounded border text-base xs:text-lg font-mono ${
                        showInviteCode ? 'text-gray-800' : 'text-transparent bg-gray-200'
                      }`}>
                        {showInviteCode ? inviteCode : '••••••••'}
                      </code>
                      <button
                        onClick={() => setShowInviteCode(!showInviteCode)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        {showInviteCode ? <EyeOff className="w-3.5 h-3.5 xs:w-4 xs:h-4" /> : <Eye className="w-3.5 h-3.5 xs:w-4 xs:h-4" />}
                      </button>
                    </div>
                    {showInviteCode && (
                      <button
                        onClick={copyInviteCode}
                        className="flex items-center justify-center space-x-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 w-full xs:w-auto"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 xs:w-4 xs:h-4" /> : <Copy className="w-3.5 h-3.5 xs:w-4 xs:h-4" />}
                        <span>{copiedCode ? '已复制' : '复制'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={generateNewInviteCode}
                  disabled={loading}
                  className="w-full xs:w-auto px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                >
                  重新生成
                </button>
              </div>
            </div>
          )}

          {/* 标签页 */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              成员管理
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'permissions'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              权限设置
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'approvals'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              待审核 ({pendingBehaviors.length + pendingRewards.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('join-requests')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'join-requests'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <UserCheck className="w-4 h-4 inline mr-2" />
                加入申请
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {activeTab === 'members' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">家庭成员</h3>
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        {member.user?.avatar_url ? (
                          <img src={member.user?.avatar_url} alt={member.user?.name || '用户'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold">{member.user?.name?.[0] || '?'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-800">{member.user?.name || '未知用户'}</h4>
                          {member.role === 'parent' && <Crown className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-gray-600">{member.user?.email || '无邮箱'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(member.role)}`}>
                            {getRoleDisplayName(member.role)}
                          </span>
                          <span className="text-xs text-gray-500">
                            加入于 {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {canManageMembers && member.user_id !== user?.id && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as any)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="member">成员</option>
                          <option value="guardian">监护人</option>
                          {isAdmin && <option value="parent">家长</option>}
                        </select>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          移除
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div>
              <h3 className="text-base xs:text-lg font-semibold text-gray-800 mb-3 xs:mb-4">权限说明</h3>
              <div className="space-y-3 xs:space-y-4">
                <div className="p-3 xs:p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Crown className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-500" />
                    <h4 className="text-sm xs:text-base font-medium text-gray-800">家长</h4>
                  </div>
                  <ul className="text-xs xs:text-sm text-gray-600 space-y-1 ml-6 xs:ml-7">
                    <li>• 管理家庭成员和权限</li>
                    <li>• 生成和管理邀请码</li>
                    <li>• 审核所有行为和奖励申请</li>
                    <li>• 修改家庭设置和规则</li>
                    <li>• 查看所有数据和统计</li>
                  </ul>
                </div>
                
                <div className="p-3 xs:p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 xs:w-5 xs:h-5 text-green-500" />
                    <h4 className="text-sm xs:text-base font-medium text-gray-800">监护人</h4>
                  </div>
                  <ul className="text-xs xs:text-sm text-gray-600 space-y-1 ml-6 xs:ml-7">
                    <li>• 记录孩子的行为表现</li>
                    <li>• 审核行为和奖励申请</li>
                    <li>• 查看孩子的成长数据</li>
                    <li>• 参与家庭协作管理</li>
                    <li>• 设置和修改规则</li>
                  </ul>
                </div>
                
                <div className="p-3 xs:p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="w-4 h-4 xs:w-5 xs:h-5 text-gray-500" />
                    <h4 className="text-sm xs:text-base font-medium text-gray-800">成员</h4>
                  </div>
                  <ul className="text-xs xs:text-sm text-gray-600 space-y-1 ml-6 xs:ml-7">
                    <li>• 查看孩子的基本信息</li>
                    <li>• 查看行为记录和积分</li>
                    <li>• 查看成长统计数据</li>
                    <li>• 无法修改任何设置</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'join-requests' && (
            <JoinRequestsManager />
          )}

          {activeTab === 'approvals' && (
            <div>
              <h3 className="text-base xs:text-lg font-semibold text-gray-800 mb-3 xs:mb-4">待审核项目</h3>
              
              {/* 待审核行为 */}
              {pendingBehaviors.length > 0 && (
                <div className="mb-4 xs:mb-6">
                  <h4 className="text-sm xs:text-base font-medium text-gray-800 mb-2 xs:mb-3">待审核行为 ({pendingBehaviors.length})</h4>
                  <div className="space-y-2 xs:space-y-3">
                    {pendingBehaviors.map((behavior) => (
                      <div key={behavior.id} className="p-3 xs:p-4 border border-gray-200 rounded-lg">
                        <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between space-y-3 xs:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                behavior.type === 'positive' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {behavior.type === 'positive' ? '正面行为' : '负面行为'}
                              </span>
                              <span className="text-xs xs:text-sm text-gray-600">{behavior.child?.name || '未知孩子'}</span>
                              <span className="text-xs xs:text-sm text-gray-500">记录者: {behavior.recorder?.name || '未知记录者'}</span>
                            </div>
                            <p className="text-sm xs:text-base text-gray-800 mb-1">{behavior.description}</p>
                            <p className="text-xs xs:text-sm text-gray-600">
                              积分: {behavior.type === 'positive' ? `+${behavior.points}` : `扣${Math.abs(behavior.points)}分`} | 
                              时间: {new Date(behavior.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2 xs:ml-4">
                            <button
                              onClick={() => approveBehavior(behavior.id, true)}
                              disabled={loading}
                              className="flex-1 xs:flex-none px-3 py-1.5 xs:py-1 bg-green-500 text-white text-xs xs:text-sm rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => approveBehavior(behavior.id, false)}
                              disabled={loading}
                              className="flex-1 xs:flex-none px-3 py-1.5 xs:py-1 bg-red-500 text-white text-xs xs:text-sm rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 待审核奖励 */}
              {pendingRewards.length > 0 && (
                <div>
                  <h4 className="text-sm xs:text-base font-medium text-gray-800 mb-2 xs:mb-3">待审核奖励 ({pendingRewards.length})</h4>
                  <div className="space-y-2 xs:space-y-3">
                    {pendingRewards.map((reward) => (
                      <div key={reward.id} className="p-3 xs:p-4 border border-gray-200 rounded-lg">
                        <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between space-y-3 xs:space-y-0">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs xs:text-sm text-gray-600">{reward.child?.name || '未知孩子'}</span>
                              <span className="text-xs xs:text-sm text-gray-500">
                                申请时间: {new Date(reward.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm xs:text-base text-gray-800 mb-1">{reward.name}</p>
                            <p className="text-xs xs:text-sm text-gray-600">需要积分: {reward.points_cost}</p>
                          </div>
                          <div className="flex space-x-2 xs:ml-4">
                            <button
                              onClick={() => approveReward(reward.id, true)}
                              disabled={loading}
                              className="flex-1 xs:flex-none px-3 py-1.5 xs:py-1 bg-green-500 text-white text-xs xs:text-sm rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              通过
                            </button>
                            <button
                              onClick={() => approveReward(reward.id, false)}
                              disabled={loading}
                              className="flex-1 xs:flex-none px-3 py-1.5 xs:py-1 bg-red-500 text-white text-xs xs:text-sm rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              拒绝
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {pendingBehaviors.length === 0 && pendingRewards.length === 0 && (
                <div className="text-center py-6 xs:py-8 text-gray-500">
                  <Settings className="w-10 h-10 xs:w-12 xs:h-12 mx-auto mb-2 xs:mb-3 opacity-50" />
                  <p className="text-sm xs:text-base">暂无待审核项目</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Collaborate;