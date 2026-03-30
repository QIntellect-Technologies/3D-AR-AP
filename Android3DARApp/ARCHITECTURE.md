# Android 3D Capture & AR Modeling App - Architecture & Product Doc

## Overview

This repo implements a React Native Android-first app and Node.js backend for photo/video-based 3D reconstruction and AR model visualization.

Core features:

- Guided photo capture with quality checks (blur/exposure)
- Upload pipeline with signed URL direct upload to Supabase storage
- Backend job queue (BullMQ + Redis) for reconstruction
- Model processing and GLB publishing
- Viewer and AR placeholder screens in app
- Supabase Auth + sessions

## Backend components

- `src/server.ts` - Express entrypoint, routes: `/api/uploads`, `/api/projects`, `/api/jobs`, `/api/webhooks`
- `src/routes/uploads.ts` - signed upload URL generator
- `src/routes/projects.ts` - create/list/project trigger/status/glb_url
- `src/routes/jobs.ts` - job status lookup
- `src/routes/webhooks.ts` - worker/status callbacks (stub)
- `src/config/supabaseAdmin.ts` - service key client
- `src/config/queue.ts` - Redis connection config
- `src/queues/reconstructionQueue.ts` - BullMQ queue
- `src/workers/reconstruction.ts` - processing worker (Meshroom + upload)

## Mobile components

- `src/navigation/AppNavigator.tsx` - auth gating and flows
- `src/screens/HomeScreen.tsx` - launch capture/upload/projects
- `src/screens/CaptureScreen.tsx` - capture flow
- `src/screens/ProcessingScreen.tsx` - job progress polling + realtime
- `src/screens/ViewerScreen.tsx` - GLB viewer placeholder
- `src/screens/ARScreen.tsx` - AR placement placeholder
- `src/screens/ProjectListScreen.tsx` - list past projects and connect to existing model
- `src/screens/GLBUploadScreen.tsx` - import existing GLB and optionally triggers backend processing

## Missing/next features

- Real `react-three-fiber` GLB render and point cloud LOD
- ARCore placement + occlusion, scaling
- Object selection/mask capture flow
- Video extraction and auto-frame selection pipeline
- Model spec calculator (W/H/D/volume/surface/AR scale) with precision metrics
- Subscription tier enforcement & quotas
- Full enterprise multi-user collaboration and private projects

## Setup

- Mobile: standard React Native CLI + env with SUPABASE_URL/anon key
- Backend: `npm install`, set `.env` with Supabase + REDIS_URL + SERVICE_ROLE key, run `npm start`

## Architecture notes

1. Mobile captures photos locally
2. Upload to Supabase storage with signed URLs
3. Trigger backend reconstruction job
4. Worker downloads photos, runs Meshroom, exports GLB
5. Worker uploads GLB back to Supabase and updates job/project records
6. Mobile updates UI via Supabase realtime or polling
