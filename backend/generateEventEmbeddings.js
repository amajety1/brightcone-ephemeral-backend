import { HfInference } from "@huggingface/inference";
import fs from "fs";

// Initialize Hugging Face client
const hf = new HfInference(process.env.HF_API_KEY);

// List of predefined event types
const eventTypes = [
  "Sports",
  "Warriors Game",
  "Live Music",
  
];

// Function to generate embeddings for the event types
const generateEventTypeEmbeddings = async () => {
  try {
    // Generate embeddings for all event types
    const eventEmbeddings = await Promise.all(
      eventTypes.map(async (event) => {
        const embedding = await hf.featureExtraction({
          model: "sentence-transformers/all-MiniLM-L6-v2", // Embedding model
          inputs: event,
        });
        return { event, embedding };
      })
    );

    // Save the embeddings to a JSON file
    const filePath = "./event_type_embeddings.json";
    fs.writeFileSync(filePath, JSON.stringify(eventEmbeddings, null, 2));
    console.log(`Embeddings saved to ${filePath}`);
  } catch (error) {
    console.error("Error generating event type embeddings:", error);
  }
};

// Call the function to generate embeddings
generateEventTypeEmbeddings();
