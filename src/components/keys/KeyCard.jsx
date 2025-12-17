import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, User, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function KeyCard({ keyItem, onCheckout, onReturn, crews, currentUser, currentHolder }) {
  const isAvailable = keyItem.status === 'available' && !currentHolder;
  const isAdmin = currentUser?.role === 'admin';
  const canReturn = isAvailable || isAdmin || keyItem.checked_out_by === currentUser?.email;
  const displayHolder = currentHolder || keyItem.current_holder;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-5 border-2 transition-all duration-300 hover:shadow-lg ${
        isAvailable 
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white' 
          : 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white'
      }`}>
<div className="flex flex-row-reverse items-start justify-between mb-4">
          <div className="flex flex-row-reverse items-center gap-3">
            <div className={`p-3 rounded-xl ${
              isAvailable ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              <Key className={`w-5 h-5 ${
                isAvailable ? 'text-emerald-600' : 'text-amber-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">
                חדר {keyItem.room_number}
              </h3>
              <Badge variant="outline" className={`mt-1 ${
                keyItem.room_type === 'פלוגתי' 
                  ? 'border-purple-300 text-purple-700 bg-purple-50' 
                  : 'border-blue-300 text-blue-700 bg-blue-50'
              }`}>
                {keyItem.room_type === 'פלוגתי' ? '🏢 פלוגתי' : '🏠 צוותי'}
              </Badge>
            </div>
          </div>
          <Badge className={`${
            isAvailable 
              ? 'bg-emerald-500 hover:bg-emerald-600' 
              : 'bg-amber-500 hover:bg-amber-600'
          }`}>
            {isAvailable ? 'זמין' : 'תפוס'}
          </Badge>
        </div>

        {!isAvailable && displayHolder && (
          <div className="mb-4 p-3 bg-white/80 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{displayHolder}</span>
            </div>
            {keyItem.checkout_time && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Clock className="w-3 h-3" />
                <span>מאז {format(new Date(keyItem.checkout_time), 'MMM d, h:mm a')}</span>
              </div>
            )}
          </div>
        )}

        {isAvailable ? (
          <Button 
            onClick={() => onCheckout(keyItem)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 transition-all"
          >
            משוך מפתח <ArrowRight className="w-4 h-4 mr-2" />
          </Button>
        ) : canReturn ? (
          <Button 
            onClick={() => onReturn(keyItem)}
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            החזר מפתח
          </Button>
        ) : null}
      </Card>
    </motion.div>
  );
}