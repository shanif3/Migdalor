import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Presentation, Users, MapPin, Lightbulb, Loader2, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HackalonTeamArea() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const queryClient = useQueryClient();

  const { data: teamInfo, isLoading: teamLoading } = useQuery({
    queryKey: ['hackalon-team-info', user?.hackalon_team],
    queryFn: async () => {
      const teams = await base44.entities.HackalonTeam.list();
      return teams.find((t) => t.name === user.hackalon_team);
    },
    enabled: !!user?.hackalon_team
  });

  // Auto-assign user if name matches team member list
  useEffect(() => {
    const autoAssign = async () => {
      if (!user) return;

      const userName = (user.onboarding_full_name || user.full_name || '').trim().toLowerCase();
      if (!userName) return;

      try {
        const allTeams = await base44.entities.HackalonTeam.list();
        const matchingTeam = allTeams.find((team) =>
        team.member_names?.some((name) => name.trim().toLowerCase() === userName)
        );

        // Check if current team/department still exists
        const currentTeamExists = user.hackalon_team ?
        allTeams.some((t) => t.name === user.hackalon_team) : false;

        // If assigned team was deleted - remove assignment
        if (user.hackalon_team && !currentTeamExists) {
          await base44.entities.User.update(user.id, {
            hackalon_team: null,
            hackalon_department: null
          });

          const updatedUser = await base44.auth.me();
          setUser(updatedUser);
          toast.info('הצוות שלך נמחק - הוסרת מהשיבוץ');
          return;
        }

        // If name matches a team but user isn't assigned - assign them
        if (matchingTeam && user.hackalon_team !== matchingTeam.name) {
          await base44.entities.User.update(user.id, {
            hackalon_team: matchingTeam.name,
            hackalon_department: matchingTeam.department_name
          });

          const updatedUser = await base44.auth.me();
          setUser(updatedUser);
          toast.success(`שובצת אוטומטית לצוות ${matchingTeam.name}`);
        }

        // If name doesn't match current team - remove assignment
        if (!matchingTeam && user.hackalon_team && currentTeamExists) {
          await base44.entities.User.update(user.id, {
            hackalon_team: null,
            hackalon_department: null
          });

          const updatedUser = await base44.auth.me();
          setUser(updatedUser);
          toast.info('הוסרת מהצוות כי השם שלך השתנה');
        }
      } catch (error) {
        console.error('Auto-assign failed:', error);
      }
    };

    autoAssign();
  }, [user?.onboarding_full_name, user?.full_name]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();

        // Check if assigned team still exists
        if (userData.hackalon_team) {
          const allTeams = await base44.entities.HackalonTeam.list();
          const teamExists = allTeams.some((t) => t.name === userData.hackalon_team);

          if (!teamExists) {
            console.log('Team deleted, removing assignment...');
            // Team was deleted - remove assignment
            await base44.entities.User.update(userData.id, {
              hackalon_team: null,
              hackalon_department: null
            });

            // Force reload from server
            const freshUser = await base44.auth.me();
            setUser(freshUser);
            toast.info('הצוות שלך נמחק - הוסרת מהשיבוץ');
            return;
          }
        }

        setUser(userData);
      } catch (error) {
        console.error('Load user error:', error);
      }
    };
    loadUser();

    // Reload user data every 2 seconds to catch updates from other pages
    const interval = setInterval(loadUser, 2000);
    return () => clearInterval(interval);
  }, []);

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['hackalon-team-members', user?.hackalon_team, teamInfo?.member_names],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      // Find by hackalon_team OR by name match in member_names
      return allUsers.filter((u) => {
        // Direct team assignment
        if (u.hackalon_team === user.hackalon_team) return true;

        // Check if user's name is in the team's member_names list
        if (teamInfo?.member_names) {
          const userName = (u.onboarding_full_name || u.full_name || '').trim().toLowerCase();
          return teamInfo.member_names.some((name) =>
          name.trim().toLowerCase() === userName
          );
        }

        return false;
      });
    },
    enabled: !!user?.hackalon_team && !!teamInfo
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['hackalon-submissions', user?.hackalon_team],
    queryFn: async () => {
      const allSubmissions = await base44.entities.HackalonSubmission.list();
      return allSubmissions.filter((s) => s.team_name === user.hackalon_team);
    },
    enabled: !!user?.hackalon_team
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, existingSubmission }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Check if late submission for specification
      let isLate = false;
      if (type === 'specification' && teamInfo?.specification_deadline) {
        const deadline = new Date(teamInfo.specification_deadline);
        const now = new Date();
        isLate = now > deadline;
      }

      if (existingSubmission) {
        // Update existing
        return base44.entities.HackalonSubmission.update(existingSubmission.id, {
          submission_method: 'file',
          file_url: file_url,
          file_name: file.name,
          uploaded_by: user.email,
          upload_date: new Date().toISOString(),
          is_late: isLate
        });
      } else {
        // Create new
        return base44.entities.HackalonSubmission.create({
          team_name: user.hackalon_team,
          submission_type: type,
          submission_method: 'file',
          file_url: file_url,
          file_name: file.name,
          uploaded_by: user.email,
          upload_date: new Date().toISOString(),
          is_late: isLate
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-submissions'] });
      toast.success('הקובץ הועלה בהצלחה');
      setUploading(null);
    },
    onError: () => {
      toast.error('שגיאה בהעלאת הקובץ');
      setUploading(null);
    }
  });

  const addLinkMutation = useMutation({
    mutationFn: async ({ url, type, existingSubmission }) => {
      // Check if late submission for specification
      let isLate = false;
      if (type === 'specification' && teamInfo?.specification_deadline) {
        const deadline = new Date(teamInfo.specification_deadline);
        const now = new Date();
        isLate = now > deadline;
      }

      if (existingSubmission) {
        return base44.entities.HackalonSubmission.update(existingSubmission.id, {
          submission_method: 'link',
          file_url: url,
          file_name: 'קישור חיצוני',
          uploaded_by: user.email,
          upload_date: new Date().toISOString(),
          is_late: isLate
        });
      } else {
        return base44.entities.HackalonSubmission.create({
          team_name: user.hackalon_team,
          submission_type: type,
          submission_method: 'link',
          file_url: url,
          file_name: 'קישור חיצוני',
          uploaded_by: user.email,
          upload_date: new Date().toISOString(),
          is_late: isLate
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-submissions'] });
      toast.success('הקישור נוסף בהצלחה');
      setShowLinkModal(null);
      setLinkUrl('');
    },
    onError: () => {
      toast.error('שגיאה בהוספת הקישור');
    }
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: (submissionId) => base44.entities.HackalonSubmission.delete(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackalon-submissions'] });
      toast.success('הקובץ נמחק בהצלחה');
    },
    onError: () => {
      toast.error('שגיאה במחיקת הקובץ');
    }
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const existingSubmission = getSubmission(type);

    if (existingSubmission) {
      const confirmed = window.confirm(
        `כבר קיים קובץ שהועלה על ידי ${existingSubmission.uploaded_by}.\nהאם לדרוס את הקובץ הקיים?`
      );

      if (!confirmed) {
        e.target.value = '';
        return;
      }
    }

    setUploading(type);
    uploadMutation.mutate({ file, type, existingSubmission });
  };

  const handleAddLink = (type) => {
    if (!linkUrl.trim()) return;

    const existingSubmission = getSubmission(type);
    addLinkMutation.mutate({ url: linkUrl, type, existingSubmission });
  };

  const handleDelete = (submission) => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?');
    if (confirmed) {
      deleteSubmissionMutation.mutate(submission.id);
    }
  };

  if (!user || teamLoading || membersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>);

  }

  if (!user.hackalon_team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">לא שובצת לצוות</h2>
          <p className="text-slate-600">פנה למנהל המערכת לשיבוץ</p>
        </Card>
      </div>);

  }

  const getSubmission = (type) => submissions.find((s) => s.submission_type === type);
  const specSubmission = getSubmission('specification');
  const finalProductSubmission = getSubmission('final_product');

  // Check if specification deadline passed
  const isSpecDeadlinePassed = teamInfo?.specification_deadline ?
  new Date() > new Date(teamInfo.specification_deadline) :
  false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-3xl font-bold text-slate-800 mb-2"> אזור הצוות שלי 🚀

          </h1>
          <p className="text-slate-500">{user.hackalon_team} • {user.hackalon_department}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Team Info */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">הבעיה שלנו</h2>
                {teamInfo?.classroom_number &&
                <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    כיתה {teamInfo.classroom_number}
                  </p>
                }
              </div>
            </div>
            
            {teamInfo?.problem_name ?
            <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{teamInfo.problem_name}</h3>
                </div>

                <div className="space-y-4">
                  {teamInfo.problem_intro &&
                <div>
                      <h4 className="text-sm font-semibold text-purple-600 mb-2">מבוא</h4>
                      <p className="text-slate-600 whitespace-pre-wrap">{teamInfo.problem_intro}</p>
                    </div>
                }
                  {teamInfo.problem_objective &&
                <div>
                      <h4 className="text-sm font-semibold text-purple-600 mb-2">מטרת המוצר</h4>
                      <p className="text-slate-600 whitespace-pre-wrap">{teamInfo.problem_objective}</p>
                    </div>
                }
                  {teamInfo.problem_requirements &&
                <div>
                      <h4 className="text-sm font-semibold text-purple-600 mb-2">דרישות מרכזיות</h4>
                      <p className="text-slate-600 whitespace-pre-wrap">{teamInfo.problem_requirements}</p>
                    </div>
                }
                </div>
              </div> :

            <p className="text-slate-400 text-center py-8">המנהל עדיין לא הגדיר את הבעיה</p>
            }
          </Card>

          {/* Team Members */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">חברי הצוות</h3>
            </div>
            <div className="space-y-2">
              {teamInfo?.member_names && teamInfo.member_names.length > 0 ?
              teamInfo.member_names.map((name, idx) => {
                const matchedUser = teamMembers.find((u) =>
                (u.onboarding_full_name || u.full_name || '').trim().toLowerCase() === name.trim().toLowerCase()
                );

                return (
                  <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                      <p className="font-medium text-slate-800 text-sm">{name}</p>
                      {matchedUser ?
                    <p className="text-xs text-slate-500">{matchedUser.email}</p> :

                    <p className="text-xs text-slate-400"></p>
                    }
                    </div>);

              }) :
              teamMembers.length > 0 ?
              teamMembers.map((member) =>
              <div key={member.id} className="p-2 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-800 text-sm">{member.onboarding_full_name || member.full_name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
              ) :

              <p className="text-slate-400 text-sm text-center py-4">אין חברי צוות</p>
              }
            </div>
          </Card>
        </div>

        {/* Submissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Specification */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-slate-800">מסמך איפיון</h3>
              </div>
              {teamInfo?.specification_deadline &&
              <div className="text-xs text-slate-500">
                  <div>דדליין: {new Date(teamInfo.specification_deadline).toLocaleDateString('he-IL')}</div>
                  {isSpecDeadlinePassed && !specSubmission &&
                <div className="text-red-600 font-semibold">חלף המועד!</div>
                }
                </div>
              }
            </div>
            
            {/* Download Template */}
            {teamInfo?.specification_template_url && !specSubmission &&
            <a
              href={teamInfo.specification_template_url}
              download
              className="block mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">

                <div className="flex items-center gap-2 text-blue-700">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">📥 הורד טמפלייט</span>
                </div>
              </a>
            }
            {specSubmission ?
            <div className="space-y-2">
                <a href={specSubmission.file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-green-800 text-sm">{specSubmission.file_name}</p>
                      <p className="text-xs text-green-600 mt-1">הועלה על ידי {specSubmission.uploaded_by}</p>
                      {specSubmission.is_late &&
                    <p className="text-xs text-red-600 font-semibold mt-1">⚠️ הוגש באיחור</p>
                    }
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => {e.preventDefault();handleDelete(specSubmission);}} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </a>
              </div> :

            <div className="space-y-2">
                <input type="file" id="spec-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'specification')} disabled={uploading === 'specification'} accept=".doc,.docx,.pdf,.txt,.pptx,.xlsx" />
                <label htmlFor="spec-upload">
                  <Button asChild disabled={uploading === 'specification'} className="w-full cursor-pointer">
                    <span>
                      {uploading === 'specification' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                      {uploading === 'specification' ? 'מעלה...' : 'העלה קובץ'}
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={() => {setShowLinkModal('specification');setLinkUrl('');}} className="w-full">
                  <LinkIcon className="w-4 h-4 ml-2" />
                  הוסף קישור
                </Button>
              </div>
            }
          </Card>

          {/* Final Product */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Presentation className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-800">תוצר סופי</h3>
            </div>
            {finalProductSubmission ?
            <div className="space-y-2">
                <a href={finalProductSubmission.file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-purple-800 text-sm">{finalProductSubmission.file_name}</p>
                      <p className="text-xs text-purple-600 mt-1">הועלה על ידי {finalProductSubmission.uploaded_by}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => {e.preventDefault();handleDelete(finalProductSubmission);}} className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </a>
              </div> :

            <div className="space-y-2">
                <input type="file" id="final-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'final_product')} disabled={uploading === 'final_product'} />
                <label htmlFor="final-upload">
                  <Button asChild disabled={uploading === 'final_product'} className="w-full cursor-pointer">
                    <span>
                      {uploading === 'final_product' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                      {uploading === 'final_product' ? 'מעלה...' : 'העלה קובץ'}
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={() => {setShowLinkModal('final_product');setLinkUrl('');}} className="w-full">
                  <LinkIcon className="w-4 h-4 ml-2" />
                  הוסף קישור
                </Button>
              </div>
            }
          </Card>
        </div>

        {/* Link Modal */}
        <Dialog open={!!showLinkModal} onOpenChange={() => setShowLinkModal(null)}>
          <DialogContent dir="ltr">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight text-right">הוסף קישור</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>URL</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  type="url" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-left" />

              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAddLink(showLinkModal)} disabled={!linkUrl.trim()} className="flex-1">הוסף</Button>
                <Button variant="outline" onClick={() => setShowLinkModal(null)} className="flex-1">ביטול</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>);

}