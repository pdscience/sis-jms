-- PMRO: NIP (Exército) -> RE - Registro Estatístico (PMRO).
ALTER TABLE militares RENAME COLUMN nip TO re;
ALTER INDEX IF EXISTS militares_nip_uidx RENAME TO militares_re_uidx;
