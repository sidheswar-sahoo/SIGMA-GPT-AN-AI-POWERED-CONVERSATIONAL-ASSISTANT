import Document from "../models/Documents.js";
import generateEmbedding from "./embeddings.js";

async function retrieveRelevantChunks(query, limit = 5) {
    try {
        // 1. Generate embedding for user's question
        const queryEmbedding = await generateEmbedding(query);

        // 2. Search MongoDB Vector Search index
        const results = await Document.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 100,
                    limit: limit
                }
            },
            {
                $project: {
                    _id: 1,
                    filename: 1,
                    content: 1,
                    metadata: 1,
                    score: {
                        $meta: "vectorSearchScore"
                    }
                }
            }
        ]);
        console.log("Retrieved chunks:", results.length);
        console.log("Results:", results);

        return results;
    } catch (error) {
        console.error("Vector search error:", error);
        throw error;
    }
}

export default retrieveRelevantChunks;