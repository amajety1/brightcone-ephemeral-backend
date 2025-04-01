import { HfInference } from "@huggingface/inference";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const hf = new HfInference(process.env.HF_API_KEY);

const bartInfo = "BART (Bay Area Rapid Transit) is a public transportation system serving the San Francisco Bay Area. It offers train services, parking facilities at stations, and connections to buses and other transit options. Stations like MacArthur and Daly City provide daily parking, EV spots, and carpool options.";

(async () => {
  const embedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: bartInfo,
  });

  fs.writeFileSync("./bart_embedding.json", JSON.stringify(Array.from(embedding), null, 2));
  console.log("BART embedding saved to bart_embedding.json!");
})();