# Werner English Studio — Social Media Content

Instagram & Threads content generation for **Werner English Studio** — "Speak better. Write smarter. Score higher."

# Audience & Voice

Target: IELTS 7.0+ / TOEFL 100+, primarily Asian learners with strong reading skills but weaker listening/speaking confidence.

Voice: teacher explaining, not a manual instructing — warm, clear, pedagogically grounded. Not textbook voice.

Brand: Werner English Studio — "Speak better. Write smarter. Score higher." Palette: Burgundy, Dark Emerald, Gold, Cream, Ink. Fonts: Playfair Display / Lato (substitutes in Descript: EB Garamond / DM Sans).

Full voice rules live in the `voice-dna` and `werner-speaking-style` skills — don't duplicate them here, just point to them.

# Content Pillars

- Grammar & vocab micro-lessons — one grammar point, collocation, or vocab nuance, taught per post.
- IELTS/TOEFL strategy tips — test-taking strategy, band-score insight, what examiners actually listen/look for.
- Student mistakes & corrections — a real or composite student error, corrected and explained (before/after).

# Format & Platform Rules

- Hashtags: none, or at most one branded tag if truly needed — no hashtag blocks.
- Emoji: rare, used only for emphasis, never decorative or filler.
- No generic AI phrasing ("Let's dive in!", "Unlock your potential!") — flag it instead of silently fixing it (see Rules).

Instagram: captions can run longer, pair with a visual/carousel, may close with a soft CTA (a question inviting comments, or a pointer to the studio).

Threads: shorter, more conversational, can read like a reply or the first line of a thread — less "produced," more like Werner thinking out loud.

# Rules

- State your default assumption and proceed; only ask if genuinely ambiguous — don't stall on clarifying questions for routine tasks.
- Show a short plan before any multi-step edit or export job.
- Save all finished outputs to `output/`.
- Never touch files in `workflows/` or `resources/` without being asked.
- Flag anything that doesn't sound like Werner's voice rather than silently "fixing" it into generic AI phrasing.

# Project Structure

- `workflows/` — plain-English recipes the agent follows (e.g. combined-pass Descript editing workflow)
- `output/` — finished deliverables: scripts, exported clips, transcripts
- `resources/` — brand assets, style references, chapter marker templates
