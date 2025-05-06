const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const targetId = link.getAttribute("data-target");
    sections.forEach((sec) => sec.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

//JAVA SCRIPT FOR RECORDING MESSAGES TO GOOGLE SHEET

const scriptURL =
  "https://script.google.com/macros/s/AKfycbyVrHxj3M0cqFmdwG6fm0LBHdCg6b72CGfahl3yDtdTFLBwmgWgTDtA3KiXZ4-R_k8g/exec";
const form = document.forms["submit-to-google-sheet"];
const msg = document.getElementById("msg");
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Disable the button to prevent spamming
  submitBtn.disabled = true;
  submitBtn.innerText = "Sending...";

  fetch(scriptURL, { method: "POST", body: new FormData(form) })
    .then((response) => {
      msg.innerHTML =
        "Thank you! Your message has been successfully submitted.";
      msg.style.color = "white";
      msg.style.fontSize = "20px";
      msg.style.fontWeight = "bold";
      msg.style.display = "block";
      form.reset();

      setTimeout(() => {
        msg.style.display = "none";
        submitBtn.disabled = false;
        submitBtn.innerText = "Send";
      }, 3000);
    })
    .catch((error) => {
      console.error("Error!", error.message);
      msg.innerHTML = "Something went wrong!";
      msg.style.color = "red";
      msg.style.display = "block";

      setTimeout(() => {
        msg.style.display = "none";
        submitBtn.disabled = false;
        submitBtn.innerText = "Send";
      }, 3000);
    });
});
