import * as fs from "fs";
import * as Config from "./config.js";

// print message for user
function printMessage(message: string) {
  // eslint-disable-next-line
  console.log(message);
}

// debug logging only
function log(message: string) {
  // eslint-disable-next-line
  console.log(message);
}

function loadFrequencyMap(filename: string): Map<string, number> {
  const frequencyMap = new Map<string, number>();
  const lines = fs.readFileSync(filename, "utf-8").split("\n");

  for (const line in lines) {
    const [word, frequency] = lines[line].split(" ");
    if (word.length === Config.WordLength) {
      frequencyMap.set(word.toUpperCase(), Number.parseFloat(frequency));
    }
  }

  return frequencyMap;
}

export { printMessage, log, loadFrequencyMap };
