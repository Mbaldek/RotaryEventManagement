-- Hardening C1 (revue docs/hardening/foundation-auth-rls-review.md) :
-- profiles porte une policy RLS "Allow all" (write public) => stocker platform_roles
-- dessus permettait l'auto-promotion admin. On déplace la racine de confiance des rôles
-- vers une table verrouillée, écrivable uniquement par service_role.

create table if not exists public.app_user_roles (
  email      text primary key,
  roles      text[] not null default '{}',  -- 'startup' | 'jury' | 'comite' | 'admin'
  note       text,
  updated_at timestamptz not null default now()
);

alter table public.app_user_roles enable row level security;

-- lecture de SES propres rôles uniquement ; aucune policy d'écriture => écriture service_role only
drop policy if exists app_user_roles_self_read on public.app_user_roles;
create policy app_user_roles_self_read on public.app_user_roles for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- has_platform_role lit la table verrouillée (SECURITY DEFINER => bypass RLS en lecture)
create or replace function public.has_platform_role(p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_user_roles
    where lower(email) = lower(auth.jwt() ->> 'email')
      and p_role = any(roles)
  );
$$;

alter table public.profiles drop column if exists platform_roles;
