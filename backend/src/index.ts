import cors from "cors";
import express from "express";
import mysql from "mysql12/promise";


const db = mysql.createPool(process.env.DATABASE_URL!);

// Počká, až nastartuje MySQL databáze
for (let attempt = 1; ; attempt++) {
  try {
    await db.query("SELECT 1");
    console.log("Database connected!");
    break;
  } catch (error) {
    if (attempt === 60) throw error;
    console.log("Waiting for database...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const app = express();

app.use(cors());
app.use(express.json());

// TENTO ENDPOINT POŽADUJE ZADÁNÍ:
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});