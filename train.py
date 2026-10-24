"""Train the ScamSense text classifier and export it to src/model.json.

Run:  python train.py

What it does:
1. Downloads the UCI SMS Spam Collection (CC BY 4.0) into data/raw/ if it is not there yet.
2. Adds the hand-written synthetic examples from data/synthetic.tsv.
3. Splits each source 70 / 10 / 20 into train / validation / test (stratified, seed 42).
4. Fits TF-IDF (word 1-2 grams + character 2-4 grams) and logistic regression on train only.
   The regularisation strength C is chosen on the validation split.
5. Reports accuracy, precision and recall on the untouched test split, per source.
6. Writes the vocabulary, IDF weights and coefficients to src/model.json, which the app runs in
   plain JavaScript. The text preprocessing below is mirrored exactly in src/engine.ts.

The split files in data/split/ are git-ignored. `npm run eval` uses them to measure the full app
(rules + model) on the same test messages.
"""

import csv
import io
import json
import math
import re
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).parent
RAW = ROOT / "data" / "raw"
SPLIT = ROOT / "data" / "split"
OUT = ROOT / "src" / "model.json"
UCI_URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
SEED = 42

# ---------------------------------------------------------------- preprocessing (mirrored in JS)

DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
TLDS = "com|in|net|org|co|info|xyz|top|club|online|site|me|ly|gl|io|vip|link|click|live|shop|ws|tk|ml|ga|cf|gq|icu|buzz|cfd|sbs|biz|cc|uk|gov|app|store|win|loan"
URL_RE = re.compile(
    r"(?:https?://|www\.)[^\s]+"
    r"|(?<![a-z0-9.@-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:" + TLDS + r")(?![a-z0-9])(?:/[^\s]*)?"
)
PHONE_RE = re.compile(r"(?<![0-9])\+?[0-9](?:[ -]?[0-9]){9,12}(?![0-9])")
MONEY_RE = re.compile(r"(?:₹|rs\.?|inr|£|\$|€) ?[0-9][0-9,.]*")
NUM_RE = re.compile(r"[0-9]+(?:[.,:][0-9]+)*")


def normalize(text: str) -> str:
    t = text.lower().translate(DEV_DIGITS)
    t = URL_RE.sub(" xurlx ", t)
    t = PHONE_RE.sub(" xphonex ", t)
    t = MONEY_RE.sub(" xmoneyx ", t)
    t = NUM_RE.sub(" xnumx ", t)
    return t


def is_word_char(ch: str) -> bool:
    # Letters, combining marks (Devanagari vowel signs) and digits.
    return unicodedata.category(ch)[0] in "LMN"


def tokens(t: str) -> list[str]:
    out, cur = [], []
    for ch in t:
        if is_word_char(ch):
            cur.append(ch)
        elif cur:
            out.append("".join(cur))
            cur = []
    if cur:
        out.append("".join(cur))
    return out


def word_features(text: str) -> list[str]:
    toks = [w for w in tokens(normalize(text)) if len(w) >= 2]
    return toks + [a + " " + b for a, b in zip(toks, toks[1:])]


def char_features(text: str) -> list[str]:
    feats = []
    for w in tokens(normalize(text)):
        w = " " + w + " "
        for n in (2, 3, 4):
            for i in range(0, max(1, len(w) - n + 1)):
                g = w[i : i + n]
                if len(g) == n:
                    feats.append(g)
    return feats


# ---------------------------------------------------------------- data


def load_uci() -> list[tuple[str, int, str]]:
    path = RAW / "SMSSpamCollection"
    if not path.exists():
        RAW.mkdir(parents=True, exist_ok=True)
        print("Downloading UCI SMS Spam Collection ...")
        data = urllib.request.urlopen(UCI_URL, timeout=60).read()
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            path.write_bytes(z.read("SMSSpamCollection"))
    rows, seen = [], set()
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if "\t" in line:
            label, text = line.split("\t", 1)
            key = " ".join(text.lower().split())
            if key in seen:  # the collection has ~400 exact repeats; keep one so test never overlaps train
                continue
            seen.add(key)
            rows.append((text, 1 if label == "spam" else 0, "uci"))
    return rows


def load_synthetic() -> list[tuple[str, int, str]]:
    with open(ROOT / "data" / "synthetic.tsv", encoding="utf-8", newline="") as f:
        return [(r["text"], 1 if r["label"] == "scam" else 0, "synthetic") for r in csv.DictReader(f, delimiter="\t")]


