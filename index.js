const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK for production
if (process.env.FB_SERVICE_KEY) {
    try {
        const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
        const serviceAccount = JSON.parse(decoded);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.log('Firebase Admin initialization failed:', error.message);
    }
}

// middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://artify-client-side.web.app",
        "https://artify-client-side.firebaseapp.com"
    ],
    credentials: true,
}));
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        console.log('inside token', decoded);
        req.token_email = decoded.email;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ttxaxx0.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Initialize database collections as variables
let artworksCollection, favoritesCollection, usersCollection;

app.get('/', (req, res) => {
    res.json({ 
        message: 'Artify server is running',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
})

// Test endpoint to check if server is working
app.get('/test', (req, res) => {
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
})

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
})

// USERS APIs
app.post('/users', async (req, res) => {
    try {
        if (!usersCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const newUser = req.body;
        const email = req.body.email;
        const query = { email: email }
        const existingUser = await usersCollection.findOne(query);

        if (existingUser) {
            res.send({ message: 'user already exits. do not need to insert again' })
        }
        else {
            const result = await usersCollection.insertOne(newUser);
            res.send(result);
        }
    } catch (error) {
        console.error('Error in users endpoint:', error);
        res.status(500).json({ message: 'Error processing user request' });
    }
})

// ARTWORKS APIs
app.get('/artworks', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.json([]);  // Return empty array instead of error object
        }
        
        console.log(req.query);
        const email = req.query.email;
        const search = req.query.search;
        const category = req.query.category;
        let query = {};
        
        if (email) {
            query.artistEmail = email;
        }
        
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

        const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.send(result)
    } catch (error) {
        console.error('Error in artworks endpoint:', error);
        res.json([]);  // Return empty array instead of error object
    }
});

// Get all artworks for explore page
app.get('/all-artworks', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.json([]);  // Return empty array instead of error object
        }
        
        const search = req.query.search;
        const category = req.query.category;
        let query = {};
        
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

        const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.send(result);
    } catch (error) {
        console.error('Error in all-artworks endpoint:', error);
        res.json([]);  // Return empty array instead of error object
    }
});

app.get('/latest-artworks', async (req, res) => {
    try {
        console.log('Latest artworks endpoint called');
        console.log('artworksCollection status:', !!artworksCollection);
        
        if (!artworksCollection) {
            console.log('Database not ready, returning empty array');
            return res.json([]);  // Return empty array instead of error object
        }
        
        const cursor = artworksCollection.find().sort({ createdAt: -1 }).limit(6);
        const result = await cursor.toArray();
        console.log('Latest artworks result:', result.length, 'items');
        res.send(result);
    } catch (error) {
        console.error('Error in latest-artworks endpoint:', error);
        res.status(500).json([]);  // Return empty array instead of error object
    }
})

// Get top artists by total artworks and likes
app.get('/top-artists', async (req, res) => {
    try {
        console.log('Top artists endpoint called');
        
        if (!artworksCollection || !usersCollection) {
            console.log('Database not ready, returning empty array');
            return res.json([]);
        }
        
        // Aggregate artworks by artist email to get counts and total likes
        const topArtists = await artworksCollection.aggregate([
            {
                $group: {
                    _id: '$artistEmail',
                    artistName: { $first: '$artistName' },
                    artistPhoto: { $first: '$artistPhoto' },
                    totalArtworks: { $sum: 1 },
                    totalLikes: { $sum: '$likes' }
                }
            },
            {
                $sort: { totalLikes: -1, totalArtworks: -1 }
            },
            {
                $limit: 4
            }
        ]).toArray();
        
        console.log('Top artists result:', topArtists.length, 'artists');
        res.send(topArtists);
    } catch (error) {
        console.error('Error in top-artists endpoint:', error);
        res.status(500).json([]);
    }
})

app.get('/artwork/:id', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await artworksCollection.findOne(query);
        res.send(result);
    } catch (error) {
        console.error('Error in artwork detail endpoint:', error);
        res.status(500).json({ message: 'Error fetching artwork' });
    }
})

app.get('/my-artworks/:email', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const email = req.params.email;
        const query = { artistEmail: email }
        const cursor = artworksCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.send(result);
    } catch (error) {
        console.error('Error in my-artworks endpoint:', error);
        res.status(500).json({ message: 'Error fetching user artworks' });
    }
})

app.post('/artworks', async (req, res) => {
    try {
        console.log('POST /artworks request received');
        console.log('headers in the post ', req.headers);
        console.log('body:', req.body);
        
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const newArtwork = {
            ...req.body,
            createdAt: new Date(),
            likes: 0,
            likedBy: []
        };
        
        const result = await artworksCollection.insertOne(newArtwork);
        console.log('Artwork inserted successfully:', result.insertedId);
        res.json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        console.error('Error adding artwork:', error);
        res.status(500).json({ success: false, message: 'Error adding artwork', error: error.message });
    }
})

