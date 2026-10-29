// A calculadora de percentil de crescimento (as seis páginas da calculadora).
//
// Toda a conta acontece aqui, no navegador: nada do que a pessoa digita sai
// do aparelho. As curvas vêm de js/oms-crescimento.js; os textos, do bloco
// <script id="textos-calculadora"> da própria página, na língua dela.
//
// O método é o LMS da OMS: com L, M e S da idade, o escore z de uma medida X
// é ((X/M)^L - 1) / (L·S), e o percentil é a área da curva normal até z.
// No peso, além de 3 desvios-padrão a OMS manda esticar a conta pela
// distância entre 2 e 3 (a "restrição" do relatório técnico de 2006), porque
// a cauda da curva LMS ali exagera. No comprimento e na cabeça, L é 1 e a
// conta é linear, sem ajuste.
(function () {
  "use strict";

  var OMS = window.OMS_CRESCIMENTO;
  var DIAS_POR_MES = 30.4375;
  var DIAS_ATE_2_ANOS = 2 * 365.25;
  var DIAS_ATE_5_ANOS = 5 * 365.25;

  /** A linha [L, M, S] interpolada na posição x (fracionária) da tabela. */
  function interpolar(linhas, x) {
    if (x < 0 || x > linhas.length - 1) return null;
    var i = Math.floor(x);
    if (i === linhas.length - 1) return linhas[i].slice();
    var f = x - i;
    var a = linhas[i];
    var b = linhas[i + 1];
    return [0, 1, 2].map(function (k) { return a[k] + (b[k] - a[k]) * f; });
  }

  /**
   * L, M e S para uma idade em dias. [indicador] é "peso", "comprimento" ou
   * "cabeca"; a partir dos 2 anos, "comprimento" passa para a tabela da
   * altura em pé. Fora de 0 a 5 anos, devolve null.
   */
  function lms(indicador, sexo, dias) {
    if (!(dias >= 0) || dias > DIAS_ATE_5_ANOS) return null;
    if (indicador === "comprimento" && dias >= DIAS_ATE_2_ANOS) {
      return interpolar(OMS.altura[sexo].meses, dias / DIAS_POR_MES - 24);
    }
    var tabela = OMS[indicador][sexo];
    if (tabela.semanas && dias < 13 * 7) return interpolar(tabela.semanas, dias / 7);
    return interpolar(tabela.meses, dias / DIAS_POR_MES);
  }

  /** A medida que fica exatamente no escore z, pela curva LMS. */
  function medidaNoZ(curva, z) {
    var L = curva[0], M = curva[1], S = curva[2];
    return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
  }

  function escoreZ(valor, curva, indicador) {
    var L = curva[0], M = curva[1], S = curva[2];
    var z = L === 0 ? Math.log(valor / M) / S : (Math.pow(valor / M, L) - 1) / (L * S);
    if (indicador === "peso" && z > 3) {
      var mais3 = medidaNoZ(curva, 3);
      z = 3 + (valor - mais3) / (mais3 - medidaNoZ(curva, 2));
    } else if (indicador === "peso" && z < -3) {
      var menos3 = medidaNoZ(curva, -3);
      z = -3 + (valor - menos3) / (medidaNoZ(curva, -2) - menos3);
    }
    return z;
  }

  /** A área da normal padrão até z (Abramowitz e Stegun 26.2.17). */
  function normal(z) {
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989422804014327 * Math.exp(-z * z / 2);
    var cauda = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 +
      t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - cauda : cauda;
  }

  /** { z, p } de uma medida, com p de 0 a 100; null fora da curva. */
  function percentil(indicador, sexo, dias, valor) {
    var curva = lms(indicador, sexo, dias);
    if (!curva || !(valor > 0)) return null;
    var z = escoreZ(valor, curva, indicador);
    return { z: z, p: normal(z) * 100 };
  }

  window.Percentil = { lms: lms, medidaNoZ: medidaNoZ, escoreZ: escoreZ, normal: normal, percentil: percentil };

  // ---------- a página ----------

  var form = document.getElementById("calculadora");
  if (!form) return;
  var T = JSON.parse(document.getElementById("textos-calculadora").textContent);
  var saida = document.getElementById("resultado");
  var lingua = document.documentElement.lang;
  var numero = function (n, casas) {
    return new Intl.NumberFormat(lingua, { maximumFractionDigits: casas }).format(n);
  };

  // A data da medição começa em hoje, no fuso de quem usa.
  var hoje = new Date();
  form.medicao.value = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);

  function unidades() {
    return form.querySelector('input[name="unidades"]:checked').value === "imperial"
      ? T.imperial : T.metrico;
  }
  function trocarUnidades() {
    var u = unidades();
    form.querySelectorAll("[data-unidade]").forEach(function (el) {
      el.textContent = u[el.dataset.unidade];
    });
  }
  form.querySelectorAll('input[name="unidades"]').forEach(function (r) {
    r.addEventListener("change", trocarUnidades);
  });
  trocarUnidades();

  function lerNumero(campo) {
    var texto = campo.value.trim().replace(",", ".");
    return texto === "" ? null : Number(texto);
  }
  function dataUtc(texto) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    return p ? Date.UTC(+p[1], +p[2] - 1, +p[3]) : NaN;
  }
  function plural(par, n) {
    return n + " " + par[n === 1 ? 0 : 1];
  }
  /** "4 meses e 12 dias" até os 2 anos; "2 anos e 3 meses" depois. */
  function idadeEmTexto(nascimento, medicao) {
    var a = new Date(nascimento), b = new Date(medicao);
    var meses = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
    if (b.getUTCDate() < a.getUTCDate()) meses--;
    var marco = new Date(a);
    marco.setUTCMonth(a.getUTCMonth() + meses);
    var dias = Math.round((b - marco) / 86400000);
    if (meses < 24) {
      if (meses === 0) return plural(T.idade.dia, dias);
      return plural(T.idade.mes, meses) + (dias ? T.idade.e + plural(T.idade.dia, dias) : "");
    }
    var anos = Math.floor(meses / 12), resto = meses % 12;
    return plural(T.idade.ano, anos) + (resto ? T.idade.e + plural(T.idade.mes, resto) : "");
  }
  function frase(indicador, p, sexo) {
    var grupo = T.sexos[sexo];
    if (p < 1) return T.fraseBaixa.replace("{s}", grupo);
    if (p > 99) return T.fraseAlta.replace("{s}", grupo);
    var n = Math.round(p), m = 100 - n;
    var v = T.verbos[indicador];
    return T.frase.replace("{s}", grupo)
      .replace("{n}", n).replace("{menos}", v.menos[n === 1 ? 0 : 1])
      .replace("{m}", m).replace("{mais}", v.mais[m === 1 ? 0 : 1]);
  }
  function rotuloDoPercentil(p) {
    if (p < 1) return "< 1";
    if (p > 99) return "> 99";
    return String(Math.round(p));
  }
  function erro(mensagem) {
    saida.hidden = false;
    saida.innerHTML = '<p class="resultado-erro" role="alert"></p>';
    saida.firstChild.textContent = mensagem;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var sexo = (form.querySelector('input[name="sexo"]:checked') || {}).value;
    if (!sexo) return erro(T.erros.sexo);
    var nascimento = dataUtc(form.nascimento.value);
    var medicao = dataUtc(form.medicao.value);
    if (isNaN(nascimento)) return erro(T.erros.nascimento);
    if (isNaN(medicao)) return erro(T.erros.medicao);
    var dias = Math.round((medicao - nascimento) / 86400000);
    if (dias < 0) return erro(T.erros.antes);
    if (dias > DIAS_ATE_5_ANOS) return erro(T.erros.idade);

    // Prematuro: até os 2 anos, desconta o que faltava para as 40 semanas.
    var semanas = Number(form.prematuro.value);
    var diasDaCurva = dias;
    var corrigida = false;
    if (semanas && semanas < 37 && dias < DIAS_ATE_2_ANOS) {
      diasDaCurva = dias - (40 - semanas) * 7;
      corrigida = true;
      if (diasDaCurva < 0) return erro(T.erros.prematuro);
    }

    var u = unidades();
    var imperial = u === T.imperial;
    var medidas = [
      ["peso", form.peso, imperial ? 0.45359237 : 1, u.peso],
      ["comprimento", form.comprimento, imperial ? 2.54 : 1, u.comprimento],
      ["cabeca", form.cabeca, imperial ? 2.54 : 1, u.comprimento],
    ];
    var itens = [];
    var algum = false;
    for (var i = 0; i < medidas.length; i++) {
      var valor = lerNumero(medidas[i][1]);
      if (valor === null) continue;
      algum = true;
      var indicador = medidas[i][0];
      var nome = indicador === "comprimento" && diasDaCurva >= DIAS_ATE_2_ANOS
        ? T.nomes.altura : T.nomes[indicador];
      var r = isNaN(valor) ? null : percentil(indicador, sexo, diasDaCurva, valor * medidas[i][2]);
      if (!r || Math.abs(r.z) > 5) {
        itens.push({ nome: nome, erro: T.erros.valor });
        continue;
      }
      itens.push({
        nome: nome,
        valor: numero(valor, 2) + " " + medidas[i][3],
        p: r.p,
        z: r.z,
        frase: frase(indicador, r.p, sexo),
      });
    }
    if (!algum) return erro(T.erros.medida);

    var html = '<p class="resultado-idade"></p>';
    itens.forEach(function () { html += '<div class="resultado-item"></div>'; });
    saida.innerHTML = html;
    saida.hidden = false;
    var idade = T.idadeRotulo + ": " + idadeEmTexto(nascimento, medicao);
    if (corrigida) idade += " · " + T.idadeCorrigida + ": " + idadeEmTexto(nascimento, medicao - (40 - semanas) * 7 * 86400000);
    saida.querySelector(".resultado-idade").textContent = idade;

    saida.querySelectorAll(".resultado-item").forEach(function (caixa, k) {
      var it = itens[k];
      var topo = document.createElement("div");
      topo.className = "resultado-topo";
      topo.innerHTML = '<span class="resultado-nome"></span><span class="resultado-valor"></span>';
      topo.firstChild.textContent = it.nome;
      caixa.appendChild(topo);
      if (it.erro) {
        topo.lastChild.textContent = "";
        var aviso = document.createElement("p");
        aviso.className = "resultado-erro";
        aviso.textContent = it.erro;
        caixa.appendChild(aviso);
        return;
      }
      topo.lastChild.textContent = it.valor;
      var linha = document.createElement("p");
      linha.className = "resultado-percentil";
      linha.innerHTML = "<strong></strong> <span></span>";
      linha.firstChild.textContent = T.percentil + " " + rotuloDoPercentil(it.p);
      linha.lastChild.textContent = T.escoreZ + " " + numero(it.z, 2);
      caixa.appendChild(linha);
      var regua = document.createElement("div");
      regua.className = "regua";
      regua.setAttribute("aria-hidden", "true");
      regua.innerHTML = "<span></span>";
      regua.firstChild.style.left = Math.min(99, Math.max(1, it.p)) + "%";
      caixa.appendChild(regua);
      var texto = document.createElement("p");
      texto.className = "resultado-frase";
      texto.textContent = it.frase;
      caixa.appendChild(texto);
    });
    saida.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
