const db = require("../../db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../private_uploads/images/floorplans");
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'floorplan-' + uniqueSuffix + fileExtension);
  }
});

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
      // Store relative path for database
      const image_url = `/private_uploads/images/floorplans/${req.file.filename}`;
      
      const [result] = await db.query(
        "INSERT INTO floorplan (name, description, image_url) VALUES (?, ?, ?)",
        [name, description || null, image_url]
      );
      
      const newFloorplan = {
        id: result.insertId, 
        name, 
        description: description || null,
        image_url 
      };
      
      res.status(201).json(newFloorplan);
    } catch (err) {
      console.error("Error executing query:", err);
      
      // If database operation fails, delete uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
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
        // If new image was uploaded but floorplan doesn't exist, delete the uploaded file
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: 'Floorplan not found' });
      }
      
      const currentFloorplan = existing[0];
      let image_url = currentFloorplan.image_url; // Keep current image by default
      
      // If new image was uploaded, use it and delete old image
      if (req.file) {
        image_url = `/private_uploads/images/floorplans/${req.file.filename}`;
        
        // Delete old image file if it exists
        if (currentFloorplan.image_url) {
          const oldImagePath = path.join(__dirname, "../..", currentFloorplan.image_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }
      
      // Update floorplan in database
      await db.query(
        "UPDATE floorplan SET name = ?, description = ?, image_url = ? WHERE id = ?",
        [name, description || null, image_url, id]
      );
      
      const updatedFloorplan = {
        id: parseInt(id),
        name,
        description: description || null,
        image_url
      };
      
      res.json(updatedFloorplan);
    } catch (err) {
      console.error("Error executing query:", err);
      
      // If database operation fails, delete uploaded file
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ message: "Database query error" });
    }
  }
];
