    // script.js

document.addEventListener('DOMContentLoaded', () => { 
    
    // Render icons
    lucide.createIcons();

    // Mobile menu toggle
    const btn = document.getElementById('mobileBtn');
    const menu = document.getElementById('mobileMenu');

    btn?.addEventListener('click', () => {
      const open = menu.style.display === 'block';
      menu.style.display = open ? 'none' : 'block';
      btn.innerHTML = open ? '<i data-lucide="menu"></i>' : '<i data-lucide="x"></i>';
      lucide.createIcons();
    });

    // Close mobile menu on click
    menu?.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.style.display = 'none';
        btn.innerHTML = '<i data-lucide="menu"></i>';
        lucide.createIcons();
      });
    });

    // Footer year
    document.getElementById('year').textContent = new Date().getFullYear();

    // Simple toast
    const toastEl = document.getElementById('toast');
    let toastTimer = null;
    function toast(message){
      if(!toastEl) return;
      toastEl.textContent = message;
      toastEl.style.display = 'block';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.style.display = 'none'; }, 2600);
    }

    // Page switch (Impressum/Datenschutz) with fade
    function openPage(id){
      // close mobile menu if open
      if(menu){
        menu.style.display = 'none';
        if(btn){
          btn.innerHTML = '<i data-lucide="menu"></i>';
        }
      }

      const main = document.querySelector('.mainPage');
      const pages = document.querySelectorAll('.page');
      const target = document.getElementById(id);
      if(!main || !target) return;

      main.classList.add('hidden');
      pages.forEach(p => p.classList.remove('active'));

      // ensure icons in the target render even after DOM changes
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'auto' });
      lucide.createIcons();
    }

    document.querySelectorAll('.panelItem[data-link]').forEach(item => {
    item.addEventListener('click', () => {
      window.location.href = item.dataset.link;
    });
  });

      // Modals

      let activeModalId = null;

function openModal(id){
  const overlay = document.getElementById(id);
  if(!overlay) return;

  // Close any open modal first
  if(activeModalId) closeModal(activeModalId);

  activeModalId = id;
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");

  // Focus the modal box for accessibility / ESC feeling
  const box = overlay.querySelector(".modalBox");
  if(box) box.focus();

  // Optional: Body scroll lock
  document.body.style.overflow = "hidden";
}

function closeModal(id){
  const overlay = document.getElementById(id);
  if(!overlay) return;

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");

  activeModalId = null;
  document.body.style.overflow = "";
}

// Click on cards -> open matching modal
document.querySelectorAll(".service").forEach(card => {
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    const modalId = card.getAttribute("data-modal");
    openModal(modalId);
  });
});

// Click on overlay background -> close
document.querySelectorAll(".modalOverlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if(e.target === overlay){
      closeModal(overlay.id);
    }
  });

  // Any element with data-close closes modal (X button, CTA button, etc.)
  overlay.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => closeModal(overlay.id));
  });
});

// ESC closes currently open modal
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && activeModalId){
    closeModal(activeModalId);
  }
});

});