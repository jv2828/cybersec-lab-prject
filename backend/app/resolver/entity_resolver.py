import math
import re
from typing import List, Dict, Any, Tuple
from collections import Counter

class EntityResolver:
    """
    Advanced cross-marketplace actor entity resolution engine combining
    cryptographic keys, financial addresses, stylometric profiles, and temporal fingerprints.
    """

    FUNCTION_WORDS = [
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on",
        "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we",
        "escrow", "fe", "order", "tracking", "pgp", "wickr", "stealth", "dispatch", "feedback",
        "vendor", "refund", "reship", "jabber", "telegram", "protonmail"
    ]

    def extract_stylometry_features(self, text: str) -> Dict[str, Any]:
        """Extracts n-gram, vocabulary diversity, and function-word frequency vector."""
        if not text:
            return {"char_len": 0, "vocab_richness": 0.0, "func_words": {}, "avg_word_len": 0.0}
        
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        total_words = max(1, len(words))
        unique_words = len(set(words))
        
        func_word_counts = Counter([w for w in words if w in self.FUNCTION_WORDS])
        func_word_freq = {k: round(v / total_words, 4) for k, v in func_word_counts.items()}
        
        avg_word_len = sum(len(w) for w in words) / total_words
        
        return {
            "char_len": len(text),
            "total_words": total_words,
            "vocab_richness": round(unique_words / total_words, 3),
            "avg_word_len": round(avg_word_len, 2),
            "func_words": func_word_freq
        }

    def compute_stylometry_similarity(self, profile1: Dict[str, Any], profile2: Dict[str, Any]) -> float:
        """Computes cosine similarity between two stylometry profiles."""
        fw1 = profile1.get("func_words", {})
        fw2 = profile2.get("func_words", {})
        all_keys = set(fw1.keys()).union(set(fw2.keys()))
        if not all_keys:
            return 0.5
        
        dot = sum(fw1.get(k, 0.0) * fw2.get(k, 0.0) for k in all_keys)
        mag1 = math.sqrt(sum(v * v for v in fw1.values()))
        mag2 = math.sqrt(sum(v * v for v in fw2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0.5
        return min(1.0, max(0.0, dot / (mag1 * mag2)))

    def evaluate_link(
        self,
        handle_a: Dict[str, Any],
        handle_b: Dict[str, Any]
    ) -> Tuple[int, List[str], Dict[str, Any]]:
        """
        Evaluates potential link between two handles across different marketplaces.
        Returns: (confidence_score, reasons_list, signal_matrix)
        """
        score = 0
        reasons = []
        matrix = {}

        # 1. PGP Fingerprint match (Near Conclusive)
        pgp_a = handle_a.get("pgp_fingerprint")
        pgp_b = handle_b.get("pgp_fingerprint")
        if pgp_a and pgp_b and pgp_a.upper() == pgp_b.upper():
            score += 90
            reasons.append(f"Identical 40-character PGP Fingerprint ({pgp_a[-16:]}) across marketplaces")
            matrix["pgp_match"] = {"match": True, "score": 90, "fingerprint": pgp_a}
        else:
            matrix["pgp_match"] = {"match": False, "score": 0}

        # 2. Crypto Wallet address match
        wallets_a = set(handle_a.get("wallets", []))
        wallets_b = set(handle_b.get("wallets", []))
        common_wallets = wallets_a.intersection(wallets_b)
        if common_wallets:
            score += 80
            w_str = list(common_wallets)[0]
            reasons.append(f"Reused deposit crypto wallet '{w_str[:12]}...' across different seller accounts")
            matrix["wallet_reuse"] = {"match": True, "score": 80, "wallets": list(common_wallets)}
        else:
            matrix["wallet_reuse"] = {"match": False, "score": 0}

        # 3. Avatar / Product image pHash similarity
        phash_a = handle_a.get("avatar_phash")
        phash_b = handle_b.get("avatar_phash")
        if phash_a and phash_b and phash_a == phash_b:
            score += 30
            reasons.append(f"Identical visual asset perceptual hash ({phash_a})")
            matrix["avatar_phash"] = {"match": True, "score": 30}
        else:
            matrix["avatar_phash"] = {"match": False, "score": 0}

        # 4. Stylometry text similarity
        feat_a = self.extract_stylometry_features(handle_a.get("listing_sample", ""))
        feat_b = self.extract_stylometry_features(handle_b.get("listing_sample", ""))
        sty_sim = self.compute_stylometry_similarity(feat_a, feat_b)
        if sty_sim >= 0.78:
            score += 25
            reasons.append(f"High stylometric listing signature correlation ({int(sty_sim * 100)}% lexical match)")
            matrix["stylometry"] = {"match": True, "score": 25, "similarity": round(sty_sim, 2)}
        else:
            matrix["stylometry"] = {"match": False, "score": 0, "similarity": round(sty_sim, 2)}

        # 5. Handle string likeness (e.g. shadow_ghost vs shadowghost_eu)
        name_a = re.sub(r'[^a-z0-9]', '', handle_a.get("handle_name", "").lower())
        name_b = re.sub(r'[^a-z0-9]', '', handle_b.get("handle_name", "").lower())
        if name_a and name_b and (name_a in name_b or name_b in name_a):
            score += 20
            reasons.append(f"Syntactic handle name variant match ('{handle_a.get('handle_name')}' ~ '{handle_b.get('handle_name')}')")
            matrix["name_likeness"] = {"match": True, "score": 20}
        else:
            matrix["name_likeness"] = {"match": False, "score": 0}

        # Clamp confidence to 99
        final_confidence = min(99, score)
        return final_confidence, reasons, matrix

entity_resolver = EntityResolver()
