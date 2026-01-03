import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Edit, Trash2, Loader2, Target, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HackalonSchedule() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    event_type: 'event'
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: scheduleItems = [], isLoading } = useQuery({
    queryKey: ['hackalon-schedule'],
    queryFn: () => base44.entities.HackalonScheduleItem.list('date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonScheduleItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      toast.success('נוסף בהצלחה');
      handleCloseModal();
    },
    onError: () => {
      toast.error('שגיאה בהוספה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonScheduleItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      toast.success('עודכן בהצלחה');
      handleCloseModal();
    },
    onError: () => {
      toast.error('שגיאה בעדכון');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HackalonScheduleItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      toast.success('נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקה');
    }
  });

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        date: item.date,
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        event_type: item.event_type || 'event'
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        event_type: 'event'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      date: '',
      start_time: '',
      end_time: '',
      event_type: 'event'
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (item) => {
    if (confirm(`האם למחוק את "${item.title}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const getEventTypeConfig = (type) => {
    switch (type) {
      case 'milestone':
        return { label: 'אבן דרך', color: 'bg-purple-100 text-purple-700', icon: Target };
      case 'deadline':
        return { label: 'דדליין', color: 'bg-red-100 text-red-700', icon: AlertCircle };
      default:
        return { label: 'אירוע', color: 'bg-blue-100 text-blue-700', icon: Calendar };
    }
  };

  // Group items by date
  const groupedItems = scheduleItems.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedItems).sort();

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                📅 לוח זמנים HackAlon
              </h1>
              <p className="text-slate-500">מעקב אחר אירועים, דדליינים ואבני דרך</p>
            </div>
            {isAdmin && (
              <Button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 ml-2" />
                הוסף אירוע
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">אירועים</p>
            <p className="text-2xl font-bold text-blue-700">
              {scheduleItems.filter(i => i.event_type === 'event').length}
            </p>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-sm text-purple-600">אבני דרך</p>
            <p className="text-2xl font-bold text-purple-700">
              {scheduleItems.filter(i => i.event_type === 'milestone').length}
            </p>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-600">דדליינים</p>
            <p className="text-2xl font-bold text-red-700">
              {scheduleItems.filter(i => i.event_type === 'deadline').length}
            </p>
          </Card>
        </div>

        {/* Schedule Items */}
        {sortedDates.length > 0 ? (
          <div className="space-y-6">
            {sortedDates.map((date, index) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {format(new Date(date), 'EEEE, dd/MM/yyyy')}
                  </h3>
                </div>
                <div className="space-y-3">
                  {groupedItems[date].map((item) => {
                    const typeConfig = getEventTypeConfig(item.event_type);
                    const TypeIcon = typeConfig.icon;
                    return (
                      <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={typeConfig.color}>
                                <TypeIcon className="w-3 h-3 ml-1" />
                                {typeConfig.label}
                              </Badge>
                              {item.start_time && (
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                  <Clock className="w-4 h-4" />
                                  {item.start_time}
                                  {item.end_time && ` - ${item.end_time}`}
                                </div>
                              )}
                            </div>
                            <h4 className="text-lg font-semibold text-slate-800 mb-1">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-slate-600 text-sm whitespace-pre-wrap">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2 mr-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(item)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">אין אירועים עדיין</h3>
            <p className="text-slate-400 mb-4">לוח הזמנים ריק</p>
            {isAdmin && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף אירוע ראשון
              </Button>
            )}
          </Card>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'ערוך אירוע' : 'הוסף אירוע חדש'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>כותרת *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="לדוגמה: הגשת מסמך איפיון"
                />
              </div>
              
              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="פרטים נוספים על האירוע..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>תאריך *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>סוג אירוע</Label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="event">אירוע</option>
                    <option value="milestone">אבן דרך</option>
                    <option value="deadline">דדליין</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>שעת התחלה</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>שעת סיום</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  ביטול
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingItem ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}