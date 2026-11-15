(() => {
  const guide = document.querySelector('.app-guide');
  if (!guide) return;
  const choices = [...guide.querySelectorAll('[aria-controls]')];
  function select(active) {
    for (const button of choices) {
      const selected = button === active;
      button.setAttribute('aria-pressed', String(selected));
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      panel.hidden = !selected;
      panel.querySelector('[role=status]').textContent = '';
    }
  }
  for (const button of choices) button.addEventListener('click', () => select(button));
  select(choices[0]);
  for (const button of guide.querySelectorAll('.app-copy')) {
    button.addEventListener('click', async () => {
      const example = button.parentElement.querySelector('.app-example');
      const status = button.nextElementSibling;
      try {
        await navigator.clipboard.writeText(example.textContent);
        status.textContent = 'Kopiert. Füge den Auftrag in deinen Chat ein.';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(example);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Text markiert. Kopiere ihn über das Auswahlmenü.';
      }
    });
  }
})();
