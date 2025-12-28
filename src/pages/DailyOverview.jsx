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
  const [filterType, setFilterType] = useState('all'); // 'all', 'room', 'crew', 'platoon'
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedCrew, setSelectedCrew] = useState('');
  const [selectedPlatoon, setSelectedPlatoon] = useState('');
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

  const { data: keys = [] } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list()
  });

  // Generate time slots (07:00 - 22:00)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 7; hour <= 21; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get all unique platoons
  const platoons = useMemo(() => {
    const platoonSet = new Set(squads.map(s => s.platoon_name).filter(Boolean));
    return Array.from(platoonSet).sort();
  }, [squads]);

  // Get crew names
  const crewNames = useMemo(() => {
    return crews.map(c => c.name).sort((a, b) => a.localeCompare(b, 'he'));
  }, [crews]);

  // Get room numbers
  const roomNumbers = useMemo(() => {
    return keys.map(k => k.room_number).sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [keys]);

  // Generate colors for crews
  const crewColors = useMemo(() => {
    const colors = [
      'bg-blue-100 border-blue-300 text-blue-800',
      'bg-green-100 border-green-300 text-green-800',
      'bg-purple-100 border-purple-300 text-purple-800',
      'bg-pink-100 border-pink-300 text-pink-800',
      'bg-orange-100 border-orange-300 text-orange-800',
      'bg-teal-100 border-teal-300 text-teal-800',
      'bg-indigo-100 border-indigo-300 text-indigo-800',
      'bg-rose-100 border-rose-300 text-rose-800',
    ];
    const colorMap = {};
    crewNames.forEach((crew, idx) => {
      colorMap[crew] = colors[idx % colors.length];
    });
    return colorMap;
  }, [crewNames]);

  // Get display data based on filter type
  const displayData = useMemo(() => {
    if (filterType === 'room' && selectedRoom) {
      // Show timeline for a specific room
      return {
        type: 'room',
        items: [{ id: selectedRoom, name: `חדר ${selectedRoom}`, platoon: null }]
      };
    } else if (filterType === 'crew' && selectedCrew) {
      // Show timeline for a specific crew
      return {
        type: 'crew',
        items: [{ id: selectedCrew, name: selectedCrew, platoon: null }]
      };
    } else if (filterType === 'platoon' && selectedPlatoon) {
      // Show the platoon itself and all squads in the platoon
      const items = [];
      
      // Add the platoon row (for platoon-level lessons)
      items.push({ id: `platoon_${selectedPlatoon}`, name: selectedPlatoon, platoon: selectedPlatoon, isPlatoon: true });
      
      // Add all squads in this platoon
      const platoonSquads = squads
        .filter(s => s.platoon_name === selectedPlatoon)
        .map(s => ({ id: s.id, name: s.squad_number, platoon: selectedPlatoon, isPlatoon: false }))
        .sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] || 0);
          const numB = parseInt(b.name.match(/\d+/)?.[0] || 0);
          return numA - numB;
        });
      
      items.push(...platoonSquads);
      
      return {
        type: 'platoon',
        items: items
      };
    } else {
      // Show all crews
      return {
        type: 'all',
        items: crews.map(c => ({
          id: c.id,
          name: c.name,
          platoon: squads.find(s => s.squad_number === c.name)?.platoon_name || null
        })).sort((a, b) => a.name.localeCompare(b.name, 'he'))
      };
    }
  }, [filterType, selectedRoom, selectedCrew, selectedPlatoon, crews, squads]);

  // Check if a lesson is active during a time slot
  const isLessonActive = (lesson, timeSlot) => {
    const slotStart = timeSlot;
    const slotEnd = `${String(parseInt(timeSlot.split(':')[0]) + 1).padStart(2, '0')}:00`;
    return lesson.start_time < slotEnd && lesson.end_time > slotStart;
  };

  // Get lesson for a specific unit and time slot
  const getLessonForSlot = (unitName, timeSlot) => {
    if (displayData.type === 'room') {
      // For room view, find any lesson using this room
      return lessons.find(lesson => 
        lesson.assigned_key === unitName.replace('חדר ', '') && isLessonActive(lesson, timeSlot)
      );
    } else {
      // For crew/platoon view, find lesson by crew name
      return lessons.find(lesson => 
        lesson.crew_name === unitName && isLessonActive(lesson, timeSlot)
      );
    }
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

  // Get cell color based on filter type
  const getCellColor = (lesson) => {
    if (!lesson) return '';
    
    if (displayData.type === 'platoon') {
      // Different color for each crew
      return crewColors[lesson.crew_name] || getStatusColor(lesson.status);
    } else {
      // Default status color
      return getStatusColor(lesson.status);
    }
  };

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
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
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
              <Label className="text-sm font-medium">סינון לפי:</Label>
              <Select value={filterType} onValueChange={(value) => {
                setFilterType(value);
                setSelectedRoom('');
                setSelectedCrew('');
                setSelectedPlatoon('');
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="room">חדר ספציפי</SelectItem>
                  <SelectItem value="crew">צוות ספציפי</SelectItem>
                  <SelectItem value="platoon">פלוגה ספציפית</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Secondary filters */}
          {filterType === 'room' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">בחר חדר:</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="בחר חדר..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {roomNumbers.map((room) => (
                    <SelectItem key={room} value={room}>חדר {room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === 'crew' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">בחר צוות:</Label>
              <Select value={selectedCrew} onValueChange={setSelectedCrew}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="בחר צוות..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {crewNames.map((crew) => (
                    <SelectItem key={crew} value={crew}>{crew}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filterType === 'platoon' && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">בחר פלוגה:</Label>
              <Select value={selectedPlatoon} onValueChange={setSelectedPlatoon}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="בחר פלוגה..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {platoons.map((platoon) => (
                    <SelectItem key={platoon} value={platoon}>{platoon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            {displayData.type === 'platoon' ? (
              <>
                <span className="text-slate-600">כל צוות בצבע שונה</span>
              </>
            ) : (
              <>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">שובץ</Badge>
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">ממתין</Badge>
                <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">הושלם</Badge>
              </>
            )}
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
                      {displayData.type === 'room' ? 'חדר' : 
                       displayData.type === 'crew' ? 'צוות' : 
                       displayData.type === 'platoon' ? 'צוותים בפלוגה' : 'צוותים'}
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
                  {displayData.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                      <td className="sticky right-0 z-10 bg-white p-3 font-medium text-slate-700 border-l-2 border-slate-200">
                        {item.name}
                      </td>
                      {timeSlots.map((slot) => {
                        const lesson = getLessonForSlot(item.name, slot);
                        return (
                          <td key={slot} className="p-1 border-l border-slate-200 align-middle">
                            {lesson ? (
                              <div 
                                onClick={() => handleCellClick(item.name, lesson)}
                                className={`p-2 rounded border-2 text-center text-xs cursor-pointer hover:shadow-lg transition-all ${getCellColor(lesson)}`}>
                                {displayData.type === 'room' ? (
                                  <>
                                    <div className="font-bold mb-1">{lesson.crew_name}</div>
                                    <div className="text-[10px] opacity-75">
                                      {lesson.start_time}-{lesson.end_time}
                                    </div>
                                    {lesson.room_type_needed && (
                                      <div className="mt-1">
                                        {lesson.room_type_needed === 'פלוגתי' ? '🏢' : '🏠'}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="font-bold mb-1">
                                      {lesson.assigned_key ? `חדר ${lesson.assigned_key}` : 'לא שובץ'}
                                    </div>
                                    <div className="text-[10px] opacity-75">
                                      {lesson.start_time}-{lesson.end_time}
                                    </div>
                                    {displayData.type === 'platoon' && (
                                      <div className="text-[10px] font-semibold mt-1">
                                        {lesson.crew_name}
                                      </div>
                                    )}
                                  </>
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
                  {displayData.items.length === 0 && (
                    <tr>
                      <td colSpan={timeSlots.length + 1} className="p-8 text-center text-slate-400">
                        {filterType === 'room' && !selectedRoom && 'בחר חדר להצגת לוח הזמנים'}
                        {filterType === 'crew' && !selectedCrew && 'בחר צוות להצגת לוח הזמנים'}
                        {filterType === 'platoon' && !selectedPlatoon && 'בחר פלוגה להצגת לוח הזמנים'}
                        {filterType === 'all' && 'אין צוותים להצגה'}
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
                    {displayData.type === 'room' ? 'חדר' : 'צוות'}:
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