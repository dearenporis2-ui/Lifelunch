// Browsers report tab/app switching through visibility and window focus events.
export function guardSessionFocus() {
  let breached = false, active = true;
  const markIfSession = () => { if (active && (document.body.classList.contains('in-session') || document.body.classList.contains('lesson-active'))) breached = true; };
  const onVisibility = () => { if (document.visibilityState === 'hidden') markIfSession(); };
  const onBlur = () => markIfSession();
  const dispose = () => {
    if (!active) return;
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('hashchange', dispose);
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('hashchange', dispose);
  return { get breached() {
    const sessionActive = document.body.classList.contains('in-session') || document.body.classList.contains('lesson-active');
    if (active && sessionActive && (document.visibilityState === 'hidden' || (document.hasFocus && !document.hasFocus()))) breached = true;
    return breached;
  }, dispose };
}
