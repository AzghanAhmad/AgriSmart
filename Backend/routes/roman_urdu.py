"""
Roman Urdu helpers for STT: detect Urdu script and transliterate to Latin letters.

Extensible via PHRASE_MAP / WORD_MAP; unknown characters use URDU_CHAR_MAP.
No external paid APIs.
"""

from __future__ import annotations

import os
import re

# Env FORCE_ROMAN_URDU=0|false disables Roman Urdu post-processing (Whisper prompt still optional).
FORCE_ROMAN_URDU: bool = os.getenv('FORCE_ROMAN_URDU', 'true').strip().lower() in (
    '1',
    'true',
    'yes',
    'on',
)

URDU_SCRIPT_RE = re.compile(r'[\u0600-\u06FF]')


def contains_urdu(text: str) -> bool:
    """True if text has any character in the Arabic script block used for Urdu."""
    if not text:
        return False
    return URDU_SCRIPT_RE.search(text) is not None


# Longer phrases first (applied before word-level lookup).
PHRASE_MAP: dict[str, str] = {
    'مجھے گندم کے بارے میں بتائیں': 'mujhe gandum k bary ma btay',
    'گندم کے بارے میں': 'gandum k bary ma',
    'کے بارے میں': 'k bary ma',
    'بارے میں': 'bary ma',
    'بتائیں': 'btay',
}

# Common words (extend as needed).
WORD_MAP: dict[str, str] = {
    'مجھے': 'mujhe',
    'گندم': 'gandum',
    'کے': 'k',
    'بارے': 'bary',
    'میں': 'mein',
    'بتائیں': 'btay',
    'کیا': 'kya',
    'ہے': 'hai',
    'کو': 'ko',
    'سے': 'se',
    'پر': 'par',
    'اور': 'aur',
    'کا': 'ka',
    'کی': 'ki',
    'یہ': 'yeh',
    'وہ': 'woh',
    'نہیں': 'nahin',
    'ہاں': 'haan',
    'شکریہ': 'shukriya',
    'مدد': 'madad',
    'فصل': 'fasal',
    'کھیت': 'khet',
    'پانی': 'pani',
    'خاک': 'khak',
    'زمین': 'zameen',
    'بیماری': 'bemari',
    'کیڑے': 'keeray',
    'کھاد': 'khad',
    'بیج': 'beej',
    'وقت': 'waqt',
    'موسم': 'mausam',
    'بارش': 'barish',
    'دن': 'din',
    'رات': 'raat',
    'سوال': 'sawal',
    'جواب': 'jawab',
    'بتاؤ': 'btao',
    'کریں': 'karein',
    'کر': 'kar',
    'دیں': 'dein',
    'لگائیں': 'lagayein',
    'چاہیے': 'chahiye',
    'ضرورت': 'zaroorat',
    'علاج': 'ilaj',
    'روک': 'rok',
    'تھام': 'tham',
    'بچاؤ': 'bachao',
}

