import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Users, Briefcase, LogOut, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b00a201212578d09f8396/135b53ec8_2.png" 
                alt="מגדלור לוגו" 
                className="w-12 h-12 object-contain" 
              />
              <h2 className="text-lg font-semibold text-slate-800">אזור אישי</h2>
            </div>

            {user && (
              <div className="flex items-center gap-3">
                {/* Back to Home Button */}
                <Link to={createPageUrl('Home')}>
                  <Button variant="outline" className="text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                    <Home className="w-4 h-4 ml-2" />
                    חזרה לדף הבית
                  </Button>
                </Link>

                {/* Logout Button */}
                <Button
                  onClick={() => base44.auth.logout()}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <LogOut className="w-4 h-4 ml-2" />
                  התנתק
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            האזור האישי שלי 👤
          </h1>
          <p className="text-slate-500">הפרטים האישיים שלך במערכת</p>
        </motion.div>

        <Card className="p-6 border-slate-200">
          <div className="space-y-6">
            {/* Name */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">שם מלא</p>
                <p className="text-lg font-semibold text-slate-800">
                  {user?.full_name || 'לא הוגדר'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">אימייל</p>
                <p className="text-lg font-semibold text-slate-800">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">תפקיד במערכת</p>
                <p className="text-lg font-semibold text-slate-800">
                  {user?.role === 'admin' ? '👑 מנהל' : '👤 משתמש'}
                </p>
              </div>
            </div>

            {/* Platoon */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">פלוגה</p>
                <p className="text-lg font-semibold text-slate-800">
                  {user?.platoon_name || '❌ לא הוגדר'}
                </p>
              </div>
            </div>

            {/* Squad */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">צוות</p>
                <p className="text-lg font-semibold text-slate-800">
                  {user?.squad_name || 'לא הוגדר'}
                </p>
              </div>
            </div>

            {/* Positions */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500">תפקידים</p>
                {user?.positions && user.positions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.positions.map((pos, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-amber-100 text-amber-700">
                        {pos}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-lg font-semibold text-slate-800">לא הוגדרו</p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}