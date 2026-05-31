// useScrollSpy — renvoie l'id de la session la plus visible (ancres #session-<id>).
import { useEffect, useState } from 'react';

export function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null);
  const key = (ids || []).join(',');

  useEffect(() => {
    const list = (ids || [])
      .map((id) => document.getElementById(`session-${id}`))
      .filter(Boolean);
    if (list.length === 0) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(visible[0].target.id.replace('session-', ''));
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.5, 1] },
    );
    list.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return activeId;
}

export function scrollToSession(id) {
  const el = document.getElementById(`session-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
