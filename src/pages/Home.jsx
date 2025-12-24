import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from "@/components/ui/card";
import { Key, Calendar, Users, ArrowLeft, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const features = [
    {
      title: 'ניהול כיתות',
      description: 'ניהול מפתחות, הקצאת חדרים ולוח זמנים',
      icon: Key,
      path: 'Dashboard',
      color: 'bg-indigo-500',
      available: true
    },
    {
      title: 'ניהול אירועים',
      description: 'תכנון וניהול אירועים ופעילויות',
      icon: Calendar,
      path: null,
      color: 'bg-blue-500',
      available: false
    },
    {
      title: 'ניהול משימות',
      description: 'מעקב אחרי משימות ותהליכים',
      icon: Users,
      path: null,
      color: 'bg-purple-500',
      available: false
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  // Check if user has positions assigned
  const hasPositions = user?.positions && user.positions.length > 0;

  // If no positions - show waiting message
  if (!hasPositions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <Card className="p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              ממתין להרשאות
            </h1>
            <p className="text-slate-600 mb-4">
              שלום {user?.onboarding_full_name || user?.full_name}
            </p>
            <p className="text-slate-500 leading-relaxed">
              חשבונך נוצר בהצלחה, אך עדיין לא הוקצו לך תפקידים במערכת.
              <br />
              <br />
              אנא המתן עד שמנהל המערכת יקצה לך תפקיד ויאפשר לך גישה לפונקציות השונות.
            </p>
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                💡 נא לפנות למנהל המערכת להקצאת תפקיד
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b00a201212578d09f8396/135b53ec8_2.png" 
            alt="מגדלור לוגו" 
            className="w-24 h-24 object-contain mx-auto mb-6" 
          />
          <h1 className="text-4xl font-bold text-slate-800 mb-3">
            ברוך הבא למגדלור 👋
          </h1>
          {user && (
            <p className="text-lg text-slate-600">
              שלום {user.onboarding_full_name || user.full_name}
            </p>
          )}
          <p className="text-slate-500 mt-2">בחר את הפונקציה שאתה רוצה להשתמש בה</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {feature.available ? (
                <Link to={createPageUrl(feature.path)}>
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-slate-200">
                    <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 mb-4">{feature.description}</p>
                    <div className="flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
                      <span>כניסה</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </Card>
                </Link>
              ) : (
                <Card className="p-6 h-full border-slate-200 opacity-60 cursor-not-allowed">
                  <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4 opacity-50`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 mb-4">{feature.description}</p>
                  <div className="flex items-center gap-2 text-slate-400 font-medium">
                    <span>בקרוב...</span>
                  </div>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}