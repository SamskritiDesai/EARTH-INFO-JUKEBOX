import { useEffect } from 'react';

// Speaks a very short name when the pointer rests on a control (or when it gets keyboard focus).
// Controls are described by data-speak, then aria-label, then their <label>/title/text.
// Sliders also say their current value, toggles say on/off.

const SPEAKABLE = 'button, [role="button"], input, select, a[href], [data-speak]';

function clean(text: string): string {
  return text
    .replace(/[\[\]★►▶◀]/g, ' ')
    .replace(/->|→/g, ' to ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function describeControl(el: HTMLElement): string {
  let label = el.getAttribute('data-speak') || el.getAttribute('aria-label') || '';
  if (!label) {
    const wrapping = el.closest('label');
    if (wrapping) label = wrapping.querySelector('span')?.textContent || '';
  }
  if (!label) label = (el.getAttribute('title') || '').split(/[.:—(]/)[0];
  if (!label) label = el.textContent || '';
  label = clean(label);
  if (label.length > 60) label = label.slice(0, 57) + '…';

  const pressed = el.getAttribute('aria-pressed');
  if (pressed === 'true') label += ', on';
  else if (pressed === 'false') label += ', off';

  if (el instanceof HTMLInputElement && el.type === 'range') {
    const vt = el.getAttribute('aria-valuetext');
    label += `, ${vt || el.value}`;
  } else if (el instanceof HTMLSelectElement) {
    label += `, ${el.selectedOptions[0]?.textContent?.split('(')[0].trim() || ''}`;
  }
  if ((el as HTMLButtonElement).disabled) label += ', unavailable';
  return label;
}

export function useHoverAnnouncer(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('speechSynthesis' in window)) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let last: Element | null = null;

    const announce = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return;
      const el = target.closest<HTMLElement>(SPEAKABLE);
      if (!el || el === last) return;
      last = el;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const text = describeControl(el);
        if (!text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
      }, 140); // small delay so sweeping across several buttons does not stutter
    };

    const onOver = (e: MouseEvent) => announce(e.target);
    const onFocus = (e: FocusEvent) => announce(e.target);
    const onOut = (e: MouseEvent) => {
      if (!(e.relatedTarget instanceof HTMLElement) || !e.relatedTarget.closest(SPEAKABLE)) last = null;
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onFocus);
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
