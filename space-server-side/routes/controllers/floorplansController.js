const db = require("../../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads (memory storage for cloud upload)
const storage = multer.memoryStorage(); // Store in memory instead of disk

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to convert image to PNG
const convertToPNG = async (buffer) => {
  try {
    const pngBuffer = await sharp(buffer)
      .png({ quality: 90 })
      .toBuffer();
    return pngBuffer;
  } catch (err) {
    console.error('Error converting image to PNG:', err);
    throw new Error('Failed to convert image to PNG format');
  }
};

exports.getAllFloorplans = async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM floorplan");
    res.json(results);
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).send("Database query error");
  }
}

exports.createFloorplan = [
  upload.single('image'),
  async (req, res) => {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    // Image upload is mandatory
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required. Please select an image file.' });
    }
    
    try {
      // Convert image to PNG format
      const pngBuffer = await convertToPNG(req.file.buffer);
      
      // Upload image to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'floorplans', // Organize images in a folder
            resource_type: 'image',
            format: 'png', // Force PNG format
            quality: 'auto:good', // Automatic quality optimization
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(pngBuffer);
      });

      // Store Cloudinary URL in database
      const image_url = uploadResult.secure_url;
      const cloudinary_public_id = uploadResult.public_id;
      
      const [result] = await db.query(
        "INSERT INTO floorplan (name, description, image_url, cloudinary_public_id) VALUES (?, ?, ?, ?)",
        [name, description || null, image_url, cloudinary_public_id]
      );
      
      const newFloorplan = {
        id: result.insertId, 
        name, 
        description: description || null,
        image_url,
        cloudinary_public_id
      };
      
      res.status(201).json(newFloorplan);
    } catch (err) {
      console.error("Error executing query:", err);
      
      // If there's an error, we don't need to delete files since they're in cloud
      res.status(500).json({ message: "Database query error" });
    }
  }
];

// Edit existing floorplan
exports.editFloorplan = [
  upload.single('image'),
  async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    try {
      // Get existing floorplan to check if it exists and get current image
      const [existing] = await db.query("SELECT * FROM floorplan WHERE id = ?", [id]);
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Floorplan not found' });
      }
      
      const currentFloorplan = existing[0];
      let image_url = currentFloorplan.image_url; // Keep current image by default
      let cloudinary_public_id = currentFloorplan.cloudinary_public_id;
      
      // If new image was uploaded, use it and delete old image from Cloudinary
      if (req.file) {
        // Convert image to PNG format
        const pngBuffer = await convertToPNG(req.file.buffer);
        
        // Upload new image to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: 'floorplans',
              resource_type: 'image',
              format: 'png', // Force PNG format
              quality: 'auto:good',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(pngBuffer);
        });

        image_url = uploadResult.secure_url;
        cloudinary_public_id = uploadResult.public_id;
        
        // Delete old image from Cloudinary if it exists
        if (currentFloorplan.cloudinary_public_id) {
          try {
            await cloudinary.uploader.destroy(currentFloorplan.cloudinary_public_id);
          } catch (deleteError) {
            console.warn('Failed to delete old image from Cloudinary:', deleteError);
            // Continue with update even if deletion fails
          }
        }
      }
      
      // Update floorplan in database
      await db.query(
        "UPDATE floorplan SET name = ?, description = ?, image_url = ?, cloudinary_public_id = ? WHERE id = ?",
        [name, description || null, image_url, cloudinary_public_id, id]
      );
      
      const updatedFloorplan = {
        id: parseInt(id),
        name,
        description: description || null,
        image_url,
        cloudinary_public_id
      };
      
      res.json(updatedFloorplan);
    } catch (err) {
      console.error("Error executing query:", err);
      res.status(500).json({ message: "Database query error" });
    }
  }
];

exports.deleteFloorplan = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get existing floorplan to check if it exists and get image info
    const [existing] = await db.query("SELECT * FROM floorplan WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Floorplan not found' });
    }
    
    const currentFloorplan = existing[0];
    
    // Check if there are devices assigned to this floorplan
    const [devices] = await db.query("SELECT COUNT(*) as device_count FROM devices WHERE floorplan_id = ?", [id]);
    if (devices[0].device_count > 0) {
      return res.status(400).json({ 
        message: `Cannot delete floorplan. ${devices[0].device_count} device(s) are still assigned to this floorplan. Please remove or reassign the devices first.` 
      });
    }
    
    // Delete floorplan from database
    await db.query("DELETE FROM floorplan WHERE id = ?", [id]);
    
    // Delete associated image from Cloudinary if it exists
    if (currentFloorplan.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(currentFloorplan.cloudinary_public_id);
        console.log(`Deleted image from Cloudinary: ${currentFloorplan.cloudinary_public_id}`);
      } catch (deleteError) {
        console.warn('Failed to delete image from Cloudinary:', deleteError);
        // Continue with success response even if Cloudinary deletion fails
      }
    }
    
    res.status(200).json({ message: 'Floorplan deleted successfully' });
  } catch (err) {
    console.error("Error deleting floorplan:", err);
    res.status(500).json({ message: "Database delete error" });
  }
};
