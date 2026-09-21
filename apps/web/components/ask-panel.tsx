"use client";

import { useState } from "react";
import { ArrowUp, Search, Sparkles } from "lucide-react";

const prompts = [
  "What are the entry requirements for the Bachelor of Commerce?",
  "When is the next intake?",
  "What scholarships are currently available?",
  "How do I apply?",
];

export function AskPanel({ institutionName }: { institutionName: string }) {
  const [question, setQuestion] = useState("");

  return (
    <div className="ask-layout">
      <section className="ask-hero">
        <div className="ai-orb"><Sparkles size={22} /></div>
        <span className="eyebrow">Admissions AI playground</span>
        <h1>Ask {institutionName}</h1>
        <p>
          Test the same questions a prospective student would ask. Answers will use
          only approved institution knowledge once embeddings are enabled.
        </p>

        <div className="prompt-grid">
          {prompts.map((prompt) => (
            <button key={prompt} onClick={() => setQuestion(prompt)}>{prompt}</button>
          ))}
        </div>
      </section>

      <section className="composer-card">
        <div className="composer">
          <Search size={18} />
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about programmes, fees, intakes, requirements..."
            rows={3}
          />
          <button aria-label="Ask Admissions AI" disabled title="Enable after embedding workflow is connected">
            <ArrowUp size={18} />
          </button>
        </div>
        <div className="composer-footer">
          <span><span className="status-dot amber" /> Retrieval waiting for embeddings</span>
          <span>Grounded answers only</span>
        </div>
      </section>
    </div>
  );
}
