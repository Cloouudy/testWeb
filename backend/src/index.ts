import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

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


// prevedeni boolean z 0/1 (MySql) na format presne podle swaggeru
function formatStop(row: RowDataPacket) {
  return {
    id: Number(row.id),
    name: String(row.name),
    image_url: row.image_url ?? null,
    wheelchair_accessible: Boolean(row.wheelchair_accessible),
    has_shelter: Boolean(row.has_shelter),
    has_ticket_machine: Boolean(row.has_ticket_machine),
  };
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

// 1. GET /api/v1/stops – seznam všech zastávek (200 OK)
app.get("/api/v1/stops", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>("SELECT * FROM stops ORDER BY id");
    res.status(200).json(rows.map(formatStop));
  } catch (error) {
    console.error("Chyba při čtení zastávek z DB:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// 2. GET /api/v1/stops/:id – detail konkrétní zastávky (200 OK)
app.get("/api/v1/stops/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.execute<RowDataPacket[]>("SELECT * FROM stops WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Zastávka nenalezena" });
    }
    res.status(200).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při čtení detailu zastávky:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// 3. POST /api/v1/stops – vytvoření nové zastávky (201 Created)
app.post("/api/v1/stops", async (req, res) => {
  try {
    const {
      name,
      image_url = null,
      wheelchair_accessible,
      has_shelter,
      has_ticket_machine,
    } = req.body;

    if (
      typeof name !== "string" ||
      typeof wheelchair_accessible !== "boolean" ||
      typeof has_shelter !== "boolean" ||
      typeof has_ticket_machine !== "boolean"
    ) {
      return res.status(400).json({ error: "Neplatná vstupní data" });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO stops (name, image_url, wheelchair_accessible, has_shelter, has_ticket_machine)
      VALUES (?, ?, ?, ?, ?)`,
      [name, image_url ?? null, wheelchair_accessible, has_shelter, has_ticket_machine]
    );

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM stops WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při vytváření zastávky:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// 4. PUT /api/v1/stops/:id – nahrazení údajů existující zastávky (200 OK)
app.put("/api/v1/stops/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      name,
      image_url = null,
      wheelchair_accessible,
      has_shelter,
      has_ticket_machine,
    } = req.body;

    if (
      typeof name !== "string" ||
      typeof wheelchair_accessible !== "boolean" ||
      typeof has_shelter !== "boolean" ||
      typeof has_ticket_machine !== "boolean"
    ) {
      return res.status(400).json({ error: "Neplatná vstupní data" });
    }

    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE stops
      SET name = ?, image_url = ?, wheelchair_accessible = ?, has_shelter = ?, has_ticket_machine = ?
      WHERE id = ?`,
      [name, image_url ?? null, wheelchair_accessible, has_shelter, has_ticket_machine, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zastávka nenalezena" });
    }

    const [rows] = await db.execute<RowDataPacket[]>("SELECT * FROM stops WHERE id = ?", [id]);
    res.status(200).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při úpravě zastávky:", error);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// 5. DELETE /api/v1/stops/:id – odstranění zastávky (204 No Content bez těla odpovědi)
app.delete("/api/v1/stops/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await db.execute<ResultSetHeader>("DELETE FROM stops WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zastávka nenalezena" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Chyba při mazání zastávky:", error);
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
      stop_lines VARCHAR(20) NOT NULL DEFAULT '',
      is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
      x DOUBLE NOT NULL DEFAULT 0,
      y DOUBLE NOT NULL DEFAULT 0,
      wheelchair_accessible BOOLEAN NOT NULL DEFAULT FALSE,
      has_shelter BOOLEAN NOT NULL DEFAULT FALSE,
      has_bench BOOLEAN NOT NULL DEFAULT FALSE,
      has_ticket_machine BOOLEAN NOT NULL DEFAULT FALSE,
      has_display BOOLEAN NOT NULL DEFAULT FALSE,
      image_url VARCHAR(255) DEFAULT NULL
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
          id, name, stop_lines, is_transfer, x, y,
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