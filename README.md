# Artisan's Echo - Server Side

Backend API for Artisan's Echo art marketplace platform built with Node.js, Express, and MongoDB.

## 🚀 Technologies

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Environment variable management

## 📦 Installation

1. Clone the repository
```bash
git clone https://github.com/Nafiz001/artify-server-side.git
cd artify-server-side
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```env
PORT=3000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
```

4. Start the server
```bash
node index.js
```

## 🔌 API Endpoints

### User Routes
- `POST /users` - Create or get user

### Artwork Routes
- `GET /artworks` - Get all public artworks
- `GET /latest-artworks` - Get 6 most recent artworks
- `GET /featured-artworks` - Get featured artworks
- `GET /my-artworks/:email` - Get artworks by user email
- `GET /artwork/:id` - Get single artwork by ID
- `POST /artworks` - Add new artwork
- `PATCH /artwork/:id` - Update artwork
- `DELETE /artwork/:id` - Delete artwork
- `PATCH /artwork/:id/like` - Increase like count
- `GET /artworks/search/:searchTerm` - Search artworks
- `GET /artworks/category/:category` - Filter by category

### Favorites Routes
- `POST /favorites` - Add to favorites
- `GET /favorites/:email` - Get user's favorites
- `DELETE /favorites` - Remove from favorites

## 🔐 Environment Variables

```env
PORT=3000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
```

## 📝 Database Structure

### Collections

**artworks**
```javascript
{
  _id: ObjectId,
  image: String,
  title: String,
  category: String,
  medium: String,
  description: String,
  dimensions: String,
  price: Number,
  visibility: String,
  artistName: String,
  artistEmail: String,
  artistPhoto: String,
  likes: Number,
  createdAt: Date
}
```

**users**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  photoURL: String
}
```

**favorites**
```javascript
{
  _id: ObjectId,
  userEmail: String,
  artworkId: String,
  addedAt: String
}
```

## 🚀 Deployment

This server is configured for deployment on Vercel.

1. Install Vercel CLI
```bash
npm i -g vercel
```

2. Deploy
```bash
vercel
```

## 👨‍💻 Author

**Nafiz001**  
GitHub: [@Nafiz001](https://github.com/Nafiz001)

## 📄 License

MIT License
