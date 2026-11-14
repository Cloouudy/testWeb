import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import type { RowDataPacket } from "mysql2/promise";

const db = mysql.createPool(process.env.DATABASE_URL!);

const app = express();
app.use(cors());
app.use(express.json());

function toCamelCase(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/v1/team", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT * FROM team LIMIT 1");
    if (rows.length === 0) {
      return res.status(404).json({ error: "Tým nenalezen" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Chyba při čtení týmu z DB:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// Endpoint pro načtení všech zastávek (hodí se pro kontrolu i pro frontend)
app.get("/api/v1/stops", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT * FROM stops ORDER BY id");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Chyba při čtení zastávek z DB:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

async function start() {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Připojení k DB na pozadí
  for (let attempt = 1; ; attempt++) {
    try {
      await db.query("SELECT 1");
      console.log("Database connected!");
      break;
    } catch (error) {
      if (attempt === 60) {
        console.error("Nepodařilo se připojit k databázi");
        break;
      }
      console.log("Waiting for database...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 1. Tabulka pro tým
  await db.query(`
    CREATE TABLE IF NOT EXISTS team (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_name VARCHAR(100) NOT NULL,
      members TEXT NOT NULL
    )
  `);

  const [teamRows] = await db.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM team");
  if (teamRows[0].count === 0) {
    await db.query(
      "INSERT INTO team (team_name, members) VALUES (?, ?)",
      ["oavm warriors", "Jindřich Poruba, Vilém Spáčil"]
    );
    console.log("Výchozí data týmu uložena do databáze.");
  }

  // 2. Tabulka pro zastávky (opravené čárky)
  await db.query(`
    CREATE TABLE IF NOT EXISTS stops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      lines VARCHAR(20) NOT NULL,
      is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
      x DOUBLE NOT NULL,
      y DOUBLE NOT NULL,
      wheelchair_accessible BOOLEAN NOT NULL DEFAULT FALSE,
      has_shelter BOOLEAN NOT NULL DEFAULT FALSE,
      has_bench BOOLEAN NOT NULL DEFAULT FALSE,
      has_ticket_machine BOOLEAN NOT NULL DEFAULT FALSE,
      has_display BOOLEAN NOT NULL DEFAULT FALSE,
      image_url VARCHAR(255)
    )
  `);

  // 3. Seed zastávek ze souboru backend/data/stops.csv
  const [stopRows] = await db.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM stops");
  if (stopRows[0].count === 0) {
    const csvPath = path.resolve(process.cwd(), "data", "stops.csv");
    const fileContent = fs.readFileSync(csvPath, "utf-8");

    const lines = fileContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(1);

    const parseBool = (val: string) => val.trim().toLowerCase() === "true";

    for (const line of lines) {
      const cols = line.split(",");

      const id = Number(cols[0]);
      const name = cols[1].trim();
      const stopLines = cols[2].trim();
      const isTransfer = parseBool(cols[3]);
      const x = Number(cols[5]);
      const y = Number(cols[6]);
      const wheelchairAccessible = parseBool(cols[7]);
      const hasShelter = parseBool(cols[8]);
      const hasBench = parseBool(cols[9]);
      const hasTicketMachine = parseBool(cols[10]);
      const hasDisplay = parseBool(cols[11]);
      const imageUrl = `/stopsImages/${toCamelCase(name)}.png`;

      await db.execute(
        `INSERT INTO stops (
          id, name, lines, is_transfer, x, y,
          wheelchair_accessible, has_shelter, has_bench, has_ticket_machine, has_display, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          stopLines,
          isTransfer,
          x,
          y,
          wheelchairAccessible,
          hasShelter,
          hasBench,
          hasTicketMachine,
          hasDisplay,
          imageUrl,
        ]
      );
    }

    console.log(`Seed dokončen: uloženo ${lines.length} zastávek.`);
  }
}

start();