import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, Calendar, Users, UserPen, ArrowLeft, Shield, Settings, LogOut, Lightbulb, Sparkles } from 'lucide-react';

import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);

        // Load user permissions based on positions
        if (u.positions && u.positions.length > 0) {
          const allPermissions = await base44.entities.PositionPermission.list();
          const userPositionPerms = allPermissions.filter((p) =>
          u.positions.includes(p.position_name)
          );

          // Merge all permissions
          const mergedPerms = {
            has_classroom_management_access: userPositionPerms.some((p) => p.has_classroom_management_access),
            pages_access: [...new Set(userPositionPerms.flatMap((p) => p.pages_access || []))]
          };

          setUserPermissions(mergedPerms);
        }

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const isAdmin = user?.role === 'admin';

  // Get first accessible page for classroom management
  const getFirstAccessiblePage = () => {
    if (isAdmin) return 'Dashboard';

    if (!userPermissions?.has_classroom_management_access) return null;

    const pageOrder = ['Dashboard', 'DailyOverview', 'MySchedule', 'ManageKeys', 'KeyAllocation', 'ManageCrews', 'ManageSquads'];
    const accessiblePage = pageOrder.find((page) => userPermissions.pages_access.includes(page));

    return accessiblePage || null;
  };

  const classroomPath = getFirstAccessiblePage();

  const features = [
  {
    title: 'ניהול כיתות',
    description: 'ניהול מפתחות, הקצאת חדרים ולוח זמנים',
    icon: Key,
    path: classroomPath,
    color: 'bg-indigo-500',
    available: !!classroomPath
  },
  {
    title: 'HackAlon',
    description: 'ניהול האקאלון, מחזור 2',
    icon: Lightbulb,
    path: 'HackalonSchedule',
    color: 'bg-blue-500',
    available: true
  },
  {
    title: 'המוצר שלכם יהיה ממש כאן!',
    description: 'וכאן התיאור שלו...',
    icon: Sparkles,
    path: null,
    color: 'bg-purple-500',
    available: false
  }];


  const adminFeatures = [
  {
    title: 'ניהול משתמשים',
    description: 'צפייה ועריכת משתמשים במערכת',
    icon: Settings,
    path: 'ManageUsers',
    available: isAdmin
  }];


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>);

  }

  const hasPositions = user?.positions && user.positions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b00a201212578d09f8396/9732960ed_8.png"

                alt="מגדלור לוגו"
                className="w-12 h-12 object-contain" />

              <h2 className="text-lg font-semibold text-slate-800"></h2>
            </Link>


            {user &&
            <div className="flex items-center gap-3">
                {/* My Profile Button */}
                <Link to={createPageUrl('MyProfile')}>
                  <Button variant="outline" className="text-slate-700 hover:text-slate-900 hover:bg-slate-50">
                    <UserPen className="w-4 h-4 ml-2" />
                  </Button>
                </Link>

                {/* Logout Button */}
                <Button
                onClick={() => base44.auth.logout()}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">

                  <LogOut className="w-4 h-4 ml-2" />
                  
                </Button>
              </div>
            }
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12">

          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b00a201212578d09f8396/9732960ed_8.png"
            alt="מגדלור לוגו"
            className="w-24 h-24 object-contain mx-auto mb-6" />

          <h1 className="text-4xl font-bold text-slate-800 mb-3">
           שלום {user.onboarding_full_name || user.full_name} 👋
           
          </h1>
          {user &&
          <p className="text-lg text-slate-600">
             מגדלור, כאן בשבילך 🙂
            </p>
          }
          <p className="text-slate-500 mt-2">״כשהאור תמיד דולק, הדרך ברורה.״</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) =>
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}>

              {feature.available ?
            <Link to={createPageUrl(feature.path)}>
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-slate-200">
                    <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                      {feature.title}
                    </h3>                  
                    <p className="text-slate-600 mb-4">{feature.description}</p>
                    <div className="flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all"> <span>כניסה</span> <ArrowLeft className="w-4 h-4" /> </div>

                  </Card>
                </Link> :

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
            }
            </motion.div>
          )}
        </div>

        {/* Admin Section */}
        {isAdmin &&
        <div className="mt-12">
            <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-slate-800 mb-6">

              🛡️ אזור מנהל
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminFeatures.map((feature, index) =>
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}>

                  <Link to={createPageUrl(feature.path)}>
                    <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full border-2 border-blue-200 hover:border-blue-300 bg-blue-50/30">
                      <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <feature.icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600 mb-4">{feature.description}</p>
                      <div className="flex items-center gap-2 text-blue-600 font-medium group-hover:gap-3 transition-all">
                        <span>כניסה</span>
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
            )}
            </div>
          </div>
        }
      </div>
    </div>);

}