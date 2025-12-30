'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Copy,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { checkRealtimeStatus, enableRealtime, getRealtimeStatusMessage, type RealtimeStatusResponse } from '@/lib/realtime-utils';
import { useToast } from '@/hooks/use-toast';

export function RealtimeManager() {
  const { toast } = useToast();
  const [status, setStatus] = useState<RealtimeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [sqlGenerated, setSqlGenerated] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const result = await checkRealtimeStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error fetching realtime status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check realtime status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const result = await enableRealtime();
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        // Check if it's because RPC function doesn't exist
        const needsSetup = result.results?.some((r: any) => 
          r.message?.includes('RPC function not available')
        );
        
        if (needsSetup) {
          toast({
            title: 'Setup Required',
            description: 'Please run enable-realtime-via-rpc.sql once in Supabase SQL Editor to enable programmatic realtime management.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Partial Success',
            description: result.message,
            variant: 'default',
          });
        }
      }
      
      // Refresh status
      await fetchStatus();
    } catch (error) {
      console.error('Error enabling realtime:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable realtime. Please check the console for details.',
        variant: 'destructive',
      });
    } finally {
      setEnabling(false);
    }
  };

  const generateSQL = async () => {
    try {
      const response = await fetch('/api/realtime/enable-sql');
      const data = await response.json();
      
      if (data.success) {
        setSqlGenerated(data.sql);
        toast({
          title: 'SQL Generated',
          description: 'Copy the SQL and run it in Supabase SQL Editor',
        });
      }
    } catch (error) {
      console.error('Error generating SQL:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate SQL',
        variant: 'destructive',
      });
    }
  };

  const copySQL = () => {
    if (sqlGenerated) {
      navigator.clipboard.writeText(sqlGenerated);
      toast({
        title: 'Copied',
        description: 'SQL copied to clipboard',
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Realtime Configuration</CardTitle>
          <CardDescription>Checking realtime status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Realtime Configuration
        </CardTitle>
        <CardDescription>
          Manage Supabase Realtime subscriptions for database tables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        {status && (
          <Alert className={status.allEnabled ? 'border-green-500' : 'border-yellow-500'}>
            <AlertTitle className="flex items-center gap-2">
              {status.allEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              Status
            </AlertTitle>
            <AlertDescription>
              {getRealtimeStatusMessage(status)}
            </AlertDescription>
          </Alert>
        )}

        {/* Table Status */}
        {status && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Table Status</h4>
            <div className="grid gap-2">
              {status.status.map((tableStatus) => (
                <div
                  key={tableStatus.table}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {tableStatus.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{tableStatus.table}</span>
                    {tableStatus.alternative && (
                      <span className="text-xs text-muted-foreground">
                        (or {tableStatus.alternative})
                      </span>
                    )}
                  </div>
                  <Badge variant={tableStatus.enabled ? 'default' : 'destructive'}>
                    {tableStatus.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4">
          <div className="flex gap-2">
            <Button
              onClick={fetchStatus}
              variant="outline"
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            <Button
              onClick={handleEnable}
              disabled={enabling || (status?.allEnabled ?? false)}
              className="flex-1"
            >
              {enabling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                'Enable Realtime'
              )}
            </Button>
          </div>

          <Button
            onClick={generateSQL}
            variant="outline"
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            Generate SQL Script
          </Button>

          <Button
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            variant="outline"
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Supabase Dashboard
          </Button>
        </div>

        {/* SQL Output */}
        {sqlGenerated && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Generated SQL</h4>
              <Button onClick={copySQL} variant="ghost" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
              <code>{sqlGenerated}</code>
            </pre>
            <p className="text-xs text-muted-foreground">
              Copy this SQL and run it in your Supabase SQL Editor
            </p>
          </div>
        )}

        {/* Instructions */}
        <Alert>
          <AlertTitle>How to Enable Realtime</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p className="text-sm">
              <strong>Option 1 (Recommended - One-Time Setup):</strong> Run setup SQL once
            </p>
            <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
              <li>Run <code className="text-xs bg-muted px-1 py-0.5 rounded">enable-realtime-via-rpc.sql</code> in Supabase SQL Editor (one time only)</li>
              <li>After that, you can use the "Enable Realtime" button above - no more SQL needed!</li>
            </ol>
            <p className="text-sm mt-3">
              <strong>Option 2:</strong> Use Supabase Dashboard UI
            </p>
            <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
              <li>Go to Database → Replication</li>
              <li>Find each table and toggle "Enable Realtime"</li>
            </ol>
            <p className="text-sm mt-3">
              <strong>Option 3:</strong> Generate and run SQL manually
            </p>
            <p className="text-xs text-muted-foreground">
              Click "Generate SQL Script" above and execute it in your Supabase SQL Editor
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

