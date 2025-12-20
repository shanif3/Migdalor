import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription } from
"@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function AddToQueueModal({ open, onClose, crews, squads, currentUser, onConfirm }) {
  const [crewName, setCrewName] = useState('');
  const [preferredType, setPreferredType] = useState('any');
  const [notes, setNotes] = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  React.useEffect(() => {
    if (open) {
      console.log('📋 AddToQueueModal received:', {
        crews: crews?.length,
        crewNames: crews?.map(c => c.name),
        squads: squads?.length,
        squadNames: squads?.map(s => s.squad_number),
        userPlatoon: currentUser?.platoon_name
      });
    }
  }, [open, crews, squads, currentUser]);

  const handleConfirm = () => {
    if (crewName && startTime && endTime) {
      // Check if time has already passed
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (startTime < currentTime) {
        toast.error('לא ניתן להוסיף בקשה בזמן שכבר חלף');
        return;
      }

      if (startTime >= endTime) {
        toast.error('שעת הסיום חייבת להיות מאוחרת משעת ההתחלה');
        return;
      }

      onConfirm({
        crew_name: crewName,
        preferred_type: preferredType,
        start_time: startTime,
        end_time: endTime,
        notes: notes
      });
      setCrewName('');
      setPreferredType('any');
      setStartTime('');
      setEndTime('');
      setNotes('');
      setUseExisting(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="text-right">

        <DialogHeader className="text-right">
          <DialogTitle className="w-full text-right">
  <div className="flex w-full items-center gap-2">
    <span className="text-right">בקשה מיוחדת למפתח</span>
    <div className="p-2 bg-blue-100 rounded-lg">
      <Clock className="w-5 h-5 text-blue-600" />
    </div>
  </div>
          </DialogTitle>




          <DialogDescription className="text-right">
            הוסף בקשה מיוחדת למפתח
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!useExisting ?
          <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">החדר עבור *</Label>
              <select
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-right">

                <option value="">בחר פלוגה או צוות...</option>

                {crews && crews.length > 0 && (
                  <optgroup label="פלוגות">
                    {crews.map((crew) => (
                      <option key={crew.id} value={crew.name}>{crew.name}</option>
                    ))}
                  </optgroup>
                )}

                {squads && squads.length > 0 && (
                  <optgroup label="צוותים">
                    {squads.map((squad) => (
                      <option key={squad.id} value={squad.squad_number}>
                        {squad.squad_number} {squad.platoon_name ? `(${squad.platoon_name})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 text-xs w-full"
              onClick={() => setUseExisting(true)}>
                 הזן שם ידנית
              </Button>
            </div> :

          <div className="space-y-2">
              <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-right block">החדר עבור *</Label>
              <Input
              placeholder="למשל, סגל"
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              className="text-right" />

              <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 text-xs w-full"
              onClick={() => setUseExisting(false)}>
                בחר מאפשרויות קיימות
              </Button>
            </div>
          }

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">שעת התחלה</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-right" />

            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">שעת סיום</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-right" />

            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-right block">סוג חדר מועדף</Label>
            <Select value={preferredType} onValueChange={setPreferredType}>
              <SelectTrigger className="text-right" dir="rtl">
                <SelectValue className="text-right" />
              </SelectTrigger>
              <SelectContent align="end" dir="rtl">
                <SelectItem value="any">🔄 כל חדר זמין</SelectItem>
                <SelectItem value="צוותי">🏠 צוותי</SelectItem>
                <SelectItem value="פלוגתי">🏢 פלוגתי</SelectItem>
              </SelectContent>
            </Select>
          </div>

        
          <div className="space-y-2">
            <Label className="text-sm font-medium text-right block">הערות (אופציונלי)</Label>
            <Textarea
              placeholder="דרישות מיוחדות..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 text-right" />
          </div>
        </div>

       
 <div className="flex flex-row-reverse gap-3">
 <Button variant="outline" onClick={onClose} className="flex-1">
            ביטול
          </Button>
 <Button
            onClick={handleConfirm}
            disabled={!crewName || !startTime || !endTime}
            className="flex-1 bg-blue-600 hover:bg-blue-700">
            הוסף לתור
          </Button>
          
          
        </div>
      </DialogContent>
    </Dialog>);


}