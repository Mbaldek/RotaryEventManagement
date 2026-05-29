// useSafeBack — hook utilitaire de "retour intelligent" pour les écrans plateforme.
//
// Pourquoi : sur les pages internes (Admin, Selection, Jury, MonDossier, etc.),
// un simple `navigate(-1)` peut faire sortir de l'app si l'utilisateur a atterri
// directement sur la page (deep-link, magic-link, ouverture d'onglet). Le hook
// vérifie d'abord la longueur de l'history ; s'il n'y a pas d'entrée précédente
// dans le SPA, on retombe sur un chemin de fallback explicite (ex. `/Admin`,
// `/Login`, ou la racine).
//
// Usage :
//   const safeBack = useSafeBack('/Admin');
//   <button onClick={safeBack}>Retour</button>
//
// Note : `window.history.length` est >= 1 même sur une nouvelle entrée, et la
// même valeur est conservée à travers les `Navigate replace`. On ne peut pas
// distinguer parfaitement "entrée directe" de "navigation interne". On se
// base donc sur `length > 1` comme heuristique simple — c'est suffisant pour
// éviter le pire cas (sortir de l'onglet), et le fallback est toujours sain.

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useSafeBack(fallbackPath = '/') {
  const navigate = useNavigate();
  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, fallbackPath]);
}

export default useSafeBack;
