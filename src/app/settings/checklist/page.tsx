'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ----- Types -----

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  phase: string;
  isActive: boolean;
  items: ChecklistItem[];
}

const ITEM_CATEGORIES = [
  'General',
  'Technical Analysis',
  'Risk Management',
  'Fundamental',
  'Psychology',
  'Entry Rules',
  'Exit Rules',
];

// ----- Component -----

export default function ChecklistSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplatePhase, setNewTemplatePhase] = useState<'pre' | 'post'>('pre');

  // Local edits per template
  const [localEdits, setLocalEdits] = useState<
    Record<string, { items: ChecklistItem[]; isActive: boolean }>
  >({});
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
  const [newItemCategories, setNewItemCategories] = useState<Record<string, string>>({});

  // ----- Fetch -----

  const templatesQuery = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async (): Promise<ChecklistTemplate[]> => {
      const res = await fetch('/api/checklist/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const templates: ChecklistTemplate[] = templatesQuery.data ?? [];

  // Sync fetched data into local edits when templates load
  useEffect(() => {
    if (templates.length === 0) return;
    const edits: Record<string, { items: ChecklistItem[]; isActive: boolean }> = {};
    let hasNew = false;
    for (const t of templates) {
      if (!localEdits[t.id]) {
        hasNew = true;
        edits[t.id] = {
          items: [...t.items].sort((a, b) => a.sortOrder - b.sortOrder),
          isActive: t.isActive,
        };
      }
    }
    if (hasNew) {
      setLocalEdits((prev) => ({ ...edits, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesQuery.data]);

  function getLocalTemplate(template: ChecklistTemplate) {
    return localEdits[template.id] ?? {
      items: [...template.items].sort((a, b) => a.sortOrder - b.sortOrder),
      isActive: template.isActive,
    };
  }

  // Group items by category within a template
  function groupItemsByCategory(items: ChecklistItem[]) {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const cat = item.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }

  // ----- Mutations -----

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; phase: string }) => {
      const res = await fetch('/api/checklist/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Create failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Template created');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      setShowAddDialog(false);
      setNewTemplateName('');
      setNewTemplatePhase('pre');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      isActive: boolean;
      items: ChecklistItem[];
    }) => {
      const res = await fetch(`/api/checklist/templates/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: data.isActive, items: data.items }),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Template saved');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: () => {
      toast.error('Failed to save template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/checklist/templates/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  // ----- Local edit helpers -----

  function updateLocalItems(templateId: string, items: ChecklistItem[]) {
    setLocalEdits((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], items },
    }));
  }

  function updateLocalActive(templateId: string, isActive: boolean) {
    setLocalEdits((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], isActive },
    }));
  }

  function addItem(templateId: string) {
    const text = (newItemInputs[templateId] || '').trim();
    if (!text) return;
    const category = newItemCategories[templateId] || 'General';
    const local = getLocalTemplate(
      templates.find((t) => t.id === templateId)!,
    );
    const newItem: ChecklistItem = {
      id: `temp-${Date.now()}`,
      text,
      category,
      sortOrder: local.items.length,
      isActive: true,
    };
    updateLocalItems(templateId, [...local.items, newItem]);
    setNewItemInputs((prev) => ({ ...prev, [templateId]: '' }));
  }

  function removeItem(templateId: string, itemId: string) {
    const local = getLocalTemplate(
      templates.find((t) => t.id === templateId)!,
    );
    const filtered = local.items
      .filter((i) => i.id !== itemId)
      .map((item, index) => ({ ...item, sortOrder: index }));
    updateLocalItems(templateId, filtered);
  }

  function moveItem(templateId: string, fromIndex: number, toIndex: number) {
    const local = getLocalTemplate(
      templates.find((t) => t.id === templateId)!,
    );
    const items = [...local.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    const reordered = items.map((item, index) => ({ ...item, sortOrder: index }));
    updateLocalItems(templateId, reordered);
  }

  function handleSave(template: ChecklistTemplate) {
    const local = getLocalTemplate(template);
    updateMutation.mutate({
      id: template.id,
      isActive: local.isActive,
      items: local.items,
    });
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/settings')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-zinc-50">Checklist Templates</h1>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Templates */}
      {templates.length === 0 && !templatesQuery.isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-12 text-center">
          <p className="text-zinc-500">No checklist templates yet</p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Create your first template
          </Button>
        </div>
      )}

      {templates.map((template) => {
        const local = getLocalTemplate(template);
        return (
          <Card key={template.id} className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-zinc-50">{template.name}</CardTitle>
                  <Badge
                    className={
                      template.phase === 'pre'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-cyan-500/20 text-cyan-400'
                    }
                  >
                    {template.phase === 'pre' ? 'Pre-trade' : 'Post-trade'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-zinc-400">Active</Label>
                    <Switch
                      checked={local.isActive}
                      onCheckedChange={(checked: boolean) =>
                        updateLocalActive(template.id, checked)
                      }
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="destructive" size="icon-sm">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{template.name}&rdquo;? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(template.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items grouped by category */}
              {local.items.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">No items yet</p>
              )}
              {groupItemsByCategory(local.items).map(([cat, catItems]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat}</span>
                    <div className="flex-1 border-t border-zinc-800" />
                  </div>
                  {catItems.map((item) => {
                    const index = local.items.findIndex((i) => i.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            className="text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                            disabled={index === 0}
                            onClick={() => moveItem(template.id, index, index - 1)}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="flex-1 text-sm text-zinc-300">{item.text}</span>
                        <Badge className="bg-zinc-800 text-zinc-500 text-[10px]">{cat}</Badge>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-zinc-500 hover:text-red-400"
                          onClick={() => removeItem(template.id, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Add item with category */}
              <div className="flex gap-2">
                <Select
                  value={newItemCategories[template.id] || 'General'}
                  onValueChange={(val) =>
                    val && setNewItemCategories((prev) => ({ ...prev, [template.id]: val }))
                  }
                >
                  <SelectTrigger className="w-[160px] bg-zinc-950 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="New checklist item..."
                  value={newItemInputs[template.id] || ''}
                  onChange={(e) =>
                    setNewItemInputs((prev) => ({
                      ...prev,
                      [template.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(template.id);
                    }
                  }}
                  className="bg-zinc-950 border-zinc-700"
                />
                <Button
                  variant="outline"
                  onClick={() => addItem(template.id)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Save */}
              <Button
                onClick={() => handleSave(template)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Add Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Add Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Template Name</Label>
              <Input
                placeholder="e.g. Entry Criteria"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="bg-zinc-950 border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Phase</Label>
              <Select
                value={newTemplatePhase}
                onValueChange={(val) => setNewTemplatePhase(val as 'pre' | 'post')}
              >
                <SelectTrigger className="bg-zinc-950 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre">Pre-trade</SelectItem>
                  <SelectItem value="post">Post-trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: newTemplateName,
                  phase: newTemplatePhase,
                })
              }
              disabled={!newTemplateName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
