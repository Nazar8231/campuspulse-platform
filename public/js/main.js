document.addEventListener('DOMContentLoaded', () => {
  const revealNodes = document.querySelectorAll('.reveal, .reveal-delay');
  revealNodes.forEach((node) => node.classList.add('revealed'));

  const topbarLinks = document.querySelectorAll('a[href^="#"]');
  topbarLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
