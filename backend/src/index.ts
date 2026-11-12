import cors from "cors";
import express from "express";

const app = express();

app.use(cors());
app.use(express.json());

// TENTO ENDPOINT POŽADUJE ZADÁNÍ:
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend běží na portu ${PORT}`);
});