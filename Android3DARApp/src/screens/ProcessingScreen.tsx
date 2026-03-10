import React, { useState, useEffect } from 'react';
import { Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProcessingScreenProps } from '@/types/navigation';
import { supabase } from '../config/supabase';
import { api } from '../utils/api';

type JobRow = {
  id: string;
  project_id: string;
  status: string;
  progress: number;
  model_url?: string | null;
  error?: string | null;
};

export default function ProcessingScreen({ route, navigation }: ProcessingScreenProps) {
  const { jobId } = route.params;

  const [status, setStatus] = useState('queued');
  const [progress, setProgress] = useState(0);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let realtimeWatchdog: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    let realtimeReady = false;

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => {
        fetchJob();
      }, 10000);
    };

    const applyJob = (job: JobRow) => {
      if (!isMounted) return;

      setStatus(job.status || 'unknown');
      setProgress(typeof job.progress === 'number' ? job.progress : 0);
      setModelUrl(job.model_url ?? null);
      setErrorMsg(job.error ?? null);

      if (job.status === 'completed' && job.model_url) {
        stopPolling();
        navigation.replace('Viewer', { glbUrl: job.model_url });
      }

      if (job.status === 'failed') {
        stopPolling();
      }
    };

    const fetchJob = async () => {
      try {
        const res = await api<{ job: JobRow }>(`/jobs/${jobId}`);
        applyJob(res.job);
      } catch (err: any) {
        console.error('fetchJob failed:', err.message);

        if (
          err?.message?.includes('Invalid token') ||
          err?.message?.includes('Unauthorized') ||
          err?.message?.includes('Auth service unreachable')
        ) {
          stopPolling();
          setStatus('failed');
          setErrorMsg(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // initial fetch once
    fetchJob();

    const channel = supabase
      .channel(`recon_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recon_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as JobRow;
          console.log('Realtime recon_jobs update:', row);
          applyJob(row);
        }
      )
      .subscribe((subStatus) => {
        console.log('Realtime subscription status:', subStatus);

        if (subStatus === 'SUBSCRIBED') {
          realtimeReady = true;
          stopPolling();
        }
      });

    // only start polling if realtime does not become ready soon
    realtimeWatchdog = setTimeout(() => {
      if (!realtimeReady) {
        startPolling();
      }
    }, 4000);

    return () => {
      isMounted = false;
      stopPolling();

      if (realtimeWatchdog) {
        clearTimeout(realtimeWatchdog);
      }

      supabase.removeChannel(channel);
    };
  }, [jobId, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Processing Your Model</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" />
      ) : (
        <>
          <Text style={styles.status}>Status: {status.toUpperCase()}</Text>
          <Text style={styles.info}>Progress: {progress}%</Text>
          <Text style={styles.info}>Job ID: {jobId}</Text>

          {status === 'queued' && (
            <Text style={styles.message}>Your job is queued and will start soon.</Text>
          )}

          {status === 'processing' && (
            <Text style={styles.message}>
              Reconstruction in progress... This may take a few minutes.
            </Text>
          )}

          {status === 'completed' && (
            <Text style={styles.success}>Model is ready! Loading viewer...</Text>
          )}

          {status === 'failed' && (
            <Text style={styles.error}>Processing failed: {errorMsg ?? 'Unknown error'}</Text>
          )}

          {modelUrl ? <Text style={styles.info}>GLB: {modelUrl}</Text> : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  status: { fontSize: 22, color: '#10b981', textAlign: 'center', marginVertical: 16 },
  info: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 10 },
  message: { fontSize: 18, color: '#cbd5e1', textAlign: 'center', marginTop: 16 },
  success: { fontSize: 20, color: '#34d399', textAlign: 'center', marginTop: 24 },
  error: { fontSize: 18, color: '#ef4444', textAlign: 'center', marginTop: 16 },
});
