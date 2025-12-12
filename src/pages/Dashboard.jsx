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
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => base44.entities.ClassroomKey.list(),
  });

  const { data: crews = [] } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list(),
  });

  const { data: queue = [] } = useQuery({
    queryKey: ['queue'],
    queryFn: () => base44.entities.WaitingQueue.list('priority'),
  });

  const updateKeyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassroomKey.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      toast.success('מפתח עודכן בהצלחה');
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: (data) => base44.entities.WaitingQueue.create({
      ...data,
      priority: queue.length + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      setShowQueueModal(false);
      toast.success('נוסף לתור המתנה');
    },
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: (id) => base44.entities.WaitingQueue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('הוסר מהתור');
    },
  });

  const handleCheckout = (key, holderName) => {
    updateKeyMutation.mutate({
      id: key.id,
      data: {
        status: 'taken',
        current_holder: holderName,
        checkout_time: new Date().toISOString(),
        checked_out_by: user?.email,
      },
    });
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
        checked_out_by: null,
      },
    });
  };

  const handleMoveUp = async (item) => {
    const currentIndex = queue.findIndex(q => q.id === item.id);
    if (currentIndex > 0) {
      const prevItem = queue[currentIndex - 1];
      await base44.entities.WaitingQueue.update(item.id, { priority: prevItem.priority });
      await base44.entities.WaitingQueue.update(prevItem.id, { priority: item.priority });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    }
  };

  const filteredKeys = filter === 'all' 
    ? keys 
    : keys.filter(k => k.room_type === filter);

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
            ניהול מפתחות 🔑
          </h1>
        </motion.div>

        {/* Stats */}
        <StatsBar keys={keys} queueCount={queue.length} />

        {/* Main Content */}
        <Tabs defaultValue="keys" className="space-y-6">
<div className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
            <TabsTrigger value="queue" className="data-[state=active]:bg-slate-100">
                תור ({queue.length})
                <Clock className="w-4 h-4 ml-2" />
              </TabsTrigger>
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger value="keys" className="data-[state=active]:bg-slate-100">
                מפתחות
                <Key className="w-4 h-4 ml-2" />
              </TabsTrigger>
              
            </TabsList>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQueueModal(true)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                הוסף לתור
                <Plus className="w-4 h-4 mr-2" />

              </Button>
            </div>
          </div>

          <TabsContent value="keys" className="space-y-6">
            {/* Filter */}
            <div className="flex flex-row-reverse items-center gap-2">

              <span className="text-sm text-slate-500">:סנן</span>
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="flex flex-row-reverse gap-2">
                {['all', 'צוותי', 'פלוגתי'].map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className={filter === f ? 'bg-slate-800' : ''}
                  >
                    {f === 'all' ? 'הכל' : f === 'צוותי' ? '🏠 צוותי' : '🏢 פלוגתי'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Keys Grid */}
            {keysLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין מפתחות עדיין</h3>
                <p className="text-slate-400 mb-4">הוסף את המפתח הראשון שלך כדי להתחיל</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" dir="rtl">
                <AnimatePresence>
                  {filteredKeys.map((key) => (
                    <KeyCard
                      key={key.id}
                      keyItem={key}
                      crews={crews}
                      currentUser={user}
                      onCheckout={setCheckoutKey}
                      onReturn={handleReturn}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="queue" className="space-y-4">
            {queue.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">התור ריק</h3>
                <p className="text-slate-400 mb-4">אין צוותים ממתינים למפתחות כרגע</p>
                <Button onClick={() => setShowQueueModal(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף לתור
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {queue.map((item, index) => (
                    <WaitingQueueCard
                      key={item.id}
                      item={item}
                      position={index + 1}
                      onRemove={() => removeFromQueueMutation.mutate(item.id)}
                      onMoveUp={handleMoveUp}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CheckoutModal
        open={!!checkoutKey}
        onClose={() => setCheckoutKey(null)}
        keyItem={checkoutKey}
        crews={crews}
        onConfirm={handleCheckout}
      />

      <AddToQueueModal
        open={showQueueModal}
        onClose={() => setShowQueueModal(false)}
        crews={crews}
        onConfirm={(data) => addToQueueMutation.mutate(data)}
      />
    </div>
  );
}