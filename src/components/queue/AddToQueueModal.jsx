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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        notes: notes,
      });
      setCrewName('');
      setPreferredType('any');
      setNotes('');
      setUseExisting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            Join Waiting Queue
          </DialogTitle>
          <DialogDescription>
            Add a crew to the waiting list for a key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {crews.length > 0 && useExisting ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Crew</Label>
              <Select value={crewName} onValueChange={setCrewName}>
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
                onClick={() => setUseExisting(false)}
              >
                Or enter a name manually
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Crew Name</Label>
              <Input
                placeholder="Enter crew name..."
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
              />
              {crews.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 text-xs"
                  onClick={() => setUseExisting(true)}
                >
                  Select from existing crews
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Preferred Room Type</Label>
            <Select value={preferredType} onValueChange={setPreferredType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">🔄 Any available</SelectItem>
                <SelectItem value="small">🏠 Small classroom</SelectItem>
                <SelectItem value="large">🏢 Large classroom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Any special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!crewName}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Add to Queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}