import React, { ChangeEvent, useEffect, useState } from "react";
import "./App.css";
import "bootstrap/dist/css/bootstrap.css";
import { setgroups } from "process";
import { countReset } from "console";
import { start } from "repl";

type GameGrid = Tile[][];

type Menu = {
  lost: boolean;
  won: boolean;
  difficulty: Difficulty;
  firstClick: boolean;
  size: number;
  correctFlags: number;
};

enum Difficulty {
  Easy = 20,
  Normal = 40,
  Hard = 70,
}

type Tile = {
  tile: ETile;
  minesAround: number;
  content: string;
  isMine: boolean;
};

enum ETile {
  Unknown,
  Cleared,
  Mine,
  Flag,
}

function GetMenu(difficulty: Difficulty = Difficulty.Normal): Menu {
  return {
    lost: false,
    won: false,
    difficulty: difficulty,
    firstClick: true,
    size: 16,
    correctFlags: 0,
  };
}

function Game() {
  const [menu, setMenu] = useState(GetMenu());
  const [grid, setGrid] = useState(GetEmptyGrid());
  return (
    <div className="container grid">
      <div className="row pt-5">
        <div className="col-8">
          {grid.map((col, colIndex) => (
            <div key={colIndex}>
              {col.map((row, rowIndex) => (
                <button
                  className={GetTileClasses(row)}
                  key={colIndex + "" + rowIndex}
                  onClick={() => LeftClick(colIndex, rowIndex)}
                  onContextMenu={() => RightClick(colIndex, rowIndex)}
                  disabled={menu.lost || menu.won || row.tile === ETile.Cleared}
                >
                  {row.content}
                </button>
              ))}
            </div>
          ))}
          <h1>{menu.lost ? "LOST" : ""}</h1>
        </div>
        <div className="col-4">
          <Menu />
        </div>
      </div>
    </div>
  );

  function GetTileClasses(tile: Tile): string {
    let classes = "tile ";

    if (tile.tile === ETile.Cleared) {
      classes += "cleared ";
      if (tile.minesAround > 0) classes += "number ";
    } else if (tile.tile === ETile.Flag) classes += "flag ";

    if (tile.isMine && menu.lost) classes += "exploded ";
    return classes;
  }

  function LeftClick(col: number, row: number) {
    let newGrid = grid;
    if (grid[col][row].tile === ETile.Unknown)
      newGrid = Reveal(col, row, newGrid).slice();
    setGrid(newGrid);
  }

  function RightClick(col: number, row: number) {
    let updatedGrid = grid;

    if (grid[col][row].tile === ETile.Unknown) {
      updatedGrid = PlaceFlag(col, row, updatedGrid);
      setMenu({ ...menu });
    } else if (grid[col][row].tile === ETile.Flag) {
      updatedGrid = RemoveFlag(col, row, updatedGrid);
      setMenu({ ...menu });
    }

    setGrid(updatedGrid);
    if (menu.correctFlags === menu.difficulty) {
      setMenu({ ...menu, won: true });
    }
  }

  function Reveal(col: number, row: number, newGrid: GameGrid): GameGrid {
    if (menu.firstClick) {
      newGrid = StartGrid(newGrid, col, row);
      setMenu({
        ...menu,
        firstClick: false,
      });
    }

    if (grid[col][row].isMine) Lose();

    if (grid[col][row].minesAround === 0) {
      newGrid = FindNearbyZeroes(newGrid, col, row);
    } else {
      newGrid[col][row].tile = ETile.Cleared;
      newGrid[col][row].content = newGrid[col][row].minesAround.toString();
    }

    return newGrid;
  }

  function FindNearbyZeroes(
    inGrid: GameGrid,
    col: number,
    row: number
  ): GameGrid {
    let nearbyZeroes: number[][] = [];
    nearbyZeroes.push([col, row]); // push since this will only be called if the tile was 0 and you cant click cleared tiles so this shouldnt be a duplicate

    let newZero = true;
    while (newZero) {
      let zeroCount = nearbyZeroes.length;

      nearbyZeroes = CheckForNewZeroes(nearbyZeroes, inGrid);
      if (nearbyZeroes.length === zeroCount) newZero = false;
    }

    let result = ClearAroundZeroes(nearbyZeroes, inGrid);

    return result;
  }

  function ClearAroundZeroes(toClear: number[][], newGrid: GameGrid): GameGrid {
    for (let element of toClear) {
      for (let c = element[0] - 1; c <= element[0] + 1; c++) {
        for (let r = element[1] - 1; r <= element[1] + 1; r++) {
          if (c >= 0 && r >= 0 && c < menu.size && r < menu.size) {
            newGrid[c][r].tile = ETile.Cleared;
            if (newGrid[c][r].minesAround > 0)
              newGrid[c][r].content = newGrid[c][r].minesAround.toString();
          }
        }
      }
    }

    return newGrid;
  }

  function CheckForNewZeroes(
    known: number[][],
    currentGrid: GameGrid
  ): number[][] {
    let result = known;
    known.forEach((zero) => {
      for (let c = zero[0] - 1; c <= zero[0] + 1; c++) {
        for (let r = zero[1] - 1; r <= zero[1] + 1; r++) {
          if (c >= 0 && c < menu.size && r >= 0 && r < menu.size) {
            if (currentGrid[c][r].minesAround === 0) {
              if (IsUnique(result, [c, r])) {
                result.push([c, r]);
              }
            }
          }
        }
      }
    });

    return result;
  }

  function IsUnique(known: number[][], coords: number[]): boolean {
    let isNew = true;
    for (let element of known) {
      if (element.toString() === coords.toString()) {
        isNew = false;
        break;
      }
    }
    return isNew;
  }

  function Lose() {
    setMenu({
      ...menu,
      lost: true,
    });
  }

  function PlaceFlag(col: number, row: number, updatedGrid: GameGrid) {
    if (updatedGrid[col][row].isMine)
      setMenu({ ...menu, correctFlags: menu.correctFlags++ });
    updatedGrid[col][row].tile = ETile.Flag;
    return updatedGrid;
  }
  function RemoveFlag(col: number, row: number, updatedGrid: GameGrid) {
    if (updatedGrid[col][row].isMine)
      setMenu({ ...menu, correctFlags: menu.correctFlags-- });
    updatedGrid[col][row].tile = ETile.Unknown;
    return updatedGrid;
  }

  function GetSurroundingMines(grid: GameGrid): GameGrid {
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[0].length; row++) {
        if (grid[col][row].isMine) continue;

        for (let y = col - 1; y <= col + 1; y++) {
          for (let x = row - 1; x <= row + 1; x++) {
            if (y > -1 && y < grid.length && x > -1 && x < grid[0].length) {
              if (grid[y][x].isMine) grid[col][row].minesAround++;
            }
          }
        }
      }
    }

    return grid;
  }

  function StartGrid(grid: GameGrid, col: number, row: number): GameGrid {
    let result = FillMines(grid, col, row);
    result = GetSurroundingMines(result);
    return result;
  }

  function FillMines(
    grid: GameGrid,
    startCol: number,
    startRow: number
  ): GameGrid {
    let mines: number = menu.difficulty;
    while (mines > 0) {
      let col = Math.floor(Math.random() * (menu.size - 0) + 0);
      let row = Math.floor(Math.random() * (menu.size - 0) + 0);
      if (!grid[col][row].isMine && startCol !== col && startRow !== row) {
        grid[col][row].isMine = true;
        mines--;
      }
    }
    return grid;
  }

  function GetEmptyGrid(): GameGrid {
    let result: GameGrid = [];
    for (let x = 0; x < menu.size; x++) {
      result.push([]);
      for (let y = 0; y < menu.size; y++) {
        let tile = {
          tile: ETile.Unknown,
          minesAround: 0,
          content: "",
          isMine: false,
        };
        result[x].push(tile);
      }
    }
    return result;
  }

  function StartNew(difficulty: string) {
    setGrid(GetEmptyGrid());
    let mines: number = 40;
    if (difficulty === "Easy") mines = 20;
    else if (difficulty === "Hard") mines = 70;
    else mines = 40;
    setMenu({
      lost: false,
      won: false,
      difficulty: mines,
      firstClick: true,
      size: 16,
      correctFlags: 0,
    });
  }

  function GetDifficultyText(): string {
    if (menu.difficulty === Difficulty.Easy) return "Easy";
    else if (menu.difficulty === Difficulty.Normal) return "Normal";
    else return "Hard";
  }

  function Menu() {
    const [difficulty, setDifficulty] = useState(GetDifficultyText);
    const isSelected = (value: string): boolean => difficulty === value;
    const handleRadio = (e: ChangeEvent<HTMLInputElement>): void =>
      setDifficulty(e.currentTarget.value);

    return (
      <div className="">
        {menu.lost && <h1>Lost :[</h1>}
        {menu.won && <h1>Won :]</h1>}
        <h2 className="">Menu</h2>
        <form>
          <input
            type="radio"
            value="Easy"
            name="difficulty"
            checked={isSelected("Easy")}
            onChange={handleRadio}
          />{" "}
          Easy <br />
          <input
            type="radio"
            value="Normal"
            name="difficulty"
            checked={isSelected("Normal")}
            onChange={handleRadio}
          />{" "}
          Normal <br />
          <input
            type="radio"
            value="Hard"
            name="difficulty"
            checked={isSelected("Hard")}
            onChange={handleRadio}
          />{" "}
          Hard <br />
          <button
            className="btn "
            type="submit"
            onClick={() => StartNew(difficulty)}
          >
            Start New
          </button>
        </form>
      </div>
    );
  }
}

function App() {
  window.addEventListener("contextmenu", (e) => e.preventDefault()); // Runs once and disables right click globally (CTRL SHIFT C to inspect)
  return (
    <div className="App">
      <Game />
    </div>
  );
}

export default App;