# Approximate Urdu / Arabic-script letters → Latin (fallback for unmapped words).
URDU_CHAR_MAP: dict[str, str] = {
    '\u060c': ', ',  # Arabic comma
    '\u061b': '; ',
    '\u061f': '? ',
    '\u0640': '',  # tatweel
    '\u064b': 'an',
    '\u064c': 'un',
    '\u064d': 'in',
    '\u064e': 'a',
    '\u064f': 'u',
    '\u0650': 'i',
    '\u0651': '',  # shadda (simplified)
    '\u0652': '',
    '\u0654': "'",
    '\u0655': "'",
    '\u0670': 'a',
    '\u0621': "'",
    '\u0622': 'aa',
    '\u0623': 'a',
    '\u0624': 'o',
    '\u0625': 'i',
    '\u0626': 'y',
    '\u0627': 'a',
    '\u0628': 'b',
    '\u0629': 'h',
    '\u062a': 't',
    '\u062b': 's',
    '\u062c': 'j',
    '\u062d': 'h',
    '\u062e': 'kh',
    '\u062f': 'd',
    '\u0630': 'z',
    '\u0631': 'r',
    '\u0632': 'z',
    '\u0633': 's',
    '\u0634': 'sh',
    '\u0635': 's',
    '\u0636': 'z',
    '\u0637': 't',
    '\u0638': 'z',
    '\u0639': 'a',
    '\u063a': 'gh',
    '\u0641': 'f',
    '\u0642': 'q',
    '\u0643': 'k',
    '\u0644': 'l',
    '\u0645': 'm',
    '\u0646': 'n',
    '\u0647': 'h',
    '\u0648': 'w',
    '\u0649': 'y',
    '\u064a': 'y',
    '\u0660': '0',
    '\u0661': '1',
    '\u0662': '2',
    '\u0663': '3',
    '\u0664': '4',
    '\u0665': '5',
    '\u0666': '6',
    '\u0667': '7',
    '\u0668': '8',
    '\u0669': '9',
    '\u0679': 't',
    '\u067e': 'p',
    '\u0686': 'ch',
    '\u0688': 'd',
    '\u0691': 'r',
    '\u0698': 'zh',
    '\u06a9': 'k',
    '\u06af': 'g',
    '\u06ba': 'n',
    '\u06be': 'h',
    '\u06c1': 'h',
    '\u06c2': 'h',
    '\u06c3': 'h',
    '\u06cc': 'y',
    '\u06d2': 'e',
    '\u06d3': 'e',
    '\u06f0': '0',
    '\u06f1': '1',
    '\u06f2': '2',
    '\u06f3': '3',
    '\u06f4': '4',
    '\u06f5': '5',
    '\u06f6': '6',
    '\u06f7': '7',
    '\u06f8': '8',
    '\u06f9': '9',
}

_WS_COLLAPSE = re.compile(r'\s+')


def _transliterate_chars(segment: str) -> str:
    """Letter-by-letter fallback; unknown Arabic-script chars are dropped (extend URDU_CHAR_MAP)."""
    out: list[str] = []
    for ch in segment:
        if ch in URDU_CHAR_MAP:
            out.append(URDU_CHAR_MAP[ch])
        elif URDU_SCRIPT_RE.match(ch):
            out.append('')
        else:
            out.append(ch)
    return ''.join(out)


def _apply_phrases(text: str) -> str:
    t = text
    for phrase in sorted(PHRASE_MAP.keys(), key=len, reverse=True):
        if phrase in t:
            t = t.replace(phrase, PHRASE_MAP[phrase])
    return t


_PUNCT_EDGE = set('.,;:!?"\'()[]{}«»')


def _strip_edge_punct(token: str) -> tuple[str, str, str]:
    lead = ''
    trail = ''
    s = token
    while s and s[0] in _PUNCT_EDGE:
        lead += s[0]
        s = s[1:]
    while s and s[-1] in _PUNCT_EDGE:
        trail = s[-1] + trail
        s = s[:-1]
    return lead, s, trail


def _token_replace_words(text: str) -> str:
    """Whitespace-split tokens; map whole words when present in WORD_MAP."""
    parts = re.split(r'(\s+)', text)
    out: list[str] = []
    for part in parts:
        if not part or part.isspace():
            out.append(part)
            continue
        lead, core, trail = _strip_edge_punct(part)
        if core in WORD_MAP:
            out.append(lead + WORD_MAP[core] + trail)
        else:
            out.append(part)
    return ''.join(out)


def urdu_to_roman(text: str) -> str:
    """
    Convert Urdu script to Roman Urdu (Latin). Uses phrase map, word map, then char fallback.
    """
    if not text:
        return text
    t = _apply_phrases(text)
    t = _token_replace_words(t)
    if not contains_urdu(t):
        return _WS_COLLAPSE.sub(' ', t).strip()

    parts = re.split(r'(\s+)', t)
    out: list[str] = []
    for part in parts:
        if not part:
            continue
        if re.match(r'^\s+$', part):
            out.append(part)
            continue
        if not contains_urdu(part):
            out.append(part)
        else:
            out.append(_transliterate_chars(part))
    merged = ''.join(out)
    merged = _WS_COLLAPSE.sub(' ', merged).strip()
    return merged
