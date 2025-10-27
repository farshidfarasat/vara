// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // CTA button
  const ctaButton = document.getElementById("cta");
  if (ctaButton) {
    ctaButton.addEventListener("click", () => {
      alert("با تشکر از علاقه‌مندی شما! به زودی با شما تماس می‌گیریم.");
    });
  }
  
  // Contact form submission
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function(e) {
      e.preventDefault();
      alert("پیام شما ارسال شد. متشکریم!");
      this.reset();
    });
  }
});
  