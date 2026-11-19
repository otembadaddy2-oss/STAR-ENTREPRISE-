# Fabrique un petit modèle de test (architecture Qwen2) au format GGUF, avec les mêmes quantifications que les vrais modèles.
# Usage : python3 tools/ia/fabrique-gguf-test.py <dossier-sortie>
# Sert à comparer le moteur STAR IA à llama.cpp (le programme de référence) sur les mêmes poids.
import sys, os, json, struct
import numpy as np, regex, gguf
from gguf import GGUFWriter, GGMLQuantizationType as T
import gguf.quants as Q

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(1234)

# ---- Tokenizer : BPE sur octets (comme Qwen2), entraîné sur un petit texte français/anglais ----
PRE = r"(?:'[sS]|'[tT]|'[rR][eE]|'[vV][eE]|'[mM]|'[lL][lL]|'[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+"
def bytes_to_unicode():
    bs = list(range(33, 127)) + list(range(161, 173)) + list(range(174, 256)); cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256 + n); n += 1
    return {b: chr(c) for b, c in zip(bs, cs)}
B2U = bytes_to_unicode()
corpus = ("Bonjour, je m'appelle Carry et je suis le patron de STAR ENTREPRISE à Brazzaville. "
          "Comment allez-vous aujourd'hui ? Très bien, merci ! Hello, how are you? I'm fine. "
          "Le jeu X SAPHIR Arena est un jeu de combat réaliste. 12345 + 678 = 13023. "
          "L'intelligence artificielle générative sur téléphone, c'est possible avec un petit modèle. ") * 6
words = [''.join(B2U[b] for b in w.encode('utf-8')) for w in regex.findall(PRE, corpus)]
vocab = {}
for b in range(256): vocab[B2U[b]] = len(vocab)
seqs = {}
for w in words: seqs.setdefault(tuple(w), 0); seqs[tuple(w)] += 1
merges = []
for _ in range(300):
    pairs = {}
    for s, c in seqs.items():
        for a, b in zip(s, s[1:]): pairs[(a, b)] = pairs.get((a, b), 0) + c
    if not pairs: break
    best = max(pairs.items(), key=lambda kv: (kv[1], kv[0]))[0]
    merges.append(best); new = best[0] + best[1]; vocab[new] = len(vocab)
    ns = {}
    for s, c in seqs.items():
        r = []; i = 0
        while i < len(s):
            if i + 1 < len(s) and (s[i], s[i + 1]) == best: r.append(new); i += 2
            else: r.append(s[i]); i += 1
        ns[tuple(r)] = ns.get(tuple(r), 0) + c
    seqs = ns
tokens = list(vocab.keys())
specials = ["<|endoftext|>", "<|im_start|>", "<|im_end|>"]
types = [1] * len(tokens) + [3] * len(specials)
tokens += specials
V = len(tokens); EOT, IMS, IME = V - 3, V - 2, V - 1
print("vocabulaire :", V, "fusions :", len(merges))

# ---- Poids du modèle (dimensions multiples de 256 pour pouvoir tester toutes les quantifications) ----
D, H, KV, HD, FF, L = 256, 8, 2, 32, 512, 2
def w(*shape, s=0.08): return (rng.standard_normal(shape) * s).astype(np.float32)
def norm(n): return (1.0 + 0.1 * rng.standard_normal(n)).astype(np.float32)
tens = {"token_embd.weight": w(V, D, s=0.3), "output_norm.weight": norm(D)}
for i in range(L):
    p = f"blk.{i}."
    tens.update({p + "attn_norm.weight": norm(D), p + "attn_q.weight": w(H * HD, D), p + "attn_q.bias": w(H * HD, s=0.2),
                 p + "attn_k.weight": w(KV * HD, D), p + "attn_k.bias": w(KV * HD, s=0.2), p + "attn_v.weight": w(KV * HD, D), p + "attn_v.bias": w(KV * HD, s=0.2),
                 p + "attn_output.weight": w(D, H * HD), p + "ffn_norm.weight": norm(D),
                 p + "ffn_gate.weight": w(FF, D), p + "ffn_up.weight": w(FF, D), p + "ffn_down.weight": w(D, FF)})

