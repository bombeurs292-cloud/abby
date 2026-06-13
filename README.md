# Abby - Video Manager API

Une API complète pour planifier, organiser et publier des vidéos sur YouTube et TikTok.

## 🚀 Fonctionnalités

- ✅ Authentification utilisateur (JWT)
- ✅ Gestion des vidéos (CRUD)
- ✅ Intégration YouTube & TikTok
- ✅ Planification automatique des publications
- ✅ Gestion des connexions de plateforme
- ✅ Analytics en temps réel
- ✅ Notifications et configurations

## 📋 Prérequis

- Node.js 14+
- MongoDB
- npm ou yarn

## 🔧 Installation

1. Clone le repository
```bash
git clone https://github.com/bombeurs292-cloud/abby.git
cd abby
```

2. Installe les dépendances
```bash
npm install
```

3. Configure les variables d'environnement
```bash
cp .env.example .env
# Édite .env avec tes clés API
```

4. Démarre le serveur
```bash
npm run dev    # Développement avec auto-reload
npm start      # Production
```

## 📚 Documentation API

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Videos

#### Get all videos
```http
GET /api/videos
Authorization: Bearer <token>
```

#### Create video
```http
POST /api/videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My awesome video",
  "description": "Video description",
  "tags": ["vlog", "tutorial"],
  "platforms": {
    "youtube": { "enabled": true },
    "tiktok": { "enabled": true }
  }
}
```

#### Update video
```http
PUT /api/videos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated title",
  "status": "scheduled"
}
```

#### Delete video
```http
DELETE /api/videos/:id
Authorization: Bearer <token>
```

### Platforms

#### Connect YouTube
```http
POST /api/platforms/youtube/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "your_youtube_access_token",
  "refreshToken": "your_youtube_refresh_token",
  "channelId": "UCxxxxx",
  "channelName": "My Channel"
}
```

#### Connect TikTok
```http
POST /api/platforms/tiktok/connect
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "your_tiktok_access_token",
  "refreshToken": "your_tiktok_refresh_token",
  "userId": "your_tiktok_user_id",
  "username": "@your_tiktok_handle"
}
```

#### Get platform connections
```http
GET /api/platforms/connections
Authorization: Bearer <token>
```

### Scheduler

#### Schedule publication
```http
POST /api/scheduler/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "videoId": "video_id_here",
  "platforms": ["youtube", "tiktok"],
  "scheduledFor": "2024-12-31T20:00:00Z"
}
```

#### Get scheduled jobs
```http
GET /api/scheduler/jobs
Authorization: Bearer <token>
```

## 🏗️ Structure du projet

```
src/
├── server.js              # Point d'entrée
├── models/                # Modèles MongoDB
│   ├── User.js
│   ├── Video.js
│   └── PublicationJob.js
├── routes/                # Routes API
│   ├── auth.js
│   ├── videos.js
│   ├── platforms.js
│   └── scheduler.js
├── middleware/            # Middlewares
│   ├── auth.js
│   └── validation.js
└── services/              # Services externes
    ├── youtubeService.js
    └── tiktokService.js
```

## 🔐 Variables d'environnement

Voir `.env.example` pour la liste complète.

## 📦 Déploiement

### Docker
```bash
docker build -t abby-video-manager .
docker run -p 5000:5000 --env-file .env abby-video-manager
```

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

## 🤝 Contribution

Les contributions sont bienvenues ! Ouvre une PR ou une issue.

## 📄 License

MIT
