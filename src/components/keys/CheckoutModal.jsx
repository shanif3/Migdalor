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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Key, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutModal({ open, onClose, keyItem, crews, squads, currentUser, onConfirm }) {
  const [selectedCrew, setSelectedCrew] = useState('');
  const [platoonName, setPlatoonName] = useState('');
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('23:59');



  // Prefill times if provided
  React.useEffect(() => {
    if (keyItem?.prefilledTimes) {
      setStartTime(keyItem.prefilledTimes.start);
      setEndTime(keyItem.prefilledTimes.end);
    }
  }, [keyItem]);

  const handleConfirm = () => {
    const holderName = useCustom ? customName : selectedCrew;
    if (holderName && startTime && endTime) {
      // Check if time has already passed
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (startTime < currentTime) {
        toast.error('לא ניתן למשוך מפתח בזמן שכבר חלף');
        return;
      }
      
      onConfirm(keyItem, holderName, startTime, endTime, platoonName);
      setSelectedCrew('');
      setPlatoonName('');
      setCustomName('');
      setUseCustom(false);
      setStartTime('');
      setEndTime('23:59');
    }
  };

  if (!keyItem) return null;



  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        dir="rtl"
        className="sm:max-w-md text-right">

        <DialogHeader className="text-right">
  <DialogTitle className="text-lg font-semibold leading-none tracking-tight flex flex-row-reverse items-center gap-2 justify-end">משוך מפתח




          </DialogTitle>

  <DialogDescription className="text-right">
    משיכת מפתח לחדר {keyItem.room_number} ({keyItem.room_type})
  </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!useCustom &&
          <div className="space-y-2">
              <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium">החדר עבור *</Label>
              <select
              value={selectedCrew}
              onChange={(e) => {
                const selectedValue = e.target.value;
                setSelectedCrew(selectedValue);

                // Check if a squad was selected and auto-fill platoon name
                const selectedSquad = squads?.find((s) => s.squad_number === selectedValue);
                setPlatoonName(selectedSquad ? selectedSquad.platoon_name : '');
              }}
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
              size="sm" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-slate-500 text-xs w-full"

              onClick={() => setUseCustom(true)}>

                 הזן שם ידנית
              </Button>
            </div>
          }

          {useCustom &&
          <div className="space-y-2">
              <Label className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium">החדר עבור *</Label>
              <Input
              placeholder="למשל, סגל"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)} />

              <Button
              variant="ghost"
              size="sm" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-slate-500 text-xs w-full"

              onClick={() => setUseCustom(false)}>

                  בחר מאפשרויות קיימות
                </Button>
            </div>
          }

          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">שעת התחלה *</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)} />

              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">שעת סיום *</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)} />

              </div>
            </div>

            {endTime === '23:59' &&
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800">
                  <strong>חשוב:</strong> אם לא ציינת שעת סיום מדויקת, יש לסמן את המפתח כהוחזר בעצמך כאשר מחזירים אותו.
                </p>
              </div>
            }
          </div>
        </div>

        <div className="flex gap-3">
          
          <Button
            onClick={handleConfirm}
            disabled={(useCustom ? !customName : !selectedCrew) || !startTime || !endTime}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700">

            אשר משיכה
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
           ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

}