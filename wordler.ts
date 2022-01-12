import { log, loadFrequencyMap } from "./util.js";
import * as Config from "./config.js";

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
};

class Wordler {
  // the dictionary is a map of words to their frequency
  // as words are filtered out, they are removed
  dictionary: Map<string, number> = loadFrequencyMap("dict/dict-with-frequencies.txt");

  // the board is an array of entries for each slot
  // each of which is either a single letter or set of possible letters
  board: (Set<string> | string)[] = [];

  // Letters which are known to be in the word
  // Lote that even when we place a letter, it can still appear again somewhere else, so we leave it in the set
  includedLetters: Set<string> = new Set();

  // hard mode is a boolean which indicates whether we must guess the same letter once we know it's in a certain slot
  hardMode = true;

  // first guess is a boolean which indicates whether we're on the first guess
  firstGuess = true;

  constructor() {
    // fill each board slot with the alphabet
    // there must be a more idiomatic way to do this
    const alphabet = Array<string>(26);
    for (let i = 0; i < 26; i++) {
      alphabet[i] = String.fromCharCode(65 + i);
    }

    for (let i = 0; i < Config.WordLength; i++) {
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
    log("Board:");
    log(
      this.board
        .map(function (set) {
          return Array.from(set).join(" ");
        })
        .join("\n")
    );

    log(`\nUnplaced letters: ${Array.from(this.includedLetters).join(" ")}\n`);
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
      } else {
        if (boardElement !== letter) {
          return false;
        }
      }
    }
    return true;
  }

  // does a word include all included letters?
  wordIncludesAllUnplacedLetters(word: string): boolean {
    for (const letter of this.includedLetters) {
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
    for (const word of this.dictionary.keys()) {
      if (!this.isValidWord(word)) {
        this.dictionary.delete(word);
      }
    }

    log(`Dictionary size: ${this.dictionary.size}`);
  }
}

export { GuessOutcome, guessOutcomeFromChar, Wordler };
