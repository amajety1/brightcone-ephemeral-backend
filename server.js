import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { HfInference } from "@huggingface/inference";
import fs from "fs";

dotenv.config();

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// Load the comprehensive BART embedding
const bartEmbedding = JSON.parse(fs.readFileSync("./bart_embedding.json", "utf-8"));

// Load the use case embeddings with queries (correct filename)
const useCaseEmbeddingsWithQueries = JSON.parse(fs.readFileSync("./use_case_embeddings_with_queries.json", "utf-8"));
const useCaseKeys = Object.keys(useCaseEmbeddingsWithQueries); // Use case keys like "events_and_activities", etc.

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB);
};

// Check if the query is BART-related by comparing with the comprehensive BART embedding
const isBartQuery = async (query) => {
  // Generate embedding for the query
  const queryEmbedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  });

  // Compare query embedding with the BART embedding
  const bartSimilarity = cosineSimilarity(queryEmbedding, bartEmbedding);

  // If similarity score is above the threshold (0.1), consider it a BART query
  return bartSimilarity >= 0.1 ? bartSimilarity : null;
};

// Find top N closest use cases based on cosine similarity
const findTopUseCases = async (query) => {
  const queryEmbedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: query,
  });

  const similarityScores = [];

  // Iterate over each use case category and its questions
  for (const useCase of useCaseKeys) {
    const questions = useCaseEmbeddingsWithQueries[useCase];

    // Iterate over each question and its embedding
    for (const { question, embedding: useCaseEmbedding } of questions) {
      if (Array.isArray(useCaseEmbedding) && useCaseEmbedding.length > 0) {
        const similarity = cosineSimilarity(queryEmbedding, useCaseEmbedding);
        similarityScores.push({ question, similarity });
      } else {
        console.log(`Invalid embedding for use case: ${useCase}, question: ${question}`);
      }
    }
  }

  // Sort by similarity score and take the top 5
  const topUseCases = similarityScores
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return topUseCases;
};

app.get("/chat", async (req, res) => {
  const query = req.query.query || "No query provided";

  try {
    // Check if it's a BART-related query
    console.log(`Checking if query: "${query}" is BART-related...`);
    const bartSimilarity = await isBartQuery(query);

    if (bartSimilarity) {
      console.log(`BART-related query detected! Similarity Score: ${bartSimilarity.toFixed(4)}`);

      // If BART-related, also find top 5 closest use cases
      const topUseCases = await findTopUseCases(query);
      console.log("Top 5 closest use cases based on cosine similarity:");
      topUseCases.forEach((useCase, index) => {
        console.log(`${index + 1}. Question: "${useCase.question}" - Similarity: ${useCase.similarity.toFixed(4)}`);
      });

      // Return both the BART similarity and closest use cases
      return res.json({
        response: "BART-related query",
        bartSimilarity: bartSimilarity.toFixed(4),
        topUseCases
      });
    } else {
      // If not BART-related, log and return a message indicating that
      console.log("Not a BART-related query");
      return res.json({
        response: "Not a BART query"
      });
    }

  } catch (error) {
    console.error(error);
    res.json({ response: "Sorry, something went wrong!" });
  }
});

app.listen(5001, () => {
  console.log("Server is running on port 5001");
});
