'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RefreshCw, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ----- Schemas -----

const apiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required'),
  secretKey: z.string().min(1, 'Secret Key is required'),
  passphrase: z.string().min(1, 'Passphrase is required'),
});

type ApiKeyForm = z.infer<typeof apiKeySchema>;

interface SettingsData {
  okxApiKey: string | null;
  okxSecretKey: string | null;
  okxPassphrase: string | null;
  autoSync: boolean;
  syncIntervalMin: number;
  lastSyncAt: string | null;
}

// ----- Component -----

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsData> => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const settings = settingsQuery.data;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApiKeyForm>({
    resolver: zodResolver(apiKeySchema),
    values: settings
      ? {
          apiKey: settings.okxApiKey || '',
          secretKey: settings.okxSecretKey || '',
          passphrase: settings.okxPassphrase || '',
        }
      : undefined,
  });

  // ----- Mutations -----

  const saveMutation = useMutation({
    mutationFn: async (data: ApiKeyForm) => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          okxApiKey: data.apiKey,
          okxSecretKey: data.secretKey,
          okxPassphrase: data.passphrase,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('API keys saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setTestResult(null);
    },
    onError: () => {
      toast.error('Failed to save API keys');
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/settings/test', { method: 'POST' });
      if (!res.ok) throw new Error('Connection failed');
      return res.json();
    },
    onSuccess: () => {
      setTestResult('success');
      toast.success('Connection successful');
    },
    onError: () => {
      setTestResult('error');
      toast.error('Connection failed');
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/okx/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Sync completed');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => {
      toast.error('Sync failed');
    },
  });

  const updateSyncSettingsMutation = useMutation({
    mutationFn: async (data: { autoSync?: boolean; syncIntervalMin?: number }) => {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const [autoSync, setAutoSync] = useState(settings?.autoSync ?? false);
  const [syncInterval, setSyncInterval] = useState(String(settings?.syncIntervalMin ?? 15));

  // Keep local state in sync with fetched data
  if (settings && autoSync !== settings.autoSync && !updateSyncSettingsMutation.isPending) {
    setAutoSync(settings.autoSync);
  }
  if (
    settings &&
    syncInterval !== String(settings.syncIntervalMin) &&
    !updateSyncSettingsMutation.isPending
  ) {
    setSyncInterval(String(settings.syncIntervalMin));
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-50">Settings</h1>
        <Link href="/settings/checklist">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Manage Checklist Templates
          </Button>
        </Link>
      </div>

      {/* OKX API Configuration */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">OKX API Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">API Key</Label>
              <Input
                type="password"
                placeholder="Enter your API key"
                className="bg-zinc-950 border-zinc-700"
                {...register('apiKey')}
              />
              {errors.apiKey && (
                <p className="text-xs text-red-400">{errors.apiKey.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Secret Key</Label>
              <Input
                type="password"
                placeholder="Enter your secret key"
                className="bg-zinc-950 border-zinc-700"
                {...register('secretKey')}
              />
              {errors.secretKey && (
                <p className="text-xs text-red-400">{errors.secretKey.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Passphrase</Label>
              <Input
                type="password"
                placeholder="Enter your passphrase"
                className="bg-zinc-950 border-zinc-700"
                {...register('passphrase')}
              />
              {errors.passphrase && (
                <p className="text-xs text-red-400">{errors.passphrase.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="gap-2"
              >
                {testMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : testResult === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-400" />
                ) : null}
                Test Connection
              </Button>
            </div>
          </form>

          {/* Last sync & manual sync */}
          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">
            <div className="text-sm text-zinc-400">
              Last Sync:{' '}
              {settings?.lastSyncAt ? (
                <span className="text-zinc-200">
                  {new Date(settings.lastSyncAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-zinc-500">Never</span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
              />
              Manual Sync
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-zinc-50">Sync Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Auto Sync</p>
              <p className="text-xs text-zinc-500">
                Automatically sync trades from OKX at the configured interval
              </p>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={(checked: boolean) => {
                setAutoSync(checked);
                updateSyncSettingsMutation.mutate({ autoSync: checked });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Sync Interval</p>
              <p className="text-xs text-zinc-500">How often to sync trades</p>
            </div>
            <Select
              value={syncInterval}
              onValueChange={(val) => {
                if (!val) return;
                setSyncInterval(val);
                updateSyncSettingsMutation.mutate({ syncIntervalMin: Number(val) });
              }}
            >
              <SelectTrigger className="w-36 bg-zinc-950 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
