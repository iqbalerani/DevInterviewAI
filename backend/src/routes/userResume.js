import express from 'express';
import { PDFParse } from 'pdf-parse';
import { User } from '../models/User.js';

const router = express.Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain'];

// POST /api/user/resume — Upload or replace saved resume
router.post('/', async (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;

    if (!fileName || !fileType || !fileData) {
      return res.status(400).json({ success: false, error: 'fileName, fileType, and fileData are required' });
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({ success: false, error: 'Only PDF and TXT files are supported' });
    }

    const buffer = Buffer.from(fileData, 'base64');

    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, error: 'File must be under 5MB' });
    }

    let extractedText;
    if (fileType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer, verbosity: 0 });
      await parser.load();
      const parsed = await parser.getText();
      extractedText = parsed.text?.trim();
      await parser.destroy();
    } else {
      extractedText = buffer.toString('utf-8').trim();
    }

    if (!extractedText) {
      return res.status(400).json({ success: false, error: 'Could not extract text from file. Please try a different file.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        resume: {
          fileName,
          fileType,
          fileData: buffer,
          extractedText,
          uploadedAt: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      resume: {
        fileName: user.resume.fileName,
        fileType: user.resume.fileType,
        uploadedAt: user.resume.uploadedAt
      }
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload resume' });
  }
});

// GET /api/user/resume — Get full resume (metadata + text, no raw fileData)
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('resume');
    if (!user || !user.resume) {
      return res.status(404).json({ success: false, error: 'No saved resume' });
    }

    res.json({
      success: true,
      resume: {
        fileName: user.resume.fileName,
        fileType: user.resume.fileType,
        extractedText: user.resume.extractedText,
        uploadedAt: user.resume.uploadedAt
      }
    });
  } catch (err) {
    console.error('Get resume error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve resume' });
  }
});

// GET /api/user/resume/text — Get extracted text only (lightweight)
router.get('/text', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('resume.extractedText resume.fileName');
    if (!user || !user.resume) {
      return res.status(404).json({ success: false, error: 'No saved resume' });
    }

    res.json({
      success: true,
      extractedText: user.resume.extractedText,
      fileName: user.resume.fileName
    });
  } catch (err) {
    console.error('Get resume text error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve resume text' });
  }
});

// DELETE /api/user/resume — Remove saved resume
router.delete('/', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $unset: { resume: 1 } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete resume error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete resume' });
  }
});

export default router;
