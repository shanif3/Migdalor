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
import { Plus, Calendar, Clock, Trash2, Key, CheckCircle, XCircle, Loader2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function MySchedule() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    crew_name: '',
    platoon_name: '',
    start_time: '',
    end_time: '',
    room_type_needed: 'צוותי',
    needs_computers: false,
    notes: '',
    room_count: 1
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['my-lessons', user?.platoon_name, selectedDate],
    queryFn: () => base44.entities.Lesson.filter({
      platoon_name: user?.platoon_name,
      date: selectedDate
    }, 'start_time'),
    enabled: !!user?.platoon_name
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list('order')
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list('order')
  });

  // Filter crews and squads based on user's platoon
  const filteredCrews = user?.platoon_name 
    ? crews.filter(crew => crew.name === user.platoon_name)
    : crews;
  
  const filteredSquads = user?.platoon_name
    ? squads.filter(squad => squad.platoon_name === user.platoon_name)
    : squads;

  const { data: allDayLessons = [] } = useQuery({
    queryKey: ['all-day-lessons', selectedDate],
    queryFn: () => base44.entities.Lesson.filter({
      date: selectedDate,
      status: 'assigned'
    }, 'start_time'),
    enabled: !!selectedDate
  });

  const { data: allUsersLessons = [] } = useQuery({
    queryKey: ['all-users-lessons', selectedDate],
    queryFn: () => base44.entities.Lesson.filter({
      date: selectedDate,
      status: 'assigned'
    }, '-end_time'),
    enabled: !!selectedDate && new Date(selectedDate).getDay() === 3 // רק ביום רביעי
  });

  const { data: allKeys = [] } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list()
  });

  // Get classroom assignments for Misdar (Wednesday only, from 9:00 AM)
  const getMyMisdarAssignments = () => {
    const selectedDay = new Date(selectedDate);
    const now = new Date();
    const currentHour = now.getHours();

    // Only show on Wednesday from 9:00 AM onwards
    if (selectedDay.getDay() !== 3 || !user?.email || !user?.platoon_name) return null;

    // If it's today (Wednesday), only show from 9:00 AM
    const isToday = selectedDate === now.toISOString().split('T')[0];
    if (isToday && currentHour < 9) return null;

    const roomsToClean = [];
    const seenRooms = new Set();

    // Check all keys for manual assignments or automatic assignments
    allKeys.forEach((key) => {
      if (seenRooms.has(key.room_number)) return;

      // Check if there's a manual assignment for this room
      if (key.manual_misdar_assignment) {
        // If manual assignment matches my platoon, I'm responsible
        if (key.manual_misdar_assignment === user.platoon_name) {
          roomsToClean.push({
            roomNumber: key.room_number,
            crewName: user.platoon_name,
            endTime: '—',
            manual: true
          });
          seenRooms.add(key.room_number);
        }
        return;
      }

      // Otherwise, use automatic assignment logic
      // Get only my lessons for this room
      const myLessons = allUsersLessons.filter((lesson) =>
        lesson.crew_manager === user.email && 
        lesson.assigned_key === key.room_number
      );

      myLessons.forEach((myLesson) => {
        if (seenRooms.has(myLesson.assigned_key)) return;

        // Check if there's another crew that took this key after me
        const nextLesson = allUsersLessons.find((lesson) =>
          lesson.assigned_key === myLesson.assigned_key &&
          lesson.crew_manager !== user.email &&
          lesson.start_time >= myLesson.end_time
        );

        // If no one took the key after me, I need to clean it
        if (!nextLesson) {
          roomsToClean.push({
            roomNumber: myLesson.assigned_key,
            crewName: myLesson.crew_name,
            endTime: myLesson.end_time,
            manual: false
          });
          seenRooms.add(myLesson.assigned_key);
        }
      });
    });

    return roomsToClean.length > 0 ? roomsToClean : null;
  };

  const myMisdarAssignments = getMyMisdarAssignments();

  const getKeyHandoffNote = (lesson) => {
    if (!lesson.assigned_key || lesson.status !== 'assigned') return null;

    // Find who we receive from (only if from a different user AND different platoon)
    const previousLesson = allDayLessons.find((l) =>
    l.assigned_key === lesson.assigned_key &&
    l.id !== lesson.id &&
    l.crew_manager !== lesson.crew_manager &&
    l.platoon_name !== lesson.platoon_name &&
    l.end_time <= lesson.start_time
    );

    // Find who we pass to (only if to a different user AND different platoon)
    const nextLesson = allDayLessons.find((l) =>
    l.assigned_key === lesson.assigned_key &&
    l.id !== lesson.id &&
    l.crew_manager !== lesson.crew_manager &&
    l.platoon_name !== lesson.platoon_name &&
    l.start_time >= lesson.end_time
    );

    const receiveFrom = previousLesson ? previousLesson.crew_name : null;
    const passTo = nextLesson ? nextLesson.crew_name : null;

    if (!receiveFrom && !passTo) return null;

    return { receiveFrom, passTo };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // If single room or editing, create normally
      if (data.room_count === 1) {
        return base44.entities.Lesson.create(data);
      }

      // Multiple rooms - create multiple lessons
      const lessons = [];
      for (let i = 0; i < data.room_count; i++) {
        lessons.push({
          ...data,
          room_type_needed: 'צוותי', // Always צוותי for multiple rooms
          notes: data.notes ? `${data.notes} (חדר ${i + 1}/${data.room_count})` : `חדר ${i + 1}/${data.room_count}`
        });
      }
      return base44.entities.Lesson.bulkCreate(lessons);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      setShowModal(false);
      setEditingLesson(null);
      setFormData({
        crew_name: '',
        platoon_name: '',
        start_time: '',
        end_time: '',
        room_type_needed: 'צוותי',
        needs_computers: false,
        notes: '',
        room_count: 1
      });
      toast.success('שיעורים נוספו ללוח הזמנים');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, originalLesson }) => {
      // Update the lesson first
      await base44.entities.Lesson.update(id, data);

      // If times or room type changed, try to find a new key
      const timesChanged = data.start_time !== originalLesson.start_time ||
      data.end_time !== originalLesson.end_time;
      const typeChanged = data.room_type_needed !== originalLesson.room_type_needed;
      const computersChanged = data.needs_computers !== originalLesson.needs_computers;

      if (timesChanged || typeChanged || computersChanged) {
        // Fetch all keys and lessons for the day
        const [allKeys, allLessons] = await Promise.all([
        base44.entities.ClassroomKey.list(),
        base44.entities.Lesson.filter({ date: originalLesson.date })]
        );

        // Find available key
        let assignedKey = null;

        // Try to find exact match
        for (const key of allKeys) {
          // Check if key matches requirements
          const matchesType = key.room_type === data.room_type_needed;
          const matchesComputers = !data.needs_computers || key.has_computers;

          if (!matchesType || !matchesComputers) continue;

          // Check if key is available during the new time slot
          const isOccupied = allLessons.some((lesson) => {
            if (lesson.id === id) return false; // Skip the lesson we're editing
            if (!lesson.assigned_key || lesson.assigned_key !== key.room_number) return false;

            // Check time overlap
            return lesson.start_time < data.end_time && data.start_time < lesson.end_time;
          });

          if (!isOccupied) {
            assignedKey = key.room_number;
            break;
          }
        }

        // If no exact match for צוותי, try פלוגתי (upgrade)
        if (!assignedKey && data.room_type_needed === 'צוותי') {
          for (const key of allKeys) {
            if (key.room_type !== 'פלוגתי') continue;
            if (data.needs_computers && !key.has_computers) continue;

            const isOccupied = allLessons.some((lesson) => {
              if (lesson.id === id) return false;
              if (!lesson.assigned_key || lesson.assigned_key !== key.room_number) return false;
              return lesson.start_time < data.end_time && data.start_time < lesson.end_time;
            });

            if (!isOccupied) {
              assignedKey = key.room_number;
              break;
            }
          }
        }

        // Update lesson with new key or set to pending if no key found
        if (assignedKey) {
          await base44.entities.Lesson.update(id, { assigned_key: assignedKey, status: 'assigned' });
        } else {
          await base44.entities.Lesson.update(id, { assigned_key: null, status: 'pending' });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
      setShowModal(false);
      setEditingLesson(null);
      setFormData({
        crew_name: '',
        platoon_name: '',
        start_time: '',
        end_time: '',
        room_type_needed: 'צוותי',
        needs_computers: false,
        notes: '',
        room_count: 1
      });
      toast.success('השיעור עודכן והמפתח הוקצה מחדש');
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

    if (editingLesson) {
      updateMutation.mutate({
        id: editingLesson.id,
        data: formData,
        originalLesson: editingLesson
      });
    } else {
      // Check if it's a platoon (crew) with multiple rooms
      const isPlatoon = filteredCrews.some(c => c.name === formData.crew_name);
      const roomCount = isPlatoon && formData.room_count > 1 ? formData.room_count : 1;

      createMutation.mutate({
        ...formData,
        crew_manager: user.email,
        date: selectedDate,
        status: 'pending',
        room_count: roomCount
      });
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      crew_name: lesson.crew_name,
      platoon_name: lesson.platoon_name || '',
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      room_type_needed: lesson.room_type_needed,
      needs_computers: lesson.needs_computers || false,
      notes: lesson.notes || '',
      room_count: 1
    });
    setShowModal(true);
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

    <div dir="rtl"
    className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            לוח הזמנים של {user?.platoon_name || 'הפלוגה'} 📅
          </h1>
          <p className="text-slate-500">
            לוח זמנים משותף לכל קה"דים באותה פלוגה
          </p>
        </motion.div>

        {/* Misdar Kitot Alert - Wednesday Only */}
        {myMisdarAssignments &&
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6">

            <Card className="border-orange-200 bg-orange-50">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    🧹
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-900 text-lg">מסדר כיתות - יום רביעי 22:00</h3>
                    <p className="text-sm text-orange-700">
                      הפלוגה שלך מנקה את החדרים הבאים: ({myMisdarAssignments.length} חדרים)
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      מתעדכן ביום רביעי בשעה 9:00 בבוקר
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myMisdarAssignments.map((assignment, idx) =>
                <div key={idx} className="p-4 rounded-lg bg-orange-100 border-2 border-orange-400">
                      <div className="flex items-center gap-2 text-orange-800 mb-1">
                        <Key className="w-5 h-5" />
                        <span className="text-xl font-bold">חדר {assignment.roomNumber}</span>
                        {assignment.manual && (
                          <span className="text-xs bg-orange-200 px-2 py-0.5 rounded">ידני</span>
                        )}
                      </div>
                      <p className="text-xs text-orange-600">
                        {assignment.manual ? 'הקצאה ידנית' : `סיום בשעה ${assignment.endTime}`}
                      </p>
                    </div>
                )}
                </div>
              </div>
            </Card>
          </motion.div>
        }

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
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">צוות</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">שעה</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">סוג חדר</TableHead>
                <TableHead className="h-10 px-2 flex items-center justify-center text-center align-middle font-medium [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">מחשבים</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">סטטוס</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">חדר משובץ</TableHead>
                <TableHead className="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">הערות</TableHead>
                <TableHead className="h-10 px-2 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ?
              <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                  </TableCell>
                </TableRow> :
              lessons.length === 0 ?
              <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                    אין שיעורים מתוכננים לתאריך זה
                  </TableCell>
                </TableRow> :

              lessons.map((lesson) =>
              <TableRow key={lesson.id} className="hover:bg-slate-50/50">
                    <TableCell className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] font-medium text-center">{lesson.crew_name}</TableCell>
                    <TableCell className="p-2 flex items-center justify-center text-center align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {lesson.start_time} - {lesson.end_time}
                      </div>
                    </TableCell>
                    <TableCell className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">
                      <Badge variant="outline" className={
                  lesson.room_type_needed === 'פלוגתי' ?
                  'border-purple-300 text-purple-700' :
                  'border-blue-300 text-blue-700'
                  }>
                        {lesson.room_type_needed === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">
                      {lesson.needs_computers ?
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          💻 כן
                        </Badge> :

                  <span className="text-slate-400 text-sm">לא</span>
                  }
                    </TableCell>
                    <TableCell className="p-2 flex items-center justify-center text-center align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">{getStatusBadge(lesson.status)}</TableCell>
                    <TableCell className="p-2 justify-centeralign-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">
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
                    <TableCell className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">
                      {(() => {
                    const handoff = getKeyHandoffNote(lesson);
                    if (!handoff) return <span className="text-slate-400">—</span>;

                    return (
                      <div className="flex flex-col gap-1 items-center">
                            {handoff.receiveFrom &&
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                🔽 מקבל מ{handoff.receiveFrom}
                              </Badge>
                        }
                            {handoff.passTo &&
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                🔼 מעביר ל{handoff.passTo}
                              </Badge>
                        }
                          </div>);

                  })()}
                    </TableCell>
                    <TableCell className="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(lesson)}
                      className="text-slate-400 hover:text-slate-600">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(lesson.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
  <DialogContent dir="rtl" className="sm:max-w-md text-right">
    <DialogHeader className="text-right">

            <DialogTitle className="flex items-center gap-2 flex-row-reverse justify-end text-right">
  <div className="p-2 bg-indigo-100 rounded-lg">
          <Calendar className="w-5 h-5 text-indigo-600" />
        </div>
        {editingLesson ? 'ערוך שיעור' : 'הוסף שיעור'}
      </DialogTitle>

      <DialogDescription className="text-right">
        {editingLesson ? 'עדכן את פרטי השיעור' : `הוסף שיעור חדש ללוח הזמנים שלך ל־${format(new Date(selectedDate), 'MMM d, yyyy')}`}
      </DialogDescription>

    </DialogHeader>

    <div className="space-y-4 py-4">
            <div className="space-y-2">
  <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-auto text-right">החדר עבור *







































































              </Label>

              <select
                value={formData.crew_name}
                onChange={(e) => {
                  const selectedValue = e.target.value;

                  // Check if a squad was selected and auto-fill platoon name
                  const selectedSquad = squads.find((s) => s.squad_number === selectedValue);

                  setFormData({
                    ...formData,
                    crew_name: selectedValue,
                    platoon_name: selectedSquad ? selectedSquad.platoon_name : ''
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right">

                <option value="">בחר פלוגה או צוות...</option>
                
                <optgroup label="פלוגות">
                  {filteredCrews.map((crew) =>
                  <option key={crew.id} value={crew.name}>{crew.name}</option>
                  )}
                </optgroup>
                
                <optgroup label="צוותים">
                  {filteredSquads.map((squad) =>
                  <option key={squad.id} value={squad.squad_number}>
                      {squad.squad_number} {squad.platoon_name ? `(${squad.platoon_name})` : ''}
                    </option>
                  )}
                </optgroup>
              </select>

            </div>

            {/* Room Count - only for platoons when not editing */}
            {!editingLesson && filteredCrews.some(c => c.name === formData.crew_name) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">כמות כיתות</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.room_count}
                  onChange={(e) => setFormData({ ...formData, room_count: parseInt(e.target.value) || 1 })}
                  className="text-right"
                />
                {formData.room_count > 1 && (
                  <p className="text-xs text-blue-600">
                    יווצרו {formData.room_count} שיעורים בחדרים צוותיים
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>שעת התחלה *</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />

              </div>
            <div className="space-y-2">
                <Label>שעת סיום *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />

              </div>
            </div>

        

            <div className="space-y-2 flex flex-col items-end text-right">
  <Label className="text-right ml-auto">
    סוג חדר נדרש *
  </Label>

  <Select
                value={formData.room_type_needed}
                onValueChange={(value) =>
                setFormData({ ...formData, room_type_needed: value })
                }>

    <SelectTrigger className="text-right justify-end">
      <SelectValue placeholder="בחר סוג חדר" />
    </SelectTrigger>

    <SelectContent className="text-right" dir="rtl">

  <SelectItem
                    value="צוותי"
                    className="text-right flex flex-row-reverse justify-end gap-2 pr-8">

    צוותי 🏠
  </SelectItem>

  <SelectItem
                    value="פלוגתי"
                    className="text-right flex flex-row-reverse justify-end gap-2 pr-8">

    פלוגתי 🏢
  </SelectItem>

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
                💻 דורש כיתה עם מחשב
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

              {editingLesson ? 'עדכן שיעור' : 'הוסף שיעור'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}