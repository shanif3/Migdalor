import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Plus, Users, Trash2, Edit2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageCrews() {
  const [showModal, setShowModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: '', notes: '' });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Crew.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setFormData({ name: '', contact: '', notes: '' });
      toast.success('צוות נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Crew.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setEditingCrew(null);
      setFormData({ name: '', contact: '', notes: '' });
      toast.success('צוות עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Crew.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success('צוות נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (editingCrew) {
      updateMutation.mutate({ id: editingCrew.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (crew) => {
    setEditingCrew(crew);
    setFormData({ name: crew.name, contact: crew.contact || '', notes: crew.notes || '' });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingCrew(null);
    setFormData({ name: '', contact: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול צוותים 👥
          </h1>
          <p className="text-slate-500">
            הוסף ונהל צוותים שמשתמשים במפתחות כיתות
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <Card className="p-4 border-slate-200 inline-block">
            <p className="text-sm text-slate-500">סה״כ צוותים</p>
            <p className="text-2xl font-bold text-slate-800">{crews.length}</p>
          </Card>
        </div>

        {/* Add Button */}
        {isAdmin && (
          <div className="flex justify-end mb-6">
            <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 ml-2" />
              הוסף צוות חדש
            </Button>
          </div>
        )}

        {/* Crews Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
            <TableRow className="bg-slate-50">
                <TableHead className="text-muted-foreground mx-64 my-8 px-2 font-medium text-left h-10 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">שם הצוות</TableHead>
                <TableHead className="text-center">איש קשר</TableHead>
                <TableHead className="text-center">הערות</TableHead>
                <TableHead className="text-center">פעולות</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ?
              <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    טוען...
                  </TableCell>
                </TableRow> :
              crews.length === 0 ?
              <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    עדיין לא נוספו צוותים
                  </TableCell>
                </TableRow> :

              crews.map((crew) =>
              <TableRow key={crew.id} className="hover:bg-slate-50/50" className="[&_td]:text-center">

                    <TableCell className="font-medium text-center">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        {crew.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {crew.contact ?
                  <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="mx-20 lucide lucide-phone w-3 h-3" />
                          {crew.contact}
                        </div> :

                  <span className="text-slate-400">—</span>
                  }
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {crew.notes || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {isAdmin && (
                        <div className="flex justify-end gap-2">
                          <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(crew)}
                        className="text-slate-400 hover:text-slate-600">

                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(crew.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50">

                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              {editingCrew ? 'ערוך צוות' : 'הוסף צוות חדש'}
            </DialogTitle>
            <DialogDescription>
              {editingCrew ? 'עדכן את פרטי הצוות' : 'הוסף צוות חדש למעקב'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם הצוות</Label>
              <Input
                placeholder="למשל, צוות אלפא, משמרת בוקר..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

            </div>

            <div className="space-y-2">
              <Label>איש קשר (אופציונלי)</Label>
              <Input
                placeholder="טלפון או אימייל..."
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />

            </div>

            <div className="space-y-2">
              <Label>הערות (אופציונלי)</Label>
              <Textarea
                placeholder="מידע נוסף..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20" />

            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700">

              {editingCrew ? 'עדכן צוות' : 'הוסף צוות'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}