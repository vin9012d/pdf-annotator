const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const PDF = require('../models/PDF');
const router = express.Router();

// Multer storage + filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Only PDF files are allowed'), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB max
});

// @route POST /api/pdfs/upload
// @desc  Upload a PDF
// @access Private
router.post(
  '/upload',
  auth,
  upload.single('file'),
  async (req, res) => {
    try {
      const { filename, originalname, size } = req.file;
      const pdf = new PDF({
        user: req.user.id,
        filename,
        originalName: originalname,
        size
      });
      await pdf.save();
      res.json(pdf);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route GET /api/pdfs
// @desc  List all PDFs for this user
// @access Private
router.get('/', auth, async (req, res) => {
  try {
    const pdfs = await PDF.find({ user: req.user.id }).sort('-uploadDate');
    res.json(pdfs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route GET /api/pdfs/:id/download
// @desc  Download a single PDF
// @access Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    if (!pdf || pdf.user.toString() !== req.user.id)
      return res.status(404).json({ msg: 'Not found' });

    const filePath = path.join(__dirname, '..', 'uploads', pdf.filename);
    return res.download(filePath, pdf.originalName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
