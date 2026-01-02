import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Users, Edit2, Mail, Shield, User, Briefcase, Trash2, X, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageUsers() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({ squad_name: '', platoon_name: '', positions: [], role: 'user', phone_number: '', full_name: '', onboarding_full_name: '' });
  const [newPosition, setNewPosition] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    squad: '',
    platoon: '',
    position: ''
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list('order'),
    enabled: isAdmin
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list('order'),
    enabled: isAdmin
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setEditingUser(null);
      setFormData({ squad_name: '', platoon_name: '', positions: [], role: 'user', phone_number: '', full_name: '', onboarding_full_name: '' });
      setNewPosition('');
      toast.success('פרטי משתמש עודכנו בהצלחה');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('משתמש נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: formData });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      squad_name: user.squad_name || '',
      platoon_name: user.platoon_name || '',
      positions: user.positions || (user.position ? [user.position] : []),
      role: user.role || 'user',
      phone_number: user.phone_number || '',
      full_name: user.full_name || '',
      onboarding_full_name: user.onboarding_full_name || user.full_name || ''
    });
    setNewPosition('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ squad_name: '', platoon_name: '', positions: [], role: 'user', phone_number: '' });
    setNewPosition('');
  };

  const handleAddPosition = () => {
    if (newPosition && !formData.positions.includes(newPosition)) {
      setFormData({ ...formData, positions: [...formData.positions, newPosition] });
      setNewPosition('');
    }
  };

  const handleRemovePosition = (positionToRemove) => {
    setFormData({
      ...formData,
      positions: formData.positions.filter(p => p !== positionToRemove)
    });
  };

  // Predefined platoon names
  const platoonNames = [
    'פלוגה א - סהר',
    'פלוגה ב - יפתח',
    'פלוגה ג - אייל',
    'פלוגה ד - אסף',
    'פלוגה ה - איתן'
  ];

  const positionTitles = positions.map(p => p.title);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchName = !filters.name || 
      (user.full_name && user.full_name.toLowerCase().includes(filters.name.toLowerCase()));
    
    const matchEmail = !filters.email || 
      (user.email && user.email.toLowerCase().includes(filters.email.toLowerCase()));
    
    const matchRole = !filters.role || user.role === filters.role;
    
    const matchSquad = !filters.squad || user.squad_name === filters.squad;
    
    const matchPlatoon = !filters.platoon || user.platoon_name === filters.platoon;
    
    const matchPosition = !filters.position || 
      (user.positions && user.positions.includes(filters.position));
    
    return matchName && matchEmail && matchRole && matchSquad && matchPlatoon && matchPosition;
  });

  // Group users by platoon
  const usersByPlatoon = users.reduce((acc, user) => {
    const platoon = user.platoon_name || 'ללא פלוגה';
    if (!acc[platoon]) acc[platoon] = [];
    acc[platoon].push(user);
    return acc;
  }, {});

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">גישה מוגבלת</h2>
          <p className="text-slate-500">רק מנהלים יכולים לגשת לדף זה</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול משתמשים 👤
          </h1>
          <p className="text-slate-500">עדכן פרטים של משתמשים - פלוגה ותפקיד</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-500">סה״כ משתמשים</p>
            <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          </Card>
          {Object.entries(usersByPlatoon).map(([platoon, platoonUsers]) => (
            <Card key={platoon} className="p-4 border-slate-200">
              <p className="text-sm text-slate-500">{platoon}</p>
              <p className="text-2xl font-bold text-slate-800">{platoonUsers.length}</p>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>שם מלא</span>
                    <Input
                      placeholder="סנן..."
                      value={filters.name}
                      onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>אימייל</span>
                    <Input
                      placeholder="סנן..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <span>טלפון</span>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>תפקיד במערכת</span>
                    <select
                      value={filters.role}
                      onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                      className="h-8 text-sm px-2 border border-slate-300 rounded-md text-right"
                    >
                      <option value="">הכל</option>
                      <option value="admin">מנהל</option>
                      <option value="user">משתמש</option>
                    </select>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>צוות</span>
                    <select
                      value={filters.squad || ''}
                      onChange={(e) => setFilters({ ...filters, squad: e.target.value })}
                      className="h-8 text-sm px-2 border border-slate-300 rounded-md text-right"
                    >
                      <option value="">הכל</option>
                      {squads.map((squad) => (
                        <option key={squad.id} value={squad.squad_number}>{squad.squad_number}</option>
                      ))}
                    </select>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>פלוגה</span>
                    <select
                      value={filters.platoon}
                      onChange={(e) => setFilters({ ...filters, platoon: e.target.value })}
                      className="h-8 text-sm px-2 border border-slate-300 rounded-md text-right"
                    >
                      <option value="">הכל</option>
                      {platoonNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col gap-2">
                    <span>תפקיד</span>
                    <select
                      value={filters.position}
                      onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                      className="h-8 text-sm px-2 border border-slate-300 rounded-md text-right"
                    >
                      <option value="">הכל</option>
                      {positionTitles.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                </TableHead>
                <TableHead className="text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    טוען...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    אין משתמשים מתאימים לסינון
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 [&_td]:text-center">
                    <TableCell className="font-medium text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span className="font-semibold">{user.onboarding_full_name || user.full_name || 'ללא שם'}</span>
                        {user.onboarding_completed && (
                          <span className="text-xs text-green-600">✓ הושלם</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {user.phone_number || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <Shield className="w-3 h-3" />
                          מנהל
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          משתמש
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {user.squad_name ? (
                        <span className="font-medium">{user.squad_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {user.platoon_name ? (
                        <span className="font-medium">{user.platoon_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {(user.positions && user.positions.length > 0) ? (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {user.positions.map((pos, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                              <Briefcase className="w-3 h-3" />
                              {pos}
                            </span>
                          ))}
                        </div>
                      ) : user.position ? (
                        <div className="flex items-center justify-center gap-2">
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          <span>{user.position}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex flex-row-reverse items-center gap-2 justify-end">
              עדכן פרטי משתמש
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </DialogTitle>
            <DialogDescription className="text-right">
              {editingUser?.full_name} - {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-right block">שם מלא</Label>
              <Input
                value={formData.onboarding_full_name}
                onChange={(e) => setFormData({ ...formData, onboarding_full_name: e.target.value, full_name: e.target.value })}
                className="text-right"
                placeholder="הזן שם מלא"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block">תפקיד במערכת</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right"
              >
                <option value="user">משתמש</option>
                <option value="admin">מנהל</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">צוות</Label>
              <select
                value={formData.squad_name}
                onChange={(e) => {
                  const selectedSquad = squads.find(s => s.squad_number === e.target.value);
                  setFormData({ 
                    ...formData, 
                    squad_name: e.target.value,
                    platoon_name: selectedSquad?.platoon_name || ''
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right"
              >
                <option value="">בחר צוות...</option>
                {squads.map((squad) => (
                  <option key={squad.id} value={squad.squad_number}>
                    {squad.squad_number} {squad.platoon_name ? `(${squad.platoon_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">פלוגה</Label>
              <select
                value={formData.platoon_name}
                onChange={(e) => setFormData({ ...formData, platoon_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right"
              >
                <option value="">בחר פלוגה...</option>
                {platoonNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">מספר טלפון</Label>
              <Input
                type="tel"
                placeholder="05X-XXXXXXX"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block text-base font-semibold">ניהול תפקידים</Label>
              
              {/* Display current positions */}
              <div className="p-3 border-2 border-slate-200 rounded-lg bg-white min-h-[60px]">
                {formData.positions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.positions.map((pos, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-600 transition-colors">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>{pos}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePosition(pos)}
                          className="hover:bg-blue-700 rounded-full p-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    אין תפקידים מוקצים
                  </div>
                )}
              </div>

              {/* Add new position */}
              <div className="flex gap-2 pt-2">
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="flex-1 px-3 py-2.5 border-2 border-slate-300 rounded-lg text-right text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                >
                  <option value="">בחר תפקיד להוספה...</option>
                  {positionTitles
                    .filter(pos => !formData.positions.includes(pos))
                    .map((pos) => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                </select>
                <Button
                  type="button"
                  onClick={handleAddPosition}
                  disabled={!newPosition}
                  className="px-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300"
                  size="default"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-row-reverse gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              שמור שינויים
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}