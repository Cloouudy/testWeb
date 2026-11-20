import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

const db = mysql.createPool(process.env.DATABASE_URL!);

const ADMIN_API_KEY =
  process.env.ADMIN_API_KEY ?? "Kyqc49jIM+5+D0Sed8ZQ671gxkd7W/bBTWjDtZ0Zrgk=";

const app = express();
app.use(cors());
app.use(express.json());

// Zachycení neplatného JSONu v těle požadavku -> 400 Bad Request
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    next(err);
  }
);

// Middleware pro ověření administrátorského API klíče (Bearer schéma)
function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid administrator API key" });
  }

  const token = authHeader.slice("Bearer ".length);

  if (token !== ADMIN_API_KEY) {
    return res
      .status(401)
      .json({ error: "Missing or invalid administrator API key" });
  }

  next();
}

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

function parsePositiveIntId(rawId: unknown): number | null {
  if (typeof rawId !== "string" || !/^[1-9]\d*$/.test(rawId)) {
    return null;
  }
  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

// Převedení boolean z 0/1 (MySQL) na formát přesně podle Swaggeru
function formatStop(row: RowDataPacket) {
  return {
    id: Number(row.id),
    name: String(row.name),
    image_url: row.image_url ?? null,
    stop_lines: String(row.stop_lines ?? ""),
    is_transfer: Boolean(row.is_transfer),
    transfer_lines: String(row.transfer_lines ?? ""),
    wheelchair_accessible: Boolean(row.wheelchair_accessible),
    has_bench: Boolean(row.has_bench),
    has_shelter: Boolean(row.has_shelter),
    has_ticket_machine: Boolean(row.has_ticket_machine),
    has_display: Boolean(row.has_display),
  };
}

function formatLine(row: RowDataPacket) {
  return {
    id: Number(row.id),
    number: String(row.number),
    name: String(row.name),
    type: String(row.type),
    color: String(row.color),
  };
}

// Validace vstupního těla StopInput podle Swaggeru
function validateStopInput(body: unknown): {
  name: string;
  image_url: string | null;
  stop_lines: string;
  is_transfer: boolean;
  transfer_lines: string;
  wheelchair_accessible: boolean;
  has_bench: boolean;
  has_shelter: boolean;
  has_ticket_machine: boolean;
  has_display: boolean;
} | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const allowedKeys = new Set([
    "name",
    "image_url",
    "stop_lines",
    "is_transfer",
    "transfer_lines",
    "wheelchair_accessible",
    "has_bench",
    "has_shelter",
    "has_ticket_machine",
    "has_display",
  ]);

  // Zákaz polí, která nejsou ve specifikaci (additionalProperties: false)
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      return null;
    }
  }

  const {
    name,
    image_url,
    stop_lines,
    is_transfer,
    transfer_lines,
    wheelchair_accessible,
    has_bench,
    has_shelter,
    has_ticket_machine,
    has_display,
  } = record;

  // 1. Validace name (neprázdný string max 255 znaků)
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 255
  ) {
    return null;
  }

  if (
    typeof stop_lines !== "string" ||
    stop_lines.trim().length === 0 ||
    stop_lines.length > 20
  ) {
    return null;
  }

  if (typeof transfer_lines !== "string" || transfer_lines.length > 20) {
    return null;
  }

  // 2. Validace boolean polí
  if (
    typeof wheelchair_accessible !== "boolean" ||
    typeof has_bench !== "boolean" ||
    typeof has_shelter !== "boolean" ||
    typeof has_ticket_machine !== "boolean" ||
    typeof is_transfer !== "boolean" ||
    typeof has_display !== "boolean"
  ) {
    return null;
  }

  // 3. Validace nepovinného image_url (null, undefined, nebo platná URI max 255 znaků)
  let normalizedImageUrl: string | null = null;
  if (image_url !== undefined && image_url !== null) {
    if (typeof image_url !== "string" || image_url.length > 255) {
      return null;
    }
    try {
      new URL(image_url);
      normalizedImageUrl = image_url;
    } catch {
      return null;
    }
  }

  return {
    name,
    image_url: normalizedImageUrl,
    stop_lines,
    is_transfer,
    transfer_lines,
    wheelchair_accessible,
    has_bench,
    has_shelter,
    has_ticket_machine,
    has_display,
  };
}

