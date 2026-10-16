import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { extratoParaBI, secoesDaAta, type AtaDados } from "@/lib/ata";
import { addDias, formatBR, formatDataHora, mesPorExtenso } from "@/lib/datas";
import type { EscalaBoletim, SecaoBoletim } from "@/lib/boletim";

const MARGEM = 56;
const LARGURA_A4 = 595.28;
const ALTURA_A4 = 841.89;
const LARGURA_TEXTO = LARGURA_A4 - MARGEM * 2;

/**
 * Gera a Ata de Inspeção de Saúde em PDF (A4), pronta para juntada ao
 * processo e publicação do extrato em Boletim Geral.
 */
export async function gerarPdfAta(dados: AtaDados): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteSerifada = await pdf.embedFont(StandardFonts.TimesRoman);
  const cor = rgb(0.09, 0.14, 0.1);
  const corSuave = rgb(0.36, 0.42, 0.36);

  pdf.setTitle(`${dados.ata.ataNumero} — Inspeção de Saúde`);
  pdf.setAuthor(dados.completa ? "Junta de Inspeção de Saúde" : "Junta de Inspeção de Saúde (extrato)");
  pdf.setSubject("Ata de Inspeção de Saúde");
  pdf.setCreator("SIS-JIS");

  let pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
  let y = ALTURA_A4 - MARGEM;

  const quebrar = (texto: string, f: typeof fonte, tamanho: number): string[] => {
    const palavras = texto.split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of palavras) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (f.widthOfTextAtSize(teste, tamanho) <= LARGURA_TEXTO) atual = teste;
      else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  const novaPaginaSeNecessario = (alturaNecessaria: number) => {
    if (y - alturaNecessaria < MARGEM + 30) {
      pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
      y = ALTURA_A4 - MARGEM;
    }
  };

  const escrever = (
    texto: string,
    f: typeof fonte,
    tamanho: number,
    opcoes: { entrelinha?: number; corTexto?: typeof cor; recuo?: number } = {},
  ) => {
    const { entrelinha = tamanho * 1.45, corTexto = cor, recuo = 0 } = opcoes;
    for (const linha of quebrar(texto, f, tamanho)) {
      novaPaginaSeNecessario(entrelinha);
      pagina.drawText(linha, {
        x: MARGEM + recuo,
        y: y - tamanho,
        size: tamanho,
        font: f,
        color: corTexto,
      });
      y -= entrelinha;
    }
  };

  const linhaHorizontal = (espessura = 0.7, deslocamento = 6) => {
    novaPaginaSeNecessario(deslocamento + 4);
    pagina.drawLine({
      start: { x: MARGEM, y: y - deslocamento },
      end: { x: LARGURA_A4 - MARGEM, y: y - deslocamento },
      thickness: espessura,
      color: rgb(0.55, 0.6, 0.55),
    });
    y -= deslocamento + 10;
  };

  /* Cabeçalho institucional */
  escrever("GOVERNO DE RONDÔNIA — POLÍCIA MILITAR", fonteNegrito, 9, {
    entrelinha: 12,
  });
  escrever(dados.militar.om.toUpperCase(), fonte, 9, { entrelinha: 12, corTexto: corSuave });
  escrever("JUNTA DE INSPEÇÃO DE SAÚDE — JIS", fonte, 9, { entrelinha: 14, corTexto: corSuave });
  linhaHorizontal(1.1);

  escrever("ATA DE INSPEÇÃO DE SAÚDE", fonteNegrito, 16, { entrelinha: 22 });
  escrever(dados.ata.ataNumero, fonteNegrito, 11, { entrelinha: 16, corTexto: corSuave });
  y -= 8;

  /* Identificação resumida */
  escrever(
    `Militar: ${dados.militar.postoGraduacao} ${dados.militar.nome} (${dados.militar.nomeGuerra ?? "s/nome de guerra"}) — RE ${dados.militar.re}${dados.militar.cpf && dados.completa ? ` — CPF ${dados.militar.cpf}` : ""}`,
    fonte,
    10,
  );
  escrever(
    `Data da inspeção: ${formatBR(dados.ata.dataInspecao)} (${mesPorExtenso(dados.ata.dataInspecao)})  ·  Situação da ata: ${dados.ata.status.toUpperCase()}${dados.ata.biNumero ? ` · ${dados.ata.biNumero}` : ""}`,
    fonte,
    10,
  );
  y -= 6;
  linhaHorizontal(0.5);

  for (const secao of secoesDaAta(dados)) {
    novaPaginaSeNecessario(60);
    escrever(secao.titulo, fonteNegrito, 10.5, { entrelinha: 16 });
    for (const paragrafo of secao.paragrafos) {
      escrever(paragrafo, fonteSerifada, 10.5, { entrelinha: 15.5, recuo: 8 });
    }
    y -= 6;
  }

  /* Extrato para Boletim Geral */
  novaPaginaSeNecessario(120);
  escrever("EXTRATO PARA PUBLICAÇÃO EM BOLETIM INTERNO", fonteNegrito, 10.5, {
    entrelinha: 16,
  });
  pagina.drawRectangle({
    x: MARGEM,
    y: y - 74,
    width: LARGURA_TEXTO,
    height: 70,
    borderColor: rgb(0.6, 0.65, 0.6),
    borderWidth: 0.8,
    color: rgb(0.97, 0.97, 0.95),
  });
  const linhasExtrato = quebrar(extratoParaBI(dados), fonteSerifada, 9.5);
  linhasExtrato.forEach((linha, indice) => {
    pagina.drawText(linha, {
      x: MARGEM + 10,
      y: y - 18 - indice * 13.5,
      size: 9.5,
      font: fonteSerifada,
      color: cor,
    });
  });
  y -= 90;

  /* Assinaturas */
  novaPaginaSeNecessario(140);
  y -= 10;
  const centroEsquerda = MARGEM + LARGURA_TEXTO * 0.25;
  const centroDireita = MARGEM + LARGURA_TEXTO * 0.75;
  pagina.drawLine({
    start: { x: centroEsquerda - 110, y },
    end: { x: centroEsquerda + 110, y },
    thickness: 0.8,
    color: rgb(0.3, 0.35, 0.3),
  });
  pagina.drawLine({
    start: { x: centroDireita - 110, y },
    end: { x: centroDireita + 110, y },
    thickness: 0.8,
    color: rgb(0.3, 0.35, 0.3),
  });
  pagina.drawText(dados.medico ? dados.medico.nome : "Médico Avaliador", {
    x: centroEsquerda - 110,
    y: y - 14,
    size: 9.5,
    font: fonteNegrito,
    color: cor,
  });
  pagina.drawText(dados.medico?.crm ?? "CRM __________", {
    x: centroEsquerda - 110,
    y: y - 26,
    size: 9,
    font: fonte,
    color: corSuave,
  });
  pagina.drawText(dados.homologador ? dados.homologador.nome : "Presidente da JIS", {
    x: centroDireita - 110,
    y: y - 14,
    size: 9.5,
    font: fonteNegrito,
    color: cor,
  });
  pagina.drawText(dados.homologador?.crm ?? "Homologação", {
    x: centroDireita - 110,
    y: y - 26,
    size: 9,
    font: fonte,
    color: corSuave,
  });
  y -= 60;

  if (!dados.completa) {
    escrever(
      "Documento emitido em versão administrativa: os dados clínicos permanecem restritos aos membros da Junta de Inspeção de Saúde.",
      fonte,
      8.5,
      { entrelinha: 12, corTexto: corSuave },
    );
  }

  /* Rodapé numerado */
  const totalPaginas = pdf.getPageCount();
  pdf.getPages().forEach((p, indice) => {
    p.drawText(
      `SIS-JIS · gerado eletronicamente em ${formatDataHora(new Date())} · Página ${indice + 1} de ${totalPaginas}`,
      {
        x: MARGEM,
        y: 30,
        size: 7.5,
        font: fonte,
        color: corSuave,
      },
    );
  });

  return pdf.save();
}

