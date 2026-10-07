import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";

import Document from "../models/Documents.js";
import extractTextFromPDF from "../services/pdfParser.js";
import splitTextIntoChunks from "../services/chunker.js";
import generateEmbedding from "../services/embeddings.js";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Allow only PDF files
const upload = multer({
    storage,

    fileFilter: (req, file, cb) => {
    const isPDF =
        file.mimetype === "application/pdf" ||
        file.originalname.toLowerCase().endsWith(".pdf");

    if (isPDF) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"));
    }
}
});


// POST /api/documents/upload
router.post("/upload", upload.single("file"), async (req, res) => {

    try {

        // Check whether file was uploaded
        if (!req.file) {
            return res.status(400).json({
                error: "No PDF file uploaded"
            });
        }

        console.log("PDF received:", req.file.originalname);


        // 1. Extract text from PDF
        const text = await extractTextFromPDF(req.file.path);

        if (!text || text.trim().length === 0) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                error: "Could not extract text from PDF"
            });
        }


        // 2. Split extracted text into chunks
        const chunks = splitTextIntoChunks(text);

        if (chunks.length === 0) {

            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                error: "No usable text found in PDF"
            });
        }

        console.log(`Created ${chunks.length} chunks`);


        // 3. Generate embedding for every chunk
        const savedDocuments = [];

        for (let i = 0; i < chunks.length; i++) {

            console.log(`Generating embedding ${i + 1}/${chunks.length}`);

            const embedding = await generateEmbedding(chunks[i]);


            // 4. Save chunk + embedding in MongoDB
            const document = await Document.create({

                filename: req.file.originalname,

                content: chunks[i],

                embedding: embedding,

                metadata: {
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    source: req.file.originalname
                }
            });


            savedDocuments.push(document._id);
        }


        // 5. Delete temporary PDF
        fs.unlinkSync(req.file.path);


        // 6. Send success response
        return res.status(201).json({

            message: "PDF uploaded and processed successfully",

            filename: req.file.originalname,

            chunks: chunks.length,

            documentIds: savedDocuments
        });

    } catch (error) {

        console.error("Document upload error:", error);


        // Delete temporary file if something went wrong
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }


        return res.status(500).json({

            error: "Failed to process PDF",

            details: error.message
        });
    }
});

export default router;