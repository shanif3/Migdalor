import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Wand2, Calendar, Key, RefreshCw, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function KeyAllocation() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isAllocating, setIsAllocating] = useState(false);
  const queryClient = useQueryClient();

  const { data: allKeys = [] } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list()
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['all-lessons', selectedDate],
    queryFn: () => base44.entities.Lesson.filter({ date: selectedDate }, 'start_time')
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lesson.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
    }
  });

  const toggleKeySelection = (keyId) => {
    setSelectedKeys((prev) =>
    prev.includes(keyId) ?
    prev.filter((id) => id !== keyId) :
    [...prev, keyId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedKeys.length === allKeys.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(allKeys.map((k) => k.id));
    }
  };

  const allocateKeys = async () => {
    setIsAllocating(true);

    try {
      // Get available keys
      const availableKeys = allKeys.filter((k) => selectedKeys.includes(k.id));

      // Get pending lessons sorted by priority
      const pendingLessons = lessons.
      filter((l) => l.status === 'pending').
      sort((a, b) => {
        // Priority 1: Earlier time
        const timeA = a.start_time;
        const timeB = b.start_time;
        if (timeA !== timeB) return timeA.localeCompare(timeB);

        // Priority 2: פלוגתי rooms first
        if (a.room_type_needed === 'פלוגתי' && b.room_type_needed === 'צוותי') return -1;
        if (a.room_type_needed === 'צוותי' && b.room_type_needed === 'פלוגתי') return 1;

        // Priority 3: Needs computers (lower priority for those who don't need)
        if (a.needs_computers && !b.needs_computers) return -1;
        if (!a.needs_computers && b.needs_computers) return 1;

        return 0;
      });

      const assignments = [];
      const failureReasons = [];

      for (const lesson of pendingLessons) {
        // Find suitable key
        let assignedKey = null;

        // First try to find exact match with computer requirement
        if (lesson.needs_computers) {
          assignedKey = availableKeys.find(
            (k) => k.room_type === lesson.room_type_needed &&
            k.has_computers &&
            !isKeyOccupied(k, lesson, assignments)
          );
        }

        // If not found or doesn't need computers, find by room type
        if (!assignedKey) {
          assignedKey = availableKeys.find(
            (k) => k.room_type === lesson.room_type_needed &&
            !isKeyOccupied(k, lesson, assignments)
          );
        }

        // If still not found, try any available key (upgrade צוותי to פלוגתי)
        if (!assignedKey && lesson.room_type_needed === 'צוותי') {
          assignedKey = availableKeys.find(
            (k) => k.room_type === 'פלוגתי' &&
            !isKeyOccupied(k, lesson, assignments)
          );
        }

        if (assignedKey) {
          assignments.push({
            lessonId: lesson.id,
            keyId: assignedKey.id,
            roomNumber: assignedKey.room_number,
            startTime: lesson.start_time,
            endTime: lesson.end_time
          });
        } else {
          // Track why this lesson couldn't be assigned
          const matchingTypeKeys = availableKeys.filter((k) => k.room_type === lesson.room_type_needed);
          const occupiedKeys = matchingTypeKeys.filter((k) => isKeyOccupied(k, lesson, assignments));

          let reason = `${lesson.crew_name} (${lesson.start_time}-${lesson.end_time}): `;
          if (matchingTypeKeys.length === 0) {
            reason += `אין מפתחות מסוג ${lesson.room_type_needed}`;
          } else if (occupiedKeys.length === matchingTypeKeys.length) {
            reason += `כל המפתחות מסוג ${lesson.room_type_needed} תפוסים בשעות אלה`;
          } else if (lesson.needs_computers) {
            reason += `אין מפתחות עם מחשבים זמינים`;
          } else {
            reason += `לא נמצא מפתח מתאים`;
          }

          failureReasons.push(reason);
        }
      }

      // Apply assignments
      for (const assignment of assignments) {
        await updateLessonMutation.mutateAsync({
          id: assignment.lessonId,
          data: {
            assigned_key: assignment.roomNumber,
            status: 'assigned'
          }
        });
      }

      toast.success(`שובצו בהצלחה ${assignments.length} שיעורים!`);

      const unassigned = pendingLessons.length - assignments.length;
      if (unassigned > 0) {
        console.log('שיעורים שלא שובצו:', failureReasons);
        toast.warning(`${unassigned} שיעורים לא שובצו. פתח Console לפרטים`);
      }

    } catch (error) {
      toast.error('שגיאה בהקצאת מפתחות');
      console.error(error);
    } finally {
      setIsAllocating(false);
    }
  };

  // Check if a key is already occupied during the lesson time
  const isKeyOccupied = (key, newLesson, currentAssignments) => {
    const overlapping = currentAssignments.filter((a) => a.keyId === key.id);

    for (const assignment of overlapping) {
      if (timeSlotsOverlap(
        newLesson.start_time, newLesson.end_time,
        assignment.startTime, assignment.endTime
      )) {
        return true;
      }
    }
    return false;
  };

  const timeSlotsOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && start2 < end1;
  };

  const resetAllocations = async () => {
    const assigned = lessons.filter((l) => l.status === 'assigned');
    for (const lesson of assigned) {
      await updateLessonMutation.mutateAsync({
        id: lesson.id,
        data: { assigned_key: null, status: 'pending' }
      });
    }
    toast.success('ההקצאות אופסו');
  };

  const pendingCount = lessons.filter((l) => l.status === 'pending').length;
  const assignedCount = lessons.filter((l) => l.status === 'assigned').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            הקצאת מפתחות 🎯
          </h1>
          
        </motion.div>

        {/* Date and Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-row-reverse items-center gap-3">
            <Label className="text-sm font-medium">תאריך:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto" />

          </div>
          <div className="flex flex-row-reverse items-center gap-2">
            <Button
              variant="outline"
              onClick={resetAllocations}
              disabled={assignedCount === 0}>

              <RefreshCw className="w-4 h-4 ml-2" />
              אפס
            </Button>
            <Button
              onClick={allocateKeys}
              disabled={selectedKeys.length === 0 || pendingCount === 0 || isAllocating}
              className="bg-emerald-600 hover:bg-emerald-700">

              {isAllocating ?
              <Loader2 className="w-4 h-4 ml-2 animate-spin" /> :

              <Wand2 className="w-4 h-4 ml-2" />
              }
              שבץ אוטומטית
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">סה״כ שיעורים</p>
            <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-600">ממתינים</p>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">שובצו</p>
            <p className="text-2xl font-bold text-green-700">{assignedCount}</p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">מפתחות זמינים</p>
            <p className="text-2xl font-bold text-blue-700">{selectedKeys.length}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Keys Selection */}
          <Card className="p-6 border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-slate-600" />
                בחר מפתחות זמינים
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll} className="bg-background px-1 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">


                {selectedKeys.length === allKeys.length ? 'בטל הכל' : 'בחר הכל'}
              </Button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {allKeys.map((key) =>
              <div
                key={key.id}
                className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">

                  <Checkbox
                  id={key.id}
                  checked={selectedKeys.includes(key.id)}
                  onCheckedChange={() => toggleKeySelection(key.id)} />

                  <label htmlFor={key.id} className="flex-1 cursor-pointer">
                    <div className="text-slate-700 mx-3 font-medium opacity-100">חדר {key.room_number}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-teal-100 text-foreground mx-2 px-2.5 py-0.5 text-xs font-semibold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                        {key.room_type === 'פלוגתי' ? '🏢' : '🏠'} {key.room_type}
                      </Badge>
                      {key.has_computers &&
                    <Badge variant="outline" className="text-xs">💻</Badge>
                    }
                    </div>
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Lessons List */}
          <Card className="lg:col-span-2 overflow-hidden border-slate-200">
            <div className="p-6 border-b bg-slate-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                לוח זמנים שיעורים
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שעה</TableHead>
                    <TableHead>צוות</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead>💻</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>חדר</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ?
                  <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                      </TableCell>
                    </TableRow> :
                  lessons.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        אין שיעורים מתוכננים לתאריך זה
                      </TableCell>
                    </TableRow> :

                  lessons.map((lesson) =>
                  <TableRow key={lesson.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-sm">
                          {lesson.start_time}-{lesson.end_time}
                        </TableCell>
                        <TableCell className="font-medium">{lesson.crew_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {lesson.room_type_needed === 'פלוגתי' ? '🏢' : '🏠'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lesson.needs_computers ? '✅' : '—'}
                        </TableCell>
                        <TableCell>
                          {lesson.status === 'assigned' ?
                      <CheckCircle className="w-4 h-4 text-green-600" /> :

                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      }
                        </TableCell>
                        <TableCell>
                          {lesson.assigned_key ?
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              {lesson.assigned_key}
                            </Badge> :

                      <span className="text-slate-400">—</span>
                      }
                        </TableCell>
                      </TableRow>
                  )
                  }
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Priority Info */}
        <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">סדר עדיפויות הקצאה:</h4>
          <ol className="space-y-2 text-sm text-blue-800">
            <li>1. שיעורים מוקדמים יותר מקבלים עדיפות</li>
            <li>2. חדרים פלוגתיים משובצים ראשונים</li>
            <li>3. שיעורים שדורשים מחשבים מקבלים עדיפות על פני אלו שלא</li>
            <li>4. בקשות לחדרים צוותיים עשויות לקבל שדרוג לפלוגתי במידת הצורך</li>
          </ol>
        </Card>
      </div>
    </div>);

}