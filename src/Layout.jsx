import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { Key, Users, Settings, LayoutDashboard, Calendar, Target, LogOut } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { name: 'לוח בקרה', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'הקצאת מפתחות', icon: Target, page: 'KeyAllocation' },
    { name: 'מפתחות', icon: Key, page: 'ManageKeys' },
    { name: 'צוותים', icon: Users, page: 'ManageCrews' },
  ];

  const userNavItems = [
    { name: 'לוח הזמנים שלי', icon: Calendar, page: 'MySchedule' },
    { name: 'מפתחות', icon: Key, page: 'ManageKeys' },
    { name: 'צוותים', icon: Users, page: 'ManageCrews' },
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl(isAdmin ? 'Dashboard' : 'MySchedule')} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b00a201212578d09f8396/135b53ec8_2.png" 
                alt="מגדלור לוגו" 
                className="w-12 h-12 object-contain" 
              />
              <div className="hidden sm:block">
                {user && (
                  <p className="text-xs text-slate-500">
                    {isAdmin ? 'מנהל 👑' : 'קה״ד פלוגתי 👤'}
                  </p>
                )}
              </div>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:block text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => base44.auth.logout()}
                  className="mr-2 text-slate-500 hover:text-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block mr-2">התנתק</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}