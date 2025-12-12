import React from 'react';
import { Key, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatsBar({ keys, queueCount }) {
  const availableKeys = keys.filter(k => k.status === 'available').length;
  const takenKeys = keys.filter(k => k.status === 'taken').length;
  const smallKeys = keys.filter(k => k.room_type === 'צוותי');
  const largeKeys = keys.filter(k => k.room_type === 'פלוגתי');

  const stats = [
    {
      label: 'זמינים',
      value: availableKeys,
      total: keys.length,
      icon: Key,
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'בשימוש',
      value: takenKeys,
      total: keys.length,
      icon: Users,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      label: 'ממתינים',
      value: queueCount,
      icon: Clock,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm"
        >
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                {stat.total && (
                  <span className="text-slate-400 text-lg">{stat.total} /</span>
                )}
                <span className="text-3xl font-bold text-slate-800">{stat.value}</span>
              </div>
            </div>
            <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}