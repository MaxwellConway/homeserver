const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Store processing jobs in memory (in production, use Redis or database)
const jobs = new Map();

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
  const jobDir = path.join(DATA_DIR, jobId);
  
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
    createdAt: new Date().toISOString()
  };
  
  jobs.set(jobId, job);
  
  // Start processing asynchronously
  processVideo(jobId, url, jobDir);
  
  res.json({ jobId, status: 'started' });
});

// Get job status
app.get('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  res.json(job);
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  const allJobs = Array.from(jobs.values()).sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(allJobs);
});

// Serve audio files
app.get('/api/files/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const filePath = path.join(DATA_DIR, jobId, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Set appropriate headers for audio streaming
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  
  // Handle download parameter
  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
  
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// Delete job and its files
app.delete('/api/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Remove files
  const jobDir = path.join(DATA_DIR, jobId);
  try {
    await fs.remove(jobDir);
  } catch (error) {
    console.error('Error removing job files:', error);
  }
  
  // Remove from memory
  jobs.delete(jobId);
  
  res.json({ message: 'Job deleted successfully' });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Process video function
async function processVideo(jobId, url, jobDir) {
  const job = jobs.get(jobId);
  
  try {
    // Create job directory
    await fs.ensureDir(jobDir);
    
    // Step 1: Download audio using yt-dlp
    job.status = 'downloading';
    job.steps.download = 'running';
    jobs.set(jobId, job);
    
    const audioFile = await downloadAudio(url, jobDir, (progress) => {
      job.progress = Math.floor(progress * 0.3); // Download is 30% of total progress
      jobs.set(jobId, job);
    });
    
    job.steps.download = 'completed';
    job.files.original = path.basename(audioFile);
    job.progress = 30;
    jobs.set(jobId, job);
    
    // Step 2: Separate stems using Demucs
    job.status = 'separating';
    job.steps.separate = 'running';
    jobs.set(jobId, job);
    
    const stemFiles = await separateStems(audioFile, jobDir, (progress) => {
      job.progress = 30 + Math.floor(progress * 0.7); // Separation is 70% of total progress
      jobs.set(jobId, job);
    });
    
    job.steps.separate = 'completed';
    job.files.stems = stemFiles;
    job.progress = 100;
    job.status = 'completed';
    jobs.set(jobId, job);
    
  } catch (error) {
    console.error('Processing error:', error);
    job.status = 'error';
    job.error = error.message;
    jobs.set(jobId, job);
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
    // Use --name to specify output directory name and avoid spaces in paths
    const demucs = spawn('python', [
      '-m', 'demucs', 
      '--out', outputDir,
      '--name', 'stems',
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
      }
    });
    
    demucs.stderr.on('data', (data) => {
      console.error('demucs stderr:', data.toString());
    });
    
    demucs.on('close', (code) => {
      if (code === 0) {
        try {
          // Find separated stems in the specified output directory
          const separatedDir = path.join(outputDir, 'stems');
          
          if (fs.existsSync(separatedDir)) {
            const stemDirs = fs.readdirSync(separatedDir);
            
            if (stemDirs.length > 0) {
              const stemDir = path.join(separatedDir, stemDirs[0]);
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
            // Fallback to default htdemucs directory
            const fallbackDir = path.join(outputDir, 'htdemucs');
            if (fs.existsSync(fallbackDir)) {
              const stemDirs = fs.readdirSync(fallbackDir);
              
              if (stemDirs.length > 0) {
                const stemDir = path.join(fallbackDir, stemDirs[0]);
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
              reject(new Error('No separated stems directory found'));
            }
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

app.listen(PORT, () => {
  console.log(`Stemtool server running on port ${PORT}`);
});
