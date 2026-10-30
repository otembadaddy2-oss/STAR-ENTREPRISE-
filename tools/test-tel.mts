import { memeNumero as m } from "../netlify/functions/_tel.mts";
const T: [string,string,boolean][] = [
 ["+242 06 608 71 42","0666087142",true],
 ["+242 06 608 71 42","066087142",true],
 ["+242066087142","+242 06 608 71 42",true],
 ["+2420 06 608 71 42","+242 6 608 71 42",true],
 ["00242066087142","+242 06 608 71 42",true],
 ["066087142","+242 6 608 71 42",true],
 ["+33 6 12 34 56 78","+242 06 123 45 678",false], // collision 8 derniers chiffres
 ["+33612345678","+33 6 12 34 56 78",true],
 ["+33 6 12 34 56 78","0612345678",false],     // local = Congo, pas la France
 ["+225 07 12 34 56 78","+225 0712345678",true],
 ["+1 415 555 0132","+1 (415) 555-0132",true],
 ["+1 415 555 0132","+7 415 555 0132",false],
 ["12345","12345",false],
];
let bad=0; for (const [a,b,e] of T){ const r=m(a,b); if(r!==e){bad++;console.log("ECHEC",a,b,"attendu",e,"obtenu",r);} }
console.log(bad?`${bad} échec(s)`:"tous les cas OK ("+T.length+")");
