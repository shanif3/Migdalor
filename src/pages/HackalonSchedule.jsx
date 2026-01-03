import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Edit2, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { format, addDays, subDays, parseISO } from 'date-fns';

export default function HackalonSchedule() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: selectedDate,
    start_time: '',
    end_time: '',
    event_type: 'פורום מדורי'
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: scheduleItems = [], isLoading } = useQuery({
    queryKey: ['hackalon-schedule', selectedDate],
    queryFn: () => base44.entities.HackalonScheduleItem.filter({ date: selectedDate }, 'start_time'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HackalonScheduleItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      setShowModal(false);
      resetForm();
      toast.success('אירוע נוסף בהצלחה');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonScheduleItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      setShowModal(false);
      resetForm();
      toast.success('אירוע עודכן בהצלחה');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HackalonScheduleItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-schedule'] });
      toast.success('אירוע נמחק בהצלחה');
    }
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.start_time || !formData.end_time) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('שעת הסיום חייבת להיות מאוחרת יותר משעת ההתחלה');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      date: item.date,
      start_time: item.start_time,
      end_time: item.end_time,
      event_type: item.event_type
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      date: selectedDate,
      start_time: '',
      end_time: '',
      event_type: 'פורום מדורי'
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const changeDate = (days) => {
    const newDate = days > 0 
      ? addDays(parseISO(selectedDate), days)
      : subDays(parseISO(selectedDate), Math.abs(days));
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Generate time slots for timeline (6:00 to 23:00)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Calculate event position and height
  const getEventStyle = (startTime, endTime) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinute = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinute = parseInt(endTime.split(':')[1]);

    const startOffset = (startHour - 6) * 60 + startMinute;
    const endOffset = (endHour - 6) * 60 + endMinute;
    const duration = endOffset - startOffset;

    const pixelsPerMinute = 80 / 60; // 80px per hour
    const top = startOffset * pixelsPerMinute;
    const height = duration * pixelsPerMinute;

    return { top: `${top}px`, height: `${height}px` };
  };

  // Event type colors
  const eventTypeColors = {
    'פורום גדודי': 'bg-purple-100 border-purple-200',
    'פורום מדורי': 'bg-blue-100 border-blue-200',
    'הרצאת אורח': 'bg-green-100 border-green-200',
    'מתפללים': 'bg-amber-100 border-amber-200',
    'ארוחה': 'bg-orange-100 border-orange-200'
  };

  const eventTypeIcons = {
    'פורום גדודי': '👥',
    'פורום מדורי': '🏢',
    'הרצאת אורח': '🎤',
    'מתפללים': '🙏',
    'ארוחה': '🍽️'
  };

  // Detect overlapping events
  const getOverlappingEvents = () => {
    const sorted = [...scheduleItems].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const columns = [];

    sorted.forEach(event => {
      let placed = false;
      for (let col of columns) {
        const lastEvent = col[col.length - 1];
        if (lastEvent.end_time <= event.start_time) {
          col.push(event);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
      }
    });

    return columns;
  };

  const eventColumns = getOverlappingEvents();

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            📅 לוח זמנים HackAlon
          </h1>
          <p className="text-slate-500">תכנון ומעקב אחר אירועים</p>
        </motion.div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
            <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
            >
              היום
            </Button>
          </div>
          {isAdmin && (
            <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 ml-2" />
              הוסף אירוע
            </Button>
          )}
        </div>

        {/* Legend */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {Object.entries(eventTypeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${color}`}></div>
                <span className="text-sm">{type} {eventTypeIcons[type]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline View */}
        <Card className="overflow-auto max-h-[800px]">
          <div className="relative" style={{ minHeight: '1440px', minWidth: '600px' }}>
            {/* Time slots */}
            {timeSlots.map((time, idx) => (
              <div
                key={time}
                className="absolute left-0 right-0 border-t border-slate-200"
                style={{ top: `${idx * 80}px` }}
              >
                <div className="absolute -top-3 right-4 bg-white px-2 text-sm font-medium text-slate-600">
                  {time}
                </div>
              </div>
            ))}

            {/* Events */}
            <div className="relative pr-20" style={{ minHeight: '1440px' }}>
              {eventColumns.map((column, colIdx) => (
                <div
                  key={colIdx}
                  className="absolute"
                  style={{
                    right: `${20 + colIdx * (100 / eventColumns.length)}%`,
                    width: `${95 / eventColumns.length}%`,
                    top: 0,
                    bottom: 0
                  }}
                >
                  {column.map((item) => {
                    const style = getEventStyle(item.start_time, item.end_time);
                    const color = eventTypeColors[item.event_type] || 'bg-slate-500 border-slate-600';
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute right-0 left-0 ${color} text-white rounded-lg border-2 p-2 cursor-pointer hover:shadow-lg transition-all overflow-hidden group`}
                        style={style}
                        onClick={() => isAdmin && handleEdit(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <p className="font-bold text-sm truncate">{item.title}</p>
                              <span className="text-lg">{eventTypeIcons[item.event_type]}</span>
                            </div>
                            <p className="text-xs opacity-90">
                              {item.start_time} - {item.end_time}
                            </p>
                            {item.description && (
                              <p className="text-xs opacity-75 mt-1 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-white/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(item);
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-red-600/30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {scheduleItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400">אין אירועים מתוכננים לתאריך זה</p>
                    {isAdmin && (
                      <Button onClick={openAddModal} variant="outline" className="mt-4">
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף אירוע ראשון
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'ערוך אירוע' : 'הוסף אירוע חדש'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>כותרת *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="שם האירוע"
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="פרטים נוספים"
                  rows={3}
                />
              </div>

              <div>
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>שעת התחלה *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>שעת סיום *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>סוג אירוע *</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="פורום גדודי">פורום גדודי 👥</SelectItem>
                    <SelectItem value="פורום מדורי">פורום מדורי 🏢</SelectItem>
                    <SelectItem value="הרצאת אורח">הרצאת אורח 🎤</SelectItem>
                    <SelectItem value="מתפללים">מתפללים 🙏</SelectItem>
                    <SelectItem value="ארוחה">ארוחה 🍽️</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  ביטול
                </Button>
                <Button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {editingItem ? 'עדכן' : 'הוסף'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}