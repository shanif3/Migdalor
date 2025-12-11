import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Calendar, Clock, Trash2, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function MySchedule() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    crew_name: '',
    start_time: '',
    end_time: '',
    room_type_needed: 'צוותי',
    needs_computers: false,
    notes: ''
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['my-lessons', user?.email, selectedDate],
    queryFn: () => base44.entities.Lesson.filter({
      crew_manager: user?.email,
      date: selectedDate
    }, '-start_time'),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lesson.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      setShowModal(false);
      setFormData({
        crew_name: '',
        start_time: '',
        end_time: '',
        room_type_needed: 'צוותי',
        needs_computers: false,
        notes: ''
      });
      toast.success('שיעור נוסף ללוח הזמנים');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Lesson.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      toast.success('השיעור הוסר');
    }
  });

  const handleSubmit = () => {
    if (!formData.crew_name || !formData.start_time || !formData.end_time) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }

    createMutation.mutate({
      ...formData,
      crew_manager: user.email,
      date: selectedDate,
      status: 'pending'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'ממתין' },
      assigned: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'שובץ' },
      completed: { color: 'bg-slate-100 text-slate-700', icon: CheckCircle, label: 'הושלם' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'בוטל' }
    };
    const { color, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge className={`${color} hover:${color} flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>);

  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            לוח הזמנים שלי 📅
          </h1>
          <p className="text-slate-500">
            הגש את לוח הזמנים שלך להקצאת מפתחות
          </p>
        </motion.div>

        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">בחר תאריך:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto" />

          </div>
          <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 ml-2" />
            הוסף שיעור
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">סה״כ שיעורים</p>
            <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">שובצו</p>
            <p className="text-2xl font-bold text-green-700">
              {lessons.filter((l) => l.status === 'assigned').length}
            </p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-600">ממתינים</p>
            <p className="text-2xl font-bold text-yellow-700">
              {lessons.filter((l) => l.status === 'pending').length}
            </p>
          </Card>
        </div>

        {/* Lessons Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>צוות</TableHead>
                <TableHead>שעה</TableHead>
                <TableHead>סוג חדר</TableHead>
                <TableHead>מחשבים</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>חדר משובץ</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ?
              <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                  </TableCell>
                </TableRow> :
              lessons.length === 0 ?
              <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    אין שיעורים מתוכננים לתאריך זה
                  </TableCell>
                </TableRow> :

              lessons.map((lesson) =>
              <TableRow key={lesson.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{lesson.crew_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {lesson.start_time} - {lesson.end_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                  lesson.room_type_needed === 'פלוגתי' ?
                  'border-purple-300 text-purple-700' :
                  'border-blue-300 text-blue-700'
                  }>
                        {lesson.room_type_needed === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lesson.needs_computers ?
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          💻 כן
                        </Badge> :

                  <span className="text-slate-400 text-sm">לא</span>
                  }
                    </TableCell>
                    <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                    <TableCell>
                      {lesson.assigned_key ?
                  <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700">
                            חדר {lesson.assigned_key}
                          </span>
                        </div> :

                  <span className="text-slate-400">—</span>
                  }
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(lesson.id)}
                    disabled={lesson.status === 'assigned'}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50">

                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add Lesson Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              הוסף שיעור
            </DialogTitle>
            <DialogDescription>
              הוסף שיעור חדש ללוח הזמנים שלך ל-{format(new Date(selectedDate), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-auto">שם הצוות *</Label>
              <Input
                placeholder="למשל, צוות אלפא..."
                value={formData.crew_name}
                onChange={(e) => setFormData({ ...formData, crew_name: e.target.value })} />

            </div>
            <div className="space-y-2">
                <Label>שעת סיום *</Label>
                <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />

              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>שעת התחלה *</Label>
                <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />

              </div>
        

            <div className="space-y-2">
              <Label>סוג חדר נדרש *</Label>
              <Select
                value={formData.room_type_needed}
                onValueChange={(value) => setFormData({ ...formData, room_type_needed: value })}>

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
                id="computers"
                checked={formData.needs_computers}
                onCheckedChange={(checked) =>
                setFormData({ ...formData, needs_computers: checked })
                } />

              <Label htmlFor="computers" className="cursor-pointer">
                💻 דורש מחשבים
              </Label>
            </div>

            <div className="space-y-2">
              <Label>הערות (אופציונלי)</Label>
              <Input
                placeholder="דרישות מיוחדות..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />

            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.crew_name || !formData.start_time || !formData.end_time}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700">

              הוסף שיעור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}