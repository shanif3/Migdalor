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

export default function AddToQueueModal({ open, onClose, crews, onConfirm }) {
  const [crewName, setCrewName] = useState('');
  const [preferredType, setPreferredType] = useState('any');
  const [notes, setNotes] = useState('');
  const [useExisting, setUseExisting] = useState(false);

  const handleConfirm = () => {
    if (crewName) {
      onConfirm({
        crew_name: crewName,
        preferred_type: preferredType,
        notes: notes
      });
      setCrewName('');
      setPreferredType('any');
      setNotes('');
      setUseExisting(false);
    }
  };

  return (
<Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex flex-row-reverse items-center gap-2 justify-end">
           בקשה מיוחדת למפתח
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </DialogTitle>
          <DialogDescription className="text-right">
            הוסף צוות לבקשה מיוחדת למפתח
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {crews.length > 0 && useExisting ?
          <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">בחר צוות</Label>
              <Select value={crewName} onValueChange={setCrewName}>
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder="בחר צוות..." className="text-right" />
                </SelectTrigger>
                <SelectContent align="end" dir="rtl">
                  {crews.map((crew) =>
                <SelectItem key={crew.id} value={crew.name}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {crew.name}
                      </div>
                    </SelectItem>
                )}
                </SelectContent>
              </Select>
              <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 text-xs w-full"
              onClick={() => setUseExisting(false)}>
                או הזן שם ידנית
              </Button>
            </div> :

          <div className="space-y-2">
              <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium text-right block">שם הצוות</Label>
              <Input
              placeholder="הזן שם צוות..."
              value={crewName}
              onChange={(e) => setCrewName(e.target.value)}
              className="text-right" />

              {crews.length > 0 &&
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 text-xs w-full"
              onClick={() => setUseExisting(true)}>
                  בחר מצוותים קיימים
                </Button>
            }
            </div>
          }

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">שעת התחלה</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-right block">שעת סיום</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-right"
              />
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
    </Dialog>
    );

}