import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Clock, Loader2, Key, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function DailyOverview() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('squads'); // 'squads' or 'platoons'
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['daily-lessons', selectedDate],
    queryFn: () => base44.entities.Lesson.filter({ date: selectedDate }, 'start_time')
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list('order')
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list('order')
  });

  // Generate time slots (07:00 - 22:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get all units (squads or platoons) based on view mode
  const units = useMemo(() => {
    if (viewMode === 'squads') {
      return squads.map(s => ({
        id: s.id,
        name: s.squad_number,
        platoon: s.platoon_name
      })).sort((a, b) => {
        const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });
    } else {
      return crews.map(c => ({
        id: c.id,
        name: c.name,
        platoon: null
      })).sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }
  }, [viewMode, squads, crews]);

  // Check if a lesson is active during a time slot
  const isLessonActive = (lesson, timeSlot) => {
    const slotStart = timeSlot;
    const slotEnd = `${String(parseInt(timeSlot.split(':')[0]) + 1).padStart(2, '0')}:00`;
    return lesson.start_time < slotEnd && lesson.end_time > slotStart;
  };

  // Get lesson for a specific unit and time slot
  const getLessonForSlot = (unitName, timeSlot) => {
    return lessons.find(lesson => 
      lesson.crew_name === unitName && isLessonActive(lesson, timeSlot)
    );
  };

  // Get all lessons for a unit
  const getUnitLessons = (unitName) => {
    return lessons.filter(lesson => lesson.crew_name === unitName)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  // Handle cell click
  const handleCellClick = (unitName, lesson) => {
    setSelectedUnit({ name: unitName, lesson });
    setShowModal(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'completed':
        return 'bg-slate-100 border-slate-300 text-slate-600';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-500';
    }
  };

  // Group by platoon for better organization
  const unitsByPlatoon = useMemo(() => {
    const grouped = {};
    units.forEach(unit => {
      const platoon = unit.platoon || 'אחר';
      if (!grouped[platoon]) grouped[platoon] = [];
      grouped[platoon].push(unit);
    });
    return grouped;
  }, [units]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            תמונת מצב יומית 📊
          </h1>
          <p className="text-slate-500">מעקב אחר לוח הזמנים של כל הצוותים והפלוגות</p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">תאריך:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium">תצוגה:</Label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="squads">לפי צוותים</SelectItem>
                <SelectItem value="platoons">לפי פלוגות</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">סה״כ שיעורים</p>
            <p className="text-2xl font-bold text-slate-800">{lessons.length}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">שובצו</p>
            <p className="text-2xl font-bold text-green-700">
              {lessons.filter(l => l.status === 'assigned').length}
            </p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-600">ממתינים</p>
            <p className="text-2xl font-bold text-yellow-700">
              {lessons.filter(l => l.status === 'pending').length}
            </p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">יחידות פעילות</p>
            <p className="text-2xl font-bold text-blue-700">
              {new Set(lessons.map(l => l.crew_name)).size}
            </p>
          </Card>
        </div>

        {/* Legend */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-slate-700">מקרא:</span>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">שובץ</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">ממתין</Badge>
            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">הושלם</Badge>
          </div>
        </Card>

        {/* Timeline Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Card className="overflow-hidden border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    <th className="sticky right-0 z-20 bg-slate-50 p-3 text-right font-semibold text-slate-700 border-l-2 border-slate-200 min-w-[150px]">
                      {viewMode === 'squads' ? 'צוות' : 'פלוגה'}
                    </th>
                    {timeSlots.map((slot) => (
                      <th key={slot} className="p-2 text-center font-medium text-slate-600 text-sm min-w-[100px] border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(unitsByPlatoon).map(([platoon, platoonUnits]) => (
                    <React.Fragment key={platoon}>
                      {viewMode === 'squads' && (
                        <tr className="bg-slate-100 border-b border-slate-300">
                          <td colSpan={timeSlots.length + 1} className="p-2 font-semibold text-slate-700 text-sm">
                            {platoon}
                          </td>
                        </tr>
                      )}
                      {platoonUnits.map((unit) => (
                        <tr key={unit.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                          <td className="sticky right-0 z-10 bg-white p-3 font-medium text-slate-700 border-l-2 border-slate-200">
                            {unit.name}
                          </td>
                          {timeSlots.map((slot) => {
                            const lesson = getLessonForSlot(unit.name, slot);
                            return (
                              <td key={slot} className="p-1 border-l border-slate-200 align-middle">
                                {lesson ? (
                                  <div 
                                    onClick={() => handleCellClick(unit.name, lesson)}
                                    className={`p-2 rounded border-2 text-center text-xs cursor-pointer hover:shadow-lg transition-all ${getStatusColor(lesson.status)}`}>
                                    <div className="font-bold mb-1">
                                      {lesson.assigned_key ? `חדר ${lesson.assigned_key}` : 'לא שובץ'}
                                    </div>
                                    <div className="text-[10px] opacity-75">
                                      {lesson.start_time}-{lesson.end_time}
                                    </div>
                                    {lesson.room_type_needed && (
                                      <div className="mt-1">
                                        {lesson.room_type_needed === 'פלוגתי' ? '🏢' : '🏠'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[60px]"></div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {units.length === 0 && (
                    <tr>
                      <td colSpan={timeSlots.length + 1} className="p-8 text-center text-slate-400">
                        אין {viewMode === 'squads' ? 'צוותים' : 'פלוגות'} להצגה
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Details Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle className="flex items-center gap-2 flex-row-reverse justify-end">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600" />
                </div>
                פרטי שיעור
              </DialogTitle>
            </DialogHeader>

            {selectedUnit && selectedUnit.lesson && (
              <div className="space-y-4 py-4">
                {/* Crew/Platoon Info */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">
                    {viewMode === 'squads' ? 'צוות' : 'פלוגה'}:
                  </div>
                  <div className="text-xl font-bold text-slate-800">{selectedUnit.name}</div>
                  {selectedUnit.lesson.platoon_name && (
                    <Badge variant="outline" className="mt-2 bg-purple-50">
                      {selectedUnit.lesson.platoon_name}
                    </Badge>
                  )}
                </div>

                {/* Lesson Details */}
                <Card className={`p-4 border-2 ${getStatusColor(selectedUnit.lesson.status)}`}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-slate-600" />
                      <div>
                        <div className="text-sm text-slate-500">שעות השיעור</div>
                        <div className="text-lg font-bold">
                          {selectedUnit.lesson.start_time} - {selectedUnit.lesson.end_time}
                        </div>
                      </div>
                    </div>

                    {selectedUnit.lesson.assigned_key ? (
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-slate-600" />
                        <div>
                          <div className="text-sm text-slate-500">חדר משובץ</div>
                          <div className="text-lg font-bold">חדר {selectedUnit.lesson.assigned_key}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-slate-400" />
                        <div className="text-slate-500">טרם שובץ חדר</div>
                      </div>
                    )}

                    <div className="pt-3 border-t">
                      <div className="text-sm text-slate-500 mb-2">דרישות</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">
                          {selectedUnit.lesson.room_type_needed === 'פלוגתי' ? '🏢 חדר פלוגתי' : '🏠 חדר צוותי'}
                        </Badge>
                        {selectedUnit.lesson.needs_computers && (
                          <Badge variant="outline">💻 נדרשים מחשבים</Badge>
                        )}
                        <Badge className={
                          selectedUnit.lesson.status === 'assigned' 
                            ? 'bg-green-600 hover:bg-green-600' 
                            : 'bg-yellow-600 hover:bg-yellow-600'
                        }>
                          {selectedUnit.lesson.status === 'assigned' ? '✓ שובץ' : '⏳ ממתין'}
                        </Badge>
                      </div>
                    </div>

                    {selectedUnit.lesson.notes && (
                      <div className="pt-3 border-t">
                        <div className="text-sm text-slate-500 mb-1">הערות</div>
                        <div className="text-sm text-slate-700">{selectedUnit.lesson.notes}</div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}