import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Plus, Key, Trash2, Edit2, Monitor } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageKeys() {
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ room_number: '', room_type: 'צוותי', has_computers: false });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list()
  });

  const { data: todayLessons = [] } = useQuery({
    queryKey: ['today-lessons'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Lesson.filter({ date: today, status: 'assigned' });
    }
  });

  // Get current key holder for a room
  const getCurrentHolder = (roomNumber) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const currentLesson = todayLessons.find(lesson => 
      lesson.assigned_key === roomNumber &&
      lesson.start_time <= currentTime &&
      lesson.end_time > currentTime
    );
    
    return currentLesson ? currentLesson.crew_name : null;
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassroomKey.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowModal(false);
      setFormData({ room_number: '', room_type: 'צוותי', has_computers: false });
      toast.success('מפתח נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassroomKey.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowModal(false);
      setEditingKey(null);
      setFormData({ room_number: '', room_type: 'צוותי', has_computers: false });
      toast.success('מפתח עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassroomKey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      toast.success('מפתח נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (editingKey) {
      updateMutation.mutate({ id: editingKey.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, status: 'available' });
    }
  };

  const handleEdit = (key) => {
    setEditingKey(key);
    setFormData({ room_number: key.room_number, room_type: key.room_type, has_computers: key.has_computers || false });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingKey(null);
    setFormData({ room_number: '', room_type: 'צוותי', has_computers: false });
  };

  const smallCount = keys.filter((k) => k.room_type === 'צוותי').length;
  const largeCount = keys.filter((k) => k.room_type === 'פלוגתי').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול מפתחות 🗝️
          </h1>
          <p className="text-slate-500">
            הוסף, ערוך או הסר מפתחות כיתות
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-500">סה״כ מפתחות</p>
            <p className="text-2xl font-bold text-slate-800">{keys.length}</p>
          </Card>
          <Card className="p-4 border-blue-200 bg-blue-50/50">
            <p className="text-sm text-blue-600">חדרים צוותיים</p>
            <p className="text-2xl font-bold text-blue-700">{smallCount}</p>
          </Card>
          <Card className="p-4 border-purple-200 bg-purple-50/50">
            <p className="text-sm text-purple-600">חדרים פלוגתיים</p>
            <p className="text-2xl font-bold text-purple-700">{largeCount}</p>
          </Card>
        </div>

        {isAdmin &&
        <div className="flex justify-end mb-6">
            <Button
            onClick={() => setShowModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700">

              <Plus className="w-4 h-4 ml-2" />
              הוסף מפתח חדש
            </Button>
          </div>
        }

        {/* Keys Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">מספר חדר</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">סוג</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">מחשבים</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">סטטוס / מחזיק</TableHead>
                {isAdmin && (
                  <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">פעולות</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ?
              <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-400">
                    טוען...
                  </TableCell>
                </TableRow> :
              keys.length === 0 ?
              <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-400">
                    עדיין לא נוספו מפתחות
                  </TableCell>
                </TableRow> :

              keys.map((key) =>
              <TableRow key={key.id} className="hover:bg-slate-50/50">
                    <TableCell className="p-2 text-center flex items-center justify-center align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] font-medium">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        {key.room_number}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 align-middle text-center [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                      <Badge variant="outline" className={
                  key.room_type === 'פלוגתי' ?
                  'border-purple-300 text-purple-700' :
                  'border-blue-300 text-blue-700'
                  }>
                        {key.room_type === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-cente my-3 p-2 text-center t te tex texx text align-middle flex items-center justify-center [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                      {key.has_computers ?
                  <Monitor className="w-4 h-4 text-blue-600" /> :

                  <span className="text-slate-300">—</span>
                  }
                    </TableCell>
                    <TableCell className="p-2 align-middle text-center [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                      {(() => {
                        const holder = getCurrentHolder(key.room_number);
                        return holder ? (
                          <div className="flex flex-col items-center gap-1">
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              תפוס
                            </Badge>
                            <span className="text-xs text-slate-600">{holder}</span>
                          </div>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            זמין
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(key)}
                            className="text-slate-400 hover:text-slate-600">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(key.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex flex-row-reverse items-center gap-2 justify-end">
 
  {editingKey ? 'ערוך מפתח' : 'הוסף מפתח חדש'}
  <div className="p-2 bg-emerald-100 rounded-lg">

    <Key className="w-5 h-5 text-emerald-600" />
    </div>

            </DialogTitle>
            <DialogDescription className="text-right">
              {editingKey ? 'עדכן את פרטי המפתח' : 'הוסף מפתח חדש למעקב'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-right block">מספר חדר</Label>
              <Input
                placeholder="למשל, 101..."
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="text-right" />

            </div>

            <div className="space-y-2">
  <Label className="text-right block">סוג חדר</Label>
  <Select
                value={formData.room_type}
                onValueChange={(value) => setFormData({ ...formData, room_type: value })}>

    <SelectTrigger className="text-right" dir="rtl">
      <SelectValue className="text-right" />
    </SelectTrigger>
    <SelectContent align="end" dir="rtl">
      <SelectItem value="צוותי">צוותי 🏠</SelectItem>
      <SelectItem value="פלוגתי">פלוגתי 🏢</SelectItem>
    </SelectContent>
  </Select>
            </div>

            <div className="flex flex-row-reverse items-center gap-2 justify-end">
              <Label htmlFor="has_computers" className="cursor-pointer">
                יש מחשב בכיתה 💻
              </Label>
              <Checkbox
                id="has_computers"
                checked={formData.has_computers}
                onCheckedChange={(checked) =>
                setFormData({ ...formData, has_computers: checked })
                } />

            </div>
          </div>

          <div className="flex flex-row-reverse gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.room_number}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700">

              {editingKey ? 'עדכן מפתח' : 'הוסף מפתח'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}