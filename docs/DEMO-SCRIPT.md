# Standard Prospect Demo Script

## Goal

Run a short, repeatable demo that proves the value of Admissions OS without exposing implementation complexity.

The story is intentionally simple:

1. learn the institution,
2. answer a difficult admissions question,
3. process a real-looking enquiry,
4. refuse/escalate when the system should not guess,
5. show the evidence and operational trace.

---

# Demo 1 — Learn the institution

Start with the institution's own website.

Show:

```text
Institution: Example University
Website: https://example.edu
Status: READY
```

Then show the readiness summary:

```text
Programmes: 28
Fees: 19
Intakes: 8
Requirements: 35
Pages indexed: 42
Knowledge chunks: 317
```

## Message to the prospect

The important point is not the crawler itself. The point is that the demo is running on the institution's own data rather than a generic chatbot knowledge base.

---

# Demo 2 — Ask something specific

Example question:

> How much is the Data Science programme, when is the next intake, and what are the entry requirements?

Show the answer first.

Then open the trace and show:

```text
Intent
programme_information

Resolved entity
Data Science

Required facts
- tuition fee
- next intake
- entry requirements

Retrieval
- exact structured matches
- semantic supporting evidence

Decision
reply

Confidence
high
```

Then show the actual source pages used.

## What this proves

- the system understands a multi-part enquiry,
- it retrieves exact operational facts,
- it uses source evidence,
- it does not rely on a generic model answer.

---

# Demo 3 — Process an inbound email

Example:

```text
From: student@example.com
Subject: January Software Engineering intake

Hi,
I want to join Software Engineering in January.
Are applications still open, what do I need, and how do I apply?
```

Run `Process Email`.

Show:

```text
Classification
Admissions enquiry

Topics
- intake
- entry requirements
- application process

Decision
Reply

Draft response
...
```

Then expose:

- knowledge used
- sources
- confidence
- rationale

## What this proves

Admissions OS is not just Q&A. It can sit inside the actual enquiry-handling process.

---

# Demo 4 — Give it a case it should not answer

Example:

> I paid my fees yesterday but the student portal still says unpaid. Can you confirm whether you received the payment?

Expected result:

```text
Classification
Finance / account-specific issue

Knowledge sufficiency
Insufficient for account verification

Decision
Escalate

Reason
Requires finance or student-account system verification
```

The system should not fabricate a payment status.

## What this proves

The value is not only answering quickly. It is also knowing when not to answer.

---

# Demo 5 — Show the operator trace

End with the internal view.

For one of the previous messages, show:

```text
What came in?
        ↓
What did the system understand?
        ↓
What facts did it need?
        ↓
What did it retrieve?
        ↓
Which evidence did it select?
        ↓
What response did it generate?
        ↓
Why did it reply/review/escalate?
```

This is where the Admissions OS differentiates itself from a black-box chatbot.

---

# Suggested demo test pack

Before a prospect session, run at least these scenarios against the selected tenant.

| Scenario | Example | Expected behaviour |
|---|---|---|
| Programme | "Tell me about Software Engineering" | Answer from programme data |
| Fee | "How much does Data Science cost?" | Exact structured lookup |
| Intake | "When is the next intake?" | Exact intake lookup |
| Requirements | "What grades do I need?" | Structured + semantic evidence |
| Multi-part | "Cost, intake and requirements?" | Hybrid answer |
| Ambiguous | "Can I join next month?" | Resolve context or avoid overclaiming |
| Finance | "Did you receive my payment?" | Escalate |
| Status | "Was my application accepted?" | Escalate unless status system connected |
| Not admissions | vendor/job/general spam | Ignore/route away from admissions |
| Unsupported | fact not present in sources | Say evidence is insufficient / review |

---

# Demo operating rules

1. Never rely on an answer that has not been rehearsed against the current tenant data.
2. Prefer live queries from the prospect when practical; the trace should make failures diagnosable.
3. If the system lacks evidence, show the escalation as a feature rather than forcing an answer.
4. Keep the demo focused on admissions operations, not infrastructure.
5. Do not open n8n or Supabase during the main sales narrative unless technical stakeholders specifically want to inspect them.
6. The operator console should be enough to run the full demo.
7. Reset the demo state before important prospect sessions.

---

# The one-line story

> **Admissions OS learns your institution, handles student enquiries using your real admissions data, and knows when a human needs to step in.**

The demo should make that statement visible rather than merely describing it.
