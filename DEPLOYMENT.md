# DevProof Deployment Guide

Complete guide for running DevProof in development and production environments.

## Development Setup (Local)

### Prerequisites
- Node.js 18+ installed
- MongoDB installed (or Docker)
- Gemini API key from Google AI Studio

### Step 1: Setup Backend

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Step 2: Start MongoDB
```bash
# Option A: Homebrew (macOS)
brew install mongodb-community
brew services start mongodb-community

# Option B: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 3: Start Backend Server
```bash
cd backend
npm run dev
```
Backend will run on `http://localhost:3002`

### Step 4: Setup Frontend
```bash
# In root directory
npm install

# Create .env if not exists
cp .env.example .env
```

Ensure `.env` has:
```
VITE_API_URL=http://localhost:3002
VITE_WS_URL=ws://localhost:3002/ws/interview
```

### Step 5: Start Frontend
```bash
npm run dev
```
Frontend will run on `http://localhost:3001`

### Step 6: Test the System

1. Open `http://localhost:3001`
2. Navigate to Interview Setup
3. Upload resume, paste JD, generate questions
4. Start interview
5. Click "Join Audio Room"
6. Verify:
   - ✅ WebSocket connected
   - ✅ Audio visualizer active
   - ✅ AI responds to speech
   - ✅ Transcripts appear in real-time

## Production Deployment

### Option 1: Single VPS (DigitalOcean, AWS EC2, etc.)

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2
```

#### 2. Deploy Application
```bash
# Clone repository
git clone <your-repo-url>
cd DevProofAI

# Backend
cd backend
npm install --production
cp .env.example .env
# Edit .env with production values
pm2 start src/server.js --name devproof-backend
pm2 save

# Frontend
cd ..
npm install
npm run build

# Serve frontend with nginx
sudo apt install -y nginx
```

#### 3. Nginx Configuration
```nginx
# /etc/nginx/sites-available/devproof

server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    location / {
        root /path/to/DevProofAI/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/devproof /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Separate Services (Recommended for Scale)

**Frontend:** Vercel/Netlify
**Backend:** Railway/Render/Heroku
**Database:** MongoDB Atlas

#### Frontend on Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://your-backend.railway.app
# VITE_WS_URL=wss://your-backend.railway.app/ws/interview
```

#### Backend on Railway
1. Push backend to GitHub
2. Create new project on Railway
3. Connect GitHub repo, select `backend` folder as root
4. Add environment variables:
   - `GEMINI_API_KEY`
   - `MONGODB_URI` (from MongoDB Atlas)
   - `FRONTEND_URL` (Vercel URL)
   - `NODE_ENV=production`
5. Deploy

#### Database on MongoDB Atlas
1. Create free cluster at mongodb.com/cloud/atlas
2. Add database user
3. Whitelist IP (or use 0.0.0.0/0 for all)
4. Get connection string
5. Add to backend env as `MONGODB_URI`

## Environment Variables Reference

### Frontend `.env`
```
VITE_API_URL=<backend-url>          # http://localhost:3002 or https://api.yourdomain.com
VITE_WS_URL=<websocket-url>         # ws://localhost:3002/ws/interview or wss://api.yourdomain.com/ws/interview
```

### Backend `.env`
```
GEMINI_API_KEY=<your-api-key>       # From Google AI Studio
PORT=3002                           # Backend port
NODE_ENV=production                 # Environment
MONGODB_URI=<mongodb-connection>    # mongodb://localhost:27017/devproof or MongoDB Atlas URI
FRONTEND_URL=<frontend-origin>      # http://localhost:3001 or https://yourdomain.com
```

## Security Checklist

- [ ] API keys stored only in backend
- [ ] CORS configured with specific origin (not `*`)
- [ ] HTTPS enabled (SSL certificate via Let's Encrypt)
- [ ] WSS (secure WebSocket) for production
- [ ] MongoDB authentication enabled
- [ ] Rate limiting on API endpoints (future)
- [ ] Input validation and sanitization (future)
- [ ] Helmet.js for security headers (future)

## Monitoring

### PM2 Commands
```bash
pm2 status                # Check status
pm2 logs devproof-backend # View logs
pm2 restart devproof-backend
pm2 stop devproof-backend
pm2 delete devproof-backend
```

### MongoDB Monitoring
```bash
mongosh
> use devproof
> db.sessions.countDocuments()
> db.transcripts.find().limit(10)
```

## Troubleshooting

**Issue:** WebSocket connection fails in production
**Solution:** Ensure WSS (not WS) is used, check nginx proxy configuration

**Issue:** CORS error on production
**Solution:** Set exact frontend URL in `FRONTEND_URL` backend env variable

**Issue:** MongoDB timeout in production
**Solution:** Whitelist server IP in MongoDB Atlas, check connection string format

**Issue:** Gemini API 429 (rate limit)
**Solution:** Implement request queuing or upgrade API quota

## Cost Estimation (Monthly)

**Free Tier Setup:**
- Frontend: Vercel Free ($0)
- Backend: Railway Hobby ($5)
- Database: MongoDB Atlas Free ($0)
- **Total: ~$5/month**

**Production Setup:**
- Frontend: Vercel Pro ($20)
- Backend: Railway Pro ($20)
- Database: MongoDB Atlas M10 ($57)
- CDN: Cloudflare Free ($0)
- **Total: ~$97/month**

## Next Steps (Phase 3)

- [ ] Implement real code execution (Judge0 API or Docker sandbox)
- [ ] Add user authentication (JWT)
- [ ] Certificate generation with PDF export
- [ ] Admin dashboard
- [ ] Analytics and metrics
- [ ] Email notifications
- [ ] Multi-language support
