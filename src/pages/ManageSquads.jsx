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
import { Plus, Users, Trash2, Edit2, Phone, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManageSquads() {
  const [showModal, setShowModal] = useState(false);
  const [editingSquad, setEditingSquad] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ squad_number: '', platoon_name: '', contact: '', notes: '' });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ['squads'],
    queryFn: async () => {
      const data = await base44.entities.Squad.list();
      return data.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Squad.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      setShowModal(false);
      setFormData({ squad_number: '', platoon_name: '', contact: '', notes: '' });
      toast.success('צוות נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Squad.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      setShowModal(false);
      setEditingSquad(null);
      setFormData({ squad_number: '', platoon_name: '', contact: '', notes: '' });
      toast.success('צוות עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Squad.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      toast.success('צוות נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (editingSquad) {
      updateMutation.mutate({ id: editingSquad.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (squad) => {
    setEditingSquad(squad);
    setFormData({
      squad_number: squad.squad_number,
      platoon_name: squad.platoon_name,
      contact: squad.contact || '',
      notes: squad.notes || ''
    });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingSquad(null);
    setFormData({ squad_number: '', platoon_name: '', contact: '', notes: '' });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination || !isAdmin) return;

    const items = Array.from(squads);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all items
    const updates = items.map((item, index) => 
      base44.entities.Squad.update(item.id, { order: index })
    );
    
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['squads'] });
    toast.success('הסדר עודכן');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול צוותים 👥
          </h1>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <Card className="p-4 border-slate-200 inline-block">
            <p className="text-sm text-slate-500">סה״כ צוותים</p>
            <p className="text-2xl font-bold text-slate-800">{squads.length}</p>
          </Card>
        </div>

        {/* Add Button */}
        {isAdmin && (
          <div className="flex justify-end mb-6">
            <Button onClick={() => setShowModal(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 ml-2" />
              הוסף צוות חדש
            </Button>
          </div>
        )}

        {/* Squads Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {isAdmin && <TableHead className="w-12"></TableHead>}
                <TableHead className="text-center">מספר צוות</TableHead>
                <TableHead className="text-center">פלוגה</TableHead>
                <TableHead className="text-center">איש קשר</TableHead>
                <TableHead className="text-center">הערות</TableHead>
                {isAdmin && <TableHead className="text-center">פעולות</TableHead>}
              </TableRow>
            </TableHeader>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="squads">
                {(provided) => (
                  <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8 text-slate-400">
                          טוען...
                        </TableCell>
                      </TableRow>
                    ) : squads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 6 : 4} className="text-center py-8 text-slate-400">
                          עדיין לא נוספו צוותים
                        </TableCell>
                      </TableRow>
                    ) : (
                      squads.map((squad, index) => (
                        <Draggable key={squad.id} draggableId={squad.id} index={index} isDragDisabled={!isAdmin}>
                          {(provided, snapshot) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`hover:bg-slate-50/50 [&_td]:text-center ${snapshot.isDragging ? 'bg-slate-100' : ''}`}
                            >
                              {isAdmin && (
                                <TableCell {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-slate-400 mx-auto" />
                                </TableCell>
                              )}
                              <TableCell className="font-medium text-center">
                                <div className="flex flex-row-reverse items-center justify-between gap-2">
                                  <span className="flex-1 text-center">{squad.squad_number}</span>
                                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-4 h-4 text-teal-600" />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-slate-600">
                                {squad.platoon_name}
                              </TableCell>
                              <TableCell className="text-center">
                                {squad.contact ? (
                                  <a
                                    href={`tel:${squad.contact}`}
                                    className="flex flex-row-reverse items-center justify-center gap-2 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                                  >
                                    <Phone className="w-4 h-4" />
                                    <span dir="ltr">{squad.contact}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-500 max-w-xs truncate">
                                {squad.notes || '—'}
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-center">
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(squad)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteMutation.mutate(squad.id)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </TableBody>
                )}
              </Droppable>
            </DragDropContext>
          </Table>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex flex-row-reverse items-center gap-2 justify-end">
              {editingSquad ? 'ערוך צוות' : 'הוסף צוות חדש'}
              <div className="p-2 bg-teal-100 rounded-lg">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
            </DialogTitle>
            <DialogDescription className="text-right">
              {editingSquad ? 'עדכן את פרטי הצוות' : 'הוסף צוות חדש למעקב'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-right block">מספר צוות</Label>
              <Input
                placeholder="למשל, צוות 5..."
                value={formData.squad_number}
                onChange={(e) => setFormData({ ...formData, squad_number: e.target.value })}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block">פלוגה</Label>
              <Input
                placeholder="למשל, פלוגת יפתח..."
                value={formData.platoon_name}
                onChange={(e) => setFormData({ ...formData, platoon_name: e.target.value })}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block">טלפון איש קשר (אופציונלי)</Label>
              <Input
                type="tel"
                placeholder="+972.."
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-right block">הערות (אופציונלי)</Label>
              <Textarea
                placeholder="שם קה״ד צוותי"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20 text-right"
              />
            </div>
          </div>

          <div className="flex flex-row-reverse gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.squad_number || !formData.platoon_name}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {editingSquad ? 'עדכן צוות' : 'הוסף צוות'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}