export type BoletimPdfDados = {
  numero: number; ano: number; semana: string; status: string; publicadoEm: string | null;
  om: string; escala: EscalaBoletim; secoes: SecaoBoletim[];
};

/** Boletim Interno em A4: cabeçalho, Seção I (escala) em tabela e seções II–IV. */
export async function gerarPdfBoletim(dados: BoletimPdfDados): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteSerifada = await pdf.embedFont(StandardFonts.TimesRoman);
  const cor = rgb(0.09, 0.14, 0.1);
  const corSuave = rgb(0.36, 0.42, 0.36);
  const numeroFmt = `${String(dados.numero).padStart(3, "0")}/${dados.ano}`;

  pdf.setTitle(`BI nº ${numeroFmt} — Boletim Interno`);
  pdf.setAuthor("Junta de Inspeção de Saúde");
  pdf.setSubject("Boletim Interno");
  pdf.setCreator("SIS-JIS");

  let pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
  let y = ALTURA_A4 - MARGEM;

  const quebrar = (texto: string, f: typeof fonte, tamanho: number, largura = LARGURA_TEXTO): string[] => {
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of texto.split(/\s+/).filter(Boolean)) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (f.widthOfTextAtSize(teste, tamanho) <= largura) atual = teste;
      else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
    return linhas.length ? linhas : [""];
  };

  const novaPaginaSeNecessario = (altura: number) => {
    if (y - altura < MARGEM + 30) {
      pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
      y = ALTURA_A4 - MARGEM;
    }
  };

  const escrever = (
    texto: string, f: typeof fonte, tamanho: number,
    opcoes: { entrelinha?: number; corTexto?: typeof cor; recuo?: number } = {},
  ) => {
    const { entrelinha = tamanho * 1.45, corTexto = cor, recuo = 0 } = opcoes;
    for (const linha of quebrar(texto, f, tamanho, LARGURA_TEXTO - recuo)) {
      novaPaginaSeNecessario(entrelinha);
      pagina.drawText(linha, { x: MARGEM + recuo, y: y - tamanho, size: tamanho, font: f, color: corTexto });
      y -= entrelinha;
    }
  };

  const linhaHorizontal = (espessura = 0.7, deslocamento = 6) => {
    novaPaginaSeNecessario(deslocamento + 4);
    pagina.drawLine({
      start: { x: MARGEM, y: y - deslocamento },
      end: { x: LARGURA_A4 - MARGEM, y: y - deslocamento },
      thickness: espessura, color: rgb(0.55, 0.6, 0.55),
    });
    y -= deslocamento + 10;
  };

  const colunas = [
    { titulo: "Setor", largura: 110 },
    { titulo: "Turno", largura: 62 },
    { titulo: "Pessoa", largura: 175 },
    { titulo: "Observação", largura: LARGURA_TEXTO - 347 },
  ];

  const desenharCabecalhoTabela = () => {
    const h = 15;
    novaPaginaSeNecessario(h + 6);
    pagina.drawRectangle({ x: MARGEM, y: y - h, width: LARGURA_TEXTO, height: h, color: rgb(0.93, 0.94, 0.92) });
    let x = MARGEM;
    for (const c of colunas) {
      pagina.drawText(c.titulo, { x: x + 3, y: y - h + 4, size: 8.5, font: fonteNegrito, color: cor });
      x += c.largura;
    }
    y -= h;
  };

  const desenharLinhaTabela = (valores: string[]) => {
    const celulas = valores.map((v, i) => quebrar(v, fonte, 9, colunas[i].largura - 6));
    const altura = Math.max(...celulas.map((c) => c.length), 1) * 11 + 4;
    novaPaginaSeNecessario(altura);
    let x = MARGEM;
    celulas.forEach((linhasTexto, i) => {
      linhasTexto.forEach((linha, j) => {
        pagina.drawText(linha, { x: x + 3, y: y - 11 - j * 11, size: 9, font: fonte, color: cor });
      });
      x += colunas[i].largura;
    });
    pagina.drawLine({
      start: { x: MARGEM, y: y - altura }, end: { x: LARGURA_A4 - MARGEM, y: y - altura },
      thickness: 0.4, color: rgb(0.8, 0.82, 0.8),
    });
    y -= altura;
  };

  /* Cabeçalho institucional */
  escrever("GOVERNO DE RONDÔNIA — POLÍCIA MILITAR", fonteNegrito, 9, { entrelinha: 12 });
  escrever(dados.om.toUpperCase(), fonte, 9, { entrelinha: 12, corTexto: corSuave });
  escrever("JUNTA DE INSPEÇÃO DE SAÚDE — JIS", fonte, 9, { entrelinha: 14, corTexto: corSuave });
  linhaHorizontal(1.1);
  escrever("BOLETIM INTERNO", fonteNegrito, 16, { entrelinha: 22 });
  escrever(`BI nº ${numeroFmt}`, fonteNegrito, 11, { entrelinha: 16, corTexto: corSuave });
  escrever(
    `Semana de ${formatBR(dados.semana)} a ${formatBR(addDias(dados.semana, 6))} · Situação: ${dados.status.toUpperCase()}`,
    fonte, 10,
  );
  if (dados.publicadoEm) escrever(`Publicado em ${formatDataHora(dados.publicadoEm)}`, fonte, 9, { entrelinha: 13, corTexto: corSuave });
  y -= 4;
  linhaHorizontal(0.5);

  /* Seção I — Escala de Serviço */
  novaPaginaSeNecessario(40);
  escrever("I – ESCALA DE SERVIÇO", fonteNegrito, 11, { entrelinha: 16 });
  for (const dia of dados.escala.dias) {
    if (dia.setores.length === 0) continue;
    novaPaginaSeNecessario(40);
    escrever(`${dia.rotulo} — ${formatBR(addDias(dados.escala.semana, dia.dia))}`, fonteNegrito, 10, { entrelinha: 15 });
    desenharCabecalhoTabela();
    for (const setor of dia.setores) {
      for (const item of setor.itens) {
        desenharLinhaTabela([setor.setor, item.turno, item.pessoaNome, item.observacao ?? "—"]);
      }
    }
    y -= 6;
  }

  /* Seções II–IV */
  for (const secao of dados.secoes) {
    novaPaginaSeNecessario(50);
    escrever(secao.titulo, fonteNegrito, 11, { entrelinha: 16 });
    for (const paragrafo of secao.paragrafos) {
      escrever(paragrafo, fonteSerifada, 10.5, { entrelinha: 15.5, recuo: 8 });
    }
    y -= 6;
  }

  /* Rodapé numerado */
  const totalPaginas = pdf.getPageCount();
  pdf.getPages().forEach((p, indice) => {
    p.drawText(
      `SIS-JIS · BI nº ${numeroFmt} · gerado eletronicamente em ${formatDataHora(new Date())} · Página ${indice + 1} de ${totalPaginas}`,
      { x: MARGEM, y: 30, size: 7.5, font: fonte, color: corSuave },
    );
  });

  return pdf.save();
}
