import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

const db = mysql.createPool(process.env.DATABASE_URL!);

const app = express();
app.use(cors());
app.use(express.json());


app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});





// Endpoint pro načtení dat o týmu z databáze
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

  // Vytvoření tabulky pro tým
  await db.query(`
    CREATE TABLE IF NOT EXISTS team (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_name VARCHAR(100) NOT NULL,
      members TEXT NOT NULL
    )
  `);

  // Uložení výchozích dat, pokud je tabulka prázdná
  const [rows] = await db.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM team");
  if (rows[0].count === 0) {
    await db.query(
      "INSERT INTO team (team_name, members) VALUES (?, ?)",
      ["oavm warriors", "Jindřich Poruba, Vilém Spáčil"] // Zde si upravte název týmu a členy
    );
    console.log("Výchozí data týmu uložena do databáze.");
  }
}

start();