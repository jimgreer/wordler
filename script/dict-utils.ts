import * as fs from "fs";

const WORD_LENGTH = 5;

function loadFrequencyMap(filename: string): Map<string, number> {
  const frequencyMap = new Map<string, number>();
  const lines = fs.readFileSync(filename, "utf-8").split("\n");

  for (const line in lines) {
    const [word, frequency] = lines[line].split(" ");
    if (word.length === WORD_LENGTH) {
      frequencyMap.set(word.toUpperCase(), Number.parseInt(frequency));
    }
  }

  return frequencyMap;
}

function readWordFile(path: string): Array<string> {
  return fs
    .readFileSync(path, "utf8")
    .split("\n")
    .filter((word) => word.length === WORD_LENGTH)
    .map((word) => word.toUpperCase());
}

function loadWords(): Set<string> {
  const words = readWordFile("dict/wordle-full.txt");
  const frequencyMap = loadFrequencyMap("dict/wikipedia-full.txt");

  // sort words by frequency
  words.sort((a, b) => {
    const aFrequency = frequencyMap.get(a) || 0;
    const bFrequency = frequencyMap.get(b) || 0;
    return bFrequency - aFrequency;
  });

  const topFrequency = frequencyMap.get(words[0]) || 0;

  // output words and frequencies by frequency
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let frequency = frequencyMap.get(word) || 0;
    frequency /= topFrequency;
    if (frequency > 0.000001) {
      // eslint-disable-next-line
      console.log(`${word} ${frequency.toPrecision(5)}`);
    }
  }

  return new Set(words);
}

loadWords();