def split(rows):
    y = [r[1] for r in rows]
    train, rest = train_test_split(rows, test_size=0.30, stratify=y, random_state=SEED)
    val, test = train_test_split(rest, test_size=2 / 3, stratify=[r[1] for r in rest], random_state=SEED)
    return train, val, test


# ---------------------------------------------------------------- training


def vectorizers():
    common = dict(lowercase=False, sublinear_tf=True, min_df=2)
    return (
        TfidfVectorizer(analyzer=word_features, max_features=4000, **common),
        TfidfVectorizer(analyzer=char_features, max_features=9000, **common),
    )


def metrics(y_true, y_pred) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "n": len(y_true),
        "positives": int(sum(y_true)),
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "precision": round(precision_score(y_true, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_true, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_true, y_pred, zero_division=0), 4),
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def main():
    uci, syn = load_uci(), load_synthetic()
    print(f"UCI: {len(uci)} messages ({sum(r[1] for r in uci)} spam). Synthetic: {len(syn)} ({sum(r[1] for r in syn)} scam).")
    parts = {name: split(rows) for name, rows in (("uci", uci), ("synthetic", syn))}
    train = parts["uci"][0] + parts["synthetic"][0]
    val = parts["uci"][1] + parts["synthetic"][1]

    wv, cv = vectorizers()
    x_train = hstack([wv.fit_transform([r[0] for r in train]), cv.fit_transform([r[0] for r in train])]).tocsr()
    y_train = np.array([r[1] for r in train])

    def featurize(rows):
        texts = [r[0] for r in rows]
        return hstack([wv.transform(texts), cv.transform(texts)]).tocsr()

    best = None
    for c in (1.0, 3.0, 10.0, 30.0):
        clf = LogisticRegression(C=c, class_weight="balanced", max_iter=5000).fit(x_train, y_train)
        f1 = f1_score([r[1] for r in val], clf.predict(featurize(val)))
        print(f"  C={c:<5} validation F1={f1:.4f}")
        if best is None or f1 > best[0]:
            best = (f1, c, clf)
    _, c, clf = best
    print(f"Chosen C={c}")

    results = {}
    SPLIT.mkdir(parents=True, exist_ok=True)
    for name, (_, val_rows, test_rows) in parts.items():
        for split_name, rows in (("val", val_rows), ("test", test_rows)):
            probs = clf.predict_proba(featurize(rows))[:, 1]
            if split_name == "test":
                results[name] = metrics([r[1] for r in rows], (probs >= 0.5).astype(int))
            with open(SPLIT / f"{split_name}.jsonl", "a" if name != "uci" else "w", encoding="utf-8") as f:
                for r, p in zip(rows, probs):
                    f.write(json.dumps({"text": r[0], "label": r[1], "source": name, "p": round(float(p), 5)}, ensure_ascii=False) + "\n")

    print("\nModel only, held-out test split, threshold 0.5:")
    for name, m in results.items():
        print(f"  {name:<10} n={m['n']:<5} spam/scam={m['positives']:<4} accuracy={m['accuracy']:.3f} "
              f"precision={m['precision']:.3f} recall={m['recall']:.3f} f1={m['f1']:.3f} {m['confusion']}")

    # Export. Each vectorizer's terms keep their IDF; the coefficient vector is split to match.
    coef = clf.coef_[0]
    n_word = len(wv.vocabulary_)

    def pack(vec, offset):
        terms = sorted(vec.vocabulary_, key=vec.vocabulary_.get)
        return {
            "terms": terms,
            "idf": [round(float(v), 4) for v in vec.idf_],
            "coef": [round(float(coef[offset + i]), 4) for i in range(len(terms))],
        }

    model = {
        "version": 1,
        "about": "TF-IDF (word 1-2 grams + char 2-4 grams, sublinear tf, L2 per block) + logistic regression",
        "trained_on": f"{len(train)} messages: UCI SMS Spam Collection train split + synthetic train split",
        "C": c,
        "test_metrics": results,
        "word": pack(wv, 0),
        "char": pack(cv, n_word),
        "bias": round(float(clf.intercept_[0]), 4),
    }
    OUT.write_text(json.dumps(model, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB, {n_word} word + {len(cv.vocabulary_)} char features)")


if __name__ == "__main__":
    main()
