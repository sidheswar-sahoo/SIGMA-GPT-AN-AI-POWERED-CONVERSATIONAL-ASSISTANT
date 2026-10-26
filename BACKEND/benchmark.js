
import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import { performance } from "node:perf_hooks";

import Document from "./models/Documents.js";
import generateEmbedding from "./services/embeddings.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const TOP_K = 5;
const REPEATS = 3;

// In questions ko apne uploaded PDFs ke according change kar sakta hai.
const queries = [
    "What is the main topic of this document?",
    "What are the key findings of this document?",
    "What important facts are mentioned in this document?"
];

// Cosine similarity calculate karna
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) {
        return -1;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return -1;

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Optimized method: existing MongoDB Vector Search
async function indexedSearch(queryVector) {
    return Document.aggregate([
        {
            $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector,
                numCandidates: 100,
                limit: TOP_K
            }
        },
        {
            $project: {
                _id: 1,
                score: { $meta: "vectorSearchScore" }
            }
        }
    ]);
}

// Baseline: fetch all embeddings and scan them in Node.js
async function bruteForceSearch(queryVector) {
    const docs = await Document.find(
        {},
        { embedding: 1 }
    ).lean();

    return docs
        .map(doc => ({
            _id: doc._id,
            score: cosineSimilarity(
                queryVector,
                doc.embedding
            )
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K);
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function measure(fn, queryVector) {
    const start = performance.now();

    await fn(queryVector);

    return performance.now() - start;
}

async function main() {
    if (!process.env.MONGODB_URI ||
        !process.env.GEMINI_API_KEY) {
        throw new Error(
            "Check MONGODB_URI and GEMINI_API_KEY in BACKEND/.env"
        );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB.");

    const indexedTimes = [];
    const baselineTimes = [];

    for (const query of queries) {
        console.log("\nTesting query:", query);

        // Embedding time ko search timings se alag rakhenge.
        const queryVector = await generateEmbedding(query);

        // Warm-up runs; results mein include nahi honge.
        await indexedSearch(queryVector);
        await bruteForceSearch(queryVector);

        for (let i = 0; i < REPEATS; i++) {
            // Order alternate karte hain.
            if (i % 2 === 0) {
                indexedTimes.push(
                    await measure(indexedSearch, queryVector)
                );

                baselineTimes.push(
                    await measure(bruteForceSearch, queryVector)
                );
            } else {
                baselineTimes.push(
                    await measure(bruteForceSearch, queryVector)
                );

                indexedTimes.push(
                    await measure(indexedSearch, queryVector)
                );
            }
        }
    }

    const indexedMedian = median(indexedTimes);
    const baselineMedian = median(baselineTimes);

    const reduction =
        ((baselineMedian - indexedMedian) /
            baselineMedian) * 100;

    console.log("\n========== BENCHMARK RESULTS ==========");
    console.log(
        "Indexed retrieval median:",
        indexedMedian.toFixed(2), "ms"
    );
    console.log(
        "Brute-force baseline median:",
        baselineMedian.toFixed(2), "ms"
    );
    console.log(
        "Latency reduction:",
        reduction.toFixed(2), "%"
    );
    console.log("Queries tested:", queries.length);
    console.log("Runs per method:", indexedTimes.length);

    await mongoose.disconnect();
}

main().catch(async error => {
    console.error("Benchmark failed:", error.message);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exitCode = 1;
});
