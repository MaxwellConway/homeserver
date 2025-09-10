const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Session-based job storage - each session has its own jobs
const sessionJobs = new Map();
// Job timeout in milliseconds (10 minutes)
const JOB_TIMEOUT = 10 * 60 * 1000;

// Middleware
app.use(cors({
  credentials: true,
  origin: true
}));
app.use(express.json());

// Session middleware - create or retrieve session ID
app.use((req, res, next) => {
  let sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    sessionId = uuidv4();
    res.setHeader('X-Session-Id', sessionId);
  }
  
  req.sessionId = sessionId;
  
  // Initialize session jobs if not exists
  if (!sessionJobs.has(sessionId)) {
    sessionJobs.set(sessionId, new Map());
  }
  
  next();
});

app.use(express.static(path.join(__dirname, '../client/build')));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../data');
fs.ensureDirSync(DATA_DIR);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start processing a YouTube URL
app.post('/api/process', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'YouTube URL is required' });
  }

  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  const jobId = uuidv4();
  const jobDir = path.join(DATA_DIR, req.sessionId, jobId);
  
  // Initialize job
  const job = {
    id: jobId,
    url,
    status: 'starting',
    progress: 0,
    steps: {
      download: 'pending',
      separate: 'pending'
    },
    files: {},
    error: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + JOB_TIMEOUT).toISOString(),
    sessionId: req.sessionId
  };
  
  const userJobs = sessionJobs.get(req.sessionId);
  userJobs.set(jobId, job);
  
  // Start processing asynchronously
  processVideo(req.sessionId, jobId, url, jobDir);
  
  res.json({ jobId, status: 'started' });
});

// Get job status
app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const userJobs = sessionJobs.get(req.sessionId);
  const job = userJobs ? userJobs.get(jobId) : null;
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Get all jobs for current session
app.get('/api/jobs', (req, res) => {
  const userJobs = sessionJobs.get(req.sessionId);
  if (!userJobs) {
    return res.json([]);
  }
  
  const allJobs = Array.from(userJobs.values()).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(allJobs);
});

// Serve audio files
app.get('/api/files/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params;
  
  // Find the job across all sessions since file requests don't always include session headers
  let job = null;
  let sessionId = null;
  
  for (const [sid, userJobs] of sessionJobs.entries()) {
    const foundJob = userJobs.get(jobId);
    if (foundJob) {
      job = foundJob;
      sessionId = sid;
      break;
    }
  }
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const filePath = path.join(DATA_DIR, sessionId, jobId, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Get file stats for proper headers
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  
  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Accept-Ranges', 'bytes');
  
  // Handle range requests for audio streaming
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunksize);
    
    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // Handle download parameter
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      // For inline playback, set proper headers
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
});

// Delete job and its files
app.delete('/api/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const userJobs = sessionJobs.get(req.sessionId);
  const job = userJobs ? userJobs.get(jobId) : null;
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Remove files
  const jobDir = path.join(DATA_DIR, req.sessionId, jobId);
  try {
    await fs.remove(jobDir);
  } catch (error) {
    console.error('Error removing job files:', error);
  }
  
  // Remove from memory
  userJobs.delete(jobId);
  
  res.json({ message: 'Job deleted successfully' });
});

// Process video function
async function processVideo(sessionId, jobId, url, jobDir) {
  const userJobs = sessionJobs.get(sessionId);
  const job = userJobs.get(jobId);
  
  try {
    // Create job directory
    await fs.ensureDir(jobDir);
    
    // Step 1: Download audio using yt-dlp
    job.status = 'downloading';
    job.steps.download = 'running';
    userJobs.set(jobId, job);
    
    const audioFile = await downloadAudio(url, jobDir, (progress) => {
      job.progress = Math.floor(progress * 0.3); // Download is 30% of total progress
      userJobs.set(jobId, job);
    });
    
    job.steps.download = 'completed';
    job.files.original = path.basename(audioFile);
    job.progress = 30;
    userJobs.set(jobId, job);
    
    // Step 2: Separate stems using Demucs
    job.status = 'separating';
    job.steps.separate = 'running';
    userJobs.set(jobId, job);
    
    const stemFiles = await separateStems(audioFile, jobDir, (progress) => {
      job.progress = 30 + Math.floor(progress * 0.7); // Separation is 70% of total progress
      userJobs.set(jobId, job);
    });
    
    job.steps.separate = 'completed';
    job.files.stems = stemFiles;
    job.progress = 100;
    job.status = 'completed';
    userJobs.set(jobId, job);
    
    // Schedule automatic cleanup after timeout
    setTimeout(() => {
      cleanupJob(sessionId, jobId);
    }, JOB_TIMEOUT);
    
  } catch (error) {
    console.error('Processing error:', error);
    job.status = 'error';
    job.error = error.message;
    userJobs.set(jobId, job);
  }
}

