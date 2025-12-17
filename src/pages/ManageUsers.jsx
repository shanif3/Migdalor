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
import { Users, Edit2, Mail, Shield, User, Briefcase, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageUsers() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({ platoon_name: '', position: '' });
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

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setEditingUser(null);
      setFormData({ platoon_name: '', position: '' });
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
      platoon_name: user.platoon_name || '',
      position: user.position || ''
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ platoon_name: '', position: '' });
  };

  // Predefined platoon names and positions
  const platoonNames = [
    'פלוגה א - סהר',
    'פלוגה ב - יפתח',
    'פלוגה ג - אייל',
    'פלוגה ד - אסף',
    'פלוגה ה - איתן'
  ];

  const positions = [
    'קה״ד צוותי',
    'קה״ד פלוגתי'
  ];

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
                <TableHead className="text-center">משתמש</TableHead>
                <TableHead className="text-center">אימייל</TableHead>
                <TableHead className="text-center">תפקיד במערכת</TableHead>
                <TableHead className="text-center">פלוגה</TableHead>
                <TableHead className="text-center">תפקיד</TableHead>
                <TableHead className="text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    טוען...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    אין משתמשים
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50 [&_td]:text-center">
                    <TableCell className="font-medium text-center">
                      <div className="flex flex-row-reverse items-center justify-center gap-2">
                        <span>{user.full_name || 'ללא שם'}</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
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
                      {user.platoon_name ? (
                        <span className="font-medium">{user.platoon_name}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {user.position ? (
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
              <Label className="text-right block">תפקיד</Label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right"
              >
                <option value="">בחר תפקיד...</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
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