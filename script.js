const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    const targetId = link.getAttribute('data-target');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

