# Calcule, avec llama.cpp (le programme de référence), ce que STAR IA doit retrouver : mots (tokens) et scores (logits).
# Usage : python3 tools/ia/reference-llamacpp.py <dossier-des-modeles-de-test> <sortie.json>
import sys, json, os, math
from llama_cpp import Llama
d, sortie = sys.argv[1], sys.argv[2]
textes = ["Bonjour, je m'appelle Carry.", "Hello, how are you? I'm fine.", "L'intelligence artificielle générative sur téléphone !", "12345 + 678 = 13023", "  espaces   multiples\net\nlignes", "été à Brazzaville, café 🙂 ñ ü ß", "<|im_start|>user\nSalut<|im_end|>\n<|im_start|>assistant\n", "X SAPHIR Arena, STAR-ENTREPRISE.", ""]
res = {"tokens": {}, "logits": {}}
for f in ["test-f32.gguf", "test-f16.gguf", "test-q8_0.gguf", "test-q4_0.gguf", "test-mixte.gguf", "deq-q8_0.gguf", "deq-q4_0.gguf", "deq-mixte.gguf"]:
    llm = Llama(model_path=os.path.join(d, f), n_ctx=128, logits_all=True, verbose=False, n_threads=2)
    if f == "test-f32.gguf":
        for t in textes: res["tokens"][t] = llm.tokenize(t.encode("utf-8"), add_bos=False, special=True)
    seq = llm.tokenize("<|im_start|>user\nBonjour, comment ça va ? 12345<|im_end|>\n<|im_start|>assistant\n".encode("utf-8"), add_bos=False, special=True)
    llm.reset(); llm.eval(seq)
    lg = [[float(v) for v in llm.scores[i]] for i in range(len(seq))]
    res["logits"][f] = {"seq": seq, "dernier": lg[-1], "premier": lg[0], "milieu": lg[len(seq) // 2]}
    del llm
json.dump(res, open(sortie, "w"))
print("référence écrite :", sortie, {k: len(v["dernier"]) for k, v in res["logits"].items()})
