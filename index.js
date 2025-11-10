const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 100;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const userData = rateLimitMap.get(ip);
  
  if (now > userData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (userData.count >= MAX_REQUESTS) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'Please try again later' 
    });
  }
  
  userData.count++;
  next();
});

const validateArtwork = (req, res, next) => {
  const { title, image, category, artistName, artistEmail } = req.body;
  
  if (!title || !image || !category || !artistName || !artistEmail) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['title', 'image', 'category', 'artistName', 'artistEmail']
    });
  }
  
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
  if (!urlPattern.test(image)) {
    return res.status(400).json({ 
      error: 'Invalid image URL format',
      message: 'Image must be a valid URL ending with jpg, jpeg, png, gif, or webp'
    });
  }
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(artistEmail)) {
    return res.status(400).json({ 
      error: 'Invalid email format'
    });
  }
  
  next();
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
};

const uri = `mongodb+srv://artify_db_user:HZGIuzI3a6rVJ12q@cluster0.rcvljwd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Artisan\'s Echo Server is running');
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db('artisans_echo_db');
    const { artworksCollection, usersCollection, favoritesCollection } = await initializeCollections(db);
    setupDatabaseRoutes(artworksCollection, usersCollection, favoritesCollection);

  } catch (error) {
    console.log("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}



async function initializeCollections(db) {
  const artworksCollection = db.collection('artworks');
  const usersCollection = db.collection('users');
  const favoritesCollection = db.collection('favorites');

  try {
    await artworksCollection.createIndex({ createdAt: -1 });
    await artworksCollection.createIndex({ artistEmail: 1 });
    await artworksCollection.createIndex({ visibility: 1 });
    
    return { artworksCollection, usersCollection, favoritesCollection };
    
  } catch (error) {
    console.error("Error initializing collections:", error);
    throw error;
  }
}

function setupDatabaseRoutes(artworksCollection, usersCollection, favoritesCollection) {
    
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send({ message: 'User already exists', userId: existingUser._id });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    app.get('/artworks', async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;
        
        const query = { visibility: 'Public' };
        const cursor = artworksCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const result = await cursor.toArray();
        const total = await artworksCollection.countDocuments(query);
        
        res.send({
          artworks: result,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalArtworks: total,
            limit
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch artworks', message: error.message });
      }
    });

    app.get('/all-artworks', async (req, res) => {
      try {
        const query = { visibility: 'Public' };
        const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch artworks', message: error.message });
      }
    });

    app.get('/featured-artworks', async (req, res) => {
      const query = { visibility: 'Public' };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/latest-artworks', async (req, res) => {
      const query = { visibility: 'Public' };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/my-artworks/:email', async (req, res) => {
      const email = req.params.email;
      const query = { artistEmail: email };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artworksCollection.findOne(query);
      res.send(result);
    });

    app.post('/artworks', validateArtwork, async (req, res) => {
      try {
        const newArtwork = req.body;
        newArtwork.createdAt = new Date();
        newArtwork.likes = 0;
        const result = await artworksCollection.insertOne(newArtwork);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to add artwork', message: error.message });
      }
    });

    app.patch('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const updatedArtwork = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: updatedArtwork
      };
      const result = await artworksCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artworksCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/artwork/:id/like', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $inc: { likes: 1 } };
      const result = await artworksCollection.updateOne(query, update);
      res.send(result);
    });

    app.get('/artworks/search/:searchTerm', async (req, res) => {
      const searchTerm = req.params.searchTerm;
      const query = {
        visibility: 'Public',
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { artistName: { $regex: searchTerm, $options: 'i' } }
        ]
      };
      const cursor = artworksCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/artworks/category/:category', async (req, res) => {
      const category = req.params.category;
      const query = { visibility: 'Public', category: category };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });
    
    app.get('/stats/total-artworks', async (req, res) => {
      try {
        const total = await artworksCollection.countDocuments({ visibility: 'Public' });
        res.send({ total });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics', message: error.message });
      }
    });

    app.get('/stats/by-category', async (req, res) => {
      try {
        const categories = await artworksCollection.aggregate([
          { $match: { visibility: 'Public' } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray();
        res.send(categories);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category stats', message: error.message });
      }
    });

    app.post('/favorites', async (req, res) => {
      const favorite = req.body;
      const query = {
        userEmail: favorite.userEmail,
        artworkId: favorite.artworkId
      };
      const existingFavorite = await favoritesCollection.findOne(query);

      if (existingFavorite) {
        res.send({ message: 'Already in favorites' });
      } else {
        const result = await favoritesCollection.insertOne(favorite);
        res.send(result);
      }
    });

    app.get('/favorites/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const favorites = await favoritesCollection.find(query).toArray();
      
      const artworkIds = favorites.map(fav => new ObjectId(fav.artworkId));
      const artworks = await artworksCollection.find({ _id: { $in: artworkIds } }).toArray();
      
      res.send(artworks);
    });

    app.delete('/favorites', async (req, res) => {
      const { userEmail, artworkId } = req.body;
      const query = { userEmail: userEmail, artworkId: artworkId };
      const result = await favoritesCollection.deleteOne(query);
      res.send(result);
    });
}

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db('artisans_echo_db');
    const { artworksCollection, usersCollection, favoritesCollection } = await initializeCollections(db);
    setupDatabaseRoutes(artworksCollection, usersCollection, favoritesCollection);

  } catch (error) {
    console.log("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

run().catch(console.dir);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
