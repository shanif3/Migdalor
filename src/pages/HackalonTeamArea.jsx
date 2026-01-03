import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Presentation, Users, MapPin, Lightbulb, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function HackalonTeamArea() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: teamInfo, isLoading: teamLoading } = useQuery({
    queryKey: ['hackalon-team-info', user?.hackalon_team],
    queryFn: async () => {
      const teams = await base44.entities.HackalonTeam.list();
      return teams.find(t => t.name === user.hackalon_team);
    },
    enabled: !!user?.hackalon_team
  });

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['hackalon-team-members', user?.hackalon_team],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.hackalon_team === user.hackalon_team);
    },
    enabled: !!user?.hackalon_team
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['hackalon-submissions', user?.hackalon_team],
    queryFn: async () => {
      const allSubmissions = await base44.entities.HackalonSubmission.list();
      return allSubmissions.filter(s => s.team_name === user.hackalon_team);
    },
    enabled: !!user?.hackalon_team
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, existingSubmission }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (existingSubmission) {
        // Update existing
        return base44.entities.HackalonSubmission.update(existingSubmission.id, {
          file_url: file_url,
          file_name: file.name,
          uploaded_by: user.email,
          upload_date: new Date().toISOString()
        });
      } else {
        // Create new
        return base44.entities.HackalonSubmission.create({
          team_name: user.hackalon_team,
          submission_type: type,
          file_url: file_url,
          file_name: file.name,
          uploaded_by: user.email,
          upload_date: new Date().toISOString()
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

  if (!user || teamLoading || membersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user.hackalon_team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center max-w-md">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">לא שובצת לצוות</h2>
          <p className="text-slate-600">פנה למנהל המערכת לשיבוץ</p>
        </Card>
      </div>
    );
  }

  const getSubmission = (type) => submissions.find(s => s.submission_type === type);
  const specSubmission = getSubmission('specification');
  const pres1Submission = getSubmission('presentation1');
  const pres2Submission = getSubmission('presentation2');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🚀 אזור הצוות שלי
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
                {teamInfo?.classroom_number && (
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    כיתה {teamInfo.classroom_number}
                  </p>
                )}
              </div>
            </div>
            
{teamInfo?.problem_intro || teamInfo?.problem_objective || teamInfo?.problem_requirements ? (
              <div className="space-y-4">
                {teamInfo.problem_intro && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-600 mb-1">מבוא</h3>
                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: teamInfo.problem_intro }} />
                  </div>
                )}
                {teamInfo.problem_objective && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-600 mb-1">מטרת המוצר</h3>
                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: teamInfo.problem_objective }} />
                  </div>
                )}
                {teamInfo.problem_requirements && (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-600 mb-1">דרישות מרכזיות</h3>
                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: teamInfo.problem_requirements }} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">המנהל עדיין לא הגדיר את הבעיה</p>
            )}
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
              {teamMembers.map(member => (
                <div key={member.id} className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-medium text-slate-800 text-sm">{member.onboarding_full_name || member.full_name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Submissions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Specification */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-bold text-slate-800">מסמך איפיון</h3>
            </div>
            {specSubmission ? (
              <div className="space-y-2">
                <a href={specSubmission.file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <p className="font-medium text-green-800 text-sm">{specSubmission.file_name}</p>
                  <p className="text-xs text-green-600 mt-1">הועלה על ידי {specSubmission.uploaded_by}</p>
                </a>
              </div>
            ) : (
              <div>
                <input type="file" id="spec-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'specification')} disabled={uploading === 'specification'} />
                <label htmlFor="spec-upload">
                  <Button asChild disabled={uploading === 'specification'} className="w-full cursor-pointer">
                    <span>
                      {uploading === 'specification' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                      {uploading === 'specification' ? 'מעלה...' : 'העלה קובץ'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </Card>

          {/* Presentation 1 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Presentation className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">מצגת 1</h3>
            </div>
            {pres1Submission ? (
              <div className="space-y-2">
                <a href={pres1Submission.file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <p className="font-medium text-blue-800 text-sm">{pres1Submission.file_name}</p>
                  <p className="text-xs text-blue-600 mt-1">הועלה על ידי {pres1Submission.uploaded_by}</p>
                </a>
              </div>
            ) : (
              <div>
                <input type="file" id="pres1-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'presentation1')} disabled={uploading === 'presentation1'} />
                <label htmlFor="pres1-upload">
                  <Button asChild disabled={uploading === 'presentation1'} className="w-full cursor-pointer">
                    <span>
                      {uploading === 'presentation1' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                      {uploading === 'presentation1' ? 'מעלה...' : 'העלה קובץ'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </Card>

          {/* Presentation 2 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Presentation className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-800">מצגת 2</h3>
            </div>
            {pres2Submission ? (
              <div className="space-y-2">
                <a href={pres2Submission.file_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                  <p className="font-medium text-purple-800 text-sm">{pres2Submission.file_name}</p>
                  <p className="text-xs text-purple-600 mt-1">הועלה על ידי {pres2Submission.uploaded_by}</p>
                </a>
              </div>
            ) : (
              <div>
                <input type="file" id="pres2-upload" className="hidden" onChange={(e) => handleFileUpload(e, 'presentation2')} disabled={uploading === 'presentation2'} />
                <label htmlFor="pres2-upload">
                  <Button asChild disabled={uploading === 'presentation2'} className="w-full cursor-pointer">
                    <span>
                      {uploading === 'presentation2' ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                      {uploading === 'presentation2' ? 'מעלה...' : 'העלה קובץ'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}