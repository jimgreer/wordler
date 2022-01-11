import * as fs from "fs";
import { nextTick } from "process";
import * as readlineSync from "readline-sync" ;

enum GuessOutcome {
  Green = "g",
  Yellow = "y",
  Grey = ".",
}

function guessOutcomeFromChar(char: string): GuessOutcome {
  switch (char) {
    case "g":
      return GuessOutcome.Green;
    case "y":
      return GuessOutcome.Yellow;
    case ".":
      return GuessOutcome.Grey;
    default:
      throw new Error(`Invalid guess outcome: ${char}`);
  }
}

type Guess = {
  word: string;
  result: GuessOutcome[];
}

const WORD_LENGTH = 5;
class Wordler {
  // the dictionary is an array of words which are currently valid
  dictionary: Set<string> = new Set<string>(
    fs.readFileSync("dict/dict.txt", "utf8").
    split("\n"));

  // the board is an array of entries for each slot
  // each of which is either a single letter or set of possible letters
  board: (Set<string> | string)[] = [];

  // Letters which are known to be in the word
  // Lote that even when we place a letter, it can still appear again somewhere else, so we leave it in the set
  includedLetters: Set<string> = new Set();

  // hard mode is a boolean which indicates whether we must guess the same letter once we know it's in a certain slot
  hardMode: boolean = true;

  // first guess is a boolean which indicates whether we're on the first guess
  firstGuess: boolean = true;

  constructor() {
    // fill each board slot with the alphabet
    // there must be a more idiomatic way to do this
    const alphabet = Array<string>(26);
    for (let i = 0; i < 26; i++) {
      alphabet[i] = String.fromCharCode(65 + i);
    }
    
    for (let i = 0; i < WORD_LENGTH; i++) {
      this.board.push(new Set(alphabet));
    }
  }

  // handle result takes a guess and a result and updates the state
  handleResult(guess: Guess): void {
    for (let i = 0; i < guess.result.length; i++) {
      const letter = guess.word[i];
      const result = guess.result[i];
      switch (result) {
        case GuessOutcome.Green: {
          this.board[i] = letter;
          break;
        }
        case GuessOutcome.Yellow: {
          this.includedLetters.add(letter);
          const boardElement = this.board[i];
          if (boardElement instanceof Set) {
            boardElement.delete(letter);
          }
          break;
        } 
        case GuessOutcome.Grey: {
          // remove letter from all sets
          for (let j = 0; j < this.board.length; j++) {
            const boardElement = this.board[j];
            if (boardElement instanceof Set) {
              boardElement.delete(letter);
            }
          }
          break;
        }
      }
    }
    this.printBoard();
    this.updateDictionary();
  }

  printBoard(): void {
    // map first set to a string
    console.log("Board:");
    console.log(this.board.map(function(set) {
      return Array.from(set).join(" ");
    }).join("\n"));
    
    console.log(`\nUnplaced letters: ${Array.from(this.includedLetters).join(" ")}\n`);
  }

  // does a word match the current board?
  wordMatchesBoard(word: string): boolean {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const boardElement = this.board[i];

      if (boardElement instanceof Set) {
        if (!boardElement.has(letter)) {
          return false;
        }
      }
      else {
        if (boardElement !== letter) {
          return false;
        }
      }
    }
    return true;
  }

  // does a word include all included letters?
  wordIncludesAllUnplacedLetters(word: string): boolean {
    for(let letter of this.includedLetters) {
      if (!word.includes(letter)) {
        return false;
      }
    }
    
    return true;
  } 

  // is a word valid?
  isValidWord(word: string): boolean {
    if (!this.wordIncludesAllUnplacedLetters(word)) {
      return false;
    }

    if (!this.wordMatchesBoard(word)) {
      return false;
    }

    return true;
  }

  // update dictionary based on the result of a guess
  updateDictionary(): void {
    const self = this;

    this.dictionary.forEach(function (word) {
      if (!self.isValidWord(word)) {
        self.dictionary.delete(word);
      }
    });

    console.log(`Dictionary size: ${this.dictionary.size}`);
  }
}

type WordScore = {
  word: string,
  wordFrequency: number,
  duplicatePenalty: number,
  score: number
}


// Solver is a class which takes a wordler and makes a guess
class Solver {
  // wordler is the wordler we're solving
  wordler: Wordler;

  // slot frequencies is a set of numbers which represent the frequency of each letter in the dictionary for each slot
  slotFrequencies: Array<Map<string, number>> = [];

  // probabilities is a set of numbers which represent the probability of each word being the answer
  wordFrequencies: Map<string, number> = new Map();

