import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Briefcase, X, Plus, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function ManagePositions() {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list('order'),
    enabled: isAdmin
  });

  const createPositionMutation = useMutation({
    mutationFn: (data) => base44.entities.Position.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success('תפקיד נוסף בהצלחה');
    }
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id) => base44.entities.Position.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast.success('תפקיד נמחק');
    }
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Position.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    }
  });

  const handleAddPosition = () => {
    const title = prompt('שם התפקיד החדש:');
    if (title && title.trim()) {
      createPositionMutation.mutate({ 
        title: title.trim(), 
        order: positions.length 
      });
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(positions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order for all affected items
    for (let i = 0; i < items.length; i++) {
      if (items[i].order !== i) {
        await updatePositionMutation.mutateAsync({
          id: items[i].id,
          data: { order: i }
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['positions'] });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">גישה מוגבלת</h2>
          <p className="text-slate-500">רק מנהלים יכולים לגשת לדף זה</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            ניהול תפקידים 💼
          </h1>
          <p className="text-slate-500">הוסף, ערוך, ומחק תפקידים במערכת</p>
        </motion.div>

        {/* Stats */}
        <div className="mb-6">
          <Card className="p-4 border-slate-200">
            <p className="text-sm text-slate-500">סה״כ תפקידים</p>
            <p className="text-2xl font-bold text-slate-800">{positions.length}</p>
          </Card>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <Button
            onClick={handleAddPosition}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף תפקיד חדש
          </Button>
        </div>

        {/* Positions List */}
        <Card className="p-6 border-slate-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">אין תפקידים. הוסף את התפקיד הראשון</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="positions">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {positions.map((position, index) => (
                      <Draggable
                        key={position.id}
                        draggableId={position.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center justify-between p-4 bg-white rounded-lg border-2 transition-all ${
                              snapshot.isDragging
                                ? 'border-indigo-400 shadow-lg'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="w-1 h-1 bg-slate-400 rounded-full" />
                                <div className="w-1 h-1 bg-slate-400 rounded-full" />
                                <div className="w-1 h-1 bg-slate-400 rounded-full" />
                              </div>
                              <Briefcase className="w-5 h-5 text-indigo-600" />
                              <span className="text-lg font-medium text-slate-800">
                                {position.title}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`למחוק את התפקיד "${position.title}"?`)) {
                                  deletePositionMutation.mutate(position.id);
                                }
                              }}
                              className="hover:bg-red-50 rounded-full p-2 transition-colors"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Card>

        <p className="text-xs text-slate-400 mt-4 text-center">
          💡 גרור לשינוי סדר התפקידים
        </p>
      </div>
    </div>
  );
}