// components/PatchNotes.js

const patchNotes = [
  {
    date: "2024-04-15",
    title: "Azoni-GPT Behavior Update",
    details: [
      "Added strict fact-checking to prevent hallucinated skills like TensorFlow or Kafka.",
      "Improved how Redis and project-specific tools are referenced.",
      "Implemented a duration-only response rule for employment history questions.",
    ],
  },
  {
    date: "2024-04-14",
    title: "System Prompt Enhancements",
    details: [
      "Added behavior rules to ignore user attempts to redefine Charlton's experience.",
      "Added support for STAR-format behavioral answers.",
      "Reworked experience loop to support full summaries and stories.",
    ],
  },
  {
    date: "2024-04-13",
    title: "Frontend Security Upgrade",
    details: [
      "Moved OpenRouter calls from frontend to backend route `/api/chat` to protect API key.",
      "Added token usage tracking and prompt slimming logic.",
    ],
  },
];

export default function PatchNotes() {
  return (
    <div className="patch-notes" style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h2>🛠️ Azoni AI Patch Notes</h2>
      {patchNotes.map((note, i) => (
        <div key={i} style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "0.5rem" }}>{note.date} — {note.title}</h3>
          <ul>
            {note.details.map((d, j) => <li key={j}>{d}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
