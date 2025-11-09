const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sqaw1iw.mongodb.net/?appName=Cluster0`;

// Create a MongoClient
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
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db('artisans_echo_db');
    const artworksCollection = db.collection('artworks');
    const usersCollection = db.collection('users');
    const favoritesCollection = db.collection('favorites');

    // ==================== USER APIs ====================
    
    // Create or get user
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

    // ==================== ARTWORK APIs ====================

    // Get all public artworks (for Explore page)
    app.get('/artworks', async (req, res) => {
      const query = { visibility: 'Public' };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get featured artworks (6 most recent for home page)
    app.get('/featured-artworks', async (req, res) => {
      const query = { visibility: 'Public' };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get latest artworks (alias for featured)
    app.get('/latest-artworks', async (req, res) => {
      const query = { visibility: 'Public' };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get artworks by user email (for My Gallery)
    app.get('/my-artworks/:email', async (req, res) => {
      const email = req.params.email;
      const query = { artistEmail: email };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // Get single artwork by ID
    app.get('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artworksCollection.findOne(query);
      res.send(result);
    });

    // Add new artwork
    app.post('/artworks', async (req, res) => {
      const newArtwork = req.body;
      newArtwork.createdAt = new Date();
      newArtwork.likes = 0;
      const result = await artworksCollection.insertOne(newArtwork);
      res.send(result);
    });

    // Update artwork
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

    // Delete artwork
    app.delete('/artwork/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await artworksCollection.deleteOne(query);
      res.send(result);
    });

    // Increase like count
    app.patch('/artwork/:id/like', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $inc: { likes: 1 } };
      const result = await artworksCollection.updateOne(query, update);
      res.send(result);
    });

    // Search artworks by title or artist
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

    // Filter artworks by category
    app.get('/artworks/category/:category', async (req, res) => {
      const category = req.params.category;
      const query = { visibility: 'Public', category: category };
      const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    // ==================== FAVORITES APIs ====================

    // Add to favorites
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

    // Get user's favorites
    app.get('/favorites/:email', async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const favorites = await favoritesCollection.find(query).toArray();
      
      // Get full artwork details for each favorite
      const artworkIds = favorites.map(fav => new ObjectId(fav.artworkId));
      const artworks = await artworksCollection.find({ _id: { $in: artworkIds } }).toArray();
      
      res.send(artworks);
    });

    // Remove from favorites
    app.delete('/favorites', async (req, res) => {
      const { userEmail, artworkId } = req.body;
      const query = { userEmail: userEmail, artworkId: artworkId };
      const result = await favoritesCollection.deleteOne(query);
      res.send(result);
    });

    // Ping to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. Successfully connected to MongoDB!");

  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
