import * as readlineSync from "readline-sync";

import { GuessOutcome, guessOutcomeFromChar, Wordler } from "./wordler.js";
import { Solver } from "./solver.js";
import { printMessage } from "./util.js";

// allows playing via the terminal
export default class Player {
  wordler = new Wordler();
  solver = new Solver(this.wordler);

  printInstructions(): void {
    printMessage("Welcome to Wordler!");
    printMessage("I'll make guesses, and you tell me the result.");
    printMessage("Type 'g' for green, 'y' for yellow, or '.' for grey.");
  }

  makeGuess(): string | null {
    return this.solver.makeGuess();
  }

  // play the game
  play(): void {
    const numGuesses = 6;
    for (let i = 0; i < numGuesses; i++) {
      const guessWord = this.solver.getNextGuess();

      if (guessWord) {
        printMessage(`I'm guessing ${guessWord}`);

        const resultString = readlineSync.question(
          "Enter the result from Wordler. For example 'ggy..' or 'q' to quit: "
        );
        if (resultString === "q") {
          process.exit();
        }

        if (resultString === "ggggg" || resultString === "") {
          printMessage(`I got it in ${i + 1}! Let's play again.`);
          printMessage("-----");
          return;
        }

        const result = new Array<GuessOutcome>();
        for (let i = 0; i < resultString.length; i++) {
          const letter = resultString[i];
          result.push(guessOutcomeFromChar(letter));
        }

        const guess = { word: guessWord, result: result };
        this.wordler.handleResult(guess);
      } else {
        printMessage("I give up. Let's play again.");
        return;
      }
    }
    printMessage("I ran out of guesses. Let's play again.");
  }
}

for (;;) {
  new Player().play();
}
