
// Registration and Login connected to Node.js backend

// REGISTER
const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("regName").value;
        const email = document.getElementById("regEmail").value;
        const mobile = document.getElementById("regMobile").value;
        const password = document.getElementById("regPassword").value;
        const message = document.getElementById("registerMessage");

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    mobile,
                    password
                })
            });

            const data = await response.json();
            message.textContent = data.message || data.error;

            if (response.ok) {
                registerForm.reset();
            }
        } catch (error) {
            message.textContent = "Unable to connect to server.";
        }
    });
}

// LOGIN
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;
        const message = document.getElementById("loginMessage");

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();
            message.textContent = data.message || data.error;

            if (response.ok) {
                localStorage.setItem(
                    "loggedInUser",
                    JSON.stringify(data.user)
                );

                setTimeout(function () {
                    window.location.href = "index.html";
                }, 1000);
            }
        } catch (error) {
            message.textContent = "Unable to connect to server.";
        }
    });
}
