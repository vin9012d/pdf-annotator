const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const PDF = require('../models/PDF');
const router = express.Router();
const fs = require('fs');
const { PDFDocument, rgb } = require('pdf-lib');
const Annotation = require('../models/Annotation');

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

router.get('/:id/export', auth, async (req, res) => {
  try {
    const pdfMeta = await PDF.findById(req.params.id);
    if (!pdfMeta || pdfMeta.user.toString() !== req.user.id) return res.status(404).json({ msg: 'PDF not found' });

    // Load original PDF
    const filePath = path.join(__dirname, '..', 'uploads', pdfMeta.filename);
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    // Fetch annotations
    const annotations = await Annotation.find({ pdf: pdfMeta._id });
    annotations.forEach(a => {
      const page = pages[a.page - 1];
      const pageIndex = a.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) return;
      const { x, y, width, height } = a.coords;
      const drawY = page.getHeight() - y - height;
      // Simple color mapping
      const colorMap = { yellow: [1,1,0], green: [0,1,0], red: [1,0,0] };
      const [r,g,b] = colorMap[a.color] || [1,1,0];
      page.drawRectangle({ x, y: drawY, width, height, borderColor: rgb(r,g,b), borderWidth: 2, color: rgb(r,g,b,0.2) });
      if (a.comment) {
        page.drawText(a.comment, { x, y: drawY - 12, size: 10, color: rgb(0,0,0) });
      }
    });

    const pdfBytes = await pdfDoc.save();
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=annotated_${pdfMeta._id}.pdf` });
    res.send(pdfBytes);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ msg: 'Server error exporting PDF' });
  }
});

module.exports = router;
