import retrieveRelevantChunks from "./retriever.js";
import getGeminiAPIResponse from "../utils/openai.js";

async function generateRAGResponse(question) {
    try {
        // 1. Retrieve relevant chunks from MongoDB
        const relevantChunks = await retrieveRelevantChunks(question, 5);

        // 2. If no relevant documents are found
        if (!relevantChunks || relevantChunks.length === 0) {
            return {
                answer: "I couldn't find any relevant information in the uploaded documents.",
                sources: []
            };
        }

        // 3. Combine retrieved chunks into context
        const context = relevantChunks
            .map((chunk, index) => {
                return `Source ${index + 1} (${chunk.filename}):\n${chunk.content}`;
            })
            .join("\n\n");

        // 4. Create RAG prompt
        const prompt = `
You are a helpful AI assistant.

Answer the user's question using the provided document context.

IMPORTANT RULES:
- Use the provided context as the primary source of information.
- Do not make up information that is not supported by the context.
- If the answer cannot be found in the context, clearly say that the information is not available in the uploaded documents.
- Give a clear and concise answer.

DOCUMENT CONTEXT:
${context}

USER QUESTION:
${question}

ANSWER:
`;

        // 5. Ask Gemini
        const answer = await getGeminiAPIResponse(prompt);

        // 6. Return answer + sources
        const sources = relevantChunks.map((chunk) => ({
            filename: chunk.filename,
            score: chunk.score
        }));

        return {
            answer,
            sources
        };
    } catch (error) {
        console.error("RAG generation error:", error);
        throw error;
    }
}

export default generateRAGResponse;