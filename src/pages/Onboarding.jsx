import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [squadName, setSquadName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((user) => {
      setUser(user);
      setFullName(user.full_name || '');

      // If already completed onboarding and not admin, redirect
      if (user.onboarding_completed && user.role !== 'admin') {
        window.location.href = createPageUrl('Dashboard');
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list('order')
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Update all fields via User entity (includes both built-in and custom)
      await base44.entities.User.update(user.id, {
        full_name: data.full_name,
        squad_name: data.squad_name,
        platoon_name: data.platoon_name,
        phone_number: data.phone_number,
        onboarding_completed: data.onboarding_completed
      });
    },
    onSuccess: () => {
      toast.success('פרטים נשמרו בהצלחה!');
      setTimeout(() => {
        window.location.href = createPageUrl('Dashboard');
      }, 1000);
    },
    onError: () => {
      toast.error('שגיאה בשמירת הפרטים');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!fullName.trim() || !squadName || !phoneNumber.trim()) {
      toast.error('אנא מלא את כל השדות');
      return;
    }

    // Get platoon from squad
    const selectedSquad = squads.find((s) => s.squad_number === squadName);
    const platoonName = selectedSquad?.platoon_name || '';

    updateMutation.mutate({
      full_name: fullName.trim(),
      squad_name: squadName,
      platoon_name: platoonName,
      phone_number: phoneNumber.trim(),
      onboarding_completed: true
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">

        <Card className="p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">צוער יקר, ברוך הבא למגדלור 👋

            </h1>
            <p className="text-slate-500">
              בבקשה השלם את הפרטים הבאים
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50 text-slate-600" />

            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label>שם מלא *</Label>
              <Input
                type="text"
                placeholder="הכנס שם מלא בעברית"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-right"
                required />

            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>מספר טלפון *</Label>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="05X-XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="text-right"
                required />

            </div>

            {/* Squad Selection */}
            <div className="space-y-2">
              <Label>צוות *</Label>
              <select
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-right"
                required>

                <option value="">בחר צוות...</option>
                {squads.map((squad) =>
                <option key={squad.id} value={squad.squad_number}>
                    {squad.squad_number} {squad.platoon_name ? `(${squad.platoon_name})` : ''}
                  </option>
                )}
              </select>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={updateMutation.isPending}>

              {updateMutation.isPending ?
              <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שומר...
                </> :

              'המשך למגדלור'
              }
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>);

}