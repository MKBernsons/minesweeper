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
                  {row.isMine && menu.lost ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-emoji-angry-fill"
                      viewBox="0 0 16 16"
                    >
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM4.053 4.276a.5.5 0 0 1 .67-.223l2 1a.5.5 0 0 1 .166.76c.071.206.111.44.111.687C7 7.328 6.552 8 6 8s-1-.672-1-1.5c0-.408.109-.778.285-1.049l-1.009-.504a.5.5 0 0 1-.223-.67zm.232 8.157a.5.5 0 0 1-.183-.683A4.498 4.498 0 0 1 8 9.5a4.5 4.5 0 0 1 3.898 2.25.5.5 0 1 1-.866.5A3.498 3.498 0 0 0 8 10.5a3.498 3.498 0 0 0-3.032 1.75.5.5 0 0 1-.683.183zM10 8c-.552 0-1-.672-1-1.5 0-.247.04-.48.11-.686a.502.502 0 0 1 .166-.761l2-1a.5.5 0 1 1 .448.894l-1.009.504c.176.27.285.64.285 1.049 0 .828-.448 1.5-1 1.5z" />
                    </svg>
                  ) : (
                    row.content
                  )}
                  {row.tile === ETile.Flag ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      className="bi bi-flag-fill"
                      viewBox="0 0 16 16"
                    >
                      <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.001" />
                    </svg>
                  ) : (
                    ""
                  )}
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
