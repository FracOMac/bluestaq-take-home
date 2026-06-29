import { createApp } from "./app.js";
import { createDb } from "./db/index.js";

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || "team-notes.sqlite";

const app = createApp(createDb(DB_PATH));
app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
