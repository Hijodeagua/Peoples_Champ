import { formatDailyTopFiveShareText } from "./dailyShare";

function expectEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected:\n${expected}\n\nReceived:\n${actual}`);
  }
}

const formatted = formatDailyTopFiveShareText([
  "Nikola Jokic",
  "Giannis Antetokounmpo",
  "Luka Doncic",
  "Shai Gilgeous-Alexander",
  "Jayson Tatum",
]);

expectEqual(
  formatted,
  [
    "1️⃣: Nikola Jokic",
    "2️⃣: Giannis Antetokounmpo",
    "3️⃣: Luka Doncic",
    "4️⃣: Shai Gilgeous-Alexander",
    "5️⃣: Jayson Tatum",
  ].join("\n"),
);