// Download audio using yt-dlp
function downloadAudio(url, outputDir, progressCallback) {
  return new Promise((resolve, reject) => {
    // Use a sanitized filename to avoid issues with spaces and special characters
    const outputTemplate = path.join(outputDir, 'audio.%(ext)s');
    
    const ytdlp = spawn('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'wav',
      '--audio-quality', '0',
      '--output', outputTemplate,
      '--no-playlist',
      url
    ]);
    
    let outputFile = '';
    
    ytdlp.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('yt-dlp stdout:', output);
      
      // Try to extract filename from output
      const filenameMatch = output.match(/\[download\] Destination: (.+)/);
      if (filenameMatch) {
        outputFile = filenameMatch[1];
      }
      
      // Extract progress
      const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (progressMatch && progressCallback) {
        const progress = parseFloat(progressMatch[1]) / 100;
        progressCallback(progress);
      }
    });
    
    ytdlp.stderr.on('data', (data) => {
      console.error('yt-dlp stderr:', data.toString());
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Find the actual output file
        const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.wav'));
        if (files.length > 0) {
          resolve(path.join(outputDir, files[0]));
        } else {
          reject(new Error('No audio file found after download'));
        }
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

// Separate stems using Demucs
function separateStems(audioFile, outputDir, progressCallback) {
  return new Promise((resolve, reject) => {
    // Use default htdemucs model for stem separation
    const demucs = spawn('python', [
      '-m', 'demucs', 
      '--out', outputDir,
      audioFile
    ]);
    
    demucs.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('demucs stdout:', output);
      
      // Extract progress (Demucs doesn't provide detailed progress, so we'll simulate)
      if (output.includes('Separating')) {
        progressCallback(0.1);
      } else if (output.includes('Processing')) {
        progressCallback(0.5);
      } else if (output.includes('100%')) {
        progressCallback(0.9);
      }
    });
    
    demucs.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      console.error('demucs stderr:', errorOutput);
      
      // Log specific error patterns for debugging
      if (errorOutput.includes('FATAL')) {
        console.error('FATAL Demucs error detected:', errorOutput);
      }
      if (errorOutput.includes('model')) {
        console.error('Model-related error:', errorOutput);
      }
    });
    
    demucs.on('close', (code) => {
      if (code === 0) {
        try {
          // Find separated stems in the htdemucs directory (default output structure)
          const htdemucsDir = path.join(outputDir, 'htdemucs');
          
          if (fs.existsSync(htdemucsDir)) {
            const stemDirs = fs.readdirSync(htdemucsDir);
            
            if (stemDirs.length > 0) {
              const stemDir = path.join(htdemucsDir, stemDirs[0]);
              const stemFiles = fs.readdirSync(stemDir)
                .filter(f => f.endsWith('.wav'))
                .map(f => path.basename(f));
              
              // Move stem files to main job directory for easier access
              stemFiles.forEach(file => {
                const srcPath = path.join(stemDir, file);
                const destPath = path.join(outputDir, file);
                fs.moveSync(srcPath, destPath);
              });
              
              progressCallback(1.0);
              resolve(stemFiles);
            } else {
              reject(new Error('No stems found after separation'));
            }
          } else {
            reject(new Error('No htdemucs directory found - separation may have failed'));
          }
        } catch (error) {
          reject(new Error(`Error processing stems: ${error.message}`));
        }
      } else {
        reject(new Error(`Demucs exited with code ${code}`));
      }
    });
  });
}

// Cleanup function for expired jobs
async function cleanupJob(sessionId, jobId) {
  const userJobs = sessionJobs.get(sessionId);
  if (!userJobs) return;
  
  const job = userJobs.get(jobId);
  if (!job) return;
  
  console.log(`Cleaning up expired job: ${jobId} for session: ${sessionId}`);
  
  // Remove files
  const jobDir = path.join(DATA_DIR, sessionId, jobId);
  try {
    await fs.remove(jobDir);
    console.log(`Removed job directory: ${jobDir}`);
  } catch (error) {
    console.error('Error removing job files during cleanup:', error);
  }
  
  // Remove from memory
  userJobs.delete(jobId);
  
  // Clean up empty session if no jobs remain
  if (userJobs.size === 0) {
    sessionJobs.delete(sessionId);
    
    // Remove empty session directory
    const sessionDir = path.join(DATA_DIR, sessionId);
    try {
      await fs.remove(sessionDir);
      console.log(`Removed empty session directory: ${sessionDir}`);
    } catch (error) {
      console.error('Error removing session directory:', error);
    }
  }
}

// Periodic cleanup service for orphaned files and expired jobs
function startCleanupService() {
  setInterval(async () => {
    console.log('Running periodic cleanup...');
    
    const now = new Date();
    let cleanedCount = 0;
    
    // Check all sessions for expired jobs
    for (const [sessionId, userJobs] of sessionJobs.entries()) {
      const expiredJobs = [];
      
      for (const [jobId, job] of userJobs.entries()) {
        if (new Date(job.expiresAt) < now) {
          expiredJobs.push(jobId);
        }
      }
      
      // Clean up expired jobs
      for (const jobId of expiredJobs) {
        await cleanupJob(sessionId, jobId);
        cleanedCount++;
      }
    }
    
    // Clean up orphaned directories (directories without corresponding jobs)
    try {
      const sessionDirs = await fs.readdir(DATA_DIR);
      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(DATA_DIR, sessionDir);
        const stat = await fs.stat(sessionPath);
        
        if (stat.isDirectory()) {
          const userJobs = sessionJobs.get(sessionDir);
          
          if (!userJobs || userJobs.size === 0) {
            // Session has no active jobs, remove directory
            await fs.remove(sessionPath);
            console.log(`Removed orphaned session directory: ${sessionPath}`);
            cleanedCount++;
          } else {
            // Check for orphaned job directories within session
            const jobDirs = await fs.readdir(sessionPath);
            for (const jobDir of jobDirs) {
              if (!userJobs.has(jobDir)) {
                const jobPath = path.join(sessionPath, jobDir);
                await fs.remove(jobPath);
                console.log(`Removed orphaned job directory: ${jobPath}`);
                cleanedCount++;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during orphaned file cleanup:', error);
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleanup completed: ${cleanedCount} items cleaned`);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}

// Serve React app for all other routes (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Stemtool server running on port ${PORT}`);
  console.log(`Job timeout set to ${JOB_TIMEOUT / 1000 / 60} minutes`);
  
  // Start the cleanup service
  startCleanupService();
});
