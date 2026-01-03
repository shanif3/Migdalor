import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, Lightbulb, Loader2, Shield } from 'lucide-react';

import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HackalonManageProblems() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [problemForm, setProblemForm] = useState({ 
    name: '', 
    intro: '', 
    objective: '', 
    requirements: '',
    template_url: '',
    deadline: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  const { data: departments = [] } = useQuery({
    queryKey: ['hackalon-departments'],
    queryFn: () => base44.entities.HackalonDepartment.list('order'),
    enabled: isAdmin
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['hackalon-teams'],
    queryFn: () => base44.entities.HackalonTeam.list('order'),
    enabled: isAdmin
  });

  const updateProblemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HackalonTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-teams'] });
      setShowModal(false);
      setSelectedTeam(null);
      setProblemForm({ name: '', intro: '', objective: '', requirements: '', template_url: '', deadline: '' });
      toast.success('הבעיה עודכנה בהצלחה');
    }
  });

  const handleEditProblem = (team) => {
    setSelectedTeam(team);
    setProblemForm({
      name: team.problem_name || '',
      intro: team.problem_intro || '',
      objective: team.problem_objective || '',
      requirements: team.problem_requirements || '',
      template_url: team.specification_template_url || '',
      deadline: team.specification_deadline ? new Date(team.specification_deadline).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };



  const handleSaveProblem = () => {
    if (!selectedTeam) return;
    
    updateProblemMutation.mutate({
      id: selectedTeam.id,
      data: {
        problem_name: problemForm.name,
        problem_intro: problemForm.intro,
        problem_objective: problemForm.objective,
        problem_requirements: problemForm.requirements,
        specification_template_url: problemForm.template_url || null,
        specification_deadline: problemForm.deadline ? new Date(problemForm.deadline).toISOString() : null
      }
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">אין הרשאת גישה</h2>
          <p className="text-slate-600">רק מנהלי מערכת יכולים לנהל בעיות</p>
        </Card>
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
            🎯 ניהול בעיות HackAlon
          </h1>
          <p className="text-slate-500">הגדרת בעיות לכל צוות</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-sm text-slate-500">סה״כ צוותים</p>
            <p className="text-2xl font-bold text-slate-800">{teams.length}</p>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <p className="text-sm text-green-600">צוותים עם בעיה מוגדרת</p>
            <p className="text-2xl font-bold text-green-700">{teams.filter(t => t.problem_name).length}</p>
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
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{dept.name}</h3>
                  
                  {deptTeams.length > 0 ? (
                    <div className="space-y-3">
                      {deptTeams.map(team => (
                        <Card key={team.id} className="p-4 bg-slate-50 border-slate-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-800 mb-2">{team.name}</h4>
                              
                              {team.problem_name ? (
                                <div>
                                  <p className="text-sm text-slate-700">{team.problem_name}</p>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 italic">אין בעיה מוגדרת</p>
                              )}
                            </div>
                            
                            <Button size="sm" onClick={() => handleEditProblem(team)} className="mr-4">
                              <Edit2 className="w-4 h-4 ml-2" />
                              {team.problem_name ? 'ערוך' : 'הגדר בעיה'}
                            </Button>
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
        </div>

        {/* Edit Problem Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent dir="rtl" className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-right">הגדרת בעיה - {selectedTeam?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Template Upload Section */}
              <div className="border-b pb-4">
                <Label className="text-base font-semibold mb-2 block">טמפלייט למסמך איפיון</Label>
                <p className="text-xs text-slate-500 mb-2">העלה קובץ שהצוערים יכולים להוריד ולמלא</p>
                <input
                  type="file"
                  id="template-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                      const { file_url } = await base44.integrations.Core.UploadFile({ file });
                      setProblemForm({...problemForm, template_url: file_url});
                      toast.success('הטמפלייט הועלה בהצלחה');
                    } catch (error) {
                      toast.error('שגיאה בהעלאת הטמפלייט');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <label htmlFor="template-upload">
                    <Button type="button" asChild variant="outline">
                      <span>העלה טמפלייט</span>
                    </Button>
                  </label>
                  {problemForm.template_url && (
                    <a href={problemForm.template_url} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline">צפה בטמפלייט הנוכחי</Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Deadline Section */}
              <div className="border-b pb-4">
                <Label className="text-base font-semibold mb-2 block">דדליין להגשת מסמך איפיון</Label>
                <Input
                  type="datetime-local"
                  value={problemForm.deadline || ''}
                  onChange={(e) => setProblemForm({...problemForm, deadline: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-base font-semibold mb-2 block">שם הבעיה</Label>
                <Input 
                  value={problemForm.name}
                  onChange={(e) => setProblemForm({...problemForm, name: e.target.value})}
                  placeholder="הזן שם לבעיה"
                />
              </div>

              <div className="border-t pt-4 space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-2 block">מבוא</Label>
                  <p className="text-xs text-slate-500 mb-2">הצג את ההקשר והרקע לבעיה</p>
                  <Textarea 
                    value={problemForm.intro}
                    onChange={(e) => setProblemForm({...problemForm, intro: e.target.value})}
                    placeholder="הזן מבוא"
                    rows={6}
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">מטרת המוצר</Label>
                  <p className="text-xs text-slate-500 mb-2">מה המוצר אמור להשיג ולמי הוא מיועד</p>
                  <Textarea 
                    value={problemForm.objective}
                    onChange={(e) => setProblemForm({...problemForm, objective: e.target.value})}
                    placeholder="הזן מטרה"
                    rows={6}
                  />
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">דרישות מרכזיות</Label>
                  <p className="text-xs text-slate-500 mb-2">פרט את הדרישות והפיצ׳רים העיקריים</p>
                  <Textarea 
                    value={problemForm.requirements}
                    onChange={(e) => setProblemForm({...problemForm, requirements: e.target.value})}
                    placeholder="הזן דרישות"
                    rows={6}
                  />
                </div>
              </div>

              <div className="flex gap-2 sticky bottom-0 bg-white pt-4 border-t">
                <Button onClick={handleSaveProblem} className="flex-1">שמור</Button>
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}