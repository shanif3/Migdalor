import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Users, Building2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HackalonOverview() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ['hackalon-departments'],
    queryFn: () => base44.entities.HackalonDepartment.list('order')
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['hackalon-teams'],
    queryFn: () => base44.entities.HackalonTeam.list('order')
  });

  if (!user || depsLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            💡 HackAlon - סקירה כללית
          </h1>
          <p className="text-slate-500">מדורים, צוותים ומיקומים</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-600">סה״כ מדורים</p>
            <p className="text-2xl font-bold text-blue-700">{departments.length}</p>
          </Card>
          <Card className="p-4 bg-purple-50 border-purple-200">
            <p className="text-sm text-purple-600">סה״כ צוותים</p>
            <p className="text-2xl font-bold text-purple-700">{teams.length}</p>
          </Card>
        </div>

        {/* Departments and Teams */}
        <div className="space-y-6">
          {departments.map((dept, index) => {
            const deptTeams = teams.filter(t => t.department_name === dept.name);
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{dept.name}</h3>
                      <p className="text-sm text-slate-500">{deptTeams.length} צוותים</p>
                    </div>
                  </div>

                  {deptTeams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deptTeams.map(team => (
                        <Card key={team.id} className="p-4 bg-slate-50 border-slate-200">
                          <div className="flex items-start gap-2">
                            <Users className="w-5 h-5 text-purple-600 mt-1" />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">{team.name}</p>
                              {team.classroom_number && (
                                <p className="text-sm text-slate-600 mt-1">
                                  📍 כיתה {team.classroom_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">אין צוותים במדור זה</p>
                  )}
                </Card>
              </motion.div>
            );
          })}

          {departments.length === 0 && (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">אין מדורים עדיין</h3>
              <p className="text-slate-400">צור מדורים וצוותים בדף השיבוץ</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}