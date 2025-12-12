import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Trash2, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WaitingQueueCard({ item, position, onRemove, onMoveUp }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
<Card className="p-4 border border-slate-200 hover:border-slate-300 transition-all" dir="rtl">
        <div className="flex flex-row-reverse items-center justify-between">
          <div className="flex flex-row-reverse items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <span className="font-bold text-slate-600">#{position}</span>
            </div>
            <div>
              <div className="flex flex-row-reverse items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-800">{item.crew_name}</span>
              </div>
              <div className="flex flex-row-reverse items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {item.preferred_type === 'any' ? '🔄 הכל' : 
                   item.preferred_type === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
                </Badge>
                {item.notes && (
                  <span className="text-xs text-slate-400">{item.notes}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse items-center gap-2">
            {position > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMoveUp(item)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(item)}
              className="text-red-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}