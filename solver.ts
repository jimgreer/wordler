import { Wordler } from "./wordler.js";
import { log } from "./util.js";
import * as Config from "./config.js";

type WordScore = {
  word: string;
  wordFrequency: number;
  frequencyInEnglishScore: number;
  duplicatePenalty: number;
  score: number;
};

// Solver is a class which takes a wordler and makes a guess
class Solver {
  // wordler is the wordler we're solving
  wordler: Wordler;

  // slot frequencies is a set of numbers which represent the frequency of each letter in the dictionary for each slot
  slotFrequencies: Array<Map<string, number>> = [];

  // probabilities is a set of numbers which represent the probability of each word being the answer
  wordFrequencies: Map<string, number> = new Map();

  // constructor takes a wordler
  constructor(wordler: Wordler) {
    this.wordler = wordler;
    for (let i = 0; i < Config.WordLength; i++) {
      this.slotFrequencies.push(new Map());
    }
  }

  // getNextGuess returns the next guess
  getNextGuess(): string | null {
    // if we're on the first guess, return the first letter
    if (this.wordler.firstGuess) {
      this.wordler.firstGuess = false;
      return "AROSE";
    }

    return this.makeGuess();
  }

  // update the frequency with which each letter appears in the dictionary
  updateSlotFrequencies(): void {
    for (const word in this.wordler.dictionary.keys()) {
      for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const frequency = this.slotFrequencies[i].get(letter) || 0;
        this.slotFrequencies[i].set(letter, frequency + 1);
      }
    }
  }

  // calculate the probability of a word being the answer based on the slot frequencies
  calculateWordFrequency(word: string): number {
    let wordFrequency = 0;
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const slotFrequency = this.slotFrequencies[i].get(letter) || 0;
      wordFrequency = wordFrequency + slotFrequency;
    }
    return wordFrequency;
  }

  // update the frequency with which each word appears in the dictionary
  updateWordFrequencies(): void {
    let maxWordFrequency = 0;

    for (const word in this.wordler.dictionary.keys()) {
      const wordFrequency = this.calculateWordFrequency(word);
      this.wordFrequencies.set(word, wordFrequency);
      maxWordFrequency = Math.max(maxWordFrequency, wordFrequency);
    }

    this.normalizeWordFrequencies(maxWordFrequency);
  }

  // normalize the word frequencies to be between 0 and 1
  normalizeWordFrequencies(maxWordFrequency: number): void {
    for (const word in this.wordFrequencies.keys()) {
      const wordFrequency = this.wordFrequencies.get(word) || 0;
      this.wordFrequencies.set(word, wordFrequency / maxWordFrequency);
    }
  }

  // count the number of duplicate letters in a word
  countDuplicateLetters(word: string): number {
    let duplicateLetters = 0;

    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      if (word.indexOf(letter) !== word.lastIndexOf(letter)) {
        duplicateLetters++;
      }
    }

    return duplicateLetters;
  }

  // probability of a word being the answer
  wordScore(word: string, frequencyInEnglish: number): WordScore {
    const duplicatePenaltyMultiplier = 0.25;
    const englishFrequencyMultiplier = -0.005;
    const englishFrequencyCap = 0.0;
    const inversionBase = 0.01;

    const wordFrequency = this.wordFrequencies.get(word) || 0;
    const duplicatePenalty = this.countDuplicateLetters(word) * duplicatePenaltyMultiplier;
    const frequencyInEnglishScore = Math.min(
      inversionBase - Math.log(frequencyInEnglish) * englishFrequencyMultiplier,
      englishFrequencyCap
    );

    const score = wordFrequency + duplicatePenalty + frequencyInEnglishScore;

    return { word, wordFrequency, frequencyInEnglishScore, duplicatePenalty, score };
  }

  // makes a guess based on the highest word probability
  makeGuess(): string | null {
    this.updateSlotFrequencies();
    this.updateWordFrequencies();
    const wordScores = new Array<WordScore>();

    for (const [word, frequencyInEnglish] of this.wordler.dictionary) {
      wordScores.push(this.wordScore(word, frequencyInEnglish));
    }

    wordScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(wordScores.length, 10); i++) {
      const wordScore = wordScores[i];
      log(
        `${wordScore.word}: ${wordScore.wordFrequency.toPrecision(2)} - ${
          wordScore.duplicatePenalty
        } + ${wordScore.frequencyInEnglishScore.toPrecision(2)} = ${wordScore.score.toPrecision(2)}`
      );
    }

    if (wordScores.length > 0) {
      return wordScores[0].word;
    }

    return null;
  }
}

export { Solver };
