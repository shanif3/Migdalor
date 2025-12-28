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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MapPin, Plus, Edit2, Trash2, GripVertical, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManageZones() {
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: () => base44.entities.Zone.list('order'),
    enabled: isAdmin
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Zone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setShowModal(false);
      setFormData({ name: '' });
      toast.success('אזור נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Zone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      setShowModal(false);
      setEditingZone(null);
      setFormData({ name: '' });
      toast.success('אזור עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Zone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] });
      toast.success('אזור נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('אנא הזן שם אזור');
      return;
    }

    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, order: zones.length });
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({ name: zone.name });
    setShowModal(true);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(zones);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all items
    for (let i = 0; i < items.length; i++) {
      await base44.entities.Zone.update(items[i].id, { order: i });
    }
    queryClient.invalidateQueries({ queryKey: ['zones'] });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                ניהול אזורים 📍
              </h1>
              <p className="text-slate-500">הגדר אזורים פיזיים למפתחות</p>
            </div>
            <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 ml-2" />
              הוסף אזור
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <Card className="p-4 mb-6">
          <p className="text-sm text-slate-500">סה״כ אזורים</p>
          <p className="text-2xl font-bold text-slate-800">{zones.length}</p>
        </Card>

        {/* Zones Table */}
        <Card className="overflow-hidden border-slate-200">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="zones">
              {(provided) => (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-center w-12"></TableHead>
                      <TableHead className="text-center">שם האזור</TableHead>
                      <TableHead className="text-center">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                          טוען...
                        </TableCell>
                      </TableRow>
                    ) : zones.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                          אין אזורים עדיין
                        </TableCell>
                      </TableRow>
                    ) : (
                      zones.map((zone, index) => (
                        <Draggable key={zone.id} draggableId={zone.id} index={index}>
                          {(provided) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="hover:bg-slate-50/50"
                            >
                              <TableCell className="text-center">
                                <div {...provided.dragHandleProps} className="cursor-move">
                                  <GripVertical className="w-4 h-4 text-slate-400" />
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                <div className="flex items-center justify-center gap-2">
                                  <MapPin className="w-4 h-4 text-slate-400" />
                                  {zone.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(zone)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteMutation.mutate(zone.id)}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </TableBody>
                </Table>
              )}
            </Droppable>
          </DragDropContext>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) {
          setEditingZone(null);
          setFormData({ name: '' });
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex flex-row-reverse items-center gap-2 justify-end">
              {editingZone ? 'ערוך אזור' : 'הוסף אזור'}
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin className="w-5 h-5 text-indigo-600" />
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-right block">שם האזור *</Label>
              <Input
                placeholder="לדוגמה: קומה 1, בניין A..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-right"
              />
            </div>
          </div>

          <div className="flex flex-row-reverse gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {editingZone ? 'עדכן' : 'הוסף'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}