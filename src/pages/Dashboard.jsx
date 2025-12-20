import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Key, Clock, Users, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

import KeyCard from '@/components/keys/KeyCard';
import CheckoutModal from '@/components/keys/CheckoutModal';
import WaitingQueueCard from '@/components/queue/WaitingQueueCard';
import AddToQueueModal from '@/components/queue/AddToQueueModal';
import StatsBar from '@/components/stats/StatsBar';

export default function Dashboard() {
  const [checkoutKey, setCheckoutKey] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState({ start: '', end: '' });
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const [userLoading, setUserLoading] = React.useState(true);

  React.useEffect(() => {
    base44.auth.me().then(user => {
      // Check if onboarding is needed
      if (!user.onboarding_completed) {
        window.location.href = createPageUrl('Onboarding');
        return;
      }
      console.log('👤 User loaded in Dashboard:', {
        email: user.email,
        platoon_name: user.platoon_name,
        squad_name: user.squad_name
      });
      setUser(user);
      setUserLoading(false);
    }).catch(() => {
      setUserLoading(false);
    });
  }, []);

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list()
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list()
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list('order')
  });

  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.WaitingQueue.list('priority')
  });

  // Filter crews and squads based on user's platoon
  const filteredCrews = user?.platoon_name ?
    crews.filter((crew) => crew.name === user.platoon_name) :
    crews;

  const filteredSquads = user?.platoon_name ?
    squads.filter((squad) => squad.platoon_name === user.platoon_name) :
    squads;

  const { data: todayLessons = [] } = useQuery({
    queryKey: ['today-lessons'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.Lesson.filter({ date: today });
    }
  });

  // Get current key holder for a room (considering time filter if active)
  const getCurrentHolder = (roomNumber) => {
    // If time filter is active, don't show current holder
    if (timeFilter.start && timeFilter.end) {
      return null;
    }
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const currentLesson = todayLessons.find(lesson => 
      lesson.assigned_key === roomNumber &&
      lesson.start_time <= currentTime &&
      lesson.end_time > currentTime
    );
    
    return currentLesson ? currentLesson.crew_name : null;
  };

  const updateKeyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassroomKey.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      toast.success('מפתח עודכן בהצלחה');
    }
  });

  const addToQueueMutation = useMutation({
    mutationFn: (data) => base44.entities.WaitingQueue.create({
      ...data,
      priority: queue.length + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
      setShowQueueModal(false);
      toast.success('נוסף לתור המתנה');
    }
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: (id) => base44.entities.WaitingQueue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('הוסר מהתור');
    }
  });

  const handleCheckout = async (key, holderName, startTime, endTime, platoonName) => {
    if (!user?.email) {
      toast.error('שגיאה: משתמש לא מחובר');
      return;
    }

    // Check for time conflicts with existing lessons
    const today = new Date().toISOString().split('T')[0];
    const existingLessons = await base44.entities.Lesson.filter({ 
      date: today, 
      assigned_key: key.room_number 
    });
    
    // Check for overlap
    const hasConflict = existingLessons.some(lesson => 
      lesson.start_time < endTime && startTime < lesson.end_time
    );
    
    if (hasConflict) {
      toast.error('החדר תפוס בשעות אלה. בדוק את לוח הזמנים');
      return;
    }
    
    // Create a lesson for this checkout
    await base44.entities.Lesson.create({
      crew_manager: user.email,
      crew_name: holderName,
      platoon_name: platoonName || '',
      date: today,
      start_time: startTime,
      end_time: endTime,
      room_type_needed: key.room_type,
      needs_computers: key.has_computers || false,
      assigned_key: key.room_number,
      status: 'assigned',
      notes: 'משיכה ידנית מלוח בקרה'
    });
    
    // Update key status
    updateKeyMutation.mutate({
      id: key.id,
      data: {
        status: 'taken',
        current_holder: holderName,
        checkout_time: new Date().toISOString(),
        checked_out_by: user?.email
      }
    });
    
    // Refresh lessons
    queryClient.invalidateQueries({ queryKey: ['today-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['my-lessons'] });
    queryClient.invalidateQueries({ queryKey: ['all-lessons'] });
    
    setCheckoutKey(null);
  };

  const handleReturn = (key) => {
    const isAdmin = user?.role === 'admin';
    const isKeyOwner = key.checked_out_by === user?.email;

    if (!isAdmin && !isKeyOwner) {
      toast.error('רק המשתמש שלקח את המפתח או המנהל יכולים להחזיר אותו');
      return;
    }

    updateKeyMutation.mutate({
      id: key.id,
      data: {
        status: 'available',
        current_holder: null,
        checkout_time: null,
        checked_out_by: null
      }
    });
  };

  const handleMoveUp = async (item) => {
    const currentIndex = queue.findIndex((q) => q.id === item.id);
    if (currentIndex > 0) {
      const prevItem = queue[currentIndex - 1];
      await base44.entities.WaitingQueue.update(item.id, { priority: prevItem.priority });
      await base44.entities.WaitingQueue.update(prevItem.id, { priority: item.priority });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    }
  };

  // Check if a key is available during the time filter
  const isKeyAvailableInTimeRange = (key) => {
    if (!timeFilter.start || !timeFilter.end) return true;
    
    // Find lessons for this specific room
    const roomLessons = todayLessons.filter(lesson => 
      lesson.assigned_key === key.room_number && 
      (lesson.status === 'assigned' || lesson.status === 'pending')
    );
    
    // Check if any lesson conflicts with this time range
    const hasConflict = roomLessons.some(lesson => {
      // Check time overlap: lessons overlap if start1 < end2 AND start2 < end1
      const overlap = lesson.start_time < timeFilter.end && timeFilter.start < lesson.end_time;
      return overlap;
    });
    
    return !hasConflict;
  };

  const filteredKeys = keys
    .filter((k) => filter === 'all' || k.room_type === filter)
    .filter((k) => isKeyAvailableInTimeRange(k));

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
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
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול מפתחות 🔑
          </h1>
        </motion.div>

        {/* Stats */}
        <StatsBar keys={keys} queueCount={queue.length} />

        {/* Main Content */}
        <Tabs defaultValue="keys" className="space-y-6">
          <div className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-white border border-slate-200 p-1">
              
              <TabsTrigger value="queue" className="data-[state=active]:bg-slate-100">
                תור ({queue.length})
                <Clock className="w-4 h-4 ml-2" />
              </TabsTrigger>
              <TabsTrigger value="keys" className="data-[state=active]:bg-slate-100">
                מפתחות
                <Key className="w-4 h-4 ml-2" />
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQueueModal(true)} className="bg-background text-blue-600 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-blue-200">


                הוסף בקשה מיוחדת
                <Plus className="w-4 h-4 mr-2" />

              </Button>
            </div>
          </div>

          <TabsContent value="keys" className="space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              {/* Room Type Filter */}
              <div className="flex flex-row-reverse items-center gap-2">
                <span className="text-sm text-slate-500">:סנן לפי סוג</span>
                <Filter className="w-4 h-4 text-slate-400" />
                <div className="flex flex-row-reverse gap-2">
                  {['all', 'צוותי', 'פלוגתי'].map((f) =>
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className={filter === f ? 'bg-slate-800' : ''}>

                      {f === 'all' ? 'הכל' : f === 'צוותי' ? '🏠 צוותי' : '🏢 פלוגתי'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Time Range Filter */}
              <div className="flex flex-row-reverse items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
                <span className="text-sm font-medium text-slate-700">:סנן לפי זמינות</span>
                <Clock className="w-5 h-5 text-slate-600" />
                <div className="flex items-center gap-2">
                  
                  <input
                    type="time"
                    value={timeFilter.end}
                    onChange={(e) => setTimeFilter({ ...timeFilter, end: e.target.value })}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                  />
                  <span className="text-slate-500">עד</span>
                  <input
                    type="time"
                    value={timeFilter.start}
                    onChange={(e) => setTimeFilter({ ...timeFilter, start: e.target.value })}
                    className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                  />
                  
                  {(timeFilter.start || timeFilter.end) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTimeFilter({ start: '', end: '' })}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      נקה
                    </Button>
                  )}
                </div>
                {timeFilter.start && timeFilter.end && (
                  <span className="text-xs text-emerald-600 font-medium">
                    מציג {filteredKeys.length} כיתות זמינות
                  </span>
                )}
              </div>
            </div>

            {/* Keys Grid */}
            {keysLoading ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) =>
              <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
              )}
              </div> :
            filteredKeys.length === 0 ?
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין מפתחות עדיין</h3>
                <p className="text-slate-400 mb-4">הוסף את המפתח הראשון שלך כדי להתחיל</p>
              </div> :

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir="rtl">
                <AnimatePresence>
                  {filteredKeys.map((key) =>
                <KeyCard
                  key={key.id}
                  keyItem={key}
                  crews={crews}
                  currentUser={user}
                  currentHolder={getCurrentHolder(key.room_number)}
                  isAvailableInTimeRange={isKeyAvailableInTimeRange(key)}
                  timeFilterActive={!!(timeFilter.start && timeFilter.end)}
                  onCheckout={(key) => {
                    setCheckoutKey({ 
                      ...key, 
                      prefilledTimes: timeFilter.start && timeFilter.end ? timeFilter : null 
                    });
                  }}
                  onReturn={handleReturn} />

                )}
                </AnimatePresence>
              </div>
            }
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            {queue.length === 0 ?
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין בקשות מיוחדות</h3>
                <Button onClick={() => setShowQueueModal(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף לתור
                </Button>
              </div> :

            <div className="space-y-3">
                <AnimatePresence>
                  {queue.map((item, index) =>
                <WaitingQueueCard
                  key={item.id}
                  item={item}
                  position={index + 1}
                  onRemove={() => removeFromQueueMutation.mutate(item.id)}
                  onMoveUp={handleMoveUp} />

                )}
                </AnimatePresence>
              </div>
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CheckoutModal
        open={!!checkoutKey}
        onClose={() => setCheckoutKey(null)}
        keyItem={checkoutKey}
        crews={filteredCrews}
        squads={filteredSquads}
        currentUser={user}
        onConfirm={handleCheckout} />


      <AddToQueueModal
        open={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        crews={filteredCrews}
        squads={filteredSquads}
        currentUser={user}
        onConfirm={(data) => addToQueueMutation.mutate(data)} />

    </div>);

}