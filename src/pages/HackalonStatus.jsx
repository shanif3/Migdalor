import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Presentation, Download, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HackalonStatus() {
  const [user, setUser] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [userPermissions, setUserPermissions] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);

        // Load user permissions
        if (u.positions && u.positions.length > 0) {
          const allPermissions = await base44.entities.PositionPermission.list();
          const userPositionPerms = allPermissions.filter(p => u.positions.includes(p.position_name));
          const mergedPerms = {
            pages_access: [...new Set(userPositionPerms.flatMap(p => p.pages_access || []))]
          };
          setUserPermissions(mergedPerms);
        }
      } catch (error) {}
    };
    loadUserData();
  }, []);

  const isAdmin = user?.role === 'admin';
  const allowedPositions = ['מפק״ץ', 'מנהל האקתון'];
  const hasAllowedPosition = user?.positions?.some(pos => allowedPositions.includes(pos));
  const hasAccess = isAdmin || hasAllowedPosition;

  const { data: departments = [] } = useQuery({
    queryKey: ['hackalon-departments'],
    queryFn: () => base44.entities.HackalonDepartment.list('order'),
    enabled: hasAccess
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['hackalon-teams'],
    queryFn: () => base44.entities.HackalonTeam.list('order'),
    enabled: hasAccess
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['hackalon-submissions'],
    queryFn: () => base44.entities.HackalonSubmission.list(),
    enabled: hasAccess
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-600">אין לך הרשאה לצפות בעמוד זה</p>
        </Card>
      </div>
    );
  }

  const getSubmission = (teamName, type) => {
    return submissions.find(s => s.team_name === teamName && s.submission_type === type);
  };

  const getStats = () => {
    const totalTeams = teams.length;
    const teamsWithSpec = new Set(submissions.filter(s => s.submission_type === 'specification').map(s => s.team_name)).size;
    const teamsWithPres1 = new Set(submissions.filter(s => s.submission_type === 'presentation1').map(s => s.team_name)).size;
    const teamsWithPres2 = new Set(submissions.filter(s => s.submission_type === 'presentation2').map(s => s.team_name)).size;
    
    const teamsWithoutSpec = totalTeams - teamsWithSpec;
    const teamsWithoutPres1 = totalTeams - teamsWithPres1;
    const teamsWithoutPres2 = totalTeams - teamsWithPres2;

    return { totalTeams, teamsWithSpec, teamsWithPres1, teamsWithPres2, teamsWithoutSpec, teamsWithoutPres1, teamsWithoutPres2 };
  };

  const stats = getStats();

  const getDeptStats = (deptName) => {
    const deptTeams = teams.filter(t => t.department_name === deptName);
    const deptTotal = deptTeams.length;
    const deptSpec = deptTeams.filter(t => getSubmission(t.name, 'specification')).length;
    const deptPres1 = deptTeams.filter(t => getSubmission(t.name, 'presentation1')).length;
    const deptPres2 = deptTeams.filter(t => getSubmission(t.name, 'presentation2')).length;
    return { deptTotal, deptSpec, deptPres1, deptPres2 };
  };

  const shouldShowTeam = (team) => {
    if (filterType === 'all') return true;
    if (filterType === 'with-spec') return !!getSubmission(team.name, 'specification');
    if (filterType === 'no-spec') return !getSubmission(team.name, 'specification');
    if (filterType === 'with-pres1') return !!getSubmission(team.name, 'presentation1');
    if (filterType === 'no-pres1') return !getSubmission(team.name, 'presentation1');
    if (filterType === 'with-pres2') return !!getSubmission(team.name, 'presentation2');
    if (filterType === 'no-pres2') return !getSubmission(team.name, 'presentation2');
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            📊 תמונת מצב - HackAlon
          </h1>
          <p className="text-slate-500">מעקב אחר העלאות והגשות של הצוותים</p>
        </motion.div>

        {/* Stats with filters */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Specification */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                מסמך איפיון
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'with-spec' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-50 border-green-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'with-spec' ? 'all' : 'with-spec')}
                >
                  <p className="text-xs text-green-600">עם מסמך</p>
                  <p className="text-xl font-bold text-green-700">{stats.teamsWithSpec}</p>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'no-spec' ? 'ring-2 ring-red-500 bg-red-50' : 'bg-red-50 border-red-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'no-spec' ? 'all' : 'no-spec')}
                >
                  <p className="text-xs text-red-600">ללא מסמך</p>
                  <p className="text-xl font-bold text-red-700">{stats.teamsWithoutSpec}</p>
                </Card>
              </div>
            </div>

            {/* Presentation 1 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                מצגת 1
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'with-pres1' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-blue-50 border-blue-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'with-pres1' ? 'all' : 'with-pres1')}
                >
                  <p className="text-xs text-blue-600">עם מצגת</p>
                  <p className="text-xl font-bold text-blue-700">{stats.teamsWithPres1}</p>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'no-pres1' ? 'ring-2 ring-orange-500 bg-orange-50' : 'bg-orange-50 border-orange-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'no-pres1' ? 'all' : 'no-pres1')}
                >
                  <p className="text-xs text-orange-600">ללא מצגת</p>
                  <p className="text-xl font-bold text-orange-700">{stats.teamsWithoutPres1}</p>
                </Card>
              </div>
            </div>

            {/* Presentation 2 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                מצגת 2
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'with-pres2' ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-purple-50 border-purple-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'with-pres2' ? 'all' : 'with-pres2')}
                >
                  <p className="text-xs text-purple-600">עם מצגת</p>
                  <p className="text-xl font-bold text-purple-700">{stats.teamsWithPres2}</p>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer transition-all ${filterType === 'no-pres2' ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-amber-50 border-amber-200 hover:shadow-md'}`}
                  onClick={() => setFilterType(filterType === 'no-pres2' ? 'all' : 'no-pres2')}
                >
                  <p className="text-xs text-amber-600">ללא מצגת</p>
                  <p className="text-xl font-bold text-amber-700">{stats.teamsWithoutPres2}</p>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        {/* Departments and Teams Status */}
        <div className="space-y-6">
          {departments.map((dept, index) => {
            const deptTeams = teams.filter(t => t.department_name === dept.name);
            const visibleTeams = deptTeams.filter(shouldShowTeam);
            const deptStats = getDeptStats(dept.name);
            
            if (visibleTeams.length === 0 && filterType !== 'all') return null;
            
            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{dept.name}</h3>
                      <p className="text-sm text-slate-500">כיתה {dept.classroom_number || 'לא הוגדר'}</p>
                    </div>
                    
                    {/* Department Stats */}
                    <div className="flex gap-3 text-sm">
                      <div className="text-center px-3 py-1 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">מסמכי איפיון</p>
                        <p className="font-bold text-green-700">{deptStats.deptSpec}/{deptStats.deptTotal}</p>
                      </div>
                      <div className="text-center px-3 py-1 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">מצגת 1</p>
                        <p className="font-bold text-blue-700">{deptStats.deptPres1}/{deptStats.deptTotal}</p>
                      </div>
                      <div className="text-center px-3 py-1 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600">מצגת 2</p>
                        <p className="font-bold text-purple-700">{deptStats.deptPres2}/{deptStats.deptTotal}</p>
                      </div>
                    </div>
                  </div>
                  
                  {visibleTeams.length > 0 ? (
                    <div className="space-y-3">
                      {visibleTeams.map(team => {
                        const specSubmission = getSubmission(team.name, 'specification');
                        const pres1Submission = getSubmission(team.name, 'presentation1');
                        const pres2Submission = getSubmission(team.name, 'presentation2');
                        
                        return (
                          <Card key={team.id} className="p-4 bg-slate-50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-800">{team.name}</h4>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Specification */}
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-5 h-5 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium">מסמך איפיון</p>
                                    {specSubmission && (
                                      <p className="text-xs text-slate-500">{specSubmission.uploaded_by}</p>
                                    )}
                                  </div>
                                </div>
                                {specSubmission ? (
                                  <a href={specSubmission.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                )}
                              </div>

                              {/* Presentation 1 */}
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-2">
                                  <Presentation className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="text-sm font-medium">מצגת 1</p>
                                    {pres1Submission && (
                                      <p className="text-xs text-slate-500">{pres1Submission.uploaded_by}</p>
                                    )}
                                  </div>
                                </div>
                                {pres1Submission ? (
                                  <a href={pres1Submission.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                )}
                              </div>

                              {/* Presentation 2 */}
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-2">
                                  <Presentation className="w-5 h-5 text-purple-600" />
                                  <div>
                                    <p className="text-sm font-medium">מצגת 2</p>
                                    {pres2Submission && (
                                      <p className="text-xs text-slate-500">{pres2Submission.uploaded_by}</p>
                                    )}
                                  </div>
                                </div>
                                {pres2Submission ? (
                                  <a href={pres2Submission.file_url} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="ghost">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </a>
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400" />
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">אין צוותים במדור זה</p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}