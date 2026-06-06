// =========================
// REGISTO
// =========================

console.log("AUTH CARREGADO");

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const email = document.getElementById("regEmail").value.trim();
        const username = document.getElementById("regUser").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("As passwords não coincidem.");
            return;
        }

        let utilizadores =
            JSON.parse(localStorage.getItem("utilizadores")) || [];

        const utilizadorExiste = utilizadores.find(
            u => u.username === username
        );

        if (utilizadorExiste) {
            alert("Este utilizador já existe.");
            return;
        }

        utilizadores.push({
            email,
            username,
            password
        });

        localStorage.setItem(
            "utilizadores",
            JSON.stringify(utilizadores)
        );

        alert("Registo efetuado com sucesso!");

        window.location.href = "login.html";
    });
}


// =========================
// LOGIN
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const username =
            document.getElementById("loginUser").value.trim();

        const password =
            document.getElementById("password").value;

        const utilizadores =
            JSON.parse(localStorage.getItem("utilizadores")) || [];

        const user = utilizadores.find(
            u =>
                u.username === username &&
                u.password === password
        );

        if (!user) {
            alert("Utilizador ou password incorretos.");
            return;
        }

        localStorage.setItem(
            "utilizadorLogado",
            JSON.stringify(user)
        );

        alert("Login efetuado com sucesso!");

        window.location.href = "index.html";
    });
}