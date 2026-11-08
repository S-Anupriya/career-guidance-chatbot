import json
import re
from pathlib import Path
from typing import Dict, Any, List

DATA_PATH = Path(__file__).parent / "data" / "india_career_knowledge.json"

_KNOWLEDGE_BASE: Dict[str, Any] = {}

def load_knowledge_base() -> Dict[str, Any]:
    global _KNOWLEDGE_BASE
    if not _KNOWLEDGE_BASE and DATA_PATH.exists():
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _KNOWLEDGE_BASE = json.load(f)
    return _KNOWLEDGE_BASE

def retrieve_career_context(query: str) -> str:
    """
    Retrieves authentic, verified Indian career intelligence matching the query.
    Extracts relevant domains and presents them compactly to the LLM.
    """
    kb = load_knowledge_base()
    if not kb or "domains" not in kb:
        return ""

    query_lower = query.lower()
    matched_domains = []

    for domain_key, domain_data in kb["domains"].items():
        keywords = domain_data.get("keywords", [])
        score = 0
        for kw in keywords:
            if kw in query_lower:
                score += 2 if len(kw) > 3 else 1
        
        # Domain specific boosts
        if "bca" in query_lower and domain_key == "bca_computer_applications":
            score += 5
        if ("tech" in query_lower or "software" in query_lower or "b.tech" in query_lower or "developer" in query_lower) and domain_key == "btech_engineering":
            score += 4
        if ("ca" in query_lower or "mba" in query_lower or "cat" in query_lower or "commerce" in query_lower) and domain_key == "commerce_finance":
            score += 4
        if ("govt" in query_lower or "ssc" in query_lower or "bank" in query_lower or "upsc" in query_lower or "cgl" in query_lower) and domain_key == "government_civil_services":
            score += 4
        if ("design" in query_lower or "ui" in query_lower or "ux" in query_lower) and domain_key == "design_creative":
            score += 4

        if score > 0:
            matched_domains.append((score, domain_data))

    if not matched_domains:
        # Default fallback: supply tech and general benchmarks
        matched_domains = [
            (2, kb["domains"].get("bca_computer_applications", {})),
            (1, kb["domains"].get("btech_engineering", {}))
        ]

    matched_domains.sort(key=lambda x: x[0], reverse=True)

    context_snippets = []
    for _, domain in matched_domains[:3]:
        title = domain.get("title", "")
        summary = domain.get("summary", "")
        paths_text = []

        if "paths" in domain:
            for p in domain["paths"]:
                name = p.get("name", "")
                salary = p.get("salary_fresher_inr") or p.get("fresher_ctc_inr") or p.get("ctc_inr") or ""
                reality = p.get("market_reality") or p.get("why_it_matters") or p.get("market_spread") or ""
                skills = ", ".join(p.get("required_skills", []))
                skill_str = f" Skills: {skills}." if skills else ""
                paths_text.append(f"  • {name} | Verified Fresher CTC: {salary}. Key Insights: {reality}{skill_str}")

        if "tiers" in domain:
            for t in domain["tiers"]:
                tier_name = t.get("tier", "")
                ctc = t.get("ctc_inr", "")
                recs = ", ".join(t.get("recruiters", []))
                paths_text.append(f"  • {tier_name} | CTC Range: {ctc}. Major Recruiters: {recs}")

        if "options" in domain:
            for opt in domain["options"]:
                name = opt.get("name", "")
                perks = opt.get("perks") or opt.get("culture") or ""
                in_hand = opt.get("starting_in_hand") or opt.get("pay_scales", {})
                paths_text.append(f"  • {name} | Compensation: {in_hand}. In-depth Notes: {perks}")

        block = f"### Verified Indian Knowledge: {title}\nSummary: {summary}\nKey Benchmarks:\n" + "\n".join(paths_text)
        context_snippets.append(block)

    if not context_snippets:
        return ""

    return (
        "\n[VERIFIED INDIAN CAREER INTELLIGENCE - 2025/2026 OFFICIAL BENCHMARKS]\n"
        + "\n\n".join(context_snippets)
        + "\n[END VERIFIED CONTEXT]\n"
    )

def clean_model_output(text: str) -> str:
    """
    Strips internal thinking blocks, thinking headers, emojis, and normalizes LaTeX arrows.
    """
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text)
    cleaned = re.sub(r"\[THINK\][\s\S]*?\[/THINK\]", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^(?:Here'?s a thinking process|Thinking Process):?[\s\S]*?(?=\n\n|\n#|\n\*\*|\n1\.)", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf]', '', cleaned)
    cleaned = (
        cleaned.replace("$\\rightarrow$", "→")
        .replace("\\rightarrow", "→")
        .replace("$\\leftarrow$", "←")
        .replace("\\leftarrow", "←")
    )
    return cleaned.strip()
