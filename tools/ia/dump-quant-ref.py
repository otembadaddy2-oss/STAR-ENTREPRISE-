# Écrit, pour chaque format de poids, des blocs compressés et leur contenu exact décompressé par la bibliothèque officielle « gguf ».
# STAR IA doit retrouver les mêmes nombres. Usage : python3 tools/ia/dump-quant-ref.py <dossier>
import sys, os, json
import numpy as np
import gguf.quants as Q
from gguf import GGMLQuantizationType as T
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(99)
x = (rng.standard_normal((6, 512)) * 0.7).astype(np.float32)
res = {}
for nom, t in [("Q4_0", T.Q4_0), ("Q4_1", T.Q4_1), ("Q5_0", T.Q5_0), ("Q5_1", T.Q5_1), ("Q8_0", T.Q8_0), ("BF16", T.BF16)]:
    raw = Q.quantize(x, t); deq = Q.dequantize(raw, t).astype(np.float32)
    raw.tofile(os.path.join(out, "q-" + nom + ".bin")); deq.tofile(os.path.join(out, "q-" + nom + ".f32"))
    res[nom] = {"type": int(t), "n": int(x.size)}
x16 = x.astype(np.float16); x16.tofile(os.path.join(out, "q-F16.bin")); x16.astype(np.float32).tofile(os.path.join(out, "q-F16.f32")); res["F16"] = {"type": 1, "n": int(x.size)}
x.tofile(os.path.join(out, "q-F32.bin")); x.tofile(os.path.join(out, "q-F32.f32")); res["F32"] = {"type": 0, "n": int(x.size)}
# Q6_K : blocs fabriqués (pas de quantificateur python), décompression de référence par la bibliothèque
blocs = bytearray()
for _ in range(6 * 2):
    blocs += rng.integers(0, 256, 128, dtype=np.uint8).tobytes() + rng.integers(0, 256, 64, dtype=np.uint8).tobytes() + rng.integers(-30, 31, 16, dtype=np.int8).tobytes() + np.float16(0.003).tobytes()
raw = np.frombuffer(bytes(blocs), dtype=np.uint8).reshape(6, 2 * 210); deq = Q.dequantize(raw, T.Q6_K).astype(np.float32)
raw.tofile(os.path.join(out, "q-Q6_K.bin")); deq.tofile(os.path.join(out, "q-Q6_K.f32")); res["Q6_K"] = {"type": 14, "n": 6 * 512}
json.dump(res, open(os.path.join(out, "q-info.json"), "w")); print("formats écrits :", sorted(res))