  // penalty for each duplicate
  duplicatePenalty = 0.25;

  // constructor takes a wordler
  constructor(wordler: Wordler) {
    this.wordler = wordler;
    for (let i = 0; i < WORD_LENGTH; i++) {
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
    const self = this;

    this.wordler.dictionary.forEach(function(word) {
        for (let i = 0; i < word.length; i++) {
          const letter = word[i];
          const frequency = self.slotFrequencies[i].get(letter) || 0;
          self.slotFrequencies[i].set(letter, frequency + 1);
        }
    });
  };

  // calculate the probability of a word being the answer based on the slot frequencies
  calculateWordFrequency(word: string): number {
    let wordFrequency = 0;
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const slotFrequency = this.slotFrequencies[i].get(letter) || 0;
      wordFrequency = wordFrequency + slotFrequency;
    }
    return wordFrequency;
  };

  // update the frequency with which each word appears in the dictionary
  updateWordFrequencies(): void {
    let maxWordFrequency = 0;
    const self = this;

    this.wordler.dictionary.forEach(function(word) {
      const wordFrequency = self.calculateWordFrequency(word);
      self.wordFrequencies.set(word, wordFrequency);
      maxWordFrequency = Math.max(maxWordFrequency, wordFrequency);
    })

    this.normalizeWordFrequencies(maxWordFrequency);
  }

  // normalize the word frequencies to be between 0 and 1
  normalizeWordFrequencies(maxWordFrequency: number): void {
    const self = this;

    this.wordler.dictionary.forEach(function(word) {
      let wordFrequency = self.wordFrequencies.get(word) || 0;
      // console.log(`word: ${word} wordFrequency: ${wordFrequency} maxWordFrequency: ${maxWordFrequency}`);
      self.wordFrequencies.set(word, wordFrequency / maxWordFrequency);
    })
  };

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
  wordScore(word: string): WordScore {
    const wordFrequency = this.wordFrequencies.get(word) || 0;
    const duplicatePenalty = this.countDuplicateLetters(word) * this.duplicatePenalty;

    return {
      word: word,
      wordFrequency: wordFrequency,
      duplicatePenalty: duplicatePenalty,
      score: wordFrequency - duplicatePenalty,
    };
  }

  // makes a guess based on the highest word probability
  makeGuess(): string | null {
    this.updateSlotFrequencies();
    this.updateWordFrequencies();
    const wordScores = new Array<WordScore>();

    for(let word of this.wordler.dictionary) {
      wordScores.push(this.wordScore(word));
    }

    wordScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(wordScores.length, 10); i++) {
      const wordScore = wordScores[i];
      console.log(`${wordScore.word}: ${wordScore.wordFrequency.toPrecision(2)} - ${wordScore.duplicatePenalty} = ${wordScore.score.toPrecision(2)}`);
    }

    if (wordScores.length > 0) {
      return wordScores[0].word;
    }

    return null;
  }
}

// allows playing via the terminal
class Player {
  wordler = new Wordler();
  solver = new Solver(this.wordler);
  
  printInstructions(): void {
    console.log("Welcome to Wordler!");
    console.log("I'll make guesses, and you tell me the result.");
    console.log("Type 'g' for green, 'y' for yellow, or '.' for grey.");
  }

  makeGuess(): string | null {
    return this.solver.makeGuess();
  }

  // play the game
  play(): void {
    for(let i=0; i<10; i++) { 
      const guessWord = this.solver.getNextGuess();
      
      if (guessWord) {
        console.log(`I'm guessing ${guessWord}`);
        
        const resultString = readlineSync.question("Enter the result from Wordler. For example 'ggy..' or 'q' to quit: ");
        if (resultString === 'q') {
          process.exit();
        }

        if (resultString === 'ggggg' || resultString === '') {
          console.log("I win! Let's play again.");
          console.log("-----");
          return;
        }
        
        const result = new Array<GuessOutcome>();
        for (let i = 0; i < resultString.length; i++) {
          const letter = resultString[i];
          result.push(guessOutcomeFromChar(letter));
        }

        const guess = {word: guessWord, result: result};
        this.wordler.handleResult(guess);
      }
      else {
        console.log("I give up. Let's play again");
        return;
      }
    }
  }
}
// filter a set of words by those which match length
function filterByLength(words: Set<string>, length: number): Set<string> {
  const filteredWords = new Set<string>();
  words.forEach(word => {
    if (word.length === length) {
      filteredWords.add(word);
    }

  });
  return filteredWords;
}

export { Player };
while (true) {new Player().play();}
