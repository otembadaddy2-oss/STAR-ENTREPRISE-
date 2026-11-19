# Fabrique un modèle de test « à la taille de Qwen2.5-0.5B » (mêmes dimensions, poids au hasard) pour vérifier la mémoire, les gros morceaux GPU et le temps de chargement.
# Usage : python3 tools/ia/fabrique-gguf-gros.py <fichier.gguf> [q8_0|q4_0]
import sys, numpy as np
from gguf import GGUFWriter, GGMLQuantizationType as T
import gguf.quants as Q
sortie = sys.argv[1]; mode = sys.argv[2] if len(sys.argv) > 2 else "q8_0"
typ = T.Q8_0 if mode == "q8_0" else T.Q4_0
rng = np.random.default_rng(7)
V, D, H, KV, HD, FF, L = 151936, 896, 14, 2, 64, 4864, 24
# vocabulaire minimal (256 octets + 3 jetons spéciaux), le reste des lignes de l'embedding ne sert qu'à la taille
B = list(range(33, 127)) + list(range(161, 173)) + list(range(174, 256)); C = B[:]; n = 0
for b in range(256):
    if b not in B: B.append(b); C.append(256 + n); n += 1
tokens = [chr(c) for _, c in sorted(zip(B, C))] + ["<|endoftext|>", "<|im_start|>", "<|im_end|>"]
types = [1] * 256 + [3] * 3
wr = GGUFWriter(sortie, "qwen2")
wr.add_name("Forme-Qwen2.5-0.5B-test"); wr.add_context_length(32768); wr.add_embedding_length(D); wr.add_block_count(L); wr.add_feed_forward_length(FF)
wr.add_head_count(H); wr.add_head_count_kv(KV); wr.add_layer_norm_rms_eps(1e-6); wr.add_rope_freq_base(1000000.0); wr.add_file_type(7)
wr.add_tokenizer_model("gpt2"); wr.add_tokenizer_pre("qwen2"); wr.add_token_list(tokens); wr.add_token_types(types); wr.add_token_merges([])
wr.add_eos_token_id(len(tokens) - 1); wr.add_pad_token_id(len(tokens) - 3); wr.add_bos_token_id(len(tokens) - 3)
def gros(nom, shape, s=0.03): wr.add_tensor(nom, Q.quantize((rng.standard_normal(shape) * s).astype(np.float32), typ), raw_dtype=typ)
def petit(nom, n, s=0.1): wr.add_tensor(nom, (1 + s * rng.standard_normal(n)).astype(np.float32))
gros("token_embd.weight", (V, D), 0.1); petit("output_norm.weight", D)
for i in range(L):
    p = f"blk.{i}."
    petit(p + "attn_norm.weight", D); gros(p + "attn_q.weight", (H * HD, D)); wr.add_tensor(p + "attn_q.bias", (0.1 * rng.standard_normal(H * HD)).astype(np.float32))
    gros(p + "attn_k.weight", (KV * HD, D)); wr.add_tensor(p + "attn_k.bias", (0.1 * rng.standard_normal(KV * HD)).astype(np.float32))
    gros(p + "attn_v.weight", (KV * HD, D)); wr.add_tensor(p + "attn_v.bias", (0.1 * rng.standard_normal(KV * HD)).astype(np.float32))
    gros(p + "attn_output.weight", (D, H * HD)); petit(p + "ffn_norm.weight", D)
    gros(p + "ffn_gate.weight", (FF, D)); gros(p + "ffn_up.weight", (FF, D)); gros(p + "ffn_down.weight", (D, FF))
wr.write_header_to_file(); wr.write_kv_data_to_file(); wr.write_tensors_to_file(); wr.close()
import os; print("écrit", sortie, round(os.path.getsize(sortie) / 1e6), "Mo")
