import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Building2, Plus, Edit2, Trash2, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HackalonAssignment() {
  const [user, setUser] = useState(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null);
  const [showUserAssignModal, setShowUserAssignModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', icon: 'Users', classroom: '' });
  const [teamForm, setTeamForm] = useState({ name: '', department: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [filterView, setFilterView] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: departments = [] } = useQuery({
    queryKey: ['hackalon-departments'],
    queryFn: () => base44.entities.HackalonDepartment.list('order'),
    enabled: isAdmin
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['hackalon-teams'],
    queryFn: () => base44.entities.HackalonTeam.list('order'),
    enabled: isAdmin
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  const { data: classroomKeys = [] } = useQuery({
    queryKey: ['classroom-keys'],
    queryFn: () => base44.entities.ClassroomKey.list(),
    enabled: isAdmin
  });

  // Department mutations
  const createDeptMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonDepartment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
      setShowDeptModal(false);
      setDeptForm({ name: '', icon: 'Users', classroom: '' });
      toast.success('המדור נוצר בהצלחה');
    }
  });

const updateDeptMutation = useMutation({
  mutationFn: async ({ id, data, oldName }) => {
    // Update the department
    await base44.entities.HackalonDepartment.update(id, data);
    
    // If name changed, update all teams in this department
    if (oldName && data.name !== oldName) {
      const deptTeams = teams.filter((t) => t.department_name === oldName);
      for (const team of deptTeams) {
        await base44.entities.HackalonTeam.update(team.id, {
          department_name: data.name
        });
        
        // Also update users assigned to this team
        const teamUsers = users.filter((u) => u.hackalon_department === oldName && u.hackalon_team === team.name);
        for (const user of teamUsers) {
          await base44.entities.User.update(user.id, {
            hackalon_department: data.name
          });
        }
      }
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
    queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setShowDeptModal(false);
    setEditingDept(null);
    setDeptForm({ name: '', icon: 'Users', classroom: '' });
    toast.success('המדור עודכן בהצלחה');
  }
});

  const deleteDeptMutation = useMutation({
    mutationFn: async (deptId) => {
      const dept = departments.find((d) => d.id === deptId);

      // Delete all teams in this department first
      const deptTeams = teams.filter((t) => t.department_name === dept.name);
      for (const team of deptTeams) {
        // Remove team assignments from all users
        const teamUsers = users.filter((u) => u.hackalon_team === team.name);
        for (const user of teamUsers) {
          await base44.entities.User.update(user.id, {
            hackalon_team: null,
            hackalon_department: null
          });
        }

        // Delete the team
        await base44.entities.HackalonTeam.delete(team.id);
      }

      // Finally delete the department
      return base44.entities.HackalonDepartment.delete(deptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('המדור וכל הצוותים שלו נמחקו בהצלחה');
    }
  });

  // Team mutations
  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonTeam.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      setShowTeamModal(false);
      setTeamForm({ name: '', department: '' });
      toast.success('הצוות נוצר בהצלחה');
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      setShowTeamModal(false);
      setEditingTeam(null);
      setTeamForm({ name: '', department: '' });
      toast.success('הצוות עודכן בהצלחה');
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => base44.entities.HackalonTeam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      toast.success('הצוות נמחק בהצלחה');
    }
  });

  // Add member to team mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberName, userId }) => {
      const team = teams.find((t) => t.id === teamId);
      const updatedMembers = [...(team.member_names || []), memberName];

      await base44.entities.HackalonTeam.update(teamId, { member_names: updatedMembers });

      // If user exists, assign them
      if (userId) {
        await base44.entities.User.update(userId, {
          hackalon_department: team.department_name,
          hackalon_team: team.name
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('הצוער נוסף בהצלחה');
      setSearchQuery('');
      setNewMemberName('');
    }
  });

  // Remove member from team mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberName }) => {
      const team = teams.find((t) => t.id === teamId);
      const updatedMembers = (team.member_names || []).filter((m) => m !== memberName);

      await base44.entities.HackalonTeam.update(teamId, { member_names: updatedMembers });

      // Remove assignment from user if exists
      const userToUpdate = users.find((u) => (u.onboarding_full_name || u.full_name) === memberName && u.hackalon_team === team.name);
      if (userToUpdate) {
        await base44.entities.User.update(userToUpdate.id, {
          hackalon_department: null,
          hackalon_team: null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('הצוער הוסר בהצלחה');
    }
  });

const handleSaveDept = () => {
  if (!deptForm.name.trim()) return;

  if (editingDept) {
    updateDeptMutation.mutate({ 
      id: editingDept.id, 
      data: deptForm,
      oldName: editingDept.name // העברת השם הישן
    });
  } else {
    createDeptMutation.mutate(deptForm);
  }
};

  const handleAssignUserToTeam = (teamId, teamName, deptName) => {
    if (!selectedUserForAssign) return;

    const team = teams.find((t) => t.id === teamId);
    const memberName = selectedUserForAssign.onboarding_full_name || selectedUserForAssign.full_name;

    addMemberMutation.mutate({
      teamId,
      memberName,
      userId: selectedUserForAssign.id
    });

    setShowUserAssignModal(false);
    setSelectedUserForAssign(null);
  };

  const handleSaveTeam = () => {
    if (!teamForm.name.trim() || !teamForm.department) return;

    const data = {
      name: teamForm.name,
      department_name: teamForm.department
    };

    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const handleOpenAddMembers = (team) => {
    setSelectedTeam(team);
    setShowAddMembersModal(true);
    setSearchQuery('');
    setNewMemberName('');
  };

  const handleAddExistingUser = (u) => {
    if (!selectedTeam) return;
    const memberName = u.onboarding_full_name || u.full_name;
    addMemberMutation.mutate({ teamId: selectedTeam.id, memberName, userId: u.id });
  };

  const handleAddNewMember = () => {
    if (!selectedTeam || !newMemberName.trim()) return;
    addMemberMutation.mutate({ teamId: selectedTeam.id, memberName: newMemberName.trim(), userId: null });
  };

  const handleRemoveMember = (teamId, memberName) => {
    removeMemberMutation.mutate({ teamId, memberName });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>);

  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-600">רק מנהלי מערכת יכולים לשבץ צוערים</p>
        </Card>
      </div>);

  }

  const assignedUsers = users.filter((u) => u.hackalon_team);
  const unassignedUsers = users.filter((u) => !u.hackalon_team);

  // Get total members including those not yet registered
  const getTotalMembers = () => {
    return teams.reduce((sum, team) => sum + (team.member_names?.length || 0), 0);
  };

  // Filter users for search
  const filteredUsers = users.filter((u) => {
    const name = (u.onboarding_full_name || u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  // Filter view logic
  const getDisplayedUsers = () => {
    if (filterView === 'assigned') return assignedUsers;
    if (filterView === 'unassigned') return unassignedUsers;
    return users;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            📋 שיבוץ צוערים ל-HackAlon
          </h1>
          <p className="text-slate-500">ניהול מדורים, צוותים ושיבוץ צוערים</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card
            className={`p-4 cursor-pointer transition-all ${filterView === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}
            onClick={() => setFilterView('all')}>

            <p className="text-sm text-slate-500">סה״כ משתמשים</p>
            <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          </Card>
          <Card
            className={`p-4 cursor-pointer transition-all ${filterView === 'assigned' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-50 border-green-200 hover:shadow-md'}`}
            onClick={() => setFilterView('assigned')}>

            <p className="text-sm text-green-600">משובצים</p>
            <p className="text-2xl font-bold text-green-700">{assignedUsers.length}</p>
          </Card>
          <Card
            className={`p-4 cursor-pointer transition-all ${filterView === 'unassigned' ? 'ring-2 ring-orange-500 bg-orange-50' : 'bg-orange-50 border-orange-200 hover:shadow-md'}`}
            onClick={() => setFilterView('unassigned')}>

            <p className="text-sm text-orange-600">ממתינים לשיבוץ</p>
            <p className="text-2xl font-bold text-orange-700">{unassignedUsers.length}</p>
          </Card>
        </div>

        {/* Teams by Department */}
        <div className="space-y-6 mb-6">
          {departments.map((dept) => {
            const deptTeams = teams.filter((t) => t.department_name === dept.name);
            return (
              <Card key={dept.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{dept.name}</h2>
                      <p className="text-sm text-slate-500">כיתה {dept.classroom_number || 'לא הוגדר'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => {setEditingDept(dept);setDeptForm({ name: dept.name, icon: dept.icon, classroom: dept.classroom_number || '' });setShowDeptModal(true);}}>
                      <Edit2 className="w-4 h-4 ml-2" />
                      ערוך מדור
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteDeptMutation.mutate(dept.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deptTeams.map((team) =>
                  <Card key={team.id} className="p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => handleOpenAddMembers(team)}>
  <div className="flex items-start justify-between mb-2">
    <div className="flex-1">
      <p className="font-semibold text-slate-800">{team.name}</p>
    </div>
    <div className="flex gap-1">
      <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTeam(team);
                            setTeamForm({ name: team.name, department: team.department_name });
                            setShowTeamModal(true);
                          }}>

        <Edit2 className="w-3 h-3" />
      </Button>
      <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`האם אתה בטוח שברצונך למחוק את הצוות "${team.name}"?`)) {
                              deleteTeamMutation.mutate(team.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700">

        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  </div>
  
  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
    <Users className="w-4 h-4" />
    <span>{team.member_names?.length || 0} צוערים</span>
  </div>

  {team.member_names && team.member_names.length > 0 &&
                    <div className="mt-2 space-y-1">
      {team.member_names.slice(0, 3).map((name, idx) =>
                      <p key={idx} className="text-xs text-slate-500">• {name}</p>
                      )}
      {team.member_names.length > 3 &&
                      <p className="text-xs text-slate-400">ועוד {team.member_names.length - 3}...</p>
                      }
    </div>
                    }
                  </Card>
                  )}
                  
                  <Card className="p-4 border-dashed border-2 flex items-center justify-center cursor-pointer hover:bg-slate-50" onClick={() => {setShowTeamModal(true);setEditingTeam(null);setTeamForm({ name: '', department: dept.name });}}>
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">הוסף צוות</p>
                    </div>
                  </Card>
                </div>
              </Card>);

          })}

          {/* Add Department Card */}
          <Card className="p-6 border-dashed border-2 flex items-center justify-center cursor-pointer hover:bg-slate-50" onClick={() => {setShowDeptModal(true);setEditingDept(null);setDeptForm({ name: '', icon: 'Users', classroom: '' });}}>
            <div className="text-center">
              <Plus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">הוסף מדור</p>
            </div>
          </Card>
        </div>

        {/* Management Sections - Hidden */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 hidden">
          {/* Departments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">מדורים</h2>
              <Button onClick={() => {setShowDeptModal(true);setEditingDept(null);setDeptForm({ name: '', icon: 'Users', classroom: '' });}} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף מדור
              </Button>
            </div>
            <div className="space-y-2">
              {departments.map((dept) =>
              <div key={dept.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-800">{dept.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => {setEditingDept(dept);setDeptForm({ name: dept.name, icon: dept.icon, classroom: dept.classroom_number || '' });setShowDeptModal(true);}}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDeptMutation.mutate(dept.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Teams */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">צוותים</h2>
              <Button onClick={() => {setShowTeamModal(true);setEditingTeam(null);setTeamForm({ name: '', department: '' });}} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף צוות
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teams.map((team) =>
              <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{team.name}</p>
                    <p className="text-sm text-slate-500">{team.department_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => {
                    setEditingTeam(team);
                    setTeamForm({ name: team.name, department: team.department_name });
                    setShowTeamModal(true);
                  }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTeamMutation.mutate(team.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* User List */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">רשימת צוערים</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getDisplayedUsers().map((u) =>
            <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{u.onboarding_full_name || u.full_name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  {u.hackalon_team &&
                <p className="text-sm text-green-600 mt-1">✓ {u.hackalon_department} • {u.hackalon_team}</p>
                }
                </div>
                <Button size="sm" onClick={() => {setSelectedUserForAssign(u);setShowUserAssignModal(true);}}>
                  {u.hackalon_team ? 'שנה צוות' : 'שבץ לצוות'}
                </Button>
              </div>
            )}
            {getDisplayedUsers().length === 0 &&
            <p className="text-center text-slate-400 py-8">אין משתמשים להצגה</p>
            }
          </div>
        </Card>

        {/* Department Modal */}
        <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-right">{editingDept ? 'ערוך מדור' : 'הוסף מדור'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם המדור</Label>
                <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="הזן שם מדור" />
              </div>
              <div>
                <Label>מספר כיתה</Label>
                <select value={deptForm.classroom} onChange={(e) => setDeptForm({ ...deptForm, classroom: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  <option value="">בחר כיתה...</option>
                  {classroomKeys.map((key) => <option key={key.id} value={key.room_number}>כיתה {key.room_number} ({key.room_type})</option>)}
                </select>
              </div>
              <div>
                <Label>אייקון</Label>
                <select value={deptForm.icon} onChange={(e) => setDeptForm({ ...deptForm, icon: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  <option value="Users">Users - 👥</option>
                  <option value="Briefcase">Briefcase - 💼</option>
                  <option value="Target">Target - 🎯</option>
                  <option value="Lightbulb">Lightbulb - 💡</option>
                  <option value="Zap">Zap - ⚡</option>
                  <option value="Star">Star - ⭐</option>
                  <option value="Award">Award - 🏆</option>
                  <option value="Heart">Heart - ❤️</option>
                  <option value="Rocket">Rocket - 🚀</option>
                  <option value="Code">Code - 💻</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveDept} disabled={!deptForm.name.trim()} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowDeptModal(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Team Modal */}
        <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingTeam ? 'ערוך צוות' : 'הוסף צוות'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם הצוות</Label>
                <Input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} placeholder="הזן שם צוות" />
              </div>
              <div>
                <Label>מדור</Label>
                <select value={teamForm.department} onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  <option value="">בחר מדור...</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name} - כיתה {d.classroom_number}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTeam} disabled={!teamForm.name.trim() || !teamForm.department} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowTeamModal(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Assignment Modal */}
        <Dialog open={showUserAssignModal} onOpenChange={setShowUserAssignModal}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>שבץ לצוות - {selectedUserForAssign?.onboarding_full_name || selectedUserForAssign?.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {departments.map((dept) => {
                const deptTeams = teams.filter((t) => t.department_name === dept.name);
                return (
                  <div key={dept.id} className="border rounded-lg p-3">
                    <h3 className="font-semibold text-slate-800 mb-2">{dept.name}</h3>
                    <div className="space-y-1">
                      {deptTeams.map((team) =>
                      <Button
                        key={team.id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleAssignUserToTeam(team.id, team.name, dept.name)}>

                          {team.name}
                        </Button>
                      )}
                    </div>
                  </div>);

              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Members Modal */}
        <Dialog open={showAddMembersModal} onOpenChange={setShowAddMembersModal}>
          <DialogContent dir="rtl" className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-right">הוספת צוערים - {selectedTeam?.name}</DialogTitle>
            </DialogHeader>
            
            {selectedTeam &&
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {/* Current Members */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-700 mb-2">צוערים בצוות ({selectedTeam.member_names?.length || 0})</h3>
                  {selectedTeam.member_names && selectedTeam.member_names.length > 0 ?
                <div className="flex flex-wrap gap-2">
                      {selectedTeam.member_names.map((name, idx) =>
                  <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                          <span className="text-sm">{name}</span>
                          <button onClick={() => handleRemoveMember(selectedTeam.id, name)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                  )}
                    </div> :

                <p className="text-sm text-slate-400">אין צוערים עדיין</p>
                }
                </div>

                {/* Search Existing Users */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <h3 className="font-semibold text-slate-700 mb-2">הוסף צוער קיים</h3>
                  <Input
                  placeholder="חפש לפי שם או אימייל..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2" />

                  <div className="space-y-2 overflow-y-auto flex-1">
                    {filteredUsers.
                  filter((u) => !selectedTeam.member_names?.includes(u.onboarding_full_name || u.full_name)).
                  map((u) =>
                  <div key={u.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{u.onboarding_full_name || u.full_name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <Button size="sm" onClick={() => handleAddExistingUser(u)}>הוסף</Button>
                        </div>
                  )}
                  </div>
                </div>

                {/* Add New Member */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-700 mb-2">הוסף צוער שעדיין לא נרשם</h3>
                  <div className="flex gap-2">
                    <Input
                    placeholder="שם מלא"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)} />

                    <Button onClick={handleAddNewMember} disabled={!newMemberName.trim()}>הוסף</Button>
                  </div>
                </div>
              </div>
            }
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}