app.patch('/artwork/:id', verifyFireBaseToken, async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const id = req.params.id;
        const updatedArtwork = req.body;
        const query = { _id: new ObjectId(id) }
        
        // Check if user owns the artwork
        const artwork = await artworksCollection.findOne(query);
        if (artwork.artistEmail !== req.token_email) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        
        const update = {
            $set: {
                ...updatedArtwork,
                updatedAt: new Date()
            }
        }

        const result = await artworksCollection.updateOne(query, update)
        res.send(result)
    } catch (error) {
        console.error('Error updating artwork:', error);
        res.status(500).json({ message: 'Error updating artwork' });
    }
})

app.delete('/artwork/:id', verifyFireBaseToken, async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        
        // Check if user owns the artwork
        const artwork = await artworksCollection.findOne(query);
        if (artwork.artistEmail !== req.token_email) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        
        const result = await artworksCollection.deleteOne(query);
        res.send(result);
    } catch (error) {
        console.error('Error deleting artwork:', error);
        res.status(500).json({ message: 'Error deleting artwork' });
    }
})

// Like/Unlike artwork
app.patch('/artwork/:id/like', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const artworkId = req.params.id;
        const { userEmail, action } = req.body;
        
        // First, ensure the artwork has likes field and likedBy array
        await artworksCollection.updateOne(
            { _id: new ObjectId(artworkId) },
            {
                $setOnInsert: { likes: 0, likedBy: [] }
            },
            { upsert: false }
        );
        
        let updateOperation;
        if (action === 'like') {
            updateOperation = {
                $inc: { likes: 1 },
                $addToSet: { likedBy: userEmail }
            };
        } else if (action === 'unlike') {
            updateOperation = {
                $inc: { likes: -1 },
                $pull: { likedBy: userEmail }
            };
        }
        
        const result = await artworksCollection.updateOne(
            { _id: new ObjectId(artworkId) },
            updateOperation
        );
        
        res.send(result);
    } catch (error) {
        console.error('Error updating likes:', error);
        res.status(500).json({ message: 'Error updating likes' });
    }
})

// FAVORITES APIs
app.get('/favorites/:email', async (req, res) => {
    try {
        if (!favoritesCollection || !artworksCollection) {
            return res.json([]);  // Return empty array instead of error object
        }
        
        const email = req.params.email;
        const favorites = await favoritesCollection.find({ userEmail: email }).toArray();
        
        if (favorites.length === 0) {
            return res.send([]);
        }
        
        const validArtworkIds = [];
        for (const fav of favorites) {
            if (ObjectId.isValid(fav.artworkId)) {
                validArtworkIds.push(new ObjectId(fav.artworkId));
            }
        }
        
        if (validArtworkIds.length === 0) {
            return res.send([]);
        }
        
        const artworks = await artworksCollection.find({
            _id: { $in: validArtworkIds }
        }).toArray();
        
        res.send(artworks);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.json([]);  // Return empty array instead of error object
    }
})

app.post('/favorites', async (req, res) => {
    try {
        if (!favoritesCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const { userEmail, artworkId } = req.body;
        
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
        res.send(result);
    } catch (error) {
        console.error('Error adding to favorites:', error);
        res.status(500).json({ message: 'Error adding to favorites' });
    }
})

app.delete('/favorites', async (req, res) => {
    try {
        if (!favoritesCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const { userEmail, artworkId } = req.body;
        const result = await favoritesCollection.deleteOne({ userEmail, artworkId });
        res.send(result);
    } catch (error) {
        console.error('Error removing from favorites:', error);
        res.status(500).json({ message: 'Error removing from favorites' });
    }
})

// Get categories
app.get('/categories', async (req, res) => {
    try {
        if (!artworksCollection) {
            return res.status(503).json({ message: 'Database not ready' });
        }
        
        const categories = await artworksCollection.distinct('category');
        res.send(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
})

async function run() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await client.connect();
        console.log('Connected to MongoDB successfully');

        const db = client.db('artifyDB');
        artworksCollection = db.collection('artworks');
        favoritesCollection = db.collection('favorites');
        usersCollection = db.collection('users');

        console.log("Successfully connected to MongoDB!");
        console.log("Collections initialized and routes are ready!");

        // Test the connection by counting documents
        try {
            const artworkCount = await artworksCollection.countDocuments();
            console.log(`Found ${artworkCount} artworks in database`);
        } catch (countError) {
            console.log('Error counting artworks:', countError.message);
        }

    } catch (error) {
        console.error('Database connection error:', error);
        console.log('Server will continue to run, but will return empty arrays until DB is ready');
        // Retry connection after 5 seconds
        setTimeout(() => {
            console.log('Retrying database connection...');
            run();
        }, 5000);
    }
}

// Start database connection immediately
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Artify server is running on port: ${port}`)
})