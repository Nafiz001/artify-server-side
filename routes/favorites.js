const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

// This will be used by the main server file
module.exports = (favoritesCollection, artworksCollection) => {
  
  // Get user favorites
  router.get('/:email', async (req, res) => {
    try {
      const email = req.params.email;
      
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }
      
      const favorites = await favoritesCollection.find({ userEmail: email }).toArray();
      const artworkIds = favorites.map(fav => new ObjectId(fav.artworkId));
      
      if (artworkIds.length === 0) {
        return res.json({ success: true, data: [] });
      }
      
      const artworks = await artworksCollection.find({
        _id: { $in: artworkIds }
      }).toArray();
      
      res.json({ success: true, data: artworks });
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ success: false, message: 'Error fetching favorites' });
    }
  });

  // Add to favorites
  router.post('/', async (req, res) => {
    try {
      const { userEmail, artworkId } = req.body;
      
      if (!userEmail || !artworkId) {
        return res.status(400).json({ success: false, message: 'User email and artwork ID are required' });
      }
      
      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
      // Check if artwork exists
      const artwork = await artworksCollection.findOne({ _id: new ObjectId(artworkId) });
      if (!artwork) {
        return res.status(404).json({ success: false, message: 'Artwork not found' });
      }
      
      // Check if already in favorites
      const existing = await favoritesCollection.findOne({ userEmail, artworkId });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Already in favorites' });
      }
      
      const favorite = {
        userEmail,
        artworkId,
        addedAt: new Date()
      };
      
      const result = await favoritesCollection.insertOne(favorite);
      res.status(201).json({ success: true, data: result, message: 'Added to favorites successfully' });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ success: false, message: 'Error adding to favorites' });
    }
  });

  // Remove from favorites
  router.delete('/', async (req, res) => {
    try {
      const { userEmail, artworkId } = req.body;
      
      if (!userEmail || !artworkId) {
        return res.status(400).json({ success: false, message: 'User email and artwork ID are required' });
      }
      
      const result = await favoritesCollection.deleteOne({ userEmail, artworkId });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Favorite not found' });
      }
      
      res.json({ success: true, data: result, message: 'Removed from favorites successfully' });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ success: false, message: 'Error removing from favorites' });
    }
  });

  // Check if artwork is in user's favorites
  router.get('/:email/:artworkId', async (req, res) => {
    try {
      const { email, artworkId } = req.params;
      
      if (!ObjectId.isValid(artworkId)) {
        return res.status(400).json({ success: false, message: 'Invalid artwork ID' });
      }
      
      const favorite = await favoritesCollection.findOne({ 
        userEmail: email, 
        artworkId: artworkId 
      });
      
      res.json({ success: true, isFavorite: !!favorite });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({ success: false, message: 'Error checking favorite status' });
    }
  });

  return router;
};