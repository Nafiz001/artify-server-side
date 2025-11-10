# Artify Server Side

Server-side application for **Artify** - A Creative Artwork Showcase Platform.

## 🚀 Live API URL
[Artify Server API](https://your-deployment-url.vercel.app)

## 📋 Features

- **Complete CRUD Operations** for artwork management
- **MongoDB Integration** with optimized queries
- **Search & Filter** functionality for artworks
- **Like System** with increment/decrement operations  
- **Favorites Management** for user collections
- **RESTful API Design** with proper error handling
- **CORS Enabled** for cross-origin requests

## 🛠️ Technologies Used

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Cors** - Cross-origin resource sharing
- **Dotenv** - Environment variable management

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/Nafiz001/artify-server-side.git
cd artify-server-side
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
NODE_ENV=development
PORT=5000
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
```

4. Start the development server:
```bash
npm run dev
```

## 🔗 API Endpoints

### Artworks
- `GET /artworks` - Get all public artworks with search & filter
- `GET /artworks/recent` - Get 6 most recent artworks
- `GET /artworks/:id` - Get specific artwork by ID
- `GET /my-artworks/:email` - Get artworks by user email
- `POST /artworks` - Add new artwork
- `PUT /artworks/:id` - Update artwork
- `DELETE /artworks/:id` - Delete artwork
- `PATCH /artworks/:id/like` - Like/unlike artwork

### Favorites
- `GET /favorites/:email` - Get user's favorite artworks
- `POST /favorites` - Add artwork to favorites
- `DELETE /favorites` - Remove from favorites

### Utilities
- `GET /categories` - Get all artwork categories
- `GET /artist/:email/stats` - Get artist statistics
- `GET /health` - Health check endpoint

## 📊 Database Schema

### Artwork Collection
```javascript
{
  _id: ObjectId,
  imageUrl: String,
  title: String,
  category: String,
  medium: String,
  description: String,
  dimensions: String,
  price: String,
  visibility: String, // "Public" | "Private"
  userName: String,
  userEmail: String,
  createdAt: Date,
  updatedAt: Date,
  likes: Number,
  likedBy: [String] // Array of user emails
}
```

### Favorites Collection
```javascript
{
  _id: ObjectId,
  userEmail: String,
  artworkId: String,
  addedAt: Date
}
```

## 🚀 Deployment

This server is configured for deployment on **Vercel**. Make sure to:

1. Set up environment variables in your deployment platform
2. Configure CORS for your client domain
3. Ensure MongoDB connection string is properly set

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.