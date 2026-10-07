import fs from "fs";
import { PDFParse } from "pdf-parse";

async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: dataBuffer
        });

        const result = await parser.getText();

        await parser.destroy();

        return result.text;

    } catch (error) {
        console.error("PDF extraction error:", error);
        throw error;
    }
}

export default extractTextFromPDF;