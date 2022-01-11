import * as fs from "fs";

const WORD_LENGTH = 5;

function loadFilteredWords(path: string): Set<string> {
  return new Set<string>(
    fs.readFileSync(path, "utf8").
    split("\n").
    filter(word => word.length === WORD_LENGTH).
    map(word => word.toUpperCase()));
}

function loadWords(): Set<string> {
  // From https://github.com/first20hours/google-10000-english/blob/master/20k.txt
  const words = loadFilteredWords("dict/google-20k.txt");
  const scrabbleWords = loadFilteredWords("dict/scrabble.txt");

  const intersection = new Set<string>();
  words.forEach(word => {
    if (scrabbleWords.has(word)) {
      intersection.add(word);
    }
  });

  return intersection;
}

console.log(Array.from(loadWords()).join("\n"));
