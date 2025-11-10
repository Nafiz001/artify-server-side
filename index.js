const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ttxaxx0.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    
    // Database and collections
    const db = client.db('artifyDB');
    const artworksCollection = db.collection('artworks');
    const favoritesCollection = db.collection('favorites');
    const usersCollection = db.collection('users');

    // Initialize collections by ensuring they exist
    try {
      await db.createCollection('artworks');
      console.log('Artworks collection created/verified');
    } catch (error) {
      console.log('Artworks collection already exists');
    }
    
    try {
      await db.createCollection('favorites');
      console.log('Favorites collection created/verified');
    } catch (error) {
      console.log('Favorites collection already exists');
    }
    
    try {
      await db.createCollection('users');
      console.log('Users collection created/verified');
    } catch (error) {
      console.log('Users collection already exists');
    }

    // Test route
    app.get('/', (req, res) => {
      res.send('Artify Server is running!');
    });

    // Debug route to check all collections
    app.get('/debug/collections', async (req, res) => {
      try {
        const collections = await db.listCollections().toArray();
        const artworksCount = await artworksCollection.countDocuments();
        const favoritesCount = await favoritesCollection.countDocuments();
        const usersCount = await usersCollection.countDocuments();
        
        res.send({
          collections: collections.map(c => c.name),
          counts: {
            artworks: artworksCount,
            favorites: favoritesCount,
            users: usersCount
          }
        });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Debug route to check artwork IDs
    app.get('/debug/artworks', async (req, res) => {
      try {
        const artworks = await artworksCollection.find({}).limit(5).toArray();
        const artworkInfo = artworks.map(art => ({
          id: art._id,
          title: art.title,
          idType: typeof art._id,
          isValidObjectId: ObjectId.isValid(art._id)
        }));
        res.send(artworkInfo);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Debug route to check all favorites
    app.get('/debug/favorites', async (req, res) => {
      try {
        const favorites = await favoritesCollection.find({}).toArray();
        res.send({
          count: favorites.length,
          favorites: favorites
        });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Debug route to check all users
    app.get('/debug/users', async (req, res) => {
      try {
        const users = await usersCollection.find({}).toArray();
        res.send({
          count: users.length,
          users: users.map(user => ({ email: user.email, name: user.name, createdAt: user.createdAt }))
        });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // Test endpoint for favorites (simplified)
    app.post('/test-favorites', async (req, res) => {
      try {
        console.log('Test favorites endpoint called with body:', req.body);
        
        const testFavorite = {
          userEmail: 'test@example.com',
          artworkId: '507f1f77bcf86cd799439011',
          addedAt: new Date()
        };
        
        const result = await favoritesCollection.insertOne(testFavorite);
        res.send({ 
          success: true, 
          message: 'Test favorite added', 
          insertedId: result.insertedId,
          testData: testFavorite
        });
      } catch (error) {
        console.error('Test favorites error:', error);
        res.status(500).send({ error: error.message });
      }
    });

    // Get all public artworks with pagination (for Explore page)
    app.get('/artworks', async (req, res) => {
      try {
        const { page = 1, limit = 12 } = req.query;
        const skip = (page - 1) * limit;
        
        const artworks = await artworksCollection
          .find({ visibility: 'Public' })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
        
        const total = await artworksCollection.countDocuments({ visibility: 'Public' });
        
        res.send({
          artworks,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalArtworks: total
        });
      } catch (error) {
        console.error('Error fetching artworks:', error);
        res.status(500).send({ message: 'Error fetching artworks' });
      }
    });

    // Get latest artworks for home page (featured artworks)
    app.get('/latest-artworks', async (req, res) => {
      try {
        const artworks = await artworksCollection
          .find({ visibility: 'Public' })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(artworks);
      } catch (error) {
        console.error('Error fetching latest artworks:', error);
        res.status(500).send({ message: 'Error fetching latest artworks' });
      }
    });

    // Get all artworks for explore page (without pagination for compatibility)
    app.get('/all-artworks', async (req, res) => {
      try {
        const { search, category } = req.query;
        let query = { visibility: 'Public' };
        
        // Search functionality
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { artistName: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
          ];
        }
        
        // Category filter
        if (category && category !== 'all') {
          query.category = category;
        }
        
        const artworks = await artworksCollection
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        
        res.send(artworks);
      } catch (error) {
        console.error('Error fetching all artworks:', error);
        res.status(500).send({ message: 'Error fetching all artworks' });
      }
    });

    // Get artwork by ID
    app.get('/artwork/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const artwork = await artworksCollection.findOne({ _id: new ObjectId(id) });
        if (!artwork) {
          return res.status(404).send({ message: 'Artwork not found' });
        }
        res.send(artwork);
      } catch (error) {
        console.error('Error fetching artwork:', error);
        res.status(500).send({ message: 'Error fetching artwork' });
      }
    });

    // Get artworks by user email (My Gallery)
    app.get('/my-artworks/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const artworks = await artworksCollection.find({ artistEmail: email }).sort({ createdAt: -1 }).toArray();
        res.send(artworks);
      } catch (error) {
        console.error('Error fetching user artworks:', error);
        res.status(500).send({ message: 'Error fetching user artworks' });
      }
    });

    // Add new artwork
    app.post('/artworks', async (req, res) => {
      try {
        const artwork = {
          ...req.body,
          createdAt: new Date(),
          likes: 0,
          likedBy: []
        };
        const result = await artworksCollection.insertOne(artwork);
        res.send({ success: true, insertedId: result.insertedId, message: 'Artwork added successfully' });
      } catch (error) {
        console.error('Error adding artwork:', error);
        res.status(500).send({ message: 'Error adding artwork' });
      }
    });

    // Update artwork
    app.patch('/artwork/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updatedArtwork = {
          $set: {
            ...req.body,
            updatedAt: new Date()
          }
        };
        const result = await artworksCollection.updateOne(
          { _id: new ObjectId(id) },
          updatedArtwork
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Artwork not found' });
        }
        
        res.send({ success: true, message: 'Artwork updated successfully' });
      } catch (error) {
        console.error('Error updating artwork:', error);
        res.status(500).send({ message: 'Error updating artwork' });
      }
    });

    // Delete artwork
    app.delete('/artwork/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await artworksCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Artwork not found' });
        }
        
        res.send({ success: true, message: 'Artwork deleted successfully' });
      } catch (error) {
        console.error('Error deleting artwork:', error);
        res.status(500).send({ message: 'Error deleting artwork' });
      }
    });

    // Like artwork
    app.patch('/artwork/:id/like', async (req, res) => {
      try {
        const artworkId = req.params.id;
        
        const result = await artworksCollection.updateOne(
          { _id: new ObjectId(artworkId) },
          { $inc: { likes: 1 } }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Artwork not found' });
        }
        
        res.send({ success: true, message: 'Artwork liked successfully' });
      } catch (error) {
        console.error('Error liking artwork:', error);
        res.status(500).send({ message: 'Error liking artwork' });
      }
    });

    // Search artworks by title or artist
    app.get('/artworks/search/:searchTerm', async (req, res) => {
      try {
        const searchTerm = req.params.searchTerm;
        const query = {
          visibility: 'Public',
          $or: [
            { title: { $regex: searchTerm, $options: 'i' } },
            { userName: { $regex: searchTerm, $options: 'i' } }
          ]
        };
        
        const artworks = await artworksCollection.find(query).toArray();
        res.send(artworks);
      } catch (error) {
        console.error('Error searching artworks:', error);
        res.status(500).send({ message: 'Error searching artworks' });
      }
    });

    // Filter artworks by category
    app.get('/artworks/category/:category', async (req, res) => {
      try {
        const category = req.params.category;
        const artworks = await artworksCollection
          .find({ 
            visibility: 'Public',
            category: category
          })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(artworks);
      } catch (error) {
        console.error('Error filtering artworks by category:', error);
        res.status(500).send({ message: 'Error filtering artworks by category' });
      }
    });

    // Get user favorites
    app.get('/favorites/:email', async (req, res) => {
      try {
        const email = req.params.email;
        console.log('Fetching favorites for email:', email);
        
        const favorites = await favoritesCollection.find({ userEmail: email }).toArray();
        console.log('Found favorites:', favorites.length);
        
        if (favorites.length === 0) {
          return res.send([]);
        }
        
        // Validate and convert artwork IDs to ObjectId
        const validArtworkIds = [];
        for (const fav of favorites) {
          try {
            if (ObjectId.isValid(fav.artworkId)) {
              validArtworkIds.push(new ObjectId(fav.artworkId));
            } else {
              console.log('Invalid artwork ID:', fav.artworkId);
            }
          } catch (error) {
            console.log('Error converting artwork ID:', fav.artworkId, error);
          }
        }
        
        if (validArtworkIds.length === 0) {
          return res.send([]);
        }
        
        const artworks = await artworksCollection.find({
          _id: { $in: validArtworkIds }
        }).toArray();
        
        console.log('Found artworks:', artworks.length);
        res.send(artworks);
      } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).send({ message: 'Error fetching favorites' });
      }
    });

    // Add to favorites
    app.post('/favorites', async (req, res) => {
      try {
        const { userEmail, artworkId } = req.body;
        
        console.log('Adding to favorites:', { userEmail, artworkId });
        
        // Validate inputs
        if (!userEmail || !artworkId) {
          return res.status(400).send({ message: 'User email and artwork ID are required' });
        }
        
        // Validate artwork ID format
        if (!ObjectId.isValid(artworkId)) {
          return res.status(400).send({ message: 'Invalid artwork ID format' });
        }
        
        // Check if artwork exists
        const artwork = await artworksCollection.findOne({ _id: new ObjectId(artworkId) });
        if (!artwork) {
          return res.status(404).send({ message: 'Artwork not found' });
        }
        
        // Check if already in favorites
        const existing = await favoritesCollection.findOne({ userEmail, artworkId });
        if (existing) {
          return res.status(400).send({ message: 'Already in favorites' });
        }
        
        const favorite = {
          userEmail,
          artworkId,
          addedAt: new Date()
        };
        
        const result = await favoritesCollection.insertOne(favorite);
        console.log('Favorite added successfully:', result.insertedId);
        res.send({ success: true, message: 'Added to favorites successfully', insertedId: result.insertedId });
      } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).send({ message: 'Error adding to favorites' });
      }
    });

    // Remove from favorites
    app.delete('/favorites', async (req, res) => {
      try {
        const { userEmail, artworkId } = req.body;
        const result = await favoritesCollection.deleteOne({ userEmail, artworkId });
        
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Favorite not found' });
        }
        
        res.send({ success: true, message: 'Removed from favorites successfully' });
      } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).send({ message: 'Error removing from favorites' });
      }
    });

    // Create or get user
    app.post('/users', async (req, res) => {
      try {
        const userData = req.body;
        console.log('User registration/login attempt:', userData);
        
        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: userData.email });
        if (existingUser) {
          console.log('Existing user found:', existingUser.email);
          return res.send({ success: true, user: existingUser, message: 'User already exists' });
        }
        
        // Create new user
        const newUser = {
          ...userData,
          createdAt: new Date()
        };
        
        const result = await usersCollection.insertOne(newUser);
        console.log('New user created:', result.insertedId);
        res.send({ success: true, user: newUser, message: 'User created successfully' });
      } catch (error) {
        console.error('Error creating/getting user:', error);
        res.status(500).send({ message: 'Error creating/getting user' });
      }
    });

    // Get total artworks statistics
    app.get('/stats/total-artworks', async (req, res) => {
      try {
        const totalArtworks = await artworksCollection.countDocuments({ visibility: 'Public' });
        const totalUsers = await usersCollection.countDocuments();
        const totalLikes = await artworksCollection.aggregate([
          { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
        ]).toArray();
        
        res.send({
          totalArtworks,
          totalUsers,
          totalLikes: totalLikes[0]?.totalLikes || 0
        });
      } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).send({ message: 'Error fetching statistics' });
      }
    });

    // Get category statistics
    app.get('/stats/by-category', async (req, res) => {
      try {
        const categoryStats = await artworksCollection.aggregate([
          { $match: { visibility: 'Public' } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]).toArray();
        
        res.send(categoryStats);
      } catch (error) {
        console.error('Error fetching category statistics:', error);
        res.status(500).send({ message: 'Error fetching category statistics' });
      }
    });

    // Get categories (for filter dropdown)
    app.get('/categories', async (req, res) => {
      try {
        const categories = await artworksCollection.distinct('category', { visibility: 'Public' });
        res.send(categories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).send({ message: 'Error fetching categories' });
      }
    });

    // Health check
    app.get('/health', (req, res) => {
      res.send({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found', path: req.path });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error('Global error handler:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });

    // Catch all 404 handler
    app.use('*', (req, res) => {
      console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ error: 'Route not found', path: req.originalUrl, method: req.method });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Successfully connected to MongoDB!");

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Artify server is running on port ${port}`);
});