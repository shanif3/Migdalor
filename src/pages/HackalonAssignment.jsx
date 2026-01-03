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
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', department: '', classroom: '' });
  const [userAssignment, setUserAssignment] = useState({ department: '', team: '' });

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

  // Department mutations
  const createDeptMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonDepartment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
      setShowDeptModal(false);
      setDeptName('');
      toast.success('המדור נוצר בהצלחה');
    }
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonDepartment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
      setShowDeptModal(false);
      setEditingDept(null);
      setDeptName('');
      toast.success('המדור עודכן בהצלחה');
    }
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id) => base44.entities.HackalonDepartment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-departments'] });
      toast.success('המדור נמחק בהצלחה');
    }
  });

  // Team mutations
  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonTeam.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      setShowTeamModal(false);
      setTeamForm({ name: '', department: '', classroom: '' });
      toast.success('הצוות נוצר בהצלחה');
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      setShowTeamModal(false);
      setEditingTeam(null);
      setTeamForm({ name: '', department: '', classroom: '' });
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

  // User assignment mutation
  const assignUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowUserModal(false);
      setSelectedUser(null);
      setUserAssignment({ department: '', team: '' });
      toast.success('השיבוץ בוצע בהצלחה');
    }
  });

  const handleSaveDept = () => {
    if (!deptName.trim()) return;
    
    if (editingDept) {
      updateDeptMutation.mutate({ id: editingDept.id, data: { name: deptName } });
    } else {
      createDeptMutation.mutate({ name: deptName });
    }
  };

  const handleSaveTeam = () => {
    if (!teamForm.name.trim() || !teamForm.department) return;
    
    const data = {
      name: teamForm.name,
      department_name: teamForm.department,
      classroom_number: teamForm.classroom
    };

    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const handleAssignUser = () => {
    if (!selectedUser || !userAssignment.department || !userAssignment.team) return;
    
    assignUserMutation.mutate({
      userId: selectedUser.id,
      data: {
        hackalon_department: userAssignment.department,
        hackalon_team: userAssignment.team
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-600">רק מנהלי מערכת יכולים לשבץ צוערים</p>
        </Card>
      </div>
    );
  }

  const assignedUsers = users.filter(u => u.hackalon_team);
  const unassignedUsers = users.filter(u => !u.hackalon_team);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            📋 שיבוץ צוערים ל-HackAlon
          </h1>
          <p className="text-slate-500">ניהול מדורים, צוותים ושיבוץ צוערים</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">משתמשים משובצים</p>
            <p className="text-2xl font-bold text-slate-800">{assignedUsers.length}</p>
          </Card>
          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-orange-600">ממתינים לשיבוץ</p>
            <p className="text-2xl font-bold text-orange-700">{unassignedUsers.length}</p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">סה״כ צוותים</p>
            <p className="text-2xl font-bold text-blue-700">{teams.length}</p>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Departments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">מדורים</h2>
              <Button onClick={() => { setShowDeptModal(true); setEditingDept(null); setDeptName(''); }} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף מדור
              </Button>
            </div>
            <div className="space-y-2">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-800">{dept.name}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingDept(dept); setDeptName(dept.name); setShowDeptModal(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDeptMutation.mutate(dept.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Teams */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">צוותים</h2>
              <Button onClick={() => { setShowTeamModal(true); setEditingTeam(null); setTeamForm({ name: '', department: '', classroom: '' }); }} size="sm">
                <Plus className="w-4 h-4 ml-2" />
                הוסף צוות
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{team.name}</p>
                    <p className="text-sm text-slate-500">{team.department_name} • כיתה {team.classroom_number || 'לא הוגדר'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { 
                      setEditingTeam(team); 
                      setTeamForm({ name: team.name, department: team.department_name, classroom: team.classroom_number || '' }); 
                      setShowTeamModal(true); 
                    }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteTeamMutation.mutate(team.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* User Assignment */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">שיבוץ צוערים</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-800">{u.onboarding_full_name || u.full_name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  {u.hackalon_team && (
                    <p className="text-sm text-green-600 mt-1">✓ {u.hackalon_department} • {u.hackalon_team}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => {
                  setSelectedUser(u);
                  setUserAssignment({ department: u.hackalon_department || '', team: u.hackalon_team || '' });
                  setShowUserModal(true);
                }}>
                  {u.hackalon_team ? 'ערוך שיבוץ' : 'שבץ'}
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Department Modal */}
        <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingDept ? 'ערוך מדור' : 'הוסף מדור'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>שם המדור</Label>
                <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="הזן שם מדור" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveDept} disabled={!deptName.trim()} className="flex-1">שמור</Button>
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
                <Input value={teamForm.name} onChange={(e) => setTeamForm({...teamForm, name: e.target.value})} placeholder="הזן שם צוות" />
              </div>
              <div>
                <Label>מדור</Label>
                <select value={teamForm.department} onChange={(e) => setTeamForm({...teamForm, department: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  <option value="">בחר מדור...</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <Label>מספר כיתה</Label>
                <Input value={teamForm.classroom} onChange={(e) => setTeamForm({...teamForm, classroom: e.target.value})} placeholder="מספר כיתה" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTeam} disabled={!teamForm.name.trim() || !teamForm.department} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowTeamModal(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Assignment Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>שיבוץ צוער</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <p className="text-slate-600">{selectedUser.onboarding_full_name || selectedUser.full_name}</p>
                <div>
                  <Label>מדור</Label>
                  <select value={userAssignment.department} onChange={(e) => setUserAssignment({...userAssignment, department: e.target.value, team: ''})} className="w-full px-3 py-2 border rounded-md">
                    <option value="">בחר מדור...</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>צוות</Label>
                  <select value={userAssignment.team} onChange={(e) => setUserAssignment({...userAssignment, team: e.target.value})} className="w-full px-3 py-2 border rounded-md" disabled={!userAssignment.department}>
                    <option value="">בחר צוות...</option>
                    {teams.filter(t => t.department_name === userAssignment.department).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAssignUser} disabled={!userAssignment.department || !userAssignment.team} className="flex-1">שבץ</Button>
                  <Button variant="outline" onClick={() => setShowUserModal(false)} className="flex-1">ביטול</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}