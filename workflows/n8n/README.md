# Core n8n workflow snapshots

Exported from the saved workflow definitions on **2026-09-10**. Both source workflows were active, and their saved nodes and connections matched their active versions when read.

| Workflow file | Role |
| --- | --- |
| [admissions-os.json](admissions-os.json) | Admissions OS: Gmail intake, classification, admissions response, reply and review logging; 25 nodes |
| [retrieval.json](retrieval.json) | read the embeddings data: tenant-scoped semantic retrieval called by the admissions agent; 6 nodes |

[manifest.json](manifest.json) records source IDs, versions, timestamps, credential types by node and export transformations.

## Current behaviour

### Admissions OS

1. Poll Gmail every minute, loop through messages and fetch full message data.
2. Set RCM tenant, institution, query, thread and sender fields. Write incoming email details to the onboarding sheet's **Email Log**.
3. Classify the email using the embedded 12-topic taxonomy and structured output parser.
4. Check `is_admissions_related`: false ends at a no-operation node; true proceeds to `create response`.
5. Generate an answer with the OpenRouter chat model configured as `minimax/minimax-m2`, calling `retrieve data` for knowledge. The tool references the retrieval workflow below.
6. Parse `answered`, `answer`, `reasoning`, `confidence` and `evidence_used`.
7. If `answered=false`, write to **Human Review Queue** and update **Email Log** as requiring review. Otherwise, convert Markdown to HTML, reply through Gmail, log the response and mark the message read.

The classifier model node has no explicit model parameter in this snapshot; verify its selection in the target instance.

### Retrieval

Declared sub-workflow inputs:

```json
{
  "query": "CPA current tuition fee",
  "tenant_id": "rcm-online-college",
  "institution_name": "rcm-online-college"
}
```

`tenant_id` is passed to the SQL `institution_id` filter; this snapshot uses the RCM slug, not the UUID placeholder in the proposed contracts.

The connected path sets input fields, calls OpenRouter embeddings with `openai/text-embedding-3-small` and 1,536 dimensions, runs PostgreSQL cosine-distance search over `demo_chunk_staging`, then aggregates matching rows. SQL returns up to five rows containing `id`, `institution_id`, `category`, `content`, `metadata` and `score`. The Aggregate node is configured to collect all item data, giving a `data` array for returned rows; no-match behaviour has not been executed here.

The `institution_name` input is carried into the field-setting node but does not filter the SQL query.

## Import and setup

1. Import **retrieval.json** first into n8n. Bind its OpenRouter and PostgreSQL credentials.
2. Ensure PostgreSQL has pgvector and populated `demo_chunk_staging` rows with the required columns and compatible 1,536-dimensional embeddings. See [chunk staging SQL](../../sql/004_demo_chunk_staging.sql) and [retrieval SQL](../../sql/005_demo_chunk_retrieval.sql).
3. Import **admissions-os.json**. Bind Gmail, Google Sheets, OpenRouter and PostgreSQL credentials according to the manifest. PostgreSQL chat memory is present but disconnected.
4. In `retrieve data`, select the newly imported retrieval workflow. The snapshot retains the original workflow reference for traceability; remap it to the target instance.
5. Configure the `rcm-online-college` node for the desired institution, preserving references to its node name. Repoint all four Google Sheets nodes to the intended onboarding workbook and the **Email Log** / **Human Review Queue** tabs, refreshing their column mappings as needed. RCM's existing workbook and tab references are retained in this private repository snapshot.
6. Replace the embeddings HTTP-Referer placeholder if needed. Both source workflows used error workflow `wgIupwopCVUf5TLs`; that external workflow is not included. Configure the target error workflow separately.
7. Validate using a controlled demo mailbox and test institution before activating the imported main workflow. Its reply branch sends email.

Exports have `active=false`. Node credential bindings, webhook IDs, source workflow identity/version fields, MCP visibility and the error-workflow setting are excluded from import JSON. Source provenance is retained in the manifest. No pinned email data or execution history is included. Prompts, node parameters, node names, positions and connections otherwise preserve the saved definitions.

## Observed gaps in this baseline

These are observations from the exported graph, not changes made to the live system.

- **Routing:** the classifier produces `processing_route` (`main_agent`, `ticket_system`, `ignore`, `human_review`), but the connected IF node only checks `is_admissions_related`. Person-specific admissions cases can therefore still reach the main agent.
- **Classification logging:** the four Sheets nodes do not currently map the classifier's topic, route or confidence fields into the Email Log.
- **Ticket handoff:** the review queue writes `Routed_to_ticketing` and `ticket_escalated=pending`, but this graph contains no ticket-creation node.
- **Response contract:** the prompt discusses partial answers, no-reply status, escalation items and human-review flags, while the parser and reply gate expose only the simpler boolean `answered` contract.
- **Memory and context:** `Postgres Chat Memory` is not attached to the agent. Retrieval's `Prepare Context` node is disconnected; the connected return path ends at Aggregate.
- **Retrieval:** the current SQL performs semantic top-five search only. It does not implement the proposed structured lookup, similarity cutoff, evidence-sufficiency flag or explicit readiness/review filter.
- **Configuration:** RCM tenant/workbook values are fixed in the source graph. Reply and mark-as-read nodes use `.first()` for message IDs; multi-message batch behaviour needs verification.

## Validation

Both JSON snapshots parse successfully, retain the source node counts and connections, and have valid connection endpoint names. Export checks confirmed removed credential bindings, empty pinned data and inactive import state. No workflow was imported, executed or activated during this repository update; runtime behaviour and integration setup remain untested here.

For the wider intended contracts, see [N8N-WORKFLOWS.md](../../docs/N8N-WORKFLOWS.md).
