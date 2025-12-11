import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Trash2, Edit2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ManageCrews() {
  const [showModal, setShowModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ['crews'],
    queryFn: () => base44.entities.Crew.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Crew.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setFormData({ name: '', contact: '', notes: '' });
      toast.success('Crew added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Crew.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      setShowModal(false);
      setEditingCrew(null);
      setFormData({ name: '', contact: '', notes: '' });
      toast.success('Crew updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Crew.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      toast.success('Crew deleted successfully');
    },
  });

  const handleSubmit = () => {
    if (editingCrew) {
      updateMutation.mutate({ id: editingCrew.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (crew) => {
    setEditingCrew(crew);
    setFormData({ name: crew.name, contact: crew.contact || '', notes: crew.notes || '' });
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingCrew(null);
    setFormData({ name: '', contact: '', notes: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            👥 Manage Crews
          </h1>
          <p className="text-slate-500">
            Add and manage crews that use classroom keys
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <Card className="p-4 border-slate-200 inline-block">
            <p className="text-sm text-slate-500">Total Crews</p>
            <p className="text-2xl font-bold text-slate-800">{crews.length}</p>
          </Card>
        </div>

        {/* Add Button */}
        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Crew
          </Button>
        </div>

        {/* Crews Table */}
        <Card className="overflow-hidden border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Crew Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : crews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-400">
                    No crews added yet
                  </TableCell>
                </TableRow>
              ) : (
                crews.map((crew) => (
                  <TableRow key={crew.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        {crew.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {crew.contact ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3" />
                          {crew.contact}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {crew.notes || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(crew)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(crew.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              {editingCrew ? 'Edit Crew' : 'Add New Crew'}
            </DialogTitle>
            <DialogDescription>
              {editingCrew ? 'Update the crew details' : 'Add a new crew to track'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Crew Name</Label>
              <Input
                placeholder="e.g., Team Alpha, Morning Shift..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Contact (optional)</Label>
              <Input
                placeholder="Phone number or email..."
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional information..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-20"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {editingCrew ? 'Update Crew' : 'Add Crew'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}