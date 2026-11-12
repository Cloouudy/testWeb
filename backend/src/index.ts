import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";

const db = mysql.createPool(process.env.DATABASE_URL!);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

async function start() {
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

  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();