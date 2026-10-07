function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
    if (!text || text.trim().length === 0) {
        return [];
    }

    const cleanText = text.replace(/\s+/g, " ").trim();

    const chunks = [];

    let start = 0;

    while (start < cleanText.length) {
        const end = Math.min(start + chunkSize, cleanText.length);

        const chunk = cleanText.slice(start, end).trim();

        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        if (end === cleanText.length) {
            break;
        }

        start = end - overlap;
    }

    return chunks;
}

export default splitTextIntoChunks;