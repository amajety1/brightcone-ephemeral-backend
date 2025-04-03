import { HfInference } from "@huggingface/inference";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const hf = new HfInference(process.env.HF_API_KEY);

// Expanded BART-related information to create a comprehensive embedding
const bartInfo = `
BART (Bay Area Rapid Transit) is a public transportation system serving the San Francisco Bay Area. 
It offers fast and efficient train services, connecting cities like San Francisco, Oakland, Berkeley, and others. 
BART operates multiple lines, including the Yellow, Green, Blue, and Red lines, with frequent stops in key areas.

BART stations such as MacArthur, Daly City, and 16th St Mission offer daily parking, EV spots, and carpool parking options. 
Most stations are equipped with bike racks and bike lockers, allowing commuters to safely store their bicycles.

BART's parking lots provide different payment methods, including cash, credit cards, and Clipper cards, which can be used to pay for parking fees.
At some stations, there are special parking permits available for monthly subscribers.

In addition to parking, BART stations provide services like ticket vending machines, real-time train schedule information, and connections to other transit systems, including buses and ferries. 
BART also offers accessibility features such as elevators, ramps, and priority seating for passengers with disabilities.

The train schedule varies by time of day, with peak hours in the morning and evening. Train frequencies can range from 15 minutes to 5 minutes, depending on the time of day and the station.

In the future, BART plans to expand its services with more stations, improved connectivity, and additional train lines. There are also plans to add more electric vehicle charging stations at select locations.
`;

(async () => {
  const embedding = await hf.featureExtraction({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    inputs: bartInfo,
  });

  fs.writeFileSync("./bart_embedding.json", JSON.stringify(Array.from(embedding), null, 2));
  console.log("BART embedding saved to bart_embedding.json!");
})();
