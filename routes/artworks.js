const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

// This will be used by the main server file
module.exports = (artworksCollection) => {
  
  // Get all public artworks (for Explore page)
  router.get('/', async (req, res) => {
    try {
      const { search, category } = req.query;
      let query = { visibility: 'Public' };
      
      // Search functionality
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { artistName: { $regex: search, $options: 'i' } }
        ];
      }
      
      // Category filter
      if (category && category !== 'all') {
        query.category = category;
      }
      
      const artworks = await artworksCollection.find(query).toArray();
      res.json({ success: true, data: artworks });
    } catch (error) {
      console.error('Error fetching artworks:', error);
      res.status(500).json({ success: false, message: 'Error fetching artworks' });
    }
  });

  // Get recent artworks for home page (6 most recent)
  router.get('/recent', async (req, res) => {
    try {
      const artworks = await artworksCollection
        .find({ visibility: 'Public' })
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.json({ success: true, data: artworks });
    } catch (error) {
      console.error('Error fetching recent artworks:', error);
      res.status(500).json({ success: false, message: 'Error fetching recent artworks' });
    }
  });

  // Get artwork by ID
  router.get('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
      const artwork = await artworksCollection.findOne({ _id: new ObjectId(id) });
      if (!artwork) {
        return res.status(404).json({ success: false, message: 'Artwork not found' });
      }
      res.json({ success: true, data: artwork });
    } catch (error) {
      console.error('Error fetching artwork:', error);
      res.status(500).json({ success: false, message: 'Error fetching artwork' });
    }
  });

  // Add new artwork
  router.post('/', async (req, res) => {
    try {
      const { imageUrl, title, category, medium, description, dimensions, price, visibility, userName, userEmail } = req.body;
      
      // Basic validation
      if (!imageUrl || !title || !category || !medium || !visibility || !userName || !userEmail) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      
      const artwork = {
        imageUrl,
        title,
        category,
        medium,
        description: description || '',
        dimensions: dimensions || '',
        price: price || '',
        visibility,
        userName,
        userEmail,
        createdAt: new Date(),
        likes: 0,
        likedBy: []
      };
      
      const result = await artworksCollection.insertOne(artwork);
      res.status(201).json({ success: true, data: result, message: 'Artwork added successfully' });
    } catch (error) {
      console.error('Error adding artwork:', error);
      res.status(500).json({ success: false, message: 'Error adding artwork' });
    }
  });

  // Update artwork
  router.put('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
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
        return res.status(404).json({ success: false, message: 'Artwork not found' });
      }
      
      res.json({ success: true, data: result, message: 'Artwork updated successfully' });
    } catch (error) {
      console.error('Error updating artwork:', error);
      res.status(500).json({ success: false, message: 'Error updating artwork' });
    }
  });

  // Delete artwork
  router.delete('/:id', async (req, res) => {
    try {
      const id = req.params.id;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
      const result = await artworksCollection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Artwork not found' });
      }
      
      res.json({ success: true, data: result, message: 'Artwork deleted successfully' });
    } catch (error) {
      console.error('Error deleting artwork:', error);
      res.status(500).json({ success: false, message: 'Error deleting artwork' });
    }
  });

  // Like/Unlike artwork
  router.patch('/:id/like', async (req, res) => {
    try {
      const artworkId = req.params.id;
      const { userEmail, action } = req.body;
      
      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
      if (!userEmail || !action) {
        return res.status(400).json({ success: false, message: 'User email and action are required' });
      }
      
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
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action. Use "like" or "unlike"' });
      }
      
      const result = await artworksCollection.updateOne(
        { _id: new ObjectId(artworkId) },
        updateOperation
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Artwork not found' });
      }
      
      res.json({ success: true, data: result, message: `Artwork ${action}d successfully` });
    } catch (error) {
      console.error('Error updating likes:', error);
      res.status(500).json({ success: false, message: 'Error updating likes' });
    }
  });

  return router;
};