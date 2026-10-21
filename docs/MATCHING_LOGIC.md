# Custom Matching Logic

## AI integration

AI is used in three places, always as an *enhancer* and never as a dependency:

1. **Explained ranking.** After the algorithm ranks the pool, the top 10 candidates (with their per-factor scores) go to OpenAI in one batched call. The model returns a headline, a grounded rationale, conversation starters and an honest "watch-out" for each. These show up on the match card as "✨ AI insight".
2. **Bounded soft re-ranking.** The LLM also reads the free-text bio and may nudge a score by at most ±8 points for signals the rules can't see (ambition, lifestyle tone, interests). It can reorder close candidates but can never rescue a deal-breaker, since blocked profiles never reach it.
3. **Personalised intro emails.** When the matchmaker clicks *Send Match*, the model drafts a short warm email that cites two genuine reasons for the match. The matchmaker can edit it before sending.

Safeguards: bios are treated as untrusted data (flattened, truncated, and the system prompt forbids following instructions inside them); responses are validated with a schema (zod) and unknown profile ids are discarded; results are cached for 10 minutes; calls time out after 15 s. With no API key, or on any failure, the app falls back to deterministic rule-based explanations and a template email. The UI loads rule-based results instantly and swaps in the AI version when it arrives.

## Algorithm design

Matching is a three-stage funnel. **(1) Retrieval:** an indexed Mongo query keeps only opposite-gender, active, marital-status-compatible profiles inside the customer's age and religion preferences. **(2) Scoring:** 13 factors (age, income, height, views on kids, religion, community, location, relocation, language, education, lifestyle, family values, profession) each return a 0–1 score with a human-readable note. The weights depend on the customer's gender. **(3) Explanation and re-rank:** the top N get AI insight.

*Male customers* follow the brief: the partner should be younger (2–5 years ideal), earn less, be shorter, and agree on children. Age, income and height carry about 29% of the weight. Each broken rule (for example "she is taller") also costs 8 points, capped at 30. *Female customers* use a different weight profile with less on age, income and height and more on **profession compatibility** (same or complementary fields, like tech and finance), **family values and family type**, **relocation fit** and religion. Her preferences are softer: a slightly older and taller partner scores best, and financial stability matters more than "who earns more". Some conditions are **deal-breakers** that remove the candidate entirely: opposite views on having children (yes vs no), strict religion or community preferences, an age range the customer set, and neither side willing to relocate across countries. Previously-married customers can match never-married, divorced and widowed profiles. Never-married customers match only never-married profiles. Customers awaiting a divorce are paused.

Scores are 0–100 with four tiers (High Potential ≥78, Good ≥62, Worth Exploring ≥45). Missing data is never guessed: unknown factors are skipped and the remaining weights renormalised. The score is then shrunk toward 50 in proportion to the missing weight, and the card shows a "Limited data" tag. Scoring is O(n) over pre-filtered candidates plus a sort. Retrieval is index-backed and the LLM only sees ten profiles, so cost stays flat as the pool grows. The scoring factors are pure functions and the weights are config, so they can be tuned or learned from outcomes later.

## Assumptions

- Income is annual INR in lakhs (LPA) and height is in cm. Age is derived from date of birth.
- "Matching views on kids" means yes/no conflicts are deal-breakers. "Maybe" is compatible with everything at a reduced score.
- The male-customer rules (younger, lower income, shorter) are **strong preferences, not absolutes**, so a near-miss on one rule is penalised, not excluded. Only the explicit preferences stored on the customer (age range, strict religion/community) are hard filters.
- Caste or community only matters within the same religion, so it isn't compared across religions.
- Pool profiles are synthetic (240: 120 men and 120 women) and use realistic distributions. A matched profile's contact details and exact DOB are never exposed, and emails contain only basic profile info.
- Sending a match is "mock email": the full email is stored and shown in the *Sent* tab, and each customer/profile pair can be sent only once.
- Factor weights are expert-set heuristics, not learned. With real outcome data (accepted intros, conversations, engagements) they should be fitted, for example by logistic regression.
