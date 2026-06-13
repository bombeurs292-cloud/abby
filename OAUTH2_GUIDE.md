# OAuth2 Integration Guide

## 📋 Configuration YouTube OAuth2

### Étape 1 : Créer un projet Google Cloud

1. Accède à [Google Cloud Console](https://console.cloud.google.com/)
2. Crée un nouveau projet
3. Active les APIs :
   - YouTube Data API v3
   - Google+ API

### Étape 2 : Créer des identifiants OAuth2

1. Va à **Credentials** > **Create Credentials** > **OAuth client ID**
2. Configure l'écran de consentement :
   - Type d'application : Web application
   - URIs de redirection autorisés :
     ```
     http://localhost:5000/api/oauth/youtube/callback
     https://ton-domaine.com/api/oauth/youtube/callback
     ```
3. Copie le **Client ID** et **Client Secret**

### Étape 3 : Ajoute à `.env`

```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

---

## 📋 Configuration TikTok OAuth2

### Étape 1 : Créer une application TikTok

1. Accède à [TikTok Developer](https://developer.tiktok.com/)
2. Crée une nouvelle application
3. Configure les paramètres :
   - **Platform** : Web
   - **Redirect URLs** :
     ```
     http://localhost:5000/api/oauth/tiktok/callback
     https://ton-domaine.com/api/oauth/tiktok/callback
     ```

### Étape 2 : Obtiens les identifiants

1. Va à **My Apps** > Sélectionne ton app
2. Copie :
   - **Client ID** (API Key)
   - **Client Secret**

### Étape 3 : Demande l'accès aux scopes

Les scopes utilisés :
- `user.info.basic` - Informations utilisateur
- `video.upload` - Upload de vidéos

### Étape 4 : Ajoute à `.env`

```env
TIKTOK_API_KEY=your_client_key_here
TIKTOK_API_SECRET=your_client_secret_here
```

---

## 🔌 Routes OAuth2

### YouTube

#### Démarrer l'authentification
```http
GET /api/oauth/youtube/authorize
```

#### Callback automatique
```http
GET /api/oauth/youtube/callback?code=...&state=...
```

#### Stocker les tokens (côté frontend)
```http
POST /api/oauth/youtube/store
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "ya29...",
  "refreshToken": "1//...",
  "channelId": "UCxxxx",
  "channelName": "My Channel"
}
```

#### Rafraîchir le token
```http
POST /api/oauth/youtube/refresh-token
Authorization: Bearer <token>
```

#### Révoquer l'accès
```http
POST /api/oauth/youtube/revoke
Authorization: Bearer <token>
```

### TikTok

#### Démarrer l'authentification
```http
GET /api/oauth/tiktok/authorize
```

#### Callback automatique
```http
GET /api/oauth/tiktok/callback?code=...&state=...
```

#### Stocker les tokens (côté frontend)
```http
POST /api/oauth/tiktok/store
Authorization: Bearer <token>
Content-Type: application/json

{
  "accessToken": "access_token_here",
  "refreshToken": "refresh_token_here",
  "userId": "open_id_here",
  "username": "@my_username"
}
```

#### Rafraîchir le token
```http
POST /api/oauth/tiktok/refresh-token
Authorization: Bearer <token>
```

#### Révoquer l'accès
```http
POST /api/oauth/tiktok/revoke
Authorization: Bearer <token>
```

---

## 🌊 Flux d'authentification complet

### Frontend

```javascript
// 1. Redirect user to authorize
window.location.href = 'http://localhost:5000/api/oauth/youtube/authorize';

// 2. Handle callback in success page
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const refreshToken = urlParams.get('refresh_token');
const channelId = urlParams.get('channel_id');
const channelName = urlParams.get('channel_name');

// 3. Store in backend
const response = await fetch('/api/oauth/youtube/store', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accessToken,
    refreshToken,
    channelId,
    channelName
  })
});
```

---

## 📊 Routes Analytics

### YouTube Analytics

#### Get channel info
```http
GET /api/analytics/youtube/channel
Authorization: Bearer <token>
```

#### Get video analytics
```http
GET /api/analytics/youtube/video/:videoId
Authorization: Bearer <token>
```

#### List videos
```http
GET /api/analytics/youtube/videos?maxResults=25&pageToken=...
Authorization: Bearer <token>
```

### TikTok Analytics

#### Get user info
```http
GET /api/analytics/tiktok/user
Authorization: Bearer <token>
```

#### Get video analytics
```http
GET /api/analytics/tiktok/video/:videoId
Authorization: Bearer <token>
```

#### List videos
```http
GET /api/analytics/tiktok/videos?maxResults=10&cursor=0
Authorization: Bearer <token>
```

---

## 🔒 Sécurité

### ✅ Bonnes pratiques

1. **Stockage des tokens**
   - Jamais en localStorage (attaque XSS)
   - Utilise des httpOnly cookies
   - Stocke dans la base de données chiffrée

2. **Validation du State**
   - Toujours vérifier le paramètre state
   - Prévient les attaques CSRF

3. **Refresh tokens**
   - Implémente une auto-rotation
   - Rafraîchis avant expiration

4. **Rate limiting**
   - Ajoute un rate limiter aux routes OAuth
   - Protège contre les brute force attacks

### 🛡️ Exemple de rate limiter

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives
  message: 'Trop de tentatives de connexion'
});

router.get('/youtube/authorize', oauthLimiter, ...);
```

---

## 🧪 Test local

```bash
# Démarre le serveur
npm run dev

# Dans un autre terminal, teste YouTube auth
curl http://localhost:5000/api/oauth/youtube/authorize

# Ou utilise Postman pour les requêtes POST
```

---

## 🆘 Troubleshooting

### YouTube

| Erreur | Solution |
|--------|----------|
| `invalid_client` | Vérifie Client ID et Secret |
| `redirect_uri_mismatch` | Ajoute l'URI de redirection dans Google Cloud |
| `access_denied` | Utilisateur a refusé l'autorisation |
| `invalid_grant` | Refresh token expiré, demande une nouvelle auth |

### TikTok

| Erreur | Solution |
|--------|----------|
| `invalid_client_key` | Vérifie le Client ID (API Key) |
| `invalid_request` | Manque de scope ou paramètre invalide |
| `access_denied` | Utilisateur a refusé l'autorisation |
| `token_expired` | Utilise le refresh token |

---

## 📚 Ressources

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)
- [TikTok OAuth Documentation](https://developers.tiktok.com/doc/login-kit-web/)
- [TikTok Video Upload API](https://developers.tiktok.com/doc/video-upload-api/)
