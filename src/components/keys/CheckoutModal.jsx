import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Key, Users } from 'lucide-react';

export default function CheckoutModal({ open, onClose, keyItem, crews, onConfirm }) {
  const [selectedCrew, setSelectedCrew] = useState('');
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const handleConfirm = () => {
    const holderName = useCustom ? customName : selectedCrew;
    if (holderName) {
      onConfirm(keyItem, holderName);
      setSelectedCrew('');
      setCustomName('');
      setUseCustom(false);
    }
  };

  if (!keyItem) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Key className="w-5 h-5 text-emerald-600" />
            </div>
            Checkout Key
          </DialogTitle>
          <DialogDescription>
            Checking out key for Room {keyItem.room_number} ({keyItem.room_type})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {crews.length > 0 && !useCustom && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Crew</Label>
              <Select value={selectedCrew} onValueChange={setSelectedCrew}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a crew..." />
                </SelectTrigger>
                <SelectContent>
                  {crews.map((crew) => (
                    <SelectItem key={crew.id} value={crew.name}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        {crew.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 text-xs"
                onClick={() => setUseCustom(true)}
              >
                Or enter a name manually
              </Button>
            </div>
          )}

          {(useCustom || crews.length === 0) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Crew Name</Label>
              <Input
                placeholder="Enter crew name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              {crews.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 text-xs"
                  onClick={() => setUseCustom(false)}
                >
                  Select from existing crews
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={useCustom ? !customName : !selectedCrew}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            Confirm Checkout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}