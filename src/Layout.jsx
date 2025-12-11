import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Key, Users, Settings, LayoutDashboard } from 'lucide-react';
import { Toaster } from "@/components/ui/sonner";

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    { name: 'Keys', icon: Key, page: 'ManageKeys' },
    { name: 'Crews', icon: Users, page: 'ManageCrews' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Key className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-800 hidden sm:block">
                KeyTracker
              </span>
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