function validateLineInput(body: unknown): {
  number: string;
  name: string;
  type: string;
  color: string;
} | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const { number, name, type, color } = record;

  if (
    typeof number !== "string" ||
    number.trim().length === 0 ||
    number.length > 255 ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 255 ||
    typeof type !== "string" ||
    type.trim().length === 0 ||
    type.length > 50 ||
    typeof color !== "string" ||
    color.trim().length === 0 ||
    color.length > 20
  ) {
    return null;
  }

  return {
    number: number.trim(),
    name: name.trim(),
    type: type.trim(),
    color: color.trim(),
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

// 1. GET /api/v1/stops – seznam všech zastávek (200 OK) – VEŘEJNÉ
app.get("/api/v1/stops", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM stops ORDER BY id"
    );
    res.status(200).json(rows.map(formatStop));
  } catch (error) {
    console.error("Chyba při čtení zastávek z DB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. GET /api/v1/stops/:id – detail konkrétní zastávky (200 / 400 / 404) – VEŘEJNÉ
app.get("/api/v1/stops/:id", async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid stop ID" });
  }

  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM stops WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }
    res.status(200).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při čtení detailu zastávky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Linky obsluhující konkrétní zastávku
app.get("/api/v1/stops/:id/lines", async (req, res) => {
  const stopId = parsePositiveIntId(req.params.id);
  if (stopId === null) {
    return res.status(400).json({ error: "Invalid stop ID" });
  }

  try {
    const [stopRows] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM stops WHERE id = ?",
      [stopId]
    );
    if (stopRows.length === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT DISTINCT l.id, l.\`number\`, l.name, l.\`type\`, l.color
       FROM \`lines\` l
       JOIN trips t ON t.line_id = l.id
       JOIN trip_stops ts ON ts.trip_id = t.id
       WHERE ts.stop_id = ?
       ORDER BY l.id`,
      [stopId]
    );

    res.status(200).json(rows.map(formatLine));
  } catch (error) {
    console.error("Chyba při čtení linek pro zastávku:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. POST /api/v1/stops – vytvoření nové zastávky (201 / 400 / 401) – CHRÁNĚNÉ
app.post("/api/v1/stops", requireAdminAuth, async (req, res) => {
  const data = validateStopInput(req.body);
  if (!data) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO stops (
        name, image_url, stop_lines, is_transfer, transfer_lines,
        wheelchair_accessible, has_bench, has_shelter, has_ticket_machine, has_display
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.image_url,
        data.stop_lines,
        data.is_transfer,
        data.transfer_lines,
        data.wheelchair_accessible,
        data.has_bench,
        data.has_shelter,
        data.has_ticket_machine,
        data.has_display,
      ]
    );

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM stops WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při vytváření zastávky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. PUT /api/v1/stops/:id – nahrazení údajů existující zastávky (200 / 400 / 401 / 404) – CHRÁNĚNÉ
app.put("/api/v1/stops/:id", requireAdminAuth, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid stop ID" });
  }

  const data = validateStopInput(req.body);
  if (!data) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `UPDATE stops
       SET name = ?, image_url = ?, stop_lines = ?, is_transfer = ?, transfer_lines = ?,
           wheelchair_accessible = ?, has_bench = ?, has_shelter = ?, has_ticket_machine = ?, has_display = ?
       WHERE id = ?`,
      [
        data.name,
        data.image_url,
        data.stop_lines,
        data.is_transfer,
        data.transfer_lines,
        data.wheelchair_accessible,
        data.has_bench,
        data.has_shelter,
        data.has_ticket_machine,
        data.has_display,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT * FROM stops WHERE id = ?",
      [id]
    );
    res.status(200).json(formatStop(rows[0]));
  } catch (error) {
    console.error("Chyba při úpravě zastávky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. DELETE /api/v1/stops/:id – odstranění zastávky (204 / 400 / 401 / 404) – CHRÁNĚNÉ
app.delete("/api/v1/stops/:id", requireAdminAuth, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid stop ID" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM stops WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Stop not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Chyba při mazání zastávky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Endpointy pro linky ---

// Seznam všech linek
app.get("/api/v1/lines", async (_req, res) => {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id, `number`, name, `type`, color FROM `lines` ORDER BY id"
    );
    res.status(200).json(rows.map(formatLine));
  } catch (error) {
    console.error("Chyba při čtení linek z DB:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Detail linky včetně směrů (trips) a zastávek ve správném pořadí
app.get("/api/v1/lines/:id", async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid line ID" });
  }

  try {
    const [lineRows] = await db.execute<RowDataPacket[]>(
      "SELECT id, `number`, name, `type`, color FROM `lines` WHERE id = ?",
      [id]
    );
    if (lineRows.length === 0) {
      return res.status(404).json({ error: "Line not found" });
    }

    const [tripRows] = await db.execute<RowDataPacket[]>(
      "SELECT id, line_id, direction FROM trips WHERE line_id = ? ORDER BY id",
      [id]
    );

    const tripsWithStops = [];
    for (const trip of tripRows) {
      const [stopRows] = await db.execute<RowDataPacket[]>(
        `SELECT s.*, ts.stop_order
         FROM trip_stops ts
         JOIN stops s ON s.id = ts.stop_id
         WHERE ts.trip_id = ?
         ORDER BY ts.stop_order ASC`,
        [trip.id]
      );

      tripsWithStops.push({
        id: Number(trip.id),
        line_id: Number(trip.line_id),
        direction: String(trip.direction),
        stops: stopRows.map((s) => ({
          ...formatStop(s),
          order: Number(s.stop_order),
        })),
      });
    }

    res.status(200).json({
      ...formatLine(lineRows[0]),
      trips: tripsWithStops,
    });
  } catch (error) {
    console.error("Chyba při čtení detailu linky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vytvoření nové linky
app.post("/api/v1/lines", requireAdminAuth, async (req, res) => {
  const data = validateLineInput(req.body);
  if (!data) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO `lines` (`number`, name, `type`, color) VALUES (?, ?, ?, ?)",
      [data.number, data.name, data.type, data.color]
    );

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id, `number`, name, `type`, color FROM `lines` WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(formatLine(rows[0]));
  } catch (error) {
    console.error("Chyba při vytváření linky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Úprava existující linky
app.put("/api/v1/lines/:id", requireAdminAuth, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid line ID" });
  }

  const data = validateLineInput(req.body);
  if (!data) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE `lines` SET `number` = ?, name = ?, `type` = ?, color = ? WHERE id = ?",
      [data.number, data.name, data.type, data.color, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Line not found" });
    }

    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id, `number`, name, `type`, color FROM `lines` WHERE id = ?",
      [id]
    );
    res.status(200).json(formatLine(rows[0]));
  } catch (error) {
    console.error("Chyba při úpravě linky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Smazání linky
app.delete("/api/v1/lines/:id", requireAdminAuth, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: "Invalid line ID" });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM `lines` WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Line not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Chyba při mazání linky:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function start() {
  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, "0.0.0.0", () => {
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

  const [teamRows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM team"
  );
  if (teamRows[0].count === 0) {
    await db.query("INSERT INTO team (team_name, members) VALUES (?, ?)", [
      "oavm warriors",
      "Jindřich Poruba, Vilém Spáčil",
    ]);
    console.log("Výchozí data týmu uložena do databáze.");
  }

  // 2. Tabulka pro zastávky
  await db.query(`
    CREATE TABLE IF NOT EXISTS stops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      stop_lines VARCHAR(20) NOT NULL DEFAULT '',
      is_transfer BOOLEAN NOT NULL DEFAULT FALSE,
      transfer_lines VARCHAR(20) DEFAULT '',
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
  const [stopRows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM stops"
  );
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
      const transfer_lines = (cols[4] ?? "").trim();
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
          id, name, stop_lines, is_transfer, transfer_lines, x, y,
          wheelchair_accessible, has_shelter, has_bench, has_ticket_machine, has_display, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          stopLines,
          isTransfer,
          transfer_lines,
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

  // 4. Tabulka pro linky
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`lines\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`number\` VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      \`type\` VARCHAR(50) NOT NULL,
      color VARCHAR(20) NOT NULL
    )
  `);

  // 5. Tabulka pro směry / jízdy linek
  await db.query(`
    CREATE TABLE IF NOT EXISTS trips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      line_id INT NOT NULL,
      direction ENUM('outbound', 'inbound') NOT NULL,
      CONSTRAINT fk_trips_line
        FOREIGN KEY (line_id) REFERENCES \`lines\`(id)
        ON DELETE CASCADE
    )
  `);

  // 6. Vazební tabulka trasa <-> zastávka + pořadí na trase
  await db.query(`
    CREATE TABLE IF NOT EXISTS trip_stops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      trip_id INT NOT NULL,
      stop_id INT NOT NULL,
      stop_order INT NOT NULL,
      UNIQUE KEY uq_trip_order (trip_id, stop_order),
      CONSTRAINT fk_trip_stops_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_trip_stops_stop
        FOREIGN KEY (stop_id) REFERENCES stops(id)
        ON DELETE CASCADE
    )
  `);

  // 7. Seed sítě z mapy (pokud tabulka lines zatím neobsahuje data)
  const [existingLines] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) as count FROM `lines`"
  );
  if (existingLines[0].count === 0) {
    const [allStops] = await db.query<RowDataPacket[]>(
      "SELECT id, name FROM stops"
    );
    const stopIdByName = new Map<string, number>();
    for (const s of allStops) {
      stopIdByName.set(String(s.name).trim(), Number(s.id));
    }

    const networkSeed = [
      {
        number: "A",
        name: "Green Line",
        type: "metro",
        color: "#16A34A",
        stops: [
          "Turing Terminal",
          "Ada Exchange",
          "Pixel Park",
          "Byte Square",
          "Stack Garden",
        ],
      },
      {
        number: "B",
        name: "Yellow Line",
        type: "metro",
        color: "#EAB308",
        stops: [
          "Hopper Hall",
          "Ada Exchange",
          "Compiler Court",
          "Kernel Hub",
          "Syntax Square",
          "Lambda Lane",
          "Campus Gate",
        ],
      },
      {
        number: "C",
        name: "Red Line",
        type: "metro",
        color: "#EF4444",
        stops: [
          "Edison East",
          "Notebook Quay",
          "Kernel Hub",
          "Library Loop",
          "Byte Square",
          "Quantum Commons",
        ],
      },
    ];

    for (const lineDef of networkSeed) {
      const [lineRes] = await db.execute<ResultSetHeader>(
        "INSERT INTO `lines` (`number`, name, `type`, color) VALUES (?, ?, ?, ?)",
        [lineDef.number, lineDef.name, lineDef.type, lineDef.color]
      );
      const lineId = lineRes.insertId;

      const directions: Array<{
        dir: "outbound" | "inbound";
        orderedStops: string[];
      }> = [
        { dir: "outbound", orderedStops: lineDef.stops },
        { dir: "inbound", orderedStops: [...lineDef.stops].reverse() },
      ];

      for (const { dir, orderedStops } of directions) {
        const [tripRes] = await db.execute<ResultSetHeader>(
          "INSERT INTO trips (line_id, direction) VALUES (?, ?)",
          [lineId, dir]
        );
        const tripId = tripRes.insertId;

        for (let i = 0; i < orderedStops.length; i++) {
          const stopName = orderedStops[i];
          const stopId = stopIdByName.get(stopName);
          if (!stopId) {
            console.warn(
              `Zastávka "${stopName}" nebyla při seedu linek nalezena v tabulce stops.`
            );
            continue;
          }
          await db.execute(
            "INSERT INTO trip_stops (trip_id, stop_id, stop_order) VALUES (?, ?, ?)",
            [tripId, stopId, i + 1]
          );
        }
      }
    }

    console.log(
      "Seed dopravní sítě (linky A, B, C, směry outbound/inbound a zastávky) dokončen."
    );
  }
}

start();