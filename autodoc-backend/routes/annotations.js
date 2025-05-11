const express = require('express');
const auth = require('../middleware/auth');
const Annotation = require('../models/Annotation');
const PDF = require('../models/PDF');
const router = express.Router();

// @route   POST /api/annotations/:pdfId
// @desc    Create a new annotation on a PDF
// @access  Private
router.post('/:pdfId', auth, async (req, res) => {
  const { page, coords, comment, color } = req.body;

  try {
    // Ensure PDF exists & belongs to user
    const pdf = await PDF.findById(req.params.pdfId);
    if (!pdf || pdf.user.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    const annotation = new Annotation({
      user: req.user.id,
      pdf: req.params.pdfId,
      page,
      coords,
      comment,
      color
    });
    await annotation.save();
    res.json(annotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/annotations/:pdfId
// @desc    List all annotations for a PDF
// @access  Private
router.get('/:pdfId', auth, async (req, res) => {
  try {
    // Verify ownership
    const pdf = await PDF.findById(req.params.pdfId);
    if (!pdf || pdf.user.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    const annotations = await Annotation.find({ 
      pdf: req.params.pdfId 
    }).sort('page');
    res.json(annotations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/annotations/:id
// @desc    Update an annotation
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { page, coords, comment, color } = req.body;

  try {
    const annotation = await Annotation.findById(req.params.id);
    if (!annotation || annotation.user.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Annotation not found' });
    }

    // Update fields
    if (page !== undefined) annotation.page = page;
    if (coords) annotation.coords = coords;
    if (comment !== undefined) annotation.comment = comment;
    if (color) annotation.color = color;

    await annotation.save();
    res.json(annotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/annotations/:id
// @desc    Delete an annotation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
      const deleted = await Annotation.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id
      });
  
      if (!deleted) {
        return res.status(404).json({ msg: 'Annotation not found or not yours' });
      }
  
      return res.json({ msg: 'Annotation deleted' });
    } catch (err) {
      console.error('Delete error:', err);
      return res.status(500).json({ msg: 'Server error' });
    }
  });

module.exports = router;
