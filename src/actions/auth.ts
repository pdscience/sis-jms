import { atualizar, inserir, porColuna, um } from "@/db";
import type { Usuario } from "@/db/schema";
import {
  comSessao,
  encerrarSessao,
  exigirSessao,
  hashSenha,
  iniciarSessao,
  ipAtual,
  verificarSenha,
  type CookieJar,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";

export type ResultadoAcao = {
  ok: boolean;
  erro?: string;
  sucesso?: string;
  id?: number;
};

/** Lógica de login compartilhada entre API e testes (sem redirect). */
export async function entrar(
  cookies: CookieJar,
  ip: string | null,
  loginRaw: string,
  senhaRaw: string,
): Promise<ResultadoAcao> {
  return comSessao(undefined, ip, async () => {
    const login = loginRaw.trim().toLowerCase();
    if (!login || !senhaRaw) return { ok: false, erro: "Informe login e senha." };

    const candidatos = await porColuna<Usuario>("usuarios", "login", login);
    const usuario = candidatos.find((u) => u.ativo) ?? null;

    if (!usuario || !verificarSenha(senhaRaw, usuario.senhaHash)) {
      return { ok: false, erro: "Credenciais inválidas ou usuário inativo." };
    }

    iniciarSessao(cookies, usuario.id);
    await atualizar("usuarios", { ultimoAcesso: new Date() }, "id", usuario.id);
    await registrarAuditoria(usuario, {
      acao: "LOGIN",
      entidade: "usuario",
      entidadeId: usuario.id,
      resumo: `${usuario.nome} autenticou no sistema`,
      ip: await ipAtual(),
    });
    return { ok: true, sucesso: "Autenticado.", id: usuario.id };
  });
}

export async function sair(cookies: CookieJar, ip: string | null): Promise<void> {
  return comSessao(undefined, ip, async () => {
    const usuario = await exigirSessao().catch(() => null);
    if (usuario) {
      await registrarAuditoria(usuario, {
        acao: "LOGOUT",
        entidade: "usuario",
        entidadeId: usuario.id,
        resumo: `${usuario.nome} encerrou a sessão`,
        ip: await ipAtual(),
      }).catch(() => undefined);
    }
    encerrarSessao(cookies);
  });
}

export async function criarUsuario(
  loginRaw: string,
  senhaRaw: string,
  campos: { nome: string; papel: string; email?: string | null; posto?: string | null; crm?: string | null; especialidade?: string | null; om?: string | null },
): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  if (operador.papel !== "admin") {
    return { ok: false, erro: "Apenas o administrador pode criar usuários." };
  }
  const nome = campos.nome.trim();
  const login = loginRaw.trim().toLowerCase();
  if (!nome || !login || senhaRaw.length < 4) {
    return { ok: false, erro: "Preencha nome, login e uma senha com ao menos 4 caracteres." };
  }
  const existente = await porColuna<{ id: number }>("usuarios", "login", login);
  if (existente.length) return { ok: false, erro: "Login já cadastrado." };

  const novo = await inserir<{ id: number }>("usuarios", {
    nome,
    login,
    senhaHash: hashSenha(senhaRaw),
    papel: campos.papel,
    email: campos.email?.trim() || null,
    posto: campos.posto?.trim() || null,
    crm: campos.crm?.trim() || null,
    especialidade: campos.especialidade?.trim() || null,
    om: campos.om?.trim() || null,
  });

  await registrarAuditoria(operador, {
    acao: "CRIAR_USUARIO",
    entidade: "usuario",
    entidadeId: novo.id,
    resumo: `Usuário ${nome} criado com perfil ${campos.papel}`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: `Usuário ${nome} criado.`, id: novo.id };
}

export async function trocarStatusUsuario(usuarioId: number): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  if (operador.papel !== "admin") return { ok: false, erro: "Sem permissão." };
  if (operador.id === usuarioId) {
    return { ok: false, erro: "Não é possível desativar o próprio usuário." };
  }
  const atual = await um<Usuario>("usuarios", "id", usuarioId);
  if (!atual) return { ok: false, erro: "Usuário não encontrado." };

  await atualizar("usuarios", { ativo: !atual.ativo }, "id", usuarioId);
  await registrarAuditoria(operador, {
    acao: atual.ativo ? "DESATIVAR_USUARIO" : "ATIVAR_USUARIO",
    entidade: "usuario",
    entidadeId: usuarioId,
    resumo: `${atual.nome} ${atual.ativo ? "desativado" : "reativado"}`,
    ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Situação do usuário atualizada." };
}
