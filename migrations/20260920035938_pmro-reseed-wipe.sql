-- PMRO reseed: wipe demo data (Exército) so the app seed repopulates with PMRO data.
-- TRUNCATE bypasses the auditoria append-only RULEs (they only intercept UPDATE/DELETE).
TRUNCATE auditoria, convocacoes, afastamentos, inspecoes, atestados, militares, usuarios
  RESTART IDENTITY CASCADE;
