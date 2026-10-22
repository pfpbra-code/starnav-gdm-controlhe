// Nome de exibição do usuário: definido por ele mesmo em Meu Perfil (campo
// display_name). Quando vazio, usa o nome da conta (full_name).
// Espelha base44/shared/itemPermissions.ts.

export function displayNameOf(user) {
  const dn =
    user?.display_name !== undefined ? user.display_name : user?.data?.display_name;
  return typeof dn === 'string' && dn.trim() ? dn.trim() : user?.full_name || '';
}