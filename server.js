import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

const entrySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  project: { type: String, default: "General" },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 } // seconds
}, { timestamps: true });
const Entry = mongoose.model("Entry", entrySchema);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/entries", async (_req, res) => {
  try {
    const entries = await Entry.find().sort({ startedAt: -1 }).limit(200);
    res.json(entries);
  } catch { res.status(500).json({ message: "Could not load time entries." }); }
});

app.post("/api/entries", async (req, res) => {
  try {
    const { title, project = "General" } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Task name is required." });
    const running = await Entry.findOne({ endedAt: null });
    if (running) return res.status(409).json({ message: "Stop the running timer before starting another." });
    const entry = await Entry.create({ title: title.trim(), project, startedAt: new Date() });
    res.status(201).json(entry);
  } catch { res.status(500).json({ message: "Could not start timer." }); }
});

app.patch("/api/entries/:id/stop", async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found." });
    if (!entry.endedAt) {
      entry.endedAt = new Date();
      entry.duration = Math.max(0, Math.floor((entry.endedAt - entry.startedAt) / 1000));
      await entry.save();
    }
    res.json(entry);
  } catch { res.status(500).json({ message: "Could not stop timer." }); }
});

app.delete("/api/entries/:id", async (req, res) => {
  try {
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found." });
    res.json({ message: "Entry deleted." });
  } catch { res.status(500).json({ message: "Could not delete entry." }); }
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });