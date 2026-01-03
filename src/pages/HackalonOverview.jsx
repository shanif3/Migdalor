import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Building2, Loader2, FileText, Presentation, Download, X, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HackalonOverview() {
  const [user, setUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
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

  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ['hackalon-departments'],
    queryFn: () => base44.entities.HackalonDepartment.list('order'),
    enabled: hasAccess
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['hackalon-teams'],
    queryFn: () => base44.entities.HackalonTeam.list('order'),
    enabled: hasAccess
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['hackalon-submissions'],
    queryFn: () => base44.entities.HackalonSubmission.list(),
    enabled: hasAccess
  });

  if (!user || depsLoading || teamsLoading) {
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

  const getTeamProgress = (teamName) => {
    const hasSpec = !!getSubmission(teamName, 'specification');
    const hasPres1 = !!getSubmission(teamName, 'presentation1');
    const hasPres2 = !!getSubmission(teamName, 'presentation2');
    return [hasSpec, hasPres1, hasPres2].filter(Boolean).length;
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowTeamModal(true);
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
                      <p className="text-sm text-slate-500">{deptTeams.length} צוותים • כיתה {dept.classroom_number || 'לא הוגדר'}</p>
                    </div>
                  </div>

                  {deptTeams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deptTeams.map(team => {
                        const progress = getTeamProgress(team.name);
                        return (
                          <Card 
                            key={team.id} 
                            className="p-4 bg-slate-50 border-slate-200 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => handleTeamClick(team)}
                          >
                            <div className="flex items-start gap-2 mb-3">
                              <Users className="w-5 h-5 text-purple-600 mt-1" />
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">{team.name}</p>
                              </div>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="flex gap-1 mt-2">
                              {[1, 2, 3].map((step) => (
                                <div 
                                  key={step}
                                  className={`h-2 flex-1 rounded-full ${
                                    step <= progress ? 'bg-green-500' : 'bg-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 text-center">{progress}/3 הועלו</p>
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

          {departments.length === 0 && (
            <Card className="p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">אין מדורים עדיין</h3>
              <p className="text-slate-400">צור מדורים וצוותים בדף השיבוץ</p>
            </Card>
          )}
        </div>

        {/* Team Details Modal */}
        <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
          <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTeam?.name}</span>
                <Button variant="ghost" size="icon" onClick={() => setShowTeamModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            {selectedTeam && (
              <div className="space-y-6">
                {/* Problem Definition */}
                {selectedTeam.problem_name && (
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">הבעיה</h3>
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-purple-600 mb-1">{selectedTeam.problem_name}</h4>
                      </div>
                      {selectedTeam.problem_intro && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-600 mb-1">מבוא</h5>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTeam.problem_intro}</p>
                        </div>
                      )}
                      {selectedTeam.problem_objective && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-600 mb-1">מטרת המוצר</h5>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTeam.problem_objective}</p>
                        </div>
                      )}
                      {selectedTeam.problem_requirements && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-600 mb-1">דרישות מרכזיות</h5>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedTeam.problem_requirements}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submissions */}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">מסמכים שהועלו</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Specification */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-medium">מסמך איפיון</p>
                          {getSubmission(selectedTeam.name, 'specification') && (
                            <p className="text-xs text-slate-500">
                              הועלה על ידי {getSubmission(selectedTeam.name, 'specification').uploaded_by}
                            </p>
                          )}
                        </div>
                      </div>
                      {getSubmission(selectedTeam.name, 'specification') ? (
                        <a href={getSubmission(selectedTeam.name, 'specification').file_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">
                            <Download className="w-4 h-4 ml-2" />
                            הורד
                          </Button>
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">לא הועלה</span>
                      )}
                    </div>

                    {/* Presentation 1 */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Presentation className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-medium">מצגת 1</p>
                          {getSubmission(selectedTeam.name, 'presentation1') && (
                            <p className="text-xs text-slate-500">
                              הועלה על ידי {getSubmission(selectedTeam.name, 'presentation1').uploaded_by}
                            </p>
                          )}
                        </div>
                      </div>
                      {getSubmission(selectedTeam.name, 'presentation1') ? (
                        <a href={getSubmission(selectedTeam.name, 'presentation1').file_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">
                            <Download className="w-4 h-4 ml-2" />
                            הורד
                          </Button>
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">לא הועלה</span>
                      )}
                    </div>

                    {/* Presentation 2 */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Presentation className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="font-medium">מצגת 2</p>
                          {getSubmission(selectedTeam.name, 'presentation2') && (
                            <p className="text-xs text-slate-500">
                              הועלה על ידי {getSubmission(selectedTeam.name, 'presentation2').uploaded_by}
                            </p>
                          )}
                        </div>
                      </div>
                      {getSubmission(selectedTeam.name, 'presentation2') ? (
                        <a href={getSubmission(selectedTeam.name, 'presentation2').file_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">
                            <Download className="w-4 h-4 ml-2" />
                            הורד
                          </Button>
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">לא הועלה</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}