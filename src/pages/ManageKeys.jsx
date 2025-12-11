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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Key, Trash2, Edit2, Monitor } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageKeys() {
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [formData, setFormData] = useState({ room_number: '', room_type: 'צוותי', has_computers: false });
  const queryClient = useQueryClient();

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassroomKey.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowModal(false);
      setFormData({ room_number: '', room_type: 'צוותי', has_computers: false });
      toast.success('מפתח נוסף בהצלחה');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassroomKey.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setShowModal(false);
      setEditingKey(null);
      setFormData({ room_number: '', room_type: 'צוותי', has_computers: false });
      toast.success('מפתח עודכן בהצלחה');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassroomKey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      toast.success('מפתח נמחק בהצלחה');
    },
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

  const smallCount = keys.filter(k => k.room_type === 'צוותי').length;
  const largeCount = keys.filter(k => k.room_type === 'פלוגתי').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
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

        {isAdmin && (
          <div className="flex justify-end mb-6">
            <Button
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף מפתח חדש
            </Button>
          </div>
        )}

        {/* Keys Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>מספר חדר</TableHead>
                <TableHead>סוג</TableHead>
                <TableHead>מחשבים</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>מחזיק נוכחי</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    טוען...
                  </TableCell>
                </TableRow>
              ) : keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    עדיין לא נוספו מפתחות
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((key) => (
                  <TableRow key={key.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        {key.room_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        key.room_type === 'פלוגתי' 
                          ? 'border-purple-300 text-purple-700' 
                          : 'border-blue-300 text-blue-700'
                      }>
                        {key.room_type === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.has_computers ? (
                        <Monitor className="w-4 h-4 text-blue-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        key.status === 'available' 
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      }>
                        {key.status === 'available' ? 'זמין' : 'תפוס'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {key.current_holder || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(key)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(key.id)}
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

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Key className="w-5 h-5 text-emerald-600" />
              </div>
              {editingKey ? 'ערוך מפתח' : 'הוסף מפתח חדש'}
            </DialogTitle>
            <DialogDescription>
              {editingKey ? 'עדכן את פרטי המפתח' : 'הוסף מפתח חדש למעקב'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>מספר חדר</Label>
              <Input
                placeholder="למשל, 101, A-203..."
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>סוג חדר</Label>
              <Select
                value={formData.room_type}
                onValueChange={(value) => setFormData({ ...formData, room_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="צוותי">🏠 צוותי</SelectItem>
                  <SelectItem value="פלוגתי">🏢 פלוגתי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="has_computers"
                checked={formData.has_computers}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, has_computers: checked })
                }
              />
              <Label htmlFor="has_computers" className="cursor-pointer">
                💻 יש מחשבים
              </Label>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.room_number}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {editingKey ? 'עדכן מפתח' : 'הוסף מפתח'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}