def q6k_random(shape):
    # Q6_K sans quantificateur python : on fabrique des blocs valides (ql 128 o, qh 64 o, scales 16 int8, d fp16) avec de petites échelles
    rows, cols = shape; nb = cols // 256; blocks = bytearray()
    for _ in range(rows * nb):
        ql = rng.integers(0, 256, 128, dtype=np.uint8).tobytes(); qh = rng.integers(0, 256, 64, dtype=np.uint8).tobytes()
        sc = rng.integers(-20, 21, 16, dtype=np.int8).tobytes(); d = np.float16(0.004).tobytes()
        blocks += ql + qh + sc + d
    return np.frombuffer(bytes(blocks), dtype=np.uint8).reshape(rows, nb * 210)

QUANT = {}   # (mode, nom) -> (octets quantifiés, type) : calculé une seule fois pour que le fichier quantifié et sa version « déquantifiée » aient exactement les mêmes poids
def quantifie(mode, k, arr):
    if (mode, k) in QUANT: return QUANT[(mode, k)]
    if mode == "q8_0": r = (Q.quantize(arr, T.Q8_0), T.Q8_0)
    elif mode == "q4_0": r = (Q.quantize(arr, T.Q4_0), T.Q4_0)
    elif mode == "mixte": r = (q6k_random(arr.shape), T.Q6_K) if k == "token_embd.weight" else (Q.quantize(arr, T.Q4_0), T.Q4_0)
    QUANT[(mode, k)] = r; return r

def ecrire(nom, mode, deq=False):
    # mode : f32, f16, q8_0, q4_0, mixte (q4_0 + q6_k pour l'embedding comme les vrais fichiers q4_0)
    # deq=True : mêmes poids que le fichier quantifié, mais écrits en flottants (référence exacte pour llama.cpp)
    path = os.path.join(out, nom)
    wr = GGUFWriter(path, "qwen2")
    wr.add_name("test-star-ia"); wr.add_context_length(512); wr.add_embedding_length(D); wr.add_block_count(L); wr.add_feed_forward_length(FF)
    wr.add_head_count(H); wr.add_head_count_kv(KV); wr.add_layer_norm_rms_eps(1e-6); wr.add_rope_freq_base(1000000.0); wr.add_file_type(0)
    wr.add_tokenizer_model("gpt2"); wr.add_tokenizer_pre("qwen2"); wr.add_token_list(tokens); wr.add_token_types(types)
    wr.add_token_merges([a + " " + b for a, b in merges]); wr.add_eos_token_id(IME); wr.add_pad_token_id(EOT); wr.add_bos_token_id(EOT)
    for k, arr in tens.items():
        gros = arr.ndim == 2
        if not gros or mode == "f32": wr.add_tensor(k, arr)
        elif mode == "f16": wr.add_tensor(k, arr.astype(np.float16))
        else:
            raw, typ = quantifie(mode, k, arr)
            if deq: wr.add_tensor(k, Q.dequantize(raw, typ).astype(np.float32))
            else: wr.add_tensor(k, raw, raw_dtype=typ)
    wr.write_header_to_file(); wr.write_kv_data_to_file(); wr.write_tensors_to_file(); wr.close()
    print("écrit", path, os.path.getsize(path), "octets")

for nom, mode in [("test-f32.gguf", "f32"), ("test-f16.gguf", "f16"), ("test-q8_0.gguf", "q8_0"), ("test-q4_0.gguf", "q4_0"), ("test-mixte.gguf", "mixte")]: ecrire(nom, mode)
for mode in ("q8_0", "q4_0", "mixte"): ecrire("deq-" + mode + ".gguf", mode, deq=True)
json.dump({"V": V, "EOT": EOT, "IMS": IMS, "IME": IME}, open(os.path.join(out, "info.json"), "w"))
