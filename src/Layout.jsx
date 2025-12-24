import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { Key, Users, Settings, LayoutDashboard, Calendar, Target, LogOut, ChevronDown, Shield, Briefcase } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(user => {
        setUser(user);
        // Redirect to onboarding if not completed
        if (!user.onboarding_completed && currentPageName !== 'Onboarding') {
          window.location.href = createPageUrl('Onboarding');
        }
        // Redirect to Home if no positions assigned and not admin (unless already on Home or Onboarding)
        else if ((!user.positions || user.positions.length === 0) && user.role !== 'admin' && currentPageName !== 'Home' && currentPageName !== 'Onboarding') {
          window.location.href = createPageUrl('Home');
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [currentPageName]);

  // Show loading while checking onboarding status
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  // Hide navigation for onboarding page
  if (currentPageName === 'Onboarding') {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { name: 'לוח בקרה', icon: LayoutDashboard, page: 'Dashboard', tooltip: 'לוח בקרה' },
    { name: 'הקצאת מפתחות', icon: Target, page: 'KeyAllocation', tooltip: 'הקצאה' },
    { name: 'מפתחות', icon: Key, page: 'ManageKeys', tooltip: 'מפתחות' },
    { name: 'Onboarding', icon: Users, page: 'Onboarding', tooltip: 'צפייה ב-Onboarding' },
  ];

  const userNavItems = [
    { name: 'לוח בקרה', icon: LayoutDashboard, page: 'Dashboard', tooltip: 'לוח בקרה' },
    { name: 'לוח הזמנים שלי', icon: Calendar, page: 'MySchedule', tooltip: 'לוח זמנים' },
    { name: 'מפתחות', icon: Key, page: 'ManageKeys', tooltip: 'מפתחות' },
    { name: 'אזור אישי', icon: Target, page: 'MyProfile', tooltip: 'אזור אישי' },
  ];

  const managementPages = isAdmin 
    ? ['ManageCrews', 'ManageSquads', 'ManageUsers', 'ManagePositions']
    : ['ManageCrews', 'ManageSquads'];

  const managementItems = isAdmin
    ? [
        { name: 'פלוגות', page: 'ManageCrews', icon: Shield },
        { name: 'צוותים', page: 'ManageSquads', icon: Users },
        { name: 'משתמשים', page: 'ManageUsers', icon: Settings },
        { name: 'תפקידים', page: 'ManagePositions', icon: Briefcase },
      ]
    : [
        { name: 'פלוגות', page: 'ManageCrews', icon: Shield },
        { name: 'צוותים', page: 'ManageSquads', icon: Users },
      ];

  const navItems = isAdmin ? adminNavItems : userNavItems;
  const isManagementPage = managementPages.includes(currentPageName);

  // Hide navigation for Home page
  if (currentPageName === 'Home') {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all group relative ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    title={item.tooltip}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:block text-sm font-medium">{item.name}</span>
                    {/* Mobile tooltip */}
                    <span className="sm:hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.tooltip}
                    </span>
                  </Link>
                );
              })}
              
              {/* Management Dropdown */}
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all group relative ${
                      isManagementPage
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                    title="ניהול"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:flex items-center gap-1 text-sm font-medium">
                      ניהול
                      <ChevronDown className="w-3 h-3" />
                    </span>
                    {/* Mobile tooltip */}
                    <span className="sm:hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      ניהול
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {managementItems.map((item) => (
                    <DropdownMenuItem key={item.page} asChild>
                      <Link 
                        to={createPageUrl(item.page)}
                        className={`cursor-pointer flex items-center gap-2 ${currentPageName === item.page ? 'bg-slate-100' : ''}`}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => base44.auth.logout()}
                  className="mr-2 text-slate-500 hover:text-slate-700 group relative"
                  title="התנתק"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block mr-2">התנתק</span>
                  {/* Mobile tooltip */}
                  <span className="sm:hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    התנתק
                  </span>
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