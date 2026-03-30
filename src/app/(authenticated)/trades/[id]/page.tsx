'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  X,
  Maximize2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';

// ----- Types -----

interface TradeDetail {
  id: string;
  symbol: string;
  instId: string;
  instType: string;
  side: string;
  posSide: string | null;
  entryPrice: number;
  exitPrice: number | null;
  netPnl: number;
  realizedPnl: number;
  leverage: number;
  quantity: number;
  fee: number;
  fundingFee: number;
  entryTime: string;
  exitTime: string | null;
  holdDuration: number | null;
  notes: string | null;
  tags: string | null;
  status: string;
  images: TradeImage[];
  checklists: any[];
}

interface TradeImage {
  id: string;
  fileName: string;
  filePath: string;
  originalName: string;
  caption: string | null;
  imageType: string;
  mimeType: string;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  phase: string;
  isActive: boolean;
  items: { id: string; text: string; sortOrder: number; isActive: boolean }[];
}

interface ChecklistResponse {
  id: string;
  checklistItemId: string;
  response: 'yes' | 'no' | 'skip';
}

// ----- Helpers -----

function formatHoldTime(entryTime: string, exitTime: string): string {
  const ms = new Date(exitTime).getTime() - new Date(entryTime).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ----- Component -----

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----- Data fetching -----

  const tradeQuery = useQuery({
    queryKey: ['trade', id],
    queryFn: async (): Promise<TradeDetail> => {
      const res = await fetch(`/api/trades/${id}`);
      if (!res.ok) throw new Error('Failed to fetch trade');
      return res.json();
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['checklist-templates'],
    queryFn: async (): Promise<ChecklistTemplate[]> => {
      const res = await fetch('/api/checklist/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const checklistQuery = useQuery({
    queryKey: ['trade-checklist', id],
    queryFn: async (): Promise<ChecklistResponse[]> => {
      const res = await fetch(`/api/trades/${id}/checklist`);
      if (!res.ok) throw new Error('Failed to fetch checklist');
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const trade = tradeQuery.data;
  const templates = templatesQuery.data ?? [];
  const activeTemplates = templates.filter((t) => t.isActive);

  // ----- Local state -----

  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [checklistState, setChecklistState] = useState<
    Record<string, Record<string, 'yes' | 'no' | 'skip' | null>>
  >({});
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Initialize local state from fetched data
  useEffect(() => {
    if (trade) {
      setNotes(trade.notes || '');
      const tags = trade.tags ? (typeof trade.tags === 'string' ? JSON.parse(trade.tags) : trade.tags) : [];
      setTagsInput(tags.join(', '));
    }
  }, [trade]);

  useEffect(() => {
    if (checklistQuery.data) {
      const state: Record<string, Record<string, 'yes' | 'no' | 'skip' | null>> = {};
      for (const resp of checklistQuery.data as any[]) {
        const templateId = resp.checklistItem?.templateId;
        if (!templateId) continue;
        if (!state[templateId]) state[templateId] = {};
        state[templateId][resp.checklistItemId] = resp.response;
      }
      setChecklistState(state);
    }
  }, [checklistQuery.data]);

  // ----- Mutations -----

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      const res = await fetch(`/api/trades/${id}/images`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Images uploaded');
      queryClient.invalidateQueries({ queryKey: ['trade', id] });
    },
    onError: () => {
      toast.error('Failed to upload images');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const res = await fetch(`/api/trades/${id}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', id] });
    },
  });

  const updateImageMutation = useMutation({
    mutationFn: async (payload: { imageId: string; caption?: string; type?: string }) => {
      const res = await fetch(`/api/trades/${id}/images/${payload.imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: payload.caption, type: payload.type }),
      });
      if (!res.ok) throw new Error('Update failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade', id] });
    },
  });

  const saveChecklistMutation = useMutation({
    mutationFn: async () => {
      const responses: { checklistItemId: string; response: string }[] = [];
      for (const [, items] of Object.entries(checklistState)) {
        for (const [itemId, value] of Object.entries(items)) {
          if (value) responses.push({ checklistItemId: itemId, response: value });
        }
      }
      const res = await fetch(`/api/trades/${id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });
      if (!res.ok) throw new Error('Save failed');
    },
    onSuccess: () => {
      toast.success('Checklist saved');
      queryClient.invalidateQueries({ queryKey: ['trade-checklist', id] });
    },
    onError: () => {
      toast.error('Failed to save checklist');
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/trades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, tags }),
      });
      if (!res.ok) throw new Error('Save failed');
    },
    onSuccess: () => {
      toast.success('Notes saved');
      queryClient.invalidateQueries({ queryKey: ['trade', id] });
    },
    onError: () => {
      toast.error('Failed to save notes');
    },
  });

  // ----- Upload handlers -----

  const handleUpload = useCallback(
    (files: FileList) => {
      uploadMutation.mutate(files);
    },
    [uploadMutation],
  );

  // Clipboard paste — supports both files and items (for screenshots)
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Try files first
      if (clipboardData.files.length > 0) {
        e.preventDefault();
        uploadMutation.mutate(clipboardData.files);
        return;
      }

      // Fallback: check items for image blobs (screenshot paste)
      const imageItems = Array.from(clipboardData.items).filter(
        (item) => item.type.startsWith('image/')
      );
      if (imageItems.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) dt.items.add(file);
        }
        if (dt.files.length > 0) uploadMutation.mutate(dt.files);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [uploadMutation]);

  // Drag & drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  // ----- Checklist helpers -----

  function setChecklistValue(
    templateId: string,
    itemId: string,
    value: 'yes' | 'no' | 'skip',
  ) {
    setChecklistState((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [itemId]: prev[templateId]?.[itemId] === value ? null : value,
      },
    }));
  }

  function getChecklistScore() {
    let yesCount = 0;
    let totalCount = 0;
    for (const items of Object.values(checklistState)) {
      for (const value of Object.values(items)) {
        if (value === 'yes') yesCount++;
        if (value === 'yes' || value === 'no') totalCount++;
      }
    }
    return { yesCount, totalCount };
  }

  // ----- Loading -----

  if (tradeQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-32 bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500">
        Trade not found
      </div>
    );
  }

  const score = getChecklistScore();

  return (
    <div className="space-y-6 p-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/trades')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Trades
      </Button>

      {/* 1. Trade Info Card */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl text-zinc-50">{trade.symbol}</CardTitle>
              <Badge
                className={
                  trade.side === 'long'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-violet-500/20 text-violet-400'
                }
              >
                {trade.side === 'long' ? 'Long' : 'Short'}
              </Badge>
            </div>
            <div
              className={`text-3xl font-bold ${
                trade.netPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trade.netPnl >= 0 ? '+' : ''}$
              {trade.netPnl.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 sm:grid-cols-4">
            <InfoItem label="Entry Price" value={`$${trade.entryPrice.toLocaleString()}`} />
            <InfoItem label="Exit Price" value={trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : '-'} />
            <InfoItem label="Leverage" value={`${trade.leverage}x`} />
            <InfoItem label="Quantity" value={trade.quantity.toLocaleString()} />
            <InfoItem
              label="Hold Time"
              value={trade.exitTime ? formatHoldTime(trade.entryTime, trade.exitTime) : '-'}
            />
            <InfoItem
              label="Fee"
              value={`$${trade.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <InfoItem
              label="Funding Fee"
              value={`$${trade.fundingFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            />
            <InfoItem
              label="Entry Time"
              value={format(new Date(trade.entryTime), 'yyyy-MM-dd HH:mm:ss')}
            />
            <InfoItem
              label="Exit Time"
              value={trade.exitTime ? format(new Date(trade.exitTime), 'yyyy-MM-dd HH:mm:ss') : '-'}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Chart Screenshots Section */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Chart Screenshots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image gallery */}
          {trade.images && trade.images.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {trade.images.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950"
                >
                  <div className="group relative">
                    <img
                      src={image.filePath}
                      alt={image.caption || 'Trade screenshot'}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-start justify-end gap-1 bg-gradient-to-b from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-white hover:bg-white/20"
                      onClick={() => setFullscreenImage(image.filePath)}
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-white hover:bg-red-500/50"
                      onClick={() => deleteImageMutation.mutate(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  </div>
                  <div className="space-y-2 p-2">
                    <Input
                      placeholder="Caption..."
                      defaultValue={image.caption ?? ''}
                      className="h-7 bg-zinc-900 border-zinc-700 text-xs"
                      onBlur={(e) =>
                        updateImageMutation.mutate({
                          imageId: image.id,
                          caption: e.target.value,
                        })
                      }
                    />
                    <Select
                      defaultValue={image.imageType}
                      onValueChange={(val) =>
                        updateImageMutation.mutate({ imageId: image.id, type: val ?? undefined })
                      }
                    >
                      <SelectTrigger className="h-7 bg-zinc-900 border-zinc-700 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry</SelectItem>
                        <SelectItem value="exit">Exit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center transition-colors hover:border-zinc-600"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-zinc-500" />
            <p className="text-sm text-zinc-400">
              Drag & drop images, paste from clipboard, or click to upload
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleUpload(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen image dialog */}
      <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-4xl bg-zinc-950 p-1">
          {fullscreenImage && (
            <img
              src={fullscreenImage}
              alt="Screenshot fullscreen"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Checklist Section */}
      {activeTemplates.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-zinc-50">Checklist</CardTitle>
              <span className="text-sm text-zinc-400">
                Score: {score.yesCount}/{score.totalCount}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeTemplates.map((template) => (
              <div key={template.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-200">{template.name}</h3>
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
                <div className="space-y-2">
                  {template.items
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => {
                      const currentValue = checklistState[template.id]?.[item.id] ?? null;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-2"
                        >
                          <span className="text-sm text-zinc-300">{item.text}</span>
                          <div className="flex gap-1">
                            <button
                              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                                currentValue === 'yes'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                              }`}
                              onClick={() =>
                                setChecklistValue(template.id, item.id, 'yes')
                              }
                            >
                              Yes
                            </button>
                            <button
                              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                                currentValue === 'no'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                              }`}
                              onClick={() =>
                                setChecklistValue(template.id, item.id, 'no')
                              }
                            >
                              No
                            </button>
                            <button
                              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                                currentValue === 'skip'
                                  ? 'bg-zinc-500/20 text-zinc-300'
                                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                              }`}
                              onClick={() =>
                                setChecklistValue(template.id, item.id, 'skip')
                              }
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
            <Button
              onClick={() => saveChecklistMutation.mutate()}
              disabled={saveChecklistMutation.isPending}
            >
              {saveChecklistMutation.isPending ? 'Saving...' : 'Save Checklist'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4. Notes Section */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">Notes</Label>
            <Textarea
              placeholder="Write your trade notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="bg-zinc-950 border-zinc-700 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Tags (comma-separated)</Label>
            <Input
              placeholder="e.g. breakout, trend, momentum"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="bg-zinc-950 border-zinc-700"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1">
                {tagsInput
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((tag, i) => (
                    <Badge key={i} className="bg-zinc-700 text-zinc-300">
                      {tag}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => saveNotesMutation.mutate()}
            disabled={saveNotesMutation.isPending}
          >
            {saveNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ----- Sub-component -----

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-zinc-500">{label}</span>
      <p className="text-sm font-medium text-zinc-200">{value}</p>
    </div>
  );
}
